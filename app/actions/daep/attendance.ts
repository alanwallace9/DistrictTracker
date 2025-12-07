'use server';

/**
 * Attendance Server Actions
 *
 * Story 3-9: Attendance Entry
 *
 * Provides server actions for:
 * - markAttendance: Mark attendance for a single student/period
 * - getRoomAttendance: Get attendance for all students in a room
 * - bulkMarkAttendance: Mark attendance for multiple students
 * - getRoomsAttendanceStatus: Get attendance status for room cards
 * - copyAttendanceFromPeriod: Copy attendance from one period to another
 * - getAttendanceStatusTypes: Get configured status types for dropdown
 */

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  MarkAttendanceSchema,
  BulkMarkAttendanceSchema,
  type MarkAttendanceInput,
  type BulkMarkAttendanceInput,
  type AttendanceEntry,
  type RoomAttendanceStatus,
  type AttendancePointsType,
  type ExcuseReason,
  POINTS_ELIGIBLE_REASONS,
  isAdminRole,
} from '@/lib/validation/schemas';
import { createBasePoints, removeBasePoints } from './points';

// ============================================================================
// TYPES
// ============================================================================

export interface AttendanceStatusType {
  id: string;
  status_code: string;
  label: string;
  points_type: AttendancePointsType;
  requires_time: boolean;
  sort_order: number;
  is_default: boolean;
  active: boolean;
}

export interface MarkAttendanceResult {
  success: boolean;
  error?: string;
  entry?: AttendanceEntry;
  pointsCreated?: boolean;
  pointsRemoved?: boolean;
}

export interface BulkMarkAttendanceResult {
  success: boolean;
  count: number;
  error?: string;
  pointsCreated?: number;
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
    throw new Error('Insufficient permissions. Only DAEP staff can manage attendance.');
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

async function logAttendanceAuditEvent(
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
    console.error('Failed to log attendance audit event:', error);
  }
}

/**
 * Get points value for a status type
 */
async function getPointsForStatus(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string,
  statusCode: string
): Promise<number> {
  const { data: statusType } = await supabase
    .from('daep_attendance_status_types')
    .select('points_type')
    .eq('tenant_id', tenantId)
    .eq('status_code', statusCode)
    .eq('active', true)
    .single();

  if (!statusType) {
    // Default behavior if no status type configured
    return statusCode === 'A' ? 0 : 10;
  }

  switch (statusType.points_type) {
    case 'full':
      return 10;
    case 'partial':
      return 5;
    case 'none':
      return 0;
    default:
      return 10;
  }
}

// ============================================================================
// GET ATTENDANCE STATUS TYPES
// ============================================================================

/**
 * Get all active attendance status types for the tenant.
 * Used to populate the attendance dropdown.
 */
export async function getAttendanceStatusTypes(): Promise<AttendanceStatusType[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('daep_attendance_status_types')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching attendance status types:', error);
    throw new Error('Failed to fetch attendance status types');
  }

  return data || [];
}

// ============================================================================
// MARK ATTENDANCE
// ============================================================================

/**
 * Mark attendance for a student in a specific period.
 * Story 3-10: Role-aware behavior:
 * - Staff: Absent saves as pending (excused=null, counts_toward_days_served=false)
 * - Admin L1/L2: Can set excused status, reason, and points eligibility
 * Handles point creation/removal based on status and excuse type.
 * Upserts - updates existing entry or creates new one.
 */
