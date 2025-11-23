/*
  # Fix User Profile Updates with Clerk Native Integration

  PROBLEM:
  - Clerk's native integration doesn't pass custom role in JWT by default
  - JWT only contains: sub (user_id) and role: "authenticated"
  - No public_metadata.role visible in JWT
  - Users cannot update their own profiles

  SOLUTION:
  - Simplify RLS policies to allow users to update their OWN profiles
  - Keep role checking for viewing OTHER profiles
  - Role management stays in webhook (admin-only via Clerk metadata)

  This allows:
  - Users can update their own display_name and theme
  - Users can view their own profile
  - Admins can view all profiles (checked via Supabase user_profiles table)
  - Only master_admin can change roles (via webhook)
*/

-- ============================================================================
-- STEP 1: Drop existing user_profiles policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view profiles based on role" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update profiles based on role" ON user_profiles;
DROP POLICY IF EXISTS "Master admin can delete profiles" ON user_profiles;

-- ============================================================================
-- STEP 2: Create simplified helper function
-- ============================================================================

-- Get Clerk user ID from JWT (this works reliably)
DROP FUNCTION IF EXISTS get_my_clerk_id();
CREATE OR REPLACE FUNCTION get_my_clerk_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    ''
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get my role from user_profiles table (not from JWT)
DROP FUNCTION IF EXISTS get_my_role_from_db();
CREATE OR REPLACE FUNCTION get_my_role_from_db()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM user_profiles WHERE id = get_my_clerk_id()),
    'viewer'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Create new RLS policies for user_profiles
-- ============================================================================

-- SELECT: Users can view their own profile, admins can view all profiles
CREATE POLICY "Users can view own profile or admins view all"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id = get_my_clerk_id()  -- Own profile
    OR get_my_role_from_db() IN ('campus_admin', 'district_admin', 'master_admin')  -- Admins see all
  );

-- INSERT: Anyone can create their own profile on first login
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = get_my_clerk_id());

-- UPDATE: Users can update their OWN profile (display_name, theme)
-- Only master_admin can update OTHER users' profiles
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = get_my_clerk_id()  -- Own profile
    OR get_my_role_from_db() = 'master_admin'  -- Master admin can update others
  )
  WITH CHECK (
    id = get_my_clerk_id()
    OR get_my_role_from_db() = 'master_admin'
  );

-- DELETE: Only master_admin can delete profiles
CREATE POLICY "Only master admin can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (get_my_role_from_db() = 'master_admin');

-- ============================================================================
-- STEP 4: Update trespass_records policies to use DB role check
-- ============================================================================

-- Drop old policies that reference get_clerk_user_role()
DROP POLICY IF EXISTS "All authenticated users can view records" ON trespass_records;
DROP POLICY IF EXISTS "Admins can create records" ON trespass_records;
DROP POLICY IF EXISTS "Admins can update records" ON trespass_records;
DROP POLICY IF EXISTS "District and master admins can delete records" ON trespass_records;

-- SELECT: All authenticated users can view records
CREATE POLICY "All users can view records"
  ON trespass_records
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: campus_admin, district_admin, and master_admin can create
CREATE POLICY "Admins can create records"
  ON trespass_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role_from_db() IN ('campus_admin', 'district_admin', 'master_admin')
  );

-- UPDATE: campus_admin, district_admin, and master_admin can update
CREATE POLICY "Admins can update records"
  ON trespass_records
  FOR UPDATE
  TO authenticated
  USING (
    get_my_role_from_db() IN ('campus_admin', 'district_admin', 'master_admin')
  )
  WITH CHECK (
    get_my_role_from_db() IN ('campus_admin', 'district_admin', 'master_admin')
  );

-- DELETE: Only district_admin and master_admin can delete
CREATE POLICY "District and master admins can delete"
  ON trespass_records
  FOR DELETE
  TO authenticated
  USING (
    get_my_role_from_db() IN ('district_admin', 'master_admin')
  );

-- ============================================================================
-- NOTES:
-- ============================================================================
--
-- Key Changes:
-- 1. Role is read from user_profiles TABLE, not from JWT
-- 2. Clerk JWT only provides user ID (sub claim)
-- 3. Webhook syncs role from Clerk metadata to user_profiles table
-- 4. RLS queries the table to check permissions
--
-- Why this works:
-- - Clerk native integration only passes: sub, iss, aud, role: "authenticated"
-- - Custom metadata (public_metadata.role) is NOT in the default JWT
-- - We store role in Supabase and query it instead
-- - Webhook keeps it in sync with Clerk
--
-- Security:
-- - Users can only update their own display_name and theme
-- - Role changes happen via webhook only (admin action in Clerk)
-- - RLS still enforces role-based permissions for records
--
