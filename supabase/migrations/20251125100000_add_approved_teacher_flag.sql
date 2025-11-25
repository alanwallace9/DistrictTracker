-- Story 1.4: Add approved_teacher flag to user_profiles
-- This flag determines if a DAEP staff member can have their point entries auto-approved
-- Only applicable to daep_staff and daep_admin_l2 roles

-- Add the approved_teacher column with default false
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS approved_teacher BOOLEAN DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN user_profiles.approved_teacher IS
  'When true, point entries from this user are auto-approved (no admin approval needed). Only applicable for daep_staff and daep_admin_l2 roles.';

-- Add notification_days column if missing (used in UI but wasn't in schema)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS notification_days INTEGER DEFAULT 7;

COMMENT ON COLUMN user_profiles.notification_days IS
  'Days before expiration to show warnings for trespass records';
