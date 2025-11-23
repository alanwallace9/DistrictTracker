-- Add version tracking fields to feedback_submissions table

ALTER TABLE feedback_submissions
ADD COLUMN IF NOT EXISTS version_type TEXT CHECK (version_type IN ('major', 'minor', 'patch')),
ADD COLUMN IF NOT EXISTS version_number TEXT,
ADD COLUMN IF NOT EXISTS release_quarter TEXT CHECK (release_quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
ADD COLUMN IF NOT EXISTS release_month_year TEXT;

-- Add comments to explain the fields
COMMENT ON COLUMN feedback_submissions.version_type IS 'Type of version update: major (breaking changes), minor (new features), patch (bug fixes)';
COMMENT ON COLUMN feedback_submissions.version_number IS 'Semantic version number (e.g., 1.2.3)';
COMMENT ON COLUMN feedback_submissions.release_quarter IS 'Planned release quarter (Q1, Q2, Q3, Q4) for items not yet completed';
COMMENT ON COLUMN feedback_submissions.release_month_year IS 'Actual release month and year (e.g., November 2025) for completed items';
