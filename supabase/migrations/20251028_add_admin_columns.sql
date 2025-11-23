/*
  # Admin Interface Support - Add Status and Soft Delete Columns

  ## Changes:
  1. Add status column to user_profiles (active, inactive, invited)
  2. Add soft delete columns (deleted_at) to user_profiles and campuses
  3. Add indexes for performance

  ## Purpose:
  - Track user invitation status
  - Support soft deletes for users and campuses
  - Enable admin audit trail
*/

-- ============================================================
-- STEP 1: Add status column to user_profiles
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE user_profiles
      ADD COLUMN status TEXT DEFAULT 'active'
      CHECK (status IN ('active', 'inactive', 'invited'));

    -- Set existing users to 'active'
    UPDATE user_profiles SET status = 'active' WHERE status IS NULL;

    COMMENT ON COLUMN user_profiles.status IS 'User account status: active (can login), inactive (disabled), invited (pending acceptance)';
  END IF;
END $$;

-- ============================================================
-- STEP 2: Add soft delete columns
-- ============================================================

-- Add deleted_at to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN deleted_at TIMESTAMPTZ;

    COMMENT ON COLUMN user_profiles.deleted_at IS 'Timestamp when user was soft-deleted (NULL = active)';
  END IF;
END $$;

-- Add deleted_at to campuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campuses' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE campuses ADD COLUMN deleted_at TIMESTAMPTZ;

    COMMENT ON COLUMN campuses.deleted_at IS 'Timestamp when campus was soft-deleted (NULL = active)';
  END IF;
END $$;

-- ============================================================
-- STEP 3: Create indexes for performance
-- ============================================================

-- Index for querying active users (deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at
  ON user_profiles(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Index for querying active campuses
CREATE INDEX IF NOT EXISTS idx_campuses_deleted_at
  ON campuses(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Index for user status queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_status
  ON user_profiles(status);

-- Composite index for tenant + status queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_status
  ON user_profiles(tenant_id, status)
  WHERE deleted_at IS NULL;

-- ============================================================
-- STEP 4: Create helper functions for admin queries
-- ============================================================

-- Function to get all active users (not soft deleted)
CREATE OR REPLACE FUNCTION get_active_users()
RETURNS SETOF user_profiles AS $$
  SELECT * FROM user_profiles WHERE deleted_at IS NULL;
$$ LANGUAGE sql STABLE;

-- Function to get all active campuses (not soft deleted)
CREATE OR REPLACE FUNCTION get_active_campuses()
RETURNS SETOF campuses AS $$
  SELECT * FROM campuses WHERE deleted_at IS NULL;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- NOTES:
-- ============================================================
--
-- Soft Delete Pattern:
-- - When deleting a user, SET deleted_at = NOW() instead of DELETE
-- - Queries should filter WHERE deleted_at IS NULL to get active records
-- - This preserves audit trail and allows data recovery
--
-- User Status Values:
-- - 'active': User has accepted invite and can login
-- - 'inactive': User account disabled by admin (can be re-enabled)
-- - 'invited': User created via Clerk but hasn't set password yet
--
