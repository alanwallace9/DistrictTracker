/*
  # Multi-Tenancy Migration - Add tenant_id Support

  ## Changes:
  1. Create tenants table for subdomain/tenant mapping
  2. Add tenant_id column to trespass_records
  3. Rename org_id to tenant_id in user_profiles
  4. Populate existing records with 'birdville' tenant
  5. Make tenant_id, school_id, expiration_date NOT NULL
  6. Update ALL RLS policies to filter by tenant_id
  7. Add indexes on tenant_id for performance

  ## Security:
  - Users can only see/modify records from their tenant
  - RLS policies enforce tenant isolation
  - Admins still restricted to their tenant only
*/

-- ============================================================
-- STEP 1: Create tenants table
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id text PRIMARY KEY,                          -- Tenant identifier (e.g., 'birdville', 'demo')
  subdomain text UNIQUE NOT NULL,               -- Subdomain for routing (e.g., 'birdville')
  display_name text NOT NULL,                   -- Human-readable name (e.g., 'Birdville ISD')
  status text DEFAULT 'active' NOT NULL         -- 'active', 'suspended', 'trial'
    CHECK (status IN ('active', 'suspended', 'trial')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Insert initial tenant for existing records
INSERT INTO tenants (id, subdomain, display_name, status)
VALUES ('birdville', 'birdville', 'Birdville ISD', 'active')
ON CONFLICT (id) DO NOTHING;

-- Create index on subdomain for lookups
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated users can view all tenants (for validation)
DROP POLICY IF EXISTS "All users can view tenants" ON tenants;
CREATE POLICY "All users can view tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Only master admins can modify tenants
DROP POLICY IF EXISTS "Only master admins can manage tenants" ON tenants;
CREATE POLICY "Only master admins can manage tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (get_my_role_from_db() = 'master_admin')
  WITH CHECK (get_my_role_from_db() = 'master_admin');


-- ============================================================
-- STEP 2: Add tenant_id to trespass_records
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'tenant_id'
  ) THEN
    -- Add as nullable first to allow existing records
    ALTER TABLE trespass_records ADD COLUMN tenant_id text;

    -- Populate all existing records with 'birdville'
    UPDATE trespass_records SET tenant_id = 'birdville' WHERE tenant_id IS NULL;

    -- Now make it NOT NULL
    ALTER TABLE trespass_records ALTER COLUMN tenant_id SET NOT NULL;

    -- Add foreign key constraint to tenants table
    ALTER TABLE trespass_records
      ADD CONSTRAINT fk_trespass_records_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id);
  END IF;
END $$;


-- ============================================================
-- STEP 3: Rename org_id to tenant_id in user_profiles
-- ============================================================
DO $$
BEGIN
  -- Check if org_id exists (old name)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'org_id'
  ) THEN
    -- Rename org_id to tenant_id
    ALTER TABLE user_profiles RENAME COLUMN org_id TO tenant_id;
  END IF;

  -- If tenant_id doesn't exist at all, create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN tenant_id text;
  END IF;

  -- Update any NULL tenant_ids to 'birdville' for existing users
  UPDATE user_profiles SET tenant_id = 'birdville' WHERE tenant_id IS NULL;

  -- Make tenant_id NOT NULL
  ALTER TABLE user_profiles ALTER COLUMN tenant_id SET NOT NULL;

  -- Add foreign key constraint to tenants table
  ALTER TABLE user_profiles
    ADD CONSTRAINT fk_user_profiles_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id);
END $$;


-- ============================================================
-- STEP 4: Make school_id and expiration_date NOT NULL
-- ============================================================
DO $$
BEGIN
  -- Make school_id NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records'
    AND column_name = 'school_id'
    AND is_nullable = 'YES'
  ) THEN
    -- Set default for any existing NULL values
    UPDATE trespass_records SET school_id = 'UNKNOWN' WHERE school_id IS NULL;
    -- Make it NOT NULL
    ALTER TABLE trespass_records ALTER COLUMN school_id SET NOT NULL;
  END IF;

  -- Make expiration_date NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records'
    AND column_name = 'expiration_date'
    AND is_nullable = 'YES'
  ) THEN
    -- Set default expiration (1 year from now) for any existing NULL values
    UPDATE trespass_records
    SET expiration_date = CURRENT_DATE + INTERVAL '1 year'
    WHERE expiration_date IS NULL;
    -- Make it NOT NULL
    ALTER TABLE trespass_records ALTER COLUMN expiration_date SET NOT NULL;
  END IF;
END $$;


-- ============================================================
-- STEP 5: Add indexes on tenant_id for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trespass_records_tenant_id
  ON trespass_records(tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id
  ON user_profiles(tenant_id);

-- Composite index for common queries (tenant + status)
CREATE INDEX IF NOT EXISTS idx_trespass_records_tenant_status
  ON trespass_records(tenant_id, status);


-- ============================================================
-- STEP 6: Drop old RLS policies on trespass_records
-- ============================================================
DROP POLICY IF EXISTS "All users can view records" ON trespass_records;
DROP POLICY IF EXISTS "Admins can create records" ON trespass_records;
DROP POLICY IF EXISTS "Admins can update records" ON trespass_records;
DROP POLICY IF EXISTS "District and master admins can delete" ON trespass_records;


-- ============================================================
-- STEP 7: Create new RLS policies with tenant_id filtering
-- ============================================================

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM user_profiles WHERE id = get_my_clerk_id();
$$;

-- SELECT: Users can only view records from their tenant
CREATE POLICY "Users can view records from their tenant"
  ON trespass_records FOR SELECT
  TO authenticated
  USING (tenant_id = get_my_tenant_id());

-- INSERT: Admins can only create records for their tenant
CREATE POLICY "Admins can create records for their tenant"
  ON trespass_records FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role_from_db() IN ('campus_admin', 'district_admin', 'master_admin')
    AND tenant_id = get_my_tenant_id()
  );

-- UPDATE: Admins can only update records from their tenant
CREATE POLICY "Admins can update records from their tenant"
  ON trespass_records FOR UPDATE
  TO authenticated
  USING (
    get_my_role_from_db() IN ('campus_admin', 'district_admin', 'master_admin')
    AND tenant_id = get_my_tenant_id()
  )
  WITH CHECK (
    get_my_role_from_db() IN ('campus_admin', 'district_admin', 'master_admin')
    AND tenant_id = get_my_tenant_id()
  );

-- DELETE: District/master admins can only delete records from their tenant
CREATE POLICY "District and master admins can delete records from their tenant"
  ON trespass_records FOR DELETE
  TO authenticated
  USING (
    get_my_role_from_db() IN ('district_admin', 'master_admin')
    AND tenant_id = get_my_tenant_id()
  );


-- ============================================================
-- STEP 8: Update RLS policies on user_profiles (optional enhancement)
-- ============================================================
-- Note: Keeping existing policies for now since they work
-- Master admins can see all users, regular users see their own profile
-- If you want tenant isolation for user_profiles too, we can add that later


-- ============================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================
-- Run these after migration to verify:

-- 1. Check all records have tenant_id
-- SELECT COUNT(*) as total,
--        COUNT(tenant_id) as with_tenant,
--        COUNT(*) FILTER (WHERE tenant_id = 'birdville') as birdville_records
-- FROM trespass_records;

-- 2. Check all users have tenant_id
-- SELECT id, email, tenant_id, role FROM user_profiles;

-- 3. Check tenants table
-- SELECT * FROM tenants;

-- 4. Verify RLS policies
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'trespass_records'
-- ORDER BY policyname;
