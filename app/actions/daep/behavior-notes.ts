'use server';

/**
 * Behavior Notes Server Actions
 *
 * Story 4-1: Quick Behavior Note Entry
 * Story 4-3: Behavior Notes List View
 *
 * Provides server actions for:
 * - createBehaviorNote: Create behavior note with optional point adjustment
 * - getRecentActivityForPlacement: Get recent activity for inline panel
 * - bulkAddBehaviorPoints: Apply points to multiple students via quick buttons
 * - getBehaviorNotesList: Paginated, sortable list with filters
 * - getBehaviorNotesStaffList: Staff dropdown options
 * - getBehaviorNotesCampusList: Campus dropdown options
 * - getBehaviorNoteById: Full detail for single note
 * - getBehaviorNotesStats: Summary counts for stats bar
 * - getNewNotesCountSince: Count since timestamp for badge
 * - exportBehaviorNotesToCSV: CSV export
 */

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  BehaviorNoteSchema,
  BulkAddBehaviorPointsSchema,
  BehaviorNotesListQuerySchema,
  type CreateBehaviorNoteInput,
  type BulkAddBehaviorPointsInput,
  type RecentActivityItem,
  type BehaviorNotesListQuery,
  type BehaviorNoteListItem,
  type BehaviorNotesListResult,
  type BehaviorNotesStats,
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

// ============================================================================
// BEHAVIOR NOTES LIST SERVER ACTIONS (Story 4-3)
// ============================================================================

// ========== HELPER: Sort Notes Client-Side ==========

