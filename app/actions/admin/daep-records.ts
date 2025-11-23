'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type DAEPRecord = {
  id: string;
  first_name: string;
  last_name: string;
  school_id: string;
  campus_id: string | null;
  daep_expiration_date: string | null;
  created_at: string;
  incident_count: number;
};

/**
 * Get all DAEP students (where is_daep = true)
 * Returns ALL records with DAEP checkbox checked, regardless of expiration status
 * Shows student name, school ID, placement date, home campus, expiration date
 * Groups by school_id to show incident count
 */
export async function getDAEPRecords(tenantId?: string): Promise<DAEPRecord[]> {
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

    // Use provided tenantId or fall back to user's tenant_id
    const targetTenantId = tenantId || adminProfile.tenant_id;

    // Get all DAEP records for the tenant
    const { data: records, error } = await supabaseAdmin
      .from('trespass_records')
      .select('id, first_name, last_name, school_id, campus_id, daep_expiration_date, created_at')
      .is('deleted_at', null)
      .eq('tenant_id', targetTenantId)
      .eq('is_daep', true)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[getDAEPRecords] Error fetching DAEP records', error);
      throw new Error('Failed to fetch DAEP records');
    }

    // Group by school_id to count incidents per student
    const studentMap = new Map<string, DAEPRecord & { incidents: DAEPRecord[] }>();

    records?.forEach((record) => {
      const schoolId = record.school_id;
      if (!studentMap.has(schoolId)) {
        studentMap.set(schoolId, {
          ...record,
          incident_count: 1,
          incidents: [record as DAEPRecord],
        });
      } else {
        const existing = studentMap.get(schoolId)!;
        existing.incident_count++;
        existing.incidents.push(record as DAEPRecord);
        // Keep the most recent incident's data
        if (new Date(record.created_at) > new Date(existing.created_at)) {
          existing.id = record.id;
          existing.first_name = record.first_name;
          existing.last_name = record.last_name;
          existing.campus_id = record.campus_id;
          existing.daep_expiration_date = record.daep_expiration_date;
          existing.created_at = record.created_at;
        }
      }
    });

    // Convert map to array and remove incidents array (not needed in response)
    const result = Array.from(studentMap.values()).map(({ incidents, ...record }) => record);

    return result;
  } catch (error: any) {
    logger.error('[getDAEPRecords] Error', { error: error.message });
    throw error;
  }
}
