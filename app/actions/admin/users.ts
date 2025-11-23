'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/audit-logger';
import { verifyServiceRoleOperation } from '@/lib/admin-auth';
import { UserProfile } from '@/lib/supabase';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AdminUserListItem = UserProfile & {
  campus_name?: string | null;
  tenant_name?: string | null;
  last_sign_in_at?: string | null;
};

/**
 * Get all users for admin view
 * Only accessible by master_admin
 */
export async function getUsersForAdmin(tenantId?: string): Promise<AdminUserListItem[]> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify admin permission (master_admin or district_admin)
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', userId)
      .single();

    if (!adminProfile || !['master_admin', 'district_admin'].includes(adminProfile.role)) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Use provided tenantId or fall back to user's tenant_id
    const targetTenantId = tenantId || adminProfile.tenant_id;

    // Get all users for the tenant (including soft-deleted)
    // For master_admin users, also include all master_admin accounts regardless of tenant
    let query = supabaseAdmin
      .from('user_profiles')
      .select('*');

    if (adminProfile.role === 'master_admin') {
      // Master admin sees: users in target tenant OR any master_admin user
      query = query.or(`tenant_id.eq.${targetTenantId},role.eq.master_admin`);
    } else {
      // District admin sees: only users in target tenant (master_admins will be filtered out later)
      query = query.eq('tenant_id', targetTenantId);
    }

    const { data: users, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('[getUsersForAdmin] Error fetching users', error);
      throw new Error('Failed to fetch users');
    }

    // Get all campuses for lookup
    const { data: campuses } = await supabaseAdmin
      .from('campuses')
      .select('id, name')
      .eq('tenant_id', targetTenantId);

    const campusMap = new Map(campuses?.map(c => [c.id, c.name]) || []);

    // Get all tenants for lookup
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id, display_name');

    const tenantMap = new Map(tenants?.map(t => [t.id, t.display_name]) || []);

    // Get last sign in timestamps from Clerk for all users
    const client = await clerkClient();
    const clerkUsersMap = new Map<string, number | null>();

    try {
      // Fetch users in batches from Clerk (max 500 at a time)
      const userIds = users?.map(u => u.id) || [];
      if (userIds.length > 0) {
        const clerkUsersList = await client.users.getUserList({
          userId: userIds,
          limit: 500,
        });

        clerkUsersList.data.forEach(clerkUser => {
          clerkUsersMap.set(clerkUser.id, clerkUser.lastSignInAt);
        });
      }
    } catch (error) {
      logger.error('[getUsersForAdmin] Error fetching Clerk data', error);
      // Continue without last sign in data if Clerk fetch fails
    }

    // Transform the data to include campus name, tenant name, and last sign in
    let transformedUsers: AdminUserListItem[] = (users || []).map((user: any) => ({
      ...user,
      campus_name: user.campus_id ? campusMap.get(user.campus_id) || null : null,
      tenant_name: user.tenant_id ? tenantMap.get(user.tenant_id) || null : null,
      last_sign_in_at: clerkUsersMap.has(user.id)
        ? (clerkUsersMap.get(user.id) ? new Date(clerkUsersMap.get(user.id)!).toISOString() : null)
        : null,
    }));

    // Filter out master_admin users unless the requesting user is also master_admin
    // This prevents lower-level admins from seeing or managing master_admin accounts
    if (adminProfile.role !== 'master_admin') {
      transformedUsers = transformedUsers.filter(user => user.role !== 'master_admin');
    }

    return transformedUsers;
  } catch (error: any) {
    console.error('[getUsersForAdmin] Error:', error);
    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('not authenticated') ||
      error.message.includes('Unauthorized')
    )) {
      throw error;
    }
    throw new Error('Failed to fetch users. Please try again.');
  }
}

