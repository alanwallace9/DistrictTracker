'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { verifyServiceRoleOperation } from '@/lib/admin-auth';
import { Campus } from '@/lib/supabase';
import { AdminUserListItem } from './users';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type CampusWithCounts = Campus & {
  user_count: number;
  record_count: number;
};

/**
 * Get all campuses for admin view (basic info only)
 * Only accessible by master_admin
 * @param tenantId - Optional tenant ID to fetch campuses for (defaults to user's tenant)
 */
export async function getCampuses(tenantId?: string): Promise<Campus[]> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify master_admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', userId)
      .single();

    if (!adminProfile || adminProfile.role !== 'master_admin') {
      throw new Error('Unauthorized: Master admin access required');
    }

    // Use provided tenantId or fall back to user's tenant_id
    const targetTenantId = tenantId || adminProfile.tenant_id;

    const { data, error } = await supabaseAdmin
      .from('campuses')
      .select('*')
      .eq('tenant_id', targetTenantId)
      .is('deleted_at', null)
      .order('name');

    if (error) {
      logger.error('[getCampuses] Error fetching campuses', error);
      throw new Error('Failed to fetch campuses');
    }

    return data || [];
  } catch (error: any) {
    console.error('[getCampuses] Error:', error);
    throw new Error('Failed to fetch campuses. Please try again.');
  }
}

/**
 * Get all campuses with user and record counts for admin view
 * Only accessible by master_admin
 * Uses optimized SQL function for better performance
 * @param tenantId - Optional tenant ID to fetch campuses for (defaults to user's tenant)
 */
export async function getCampusesWithCounts(tenantId?: string): Promise<CampusWithCounts[]> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify master_admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', userId)
      .single();

    if (!adminProfile || adminProfile.role !== 'master_admin') {
      throw new Error('Unauthorized: Master admin access required');
    }

    // Use provided tenantId or fall back to user's tenant_id
    const targetTenantId = tenantId || adminProfile.tenant_id;

    // Use optimized SQL function for aggregation
    const { data, error } = await supabaseAdmin.rpc('get_campuses_with_counts', {
      p_tenant_id: targetTenantId,
    });

    if (error) {
      logger.error('[getCampusesWithCounts] Error fetching campuses', error);
      throw new Error('Failed to fetch campuses');
    }

    return data || [];
  } catch (error: any) {
    console.error('[getCampusesWithCounts] Error:', error);
    throw new Error('Failed to fetch campuses. Please try again.');
  }
}

/**
 * Get users for a specific campus
 * Only accessible by master_admin
 */
export async function getUsersForCampus(campusId: string): Promise<AdminUserListItem[]> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify master_admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', userId)
      .single();

    if (!adminProfile || adminProfile.role !== 'master_admin') {
      throw new Error('Unauthorized: Master admin access required');
    }

    // Get users for this campus
    const { data: users, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('tenant_id', adminProfile.tenant_id)
      .eq('campus_id', campusId)
      .is('deleted_at', null)
      .order('display_name', { ascending: true });

    if (error) {
      logger.error('[getUsersForCampus] Error fetching users', error);
      throw new Error('Failed to fetch users');
    }

    // Get campus name
    const { data: campus } = await supabaseAdmin
      .from('campuses')
      .select('name')
      .eq('id', campusId)
      .single();

    return (users || []).map((user) => ({
      ...user,
      campus_name: campus?.name || null,
    }));
  } catch (error: any) {
    console.error('[getUsersForCampus] Error:', error);
    throw new Error('Failed to fetch users for campus. Please try again.');
  }
}

/**
 * Get records for a specific campus
 * Only accessible by master_admin
 */
export async function getRecordsForCampus(campusId: string) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify master_admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', userId)
      .single();

    if (!adminProfile || adminProfile.role !== 'master_admin') {
      throw new Error('Unauthorized: Master admin access required');
    }

    // Get records for this campus
    // Special case: Campus 006 (DAEP) shows all records where is_daep = true
    let query = supabaseAdmin
      .from('trespass_records')
      .select('*')
      .eq('tenant_id', adminProfile.tenant_id);

    if (campusId === '006') {
      // DAEP campus: show all DAEP students regardless of home campus
      query = query.eq('is_daep', true);
    } else {
      // Regular campus: show records assigned to this campus
      query = query.eq('campus_id', campusId);
    }

    const { data: records, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('[getRecordsForCampus] Error fetching records', error);
      throw new Error('Failed to fetch records');
    }

    return records || [];
  } catch (error: any) {
    console.error('[getRecordsForCampus] Error:', error);
    throw new Error('Failed to fetch records for campus. Please try again.');
  }
}

