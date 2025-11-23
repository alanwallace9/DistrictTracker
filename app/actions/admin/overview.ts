'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  totalCampuses: number;
  totalRecords: number;
};

/**
 * Get overview statistics for admin dashboard
 * Only accessible by master_admin
 * @param tenantId - Optional tenant ID to fetch stats for (defaults to user's tenant)
 */
export async function getAdminStats(tenantId?: string): Promise<AdminStats> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify master_admin permission and get tenant_id
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

    // Get all stats for the tenant
    const [usersResult, campusesResult, recordsResult] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select('id, status, deleted_at', { count: 'exact' })
        .eq('tenant_id', targetTenantId),
      supabaseAdmin
        .from('campuses')
        .select('id', { count: 'exact' })
        .eq('tenant_id', targetTenantId)
        .is('deleted_at', null),
      supabaseAdmin
        .from('trespass_records')
        .select('id', { count: 'exact' })
        .is('deleted_at', null)
        .eq('tenant_id', targetTenantId),
    ]);

    const totalUsers = usersResult.count || 0;
    const activeUsers = usersResult.data?.filter(
      (u) => !u.deleted_at && u.status === 'active'
    ).length || 0;

    return {
      totalUsers,
      activeUsers,
      totalCampuses: campusesResult.count || 0,
      totalRecords: recordsResult.count || 0,
    };
  } catch (error: any) {
    logger.error('[getAdminStats] Error', { error: error.message });
    throw error;
  }
}