/**
 * Update user role via Clerk API
 * Only accessible by master_admin
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: 'viewer' | 'campus_admin' | 'district_admin' | 'master_admin',
  campusId?: string | null,
  displayName?: string,
  notificationDays?: number
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify admin permission (master_admin or district_admin)
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, tenant_id, email')
      .eq('id', userId)
      .single();

    if (!adminProfile || !['master_admin', 'district_admin'].includes(adminProfile.role)) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get target user's current data
    const { data: targetUser } = await supabaseAdmin
      .from('user_profiles')
      .select('email, role, campus_id, tenant_id')
      .eq('id', targetUserId)
      .single();

    if (!targetUser) {
      throw new Error('User not found');
    }

    // Prevent district_admin from modifying master_admin accounts
    if (adminProfile.role === 'district_admin' && targetUser.role === 'master_admin') {
      throw new Error('Unauthorized: Cannot modify master admin accounts');
    }

    // Prevent district_admin from promoting users to master_admin
    if (adminProfile.role === 'district_admin' && newRole === 'master_admin') {
      throw new Error('Unauthorized: Cannot assign master admin role');
    }

    // Validate campus_id for campus_admin role
    if (newRole === 'campus_admin' && !campusId) {
      throw new Error('Campus ID is required for campus_admin role');
    }

    // Defense-in-depth: Verify service role operation before RLS bypass
    await verifyServiceRoleOperation(userId, targetUser.tenant_id);

    // Update Clerk user metadata
    const client = await clerkClient();
    await client.users.updateUser(targetUserId, {
      publicMetadata: {
        role: newRole,
        campus_id: campusId || null,
        tenant_id: adminProfile.tenant_id,
      },
    });

    // Update Supabase user_profiles
    const updateData: any = {
      role: newRole,
      campus_id: campusId || null,
      updated_at: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (displayName !== undefined) {
      updateData.display_name = displayName;
    }
    if (notificationDays !== undefined) {
      updateData.notification_days = notificationDays;
    }

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', targetUserId);

    if (error) {
      logger.error('[updateUserRole] Error updating user profile', error);
      throw new Error('Failed to update user profile');
    }

    // Log to audit log
    await logAuditEvent({
      eventType: 'user.updated',
      actorId: userId,
      actorEmail: adminProfile.email,
      actorRole: adminProfile.role,
      targetId: targetUserId,
      action: `Updated user role from ${targetUser.role} to ${newRole}`,
      details: {
        oldRole: targetUser.role,
        newRole,
        oldCampusId: targetUser.campus_id,
        newCampusId: campusId,
        userEmail: targetUser.email,
      },
    });

    logger.info('[updateUserRole] User role updated successfully', {
      targetUserId,
      newRole,
    });

    return {
      success: true,
      message: `User role updated to ${newRole}`,
    };
  } catch (error: any) {
    console.error('[updateUserRole] Error:', error);
    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('not authenticated') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('not found') ||
      error.message.includes('required') ||
      error.message.includes('Cannot')
    )) {
      throw error;
    }
    throw new Error('Failed to update user role. Please try again.');
  }
}

/**
 * Soft delete a user
 * Only accessible by master_admin
 */
export async function deleteUser(
  targetUserId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify admin permission (master_admin or district_admin)
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, tenant_id, email')
      .eq('id', userId)
      .single();

    if (!adminProfile || !['master_admin', 'district_admin'].includes(adminProfile.role)) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get target user's data
    const { data: targetUser } = await supabaseAdmin
      .from('user_profiles')
      .select('email, role, tenant_id')
      .eq('id', targetUserId)
      .single();

    if (!targetUser) {
      throw new Error('User not found');
    }

    // Prevent deleting yourself
    if (targetUserId === userId) {
      throw new Error('Cannot delete your own account');
    }

    // Prevent district_admin from deleting master_admin accounts
    if (adminProfile.role === 'district_admin' && targetUser.role === 'master_admin') {
      throw new Error('Unauthorized: Cannot delete master admin accounts');
    }

    // Defense-in-depth: Verify service role operation before RLS bypass
    await verifyServiceRoleOperation(userId, targetUser.tenant_id);

    // Soft delete in Supabase
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'inactive',
      })
      .eq('id', targetUserId);

    if (error) {
      logger.error('[deleteUser] Error soft-deleting user', error);
      throw new Error('Failed to delete user');
    }

    // Delete from Clerk
    const client = await clerkClient();
    await client.users.deleteUser(targetUserId);

    // Log to audit log
    await logAuditEvent({
      eventType: 'user.deleted',
      actorId: userId,
      actorEmail: adminProfile.email,
      actorRole: adminProfile.role,
      targetId: targetUserId,
      action: `Deleted user account`,
      details: {
        userEmail: targetUser.email,
        userRole: targetUser.role,
      },
    });

    logger.info('[deleteUser] User deleted successfully', { targetUserId });

    return {
      success: true,
      message: 'User deleted successfully',
    };
  } catch (error: any) {
    console.error('[deleteUser] Error:', error);
    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('not authenticated') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('not found') ||
      error.message.includes('Cannot')
    )) {
      throw error;
    }
    throw new Error('Failed to delete user. Please try again.');
  }
}
