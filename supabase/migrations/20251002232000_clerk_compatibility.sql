/*
  # Clerk Authentication Compatibility Migration

  This migration updates the database schema to work with Clerk authentication
  instead of Supabase Auth.

  Key Changes:
  1. Change user_id columns from UUID to TEXT (to store Clerk user IDs)
  2. Update user_profiles table to use TEXT primary key
  3. Update RLS policies to use Clerk JWT tokens
  4. Remove foreign key constraints to auth.users (Supabase Auth)

  IMPORTANT: This is a breaking change. Existing data will need to be migrated
  or the database should be reset for development.
*/

-- ============================================================================
-- STEP 1: Drop existing foreign key constraints
-- ============================================================================

-- Drop foreign key from trespass_records to auth.users
ALTER TABLE trespass_records DROP CONSTRAINT IF EXISTS trespass_records_user_id_fkey;

-- Drop foreign key from user_profiles to auth.users
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- ============================================================================
-- STEP 2: Update user_profiles table structure
-- ============================================================================

-- Drop and recreate user_profiles table with TEXT primary key
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY,                    -- Clerk user ID (e.g., "user_2abc...")
  email TEXT,                             -- User email (optional, from Clerk)
  display_name TEXT,                      -- User's display name
  role TEXT NOT NULL DEFAULT 'user',      -- user, district_admin, master_admin
  theme TEXT NOT NULL DEFAULT 'system',   -- light, dark, system
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('user', 'district_admin', 'master_admin')),
  CONSTRAINT valid_theme CHECK (theme IN ('light', 'dark', 'system'))
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- ============================================================================
-- STEP 3: Update trespass_records table structure
-- ============================================================================

-- Modify user_id column type from UUID to TEXT
ALTER TABLE trespass_records
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Add email column if it doesn't exist (for Clerk compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Update RLS Policies for Clerk JWT
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

DROP POLICY IF EXISTS "Authenticated users can view all trespass records" ON trespass_records;
DROP POLICY IF EXISTS "Authenticated users can create trespass records" ON trespass_records;
DROP POLICY IF EXISTS "Authenticated users can update trespass records" ON trespass_records;
DROP POLICY IF EXISTS "Authenticated users can delete trespass records" ON trespass_records;

-- User Profiles Policies (using Clerk JWT)
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.jwt() ->> 'sub' = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'sub' = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.jwt() ->> 'sub' = id)
  WITH CHECK (auth.jwt() ->> 'sub' = id);

-- Trespass Records Policies (using Clerk JWT)
-- All authenticated users can view all records
CREATE POLICY "Authenticated users can view all records"
  ON trespass_records
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can create records (user_id must match their Clerk ID)
CREATE POLICY "Authenticated users can create records"
  ON trespass_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- All authenticated users can update records
CREATE POLICY "Authenticated users can update records"
  ON trespass_records
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- All authenticated users can delete records
CREATE POLICY "Authenticated users can delete records"
  ON trespass_records
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- STEP 5: Create trigger for user_profiles updated_at
-- ============================================================================

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Helper function to get user role (for RLS policies)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = (auth.jwt() ->> 'sub');
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- Notes for Production Deployment:
-- ============================================================================
--
-- 1. Configure Clerk JWT Template in Clerk Dashboard:
--    - Template name: "supabase"
--    - Claims:
--      {
--        "sub": "{{user.id}}",
--        "email": "{{user.primary_email_address}}",
--        "role": "authenticated"
--      }
--
-- 2. Set Supabase JWT Secret in Clerk:
--    - Copy from Supabase Dashboard → Settings → API → JWT Secret
--    - Add to Clerk Dashboard → JWT Templates → supabase → Signing Keys
--
-- 3. Migration Path for Existing Data:
--    - If you have existing users, you'll need to:
--      a) Export existing user_profiles and trespass_records
--      b) Map Supabase Auth UUIDs to new Clerk user IDs
--      c) Re-import data with Clerk IDs
--    - For development/testing, it's easier to start fresh
--
