'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/audit-logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Switch the active tenant for the current user (master_admin only)
 * This updates the active_tenant_id in user_profiles, which is used by RLS
 *
 * @param tenantId - The tenant ID to switch to
 * @returns Success status and message
 */
export async function switchActiveTenant(tenantId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      logger.error('[switchActiveTenant] Not authenticated');
      return { success: false, error: 'Not authenticated' };
    }

    // Get user profile to verify master_admin role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, tenant_id, active_tenant_id, email')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      logger.error('[switchActiveTenant] Error fetching user profile', profileError);
      return { success: false, error: 'Failed to fetch user profile' };
    }

    // Only master_admin can switch tenants
    if (userProfile.role !== 'master_admin') {
      logger.warn('[switchActiveTenant] Unauthorized tenant switch attempt', {
        userId,
        role: userProfile.role,
      });
      return { success: false, error: 'Only master admins can switch tenants' };
    }

    // Verify target tenant exists
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, display_name')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      logger.error('[switchActiveTenant] Invalid tenant ID', { tenantId });
      return { success: false, error: 'Tenant not found' };
    }

    // Update active_tenant_id
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        active_tenant_id: tenantId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      logger.error('[switchActiveTenant] Error updating active_tenant_id', updateError);
      return { success: false, error: 'Failed to switch tenant' };
    }

    // Log to audit log for FERPA compliance
    await logAuditEvent({
      eventType: 'tenant.switched',
      actorId: userId,
      actorRole: 'master_admin',
      targetId: tenantId,
      action: 'Switched active tenant',
      details: {
        from_tenant_id: userProfile.active_tenant_id || userProfile.tenant_id,
        to_tenant_id: tenantId,
        to_tenant_name: tenant.display_name,
        user_email: userProfile.email,
      },
    });

    logger.info('[switchActiveTenant] Tenant switched successfully', {
      userId,
      fromTenant: userProfile.active_tenant_id || userProfile.tenant_id,
      toTenant: tenantId,
    });

    return { success: true };
  } catch (error: any) {
    logger.error('[switchActiveTenant] Unexpected error', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get the current active tenant for the user
 * @returns The active tenant ID, or null if not set
 */
export async function getActiveTenant(): Promise<{
  tenantId: string | null;
  error?: string;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { tenantId: null, error: 'Not authenticated' };
    }

    const { data: userProfile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('active_tenant_id, tenant_id')
      .eq('id', userId)
      .single();

    if (error || !userProfile) {
      logger.error('[getActiveTenant] Error fetching user profile', error);
      return { tenantId: null, error: 'Failed to fetch user profile' };
    }

    // Return active_tenant_id if set, otherwise return assigned tenant_id
    return {
      tenantId: userProfile.active_tenant_id || userProfile.tenant_id,
    };
  } catch (error: any) {
    logger.error('[getActiveTenant] Unexpected error', error);
    return { tenantId: null, error: 'An unexpected error occurred' };
  }
}
