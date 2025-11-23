-- Rename trespass_records fields for better clarity
-- Migration: 2025-11-10
-- Purpose: Rename 4 fields to more descriptive names

-- 1. Rename known_associates to affiliation
ALTER TABLE trespass_records
RENAME COLUMN known_associates TO affiliation;

COMMENT ON COLUMN trespass_records.affiliation IS
'Known affiliations or associates of the individual';

-- 2. Rename contact_info to school_contact
ALTER TABLE trespass_records
RENAME COLUMN contact_info TO school_contact;

COMMENT ON COLUMN trespass_records.school_contact IS
'School contact information or point of contact';

-- 3. Rename location to incident_location
ALTER TABLE trespass_records
RENAME COLUMN location TO incident_location;

COMMENT ON COLUMN trespass_records.incident_location IS
'Specific location where the incident occurred';

-- 4. Rename photo_url to photo
ALTER TABLE trespass_records
RENAME COLUMN photo_url TO photo;

COMMENT ON COLUMN trespass_records.photo IS
'Photo URL for the individual (stored as data URL or external URL)';
