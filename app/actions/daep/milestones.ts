'use server';

/**
 * Milestone Server Actions
 *
 * Story 3-7: Cumulative Points & Milestones
 *
 * Provides server actions for:
 * - getCumulativePoints: Get total points for a placement
 * - getStudentMilestones: Get achieved milestones
 * - checkAndAwardMilestones: Auto-award when threshold crossed
 * - manuallyAwardMilestone: Admin grants milestone directly
 * - bulkAwardMilestones: Bulk manual award
 * - getMilestoneRules: Get configured milestone rules
 * - CRUD for milestone rules
 */

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

// ============================================================================
// TYPES
// ============================================================================

export interface CumulativePointsData {
  placementId: string;
  totalPointsEarned: number;
  totalPointsPossible: number;
  percentage: number;
  daysServed: number;
  periodsPerDay: number;
}

export interface MilestoneAchievement {
  id: string;
  ruleId: string;
  badgeName: string;
  triggerValue: number;
  bonusPoints: number;
  pointsAtAchievement: number;
  achievedAt: string;
  awardType: 'auto' | 'manual';
}

export interface MilestoneRule {
  id: string;
  tenantId: string;
  ruleName: string;
  triggerType: string;
  triggerValue: number;
  bonusPoints: number;
  badgeName: string;
  active: boolean;
  createdAt: string;
}

export interface CreateMilestoneRuleInput {
  ruleName: string;
  triggerValue: number;
  bonusPoints: number;
  badgeName: string;
}

// ============================================================================
// HELPERS
// ============================================================================

async function getTenantId(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('tenant_id, active_tenant_id')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  return effectiveTenantId;
}

async function checkDAEPAdminRole(): Promise<{ userId: string; role: string; tenantId: string }> {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, active_tenant_id')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1', 'daep_admin_l2'];
  if (!adminRoles.includes(profile.role)) {
    throw new Error('Insufficient permissions. DAEP admin role required.');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  return { userId: user.id, role: profile.role, tenantId: effectiveTenantId };
}

// Default periods per day (can be overridden by tenant settings)
const DEFAULT_PERIODS_PER_DAY = 7;

async function getPeriodsPerDaySetting(tenantId: string, supabase: any): Promise<number> {
  // For now, return default. Can be enhanced to read from tenant settings
  return DEFAULT_PERIODS_PER_DAY;
}

// ============================================================================
// CUMULATIVE POINTS
// ============================================================================

/**
 * Calculate cumulative points for a placement.
 * Only counts approved points.
 */
export async function getCumulativePoints(
  placementId: string
): Promise<CumulativePointsData | null> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get placement details
  const { data: placement, error: placementError } = await supabase
    .from('daep_placements')
    .select('id, days_served, tenant_id')
    .eq('id', placementId)
    .single();

  if (placementError || !placement) {
    return null;
  }

  // Verify tenant access
  if (placement.tenant_id !== tenantId) {
    return null;
  }

  // Get sum of approved points using aggregate
  const { data: pointsData, error: pointsError } = await supabase
    .from('daep_daily_points')
    .select('points_earned')
    .eq('placement_id', placementId)
    .eq('approval_status', 'approved');

  if (pointsError) {
    console.error('Error fetching points:', pointsError);
    return null;
  }

  const totalEarned = pointsData?.reduce((sum: number, p: { points_earned: number }) => sum + p.points_earned, 0) || 0;

  // Get periods per day from settings
  const periodsPerDay = await getPeriodsPerDaySetting(tenantId, supabase);

  // Calculate points possible: days_served × periods × 10
  const pointsPossible = (placement.days_served || 0) * periodsPerDay * 10;
  const percentage = pointsPossible > 0
    ? Math.round((totalEarned / pointsPossible) * 100)
    : 0;

  return {
    placementId,
    totalPointsEarned: totalEarned,
    totalPointsPossible: pointsPossible,
    percentage: Math.min(percentage, 100), // Cap at 100%
    daysServed: placement.days_served || 0,
    periodsPerDay,
  };
}

