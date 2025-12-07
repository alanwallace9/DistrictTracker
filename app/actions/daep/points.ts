'use server';

/**
 * Point Entry Server Actions
 *
 * Story 3-2: Point Entry Grid
 * Story 3-3: Bulk Point Entry
 *
 * Provides server actions for managing daily points:
 * - createBasePoints: Auto-grants 10 points when student marked present
 * - createPointAdjustment: Teacher adds/subtracts behavior points
 * - getDailyPointsSummary: Returns totals for roster view
 * - bulkAddPoints: Apply same adjustment to multiple students (Story 3-3)
 */

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  PointAdjustmentSchema,
  type PointAdjustmentInput,
  type DailyPointsSummary,
  type DailyPointEntry,
} from '@/lib/validation/schemas';

// ========== HELPER: Get Tenant ID ==========

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

// ========== HELPER: Check DAEP Staff Role ==========

interface DAEPStaffInfo {
  userId: string;
  role: string;
  tenantId: string;
  displayName: string;
}

async function checkDAEPStaffRole(): Promise<DAEPStaffInfo> {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, active_tenant_id, display_name')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  const daepRoles = [
    'super_admin',
    'district_admin',
    'daep_admin_l1',
    'daep_admin_l2',
    'daep_staff',
  ];

  if (!daepRoles.includes(profile.role)) {
    throw new Error('Insufficient permissions. Only DAEP staff can manage points.');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  return {
    userId: user.id,
    role: profile.role,
    tenantId: effectiveTenantId,
    displayName: profile.display_name || user.firstName || 'Staff',
  };
}

// ========== HELPER: Audit Logging ==========

async function logPointsAuditEvent(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  eventType: string,
  actorId: string,
  targetId: string,
  action: string,
  tenantId: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('admin_audit_log').insert({
      event_type: eventType,
      actor_id: actorId,
      target_id: targetId,
      action,
      tenant_id: tenantId,
      module: 'daep_management',
      details,
    });
  } catch (error) {
    console.error('Failed to log points audit event:', error);
  }
}

// ========== CREATE BASE POINTS ==========

/**
 * Creates base points (10) for a student when marked present for a period.
 * Called by attendance marking (Story 3-9).
 * Idempotent - won't duplicate if base points already exist for this period.
 */
export async function createBasePoints(
  placementId: string,
  date: string,
  period: string
): Promise<{ success: boolean; error?: string; alreadyExists?: boolean }> {
  try {
    const { userId, tenantId } = await checkDAEPStaffRole();
    const supabase = await createServerClient();

    // Check if base points already exist for this period (idempotent)
    const { data: existing } = await supabase
      .from('daep_daily_points')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('placement_id', placementId)
      .eq('date', date)
      .eq('period', period)
      .eq('is_base_points', true)
      .maybeSingle();

    if (existing) {
      return { success: true, alreadyExists: true };
    }

    // Create base points entry
    const { error } = await supabase.from('daep_daily_points').insert({
      tenant_id: tenantId,
      placement_id: placementId,
      date,
      period,
      points_earned: 10,
      is_base_points: true,
      entered_by: userId,
      approval_status: 'approved',
      public: true,
    });

    if (error) {
      console.error('Error creating base points:', error);
      return { success: false, error: 'Failed to create base points' };
    }

    // Audit log
    await logPointsAuditEvent(
      supabase,
      'points.base_created',
      userId,
      placementId,
      `Created base points for ${period}`,
      tenantId,
      { date, period, points: 10 }
    );

    revalidatePath('/daep/rooms');
    return { success: true };
  } catch (error) {
    console.error('createBasePoints error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create base points',
    };
  }
}

// ========== REMOVE BASE POINTS ==========

/**
 * Removes base points for a student when attendance changes from present to absent.
 * Called by attendance marking (Story 3-9).
 */
