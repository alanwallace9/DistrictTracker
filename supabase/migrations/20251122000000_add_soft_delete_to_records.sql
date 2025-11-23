-- Add soft delete support to trespass_records table
-- FERPA Compliance: Records must be retained for 5 years before permanent deletion

-- Add deleted_at column to trespass_records
ALTER TABLE trespass_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for performance when filtering out deleted records
CREATE INDEX IF NOT EXISTS idx_trespass_records_deleted_at ON trespass_records(deleted_at);

-- Add index for finding old records (5+ years old)
CREATE INDEX IF NOT EXISTS idx_trespass_records_created_deleted ON trespass_records(created_at, deleted_at);

-- Update RLS policies to exclude soft-deleted records by default
-- Drop existing select policy
DROP POLICY IF EXISTS "Users can view records in their tenant" ON trespass_records;

-- Recreate select policy with deleted_at filter
CREATE POLICY "Users can view records in their tenant"
  ON trespass_records
  FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::text
    AND deleted_at IS NULL
  );

-- Create special policy for master_admin to view deleted records
CREATE POLICY "Master admins can view deleted records"
  ON trespass_records
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role')::text = 'master_admin'
  );

-- Add comment for documentation
COMMENT ON COLUMN trespass_records.deleted_at IS 'Timestamp when record was soft-deleted. NULL means record is active. Records older than 5 years can be hard-deleted after admin review per FERPA compliance.';
