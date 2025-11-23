'use server';

import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type CSVRecordInput = {
  // Required fields
  first_name: string;
  last_name: string;
  school_id: string;
  expiration_date: string;
  trespassed_from: string;
  // Optional fields
  aka?: string;
  date_of_birth?: string;
  incident_date?: string;
  incident_location?: string;          // Renamed from 'location'
  description?: string;
  status?: string;
  is_current_student?: boolean;
  is_daep?: boolean;
  daep_expiration_date?: string;
  affiliation?: string;                // Renamed from 'known_associates'
  current_school?: string;
  guardian_first_name?: string;
  guardian_last_name?: string;
  guardian_phone?: string;
  school_contact?: string;             // Renamed from 'contact_info'
  notes?: string;
  photo?: string;                      // Renamed from 'photo_url'
  campus_id?: string;
};

/**
 * Upload trespass records via server action
 * This ensures proper authentication and tenant isolation
 */
export async function uploadTrespassRecords(records: CSVRecordInput[]) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const supabase = await createServerClient();

  // Get user's profile to verify role and tenant_id
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, active_tenant_id')
    .eq('id', userId)
    .single();

  if (profileError || !userProfile) {
    throw new Error('User profile not found. Please sign out and sign in again.');
  }

  // For master admins, use active_tenant_id (for tenant switching), otherwise use tenant_id
  const effectiveTenantId = userProfile.active_tenant_id || userProfile.tenant_id;

  if (!effectiveTenantId) {
    throw new Error('Your profile is missing a tenant ID. Please contact your administrator.');
  }

  // Verify user has permission to create records
  if (!['campus_admin', 'district_admin', 'master_admin'].includes(userProfile.role)) {
    throw new Error('You do not have permission to upload records.');
  }

  // Transform records to include user_id and tenant_id
  const recordsToInsert = records.map(record => ({
    user_id: userId,
    tenant_id: effectiveTenantId,
    first_name: record.first_name,
    last_name: record.last_name,
    school_id: record.school_id,
    expiration_date: record.expiration_date,
    trespassed_from: record.trespassed_from,
    aka: record.aka || null,
    date_of_birth: record.date_of_birth || null,
    incident_date: record.incident_date || null,
    incident_location: record.incident_location || null,
    description: record.description || null,
    status: record.status || 'active',
    is_current_student: record.is_current_student !== undefined ? record.is_current_student : true,
    is_daep: record.is_daep || false,
    daep_expiration_date: record.daep_expiration_date || null,
    affiliation: record.affiliation || null,
    current_school: record.current_school || null,
    guardian_first_name: record.guardian_first_name || null,
    guardian_last_name: record.guardian_last_name || null,
    guardian_phone: record.guardian_phone || null,
    school_contact: record.school_contact || null,
    notes: record.notes || null,
    photo: record.photo || null,
    campus_id: record.campus_id || null,
  }));

  console.log('[uploadTrespassRecords] Upserting records:', {
    count: recordsToInsert.length,
    userId,
    tenant_id: effectiveTenantId,
    role: userProfile.role,
    sampleRecord: recordsToInsert[0],
  });

  // Manual upsert: check for existing records and update/insert accordingly
  // We can't use database upsert because there's no unique constraint on (school_id, tenant_id)
  let insertedCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];

  for (const record of recordsToInsert) {
    try {
      // Check if record exists with this school_id and tenant_id
      const { data: existing, error: checkError } = await supabase
        .from('trespass_records')
        .select('id')
        .is('deleted_at', null)
        .eq('school_id', record.school_id)
        .eq('tenant_id', record.tenant_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new records
        throw checkError;
      }

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('trespass_records')
          .update({
            ...record,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        updatedCount++;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('trespass_records')
          .insert(record);

        if (insertError) throw insertError;
        insertedCount++;
      }
    } catch (err: any) {
      errors.push(`${record.first_name} ${record.last_name} (${record.school_id}): ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.error('[uploadTrespassRecords] Upsert errors:', errors);
    throw new Error(`Failed to upsert ${errors.length} records. First error: ${errors[0]}`);
  }

  console.log('[uploadTrespassRecords] Successfully upserted records:', {
    inserted: insertedCount,
    updated: updatedCount,
    total: insertedCount + updatedCount,
  });

  // Revalidate dashboard to show new records
  revalidatePath('/dashboard');

  return {
    success: true,
    count: insertedCount + updatedCount,
    inserted: insertedCount,
    updated: updatedCount,
  };
}

/**
 * Create a single trespass record via server action
 * This ensures proper authentication and tenant isolation
 */
export async function createTrespassRecord(record: CSVRecordInput) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    const supabase = await createServerClient();

    // Get user's profile to verify role and tenant_id
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, tenant_id, active_tenant_id')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found. Please sign out and sign in again.');
    }

    // For master admins, use active_tenant_id (for tenant switching), otherwise use tenant_id
    const effectiveTenantId = userProfile.active_tenant_id || userProfile.tenant_id;

    if (!effectiveTenantId) {
      throw new Error('Your profile is missing a tenant ID. Please contact your administrator.');
    }

    // Verify user has permission to create records
    if (!['campus_admin', 'district_admin', 'master_admin'].includes(userProfile.role)) {
      throw new Error('You do not have permission to create records.');
    }

    // Check photo size if provided
    if (record.photo && record.photo.length > 4000000) {
      throw new Error('Photo is too large. Please use a smaller image (max 3MB).');
    }

    // Transform record to include user_id and tenant_id
    const recordToInsert = {
      user_id: userId,
      tenant_id: effectiveTenantId,
      first_name: record.first_name,
      last_name: record.last_name,
      school_id: record.school_id,
      expiration_date: record.expiration_date,
      trespassed_from: record.trespassed_from,
      aka: record.aka || null,
      date_of_birth: record.date_of_birth || null,
      incident_date: record.incident_date || null,
      incident_location: record.incident_location || null,
      description: record.description || null,
      status: record.status || 'active',
      is_current_student: record.is_current_student || false,
      is_daep: record.is_daep || false,
      daep_expiration_date: record.daep_expiration_date || null,
      affiliation: record.affiliation || null,
      current_school: record.current_school || null,
      guardian_first_name: record.guardian_first_name || null,
      guardian_last_name: record.guardian_last_name || null,
      guardian_phone: record.guardian_phone || null,
      school_contact: record.school_contact || null,
      notes: record.notes || null,
      photo: record.photo || null,
      campus_id: record.campus_id || null,
    };

    console.log('[createTrespassRecord] Inserting record:', {
      userId,
      tenant_id: effectiveTenantId,
      role: userProfile.role,
      name: `${record.first_name} ${record.last_name}`,
      hasPhoto: !!record.photo,
      photoSize: record.photo ? record.photo.length : 0,
    });

    // Insert record
    const { data, error } = await supabase
      .from('trespass_records')
      .insert(recordToInsert)
      .select()
      .single();

    if (error) {
      console.error('[createTrespassRecord] Insert error:', error);
      throw new Error('Failed to create trespass record. Please try again.');
    }

    console.log('[createTrespassRecord] Successfully inserted record:', data.id);

    // Revalidate dashboard to show new record
    revalidatePath('/dashboard');

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('[createTrespassRecord] Fatal error:', {
      message: error.message,
      stack: error.stack,
      name: `${record.first_name} ${record.last_name}`,
    });
    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('not authenticated') ||
      error.message.includes('not found') ||
      error.message.includes('missing') ||
      error.message.includes('do not have permission') ||
      error.message.includes('Photo is too large')
    )) {
      throw error;
    }
    throw new Error('Failed to create trespass record. Please try again.');
  }
}
