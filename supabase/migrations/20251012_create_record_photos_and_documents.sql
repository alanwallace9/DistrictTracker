-- Create tables for multiple photo uploads and document management
-- Part of Version 2.0.1: Multiple Images and Document Upload Feature

-- =============================================================================
-- Table: record_photos
-- Purpose: Store multiple photos per trespass record with metadata
-- =============================================================================

CREATE TABLE IF NOT EXISTS record_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES trespass_records(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for record_photos
CREATE INDEX IF NOT EXISTS idx_record_photos_record_id ON record_photos(record_id);
CREATE INDEX IF NOT EXISTS idx_record_photos_uploaded_by ON record_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_record_photos_created_at ON record_photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_photos_display_order ON record_photos(record_id, display_order);

-- Comments for documentation
COMMENT ON TABLE record_photos IS 'Stores multiple photos per trespass record with file metadata and ordering';
COMMENT ON COLUMN record_photos.record_id IS 'Foreign key to trespass_records table';
COMMENT ON COLUMN record_photos.storage_path IS 'Path to file in Supabase Storage (e.g., record-photos/record-uuid/filename.jpg)';
COMMENT ON COLUMN record_photos.file_name IS 'Original filename uploaded by user';
COMMENT ON COLUMN record_photos.file_size IS 'File size in bytes (max 2MB = 2097152 bytes)';
COMMENT ON COLUMN record_photos.mime_type IS 'MIME type (image/jpeg, image/png, image/webp)';
COMMENT ON COLUMN record_photos.display_order IS 'Order for displaying photos in gallery (0 = primary/first photo)';
COMMENT ON COLUMN record_photos.uploaded_by IS 'Clerk user ID of uploader';

-- =============================================================================
-- Table: record_documents
-- Purpose: Store administrative documents (e.g., trespass warning letters)
-- =============================================================================

CREATE TABLE IF NOT EXISTS record_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES trespass_records(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'trespass_warning',
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for record_documents
CREATE INDEX IF NOT EXISTS idx_record_documents_record_id ON record_documents(record_id);
CREATE INDEX IF NOT EXISTS idx_record_documents_uploaded_by ON record_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_record_documents_created_at ON record_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_documents_document_type ON record_documents(document_type);

-- Comments for documentation
COMMENT ON TABLE record_documents IS 'Stores administrative documents for trespass records (admin only)';
COMMENT ON COLUMN record_documents.record_id IS 'Foreign key to trespass_records table';
COMMENT ON COLUMN record_documents.storage_path IS 'Path to file in Supabase Storage (e.g., record-documents/record-uuid/filename.pdf)';
COMMENT ON COLUMN record_documents.file_name IS 'Original filename uploaded by admin';
COMMENT ON COLUMN record_documents.file_size IS 'File size in bytes (max 5MB = 5242880 bytes)';
COMMENT ON COLUMN record_documents.mime_type IS 'MIME type (application/pdf, application/msword, etc.)';
COMMENT ON COLUMN record_documents.document_type IS 'Type of document (trespass_warning, court_order, etc.)';
COMMENT ON COLUMN record_documents.uploaded_by IS 'Clerk user ID of uploader (must be admin)';

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE record_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_documents ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS Policies for record_photos
-- =============================================================================

-- Policy: Users can view photos for records they have access to
-- This delegates permission checking to the trespass_records RLS policies
CREATE POLICY "Users can view photos for accessible records"
  ON record_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trespass_records
      WHERE trespass_records.id = record_photos.record_id
    )
  );

-- Policy: Users and admins can insert photos
CREATE POLICY "Users and admins can insert photos"
  ON record_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role_from_db() IN ('viewer', 'campus_admin', 'district_admin', 'master_admin')
  );

-- Policy: Users can delete their own uploaded photos
CREATE POLICY "Users can delete their own photos"
  ON record_photos FOR DELETE
  TO authenticated
  USING (
    uploaded_by = (auth.jwt() ->> 'sub')
  );

-- Policy: Admins can delete any photo
CREATE POLICY "Admins can delete any photo"
  ON record_photos FOR DELETE
  TO authenticated
  USING (
    get_my_role_from_db() IN ('district_admin', 'master_admin')
  );

-- Policy: Users can update their own uploaded photos (e.g., display_order)
CREATE POLICY "Users can update their own photos"
  ON record_photos FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = (auth.jwt() ->> 'sub')
  );

-- Policy: Admins can update any photo
CREATE POLICY "Admins can update any photo"
  ON record_photos FOR UPDATE
  TO authenticated
  USING (
    get_my_role_from_db() IN ('district_admin', 'master_admin')
  );

-- =============================================================================
-- RLS Policies for record_documents
-- =============================================================================

-- Policy: Users can view documents for records they have access to
CREATE POLICY "Users can view documents for accessible records"
  ON record_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trespass_records
      WHERE trespass_records.id = record_documents.record_id
    )
  );

-- Policy: Only admins can insert documents
CREATE POLICY "Only admins can insert documents"
  ON record_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role_from_db() IN ('district_admin', 'master_admin')
  );

-- Policy: Only admins can delete documents
CREATE POLICY "Only admins can delete documents"
  ON record_documents FOR DELETE
  TO authenticated
  USING (
    get_my_role_from_db() IN ('district_admin', 'master_admin')
  );

-- Policy: Only admins can update documents
CREATE POLICY "Only admins can update documents"
  ON record_documents FOR UPDATE
  TO authenticated
  USING (
    get_my_role_from_db() IN ('district_admin', 'master_admin')
  );

-- =============================================================================
-- Trigger: Update updated_at timestamp on record modifications
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for record_photos
CREATE TRIGGER update_record_photos_updated_at
  BEFORE UPDATE ON record_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for record_documents
CREATE TRIGGER update_record_documents_updated_at
  BEFORE UPDATE ON record_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
