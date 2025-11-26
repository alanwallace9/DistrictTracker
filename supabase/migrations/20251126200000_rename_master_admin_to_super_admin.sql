-- Migration: Rename master_admin to super_admin
-- Date: 2025-11-26
-- Purpose: Standardize role naming from master_admin to super_admin for clarity
-- This is a breaking change - ensure Clerk publicMetadata is updated for affected users

-- Update the CHECK constraint on user_profiles.role to include super_admin
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (
  role = ANY (ARRAY[
    'viewer'::text,
    'campus_admin'::text,
    'district_admin'::text,
    'super_admin'::text,      -- New role name
    'master_admin'::text,     -- Keep for backward compatibility during transition
    'daep_admin_l1'::text,
    'daep_admin_l2'::text,
    'daep_staff'::text,
    'parent'::text,
    'student'::text,
    'counselor'::text
  ])
);

-- Update existing master_admin users to super_admin
UPDATE user_profiles
SET role = 'super_admin', updated_at = now()
WHERE role = 'master_admin';

-- Update the comment on the role column
COMMENT ON COLUMN user_profiles.role IS 'User role determining permissions. Hierarchy (high to low):
super_admin(100) > district_admin(90) > daep_admin_l1(80) > campus_admin(70) >
daep_admin_l2(60) > daep_staff(50) > counselor(40) > viewer(30) > parent(20) > student(10).
TrespassTracker roles: viewer, campus_admin, district_admin, super_admin.
DAEP roles: daep_admin_l1, daep_admin_l2, daep_staff.
Special roles: parent, student, counselor.
Note: master_admin is deprecated, use super_admin instead.';

-- Update pending_invitations role CHECK constraint
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_role_check;

ALTER TABLE pending_invitations ADD CONSTRAINT pending_invitations_role_check CHECK (
  role = ANY (ARRAY[
    'viewer'::text,
    'campus_admin'::text,
    'district_admin'::text,
    'super_admin'::text,
    'master_admin'::text      -- Keep for backward compatibility
  ])
);

-- Update any pending invitations with master_admin role
UPDATE pending_invitations
SET role = 'super_admin', updated_at = now()
WHERE role = 'master_admin';

-- Log the migration in audit trail
INSERT INTO admin_audit_log (
  event_type,
  actor_id,
  actor_email,
  actor_role,
  action,
  details,
  module,
  created_at
) VALUES (
  'migration.role_rename',
  'system',
  'system@districttracker.com',
  'super_admin',
  'Renamed master_admin role to super_admin across all tables',
  '{"migration": "20251126200000_rename_master_admin_to_super_admin", "affected_tables": ["user_profiles", "pending_invitations"]}'::jsonb,
  'admin',
  now()
);
