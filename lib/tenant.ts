/**
 * Centralized Tenant ID Resolution
 *
 * Single source of truth for getting the effective tenant ID in server actions.
 * Middleware handles tenant switching (localhost → staging, subdomain → tenant).
 * This function reads the user's effective tenant from their profile.
 */

import { currentUser } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Get the effective tenant ID for the current request.
 *
 * Resolution order:
 * 1. If user has active_tenant_id set → return active_tenant_id (middleware sets this)
 * 2. Otherwise → return user's tenant_id from profile
 *
 * Note: Middleware handles auto-switching active_tenant_id based on subdomain:
 * - localhost → staging (if user authorized)
 * - staging.districttracker.com → staging (if user authorized)
 * - demo.districttracker.com → demo (public)
 * - {tenant}.districttracker.com → tenant (if user's assigned tenant)
 *
 * @throws Error if user is not authenticated or profile not found
 */
export async function getTenantId(): Promise<string> {
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

  // active_tenant_id is set by middleware based on subdomain/localhost
  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;

  if (!effectiveTenantId) {
    throw new Error('No tenant assigned to user');
  }

  return effectiveTenantId;
}

/**
 * Get tenant ID with optional override for specific scenarios (e.g., admin tools)
 *
 * @param overrideTenantId - Explicit tenant ID to use (must be authorized)
 */
export async function getTenantIdWithOverride(
  overrideTenantId?: string
): Promise<string> {
  if (!overrideTenantId) {
    return getTenantId();
  }

  // Validate the user has access to the override tenant
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  // Only super_admin can override to any tenant
  if (profile?.role === 'super_admin') {
    return overrideTenantId;
  }

  // Otherwise, user can only access their own tenant
  if (profile?.tenant_id === overrideTenantId) {
    return overrideTenantId;
  }

  throw new Error('Not authorized to access this tenant');
}
