'use server';

/**
 * Audit Log Server Actions
 *
 * Story 3-8: Point Audit Trail
 *
 * Provides server actions for querying audit logs:
 * - getStudentAuditLog: All audit entries for a student (admin only)
 * - getPlacementAuditLog: All audit entries for a placement (admin only)
 * - getRecentPlacementActivity: Limited preview for placement card (all staff)
 * - getAuditLogUsers: User list for filter dropdown
 */

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';

// ========== TYPES ==========

export interface AuditEntry {
  id: string;
  event_type: string;
  actor_id: string;
  actor_name: string;
  target_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  placement_label?: string;
}

export interface AuditFilterOptions {
  // Scope
  studentId?: string;
  placementId?: string;
  placementIds?: string[];

  // Filters
  userId?: string;
  eventCategory?: 'points' | 'attendance' | 'placement' | 'all';
  eventType?: string;
  startDate?: string;
  endDate?: string;
  searchText?: string;

  // Pagination
  limit?: number;
  offset?: number;
}

export interface AuditLogResult {
  entries: AuditEntry[];
  total: number;
  hasMore: boolean;
}

export interface AuditUser {
  id: string;
  name: string;
}

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
  isAdmin: boolean;
}

async function checkDAEPStaffRole(): Promise<DAEPStaffInfo> {
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

  const daepRoles = [
    'super_admin',
    'district_admin',
    'daep_admin_l1',
    'daep_admin_l2',
    'daep_staff',
  ];

  if (!daepRoles.includes(profile.role)) {
    throw new Error('Insufficient permissions. Only DAEP staff can view audit logs.');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
  const isAdmin = adminRoles.includes(profile.role);

  return {
    userId: user.id,
    role: profile.role,
    tenantId: effectiveTenantId,
    isAdmin,
  };
}

// ========== EVENT CATEGORY GROUPS ==========

const eventCategories = {
  points: [
    'points.base_auto_approved',
    'points.base_pending_approval',
    'points.base_removed',
    'points.auto_approved',
    'points.pending_approval',
    'points.adjustment_deleted',
    'points.adjustment_edited',
    'points.bulk_auto_approved',
    'points.bulk_pending_approval',
    'points.approved_by_admin',
    'points.rejected_by_admin',
    'points.bulk_approved_by_admin',
    'points.edited_and_approved',
  ],
  attendance: [
    'attendance.marked',
    'attendance.override',
  ],
  placement: [
    'placement.created',
    'placement.updated',
    'placement.intake_processed',
    'placement.transitioned',
    'placement.cancelled',
    'placement.no_show',
    'placement.rollover_decision',
    'room.assignment_changed',
    'student.separation_added',
    'student.separation_removed',
  ],
};

// ========== GET STUDENT AUDIT LOG ==========

/**
 * Get full audit history for a student across all placements.
 * Admin-only access.
 */
export async function getStudentAuditLog(
  studentId: string,
  placementIds: string[],
  options?: AuditFilterOptions
): Promise<AuditLogResult> {
  const { tenantId, isAdmin } = await checkDAEPStaffRole();

  if (!isAdmin) {
    throw new Error('Only administrators can view full audit logs');
  }

  const supabase = await createServerClient();
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  // Build the query
  let query = supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('module', 'daep_management');

  // Filter by student's placements or student ID
  if (placementIds.length > 0) {
    query = query.or(`target_id.in.(${placementIds.join(',')}),record_school_id.eq.${studentId}`);
  } else {
    query = query.eq('record_school_id', studentId);
  }

  // Apply filters
  if (options?.userId) {
    query = query.eq('actor_id', options.userId);
  }

  if (options?.eventCategory && options.eventCategory !== 'all') {
    const categoryEvents = eventCategories[options.eventCategory];
    if (categoryEvents) {
      query = query.in('event_type', categoryEvents);
    }
  }

  if (options?.eventType) {
    query = query.eq('event_type', options.eventType);
  }

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('created_at', options.endDate + 'T23:59:59.999Z');
  }

  if (options?.placementId) {
    query = query.eq('target_id', options.placementId);
  }

  if (options?.searchText) {
    query = query.ilike('action', `%${options.searchText}%`);
  }

  // Order and paginate
  const { data: entries, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching student audit log:', error);
    throw new Error('Failed to fetch audit log');
  }

  // Get unique actor IDs for display names
  const actorIds = Array.from(new Set((entries || []).map((e) => e.actor_id).filter(Boolean)));

  // Fetch user display names
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', actorIds);

  const userNameMap = new Map(users?.map((u) => [u.id, u.display_name || 'Unknown']) || []);

  // Get placement labels
  const targetIds = Array.from(new Set((entries || []).map((e) => e.target_id).filter(Boolean)));
  const { data: placements } = await supabase
    .from('daep_placements')
    .select('id, incident_number, status')
    .in('id', targetIds);

  const placementMap = new Map(
    placements?.map((p) => [p.id, `#${p.incident_number || 'N/A'} (${p.status})`]) || []
  );

  // Map entries
  const mappedEntries: AuditEntry[] = (entries || []).map((entry) => ({
    id: entry.id,
    event_type: entry.event_type,
    actor_id: entry.actor_id,
    actor_name: userNameMap.get(entry.actor_id) || 'Unknown',
    target_id: entry.target_id,
    action: entry.action,
    details: entry.details,
    created_at: entry.created_at,
    placement_label: entry.target_id ? placementMap.get(entry.target_id) : undefined,
  }));

  const total = count || 0;

  return {
    entries: mappedEntries,
    total,
    hasMore: offset + limit < total,
  };
}