export async function markAttendance(
  input: MarkAttendanceInput
): Promise<MarkAttendanceResult> {
  try {
    const { userId, role, tenantId, displayName } = await checkDAEPStaffRole();

    // Validate input
    const validation = MarkAttendanceSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid input',
      };
    }

    const {
      placement_id,
      date,
      period,
      status,
      tardy_time,
      early_dismiss_time,
      excused,
      excuse_reason,
      excuse_notes,
      counts_toward_days_served,
    } = validation.data;

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

    // Get existing attendance entry (if any)
    const { data: existing } = await supabase
      .from('daep_attendance')
      .select('id, status, excused, counts_toward_days_served')
      .eq('tenant_id', tenantId)
      .eq('placement_id', placement_id)
      .eq('date', date)
      .eq('period', period)
      .maybeSingle();

    const previousStatus = existing?.status;
    const previousCountsToward = existing?.counts_toward_days_served ?? false;

    // Determine if user is admin (can set excuse details)
    const userIsAdmin = isAdminRole(role);

    // Build attendance data based on role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attendanceData: Record<string, any> = {
      tenant_id: tenantId,
      placement_id,
      date,
      period,
      status,
      tardy_time: status === 'T' ? tardy_time : null,
      early_dismiss_time: status === 'ED' ? early_dismiss_time : null,
      entered_by: userId,
    };

    // Story 3-10: Role-based excuse handling
    if (status === 'A') {
      if (userIsAdmin) {
        // Admin can set excuse details
        attendanceData.excused = excused ?? false;
        attendanceData.excuse_reason = excused ? excuse_reason : null;
        attendanceData.notes = excuse_notes || null;

        // Auto-set counts_toward_days_served based on reason, or use provided value
        if (excuse_reason && POINTS_ELIGIBLE_REASONS.includes(excuse_reason as ExcuseReason)) {
          // Gov't reasons always count toward points
          attendanceData.counts_toward_days_served = true;
        } else {
          attendanceData.counts_toward_days_served = counts_toward_days_served ?? false;
        }
      } else {
        // Staff: Absent is pending review (excused=null)
        attendanceData.excused = null;
        attendanceData.excuse_reason = null;
        attendanceData.counts_toward_days_served = false;
      }
    } else {
      // Non-absent statuses: clear excuse fields, counts toward days
      attendanceData.excused = null;
      attendanceData.excuse_reason = null;
      attendanceData.counts_toward_days_served = true;
    }

    let entry: AttendanceEntry;

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('daep_attendance')
        .update(attendanceData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating attendance:', error);
        return { success: false, error: 'Failed to update attendance' };
      }
      entry = data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('daep_attendance')
        .insert(attendanceData)
        .select()
        .single();

      if (error) {
        console.error('Error creating attendance:', error);
        return { success: false, error: 'Failed to create attendance' };
      }
      entry = data;
    }

    // Handle points based on counts_toward_days_served
    let pointsCreated = false;
    let pointsRemoved = false;

    const nowCountsToward = attendanceData.counts_toward_days_served;

    if (!nowCountsToward && previousCountsToward) {
      // Was counting, now not counting - remove points
      await removeBasePoints(placement_id, date, period);
      pointsRemoved = true;
    } else if (nowCountsToward && !previousCountsToward) {
      // Wasn't counting, now counting - create points
      await createBasePoints(placement_id, date, period);
      pointsCreated = true;
    } else if (nowCountsToward && !existing) {
      // New entry that counts - create points
      await createBasePoints(placement_id, date, period);
      pointsCreated = true;
    }

    // Audit log
    await logAttendanceAuditEvent(
      supabase,
      previousStatus ? 'attendance.changed' : 'attendance.marked',
      userId,
      placement_id,
      previousStatus
        ? `Changed attendance from ${previousStatus} to ${status}`
        : `Marked attendance as ${status}`,
      tenantId,
      {
        date,
        period,
        before_status: previousStatus || null,
        after_status: status,
        tardy_time: tardy_time || null,
        early_dismiss_time: early_dismiss_time || null,
        excused: attendanceData.excused,
        excuse_reason: attendanceData.excuse_reason,
        counts_toward_days_served: attendanceData.counts_toward_days_served,
        points_created: pointsCreated,
        points_removed: pointsRemoved,
        entered_by_name: displayName,
        user_role: role,
      }
    );

    revalidatePath('/daep/rooms');
    return { success: true, entry, pointsCreated, pointsRemoved };
  } catch (error) {
    console.error('markAttendance error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark attendance',
    };
  }
}

// ============================================================================
// GET ROOM ATTENDANCE
// ============================================================================

