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
  isApprovedTeacher: boolean;
}

async function checkDAEPStaffRole(): Promise<DAEPStaffInfo> {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, active_tenant_id, display_name, approved_teacher')
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

  // Admin roles are always considered "approved" for point entry (Story 3.5)
  // This prevents workflow bottlenecks for administrative staff
  const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
  const isApprovedTeacher = adminRoles.includes(profile.role) || profile.approved_teacher === true;

  return {
    userId: user.id,
    role: profile.role,
    tenantId: effectiveTenantId,
    displayName: profile.display_name || user.firstName || 'Staff',
    isApprovedTeacher,
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
 *
 * Story 3.5: Approval status based on approved_teacher flag
 */
export async function createBasePoints(
  placementId: string,
  date: string,
  period: string
): Promise<{ success: boolean; error?: string; alreadyExists?: boolean; isPending?: boolean }> {
  try {
    const { userId, tenantId, isApprovedTeacher } = await checkDAEPStaffRole();
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

    // Story 3.5: Determine approval status based on approved_teacher flag
    const approvalStatus = isApprovedTeacher ? 'approved' : 'pending';
    const isPublic = isApprovedTeacher;

    // Create base points entry
    const { error } = await supabase.from('daep_daily_points').insert({
      tenant_id: tenantId,
      placement_id: placementId,
      date,
      period,
      points_earned: 10,
      is_base_points: true,
      entered_by: userId,
      approval_status: approvalStatus,
      public: isPublic,
    });

    if (error) {
      console.error('Error creating base points:', error);
      return { success: false, error: 'Failed to create base points' };
    }

    // Audit log - different event type based on approval status (Story 3.5)
    const eventType = isApprovedTeacher ? 'points.base_auto_approved' : 'points.base_pending_approval';
    await logPointsAuditEvent(
      supabase,
      eventType,
      userId,
      placementId,
      `Created base points for ${period} (${approvalStatus})`,
      tenantId,
      { date, period, points: 10, approval_status: approvalStatus, is_approved_teacher: isApprovedTeacher }
    );

    revalidatePath('/daep/rooms');
    return { success: true, isPending: !isApprovedTeacher };
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
 *
 * Story 3.5: Approval status based on approved_teacher flag
 * - Approved teachers: approval_status = 'approved', public = true
 * - Non-approved staff: approval_status = 'pending', public = false
 */
export async function createPointAdjustment(
  input: PointAdjustmentInput
): Promise<{ success: boolean; error?: string; entryId?: string; isPending?: boolean }> {
  try {
    const { userId, tenantId, displayName, isApprovedTeacher } = await checkDAEPStaffRole();

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

    // Story 3.5: Determine approval status based on approved_teacher flag
    const approvalStatus = isApprovedTeacher ? 'approved' : 'pending';
    const isPublic = isApprovedTeacher;

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
        approval_status: approvalStatus,
        public: isPublic,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating point adjustment:', error);
      return { success: false, error: 'Failed to save adjustment. Please try again.' };
    }

    // Audit log - different event type based on approval status (Story 3.5)
    const eventType = isApprovedTeacher ? 'points.auto_approved' : 'points.pending_approval';
    await logPointsAuditEvent(
      supabase,
      eventType,
      userId,
      placement_id,
      `Added ${adjustment_value >= 0 ? '+' : ''}${adjustment_value} point adjustment (${approvalStatus})`,
      tenantId,
      {
        date,
        period,
        adjustment: adjustment_value,
        student_action,
        teacher_action,
        notes,
        entered_by_name: displayName,
        approval_status: approvalStatus,
        is_approved_teacher: isApprovedTeacher,
      }
    );

    revalidatePath('/daep/rooms');
    return { success: true, entryId: entry.id, isPending: !isApprovedTeacher };
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
 * Story 3.5: Approval status based on approved_teacher flag
 */
export async function bulkAddPoints(
  input: BulkAddPointsInput
): Promise<{ success: boolean; count: number; error?: string; isPending?: boolean }> {
  try {
    const { userId, tenantId, displayName, isApprovedTeacher } = await checkDAEPStaffRole();
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

    // Story 3.5: Determine approval status based on approved_teacher flag
    const approvalStatus = isApprovedTeacher ? 'approved' : 'pending';
    const isPublic = isApprovedTeacher;

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
      approval_status: approvalStatus,
      public: isPublic,
    }));

    // INSERT (not upsert - multiple entries per period are allowed)
    const { error } = await supabase
      .from('daep_daily_points')
      .insert(entries);

    if (error) {
      console.error('Error creating bulk points:', error);
      return { success: false, count: 0, error: 'Failed to save bulk points' };
    }

    // Audit log for bulk action - different event type based on approval status (Story 3.5)
    const eventType = isApprovedTeacher ? 'points.bulk_auto_approved' : 'points.bulk_pending_approval';
    await logPointsAuditEvent(
      supabase,
      eventType,
      userId,
      validPlacementIds[0], // Primary target
      `Bulk ${adjustment >= 0 ? '+' : ''}${adjustment} to ${validPlacementIds.length} students (${approvalStatus})`,
      tenantId,
      {
        date,
        period,
        adjustment,
        notes: notes || defaultNote,
        affected_count: validPlacementIds.length,
        placement_ids: validPlacementIds,
        entered_by_name: displayName,
        approval_status: approvalStatus,
        is_approved_teacher: isApprovedTeacher,
      }
    );

    revalidatePath('/daep/rooms');
    return { success: true, count: validPlacementIds.length, isPending: !isApprovedTeacher };
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

// ========== PENDING APPROVALS (Story 3-6) ==========

/**
 * Pending approval entry with student and staff info
 */
export interface PendingApprovalEntry {
  id: string;
  placement_id: string;
  school_id: string;
  student_first_name: string;
  student_last_name: string;
  date: string;
  period: string;
  points_earned: number;
  is_base_points: boolean;
  student_action: string | null;
  teacher_action: string | null;
  notes: string | null;
  entered_by: string;
  entered_by_name: string;
  created_at: string;
}

/**
 * Get all pending approval entries for the tenant.
 * Only accessible by admin roles.
 *
 * Story 3-6: Pending Approval Workflow
 */
export async function getPendingApprovals(): Promise<PendingApprovalEntry[]> {
  const { tenantId, role } = await checkDAEPStaffRole();

  // Only admins can view pending approvals
  const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
  if (!adminRoles.includes(role)) {
    throw new Error('Only administrators can view pending approvals');
  }

  const supabase = await createServerClient();

  // Query pending entries with student and staff info
  const { data, error } = await supabase
    .from('daep_daily_points')
    .select(`
      id,
      placement_id,
      date,
      period,
      points_earned,
      is_base_points,
      student_action,
      teacher_action,
      notes,
      entered_by,
      created_at,
      daep_placements!inner (
        school_id,
        students!inner (
          first_name,
          last_name
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('approval_status', 'pending')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending approvals:', error);
    throw new Error('Failed to fetch pending approvals');
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get unique user IDs to fetch display names
  const userIds = Array.from(new Set(data.map((e) => e.entered_by).filter(Boolean)));

  // Fetch user display names
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', userIds);

  const userNameMap = new Map(users?.map((u) => [u.id, u.display_name || 'Unknown']) || []);

  // Map entries with student and staff info
  return data.map((entry) => {
    // Type the nested relations - Supabase returns them as objects when using !inner
    const placement = entry.daep_placements as unknown as {
      school_id: string;
      students: { first_name: string; last_name: string };
    };

    return {
      id: entry.id,
      placement_id: entry.placement_id,
      school_id: placement.school_id,
      student_first_name: placement.students.first_name,
      student_last_name: placement.students.last_name,
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
    };
  });
}

/**
 * Get count of pending approvals for nav badge.
 * Returns 0 for non-admin roles.
 *
 * Story 3-6: Pending Approval Workflow
 */
export async function getPendingApprovalsCount(): Promise<number> {
  try {
    const { tenantId, role } = await checkDAEPStaffRole();

    // Only admins see the count
    const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
    if (!adminRoles.includes(role)) {
      return 0;
    }

    const supabase = await createServerClient();

    const { count, error } = await supabase
      .from('daep_daily_points')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending');

    if (error) {
      console.error('Error fetching pending count:', error);
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Approve a pending point entry.
 * Sets approval_status = 'approved', public = true.
 *
 * Story 3-6: Pending Approval Workflow
 */
export async function approvePointEntry(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId, role, displayName } = await checkDAEPStaffRole();

    // Only admins can approve
    const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
    if (!adminRoles.includes(role)) {
      return { success: false, error: 'Only administrators can approve entries' };
    }

    const supabase = await createServerClient();

    // Get entry details for audit
    const { data: entry, error: fetchError } = await supabase
      .from('daep_daily_points')
      .select('placement_id, date, period, points_earned, entered_by')
      .eq('id', entryId)
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Entry not found or already processed' };
    }

    // Update to approved
    const { error: updateError } = await supabase
      .from('daep_daily_points')
      .update({
        approval_status: 'approved',
        public: true,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error approving entry:', updateError);
      return { success: false, error: 'Failed to approve entry' };
    }

    // Audit log
    await logPointsAuditEvent(
      supabase,
      'points.approved_by_admin',
      userId,
      entry.placement_id,
      `Approved ${entry.points_earned >= 0 ? '+' : ''}${entry.points_earned} point entry`,
      tenantId,
      {
        entry_id: entryId,
        date: entry.date,
        period: entry.period,
        points: entry.points_earned,
        original_entered_by: entry.entered_by,
        approved_by_name: displayName,
      }
    );

    revalidatePath('/daep/approvals');
    revalidatePath('/daep/rooms');
    return { success: true };
  } catch (error) {
    console.error('approvePointEntry error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve entry',
    };
  }
}

/**
 * Reject a pending point entry.
 * Sets approval_status = 'rejected', public = false.
 *
 * Story 3-6: Pending Approval Workflow
 */
export async function rejectPointEntry(
  entryId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId, role, displayName } = await checkDAEPStaffRole();

    // Only admins can reject
    const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
    if (!adminRoles.includes(role)) {
      return { success: false, error: 'Only administrators can reject entries' };
    }

    const supabase = await createServerClient();

    // Get entry details for audit
    const { data: entry, error: fetchError } = await supabase
      .from('daep_daily_points')
      .select('placement_id, date, period, points_earned, entered_by')
      .eq('id', entryId)
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Entry not found or already processed' };
    }

    // Update to rejected
    const { error: updateError } = await supabase
      .from('daep_daily_points')
      .update({
        approval_status: 'rejected',
        public: false,
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', entryId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error rejecting entry:', updateError);
      return { success: false, error: 'Failed to reject entry' };
    }

    // Audit log
    await logPointsAuditEvent(
      supabase,
      'points.rejected_by_admin',
      userId,
      entry.placement_id,
      `Rejected ${entry.points_earned >= 0 ? '+' : ''}${entry.points_earned} point entry`,
      tenantId,
      {
        entry_id: entryId,
        date: entry.date,
        period: entry.period,
        points: entry.points_earned,
        original_entered_by: entry.entered_by,
        rejected_by_name: displayName,
        rejection_reason: reason,
      }
    );

    revalidatePath('/daep/approvals');
    return { success: true };
  } catch (error) {
    console.error('rejectPointEntry error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject entry',
    };
  }
}

/**
 * Bulk approve multiple pending entries.
 *
 * Story 3-6: Pending Approval Workflow
 */
export async function bulkApproveEntries(
  entryIds: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { userId, tenantId, role, displayName } = await checkDAEPStaffRole();

    // Only admins can approve
    const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
    if (!adminRoles.includes(role)) {
      return { success: false, count: 0, error: 'Only administrators can approve entries' };
    }

    if (!entryIds || entryIds.length === 0) {
      return { success: false, count: 0, error: 'No entries selected' };
    }

    const supabase = await createServerClient();

    // Update all to approved
    const { error: updateError } = await supabase
      .from('daep_daily_points')
      .update({
        approval_status: 'approved',
        public: true,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .in('id', entryIds);

    if (updateError) {
      console.error('Error bulk approving entries:', updateError);
      return { success: false, count: 0, error: 'Failed to approve entries' };
    }

    // Audit log
    await logPointsAuditEvent(
      supabase,
      'points.bulk_approved_by_admin',
      userId,
      entryIds[0],
      `Bulk approved ${entryIds.length} point entries`,
      tenantId,
      {
        entry_ids: entryIds,
        approved_count: entryIds.length,
        approved_by_name: displayName,
      }
    );

    revalidatePath('/daep/approvals');
    revalidatePath('/daep/rooms');
    return { success: true, count: entryIds.length };
  } catch (error) {
    console.error('bulkApproveEntries error:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to approve entries',
    };
  }
}

/**
 * Input for editing and approving a pending entry
 */
export interface EditAndApproveInput {
  entryId: string;
  adjustment_value: number;
  student_action?: string | null;
  teacher_action?: string | null;
  notes?: string | null;
}

/**
 * Edit a pending entry and approve it in one action.
 * Allows admin to modify points/notes before approving.
 *
 * Story 3-6: Pending Approval Workflow
 */
export async function editAndApproveEntry(
  input: EditAndApproveInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId, role, displayName } = await checkDAEPStaffRole();

    // Only admins can edit and approve
    const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
    if (!adminRoles.includes(role)) {
      return { success: false, error: 'Only administrators can edit and approve entries' };
    }

    const { entryId, adjustment_value, student_action, teacher_action, notes } = input;

    // Validate adjustment value
    const allowedValues = [10, 5, 0, -5, -10, -15];
    if (!allowedValues.includes(adjustment_value)) {
      return { success: false, error: 'Invalid adjustment value' };
    }

    const supabase = await createServerClient();

    // Get entry details for audit (before values)
    const { data: entry, error: fetchError } = await supabase
      .from('daep_daily_points')
      .select('*')
      .eq('id', entryId)
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Entry not found or already processed' };
    }

    // Update and approve in one operation
    const { error: updateError } = await supabase
      .from('daep_daily_points')
      .update({
        points_earned: adjustment_value,
        student_action: student_action !== undefined ? student_action : entry.student_action,
        teacher_action: teacher_action !== undefined ? teacher_action : entry.teacher_action,
        notes: notes !== undefined ? notes : entry.notes,
        approval_status: 'approved',
        public: true,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error editing and approving entry:', updateError);
      return { success: false, error: 'Failed to save changes' };
    }

    // Audit log with before/after
    await logPointsAuditEvent(
      supabase,
      'points.edited_and_approved',
      userId,
      entry.placement_id,
      `Edited and approved point entry`,
      tenantId,
      {
        entry_id: entryId,
        date: entry.date,
        period: entry.period,
        before: {
          points: entry.points_earned,
          student_action: entry.student_action,
          teacher_action: entry.teacher_action,
          notes: entry.notes,
        },
        after: {
          points: adjustment_value,
          student_action: student_action !== undefined ? student_action : entry.student_action,
          teacher_action: teacher_action !== undefined ? teacher_action : entry.teacher_action,
          notes: notes !== undefined ? notes : entry.notes,
        },
        original_entered_by: entry.entered_by,
        edited_by_name: displayName,
      }
    );

    revalidatePath('/daep/approvals');
    revalidatePath('/daep/rooms');
    return { success: true };
  } catch (error) {
    console.error('editAndApproveEntry error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save changes',
    };
  }
}
