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

export type DeletedRecord = TrespassRecord & {
  campus_name?: string | null;
  days_since_deletion: number;
  requires_action: boolean; // True if > 5 years old
};

/**
 * Get all soft-deleted records for FERPA compliance management
 * Only accessible by master_admin and district_admin
 */
export async function getDeletedRecords(
  tenantId?: string
): Promise<{ records: DeletedRecord[]; total: number }> {
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
      console.error('[getDeletedRecords] Error fetching admin profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (!adminProfile || !['master_admin', 'district_admin'].includes(adminProfile.role)) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Use provided tenantId, or fall back to active_tenant_id, or fall back to user's tenant_id
    const targetTenantId = tenantId || adminProfile.active_tenant_id || adminProfile.tenant_id;

    if (!targetTenantId) {
      throw new Error('No tenant selected');
    }

    logger.info('[getDeletedRecords] Fetching deleted records', { userId, targetTenantId });

    // Get all soft-deleted records
    const { data: records, error, count } = await supabaseAdmin
      .from('trespass_records')
      .select('*', { count: 'exact' })
      .eq('tenant_id', targetTenantId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: true });

    if (error) {
      console.error('[getDeletedRecords] Error fetching deleted records:', error);
      throw new Error('Failed to fetch deleted records');
    }

    // Get campuses for lookup
    const { data: campuses } = await supabaseAdmin
      .from('campuses')
      .select('id, name')
      .eq('tenant_id', targetTenantId);

    const campusMap = new Map(campuses?.map(c => [c.id, c.name]) || []);

    const now = new Date();
    const fiveYearsInMs = 5 * 365 * 24 * 60 * 60 * 1000;

    // Transform the data to include campus name and deletion info
    const transformedRecords: DeletedRecord[] = (records || []).map((record: any) => {
      const deletedAt = new Date(record.deleted_at);
      const daysSinceDeletion = Math.floor((now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24));
      const requiresAction = daysSinceDeletion >= (5 * 365); // 5 years or more

      return {
        ...record,
        campus_name: record.campus_id ? campusMap.get(record.campus_id) || null : null,
        days_since_deletion: daysSinceDeletion,
        requires_action: requiresAction,
      };
    });

    return {
      records: transformedRecords,
      total: count || 0,
    };
  } catch (error: any) {
    console.error('[getDeletedRecords] Error:', error.message);
    throw error;
  }
}

/**
 * Get records that are 5+ years old and require action
 * Used for notifications to admins
 */
export async function getRecordsRequiringAction(
  tenantId?: string
): Promise<{ count: number; records: DeletedRecord[] }> {
  try {
    const allDeleted = await getDeletedRecords(tenantId);
    const requiresAction = allDeleted.records.filter(r => r.requires_action);

    return {
      count: requiresAction.length,
      records: requiresAction,
    };
  } catch (error: any) {
    console.error('[getRecordsRequiringAction] Error:', error.message);
    throw error;
  }
}

/**
 * Restore a soft-deleted record
 * Only accessible by master_admin and district_admin
 */
export async function restoreDeletedRecord(
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

    // Get record data
    const { data: record } = await supabaseAdmin
      .from('trespass_records')
      .select('first_name, last_name, school_id, tenant_id, deleted_at')
      .eq('id', recordId)
      .single();

    if (!record) {
      throw new Error('Record not found');
    }

    if (!record.deleted_at) {
      throw new Error('Record is not deleted');
    }

    // Verify record belongs to admin's tenant (or admin is master_admin)
    if (adminProfile.role !== 'master_admin' && record.tenant_id !== adminProfile.tenant_id) {
      throw new Error('Unauthorized: Cannot restore records from other tenants');
    }

    // Defense-in-depth: Verify service role operation before RLS bypass
    await verifyServiceRoleOperation(userId, record.tenant_id);

    // Restore record by setting deleted_at to NULL
    const { error } = await supabaseAdmin
      .from('trespass_records')
      .update({ deleted_at: null })
      .eq('id', recordId);

    if (error) {
      console.error('[restoreDeletedRecord] Error restoring record:', error);
      throw new Error('Failed to restore record');
    }

    // Log to audit log
    await logAuditEvent({
      eventType: 'record.restored',
      actorId: userId,
      actorEmail: adminProfile.email,
      actorRole: adminProfile.role,
      targetId: recordId,
      action: `Restored deleted trespass record for ${record.first_name} ${record.last_name}`,
      recordSubjectName: `${record.first_name} ${record.last_name}`,
      recordSchoolId: record.school_id,
      tenantId: record.tenant_id,
      details: {
        recordId,
        deletedAt: record.deleted_at,
      },
    });

    logger.info('[restoreDeletedRecord] Record restored successfully', { recordId });

    return {
      success: true,
      message: 'Record restored successfully',
    };
  } catch (error: any) {
    console.error('[restoreDeletedRecord] Error:', error.message);
    throw new Error(error.message || 'Failed to restore record');
  }
}

