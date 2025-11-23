/**
 * Admin authentication and authorization utilities
 * Defense-in-depth security for service role operations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type UserRole = 'viewer' | 'campus_admin' | 'district_admin' | 'master_admin';

export interface AdminProfile {
  id: string;
  role: UserRole;
  tenant_id: string | null;
  active_tenant_id: string | null;
  email: string;
}

/**
 * Verify admin has required role and tenant access
 * Defense-in-depth check before service role operations
 *
 * @param userId - Clerk user ID
 * @param requiredRoles - Array of roles that have permission
 * @param requestedTenantId - Optional tenant ID being accessed
 * @returns AdminProfile if authorized
 * @throws Error if unauthorized
 */
export async function verifyAdminAccess(
  userId: string,
  requiredRoles: UserRole[],
  requestedTenantId?: string
): Promise<AdminProfile> {
  // Get user profile
  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, role, tenant_id, active_tenant_id, email')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  // Check role permission
  if (!requiredRoles.includes(profile.role as UserRole)) {
    throw new Error(`Unauthorized: Requires one of: ${requiredRoles.join(', ')}`);
  }

  // If accessing a specific tenant, verify access
  if (requestedTenantId) {
    // Master admin can access any tenant
    if (profile.role === 'master_admin') {
      return profile as AdminProfile;
    }

    // Other admins can only access their own tenant
    if (profile.tenant_id !== requestedTenantId) {
      throw new Error('Unauthorized: Cannot access data from other tenants');
    }
  }

  return profile as AdminProfile;
}

/**
 * Verify user can perform service role bypass operation
 * Additional check to ensure tenant isolation even with elevated privileges
 *
 * @param userId - Clerk user ID
 * @param targetTenantId - Tenant ID of the resource being accessed
 * @throws Error if tenant mismatch (unless master_admin)
 */
export async function verifyServiceRoleOperation(
  userId: string,
  targetTenantId: string
): Promise<AdminProfile> {
  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, role, tenant_id, active_tenant_id, email')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  // Master admin can bypass tenant isolation
  if (profile.role === 'master_admin') {
    return profile as AdminProfile;
  }

  // All other users must match tenant
  if (profile.tenant_id !== targetTenantId) {
    console.error('[verifyServiceRoleOperation] Tenant mismatch', {
      userId,
      userTenant: profile.tenant_id,
      requestedTenant: targetTenantId,
      role: profile.role,
    });
    throw new Error('Unauthorized: Tenant isolation violation detected');
  }

  return profile as AdminProfile;
}

/**
 * Get effective tenant ID for the current user
 * Uses active_tenant_id if set, otherwise tenant_id
 *
 * @param userId - Clerk user ID
 * @returns Tenant ID to use for queries
 */
export async function getEffectiveTenantId(userId: string): Promise<string> {
  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('tenant_id, active_tenant_id')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;

  if (!effectiveTenantId) {
    throw new Error('No tenant assigned to user');
  }

  return effectiveTenantId;
}
