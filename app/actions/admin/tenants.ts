'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/audit-logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type Tenant = {
  id: string;
  subdomain: string;
  display_name: string;
  short_display_name?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

/**
 * Get all tenants - only accessible by master_admin
 */
export async function getTenants(): Promise<Tenant[]> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify master_admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!adminProfile || adminProfile.role !== 'master_admin') {
      throw new Error('Unauthorized: Master admin access required');
    }

    // Get all tenants
    const { data: tenants, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .order('display_name', { ascending: true });

    if (error) {
      logger.error('[getTenants] Error fetching tenants', error);
      throw new Error('Failed to fetch tenants');
    }

    return tenants || [];
  } catch (error: any) {
    logger.error('[getTenants] Error', { error: error.message });
    throw error;
  }
}

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify master_admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!adminProfile || adminProfile.role !== 'master_admin') {
      throw new Error('Unauthorized: Master admin access required');
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) {
      logger.error('[getTenantById] Error fetching tenant', error);
      return null;
    }

    return tenant;
  } catch (error: any) {
    logger.error('[getTenantById] Error', { error: error.message });
    throw error;
  }
}

/**
 * Get tenant by subdomain
 */
export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  try {
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('subdomain', subdomain)
      .single();

    if (error) {
      logger.error('[getTenantBySubdomain] Error fetching tenant', error);
      return null;
    }

    return tenant;
  } catch (error: any) {
    logger.error('[getTenantBySubdomain] Error', { error: error.message });
    return null;
  }
}

/**
 * Create new tenant - only accessible by master_admin
 */
export async function createTenant(data: {
  id: string;
  subdomain: string;
  display_name: string;
  short_display_name?: string;
}): Promise<{
  success: boolean;
  error?: string;
  tenant?: Tenant;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify master_admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (!adminProfile || adminProfile.role !== 'master_admin') {
      return { success: false, error: 'Unauthorized: Master admin access required' };
    }

    // Validate subdomain format (lowercase alphanumeric and hyphens only)
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(data.subdomain)) {
      return {
        success: false,
        error: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
      };
    }

    // Check if subdomain already exists
    const existing = await getTenantBySubdomain(data.subdomain);
    if (existing) {
      return { success: false, error: 'Subdomain already exists' };
    }

    // Check if tenant ID already exists
    const existingId = await getTenantById(data.id);
    if (existingId) {
      return { success: false, error: 'Tenant ID already exists' };
    }

    // Create tenant
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .insert({
        id: data.id,
        subdomain: data.subdomain,
        display_name: data.display_name,
        short_display_name: data.short_display_name || null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('[createTenant] Error creating tenant', error);
      return { success: false, error: 'Failed to create tenant' };
    }

    // Log to audit log
    await logAuditEvent({
      eventType: 'user.created',
      actorId: userId,
      actorRole: 'master_admin',
      targetId: tenant.id,
      action: 'Created new tenant',
      details: {
        tenant_id: tenant.id,
        subdomain: tenant.subdomain,
        display_name: tenant.display_name,
        actor_email: adminProfile.email,
      },
    });

    logger.info('[createTenant] Tenant created successfully', { tenantId: tenant.id });
    return { success: true, tenant };
  } catch (error: any) {
    logger.error('[createTenant] Error', { error: error.message });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update tenant - only accessible by master_admin
 */
export async function updateTenant(
  tenantId: string,
  data: {
    subdomain?: string;
    display_name?: string;
    short_display_name?: string;
    status?: string;
  }
): Promise<{
  success: boolean;
  error?: string;
  tenant?: Tenant;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify master_admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (!adminProfile || adminProfile.role !== 'master_admin') {
      return { success: false, error: 'Unauthorized: Master admin access required' };
    }

    // Verify tenant exists
    const existingTenant = await getTenantById(tenantId);
    if (!existingTenant) {
      return { success: false, error: 'Tenant not found' };
    }

    // If subdomain is being changed, validate and check for duplicates
    if (data.subdomain && data.subdomain !== existingTenant.subdomain) {
      const subdomainRegex = /^[a-z0-9-]+$/;
      if (!subdomainRegex.test(data.subdomain)) {
        return {
          success: false,
          error: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
        };
      }

      const duplicate = await getTenantBySubdomain(data.subdomain);
      if (duplicate) {
        return { success: false, error: 'Subdomain already exists' };
      }
    }

    // Update tenant
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) {
      logger.error('[updateTenant] Error updating tenant', error);
      return { success: false, error: 'Failed to update tenant' };
    }

    // Log to audit log
    await logAuditEvent({
      eventType: 'user.updated',
      actorId: userId,
      actorRole: 'master_admin',
      targetId: tenant.id,
      action: 'Updated tenant',
      details: {
        tenant_id: tenant.id,
        changes: data,
        actor_email: adminProfile.email,
      },
    });

    logger.info('[updateTenant] Tenant updated successfully', { tenantId: tenant.id });
    return { success: true, tenant };
  } catch (error: any) {
    logger.error('[updateTenant] Error', { error: error.message });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Deactivate tenant - only accessible by master_admin
 */
export async function deactivateTenant(tenantId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify master_admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (!adminProfile || adminProfile.role !== 'master_admin') {
      return { success: false, error: 'Unauthorized: Master admin access required' };
    }

    // Verify tenant exists
    const existingTenant = await getTenantById(tenantId);
    if (!existingTenant) {
      return { success: false, error: 'Tenant not found' };
    }

    // Update tenant status to inactive
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) {
      logger.error('[deactivateTenant] Error deactivating tenant', error);
      return { success: false, error: 'Failed to deactivate tenant' };
    }

    // Log to audit log
    await logAuditEvent({
      eventType: 'user.deleted',
      actorId: userId,
      actorRole: 'master_admin',
      targetId: tenantId,
      action: 'Deactivated tenant',
      details: {
        tenant_id: tenantId,
        tenant_display_name: existingTenant.display_name,
        actor_email: adminProfile.email,
      },
    });

    logger.info('[deactivateTenant] Tenant deactivated successfully', { tenantId });
    return { success: true };
  } catch (error: any) {
    logger.error('[deactivateTenant] Error', { error: error.message });
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Reactivate tenant - only accessible by master_admin
 */
export async function reactivateTenant(tenantId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify master_admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (!adminProfile || adminProfile.role !== 'master_admin') {
      return { success: false, error: 'Unauthorized: Master admin access required' };
    }

    // Verify tenant exists
    const existingTenant = await getTenantById(tenantId);
    if (!existingTenant) {
      return { success: false, error: 'Tenant not found' };
    }

    // Update tenant status to active
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) {
      logger.error('[reactivateTenant] Error reactivating tenant', error);
      return { success: false, error: 'Failed to reactivate tenant' };
    }

    // Log to audit log
    await logAuditEvent({
      eventType: 'user.updated',
      actorId: userId,
      actorRole: 'master_admin',
      targetId: tenantId,
      action: 'Reactivated tenant',
      details: {
        tenant_id: tenantId,
        tenant_display_name: existingTenant.display_name,
        actor_email: adminProfile.email,
      },
    });

    logger.info('[reactivateTenant] Tenant reactivated successfully', { tenantId });
    return { success: true };
  } catch (error: any) {
    logger.error('[reactivateTenant] Error', { error: error.message });
    return { success: false, error: 'An unexpected error occurred' };
  }
}