export async function removeBasePoints(
  placementId: string,
  date: string,
  period: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId } = await checkDAEPStaffRole();
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('daep_daily_points')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('placement_id', placementId)
      .eq('date', date)
      .eq('period', period)
      .eq('is_base_points', true);

    if (error) {
      console.error('Error removing base points:', error);
      return { success: false, error: 'Failed to remove base points' };
    }

    // Audit log
    await logPointsAuditEvent(
      supabase,
      'points.base_removed',
      userId,
      placementId,
      `Removed base points for ${period}`,
      tenantId,
      { date, period }
    );

    revalidatePath('/daep/rooms');
    return { success: true };
  } catch (error) {
    console.error('removeBasePoints error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove base points',
    };
  }
}

// ========== CREATE POINT ADJUSTMENT ==========

/**
 * Creates a point adjustment entry for a student.
 * Multiple adjustments per period are allowed.
 * Each entry is timestamped for the log.
 */
export async function createPointAdjustment(
  input: PointAdjustmentInput
): Promise<{ success: boolean; error?: string; entryId?: string }> {
  try {
    const { userId, tenantId, displayName } = await checkDAEPStaffRole();

    // Validate input
    const validation = PointAdjustmentSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid input',
      };
    }

    const { placement_id, date, period, adjustment_value, student_action, teacher_action, notes } =
      validation.data;

    const supabase = await createServerClient();

    // Verify placement exists and belongs to tenant
    const { data: placement, error: placementError } = await supabase
      .from('daep_placements')
      .select('id, school_id')
      .eq('id', placement_id)
      .eq('tenant_id', tenantId)
      .single();

    if (placementError || !placement) {
      return { success: false, error: 'Placement not found' };
    }

    // Create adjustment entry
    const { data: entry, error } = await supabase
      .from('daep_daily_points')
      .insert({
        tenant_id: tenantId,
        placement_id,
        date,
        period,
        points_earned: adjustment_value,
        is_base_points: false,
        student_action: student_action || null,
        teacher_action: teacher_action || null,
        notes: notes || null,
        entered_by: userId,
        approval_status: 'approved',
        public: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating point adjustment:', error);
      return { success: false, error: 'Failed to save adjustment. Please try again.' };
    }

    // Audit log
    await logPointsAuditEvent(
      supabase,
      'points.adjustment_added',
      userId,
      placement_id,
      `Added ${adjustment_value >= 0 ? '+' : ''}${adjustment_value} point adjustment`,
      tenantId,
      {
        date,
        period,
        adjustment: adjustment_value,
        student_action,
        teacher_action,
        notes,
        entered_by_name: displayName,
      }
    );

    revalidatePath('/daep/rooms');
    return { success: true, entryId: entry.id };
  } catch (error) {
    console.error('createPointAdjustment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save adjustment',
    };
  }
}

// ========== GET DAILY POINTS SUMMARY ==========

/**
 * Get daily points summary for students in a room.
 * Returns per-student totals including base points, adjustments, and entries.
 */
export async function getDailyPointsSummary(
  roomId: string,
  date: string
): Promise<Map<string, DailyPointsSummary>> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get all placements for this room
  const { data: placements } = await supabase
    .from('daep_placements')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('assigned_room_id', roomId)
    .in('status', ['pending', 'active']);

  if (!placements || placements.length === 0) {
    return new Map();
  }

  const placementIds = placements.map((p) => p.id);

  // Get all point entries for these placements on this date
  const { data: entries, error } = await supabase
    .from('daep_daily_points')
    .select('id, placement_id, period, points_earned, is_base_points, student_action, teacher_action, notes, entered_by, created_at')
    .eq('tenant_id', tenantId)
    .eq('date', date)
    .in('placement_id', placementIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching daily points:', error);
    throw new Error('Failed to fetch daily points');
  }

  // Build summary map
  const summaryMap = new Map<string, DailyPointsSummary>();

  // Initialize all placements with empty summaries
  placementIds.forEach((id) => {
    summaryMap.set(id, {
      placement_id: id,
      base_points: 0,
      adjustments: 0,
      day_total: 0,
      periods_present: 0,
      expected_points: 0,
      percentage: 0,
      entries: [],
    });
  });

  // Process entries
  const basePointPeriods = new Map<string, Set<string>>(); // Track which periods have base points

  (entries || []).forEach((entry) => {
    const summary = summaryMap.get(entry.placement_id);
    if (!summary) return;

    // Add entry to list
    summary.entries.push({
      id: entry.id,
      placement_id: entry.placement_id,
      period: entry.period,
      points_earned: entry.points_earned,
      is_base_points: entry.is_base_points,
      student_action: entry.student_action,
      teacher_action: entry.teacher_action,
      notes: entry.notes,
      entered_by: entry.entered_by,
      created_at: entry.created_at,
    });

    if (entry.is_base_points) {
      summary.base_points += entry.points_earned;

      // Track periods with base points
      if (!basePointPeriods.has(entry.placement_id)) {
        basePointPeriods.set(entry.placement_id, new Set());
      }
      basePointPeriods.get(entry.placement_id)!.add(entry.period);
    } else {
      summary.adjustments += entry.points_earned;
    }
  });

  // Calculate totals and percentages
  summaryMap.forEach((summary, placementId) => {
    const periodSet = basePointPeriods.get(placementId);
    summary.periods_present = periodSet?.size || 0;
    summary.expected_points = summary.periods_present * 10;
    summary.day_total = summary.base_points + summary.adjustments;
    summary.percentage =
      summary.expected_points > 0
        ? Math.round((summary.day_total / summary.expected_points) * 100)
        : 0;
  });

  return summaryMap;
}