function sortNotes(
  notes: BehaviorNoteListItem[],
  sortBy: string,
  sortDirection: 'asc' | 'desc'
): BehaviorNoteListItem[] {
  return [...notes].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'student_name':
        comparison = `${a.student_last_name}, ${a.student_first_name}`.localeCompare(
          `${b.student_last_name}, ${b.student_first_name}`
        );
        break;
      case 'campus':
        comparison = (a.home_campus_name || '').localeCompare(b.home_campus_name || '');
        break;
      case 'category':
        comparison = (a.category || '').localeCompare(b.category || '');
        break;
      case 'staff':
        comparison = (a.staff_last_name || '').localeCompare(b.staff_last_name || '');
        break;
      case 'verified':
        comparison = (a.is_verified ? 1 : 0) - (b.is_verified ? 1 : 0);
        break;
      case 'date':
      default:
        // Date is primary sorted by DB, this is for consistency
        const dateA = new Date(`${a.incident_date}T${a.incident_time || '00:00'}`);
        const dateB = new Date(`${b.incident_date}T${b.incident_time || '00:00'}`);
        comparison = dateA.getTime() - dateB.getTime();
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

// ========== HELPER: Escape CSV Field ==========

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ========== GET BEHAVIOR NOTES LIST ==========

/**
 * Get paginated, sortable list of behavior notes with filters.
 * Joins with placements, trespass_records, and campuses for full context.
 *
 * Story 4-3: Behavior Notes List View
 */
export async function getBehaviorNotesList(
  queryInput: Partial<BehaviorNotesListQuery> = {}
): Promise<BehaviorNotesListResult> {
  try {
    const tenantId = await getTenantId();
    const supabase = await createServerClient();

    // Validate and apply defaults
    const query = BehaviorNotesListQuerySchema.parse(queryInput);
    const { page, per_page, sort_by, sort_direction, query: searchQuery, category_type, campus_id, staff_id, date_from, date_to } = query;

    // Build base query - fetch all fields we need
    let dbQuery = supabase
      .from('daep_behavior_notes')
      .select(
        `
        id,
        incident_date,
        incident_time,
        category,
        category_id,
        description,
        action_taken,
        staff_member,
        verified_by,
        verified_at,
        created_at,
        updated_at,
        placement_id,
        daep_placements!inner (
          id,
          trespass_records!inner (
            school_id,
            first_name,
            last_name,
            photo_url
          ),
          home_campus_id
        ),
        daep_behavior_categories (
          name,
          category_type
        )
      `,
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId);

    // Apply date filter (always sort by date at DB level for pagination)
    if (date_from) {
      dbQuery = dbQuery.gte('incident_date', date_from);
    }
    if (date_to) {
      dbQuery = dbQuery.lte('incident_date', date_to);
    }

    // Apply staff filter
    if (staff_id) {
      dbQuery = dbQuery.eq('staff_member', staff_id);
    }

    // Apply search filter (description or student name via ilike)
    if (searchQuery && searchQuery.trim()) {
      dbQuery = dbQuery.ilike('description', `%${searchQuery}%`);
    }

    // Apply date sorting at DB level for pagination correctness
    dbQuery = dbQuery.order('incident_date', { ascending: sort_by === 'date' && sort_direction === 'asc' });
    dbQuery = dbQuery.order('incident_time', { ascending: sort_by === 'date' && sort_direction === 'asc' });

    // Apply pagination
    const offset = (page - 1) * per_page;
    dbQuery = dbQuery.range(offset, offset + per_page - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('getBehaviorNotesList error:', error);
      return { notes: [], total: 0, page, per_page, total_pages: 0 };
    }

    // Fetch campus names for home_campus_ids
    const campusIds = new Set<string>();
    data?.forEach((note: Record<string, unknown>) => {
      const placement = note.daep_placements as Record<string, unknown> | null;
      if (placement?.home_campus_id) {
        campusIds.add(placement.home_campus_id as string);
      }
    });

    const campusMap = new Map<string, string>();
    if (campusIds.size > 0) {
      const { data: campuses } = await supabase
        .from('campuses')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .in('id', Array.from(campusIds));

      campuses?.forEach((c) => campusMap.set(c.id, c.name));
    }

    // Fetch staff display names
    const staffIds = new Set<string>();
    data?.forEach((note: Record<string, unknown>) => {
      if (note.staff_member) staffIds.add(note.staff_member as string);
    });

    const staffMap = new Map<string, { displayName: string; lastName: string }>();
    if (staffIds.size > 0) {
      const { data: staff } = await supabase
        .from('user_profiles')
        .select('id, display_name')
        .in('id', Array.from(staffIds));

      staff?.forEach((s) => {
        // Extract last name from display name (assume "First Last" format)
        const parts = (s.display_name || 'Staff').split(' ');
        const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
        staffMap.set(s.id, { displayName: s.display_name || 'Staff', lastName });
      });
    }

    // Transform data to BehaviorNoteListItem[]
    let notes: BehaviorNoteListItem[] = (data || []).map((note: Record<string, unknown>) => {
      const placement = note.daep_placements as Record<string, unknown> | null;
      const student = placement?.trespass_records as Record<string, unknown> | null;
      const categoryData = note.daep_behavior_categories as Record<string, unknown> | null;
      const staffInfo = staffMap.get(note.staff_member as string) || { displayName: 'Staff', lastName: 'Staff' };
      const description = (note.description as string) || '';

      return {
        id: note.id as string,
        incident_date: note.incident_date as string,
        incident_time: note.incident_time as string | null,
        category: categoryData?.name as string | null ?? note.category as string | null,
        category_id: note.category_id as string | null,
        category_type: categoryData?.category_type as 'positive' | 'negative' | 'neutral' | null,
        description: description,
        description_snippet: description.length > 40 ? description.substring(0, 37) + '...' : description,
        action_taken: note.action_taken as string | null,
        staff_member: note.staff_member as string,
        staff_name: staffInfo.displayName,
        staff_last_name: staffInfo.lastName,
        placement_id: note.placement_id as string,
        student_school_id: student?.school_id as string ?? '',
        student_first_name: student?.first_name as string ?? '',
        student_last_name: student?.last_name as string ?? '',
        student_photo_url: student?.photo_url as string | null ?? null,
        home_campus_id: placement?.home_campus_id as string | null ?? null,
        home_campus_name: campusMap.get(placement?.home_campus_id as string) || null,
        points: null, // Would need to join with point entries if we want this
        student_action: null,
        teacher_action: null,
        verified_by: note.verified_by as string | null,
        verified_at: note.verified_at as string | null,
        is_verified: !!(note.verified_by),
        created_at: note.created_at as string,
        updated_at: note.updated_at as string,
      };
    });

    // Apply campus filter (client-side since it's a join)
    if (campus_id) {
      notes = notes.filter((n) => n.home_campus_id === campus_id);
    }

    // Apply category type filter (client-side since it's a join)
    if (category_type && category_type !== 'all') {
      notes = notes.filter((n) => n.category_type === category_type);
    }

    // Apply client-side sorting for non-date fields
    if (sort_by !== 'date') {
      notes = sortNotes(notes, sort_by, sort_direction);
    }

    const total = count || 0;
    const total_pages = Math.ceil(total / per_page);

    return { notes, total, page, per_page, total_pages };
  } catch (error) {
    console.error('getBehaviorNotesList error:', error);
    return { notes: [], total: 0, page: 1, per_page: 25, total_pages: 0 };
  }
}

// ========== GET BEHAVIOR NOTES STAFF LIST ==========

/**
 * Get list of staff members who have created behavior notes.
 * For the staff filter dropdown.
 *
 * Story 4-3: Behavior Notes List View
 */
export async function getBehaviorNotesStaffList(): Promise<
  { id: string; name: string; lastName: string }[]
> {
  try {
    const tenantId = await getTenantId();
    const supabase = await createServerClient();

    // Get distinct staff members from behavior notes
    const { data: notes } = await supabase
      .from('daep_behavior_notes')
      .select('staff_member')
      .eq('tenant_id', tenantId);

    const staffIds = Array.from(new Set((notes || []).map((n) => n.staff_member).filter(Boolean)));

    if (staffIds.length === 0) {
      return [];
    }

    // Fetch staff names
    const { data: staff } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', staffIds);

    return (staff || [])
      .map((s) => {
        const parts = (s.display_name || 'Staff').split(' ');
        const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
        return {
          id: s.id,
          name: s.display_name || 'Staff',
          lastName,
        };
      })
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  } catch (error) {
    console.error('getBehaviorNotesStaffList error:', error);
    return [];
  }
}

// ========== GET BEHAVIOR NOTES CAMPUS LIST ==========

/**
 * Get list of campuses that have students with behavior notes.
 * For the campus filter dropdown.
 *
 * Story 4-3: Behavior Notes List View
 */
export async function getBehaviorNotesCampusList(): Promise<{ id: string; name: string }[]> {
  try {
    const tenantId = await getTenantId();
    const supabase = await createServerClient();

    // Get distinct campus IDs from behavior notes via placements
    const { data: notes } = await supabase
      .from('daep_behavior_notes')
      .select('daep_placements!inner(home_campus_id)')
      .eq('tenant_id', tenantId);

    const campusIds = Array.from(
      new Set(
        (notes || [])
          .map((n) => {
            const placement = n.daep_placements as unknown as { home_campus_id: string } | null;
            return placement?.home_campus_id;
          })
          .filter((id): id is string => Boolean(id))
      )
    );

    if (campusIds.length === 0) {
      return [];
    }

    // Fetch campus names
    const { data: campuses } = await supabase
      .from('campuses')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .in('id', campusIds)
      .order('name');

    return (campuses || []).map((c) => ({ id: c.id, name: c.name }));
  } catch (error) {
    console.error('getBehaviorNotesCampusList error:', error);
    return [];
  }
}

// ========== GET BEHAVIOR NOTE BY ID ==========

/**
 * Get full detail for a single behavior note.
 * Used for the detail sheet.
 *
 * Story 4-3: Behavior Notes List View
 */
export async function getBehaviorNoteById(
  noteId: string
): Promise<BehaviorNoteListItem | null> {
  try {
    const tenantId = await getTenantId();
    const supabase = await createServerClient();

    const { data: note, error } = await supabase
      .from('daep_behavior_notes')
      .select(
        `
        id,
        incident_date,
        incident_time,
        category,
        category_id,
        description,
        action_taken,
        staff_member,
        verified_by,
        verified_at,
        created_at,
        updated_at,
        placement_id,
        daep_placements!inner (
          id,
          trespass_records!inner (
            school_id,
            first_name,
            last_name,
            photo_url
          ),
          home_campus_id
        ),
        daep_behavior_categories (
          name,
          category_type
        )
      `
      )
      .eq('id', noteId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !note) {
      return null;
    }

    // Define types for the joined data
    interface PlacementData {
      id: string;
      home_campus_id: string | null;
      trespass_records: {
        school_id: string;
        first_name: string;
        last_name: string;
        photo_url: string | null;
      };
    }
    interface CategoryData {
      name: string;
      category_type: string;
    }

    // Fetch campus name
    const placement = note.daep_placements as unknown as PlacementData;
    let campusName: string | null = null;
    if (placement?.home_campus_id) {
      const { data: campus } = await supabase
        .from('campuses')
        .select('name')
        .eq('id', placement.home_campus_id)
        .eq('tenant_id', tenantId)
        .single();
      campusName = campus?.name || null;
    }

    // Fetch staff name
    let staffName = 'Staff';
    let staffLastName = 'Staff';
    if (note.staff_member) {
      const { data: staff } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', note.staff_member)
        .single();

      if (staff?.display_name) {
        staffName = staff.display_name;
        const parts = staff.display_name.split(' ');
        staffLastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      }
    }

    const student = placement?.trespass_records;
    const categoryData = note.daep_behavior_categories as unknown as CategoryData | null;
    const description = (note.description as string) || '';

    return {
      id: note.id,
      incident_date: note.incident_date,
      incident_time: note.incident_time,
      category: categoryData?.name as string | null ?? note.category,
      category_id: note.category_id,
      category_type: categoryData?.category_type as 'positive' | 'negative' | 'neutral' | null,
      description,
      description_snippet: description.length > 40 ? description.substring(0, 37) + '...' : description,
      action_taken: note.action_taken,
      staff_member: note.staff_member,
      staff_name: staffName,
      staff_last_name: staffLastName,
      placement_id: note.placement_id,
      student_school_id: student?.school_id as string ?? '',
      student_first_name: student?.first_name as string ?? '',
      student_last_name: student?.last_name as string ?? '',
      student_photo_url: student?.photo_url as string | null ?? null,
      home_campus_id: placement?.home_campus_id as string | null ?? null,
      home_campus_name: campusName,
      points: null,
      student_action: null,
      teacher_action: null,
      verified_by: note.verified_by,
      verified_at: note.verified_at,
      is_verified: !!note.verified_by,
      created_at: note.created_at,
      updated_at: note.updated_at,
    };
  } catch (error) {
    console.error('getBehaviorNoteById error:', error);
    return null;
  }
}

// ========== GET BEHAVIOR NOTES STATS ==========

/**
 * Get summary stats for the behavior notes page.
 * Returns total, today, negative, and unverified counts.
 *
 * Story 4-3: Behavior Notes List View - UX Quick Win
 */
export async function getBehaviorNotesStats(
  filters?: Partial<BehaviorNotesListQuery>
): Promise<BehaviorNotesStats> {
  try {
    const tenantId = await getTenantId();
    const supabase = await createServerClient();

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Build base queries for each stat
    let baseQuery = supabase
      .from('daep_behavior_notes')
      .select('id, incident_date, verified_by, category_id', { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply shared filters if provided
    if (filters?.date_from) {
      baseQuery = baseQuery.gte('incident_date', filters.date_from);
    }
    if (filters?.date_to) {
      baseQuery = baseQuery.lte('incident_date', filters.date_to);
    }
    if (filters?.staff_id) {
      baseQuery = baseQuery.eq('staff_member', filters.staff_id);
    }

    // Get all notes with current filters for total count
    const { count: total } = await baseQuery;

    // Get today's notes
    const { count: todayCount } = await supabase
      .from('daep_behavior_notes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('incident_date', today);

    // Get unverified notes (verified_by is null)
    const { count: unverifiedCount } = await supabase
      .from('daep_behavior_notes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('verified_by', null);

    // Get negative notes (need to join with categories)
    const { data: negativeNotes } = await supabase
      .from('daep_behavior_notes')
      .select('id, daep_behavior_categories!inner(category_type)')
      .eq('tenant_id', tenantId)
      .eq('daep_behavior_categories.category_type', 'negative');

    return {
      total: total || 0,
      today: todayCount || 0,
      negative: negativeNotes?.length || 0,
      unverified: unverifiedCount || 0,
    };
  } catch (error) {
    console.error('getBehaviorNotesStats error:', error);
    return { total: 0, today: 0, negative: 0, unverified: 0 };
  }
}

// ========== GET NEW NOTES COUNT SINCE ==========

/**
 * Get count of notes created since a given timestamp.
 * For the "X new" badge on the page title.
 *
 * Story 4-3: Behavior Notes List View - UX Quick Win
 */
export async function getNewNotesCountSince(timestamp: string): Promise<number> {
  try {
    const tenantId = await getTenantId();
    const supabase = await createServerClient();

    const { count } = await supabase
      .from('daep_behavior_notes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gt('created_at', timestamp);

    return count || 0;
  } catch (error) {
    console.error('getNewNotesCountSince error:', error);
    return 0;
  }
}

// ========== EXPORT BEHAVIOR NOTES TO CSV ==========

/**
 * Export behavior notes to CSV format.
 * Returns CSV string with 18 columns.
 *
 * Story 4-3: Behavior Notes List View
 */
export async function exportBehaviorNotesToCSV(
  filters?: Partial<BehaviorNotesListQuery>
): Promise<{ success: boolean; csv?: string; error?: string }> {
  try {
    const tenantId = await getTenantId();
    const supabase = await createServerClient();

    // Fetch all notes matching filters (no pagination for export)
    let query = supabase
      .from('daep_behavior_notes')
      .select(
        `
        id,
        incident_date,
        incident_time,
        category,
        category_id,
        description,
        action_taken,
        staff_member,
        verified_by,
        verified_at,
        created_at,
        updated_at,
        placement_id,
        daep_placements!inner (
          id,
          trespass_records!inner (
            school_id,
            first_name,
            last_name
          ),
          home_campus_id
        ),
        daep_behavior_categories (
          name,
          category_type
        )
      `
      )
      .eq('tenant_id', tenantId)
      .order('incident_date', { ascending: false })
      .order('incident_time', { ascending: false });

    // Apply filters
    if (filters?.date_from) {
      query = query.gte('incident_date', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('incident_date', filters.date_to);
    }
    if (filters?.staff_id) {
      query = query.eq('staff_member', filters.staff_id);
    }

    const { data: notes, error } = await query;

    if (error) {
      console.error('exportBehaviorNotesToCSV query error:', error);
      return { success: false, error: 'Failed to fetch notes for export' };
    }

    if (!notes || notes.length === 0) {
      return { success: false, error: 'No notes found matching filters' };
    }

    // Define types for joined data in CSV export
    interface CSVPlacementData {
      id: string;
      home_campus_id: string | null;
      trespass_records: {
        school_id: string;
        first_name: string;
        last_name: string;
      };
    }
    interface CSVCategoryData {
      name: string;
      category_type: string;
    }

    // Fetch campus names
    const campusIds = Array.from(
      new Set(
        notes
          .map((n) => {
            const p = n.daep_placements as unknown as CSVPlacementData;
            return p?.home_campus_id;
          })
          .filter((id): id is string => Boolean(id))
      )
    );

    const campusMap = new Map<string, string>();
    if (campusIds.length > 0) {
      const { data: campuses } = await supabase
        .from('campuses')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .in('id', campusIds);

      campuses?.forEach((c) => campusMap.set(c.id, c.name));
    }

    // Fetch staff names
    const staffIds = Array.from(new Set(notes.map((n) => n.staff_member).filter((id): id is string => Boolean(id))));
    const staffMap = new Map<string, { displayName: string; lastName: string }>();
    if (staffIds.length > 0) {
      const { data: staff } = await supabase
        .from('user_profiles')
        .select('id, display_name')
        .in('id', staffIds);

      staff?.forEach((s) => {
        const parts = (s.display_name || 'Staff').split(' ');
        const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
        staffMap.set(s.id, { displayName: s.display_name || 'Staff', lastName });
      });
    }

    // CSV headers (18 columns)
    const headers = [
      'Student Name',
      'Student ID',
      'Date',
      'Time',
      'Home Campus',
      'Category',
      'Category Type',
      'Student Action',
      'Teacher Action',
      'Points',
      'Description',
      'Action Taken',
      'Staff Last Name',
      'Staff Full Name',
      'Verified',
      'Verified At',
      'Recorded At',
      'Last Updated',
    ];

    // Build CSV rows
    const rows = notes.map((note) => {
      const placement = note.daep_placements as unknown as CSVPlacementData;
      const student = placement?.trespass_records;
      const categoryData = note.daep_behavior_categories as unknown as CSVCategoryData | null;
      const staffInfo = staffMap.get(note.staff_member) || { displayName: 'Staff', lastName: 'Staff' };

      return [
        escapeCSV(`${student?.last_name || ''}, ${student?.first_name || ''}`),
        escapeCSV(student?.school_id as string),
        escapeCSV(note.incident_date),
        escapeCSV(note.incident_time),
        escapeCSV(campusMap.get(placement?.home_campus_id as string) || ''),
        escapeCSV(categoryData?.name as string || note.category || ''),
        escapeCSV(categoryData?.category_type as string || ''),
        escapeCSV(''), // Student Action - would need point entry join
        escapeCSV(''), // Teacher Action - would need point entry join
        escapeCSV(''), // Points - would need point entry join
        escapeCSV(note.description),
        escapeCSV(note.action_taken),
        escapeCSV(staffInfo.lastName),
        escapeCSV(staffInfo.displayName),
        escapeCSV(note.verified_by ? 'Yes' : 'No'),
        escapeCSV(note.verified_at ? new Date(note.verified_at).toLocaleString() : ''),
        escapeCSV(note.created_at ? new Date(note.created_at).toLocaleString() : ''),
        escapeCSV(note.updated_at ? new Date(note.updated_at).toLocaleString() : ''),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return { success: true, csv };
  } catch (error) {
    console.error('exportBehaviorNotesToCSV error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export notes',
    };
  }
}
