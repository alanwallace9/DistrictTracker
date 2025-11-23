'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/audit-logger';
import { verifyServiceRoleOperation } from '@/lib/admin-auth';
import { TrespassRecord } from '@/lib/supabase';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AdminRecordListItem = TrespassRecord & {
  campus_name?: string | null;
};

export type RecordFilters = {
  tenantId?: string;
  campusId?: string;
  status?: 'all' | 'active' | 'inactive' | 'expired';
  search?: string;
  page?: number;
  limit?: number;
};

/**
 * Get all records for admin view with filters and pagination
 * Only accessible by master_admin and district_admin
 */
export async function getRecordsForAdmin(
  filters: RecordFilters = {}
): Promise<{ records: AdminRecordListItem[]; total: number }> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify admin permission (master_admin or district_admin)
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, tenant_id, active_tenant_id')
      .eq('id', userId)
      .single();

    if (profileError || !adminProfile) {
      logger.error('[getRecordsForAdmin] Error fetching admin profile', { profileError, userId });
      throw new Error('Failed to fetch user profile');
    }

    if (!adminProfile || !['master_admin', 'district_admin'].includes(adminProfile.role)) {
      logger.error('[getRecordsForAdmin] Unauthorized access attempt', { userId, role: adminProfile?.role });
      throw new Error('Unauthorized: Admin access required');
    }

    // Use provided tenantId, or fall back to active_tenant_id, or fall back to user's tenant_id
    const targetTenantId = filters.tenantId || adminProfile.active_tenant_id || adminProfile.tenant_id;

    if (!targetTenantId) {
      logger.error('[getRecordsForAdmin] No tenant available', {
        userId,
        providedTenantId: filters.tenantId,
        activeTenantId: adminProfile.active_tenant_id,
        userTenantId: adminProfile.tenant_id,
      });
      throw new Error('No tenant selected. Please select a tenant from the dropdown.');
    }

    logger.info('[getRecordsForAdmin] Fetching records', { userId, targetTenantId, role: adminProfile.role });

    // Build query (exclude soft-deleted records)
    let query = supabaseAdmin
      .from('trespass_records')
      .select('*', { count: 'exact' })
      .eq('tenant_id', targetTenantId)
      .is('deleted_at', null);

    // Apply campus filter
    if (filters.campusId) {
      query = query.eq('campus_id', filters.campusId);
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      const now = new Date().toISOString();

      if (filters.status === 'active') {
        query = query
          .eq('status', 'active')
          .or(`expiration_date.is.null,expiration_date.gte.${now}`);
      } else if (filters.status === 'inactive') {
        query = query.eq('status', 'inactive');
      } else if (filters.status === 'expired') {
        query = query
          .eq('status', 'active')
          .lt('expiration_date', now);
      }
    }

    // Apply search filter
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},school_id.ilike.${searchTerm}`
      );
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: records, error, count } = await query;

    if (error) {
      logger.error('[getRecordsForAdmin] Error fetching records', error);
      throw new Error('Failed to fetch records');
    }

    // Get all campuses for lookup
    const { data: campuses } = await supabaseAdmin
      .from('campuses')
      .select('id, name')
      .eq('tenant_id', targetTenantId);

    const campusMap = new Map(campuses?.map(c => [c.id, c.name]) || []);

    // Transform the data to include campus name
    const transformedRecords: AdminRecordListItem[] = (records || []).map((record: any) => ({
      ...record,
      campus_name: record.campus_id ? campusMap.get(record.campus_id) || null : null,
    }));

    return {
      records: transformedRecords,
      total: count || 0,
    };
  } catch (error: any) {
    logger.error('[getRecordsForAdmin] Error', { error: error.message });
    throw error;
  }
}

/**
 * Soft delete a record
 * Only accessible by master_admin and district_admin
 */
export async function deleteRecordAdmin(
  recordId: string
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

    // Get record data before deletion
    const { data: record } = await supabaseAdmin
      .from('trespass_records')
      .select('first_name, last_name, school_id, tenant_id')
      .eq('id', recordId)
      .single();

    if (!record) {
      throw new Error('Record not found');
    }

    // Verify record belongs to admin's tenant (or admin is master_admin)
    if (adminProfile.role !== 'master_admin' && record.tenant_id !== adminProfile.tenant_id) {
      throw new Error('Unauthorized: Cannot delete records from other tenants');
    }

    // Defense-in-depth: Verify service role operation before RLS bypass
    await verifyServiceRoleOperation(userId, record.tenant_id);

    // Soft delete record (FERPA compliant - 5 year retention)
    const { error } = await supabaseAdmin
      .from('trespass_records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', recordId);

    if (error) {
      logger.error('[deleteRecordAdmin] Error soft-deleting record', error);
      throw new Error('Failed to delete record');
    }

    // Log to audit log
    await logAuditEvent({
      eventType: 'record.deleted',
      actorId: userId,
      actorEmail: adminProfile.email,
      actorRole: adminProfile.role,
      targetId: recordId,
      action: `Deleted trespass record for ${record.first_name} ${record.last_name}`,
      recordSubjectName: `${record.first_name} ${record.last_name}`,
      recordSchoolId: record.school_id,
      tenantId: record.tenant_id,
      details: {
        recordId,
      },
    });

    logger.info('[deleteRecordAdmin] Record deleted successfully', { recordId });

    return {
      success: true,
      message: 'Record deleted successfully',
    };
  } catch (error: any) {
    logger.error('[deleteRecordAdmin] Error', { error: error.message });
    throw new Error(error.message || 'Failed to delete record');
  }
}

/**
 * Export records to CSV
 * Only accessible by master_admin and district_admin
 */
export async function exportRecordsToCSV(
  filters: RecordFilters = {}
): Promise<string> {
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

    // Get all records matching filters (without pagination)
    const targetTenantId = filters.tenantId || adminProfile.tenant_id;

    let query = supabaseAdmin
      .from('trespass_records')
      .select('*, campuses(name)')
      .eq('tenant_id', targetTenantId)
      .is('deleted_at', null);

    // Apply filters (same as getRecordsForAdmin but without pagination)
    if (filters.campusId) {
      query = query.eq('campus_id', filters.campusId);
    }

    if (filters.status && filters.status !== 'all') {
      const now = new Date().toISOString();

      if (filters.status === 'active') {
        query = query
          .eq('status', 'active')
          .or(`expiration_date.is.null,expiration_date.gte.${now}`);
      } else if (filters.status === 'inactive') {
        query = query.eq('status', 'inactive');
      } else if (filters.status === 'expired') {
        query = query
          .eq('status', 'active')
          .lt('expiration_date', now);
      }
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},school_id.ilike.${searchTerm}`
      );
    }

    const { data: records, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('[exportRecordsToCSV] Error fetching records', error);
      throw new Error('Failed to fetch records for export');
    }

    // Log export action
    await logAuditEvent({
      eventType: 'record.exported',
      actorId: userId,
      actorEmail: adminProfile.email,
      actorRole: adminProfile.role,
      action: `Exported ${records?.length || 0} records to CSV`,
      tenantId: targetTenantId,
      details: {
        filters,
        recordCount: records?.length || 0,
      },
    });

    // Build CSV
    const headers = [
      'ID',
      'First Name',
      'Last Name',
      'School ID',
      'Campus',
      'Status',
      'Incident Date',
      'Expiration Date',
      'Trespassed From',
      'Incident Location',
      'Description',
      'Photo',
      'Current Student',
      'Is DAEP',
      'DAEP Expiration Date',
      'Affiliation',
      'School Contact',
      'Created At',
    ];

    const rows = (records || []).map((record: any) => [
      record.id,
      record.first_name,
      record.last_name,
      record.school_id || '',
      record.campuses?.name || '',
      record.status,
      record.incident_date || '',
      record.expiration_date || '',
      record.trespassed_from || '',
      record.incident_location || '',
      record.description || '',
      record.photo || '',
      record.is_current_student ? 'Yes' : 'No',
      record.is_daep ? 'Yes' : 'No',
      record.daep_expiration_date || '',
      record.affiliation || '',
      record.school_contact || '',
      record.created_at,
    ]);

    // Escape CSV fields
    const escapeCSV = (value: string) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');

    return csvContent;
  } catch (error: any) {
    logger.error('[exportRecordsToCSV] Error', { error: error.message });
    throw new Error(error.message || 'Failed to export records');
  }
}