// ========== GET STUDENT POINT ENTRIES ==========

/**
 * Get all point entries for a specific student on a date.
 * Used for the student detail view / log.
 */
export async function getStudentPointEntries(
  placementId: string,
  date: string
): Promise<DailyPointEntry[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const { data: entries, error } = await supabase
    .from('daep_daily_points')
    .select('id, placement_id, period, points_earned, is_base_points, student_action, teacher_action, notes, entered_by, created_at')
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching student point entries:', error);
    throw new Error('Failed to fetch point entries');
  }

  return (entries || []).map((entry) => ({
    id: entry.id,
    placement_id: entry.placement_id,
    period: entry.period,
    points_earned: entry.points_earned,
    is_base_points: entry.is_base_points,
    student_action: entry.student_action,
    teacher_action: entry.teacher_action,
    notes: entry.notes,
    entered_by: entry.entered_by,
    created_at: entry.created_at,
  }));
}

// ========== DELETE POINT ADJUSTMENT ==========

/**
 * Delete a specific point adjustment entry.
 * Only the user who created it or an admin can delete.
 * Base points cannot be deleted directly (use removeBasePoints for attendance changes).
 */
export async function deletePointAdjustment(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId, role } = await checkDAEPStaffRole();
    const supabase = await createServerClient();

    // Get the entry first
    const { data: entry, error: fetchError } = await supabase
      .from('daep_daily_points')
      .select('id, placement_id, is_base_points, entered_by, period, points_earned')
      .eq('id', entryId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Entry not found' };
    }

    if (entry.is_base_points) {
      return { success: false, error: 'Base points cannot be deleted directly. Update attendance instead.' };
    }

    // Check permission: creator or admin
    const isAdmin = ['super_admin', 'district_admin', 'daep_admin_l1'].includes(role);
    if (entry.entered_by !== userId && !isAdmin) {
      return { success: false, error: 'You can only delete your own adjustments' };
    }

    // Delete the entry
    const { error } = await supabase
      .from('daep_daily_points')
      .delete()
      .eq('id', entryId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting point adjustment:', error);
      return { success: false, error: 'Failed to delete adjustment' };
    }

    // Audit log
    await logPointsAuditEvent(
      supabase,
      'points.adjustment_deleted',
      userId,
      entry.placement_id,
      `Deleted ${entry.points_earned >= 0 ? '+' : ''}${entry.points_earned} adjustment for ${entry.period}`,
      tenantId,
      { entry_id: entryId, period: entry.period, points: entry.points_earned }
    );

    revalidatePath('/daep/rooms');
    return { success: true };
  } catch (error) {
    console.error('deletePointAdjustment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete adjustment',
    };
  }
}

// ========== BULK ADD POINTS (Story 3-3) ==========

