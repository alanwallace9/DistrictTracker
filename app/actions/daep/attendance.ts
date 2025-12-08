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
  // Story 3-11: Attendance Rate types
  getRateCategory,
  type AttendanceRateResult,
  type DailyAttendanceRate,
  type CumulativeAttendanceRate,
  type StudentAttendanceRates,
  type StudentBelowThreshold,
} from '@/lib/validation/schemas';
import { createBasePoints, removeBasePoints } from './points';
import { getDistrictDAEPSettings } from './settings';

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
    displayName: profile.display_name || user.emailAddresses?.[0]?.emailAddress || 'Staff',
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
      // Story 3-12: Override fields
      override_reason,
      override_notes,
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

    // Get existing attendance entry (if any) - include entered_by for override detection
    const { data: existing } = await supabase
      .from('daep_attendance')
      .select('id, status, excused, excuse_reason, counts_toward_days_served, entered_by')
      .eq('tenant_id', tenantId)
      .eq('placement_id', placement_id)
      .eq('date', date)
      .eq('period', period)
      .maybeSingle();

    const previousStatus = existing?.status;
    const previousExcused = existing?.excused;
    const previousExcuseReason = existing?.excuse_reason;
    const previousCountsToward = existing?.counts_toward_days_served ?? false;
    const previousEnteredBy = existing?.entered_by;

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

    // Story 3-12: Handle override fields when admin edits someone else's entry
    const isOverride = override_reason && existing && previousEnteredBy !== userId;
    if (isOverride && userIsAdmin) {
      attendanceData.override_reason = override_reason;
      attendanceData.override_notes = override_notes || null;
      attendanceData.overridden_by = displayName;
      attendanceData.overridden_at = new Date().toISOString();
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

    // Audit log - Story 3-12: Use 'attendance.override' event type when admin overrides
    const auditEventType = isOverride
      ? 'attendance.override'
      : previousStatus
        ? 'attendance.changed'
        : 'attendance.marked';

    const auditAction = isOverride
      ? `Override: ${previousStatus} → ${status}`
      : previousStatus
        ? `Changed attendance from ${previousStatus} to ${status}`
        : `Marked attendance as ${status}`;

    // Story 3-12: Include before/after details for overrides
    const auditDetails: Record<string, unknown> = {
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
    };

    // Add override-specific details
    if (isOverride) {
      auditDetails.before = {
        status: previousStatus,
        excused: previousExcused,
        excuse_reason: previousExcuseReason,
        counts_toward_days_served: previousCountsToward,
        entered_by: previousEnteredBy,
      };
      auditDetails.after = {
        status,
        excused: attendanceData.excused,
        excuse_reason: attendanceData.excuse_reason,
        counts_toward_days_served: attendanceData.counts_toward_days_served,
      };
      auditDetails.override_reason = override_reason;
      auditDetails.override_notes = override_notes || null;
      auditDetails.original_entered_by = previousEnteredBy;
    }

    await logAttendanceAuditEvent(
      supabase,
      auditEventType,
      userId,
      placement_id,
      auditAction,
      tenantId,
      auditDetails
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
 * Story 3-10: Used by client components to determine if user can see excuse modal.
 * Story 3-12: Also returns userId for override detection.
 */
export async function getUserAttendanceRole(): Promise<{
  role: string;
  isAdmin: boolean;
  userId: string;
}> {
  const { role, userId } = await checkDAEPStaffRole();
  return {
    role,
    isAdmin: isAdminRole(role),
    userId,
  };
}

// ============================================================================
// ATTENDANCE RATE CALCULATIONS (Story 3-11)
// ============================================================================

/**
 * Helper to determine if an attendance record counts as "present"
 * Present = P, T, ED, or Absent with counts_toward_days_served = true
 */
function isConsideredPresent(record: { status: string; counts_toward_days_served: boolean }): boolean {
  return record.status !== 'A' || record.counts_toward_days_served === true;
}

/**
 * Get the configured ADA attendance period from district settings.
 * Story 3-11: The ADA attendance period is the period used for daily attendance rate calculation.
 * Only this period determines if a student is "present" for the day.
 */
async function getADAAttendancePeriod(): Promise<string | null> {
  try {
    const settings = await getDistrictDAEPSettings();
    return settings.settings.ada_attendance_period || null;
  } catch {
    return null;
  }
}

/**
 * Calculate consecutive absent days from attendance records
 * Groups by date and counts consecutive days where ALL periods were absent
 */
function calculateConsecutiveAbsentDays(
  attendance: Array<{ date: string; status: string; counts_toward_days_served: boolean }>
): number {
  if (!attendance || attendance.length === 0) return 0;

  // Group by date - a day is "present" if ANY period was present
  const byDate = new Map<string, boolean>();

  attendance.forEach((record) => {
    const wasPresent = isConsideredPresent(record);
    const current = byDate.get(record.date);

    // A day is "present" if ANY period was present
    if (current === undefined) {
      byDate.set(record.date, wasPresent);
    } else if (wasPresent) {
      byDate.set(record.date, true);
    }
  });

  // Sort dates descending (most recent first)
  const sortedDates = Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]));

  // Count consecutive absent days from most recent backwards
  let consecutive = 0;
  for (const [, wasPresent] of sortedDates) {
    if (wasPresent) break;
    consecutive++;
  }

  return consecutive;
}

