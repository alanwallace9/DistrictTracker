'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AuditLog = {
  id: string;
  event_type: string;
  actor_id: string;
  actor_email: string | null;
  actor_role: string | null;
  target_id: string | null;
  action: string;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  record_subject_name: string | null;
  record_school_id: string | null;
  tenant_id: string | null;
  created_at: string;
};

export type AuditLogFilters = {
  actorEmail?: string;
  recordSubjectName?: string;
  recordId?: string;
  eventTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
  campusId?: string;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type AuditLogsResponse = {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * Get audit logs for admin view with filters and pagination
 * Only accessible by master_admin and district_admin
 * @param tenantId - Optional tenant ID to fetch logs for (defaults to user's tenant)
 */
export async function getAuditLogs(
  tenantId?: string,
  filters?: AuditLogFilters,
  pagination?: PaginationParams
): Promise<AuditLogsResponse> {
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

    // Pagination params
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    // Build query with filters - CRITICAL: Filter by tenant_id first
    let query = supabaseAdmin
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .eq('tenant_id', targetTenantId);

    // Apply filters
    if (filters?.actorEmail) {
      query = query.ilike('actor_email', `%${filters.actorEmail}%`);
    }

    if (filters?.recordSubjectName) {
      query = query.ilike('record_subject_name', `%${filters.recordSubjectName}%`);
    }

    if (filters?.recordId) {
      query = query.eq('target_id', filters.recordId);
    }

    if (filters?.eventTypes && filters.eventTypes.length > 0) {
      query = query.in('event_type', filters.eventTypes);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.campusId) {
      // Filter by campus through details JSONB field
      query = query.contains('details', { campus_id: filters.campusId });
    }

    // Apply ordering and pagination
    const { data: logs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('[getAuditLogs] Error fetching audit logs', error);
      throw new Error('Failed to fetch audit logs');
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return {
      logs: logs || [],
      total: count || 0,
      page,
      totalPages,
    };
  } catch (error: any) {
    logger.error('[getAuditLogs] Error', { error: error.message });
    throw error;
  }
}
