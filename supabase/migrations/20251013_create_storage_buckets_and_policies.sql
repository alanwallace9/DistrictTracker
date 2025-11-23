-- Create storage buckets and RLS policies for photos and documents
-- Part of Version 2.0.1: Multiple Images and Document Upload Feature

-- =============================================================================
-- Storage Buckets
-- =============================================================================

-- Create record-photos bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'record-photos',
  'record-photos',
  true,
  2097152, -- 2MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create record-documents bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'record-documents',
  'record-documents',
  true,
  5242880, -- 5MB max file size
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RLS Policies for record-photos bucket
-- =============================================================================

-- Policy: All authenticated users can view photos
CREATE POLICY "Authenticated users can view photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'record-photos');

-- Policy: All authenticated users can upload photos
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'record-photos' AND
    get_my_role_from_db() IN ('viewer', 'campus_admin', 'district_admin', 'master_admin')
  );

-- Policy: Users can delete their own uploaded photos (using owner_id for text comparison)
CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'record-photos' AND
    owner_id = (auth.jwt() ->> 'sub')
  );

-- Policy: Admins can delete any photo
CREATE POLICY "Admins can delete any photo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'record-photos' AND
    get_my_role_from_db() IN ('district_admin', 'master_admin')
  );

-- Policy: Users can update their own photos metadata (using owner_id for text comparison)
CREATE POLICY "Users can update their own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'record-photos' AND
    owner_id = (auth.jwt() ->> 'sub')
  );

-- Policy: Admins can update any photo metadata
CREATE POLICY "Admins can update any photo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'record-photos' AND
    get_my_role_from_db() IN ('district_admin', 'master_admin')
  );

-- =============================================================================
-- RLS Policies for record-documents bucket
-- =============================================================================

-- Policy: All authenticated users can view documents
CREATE POLICY "Authenticated users can view documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'record-documents');

-- Policy: Only admins can upload documents
CREATE POLICY "Only admins can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'record-documents' AND
    get_my_role_from_db() IN ('district_admin', 'master_admin')
  );

-- Policy: Only admins can delete documents
CREATE POLICY "Only admins can delete documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'record-documents' AND
    get_my_role_from_db() IN ('district_admin', 'master_admin')
  );

-- Policy: Only admins can update document metadata
CREATE POLICY "Only admins can update documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'record-documents' AND
    get_my_role_from_db() IN ('district_admin', 'master_admin')
  );

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads';

-- Note: The get_my_role_from_db() function was created in the 20251011_create_admin_audit_log.sql migration
-- It retrieves the user's role from the user_profiles table using their Clerk JWT sub claim
