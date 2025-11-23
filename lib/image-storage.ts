import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a Supabase client with service role for storage operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Process image URL with hybrid storage strategy:
 * - Keep URL if already in Supabase Storage
 * - Keep URL if from trusted domain (your CDN)
 * - Download and store in Supabase Storage if external URL
 *
 * @param imageUrl - The image URL to process
 * @param recordId - The record ID for file naming
 * @param userId - The user ID for folder organization
 * @returns The final image URL (either original or new Supabase Storage URL)
 */
export async function processImageUrl(
  imageUrl: string,
  recordId: string,
  userId: string
): Promise<string> {
  // Validate URL format
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch (error) {
    throw new Error('Invalid image URL format');
  }

  // Check if it's already a Supabase Storage URL
  if (imageUrl.includes(supabaseUrl)) {
    return imageUrl; // Already stored, return as-is
  }

  // Check if it's from a trusted CDN
  const trustedDomains = [
    'districttracker.com',
    'cdn.districttracker.com',
  ];

  if (trustedDomains.some(domain => url.hostname.includes(domain))) {
    return imageUrl; // Trusted domain, return as-is
  }

  // External URL - download and store in Supabase
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Get the blob
    const blob = await response.blob();

    // Validate it's an image
    if (!blob.type.startsWith('image/')) {
      throw new Error('URL does not point to an image file');
    }

    // Determine file extension from MIME type
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    };
    const ext = mimeToExt[blob.type] || 'jpg';

    // Generate unique filename
    const fileName = `${recordId}_${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    // Convert blob to ArrayBuffer for Supabase
    const arrayBuffer = await blob.arrayBuffer();

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('record-photos')
      .upload(filePath, arrayBuffer, {
        contentType: blob.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage error:', error);
      throw new Error('Failed to upload image to storage');
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('record-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Image processing error:', error);
    // If download/upload fails, we could optionally fall back to the original URL
    // or throw an error - for now, throw to ensure we know when it fails
    throw new Error('Failed to process external image URL');
  }
}

/**
 * Delete an image from Supabase Storage
 * Only deletes if the URL is a Supabase Storage URL
 *
 * @param imageUrl - The image URL to delete
 * @returns True if deleted, false if not a storage URL
 */
export async function deleteImageFromStorage(imageUrl: string): Promise<boolean> {
  // Only delete if it's a Supabase Storage URL
  if (!imageUrl.includes(supabaseUrl)) {
    return false; // Not our storage, don't delete
  }

  try {
    // Extract the file path from the URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/record-photos/{userId}/{fileName}
    const urlParts = imageUrl.split('/record-photos/');
    if (urlParts.length !== 2) {
      console.error('Invalid storage URL format');
      return false;
    }

    const filePath = urlParts[1];

    const { error } = await supabaseAdmin.storage
      .from('record-photos')
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete image from storage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}
