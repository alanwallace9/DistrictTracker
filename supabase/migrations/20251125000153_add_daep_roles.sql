-- Migration: Add DAEP-specific roles to user_profiles
-- Story: 1.3 - Add New DAEP Roles
-- Date: 2025-11-25
--
-- New Roles Added:
--   daep_admin_l1: Full DAEP operations, point approval, staff management (DAEP campus scope)
--   daep_admin_l2: Daily operations, point entry, limited reports (DAEP campus scope)
--   daep_staff: Point entry, attendance, behavior notes (assigned rooms scope)
--   parent: Read-only access to own child's progress
--   student: Read-only access to own progress
--   counselor: View profiles, placement history (assigned students scope)
--
-- Role Hierarchy (highest to lowest):
--   master_admin (100) > district_admin (90) > daep_admin_l1 (80) > campus_admin (70) >
--   daep_admin_l2 (60) > daep_staff (50) > counselor (40) > viewer (30) > parent (20) > student (10)

-- Drop existing constraint if it exists
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add new constraint with all 10 roles
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check
CHECK (role IN (
  -- Original TrespassTracker roles (unchanged)
  'viewer',
  'campus_admin',
  'district_admin',
  'master_admin',
  -- New DAEP-specific roles (Story 1.3)
  'daep_admin_l1',   -- Full DAEP ops, point approval, staff management
  'daep_admin_l2',   -- Daily ops, point entry, limited reports
  'daep_staff',      -- Point entry, attendance, behavior notes
  'parent',          -- Read-only own child progress
  'student',         -- Read-only own progress
  'counselor'        -- View profiles, placement history
));

-- Add comment documenting the role hierarchy
COMMENT ON COLUMN user_profiles.role IS
'User role determining permissions. Hierarchy (high to low):
master_admin(100) > district_admin(90) > daep_admin_l1(80) > campus_admin(70) >
daep_admin_l2(60) > daep_staff(50) > counselor(40) > viewer(30) > parent(20) > student(10).
TrespassTracker roles: viewer, campus_admin, district_admin, master_admin.
DAEP roles: daep_admin_l1, daep_admin_l2, daep_staff.
Special roles: parent, student, counselor.';

-- Create helper function to check if a role has at least the specified permission level
-- This function can be used in RLS policies for role-based access control
CREATE OR REPLACE FUNCTION has_role_permission(user_role TEXT, required_level INT)
RETURNS BOOLEAN AS $$
DECLARE
  role_levels JSONB := '{
    "master_admin": 100,
    "district_admin": 90,
    "daep_admin_l1": 80,
    "campus_admin": 70,
    "daep_admin_l2": 60,
    "daep_staff": 50,
    "counselor": 40,
    "viewer": 30,
    "parent": 20,
    "student": 10
  }'::JSONB;
  user_level INT;
BEGIN
  user_level := (role_levels ->> user_role)::INT;
  IF user_level IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN user_level >= required_level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create helper function to check if user has a DAEP-related role
CREATE OR REPLACE FUNCTION is_daep_role(user_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_role IN ('daep_admin_l1', 'daep_admin_l2', 'daep_staff');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create helper function to check if user role is read-only (parent/student)
CREATE OR REPLACE FUNCTION is_readonly_role(user_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_role IN ('parent', 'student');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