// ========== GET PLACEMENT AUDIT LOG ==========

/**
 * Get full audit history for a specific placement.
 * Admin-only access.
 */
export async function getPlacementAuditLog(
  placementId: string,
  options?: AuditFilterOptions
): Promise<AuditLogResult> {
  const { tenantId, isAdmin } = await checkDAEPStaffRole();

  if (!isAdmin) {
    throw new Error('Only administrators can view full audit logs');
  }

  const supabase = await createServerClient();
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  // Build the query
  let query = supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('module', 'daep_management')
    .eq('target_id', placementId);

  // Apply filters
  if (options?.userId) {
    query = query.eq('actor_id', options.userId);
  }

  if (options?.eventCategory && options.eventCategory !== 'all') {
    const categoryEvents = eventCategories[options.eventCategory];
    if (categoryEvents) {
      query = query.in('event_type', categoryEvents);
    }
  }

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('created_at', options.endDate + 'T23:59:59.999Z');
  }

  // Order and paginate
  const { data: entries, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching placement audit log:', error);
    throw new Error('Failed to fetch audit log');
  }

  // Get unique actor IDs for display names
  const actorIds = Array.from(new Set((entries || []).map((e) => e.actor_id).filter(Boolean)));

  // Fetch user display names
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', actorIds);

  const userNameMap = new Map(users?.map((u) => [u.id, u.display_name || 'Unknown']) || []);

  // Map entries
  const mappedEntries: AuditEntry[] = (entries || []).map((entry) => ({
    id: entry.id,
    event_type: entry.event_type,
    actor_id: entry.actor_id,
    actor_name: userNameMap.get(entry.actor_id) || 'Unknown',
    target_id: entry.target_id,
    action: entry.action,
    details: entry.details,
    created_at: entry.created_at,
  }));

  const total = count || 0;

  return {
    entries: mappedEntries,
    total,
    hasMore: offset + limit < total,
  };
}

// ========== GET RECENT PLACEMENT ACTIVITY ==========

/**
 * Get recent activity preview for a placement card.
 * Accessible by all DAEP staff (limited data).
 */