/**
 * Get attendance for all students in a room for a date/period.
 * Used by roster view to populate attendance column.
 */
export async function getRoomAttendance(
  roomId: string,
  date: string,
  period: string
): Promise<Map<string, AttendanceEntry>> {
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

  // Get attendance for these placements
  const { data: attendanceData, error } = await supabase
    .from('daep_attendance')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('date', date)
    .eq('period', period)
    .in('placement_id', placementIds);

  if (error) {
    console.error('Error fetching room attendance:', error);
    throw new Error('Failed to fetch attendance');
  }

  // Build map by placement_id
  const attendanceMap = new Map<string, AttendanceEntry>();
  (attendanceData || []).forEach((entry) => {
    attendanceMap.set(entry.placement_id, entry);
  });

  return attendanceMap;
}

// ============================================================================
// BULK MARK ATTENDANCE
// ============================================================================

/**
 * Bulk mark attendance for multiple students.
 * Used for "Mark All Present" quick action.
 */
export async function bulkMarkAttendance(
  input: BulkMarkAttendanceInput
): Promise<BulkMarkAttendanceResult> {
  try {
    const { userId, tenantId, displayName } = await checkDAEPStaffRole();

    // Validate input
    const validation = BulkMarkAttendanceSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        count: 0,
        error: validation.error.errors[0]?.message || 'Invalid input',
      };
    }

    const { placement_ids, date, period, status } = validation.data;

    const supabase = await createServerClient();

    // Verify all placements exist and belong to tenant
    const { data: validPlacements, error: placementError } = await supabase
      .from('daep_placements')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', placement_ids);

    if (placementError) {
      console.error('Error verifying placements:', placementError);
      return { success: false, count: 0, error: 'Failed to verify students' };
    }

    const validIds = new Set(validPlacements?.map((p) => p.id) || []);
    const validPlacementIds = placement_ids.filter((id) => validIds.has(id));

    if (validPlacementIds.length === 0) {
      return { success: false, count: 0, error: 'No valid students found' };
    }

    // Get existing attendance entries
    const { data: existingEntries } = await supabase
      .from('daep_attendance')
      .select('placement_id, status')
      .eq('tenant_id', tenantId)
      .eq('date', date)
      .eq('period', period)
      .in('placement_id', validPlacementIds);

    const existingMap = new Map(
      (existingEntries || []).map((e) => [e.placement_id, e.status])
    );

    // Build upsert records
    const entries = validPlacementIds.map((placementId) => ({
      tenant_id: tenantId,
      placement_id: placementId,
      date,
      period,
      status,
      tardy_time: null,
      early_dismiss_time: null,
      entered_by: userId,
    }));

    // Upsert attendance records
    const { error: upsertError } = await supabase
      .from('daep_attendance')
      .upsert(entries, {
        onConflict: 'tenant_id,placement_id,date,period',
      });

    if (upsertError) {
      console.error('Error bulk marking attendance:', upsertError);
      return { success: false, count: 0, error: 'Failed to mark attendance' };
    }

    // Handle points for each student
    let pointsCreatedCount = 0;
    const pointsValue = await getPointsForStatus(supabase, tenantId, status);
    const isAbsent = status === 'A';

    for (const placementId of validPlacementIds) {
      const wasAbsent = existingMap.get(placementId) === 'A';
      const hadNoEntry = !existingMap.has(placementId);

      if (isAbsent && !wasAbsent && !hadNoEntry) {
        // Changed to Absent - remove base points
        await removeBasePoints(placementId, date, period);
      } else if (!isAbsent && (wasAbsent || hadNoEntry)) {
        // Changed from Absent or new entry - create base points
        if (pointsValue > 0) {
          await createBasePoints(placementId, date, period);
          pointsCreatedCount++;
        }
      }
    }

    // Audit log
    await logAttendanceAuditEvent(
      supabase,
      'attendance.bulk_marked',
      userId,
      validPlacementIds[0],
      `Bulk marked ${validPlacementIds.length} students as ${status}`,
      tenantId,
      {
        date,
        period,
        status,
        affected_count: validPlacementIds.length,
        placement_ids: validPlacementIds,
        points_created_count: pointsCreatedCount,
        entered_by_name: displayName,
      }
    );

    revalidatePath('/daep/rooms');
    return {
      success: true,
      count: validPlacementIds.length,
      pointsCreated: pointsCreatedCount,
    };
  } catch (error) {
    console.error('bulkMarkAttendance error:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to mark attendance',
    };
  }
}

