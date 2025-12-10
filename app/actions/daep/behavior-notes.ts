'use server';

/**
 * Behavior Notes Server Actions
 *
 * Story 4-1: Quick Behavior Note Entry
 *
 * Provides server actions for:
 * - createBehaviorNote: Create behavior note with optional point adjustment
 * - getRecentActivityForPlacement: Get recent activity for inline panel
 * - bulkAddBehaviorPoints: Apply points to multiple students via quick buttons
 */

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  BehaviorNoteSchema,
  BulkAddBehaviorPointsSchema,
  type CreateBehaviorNoteInput,
  type BulkAddBehaviorPointsInput,
  type RecentActivityItem,
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
    throw new Error('Insufficient permissions. Only DAEP staff can manage behavior notes.');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

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

async function logDAEPAuditEvent(
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
    console.error('Failed to log DAEP audit event:', error);
  }
}

// ========== CREATE BEHAVIOR NOTE ==========

/**
 * Create a behavior note with optional point adjustment.
 * If points are provided, also creates a point entry.
 *
 * Story 4-1: Quick Behavior Note Entry
 */
export async function createBehaviorNote(
  input: CreateBehaviorNoteInput
): Promise<{ success: boolean; noteId?: string; pointEntryId?: string; error?: string }> {
  try {
    const { userId, tenantId, displayName, isApprovedTeacher } = await checkDAEPStaffRole();

    // Validate input
    const validation = BehaviorNoteSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid input',
      };
    }

    const {
      placement_id,
      incident_date,
      incident_time,
      category_id,
      description,
      action_taken,
      points,
      period,
      student_action,
      teacher_action,
      notes,
    } = validation.data;

    const supabase = await createServerClient();

    // Verify placement exists and belongs to tenant
    const { data: placement, error: placementError } = await supabase
      .from('daep_placements')
      .select('id')
      .eq('id', placement_id)
      .eq('tenant_id', tenantId)
      .single();

    if (placementError || !placement) {
      return { success: false, error: 'Placement not found' };
    }

    let noteId: string | undefined;
    let pointEntryId: string | undefined;

    // Create behavior note if description provided
    if (description) {
      const { data: note, error: noteError } = await supabase
        .from('daep_behavior_notes')
        .insert({
          tenant_id: tenantId,
          placement_id,
          date: incident_date,
          time: incident_time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          incident_date,
          incident_time,
          category: student_action || null, // Legacy field
          category_id: category_id || null,
          description,
          action_taken: action_taken || teacher_action || null,
          staff_member: userId,
        })
        .select('id')
        .single();

      if (noteError) {
        console.error('Error creating behavior note:', noteError);
        return { success: false, error: 'Failed to create behavior note' };
      }

      noteId = note.id;

      // Audit log for note
      await logDAEPAuditEvent(
        supabase,
        'behavior_note.created',
        userId,
        placement_id,
        `Created behavior note`,
        tenantId,
        {
          note_id: noteId,
          incident_date,
          category_id,
          description: description?.substring(0, 100),
          entered_by_name: displayName,
        }
      );
    }

    // Create point entry if points provided
    if (points !== undefined && period) {
      const approvalStatus = isApprovedTeacher ? 'approved' : 'pending';
      const isPublic = isApprovedTeacher;

      const { data: pointEntry, error: pointError } = await supabase
        .from('daep_daily_points')
        .insert({
          tenant_id: tenantId,
          placement_id,
          date: incident_date,
          period,
          points_earned: points,
          is_base_points: false,
          student_action: student_action || null,
          teacher_action: teacher_action || null,
          notes: notes || description || null,
          entered_by: userId,
          approval_status: approvalStatus,
          public: isPublic,
        })
        .select('id')
        .single();

      if (pointError) {
        console.error('Error creating point entry:', pointError);
        // Note was created but points failed - still report success but mention issue
        return {
          success: true,
          noteId,
          error: 'Note created but points failed to save',
        };
      }

      pointEntryId = pointEntry.id;

      // Audit log for points
      const eventType = isApprovedTeacher ? 'points.auto_approved' : 'points.pending_approval';
      await logDAEPAuditEvent(
        supabase,
        eventType,
        userId,
        placement_id,
        `Added ${points >= 0 ? '+' : ''}${points} point adjustment (${approvalStatus})`,
        tenantId,
        {
          entry_id: pointEntryId,
          date: incident_date,
          period,
          points,
          student_action,
          teacher_action,
          entered_by_name: displayName,
          from_behavior_note: !!noteId,
        }
      );
    }

    revalidatePath('/daep/rooms');
    revalidatePath('/daep/students');

    return { success: true, noteId, pointEntryId };
  } catch (error) {
    console.error('createBehaviorNote error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create behavior note',
    };
  }
}