/**
 * Get attendance rate for a single day.
 * Story 3-11 CORRECTED: Uses ADA period only (if configured).
 * Daily rate is simply: present (100%) or absent (0%) for that day.
 */
export async function getDailyAttendanceRate(
  placementId: string,
  date: string
): Promise<DailyAttendanceRate | null> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get the ADA attendance period from settings
  const adaPeriod = await getADAAttendancePeriod();

  // Build query - filter to ADA period if configured
  let query = supabase
    .from('daep_attendance')
    .select('status, counts_toward_days_served')
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .eq('date', date);

  if (adaPeriod) {
    query = query.eq('period', adaPeriod);
  }

  const { data: attendance, error } = await query;

  if (error) {
    console.error('Error fetching daily attendance:', error);
    throw new Error('Failed to fetch attendance');
  }

  if (!attendance || attendance.length === 0) {
    return null; // No attendance taken for this date
  }

  // Story 3-11 CORRECTED: Day-based rate
  // If ADA period is configured, there should be only 1 record
  // Day is "present" if any record is present
  let wasPresent = false;
  attendance.forEach((record) => {
    if (isConsideredPresent(record)) {
      wasPresent = true;
    }
  });

  // Daily rate: 100% if present, 0% if absent
  const rate = wasPresent ? 100 : 0;

  return {
    date,
    periodsPresent: wasPresent ? 1 : 0,
    periodsAbsent: wasPresent ? 0 : 1,
    totalPeriods: 1,
    rate,
    rateCategory: getRateCategory(rate),
  };
}

/**
 * Get cumulative attendance rate for entire placement.
 * Story 3-11 CORRECTED: Rate is based on DAYS, not periods.
 * Only the ADA attendance period (if configured) determines if a day is "present".
 */
export async function getCumulativeAttendanceRate(
  placementId: string
): Promise<CumulativeAttendanceRate> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get the ADA attendance period from settings
  const adaPeriod = await getADAAttendancePeriod();

  // Get placement date range
  const { data: placement, error: placementError } = await supabase
    .from('daep_placements')
    .select('start_date, expected_end_date')
    .eq('id', placementId)
    .eq('tenant_id', tenantId)
    .single();

  if (placementError || !placement) {
    // Return default when no placement found
    const today = new Date().toISOString().split('T')[0];
    return {
      periodsPresent: 0,
      periodsAbsent: 0,
      totalPeriods: 0,
      rate: 100, // Assume perfect until proven otherwise
      rateCategory: 'green',
      startDate: today,
      endDate: today,
      daysWithAttendance: 0,
      consecutiveAbsentDays: 0,
    };
  }

  // Build query for attendance records
  let query = supabase
    .from('daep_attendance')
    .select('date, period, status, counts_toward_days_served')
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .order('date', { ascending: true });

  // If ADA period is configured, filter to only that period
  if (adaPeriod) {
    query = query.eq('period', adaPeriod);
  }

  const { data: attendance, error: attendanceError } = await query;

  if (attendanceError) {
    console.error('Error fetching cumulative attendance:', attendanceError);
    throw new Error('Failed to fetch attendance');
  }

  const records = attendance || [];
  const today = new Date().toISOString().split('T')[0];

  if (records.length === 0) {
    return {
      periodsPresent: 0,
      periodsAbsent: 0,
      totalPeriods: 0,
      rate: 100, // Assume perfect until proven otherwise
      rateCategory: 'green',
      startDate: placement.start_date,
      endDate: today,
      daysWithAttendance: 0,
      consecutiveAbsentDays: 0,
    };
  }

  // Story 3-11 CORRECTED: Count DAYS, not periods
  // Group by date - each date has one ADA period record
  const byDate = new Map<string, boolean>();
  records.forEach((record) => {
    const wasPresent = isConsideredPresent(record);
    const current = byDate.get(record.date);

    // If multiple records for same date (shouldn't happen with ADA filter),
    // day is "present" if ANY record is present
    if (current === undefined) {
      byDate.set(record.date, wasPresent);
    } else if (wasPresent) {
      byDate.set(record.date, true);
    }
  });

  // Calculate day-based metrics
  let daysPresent = 0;
  byDate.forEach((wasPresent) => {
    if (wasPresent) daysPresent++;
  });

  const totalDays = byDate.size;
  const daysAbsent = totalDays - daysPresent;
  const rate = totalDays > 0 ? (daysPresent / totalDays) * 100 : 100;
  const roundedRate = Math.round(rate * 10) / 10;

  // Calculate consecutive absent days (uses day-based logic)
  const consecutiveAbsentDays = calculateConsecutiveAbsentDays(records);

  return {
    // Using day-based values but keeping field names for backward compatibility
    periodsPresent: daysPresent,
    periodsAbsent: daysAbsent,
    totalPeriods: totalDays,
    rate: roundedRate,
    rateCategory: getRateCategory(roundedRate),
    startDate: placement.start_date,
    endDate: today,
    daysWithAttendance: totalDays,
    consecutiveAbsentDays,
  };
}

