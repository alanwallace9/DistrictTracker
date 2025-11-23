'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { TrespassRecord } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { logAuditEvent } from '@/lib/audit-logger';
import { createClient } from '@supabase/supabase-js';
import { CreateRecordSchema, UpdateRecordSchema, validateData } from '@/lib/validation/schemas';
import { processImageUrl } from '@/lib/image-storage';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Create a new trespass record
 */
export async function createRecord(data: Omit<TrespassRecord, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerClient();
  const { userId } = await auth();

  // Validate input data
  const validation = validateData(CreateRecordSchema, data);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  // Remove any fields that shouldn't be in the insert
  const { id, created_at, updated_at, ...insertData } = validation.data as any;

  // Process image URL if provided (hybrid storage: keep trusted, download external)
  if (insertData.photo_url && userId) {
    try {
      insertData.photo_url = await processImageUrl(
        insertData.photo_url,
        insertData.id || 'pending', // Will use 'pending' temporarily, gets real ID after insert
        userId
      );
    } catch (error) {
      console.error('Failed to process image URL:', error);
      // Continue with original URL if processing fails
    }
  }

  const { data: record, error } = await supabase
    .from('trespass_records')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating record:', error);
    throw new Error(error.message);
  }

  // Get user profile for audit log
  if (userId) {
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, role, tenant_id')
      .eq('id', userId)
      .single();

    // Log to audit trail
    await logAuditEvent({
      eventType: 'record.created',
      actorId: userId,
      actorEmail: userProfile?.email || undefined,
      actorRole: userProfile?.role || undefined,
      targetId: record.id,
      action: `Created trespass record for ${data.first_name} ${data.last_name}`,
      recordSubjectName: `${data.first_name} ${data.last_name}`,
      recordSchoolId: data.school_id,
      tenantId: userProfile?.tenant_id || undefined,
      details: {
        incident_date: data.incident_date,
        trespassed_from: data.trespassed_from,
      },
    });
  }

  revalidatePath('/dashboard');
  return record;
}

/**
 * Update an existing trespass record
 */
export async function updateRecord(id: string, data: Partial<TrespassRecord>) {
  const supabase = await createServerClient();
  const { userId } = await auth();

  // DEBUG: Log what data we received
  console.log('=== SERVER RECEIVED UPDATE REQUEST ===');
  console.log('Record ID:', id);
  console.log('data.is_daep:', data.is_daep);
  console.log('data.daep_expiration_date:', data.daep_expiration_date);
  console.log('Full data received:', JSON.stringify(data, null, 2));

  // Validate input data
  const validation = validateData(UpdateRecordSchema, data);
  if (!validation.success) {
    console.log('❌ VALIDATION FAILED:', validation.error);
    throw new Error(`Validation failed: ${validation.error}`);
  }

  console.log('✅ Validation passed');
  console.log('validation.data.is_daep:', (validation.data as any).is_daep);
  console.log('validation.data.daep_expiration_date:', (validation.data as any).daep_expiration_date);

  // Get the record before update to capture changes
  const { data: beforeRecord } = await supabase
    .from('trespass_records')
    .select('*')
    .is('deleted_at', null)
    .eq('id', id)
    .single();

  // Remove fields that shouldn't be updated
  const { id: _id, created_at, updated_at, user_id, status, ...updateData } = validation.data as any;

  console.log('updateData.is_daep:', updateData.is_daep);
  console.log('updateData.daep_expiration_date:', updateData.daep_expiration_date);
  console.log('Full updateData to send to DB:', JSON.stringify(updateData, null, 2));

  // Process image URL if provided and it's changed (hybrid storage: keep trusted, download external)
  if (updateData.photo_url && userId && updateData.photo_url !== beforeRecord?.photo_url) {
    try {
      updateData.photo_url = await processImageUrl(
        updateData.photo_url,
        id,
        userId
      );
    } catch (error) {
      console.error('Failed to process image URL:', error);
      // Continue with original URL if processing fails
    }
  }

  const { data: record, error } = await supabase
    .from('trespass_records')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ DATABASE UPDATE ERROR:', error);
    throw new Error(error.message);
  }

  console.log('✅ Database updated successfully');
  console.log('Returned record.is_daep:', record?.is_daep);
  console.log('Returned record.daep_expiration_date:', record?.daep_expiration_date);
  console.log('Full returned record:', JSON.stringify(record, null, 2));

  // Get user profile for audit log
  if (userId && beforeRecord) {
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, role, tenant_id')
      .eq('id', userId)
      .single();

    // Determine what changed
    const changes: Record<string, { from: any; to: any }> = {};
    Object.keys(updateData).forEach((key) => {
      if (beforeRecord[key] !== updateData[key]) {
        changes[key] = {
          from: beforeRecord[key],
          to: updateData[key],
        };
      }
    });

    // Log to audit trail
    await logAuditEvent({
      eventType: 'record.updated',
      actorId: userId,
      actorEmail: userProfile?.email || undefined,
      actorRole: userProfile?.role || undefined,
      targetId: record.id,
      action: `Updated trespass record for ${record.first_name} ${record.last_name}`,
      recordSubjectName: `${record.first_name} ${record.last_name}`,
      recordSchoolId: record.school_id,
      tenantId: userProfile?.tenant_id || undefined,
      details: {
        changes,
        fieldsUpdated: Object.keys(changes),
      },
    });
  }

  revalidatePath('/dashboard');
  return record;
}