/**
 * Permanently delete a record (hard delete)
 * Only allowed for records > 5 years old
 * Only accessible by master_admin and district_admin
 */
export async function permanentlyDeleteRecord(
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

    // Get record data
    const { data: record } = await supabaseAdmin
      .from('trespass_records')
      .select('first_name, last_name, school_id, tenant_id, deleted_at, created_at')
      .eq('id', recordId)
      .single();

    if (!record) {
      throw new Error('Record not found');
    }

    if (!record.deleted_at) {
      throw new Error('Cannot permanently delete active records. Please soft delete first.');
    }

    // Verify record belongs to admin's tenant (or admin is master_admin)
    if (adminProfile.role !== 'master_admin' && record.tenant_id !== adminProfile.tenant_id) {
      throw new Error('Unauthorized: Cannot delete records from other tenants');
    }

    // Check if record is > 5 years old
    const deletedAt = new Date(record.deleted_at);
    const now = new Date();
    const fiveYearsInMs = 5 * 365 * 24 * 60 * 60 * 1000;
    const age = now.getTime() - deletedAt.getTime();

    if (age < fiveYearsInMs) {
      const daysRemaining = Math.ceil((fiveYearsInMs - age) / (1000 * 60 * 60 * 24));
      throw new Error(
        `FERPA Compliance: Record must be retained for 5 years. ${daysRemaining} days remaining.`
      );
    }

    // Defense-in-depth: Verify service role operation before RLS bypass
    await verifyServiceRoleOperation(userId, record.tenant_id);

    // Permanently delete record
    const { error } = await supabaseAdmin
      .from('trespass_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('[permanentlyDeleteRecord] Error permanently deleting record:', error);
      throw new Error('Failed to permanently delete record');
    }

    // Log to audit log
    await logAuditEvent({
      eventType: 'record.permanently_deleted',
      actorId: userId,
      actorEmail: adminProfile.email,
      actorRole: adminProfile.role,
      targetId: recordId,
      action: `Permanently deleted trespass record for ${record.first_name} ${record.last_name} (FERPA 5-year retention met)`,
      recordSubjectName: `${record.first_name} ${record.last_name}`,
      recordSchoolId: record.school_id,
      tenantId: record.tenant_id,
      details: {
        recordId,
        deletedAt: record.deleted_at,
        createdAt: record.created_at,
      },
    });

    logger.info('[permanentlyDeleteRecord] Record permanently deleted', { recordId });

    return {
      success: true,
      message: 'Record permanently deleted successfully',
    };
  } catch (error: any) {
    console.error('[permanentlyDeleteRecord] Error:', error.message);
    throw new Error(error.message || 'Failed to permanently delete record');
  }
}

/**
 * Export deleted records to CSV for backup before permanent deletion
 * Only accessible by master_admin and district_admin
 */
export async function exportDeletedRecordsToCSV(
  recordIds: string[]
): Promise<string> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify admin permission
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, tenant_id, email')
      .eq('id', userId)
      .single();

    if (!adminProfile || !['master_admin', 'district_admin'].includes(adminProfile.role)) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get records
    const { data: records, error } = await supabaseAdmin
      .from('trespass_records')
      .select('*, campuses(name)')
      .in('id', recordIds)
      .not('deleted_at', 'is', null);

    if (error) {
      console.error('[exportDeletedRecordsToCSV] Error fetching records:', error);
      throw new Error('Failed to fetch records for export');
    }

    // Log export action
    await logAuditEvent({
      eventType: 'record.exported',
      actorId: userId,
      actorEmail: adminProfile.email,
      actorRole: adminProfile.role,
      action: `Exported ${records?.length || 0} deleted records to CSV for backup`,
      tenantId: adminProfile.tenant_id,
      details: {
        recordIds,
        recordCount: records?.length || 0,
        exportType: 'deleted_records_backup',
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
      'Description',
      'Created At',
      'Deleted At',
      'Days Since Deletion',
    ];

    const now = new Date();

    const rows = (records || []).map((record: any) => {
      const deletedAt = new Date(record.deleted_at);
      const daysSinceDeletion = Math.floor((now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24));

      return [
        record.id,
        record.first_name,
        record.last_name,
        record.school_id || '',
        record.campuses?.name || '',
        record.status,
        record.incident_date || '',
        record.expiration_date || '',
        record.description || '',
        record.created_at,
        record.deleted_at,
        daysSinceDeletion.toString(),
      ];
    });

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
    console.error('[exportDeletedRecordsToCSV] Error:', error.message);
    throw new Error(error.message || 'Failed to export records');
  }
}