/**
 * Check if campus name is unique within tenant
 * Case-insensitive check
 */
export async function isCampusNameUnique(name: string, excludeCampusId?: string): Promise<boolean> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', userId)
      .single();

    if (!profile || (profile.role !== 'master_admin' && profile.role !== 'district_admin')) {
      throw new Error('Unauthorized: Admin access required');
    }

    let query = supabaseAdmin
      .from('campuses')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .ilike('name', name)
      .is('deleted_at', null);

    if (excludeCampusId) {
      query = query.neq('id', excludeCampusId);
    }

    const { data } = await query;
    return data?.length === 0;
  } catch (error: any) {
    console.error('[isCampusNameUnique] Error:', error);
    throw new Error('Failed to validate campus name. Please try again.');
  }
}

/**
 * Create a new campus
 */
export async function createCampus(campusData: {
  id: string;
  name: string;
  status: string;
  abbreviation?: string;
}): Promise<Campus> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', userId)
      .single();

    if (!profile || (profile.role !== 'master_admin' && profile.role !== 'district_admin')) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Validate campus ID format
    const idPattern = /^[a-z0-9][a-z0-9-_]{0,49}$/i;
    if (!idPattern.test(campusData.id)) {
      throw new Error('Invalid campus ID format');
    }

    // Check if ID already exists
    const { data: existingById } = await supabaseAdmin
      .from('campuses')
      .select('id')
      .eq('id', campusData.id)
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null)
      .single();

    if (existingById) {
      throw new Error('A campus with this ID already exists');
    }

    // Check if name is unique
    const isUnique = await isCampusNameUnique(campusData.name);
    if (!isUnique) {
      throw new Error('A campus with this name already exists');
    }

    // Create campus
    const { data: campus, error } = await supabaseAdmin
      .from('campuses')
      .insert({
        id: campusData.id,
        tenant_id: profile.tenant_id,
        name: campusData.name,
        abbreviation: campusData.abbreviation || null,
        status: campusData.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('[createCampus] Error creating campus', error);
      throw new Error('Failed to create campus');
    }

    logger.info('[createCampus] Campus created', { campusId: campus.id, name: campus.name });
    return campus;
  } catch (error: any) {
    console.error('[createCampus] Error:', error);
    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('Invalid campus ID') ||
      error.message.includes('already exists') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('Not authenticated')
    )) {
      throw error;
    }
    throw new Error('Failed to create campus. Please try again.');
  }
}

/**
 * Update an existing campus
 */
export async function updateCampus(
  campusId: string,
  updates: {
    name?: string;
    status?: string;
    abbreviation?: string;
  }
): Promise<Campus> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', userId)
      .single();

    if (!profile || (profile.role !== 'master_admin' && profile.role !== 'district_admin')) {
      throw new Error('Unauthorized: Admin access required');
    }

    // If updating name, check uniqueness
    if (updates.name) {
      const isUnique = await isCampusNameUnique(updates.name, campusId);
      if (!isUnique) {
        throw new Error('A campus with this name already exists');
      }
    }

    // Defense-in-depth: Verify service role operation before RLS bypass
    await verifyServiceRoleOperation(userId, profile.tenant_id);

    // Update campus
    const { data: campus, error } = await supabaseAdmin
      .from('campuses')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campusId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single();

    if (error) {
      logger.error('[updateCampus] Error updating campus', error);
      throw new Error('Failed to update campus');
    }

    logger.info('[updateCampus] Campus updated', { campusId, updates });
    return campus;
  } catch (error: any) {
    console.error('[updateCampus] Error:', error);
    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('already exists') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('Not authenticated')
    )) {
      throw error;
    }
    throw new Error('Failed to update campus. Please try again.');
  }
}

/**
 * Get campus by ID
 */
export async function getCampusById(campusId: string): Promise<Campus> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    const { data: campus, error } = await supabaseAdmin
      .from('campuses')
      .select('*')
      .eq('id', campusId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (error) {
      logger.error('[getCampusById] Error fetching campus', error);
      throw new Error('Failed to fetch campus');
    }

    return campus;
  } catch (error: any) {
    console.error('[getCampusById] Error:', error);
    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('not found') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('Not authenticated')
    )) {
      throw error;
    }
    throw new Error('Failed to fetch campus. Please try again.');
  }
}

/**
 * Check if campus can be deactivated
 * Returns user and record counts and whether deactivation is allowed
 */
