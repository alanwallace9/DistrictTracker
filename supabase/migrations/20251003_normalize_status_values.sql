-- ============================================================================
-- Normalize status values to lowercase
-- ============================================================================
-- This migration ensures all status values are lowercase ('active', 'inactive')
-- and removes invalid 'Expired' status (expiration is determined by expiration_date)

-- Update all capitalized 'Active' to lowercase 'active'
UPDATE trespass_records
SET status = 'active'
WHERE status = 'Active';

-- Update 'Expired' to 'inactive' (since expired should be determined by expiration_date)
UPDATE trespass_records
SET status = 'inactive'
WHERE status = 'Expired';

-- Update any other variations to lowercase
UPDATE trespass_records
SET status = LOWER(status)
WHERE status NOT IN ('active', 'inactive');

-- Verify the constraint still works
ALTER TABLE trespass_records
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE trespass_records
ADD CONSTRAINT valid_status CHECK (status IN ('active', 'inactive'));
