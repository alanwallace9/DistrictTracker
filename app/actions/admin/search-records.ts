'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type RecordSearchResult = {
  id: string;
  first_name: string;
  last_name: string;
  school_id: string;
  status: string;
};

/**
 * Search records by name or school ID for quick lookup
 * Returns max 10 results
 * @param tenantId - Optional tenant ID to search within (defaults to user's tenant)
 */
export async function searchRecords(query: string, tenantId?: string): Promise<RecordSearchResult[]> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', userId)
      .single();

    if (!adminProfile || !['master_admin', 'district_admin'].includes(adminProfile.role)) {
      throw new Error('Unauthorized: Admin access required');
    }

    if (!query || query.length < 3) {
      return [];
    }

    // Use provided tenantId or fall back to user's tenant_id
    const targetTenantId = tenantId || adminProfile.tenant_id;

    // Search by name or school_id
    const { data: records, error } = await supabaseAdmin
      .from('trespass_records')
      .select('id, first_name, last_name, school_id, status')
      .is('deleted_at', null)
      .eq('tenant_id', targetTenantId)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,school_id.ilike.%${query}%`)
      .limit(10)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[searchRecords] Error searching records', error);
      throw new Error('Failed to search records');
    }

    return records || [];
  } catch (error: any) {
    logger.error('[searchRecords] Error', { error: error.message });
    throw error;
  }
}
