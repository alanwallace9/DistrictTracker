/*
  # Add org_id field to user_profiles table

  This allows users to be associated with a specific organization for multi-tenant support.
  The org_id will be synced from Clerk public metadata via webhooks.
*/

-- Add org_id column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS org_id TEXT;

-- Add index for faster queries on org_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON user_profiles(org_id);

-- Add comment
COMMENT ON COLUMN user_profiles.org_id IS 'Organization identifier for multi-tenant support, synced from Clerk public metadata';