// ============================================================================
// MILESTONE RULES
// ============================================================================

/**
 * Get configured milestone rules for tenant.
 */
export async function getMilestoneRules(): Promise<MilestoneRule[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('daep_point_bonus_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('trigger_type', 'milestone')
    .order('trigger_value', { ascending: true });

  if (error) {
    console.error('Error fetching milestone rules:', error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    ruleName: r.rule_name,
    triggerType: r.trigger_type,
    triggerValue: r.trigger_value,
    bonusPoints: r.bonus_points,
    badgeName: r.badge_name,
    active: r.active,
    createdAt: r.created_at,
  }));
}

/**
 * Get all milestone rules (including inactive) for settings page
 */
export async function getAllMilestoneRules(): Promise<MilestoneRule[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('daep_point_bonus_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('trigger_type', 'milestone')
    .order('trigger_value', { ascending: true });

  if (error) {
    console.error('Error fetching milestone rules:', error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    ruleName: r.rule_name,
    triggerType: r.trigger_type,
    triggerValue: r.trigger_value,
    bonusPoints: r.bonus_points,
    badgeName: r.badge_name,
    active: r.active,
    createdAt: r.created_at,
  }));
}

// ============================================================================
// STUDENT MILESTONES
// ============================================================================

/**
 * Get all achieved milestones for a placement.
 */
export async function getStudentMilestones(
  placementId: string
): Promise<MilestoneAchievement[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('daep_student_milestones')
    .select(`
      id,
      rule_id,
      points_at_achievement,
      achieved_at,
      award_type,
      daep_point_bonus_rules!inner (
        badge_name,
        trigger_value,
        bonus_points
      )
    `)
    .eq('placement_id', placementId)
    .eq('tenant_id', tenantId)
    .order('achieved_at', { ascending: true });

  if (error) {
    console.error('Error fetching student milestones:', error);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    ruleId: m.rule_id,
    badgeName: m.daep_point_bonus_rules.badge_name,
    triggerValue: m.daep_point_bonus_rules.trigger_value,
    bonusPoints: m.daep_point_bonus_rules.bonus_points,
    pointsAtAchievement: m.points_at_achievement,
    achievedAt: m.achieved_at,
    awardType: m.award_type,
  }));
}

// ============================================================================
// AUTO-AWARD MILESTONES
// ============================================================================

/**
 * Check if new milestones should be awarded after point entry.
 * Called after point entry/approval.
 * Returns newly awarded milestones.
 */
