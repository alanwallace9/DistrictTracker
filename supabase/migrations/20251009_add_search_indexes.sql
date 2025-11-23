-- Migration: Add indexes for search performance
-- Created: 2025-10-09
-- Purpose: Optimize search queries on first_name, last_name, and location

-- Add indexes on search fields for better performance
-- These fields are used in DashboardClient.tsx for search filtering

CREATE INDEX IF NOT EXISTS idx_trespass_records_first_name ON trespass_records(first_name);
CREATE INDEX IF NOT EXISTS idx_trespass_records_last_name ON trespass_records(last_name);
CREATE INDEX IF NOT EXISTS idx_trespass_records_location ON trespass_records(location);

-- Optional: Add composite index for common query patterns (status + date sorting)
-- This helps when filtering by status AND sorting by incident_date
CREATE INDEX IF NOT EXISTS idx_trespass_records_status_incident_date
ON trespass_records(status, incident_date DESC);

-- Comment explaining the indexes
COMMENT ON INDEX idx_trespass_records_first_name IS 'Improves search performance on first_name field';
COMMENT ON INDEX idx_trespass_records_last_name IS 'Improves search performance on last_name field';
COMMENT ON INDEX idx_trespass_records_location IS 'Improves search performance on location field';
COMMENT ON INDEX idx_trespass_records_status_incident_date IS 'Composite index for status filtering with date sorting';