/**
 * Input for bulk point adjustment
 */
export interface BulkAddPointsInput {
  placementIds: string[];
  date: string;
  period: string;
  adjustment: number; // +10, +5, -5, -10, -15
  notes?: string;
}

/**
 * Apply the same point adjustment to multiple students at once.
 * Creates individual entries for each student (not a single bulk record).
 *
 * Story 3-3: Bulk Point Entry
 */
export async function bulkAddPoints(
  input: BulkAddPointsInput
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { userId, tenantId, displayName } = await checkDAEPStaffRole();
    const supabase = await createServerClient();

    const { placementIds, date, period, adjustment, notes } = input;

    // Validate adjustment is one of the allowed values
    const allowedAdjustments = [10, 5, -5, -10, -15];
    if (!allowedAdjustments.includes(adjustment)) {
      return { success: false, count: 0, error: 'Invalid adjustment value' };
    }

    // Validate we have placements to update
    if (!placementIds || placementIds.length === 0) {
      return { success: false, count: 0, error: 'No students selected' };
    }

    // Verify all placements exist and belong to tenant
    const { data: validPlacements, error: placementError } = await supabase
      .from('daep_placements')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', placementIds);

    if (placementError) {
      console.error('Error verifying placements:', placementError);
      return { success: false, count: 0, error: 'Failed to verify students' };
    }

    const validIds = new Set(validPlacements?.map((p) => p.id) || []);
    const invalidCount = placementIds.filter((id) => !validIds.has(id)).length;
    if (invalidCount > 0) {
      console.warn(`${invalidCount} placement IDs not found in tenant`);
    }

    // Filter to only valid placements
    const validPlacementIds = placementIds.filter((id) => validIds.has(id));
    if (validPlacementIds.length === 0) {
      return { success: false, count: 0, error: 'No valid students found' };
    }

    // Build insert records (matching existing createPointAdjustment pattern)
    const defaultNote = `Bulk: ${adjustment > 0 ? '+' : ''}${adjustment} points`;
    const entries = validPlacementIds.map((placementId) => ({
      tenant_id: tenantId,
      placement_id: placementId,
      date,
      period,
      points_earned: adjustment,
      is_base_points: false,
      notes: notes || defaultNote,
      entered_by: userId,
      approval_status: 'approved',
      public: true,
    }));

    // INSERT (not upsert - multiple entries per period are allowed)
    const { error } = await supabase
      .from('daep_daily_points')
      .insert(entries);

    if (error) {
      console.error('Error creating bulk points:', error);
      return { success: false, count: 0, error: 'Failed to save bulk points' };
    }

    // Audit log for bulk action
    await logPointsAuditEvent(
      supabase,
      'points.bulk_adjustment',
      userId,
      validPlacementIds[0], // Primary target
      `Bulk ${adjustment >= 0 ? '+' : ''}${adjustment} to ${validPlacementIds.length} students`,
      tenantId,
      {
        date,
        period,
        adjustment,
        notes: notes || defaultNote,
        affected_count: validPlacementIds.length,
        placement_ids: validPlacementIds,
        entered_by_name: displayName,
      }
    );

    revalidatePath('/daep/rooms');
    return { success: true, count: validPlacementIds.length };
  } catch (error) {
    console.error('bulkAddPoints error:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to save bulk points',
    };
  }
}

// ========== GET STUDENT POINT HISTORY (Story 3-4) ==========

/**
 * Point history entry with user display name
 */
export interface PointHistoryEntry extends DailyPointEntry {
  date: string;
  entered_by_name: string;
}

/**
 * Options for filtering point history
 */
export interface PointHistoryOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * Get point adjustment history for a placement.
 * Returns only adjustments (not base points), ordered by date desc.
 * Includes entered_by user display name.
 *
 * Story 3-4: Point Notes/Comments
 */
