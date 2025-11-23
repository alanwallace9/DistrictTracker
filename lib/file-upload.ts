import { supabase } from '@/lib/supabase';
import type { RecordPhoto, RecordDocument } from '@/lib/supabase';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  publicUrl: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// Validation constants
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS_PER_RECORD = 10;
const MAX_DOCUMENTS_PER_RECORD = 5;

const ALLOWED_PHOTO_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Validate photo file before upload
 */
function validatePhotoFile(file: File): void {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }

  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error(`File size must be less than ${MAX_PHOTO_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
  }

  if (file.size === 0) {
    throw new Error('File is empty.');
  }
}

/**
 * Validate document file before upload
 */
function validateDocumentFile(file: File): void {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.');
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error(`File size must be less than ${MAX_DOCUMENT_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
  }

  if (file.size === 0) {
    throw new Error('File is empty.');
  }
}

/**
 * Generate a unique filename with timestamp and random string
 */
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 9);
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  return `${timestamp}-${randomString}.${extension}`;
}

/**
 * Upload a photo to Supabase Storage and create database record
 */
export async function uploadPhoto(
  file: File,
  recordId: string,
  userId: string,
  displayOrder: number = 0,
  onProgress?: (progress: UploadProgress) => void
): Promise<RecordPhoto> {
  // Validate file
  validatePhotoFile(file);

  // Check current photo count
  const { count, error: countError } = await supabase
    .from('record_photos')
    .select('*', { count: 'exact', head: true })
    .eq('record_id', recordId);

  if (countError) throw new Error('Failed to check photo count.');
  if (count !== null && count >= MAX_PHOTOS_PER_RECORD) {
    throw new Error(`Maximum of ${MAX_PHOTOS_PER_RECORD} photos per record.`);
  }

  // Generate unique filename
  const fileName = generateFileName(file.name);
  const storagePath = `${recordId}/${fileName}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('record-photos')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('record-photos')
    .getPublicUrl(storagePath);

  // Create database record
  const { data: photoRecord, error: dbError } = await supabase
    .from('record_photos')
    .insert({
      record_id: recordId,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      display_order: displayOrder,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (dbError) {
    // Rollback: Delete the uploaded file
    await supabase.storage.from('record-photos').remove([storagePath]);
    throw new Error(`Database insert failed: ${dbError.message}`);
  }

  return photoRecord;
}

/**
 * Upload a document to Supabase Storage and create database record
 */
export async function uploadDocument(
  file: File,
  recordId: string,
  userId: string,
  documentType: 'trespass_warning' | 'court_order' | 'other',
  onProgress?: (progress: UploadProgress) => void
): Promise<RecordDocument> {
  // Validate file
  validateDocumentFile(file);

  // Check current document count
  const { count, error: countError } = await supabase
    .from('record_documents')
    .select('*', { count: 'exact', head: true })
    .eq('record_id', recordId);

  if (countError) throw new Error('Failed to check document count.');
  if (count !== null && count >= MAX_DOCUMENTS_PER_RECORD) {
    throw new Error(`Maximum of ${MAX_DOCUMENTS_PER_RECORD} documents per record.`);
  }

  // Generate unique filename
  const fileName = generateFileName(file.name);
  const storagePath = `${recordId}/${fileName}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('record-documents')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('record-documents')
    .getPublicUrl(storagePath);

  // Create database record
  const { data: documentRecord, error: dbError } = await supabase
    .from('record_documents')
    .insert({
      record_id: recordId,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      document_type: documentType,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (dbError) {
    // Rollback: Delete the uploaded file
    await supabase.storage.from('record-documents').remove([storagePath]);
    throw new Error(`Database insert failed: ${dbError.message}`);
  }

  return documentRecord;
}

/**
 * Delete a photo from storage and database
 */
export async function deletePhoto(photoId: string): Promise<void> {
  // Get photo record to get storage path
  const { data: photo, error: fetchError } = await supabase
    .from('record_photos')
    .select('storage_path')
    .eq('id', photoId)
    .single();

  if (fetchError) throw new Error('Photo not found.');
  if (!photo) throw new Error('Photo not found.');

  // Delete from database first
  const { error: dbError } = await supabase
    .from('record_photos')
    .delete()
    .eq('id', photoId);

  if (dbError) throw new Error(`Failed to delete photo record: ${dbError.message}`);

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('record-photos')
    .remove([photo.storage_path]);

  if (storageError) {
    console.error('Failed to delete file from storage:', storageError);
    // Don't throw error as database record is already deleted
  }
}

/**
 * Delete a document from storage and database
 */
export async function deleteDocument(documentId: string): Promise<void> {
  // Get document record to get storage path
  const { data: document, error: fetchError } = await supabase
    .from('record_documents')
    .select('storage_path')
    .eq('id', documentId)
    .single();

  if (fetchError) throw new Error('Document not found.');
  if (!document) throw new Error('Document not found.');

  // Delete from database first
  const { error: dbError } = await supabase
    .from('record_documents')
    .delete()
    .eq('id', documentId);

  if (dbError) throw new Error(`Failed to delete document record: ${dbError.message}`);

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('record-documents')
    .remove([document.storage_path]);

  if (storageError) {
    console.error('Failed to delete file from storage:', storageError);
    // Don't throw error as database record is already deleted
  }
}

/**
 * Get public URL for a photo
 */
export function getPhotoUrl(storagePath: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from('record-photos')
    .getPublicUrl(storagePath);

  return publicUrl;
}

/**
 * Get public URL for a document
 */
export function getDocumentUrl(storagePath: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from('record-documents')
    .getPublicUrl(storagePath);

  return publicUrl;
}

/**
 * Fetch all photos for a record
 */
export async function getRecordPhotos(recordId: string): Promise<RecordPhoto[]> {
  const { data, error } = await supabase
    .from('record_photos')
    .select('*')
    .eq('record_id', recordId)
    .order('display_order', { ascending: true });

  if (error) throw new Error('Failed to fetch photos.');
  return data || [];
}

/**
 * Fetch all documents for a record
 */
export async function getRecordDocuments(recordId: string): Promise<RecordDocument[]> {
  const { data, error } = await supabase
    .from('record_documents')
    .select('*')
    .eq('record_id', recordId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch documents.');
  return data || [];
}

/**
 * Update photo display order
 */
export async function updatePhotoDisplayOrder(
  photoId: string,
  newDisplayOrder: number
): Promise<void> {
  const { error } = await supabase
    .from('record_photos')
    .update({ display_order: newDisplayOrder })
    .eq('id', photoId);

  if (error) throw new Error('Failed to update photo order.');
}

/**
 * Reorder photos for a record
 */
export async function reorderPhotos(photoIds: string[]): Promise<void> {
  const updates = photoIds.map((id, index) =>
    supabase
      .from('record_photos')
      .update({ display_order: index })
      .eq('id', id)
  );

  await Promise.all(updates);
}
