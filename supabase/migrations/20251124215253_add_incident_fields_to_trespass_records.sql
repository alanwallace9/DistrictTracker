-- Migration: add_incident_fields_to_trespass_records.sql
-- Purpose: Enable DAEP placement linking for CSV reconciliation (Epic 5)
-- Story: 1.0 - TrespassTracker Schema Update
--
-- This migration adds the incident_number field to trespass_records for
-- linking DAEP placements to SIS records during CSV reconciliation.
-- Note: incident_date already exists in the table and serves this purpose.

-- Add incident_number field for DAEP placement linking
-- This is the SIS incident number used during CSV reconciliation
ALTER TABLE trespass_records
ADD COLUMN IF NOT EXISTS incident_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN trespass_records.incident_number IS 'SIS incident number for DAEP placement linking. Format: INC-YYYY-NNNNN or {campus}-{date} for manual entries.';

-- Index for fast lookups during CSV reconciliation
-- Partial index excludes NULL values for efficiency since most records won't have incident_number
CREATE INDEX IF NOT EXISTS idx_trespass_records_incident_number
ON trespass_records(incident_number)
WHERE incident_number IS NOT NULL;

-- Composite index for student + incident matching
-- Used when looking up specific incidents for a student during reconciliation
CREATE INDEX IF NOT EXISTS idx_trespass_records_student_incident
ON trespass_records(school_id, incident_number);
