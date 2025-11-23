'use server';

import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Copy all photos from one incident to another
 * Used when creating a new incident for the same person
 */
export async function copyPhotosToNewIncident(sourceRecordId: string, targetRecordId: string) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    const supabase = await createServerClient();

    // Get user's profile to verify permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, tenant_id, active_tenant_id')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found. Please sign out and sign in again.');
    }

    // Verify user has permission to create records
    if (!['campus_admin', 'district_admin', 'master_admin'].includes(userProfile.role)) {
      throw new Error('You do not have permission to copy photos.');
    }

    // Fetch all photos from the source record
    const { data: sourcePhotos, error: fetchError } = await supabase
      .from('record_photos')
      .select('*')
      .eq('record_id', sourceRecordId);

    if (fetchError) {
      console.error('[copyPhotosToNewIncident] Error fetching source photos:', fetchError);
      throw new Error(`Failed to fetch source photos: ${fetchError.message}`);
    }

    // If no photos to copy, return success
    if (!sourcePhotos || sourcePhotos.length === 0) {
      console.log('[copyPhotosToNewIncident] No photos to copy from source record');
      return {
        success: true,
        count: 0,
      };
    }

    // Prepare photos for insertion (remove id, created_at, updated_at, and update record_id)
    const photosToInsert = sourcePhotos.map((photo) => ({
      record_id: targetRecordId,
      storage_path: photo.storage_path,
      file_name: photo.file_name,
      file_size: photo.file_size,
      mime_type: photo.mime_type,
      display_order: photo.display_order,
      uploaded_by: userId, // Set current user as uploader for the copy
    }));

    console.log('[copyPhotosToNewIncident] Copying photos:', {
      sourceRecordId,
      targetRecordId,
      count: photosToInsert.length,
      userId,
    });

    // Insert copied photos
    const { data: insertedPhotos, error: insertError } = await supabase
      .from('record_photos')
      .insert(photosToInsert)
      .select();

    if (insertError) {
      console.error('[copyPhotosToNewIncident] Error inserting photos:', insertError);
      throw new Error(`Failed to copy photos: ${insertError.message}`);
    }

    console.log('[copyPhotosToNewIncident] Successfully copied photos:', {
      count: insertedPhotos?.length || 0,
    });

    return {
      success: true,
      count: insertedPhotos?.length || 0,
    };
  } catch (error: any) {
    console.error('[copyPhotosToNewIncident] Fatal error:', {
      message: error.message,
      stack: error.stack,
      sourceRecordId,
      targetRecordId,
    });
    throw error;
  }
}