export async function getStudentPointHistory(
  placementId: string,
  options?: PointHistoryOptions
): Promise<PointHistoryEntry[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Build query for adjustments only
  let query = supabase
    .from('daep_daily_points')
    .select(
      'id, placement_id, date, period, points_earned, is_base_points, student_action, teacher_action, notes, entered_by, created_at'
    )
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .eq('is_base_points', false) // Only adjustments, not base points
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  // Apply date filters
  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('date', options.endDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data: entries, error } = await query;

  if (error) {
    console.error('Error fetching point history:', error);
    throw new Error('Failed to fetch point history');
  }

  if (!entries || entries.length === 0) {
    return [];
  }

  // Get unique user IDs to fetch display names
  const userIds = Array.from(new Set(entries.map((e) => e.entered_by).filter(Boolean)));

  // Fetch user display names
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', userIds);

  const userNameMap = new Map(users?.map((u) => [u.id, u.display_name || 'Unknown']) || []);

  // Map entries with display names
  return entries.map((entry) => ({
    id: entry.id,
    placement_id: entry.placement_id,
    date: entry.date,
    period: entry.period,
    points_earned: entry.points_earned,
    is_base_points: entry.is_base_points,
    student_action: entry.student_action,
    teacher_action: entry.teacher_action,
    notes: entry.notes,
    entered_by: entry.entered_by,
    entered_by_name: userNameMap.get(entry.entered_by) || 'Unknown',
    created_at: entry.created_at,
  }));
}

// ========== UPDATE POINT ADJUSTMENT (Story 3-4) ==========

/**
 * Input for updating a point adjustment
 */
export interface UpdatePointAdjustmentInput {
  entryId: string;
  adjustment_value?: number;
  student_action?: string | null;
  teacher_action?: string | null;
  notes?: string | null;
}

/**
 * Update an existing point adjustment entry.
 * Only the original creator or admins can edit.
 * Changes are tracked in audit log with before/after values.
 *
 * Story 3-4: Point Notes/Comments
 */
export async function updatePointAdjustment(
  input: UpdatePointAdjustmentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId, role, displayName } = await checkDAEPStaffRole();
    const supabase = await createServerClient();

    const { entryId, adjustment_value, student_action, teacher_action, notes } = input;

    // Get the existing entry
    const { data: entry, error: fetchError } = await supabase
      .from('daep_daily_points')
      .select('*')
      .eq('id', entryId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Entry not found' };
    }

    if (entry.is_base_points) {
      return { success: false, error: 'Base points cannot be edited. Update attendance instead.' };
    }

    // Check permission: original creator or admin
    const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
    const isAdmin = adminRoles.includes(role);
    const isCreator = entry.entered_by === userId;

    if (!isAdmin && !isCreator) {
      return { success: false, error: 'You can only edit your own adjustments' };
    }

    // Validate adjustment value if provided
    if (adjustment_value !== undefined) {
      const allowedValues = [10, 5, 0, -5, -10, -15];
      if (!allowedValues.includes(adjustment_value)) {
        return { success: false, error: 'Invalid adjustment value' };
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (adjustment_value !== undefined) updates.points_earned = adjustment_value;
    if (student_action !== undefined) updates.student_action = student_action;
    if (teacher_action !== undefined) updates.teacher_action = teacher_action;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No changes provided' };
    }

    // Store before values for audit
    const beforeValues = {
      points_earned: entry.points_earned,
      student_action: entry.student_action,
      teacher_action: entry.teacher_action,
      notes: entry.notes,
    };

    // Update the entry
    const { error: updateError } = await supabase
      .from('daep_daily_points')
      .update(updates)
      .eq('id', entryId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error updating point adjustment:', updateError);
      return { success: false, error: 'Failed to save changes' };
    }

    // Audit log with before/after values
    await logPointsAuditEvent(
      supabase,
      'points.adjustment_edited',
      userId,
      entry.placement_id,
      `Edited point adjustment for ${entry.period}`,
      tenantId,
      {
        entry_id: entryId,
        date: entry.date,
        period: entry.period,
        before: beforeValues,
        after: updates,
        edited_by_name: displayName,
      }
    );

    revalidatePath('/daep/rooms');
    revalidatePath('/daep/students');
    return { success: true };
  } catch (error) {
    console.error('updatePointAdjustment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update adjustment',
    };
  }
}
