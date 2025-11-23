/*
  # Add campus_id field to user_profiles table

  This allows campus_admin users to be associated with a specific campus.
  The campus_id will be synced from Clerk public metadata via webhooks.
*/

-- Add campus_id column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS campus_id TEXT;

-- Add index for faster queries on campus_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_campus_id ON user_profiles(campus_id);

-- Add comment
COMMENT ON COLUMN user_profiles.campus_id IS 'Campus identifier for campus_admin users, synced from Clerk public metadata';