// ========== GET RECENT ACTIVITY FOR PLACEMENT ==========

/**
 * Get recent activity items for a placement.
 * Combines point entries, behavior notes, and attendance into a unified list.
 *
 * Story 4-1: Quick Behavior Note Entry
 */
export async function getRecentActivityForPlacement(
  placementId: string,
  limit: number = 5
): Promise<RecentActivityItem[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Fetch points, notes, and attendance in parallel
  const [pointsResult, notesResult, attendanceResult] = await Promise.all([
    // Point entries (non-base points only)
    supabase
      .from('daep_daily_points')
      .select('id, date, period, points_earned, student_action, teacher_action, notes, entered_by, created_at')
      .eq('tenant_id', tenantId)
      .eq('placement_id', placementId)
      .eq('is_base_points', false)
      .order('created_at', { ascending: false })
      .limit(limit * 2), // Fetch more to account for combined result

    // Behavior notes
    supabase
      .from('daep_behavior_notes')
      .select('id, date, time, description, action_taken, staff_member, created_at')
      .eq('tenant_id', tenantId)
      .eq('placement_id', placementId)
      .order('created_at', { ascending: false })
      .limit(limit * 2),

    // Attendance (absences only - present is not notable)
    supabase
      .from('daep_attendance')
      .select('id, date, period, status, excused, excuse_reason, entered_by, created_at')
      .eq('tenant_id', tenantId)
      .eq('placement_id', placementId)
      .in('status', ['A']) // Only absences
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  // Get unique user IDs to fetch display names
  const userIds = new Set<string>();

  (pointsResult.data || []).forEach((p) => p.entered_by && userIds.add(p.entered_by));
  (notesResult.data || []).forEach((n) => n.staff_member && userIds.add(n.staff_member));
  (attendanceResult.data || []).forEach((a) => a.entered_by && userIds.add(a.entered_by));

  // Fetch user display names
  const userNameMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', Array.from(userIds));

    users?.forEach((u) => userNameMap.set(u.id, u.display_name || 'Staff'));
  }

  // Story 4-2: Fetch category types for student_action values
  const studentActionNames = new Set<string>();
  (pointsResult.data || []).forEach((p) => {
    if (p.student_action) studentActionNames.add(p.student_action);
  });

  const categoryTypeMap = new Map<string, 'positive' | 'negative' | 'neutral' | 'bonus'>();
  if (studentActionNames.size > 0) {
    const { data: categories } = await supabase
      .from('daep_behavior_categories')
      .select('name, category_type')
      .eq('tenant_id', tenantId)
      .in('name', Array.from(studentActionNames));

    categories?.forEach((c) =>
      categoryTypeMap.set(c.name, c.category_type as 'positive' | 'negative' | 'neutral' | 'bonus')
    );
  }

  // Convert to unified activity items
  const activities: RecentActivityItem[] = [];

  // Point entries
  (pointsResult.data || []).forEach((p) => {
    const summary = p.student_action
      ? `${p.student_action}${p.notes ? ` - ${p.notes}` : ''}`
      : p.notes || `${p.points_earned >= 0 ? '+' : ''}${p.points_earned} points`;

    activities.push({
      id: p.id,
      type: 'point_entry',
      timestamp: p.created_at,
      summary: summary.length > 80 ? summary.substring(0, 77) + '...' : summary,
      points: p.points_earned,
      period: p.period,
      student_action: p.student_action,
      teacher_action: p.teacher_action,
      category_type: p.student_action ? categoryTypeMap.get(p.student_action) : undefined, // Story 4-2
      staff_name: userNameMap.get(p.entered_by) || 'Staff',
    });
  });

  // Behavior notes
  (notesResult.data || []).forEach((n) => {
    const summary = n.description || 'Behavior note';

    activities.push({
      id: n.id,
      type: 'behavior_note',
      timestamp: n.created_at,
      summary: summary.length > 80 ? summary.substring(0, 77) + '...' : summary,
      staff_name: userNameMap.get(n.staff_member) || 'Staff',
    });
  });

  // Attendance (absences)
  (attendanceResult.data || []).forEach((a) => {
    const excuseStatus = a.excused ? 'Excused' : a.excused === false ? 'Unexcused' : 'Pending';
    const summary = `Absent (${excuseStatus}) - ${a.period}`;

    activities.push({
      id: a.id,
      type: 'attendance',
      timestamp: a.created_at,
      summary,
      period: a.period,
      staff_name: userNameMap.get(a.entered_by) || 'Staff',
    });
  });

  // Sort by timestamp descending and return top N
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return activities.slice(0, limit);
}

// ========== BULK ADD BEHAVIOR POINTS ==========

/**
 * Apply the same point adjustment to multiple students via quick buttons.
 * Used by the bulk actions toolbar quick point buttons.
 *
 * Story 4-1: Quick Behavior Note Entry
 */
export async function bulkAddBehaviorPoints(
  input: BulkAddBehaviorPointsInput
): Promise<{ success: boolean; count: number; error?: string; isPending?: boolean }> {
  try {
    const { userId, tenantId, displayName, isApprovedTeacher } = await checkDAEPStaffRole();

    // Validate input
    const validation = BulkAddBehaviorPointsSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        count: 0,
        error: validation.error.errors[0]?.message || 'Invalid input',
      };
    }

    const { placement_ids, date, period, points, student_action, teacher_action, notes } =
      validation.data;

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

    // Determine approval status
    const approvalStatus = isApprovedTeacher ? 'approved' : 'pending';
    const isPublic = isApprovedTeacher;

    // Build insert records
    const defaultNote = `Quick: ${points > 0 ? '+' : ''}${points} points`;
    const entries = validPlacementIds.map((placementId) => ({
      tenant_id: tenantId,
      placement_id: placementId,
      date,
      period,
      points_earned: points,
      is_base_points: false,
      student_action: student_action || null,
      teacher_action: teacher_action || null,
      notes: notes || defaultNote,
      entered_by: userId,
      approval_status: approvalStatus,
      public: isPublic,
    }));

    // Insert all entries
    const { error } = await supabase.from('daep_daily_points').insert(entries);

    if (error) {
      console.error('Error creating bulk points:', error);
      return { success: false, count: 0, error: 'Failed to save bulk points' };
    }

    // Audit log
    const eventType = isApprovedTeacher ? 'points.bulk_auto_approved' : 'points.bulk_pending_approval';
    await logDAEPAuditEvent(
      supabase,
      eventType,
      userId,
      validPlacementIds[0],
      `Quick bulk ${points >= 0 ? '+' : ''}${points} to ${validPlacementIds.length} students (${approvalStatus})`,
      tenantId,
      {
        date,
        period,
        points,
        affected_count: validPlacementIds.length,
        placement_ids: validPlacementIds,
        entered_by_name: displayName,
        approval_status: approvalStatus,
        source: 'quick_button',
      }
    );

    revalidatePath('/daep/rooms');
    return { success: true, count: validPlacementIds.length, isPending: !isApprovedTeacher };
  } catch (error) {
    console.error('bulkAddBehaviorPoints error:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to save bulk points',
    };
  }
}