/**
 * Get both daily and cumulative rates for student profile.
 */
export async function getStudentAttendanceRates(
  placementId: string,
  date?: string
): Promise<StudentAttendanceRates> {
  const today = date || new Date().toISOString().split('T')[0];

  // Fetch both in parallel
  const [daily, cumulative] = await Promise.all([
    getDailyAttendanceRate(placementId, today),
    getCumulativeAttendanceRate(placementId),
  ]);

  return {
    daily,
    cumulative,
  };
}

/**
 * Get attendance rates for all students in a room (for roster display).
 * Efficient batch query instead of N+1.
 * Returns CUMULATIVE rates (per-placement), not just daily.
 * Story 3-11 CORRECTED: Rate is based on DAYS, not periods.
 */
export async function getRoomAttendanceRates(
  roomId: string,
  date: string
): Promise<Map<string, AttendanceRateResult>> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get the ADA attendance period from settings
  const adaPeriod = await getADAAttendancePeriod();

  // Get all placements for this room
  const { data: placements, error: placementError } = await supabase
    .from('daep_placements')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('assigned_room_id', roomId)
    .in('status', ['pending', 'active']);

  if (placementError) {
    console.error('Error fetching placements:', placementError);
    return new Map();
  }

  if (!placements || placements.length === 0) {
    return new Map();
  }

  const placementIds = placements.map((p) => p.id);

  // Build query for attendance - filter to ADA period if configured
  let query = supabase
    .from('daep_attendance')
    .select('placement_id, date, status, counts_toward_days_served')
    .eq('tenant_id', tenantId)
    .in('placement_id', placementIds);

  // If ADA period is configured, filter to only that period
  if (adaPeriod) {
    query = query.eq('period', adaPeriod);
  }

  const { data: attendance, error: attendanceError } = await query;

  if (attendanceError) {
    console.error('Error fetching attendance:', attendanceError);
    return new Map();
  }

  // Group by placement and calculate rates
  const resultMap = new Map<string, AttendanceRateResult>();

  // Group attendance by placement
  const byPlacement = new Map<string, typeof attendance>();
  (attendance || []).forEach((record) => {
    const existing = byPlacement.get(record.placement_id) || [];
    existing.push(record);
    byPlacement.set(record.placement_id, existing);
  });

  // Calculate rate for each placement
  placementIds.forEach((placementId) => {
    const records = byPlacement.get(placementId) || [];

    if (records.length === 0) {
      // No attendance taken yet - assume perfect
      resultMap.set(placementId, {
        periodsPresent: 0,
        periodsAbsent: 0,
        totalPeriods: 0,
        rate: 100,
        rateCategory: 'green',
      });
      return;
    }

    // Story 3-11 CORRECTED: Count DAYS, not periods
    // Group by date - each date has one ADA period record
    const byDate = new Map<string, boolean>();
    records.forEach((record) => {
      const wasPresent = isConsideredPresent(record);
      const current = byDate.get(record.date);

      // If multiple records for same date, day is "present" if ANY is present
      if (current === undefined) {
        byDate.set(record.date, wasPresent);
      } else if (wasPresent) {
        byDate.set(record.date, true);
      }
    });

    // Calculate day-based metrics
    let daysPresent = 0;
    byDate.forEach((wasPresent) => {
      if (wasPresent) daysPresent++;
    });

    const totalDays = byDate.size;
    const daysAbsent = totalDays - daysPresent;
    const rate = totalDays > 0 ? (daysPresent / totalDays) * 100 : 100;
    const roundedRate = Math.round(rate * 10) / 10;

    resultMap.set(placementId, {
      periodsPresent: daysPresent,
      periodsAbsent: daysAbsent,
      totalPeriods: totalDays,
      rate: roundedRate,
      rateCategory: getRateCategory(roundedRate),
    });
  });

  return resultMap;
}