export async function getRecentPlacementActivity(
  placementId: string,
  limit: number = 3
): Promise<AuditEntry[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Query recent entries (limited fields for non-admin)
  const { data: entries, error } = await supabase
    .from('admin_audit_log')
    .select('id, event_type, action, created_at, actor_id')
    .eq('tenant_id', tenantId)
    .eq('module', 'daep_management')
    .eq('target_id', placementId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }

  if (!entries || entries.length === 0) {
    return [];
  }

  // Get actor names
  const actorIds = Array.from(new Set(entries.map((e) => e.actor_id).filter(Boolean)));
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', actorIds);

  const userNameMap = new Map(users?.map((u) => [u.id, u.display_name || 'Unknown']) || []);

  // Return limited data (no sensitive details)
  return entries.map((entry) => ({
    id: entry.id,
    event_type: entry.event_type,
    actor_id: entry.actor_id,
    actor_name: userNameMap.get(entry.actor_id) || 'Unknown',
    target_id: placementId,
    action: entry.action,
    details: null, // Don't expose details to non-admins
    created_at: entry.created_at,
  }));
}

// ========== GET AUDIT LOG USERS ==========

/**
 * Get list of users who have performed audit actions for a student.
 * Used for filter dropdown.
 */
export async function getAuditLogUsers(
  studentId?: string,
  placementIds?: string[]
): Promise<AuditUser[]> {
  const { tenantId, isAdmin } = await checkDAEPStaffRole();

  if (!isAdmin) {
    return [];
  }

  const supabase = await createServerClient();

  // Get distinct actor IDs from audit log
  let query = supabase
    .from('admin_audit_log')
    .select('actor_id')
    .eq('tenant_id', tenantId)
    .eq('module', 'daep_management');

  if (placementIds && placementIds.length > 0) {
    query = query.in('target_id', placementIds);
  } else if (studentId) {
    query = query.eq('record_school_id', studentId);
  }

  const { data: logs } = await query;

  if (!logs || logs.length === 0) {
    return [];
  }

  // Get unique actor IDs
  const actorIds = Array.from(new Set(logs.map((l) => l.actor_id).filter(Boolean)));

  // Fetch user details
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', actorIds);

  return (users || []).map((u) => ({
    id: u.id,
    name: u.display_name || 'Unknown',
  }));
}

// ========== GET AUDIT ENTRY DETAIL ==========

/**
 * Get full details for a single audit entry.
 * Admin-only access.
 */
export async function getAuditEntryDetail(
  entryId: string
): Promise<AuditEntry | null> {
  const { tenantId, isAdmin } = await checkDAEPStaffRole();

  if (!isAdmin) {
    throw new Error('Only administrators can view audit details');
  }

  const supabase = await createServerClient();

  const { data: entry, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .eq('id', entryId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !entry) {
    return null;
  }

  // Get actor name
  const { data: user } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', entry.actor_id)
    .single();

  return {
    id: entry.id,
    event_type: entry.event_type,
    actor_id: entry.actor_id,
    actor_name: user?.display_name || 'Unknown',
    target_id: entry.target_id,
    action: entry.action,
    details: entry.details,
    created_at: entry.created_at,
  };
}

// ========== GET AUDIT SUMMARY STATS ==========

/**
 * Get summary stats for audit entries.
 * Admin-only access.
 */
export async function getAuditSummaryStats(
  studentId: string,
  placementIds: string[]
): Promise<{ points: number; attendance: number; placement: number; total: number }> {
  const { tenantId, isAdmin } = await checkDAEPStaffRole();

  if (!isAdmin) {
    return { points: 0, attendance: 0, placement: 0, total: 0 };
  }

  const supabase = await createServerClient();

  // Get all entries for counting
  let query = supabase
    .from('admin_audit_log')
    .select('event_type')
    .eq('tenant_id', tenantId)
    .eq('module', 'daep_management');

  if (placementIds.length > 0) {
    query = query.or(`target_id.in.(${placementIds.join(',')}),record_school_id.eq.${studentId}`);
  } else {
    query = query.eq('record_school_id', studentId);
  }

  const { data: entries } = await query;

  if (!entries) {
    return { points: 0, attendance: 0, placement: 0, total: 0 };
  }

  let points = 0;
  let attendance = 0;
  let placement = 0;

  entries.forEach((e) => {
    if (eventCategories.points.includes(e.event_type)) {
      points++;
    } else if (eventCategories.attendance.includes(e.event_type)) {
      attendance++;
    } else if (eventCategories.placement.includes(e.event_type)) {
      placement++;
    }
  });

  return {
    points,
    attendance,
    placement,
    total: entries.length,
  };
}