export async function canDeactivateCampus(campusId: string): Promise<{
  canDeactivate: boolean;
  userCount: number;
  recordCount: number;
  blockers: string[];
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', userId)
      .single();

    if (!profile || (profile.role !== 'master_admin' && profile.role !== 'district_admin')) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get user counts per campus
    const { data: users } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('campus_id', campusId)
      .eq('tenant_id', profile.tenant_id)
      .is('deleted_at', null);

    // Get record counts per campus
    const { data: records } = await supabaseAdmin
      .from('trespass_records')
      .select('id')
      .eq('campus_id', campusId)
      .eq('tenant_id', profile.tenant_id);

    const userCount = users?.length || 0;
    const recordCount = records?.length || 0;

    const blockers: string[] = [];
    if (userCount > 0) blockers.push(`${userCount} users assigned`);
    if (recordCount > 0) blockers.push(`${recordCount} records assigned`);

    return {
      canDeactivate: blockers.length === 0,
      userCount,
      recordCount,
      blockers,
    };
  } catch (error: any) {
    console.error('[canDeactivateCampus] Error:', error);
    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('Unauthorized') ||
      error.message.includes('Not authenticated')
    )) {
      throw error;
    }
    throw new Error('Failed to check campus status. Please try again.');
  }
}

/**
 * Deactivate a campus
 * Only allowed if no users or records are assigned
 */
export async function deactivateCampus(campusId: string): Promise<void> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, role, email')
      .eq('id', userId)
      .single();

    if (!profile || (profile.role !== 'master_admin' && profile.role !== 'district_admin')) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Verify can deactivate
    const check = await canDeactivateCampus(campusId);
    if (!check.canDeactivate) {
      throw new Error(`Cannot deactivate: ${check.blockers.join(', ')}`);
    }

    // Get campus details for audit log
    const { data: campus } = await supabaseAdmin
      .from('campuses')
      .select('*')
      .eq('id', campusId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!campus) {
      throw new Error('Campus not found');
    }

    // Defense-in-depth: Verify service role operation before RLS bypass
    await verifyServiceRoleOperation(userId, campus.tenant_id);

    // Update status
    const { error } = await supabaseAdmin
      .from('campuses')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', campusId)
      .eq('tenant_id', profile.tenant_id);

    if (error) {
      logger.error('[deactivateCampus] Error updating campus', error);
      throw new Error('Failed to deactivate campus');
    }

    // Log audit event
    const { logAuditEvent } = await import('@/lib/audit-logger');
    await logAuditEvent({
      eventType: 'campus.deactivated',
      actorId: userId,
      actorEmail: profile.email || undefined,
      actorRole: profile.role,
      targetId: campusId,
      action: `Deactivated campus: ${campus.name}`,
      tenantId: profile.tenant_id,
      details: {
        campus_id: campusId,
        campus_name: campus.name,
        previous_status: campus.status,
        new_status: 'inactive',
      },
    });

    logger.info('[deactivateCampus] Campus deactivated', { campusId, name: campus.name });
  } catch (error: any) {
    console.error('[deactivateCampus] Error:', error);
    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('Cannot deactivate') ||
      error.message.includes('not found') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('Not authenticated')
    )) {
      throw error;
    }
    throw new Error('Failed to deactivate campus. Please try again.');
  }
}

/**
 * Activate a campus
 */
export async function activateCampus(campusId: string): Promise<void> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, role, email')
      .eq('id', userId)
      .single();

    if (!profile || (profile.role !== 'master_admin' && profile.role !== 'district_admin')) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get campus details
    const { data: campus } = await supabaseAdmin
      .from('campuses')
      .select('*')
      .eq('id', campusId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!campus) {
      throw new Error('Campus not found');
    }

    // Defense-in-depth: Verify service role operation before RLS bypass
    await verifyServiceRoleOperation(userId, campus.tenant_id);

    // Update status
    const { error } = await supabaseAdmin
      .from('campuses')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', campusId)
      .eq('tenant_id', profile.tenant_id);

    if (error) {
      logger.error('[activateCampus] Error updating campus', error);
      throw new Error('Failed to activate campus');
    }

    // Log audit event
    const { logAuditEvent } = await import('@/lib/audit-logger');
    await logAuditEvent({
      eventType: 'campus.activated',
      actorId: userId,
      actorEmail: profile.email || undefined,
      actorRole: profile.role,
      targetId: campusId,
      action: `Activated campus: ${campus.name}`,
      tenantId: profile.tenant_id,
      details: {
        campus_id: campusId,
        campus_name: campus.name,
        previous_status: campus.status,
        new_status: 'active',
      },
    });

    logger.info('[activateCampus] Campus activated', { campusId, name: campus.name });
  } catch (error: any) {
    console.error('[activateCampus] Error:', error);
    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('not found') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('Not authenticated')
    )) {
      throw error;
    }
    throw new Error('Failed to activate campus. Please try again.');
  }
}