export async function checkAndAwardMilestones(
  placementId: string,
  currentTotal: number,
  awardedBy: string
): Promise<MilestoneAchievement[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get unearned milestone rules that should now be awarded
  const { data: rules, error: rulesError } = await supabase
    .from('daep_point_bonus_rules')
    .select('id, badge_name, trigger_value, bonus_points')
    .eq('tenant_id', tenantId)
    .eq('trigger_type', 'milestone')
    .eq('active', true)
    .lte('trigger_value', currentTotal);

  if (rulesError || !rules?.length) {
    return [];
  }

  // Get already earned milestones for this placement
  const { data: earned, error: earnedError } = await supabase
    .from('daep_student_milestones')
    .select('rule_id')
    .eq('placement_id', placementId)
    .eq('tenant_id', tenantId);

  if (earnedError) {
    console.error('Error checking earned milestones:', earnedError);
    return [];
  }

  const earnedRuleIds = new Set(earned?.map((e: any) => e.rule_id) || []);

  // Filter to only unearned milestones
  const newMilestones = rules.filter((r: any) => !earnedRuleIds.has(r.id));

  if (newMilestones.length === 0) {
    return [];
  }

  // Insert new milestone achievements
  const inserts = newMilestones.map((r: any) => ({
    tenant_id: tenantId,
    placement_id: placementId,
    rule_id: r.id,
    points_at_achievement: currentTotal,
    awarded_by: awardedBy,
    award_type: 'auto',
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('daep_student_milestones')
    .insert(inserts)
    .select();

  if (insertError) {
    console.error('Error inserting milestones:', insertError);
    return [];
  }

  // Log to audit trail
  for (const milestone of newMilestones) {
    await supabase.from('admin_audit_log').insert({
      tenant_id: tenantId,
      event_type: 'milestone.achieved',
      actor_id: awardedBy,
      target_id: placementId,
      action: `Auto-awarded milestone: ${milestone.badge_name}`,
      details: {
        milestone_rule_id: milestone.id,
        badge_name: milestone.badge_name,
        trigger_value: milestone.trigger_value,
        points_at_achievement: currentTotal,
        award_type: 'auto',
      },
      module: 'daep_management',
    });
  }

  return newMilestones.map((r: any) => ({
    id: inserted?.find((i: any) => i.rule_id === r.id)?.id || '',
    ruleId: r.id,
    badgeName: r.badge_name,
    triggerValue: r.trigger_value,
    bonusPoints: r.bonus_points,
    pointsAtAchievement: currentTotal,
    achievedAt: new Date().toISOString(),
    awardType: 'auto' as const,
  }));
}

// ============================================================================
// MANUAL AWARD MILESTONES
// ============================================================================

/**
 * Manually award a milestone to a student.
 */
export async function manuallyAwardMilestone(
  placementId: string,
  ruleId: string
): Promise<MilestoneAchievement | null> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get the rule details
  const { data: rule, error: ruleError } = await supabase
    .from('daep_point_bonus_rules')
    .select('id, badge_name, trigger_value, bonus_points')
    .eq('id', ruleId)
    .eq('tenant_id', tenantId)
    .single();

  if (ruleError || !rule) {
    throw new Error('Milestone rule not found');
  }

  // Check if already earned
  const { data: existing } = await supabase
    .from('daep_student_milestones')
    .select('id')
    .eq('placement_id', placementId)
    .eq('rule_id', ruleId)
    .eq('tenant_id', tenantId)
    .single();

  if (existing) {
    throw new Error('Milestone already awarded');
  }

  // Get current points for the placement
  const pointsData = await getCumulativePoints(placementId);
  const currentTotal = pointsData?.totalPointsEarned || 0;

  // Insert milestone
  const { data: inserted, error: insertError } = await supabase
    .from('daep_student_milestones')
    .insert({
      tenant_id: tenantId,
      placement_id: placementId,
      rule_id: ruleId,
      points_at_achievement: currentTotal,
      awarded_by: userId,
      award_type: 'manual',
    })
    .select()
    .single();

  if (insertError) {
    throw new Error('Failed to award milestone');
  }

  // Log to audit trail
  await supabase.from('admin_audit_log').insert({
    tenant_id: tenantId,
    event_type: 'milestone.manual_award',
    actor_id: userId,
    target_id: placementId,
    action: `Manually awarded milestone: ${rule.badge_name}`,
    details: {
      milestone_rule_id: ruleId,
      badge_name: rule.badge_name,
      trigger_value: rule.trigger_value,
      points_at_achievement: currentTotal,
      award_type: 'manual',
    },
    module: 'daep_management',
  });

  revalidatePath('/daep');

  return {
    id: inserted.id,
    ruleId: rule.id,
    badgeName: rule.badge_name,
    triggerValue: rule.trigger_value,
    bonusPoints: rule.bonus_points,
    pointsAtAchievement: currentTotal,
    achievedAt: inserted.achieved_at,
    awardType: 'manual',
  };
}

/**
 * Bulk award a milestone to multiple students.
 */
export async function bulkAwardMilestones(
  placementIds: string[],
  ruleId: string
): Promise<{ success: number; failed: number; alreadyEarned: number }> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get the rule details
  const { data: rule, error: ruleError } = await supabase
    .from('daep_point_bonus_rules')
    .select('id, badge_name, trigger_value, bonus_points')
    .eq('id', ruleId)
    .eq('tenant_id', tenantId)
    .single();

  if (ruleError || !rule) {
    throw new Error('Milestone rule not found');
  }

  // Check which placements already have this milestone
  const { data: existing } = await supabase
    .from('daep_student_milestones')
    .select('placement_id')
    .in('placement_id', placementIds)
    .eq('rule_id', ruleId)
    .eq('tenant_id', tenantId);

  const alreadyEarnedIds = new Set(existing?.map((e: any) => e.placement_id) || []);
  const toAward = placementIds.filter(id => !alreadyEarnedIds.has(id));

  if (toAward.length === 0) {
    return { success: 0, failed: 0, alreadyEarned: placementIds.length };
  }

  // Insert milestones
  const inserts = toAward.map(placementId => ({
    tenant_id: tenantId,
    placement_id: placementId,
    rule_id: ruleId,
    points_at_achievement: 0, // Manual award doesn't require specific points
    awarded_by: userId,
    award_type: 'manual',
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('daep_student_milestones')
    .insert(inserts)
    .select();

  if (insertError) {
    console.error('Error bulk awarding milestones:', insertError);
    return { success: 0, failed: toAward.length, alreadyEarned: alreadyEarnedIds.size };
  }

  // Log to audit trail
  await supabase.from('admin_audit_log').insert({
    tenant_id: tenantId,
    event_type: 'milestone.bulk_award',
    actor_id: userId,
    action: `Bulk awarded milestone: ${rule.badge_name} to ${inserted?.length || 0} students`,
    details: {
      milestone_rule_id: ruleId,
      badge_name: rule.badge_name,
      placement_count: inserted?.length || 0,
      award_type: 'manual',
    },
    module: 'daep_management',
  });

  revalidatePath('/daep');

  return {
    success: inserted?.length || 0,
    failed: toAward.length - (inserted?.length || 0),
    alreadyEarned: alreadyEarnedIds.size,
  };
}

// ============================================================================
// MILESTONE RULE CRUD
// ============================================================================

/**
 * Create a new milestone rule.
 */
export async function createMilestoneRule(
  input: CreateMilestoneRuleInput
): Promise<MilestoneRule> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('daep_point_bonus_rules')
    .insert({
      tenant_id: tenantId,
      rule_name: input.ruleName,
      trigger_type: 'milestone',
      trigger_value: input.triggerValue,
      bonus_points: input.bonusPoints,
      badge_name: input.badgeName,
      active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create milestone rule');
  }

  // Log to audit trail
  await supabase.from('admin_audit_log').insert({
    tenant_id: tenantId,
    event_type: 'milestone_rule.created',
    actor_id: userId,
    target_id: data.id,
    action: `Created milestone rule: ${input.badgeName}`,
    details: { rule: data },
    module: 'daep_management',
  });

  revalidatePath('/daep/settings/badges');

  return {
    id: data.id,
    tenantId: data.tenant_id,
    ruleName: data.rule_name,
    triggerType: data.trigger_type,
    triggerValue: data.trigger_value,
    bonusPoints: data.bonus_points,
    badgeName: data.badge_name,
    active: data.active,
    createdAt: data.created_at,
  };
}

/**
 * Update a milestone rule.
 */
export async function updateMilestoneRule(
  id: string,
  input: Partial<CreateMilestoneRuleInput>
): Promise<MilestoneRule> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const updateData: any = {};
  if (input.ruleName !== undefined) updateData.rule_name = input.ruleName;
  if (input.triggerValue !== undefined) updateData.trigger_value = input.triggerValue;
  if (input.bonusPoints !== undefined) updateData.bonus_points = input.bonusPoints;
  if (input.badgeName !== undefined) updateData.badge_name = input.badgeName;

  const { data, error } = await supabase
    .from('daep_point_bonus_rules')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update milestone rule');
  }

  // Log to audit trail
  await supabase.from('admin_audit_log').insert({
    tenant_id: tenantId,
    event_type: 'milestone_rule.updated',
    actor_id: userId,
    target_id: id,
    action: `Updated milestone rule: ${data.badge_name}`,
    details: { changes: input },
    module: 'daep_management',
  });

  revalidatePath('/daep/settings/badges');

  return {
    id: data.id,
    tenantId: data.tenant_id,
    ruleName: data.rule_name,
    triggerType: data.trigger_type,
    triggerValue: data.trigger_value,
    bonusPoints: data.bonus_points,
    badgeName: data.badge_name,
    active: data.active,
    createdAt: data.created_at,
  };
}

/**
 * Activate a milestone rule.
 */
export async function activateMilestoneRule(id: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('daep_point_bonus_rules')
    .update({ active: true })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error('Failed to activate milestone rule');
  }

  await supabase.from('admin_audit_log').insert({
    tenant_id: tenantId,
    event_type: 'milestone_rule.activated',
    actor_id: userId,
    target_id: id,
    action: 'Activated milestone rule',
    module: 'daep_management',
  });

  revalidatePath('/daep/settings/badges');
}

/**
 * Deactivate a milestone rule.
 */
export async function deactivateMilestoneRule(id: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('daep_point_bonus_rules')
    .update({ active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error('Failed to deactivate milestone rule');
  }

  await supabase.from('admin_audit_log').insert({
    tenant_id: tenantId,
    event_type: 'milestone_rule.deactivated',
    actor_id: userId,
    target_id: id,
    action: 'Deactivated milestone rule',
    module: 'daep_management',
  });

  revalidatePath('/daep/settings/badges');
}

/**
 * Delete a milestone rule.
 */
export async function deleteMilestoneRule(id: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get rule details for audit log
  const { data: rule } = await supabase
    .from('daep_point_bonus_rules')
    .select('badge_name')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  const { error } = await supabase
    .from('daep_point_bonus_rules')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new Error('Failed to delete milestone rule');
  }

  await supabase.from('admin_audit_log').insert({
    tenant_id: tenantId,
    event_type: 'milestone_rule.deleted',
    actor_id: userId,
    target_id: id,
    action: `Deleted milestone rule: ${rule?.badge_name || id}`,
    module: 'daep_management',
  });

  revalidatePath('/daep/settings/badges');
}

/**
 * Seed default milestone rules if none exist.
 */
export async function seedDefaultMilestones(): Promise<{ seeded: number }> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Check if any milestone rules exist
  const { data: existing } = await supabase
    .from('daep_point_bonus_rules')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('trigger_type', 'milestone')
    .limit(1);

  if (existing && existing.length > 0) {
    return { seeded: 0 };
  }

  const defaults = [
    { rule_name: '100 Point Milestone', trigger_value: 100, bonus_points: 0, badge_name: '100 Club' },
    { rule_name: '250 Point Milestone', trigger_value: 250, bonus_points: 0, badge_name: '250 Club' },
    { rule_name: '500 Point Milestone', trigger_value: 500, bonus_points: 0, badge_name: '500 Club' },
    { rule_name: '1000 Point Milestone', trigger_value: 1000, bonus_points: 5, badge_name: '1000 Club' },
    { rule_name: '1500 Point Milestone', trigger_value: 1500, bonus_points: 5, badge_name: '1500 Club' },
    { rule_name: '2000 Point Milestone', trigger_value: 2000, bonus_points: 10, badge_name: '2000 Club' },
  ];

  const inserts = defaults.map(d => ({
    tenant_id: tenantId,
    trigger_type: 'milestone',
    active: true,
    ...d,
  }));

  const { data, error } = await supabase
    .from('daep_point_bonus_rules')
    .insert(inserts)
    .select();

  if (error) {
    throw new Error('Failed to seed milestone rules');
  }

  await supabase.from('admin_audit_log').insert({
    tenant_id: tenantId,
    event_type: 'milestone_rules.seeded',
    actor_id: userId,
    action: `Seeded ${data?.length || 0} default milestone rules`,
    module: 'daep_management',
  });

  revalidatePath('/daep/settings/badges');

  return { seeded: data?.length || 0 };
}