/**
 * Get consecutive absent days for a placement.
 * Used for notification triggers (Epic 7).
 * Story 3-11 CORRECTED: Uses ADA period only (if configured).
 */
export async function getConsecutiveAbsentDays(
  placementId: string
): Promise<number> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get the ADA attendance period from settings
  const adaPeriod = await getADAAttendancePeriod();

  // Build query - filter to ADA period if configured
  let query = supabase
    .from('daep_attendance')
    .select('date, status, counts_toward_days_served')
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .order('date', { ascending: true });

  if (adaPeriod) {
    query = query.eq('period', adaPeriod);
  }

  const { data: attendance, error } = await query;

  if (error) {
    console.error('Error fetching attendance:', error);
    return 0;
  }

  return calculateConsecutiveAbsentDays(attendance || []);
}

/**
 * Get students below attendance threshold.
 * Used by dashboard (Epic 6) and notifications (Epic 7).
 * Story 3-11 CORRECTED: Uses ADA period only and day-based calculation.
 */
export async function getStudentsBelowAttendanceThreshold(
  threshold?: number
): Promise<StudentBelowThreshold[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get the ADA attendance period from settings
  const adaPeriod = await getADAAttendancePeriod();

  // Get threshold from settings if not provided
  const effectiveThreshold = threshold ?? 85;

  // Get all active placements with student info
  const { data: placements, error: placementError } = await supabase
    .from('daep_placements')
    .select(`
      id,
      student:students!inner(school_id, first_name, last_name)
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'active']);

  if (placementError || !placements) {
    console.error('Error fetching placements:', placementError);
    return [];
  }

  // Get all attendance for these placements
  const placementIds = placements.map((p) => p.id);

  // Build query - filter to ADA period if configured
  let query = supabase
    .from('daep_attendance')
    .select('placement_id, date, status, counts_toward_days_served')
    .eq('tenant_id', tenantId)
    .in('placement_id', placementIds);

  if (adaPeriod) {
    query = query.eq('period', adaPeriod);
  }

  const { data: attendance, error: attendanceError } = await query;

  if (attendanceError) {
    console.error('Error fetching attendance:', attendanceError);
    return [];
  }

  // Group by placement
  const byPlacement = new Map<string, typeof attendance>();
  (attendance || []).forEach((record) => {
    const existing = byPlacement.get(record.placement_id) || [];
    existing.push(record);
    byPlacement.set(record.placement_id, existing);
  });

  // Calculate rates and filter
  const results: StudentBelowThreshold[] = [];

  placements.forEach((placement) => {
    const records = byPlacement.get(placement.id) || [];

    if (records.length === 0) {
      return; // No attendance yet - don't flag
    }

    // Story 3-11 CORRECTED: Count DAYS, not periods
    const byDate = new Map<string, boolean>();
    records.forEach((record) => {
      const wasPresent = isConsideredPresent(record);
      const current = byDate.get(record.date);
      if (current === undefined) {
        byDate.set(record.date, wasPresent);
      } else if (wasPresent) {
        byDate.set(record.date, true);
      }
    });

    let daysPresent = 0;
    byDate.forEach((wasPresent) => {
      if (wasPresent) daysPresent++;
    });

    const totalDays = byDate.size;
    const rate = totalDays > 0 ? (daysPresent / totalDays) * 100 : 100;
    const roundedRate = Math.round(rate * 10) / 10;

    if (roundedRate < effectiveThreshold) {
      // Supabase returns joined data - handle both array and object formats
      const studentData = Array.isArray(placement.student) ? placement.student[0] : placement.student;
      const student = studentData as { school_id: string; first_name: string; last_name: string };
      results.push({
        placement_id: placement.id,
        school_id: student.school_id,
        student_name: `${student.first_name} ${student.last_name}`,
        attendance_rate: roundedRate,
        consecutive_absent_days: calculateConsecutiveAbsentDays(records),
      });
    }
  });

  // Sort by attendance rate (lowest first)
  results.sort((a, b) => a.attendance_rate - b.attendance_rate);

  return results;
}

/**
 * Get attendance threshold from district settings.
 * Defaults to 85 if not set.
 */
export async function getAttendanceThreshold(): Promise<number> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const { data } = await supabase
    .from('tenants')
    .select('daep_settings')
    .eq('id', tenantId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = data?.daep_settings as any;
  return settings?.attendance_threshold ?? 85;
}