/**
 * Delete a trespass record
 */
export async function deleteRecord(id: string) {
  const supabase = await createServerClient();
  const { userId } = await auth();

  // Get the record before deletion for audit log
  const { data: record } = await supabase
    .from('trespass_records')
    .select('*')
    .is('deleted_at', null)
    .eq('id', id)
    .single();

  // Soft delete record (FERPA compliant - 5 year retention)
  const { error} = await supabase
    .from('trespass_records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error soft-deleting record:', error);
    throw new Error(error.message);
  }

  // Get user profile for audit log
  if (userId && record) {
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, role, tenant_id')
      .eq('id', userId)
      .single();

    // Log to audit trail
    await logAuditEvent({
      eventType: 'record.deleted',
      actorId: userId,
      actorEmail: userProfile?.email || undefined,
      actorRole: userProfile?.role || undefined,
      targetId: record.id,
      action: `Deleted trespass record for ${record.first_name} ${record.last_name}`,
      recordSubjectName: `${record.first_name} ${record.last_name}`,
      recordSchoolId: record.school_id,
      tenantId: userProfile?.tenant_id || undefined,
      details: {
        deletedRecord: {
          first_name: record.first_name,
          last_name: record.last_name,
          school_id: record.school_id,
          incident_type: record.incident_type,
          incident_date: record.incident_date,
        },
      },
    });
  }

  revalidatePath('/dashboard');
}

/**
 * Get a single record by ID
 * Logs a record.viewed event for FERPA compliance
 */
export async function getRecord(id: string) {
  const supabase = await createServerClient();
  const { userId } = await auth();

  const { data: record, error } = await supabase
    .from('trespass_records')
    .select('*')
    .is('deleted_at', null)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching record:', error);
    throw new Error(error.message);
  }

  // Get user profile for audit log
  if (userId && record) {
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, role, tenant_id')
      .eq('id', userId)
      .single();

    // Log view event for FERPA compliance
    await logAuditEvent({
      eventType: 'record.viewed',
      actorId: userId,
      actorEmail: userProfile?.email || undefined,
      actorRole: userProfile?.role || undefined,
      targetId: record.id,
      action: `Viewed trespass record for ${record.first_name} ${record.last_name}`,
      recordSubjectName: `${record.first_name} ${record.last_name}`,
      recordSchoolId: record.school_id,
      tenantId: userProfile?.tenant_id || undefined,
      details: {
        access_method: 'direct_view',
      },
    });
  }

  return record;
}

/**
 * Get related incidents for a person by their school_id
 * Used for incident navigation in RecordDetailDialog
 */
export async function getRelatedIncidents(schoolId: string | null, tenantId: string) {
  if (!schoolId) {
    return [];
  }

  const supabase = await createServerClient();

  const { data: records, error } = await supabase
    .from('trespass_records')
    .select('*')
    .is('deleted_at', null)
    .eq('school_id', schoolId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching related incidents:', error);
    throw new Error(`Failed to fetch related incidents: ${error.message}`);
  }

  return records || [];
}