// ============================================================================
// GET ROOMS ATTENDANCE STATUS
// ============================================================================

/**
 * Get attendance status for all rooms (for room cards page).
 * Efficient batch query to show indicators on all room cards.
 * Only counts periods where requires_attendance = true.
 */
export async function getRoomsAttendanceStatus(
  date: string,
  period: string
): Promise<Map<string, RoomAttendanceStatus>> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get all active rooms with student counts
  const { data: rooms } = await supabase
    .from('daep_rooms')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('active', true);

  if (!rooms || rooms.length === 0) {
    return new Map();
  }

  const roomIds = rooms.map((r) => r.id);

  // Get placements per room
  const { data: placements } = await supabase
    .from('daep_placements')
    .select('id, assigned_room_id')
    .eq('tenant_id', tenantId)
    .in('assigned_room_id', roomIds)
    .in('status', ['pending', 'active']);

  if (!placements || placements.length === 0) {
    // No students - all rooms show as "taken" (0/0)
    const resultMap = new Map<string, RoomAttendanceStatus>();
    roomIds.forEach((roomId) => {
      resultMap.set(roomId, {
        room_id: roomId,
        taken: true,
        count: 0,
        total: 0,
        present_count: 0,
      });
    });
    return resultMap;
  }

  // Build room -> placements map
  const roomPlacements = new Map<string, string[]>();
  placements.forEach((p) => {
    if (p.assigned_room_id) {
      const existing = roomPlacements.get(p.assigned_room_id) || [];
      existing.push(p.id);
      roomPlacements.set(p.assigned_room_id, existing);
    }
  });

  // Get all attendance for this date/period
  const placementIds = placements.map((p) => p.id);
  const { data: attendanceData } = await supabase
    .from('daep_attendance')
    .select('placement_id, status')
    .eq('tenant_id', tenantId)
    .eq('date', date)
    .eq('period', period)
    .in('placement_id', placementIds);

  // Build attendance lookup
  const attendanceMap = new Map<string, string>();
  (attendanceData || []).forEach((a) => {
    attendanceMap.set(a.placement_id, a.status);
  });

  // Calculate status per room
  const resultMap = new Map<string, RoomAttendanceStatus>();

  roomIds.forEach((roomId) => {
    const roomPlacementIds = roomPlacements.get(roomId) || [];
    const total = roomPlacementIds.length;

    let count = 0;
    let presentCount = 0;

    roomPlacementIds.forEach((placementId) => {
      const status = attendanceMap.get(placementId);
      if (status) {
        count++;
        if (status !== 'A') {
          presentCount++;
        }
      }
    });

    resultMap.set(roomId, {
      room_id: roomId,
      taken: total === 0 || count === total,
      count,
      total,
      present_count: presentCount,
    });
  });

  return resultMap;
}

// ============================================================================
// COPY ATTENDANCE FROM PERIOD
// ============================================================================

/**
 * Copy attendance from one period to another for a room.
 * Used for "Copy from Period X" feature.
 */
