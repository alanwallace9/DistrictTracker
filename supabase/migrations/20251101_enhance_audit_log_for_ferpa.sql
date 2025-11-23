-- Add columns for FERPA compliance and searchability
-- This migration enhances the audit log to support:
-- 1. Searching by student/record name (FERPA requirement)
-- 2. Multi-tenancy filtering
-- 3. Full-text search capabilities

-- Add new columns
ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS record_subject_name TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Add indexes for search performance
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant
  ON admin_audit_log(tenant_id);

-- Enable pg_trgm extension for fuzzy text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN index for fast text search on subject names
CREATE INDEX IF NOT EXISTS idx_audit_log_subject_name_gin
  ON admin_audit_log USING gin(record_subject_name gin_trgm_ops);

-- Add comments for documentation
COMMENT ON COLUMN admin_audit_log.record_subject_name IS 'Name of student/record subject for FERPA-compliant searches';
COMMENT ON COLUMN admin_audit_log.tenant_id IS 'Tenant ID for multi-tenancy filtering';
