/*
  # Campus Management System

  ## Changes:
  1. Create campuses table for tracking school locations
  2. Add RLS policies for campus access
  3. Create indexes for performance

  ## Purpose:
  - Allow master/district admins to manage campus list
  - Provide dropdown list for campus selection when inviting users
  - Track which campuses belong to which tenants
*/

-- ============================================================
-- STEP 1: Create campuses table
-- ============================================================
CREATE TABLE IF NOT EXISTS campuses (
  id text PRIMARY KEY,                          -- Campus identifier (e.g., 'bhs', 'north-ms')
  tenant_id text NOT NULL,                      -- Foreign key to tenants
  name text NOT NULL,                           -- Human-readable name (e.g., 'Birdville High School')
  abbreviation text,                            -- Short name (e.g., 'BHS')
  status text DEFAULT 'active' NOT NULL         -- 'active', 'inactive'
    CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT fk_campuses_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campuses_tenant_id ON campuses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campuses_status ON campuses(status);

-- Create trigger for updated_at
CREATE TRIGGER update_campuses_updated_at
  BEFORE UPDATE ON campuses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STEP 2: Enable RLS
-- ============================================================
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: Create RLS policies
-- ============================================================

-- SELECT: Users can view campuses from their tenant
CREATE POLICY "Users can view campuses from their tenant"
  ON campuses FOR SELECT
  TO authenticated
  USING (tenant_id = get_my_tenant_id());

-- INSERT: Only district/master admins can create campuses
CREATE POLICY "Admins can create campuses for their tenant"
  ON campuses FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role_from_db() IN ('district_admin', 'master_admin')
    AND tenant_id = get_my_tenant_id()
  );

-- UPDATE: Only district/master admins can update campuses
CREATE POLICY "Admins can update campuses from their tenant"
  ON campuses FOR UPDATE
  TO authenticated
  USING (
    get_my_role_from_db() IN ('district_admin', 'master_admin')
    AND tenant_id = get_my_tenant_id()
  )
  WITH CHECK (
    get_my_role_from_db() IN ('district_admin', 'master_admin')
    AND tenant_id = get_my_tenant_id()
  );

-- DELETE: Only master admins can delete campuses
CREATE POLICY "Master admins can delete campuses"
  ON campuses FOR DELETE
  TO authenticated
  USING (
    get_my_role_from_db() = 'master_admin'
    AND tenant_id = get_my_tenant_id()
  );

-- ============================================================
-- STEP 4: Campus data to be inserted per tenant
-- ============================================================
-- NOTE: Campus data should be inserted separately for each tenant
-- via the admin interface or MCP tools, not in this migration.
-- This keeps the migration tenant-agnostic for multi-tenant deployments.