export async function copyAttendanceFromPeriod(
  roomId: string,
  date: string,
  fromPeriod: string,
  toPeriod: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { userId, tenantId, displayName } = await checkDAEPStaffRole();
    const supabase = await createServerClient();

    // Get placements for this room
    const { data: placements } = await supabase
      .from('daep_placements')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('assigned_room_id', roomId)
      .in('status', ['pending', 'active']);

    if (!placements || placements.length === 0) {
      return { success: false, count: 0, error: 'No students in room' };
    }

    const placementIds = placements.map((p) => p.id);

    // Get attendance from source period
    const { data: sourceAttendance } = await supabase
      .from('daep_attendance')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('date', date)
      .eq('period', fromPeriod)
      .in('placement_id', placementIds);

    if (!sourceAttendance || sourceAttendance.length === 0) {
      return { success: false, count: 0, error: 'No attendance to copy from source period' };
    }

    // Check if target period already has attendance
    const { data: existingTarget } = await supabase
      .from('daep_attendance')
      .select('placement_id')
      .eq('tenant_id', tenantId)
      .eq('date', date)
      .eq('period', toPeriod)
      .in('placement_id', placementIds);

    const existingTargetIds = new Set((existingTarget || []).map((e) => e.placement_id));

    // Only copy for placements that don't already have target period attendance
    const toCopy = sourceAttendance.filter((a) => !existingTargetIds.has(a.placement_id));

    if (toCopy.length === 0) {
      return { success: false, count: 0, error: 'All students already have attendance for target period' };
    }

    // Build insert records
    const entries = toCopy.map((source) => ({
      tenant_id: tenantId,
      placement_id: source.placement_id,
      date,
      period: toPeriod,
      status: source.status,
      tardy_time: source.tardy_time,
      early_dismiss_time: source.early_dismiss_time,
      entered_by: userId,
    }));

    // Insert copied attendance
    const { error: insertError } = await supabase
      .from('daep_attendance')
      .insert(entries);

    if (insertError) {
      console.error('Error copying attendance:', insertError);
      return { success: false, count: 0, error: 'Failed to copy attendance' };
    }

    // Create base points for non-absent students
    let pointsCreated = 0;
    for (const entry of entries) {
      if (entry.status !== 'A') {
        await createBasePoints(entry.placement_id, date, toPeriod);
        pointsCreated++;
      }
    }

    // Audit log
    await logAttendanceAuditEvent(
      supabase,
      'attendance.copied',
      userId,
      roomId,
      `Copied attendance from ${fromPeriod} to ${toPeriod} for ${entries.length} students`,
      tenantId,
      {
        date,
        from_period: fromPeriod,
        to_period: toPeriod,
        copied_count: entries.length,
        points_created: pointsCreated,
        entered_by_name: displayName,
      }
    );

    revalidatePath('/daep/rooms');
    return { success: true, count: entries.length };
  } catch (error) {
    console.error('copyAttendanceFromPeriod error:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to copy attendance',
    };
  }
}

// ============================================================================
// GET PLACEMENT ATTENDANCE HISTORY
// ============================================================================

/**
 * Get attendance history for a specific placement.
 * Used by student profile timeline.
 */
export async function getPlacementAttendance(
  placementId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<AttendanceEntry[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  let query = supabase
    .from('daep_attendance')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .order('date', { ascending: false })
    .order('period', { ascending: true });

  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('date', options.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching placement attendance:', error);
    throw new Error('Failed to fetch attendance history');
  }

  return data || [];
}

// ============================================================================
// GET PARENT CALL COUNT (Story 3-10)
// ============================================================================

/**
 * Get the count of parent call excuses for a placement in the current semester.
 * Used to show "Call X of 6" in the excuse modal.
 */
export async function getParentCallCount(
  placementId: string,
  semesterStartDate?: string
): Promise<number> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Default to current school year start (August 1st of current year)
  const now = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const defaultStart = semesterStartDate || `${year}-08-01`;

  const { count, error } = await supabase
    .from('daep_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .eq('excuse_reason', 'parent_call')
    .eq('excused', true)
    .gte('date', defaultStart);

  if (error) {
    console.error('Error fetching parent call count:', error);
    return 0;
  }

  return count || 0;
}

// ============================================================================
// GET USER ROLE FOR ATTENDANCE
// ============================================================================

/**
 * Get the current user's role for attendance-related UI decisions.
 * Used by client components to determine if user can see excuse modal.
 */
export async function getUserAttendanceRole(): Promise<{
  role: string;
  isAdmin: boolean;
}> {
  const { role } = await checkDAEPStaffRole();
  return {
    role,
    isAdmin: isAdminRole(role),
  };
}
