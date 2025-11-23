-- Add notification preferences to user_profiles table
-- This migration adds the ability for users to enable/disable expiring warning notifications

-- Add notifications_enabled column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true;

-- Add comment to document the field
COMMENT ON COLUMN user_profiles.notifications_enabled IS 'Whether user wants to receive notifications for trespass warnings expiring within 1 week';

-- Update existing users to have notifications enabled by default for admin roles
UPDATE user_profiles
SET notifications_enabled = true
WHERE role IN ('campus_admin', 'district_admin', 'master_admin');

-- Update existing users with viewer role to have notifications disabled by default
UPDATE user_profiles
SET notifications_enabled = false
WHERE role = 'viewer';
