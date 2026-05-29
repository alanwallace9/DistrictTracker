-- Migration: create_daep_records
-- Phase A of the DAEP records decoupling effort.
-- Spec: docs/sprint-artifacts/daep/tech-spec-daep-records-decoupling.md
--
-- Purpose
-- -------
-- Introduce a DAEP-owned student record (`daep_records`) so DAEP no longer
-- requires every student to live in `trespass_records`. Also adds a
-- tenant-level `enabled_modules` flag so we can detect which modules a
-- district has turned on (toggled by super-admins; sync behavior reads
-- this live at decision points).
--
-- This migration is additive and idempotent. No existing reads/writes
-- change here -- subsequent phases (B, C, E) wire intake, reads, and
-- the admin toggle UI to this schema.

-- =====================================================
-- SECTION 1: daep_records table
-- =====================================================

CREATE TABLE IF NOT EXISTS daep_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     text NOT NULL,
  -- SIS identity
  school_id     text NOT NULL,
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  grade_level   int,
  home_campus_id text,
  current_school text,
  date_of_birth date,

  -- SIS-sourced demographics (authoritative; NEVER overwritten by intake)
  parent_email             text,
  guardian_phone           text,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  special_education boolean NOT NULL DEFAULT false,
  plan_504          boolean NOT NULL DEFAULT false,
  ell_status        boolean NOT NULL DEFAULT false,

  -- Intake-captured corrections (additive; preferred for display via COALESCE).
  -- See spec section 6.1. SIS fields above are never overwritten by intake.
  parent_email_intake            text,
  guardian_phone_intake          text,
  emergency_contact_name_intake  text,
  emergency_contact_phone_intake text,
  demographics_updated_at        timestamptz,
  demographics_updated_by        text,

  -- lifecycle
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),

  -- cross-module link (NULL when trespass module not in use, or not yet linked)
  trespass_record_id uuid REFERENCES trespass_records(id) ON DELETE SET NULL,

  -- audit
  created_via text NOT NULL DEFAULT 'manual',
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, school_id),
  FOREIGN KEY (tenant_id, home_campus_id) REFERENCES campuses(tenant_id, id)
);

COMMENT ON TABLE daep_records IS
  'DAEP-owned student record. Identity for DAEP students independent of trespass_records. Linked to trespass_records (when present) via trespass_record_id.';
COMMENT ON COLUMN daep_records.school_id IS
  'Student SIS id; unique per tenant.';
COMMENT ON COLUMN daep_records.trespass_record_id IS
  'Link to trespass_records when the tenant also uses the trespass module. NULL for DAEP-only tenants.';
COMMENT ON COLUMN daep_records.parent_email_intake IS
  'Correction captured at DAEP intake. Display layer prefers this via COALESCE(parent_email_intake, parent_email).';
COMMENT ON COLUMN daep_records.guardian_phone_intake IS
  'Correction captured at DAEP intake. Display layer prefers this via COALESCE(guardian_phone_intake, guardian_phone).';
COMMENT ON COLUMN daep_records.emergency_contact_name_intake IS
  'Correction captured at DAEP intake. Display layer prefers this via COALESCE(emergency_contact_name_intake, emergency_contact_name).';
COMMENT ON COLUMN daep_records.emergency_contact_phone_intake IS
  'Correction captured at DAEP intake. Display layer prefers this via COALESCE(emergency_contact_phone_intake, emergency_contact_phone).';

-- =====================================================
-- SECTION 2: Indexes
-- =====================================================

-- (tenant_id, school_id) is already covered by UNIQUE constraint above.
CREATE INDEX IF NOT EXISTS idx_daep_records_tenant_status
  ON daep_records (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_daep_records_trespass_link
  ON daep_records (trespass_record_id)
  WHERE trespass_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daep_records_tenant_campus
  ON daep_records (tenant_id, home_campus_id)
  WHERE home_campus_id IS NOT NULL;

-- =====================================================
-- SECTION 3: updated_at trigger
-- =====================================================

DROP TRIGGER IF EXISTS daep_records_set_updated_at ON daep_records;
CREATE TRIGGER daep_records_set_updated_at
  BEFORE UPDATE ON daep_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SECTION 4: RLS (role-based, matches daep_placements pattern)
-- See docs/sprint-artifacts/daep/dec-12-rls-update.md
-- Reference migration: 20251130210000_fix_rollover_decisions_rls.sql
-- =====================================================

ALTER TABLE daep_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daep_records_select ON daep_records;
CREATE POLICY daep_records_select ON daep_records
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role_from_db() = ANY(ARRAY[
      'super_admin',
      'district_admin',
      'daep_admin_l1',
      'daep_admin_l2',
      'campus_admin',
      'daep_staff',
      'counselor',
      'viewer'
    ])
  );

DROP POLICY IF EXISTS daep_records_insert ON daep_records;
CREATE POLICY daep_records_insert ON daep_records
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND get_my_role_from_db() = ANY(ARRAY[
      'super_admin',
      'district_admin',
      'daep_admin_l1',
      'daep_admin_l2',
      'campus_admin'
    ])
  );

DROP POLICY IF EXISTS daep_records_update ON daep_records;
CREATE POLICY daep_records_update ON daep_records
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role_from_db() = ANY(ARRAY[
      'super_admin',
      'district_admin',
      'daep_admin_l1',
      'daep_admin_l2',
      'campus_admin',
      'daep_staff'
    ])
  );

DROP POLICY IF EXISTS daep_records_delete ON daep_records;
CREATE POLICY daep_records_delete ON daep_records
  FOR DELETE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role_from_db() = ANY(ARRAY[
      'super_admin',
      'district_admin',
      'daep_admin_l1',
      'daep_admin_l2'
    ])
  );

DROP POLICY IF EXISTS daep_records_demo_tenant ON daep_records;
CREATE POLICY daep_records_demo_tenant ON daep_records
  FOR ALL USING (
    CASE
      WHEN (tenant_id = 'demo') THEN
        CASE get_effective_role()
          WHEN 'viewer'         THEN true
          WHEN 'campus_admin'   THEN true
          WHEN 'district_admin' THEN true
          WHEN 'daep_admin_l1'  THEN true
          WHEN 'daep_admin_l2'  THEN true
          WHEN 'daep_staff'     THEN true
          ELSE false
        END
      ELSE false
    END
  );

-- =====================================================
-- SECTION 5: Backfill from existing DAEP students
-- Idempotent: ON CONFLICT (tenant_id, school_id) DO NOTHING.
-- Source = trespass_records joined to any DAEP signal (placement OR is_daep=true).
-- Every current DAEP student already has a trespass_records row (intake created it).
-- =====================================================

INSERT INTO daep_records (
  tenant_id,
  school_id,
  first_name,
  last_name,
  grade_level,
  home_campus_id,
  current_school,
  date_of_birth,
  parent_email,
  guardian_phone,
  emergency_contact_name,
  emergency_contact_phone,
  special_education,
  plan_504,
  ell_status,
  status,
  trespass_record_id,
  created_via,
  created_by,
  created_at,
  updated_at
)
SELECT
  tr.tenant_id,
  tr.school_id,
  tr.first_name,
  tr.last_name,
  tr.grade_level,
  tr.campus_id                          AS home_campus_id,
  tr.current_school,
  tr.date_of_birth,
  tr.parent_email,
  tr.guardian_phone,
  tr.emergency_contact_name,
  tr.emergency_contact_phone,
  COALESCE(tr.special_education, false) AS special_education,
  COALESCE(tr.plan_504, false)          AS plan_504,
  COALESCE(tr.ell_status, false)        AS ell_status,
  'active'                              AS status,
  tr.id                                 AS trespass_record_id,
  'backfill'                            AS created_via,
  NULL                                  AS created_by,
  tr.created_at,
  now()                                 AS updated_at
FROM trespass_records tr
WHERE tr.is_daep = true
   OR EXISTS (
     SELECT 1 FROM daep_placements p
     WHERE p.tenant_id = tr.tenant_id
       AND p.school_id = tr.school_id
   )
ON CONFLICT (tenant_id, school_id) DO NOTHING;

-- =====================================================
-- SECTION 6: tenants.enabled_modules
-- =====================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS enabled_modules text[]
    NOT NULL DEFAULT ARRAY['trespass', 'daep']::text[];

COMMENT ON COLUMN tenants.enabled_modules IS
  'Modules the district has turned on (e.g. {trespass,daep}). Toggled by super-admins; runtime reads this live at decision points (intake, placement sync). See tech-spec-daep-records-decoupling.md section 5.';

-- =====================================================
-- SECTION 7: Seed enabled_modules per tenant
-- Step 7a (always): add modules based on data presence in DAEP / trespass tables.
-- Step 7b (guarded): augment from user_profiles.module_access if that column exists.
--   (`module_access` is present in production but not in any committed migration --
--   added via Supabase MCP earlier in the project. Guard so this migration is
--   robust across environments.)
-- Tenants with no signal at all keep the column default of {trespass,daep}.
-- =====================================================

-- 7a. Data-presence signals (unconditional)
UPDATE tenants t
SET enabled_modules = sub.modules
FROM (
  SELECT
    t.id AS tenant_id,
    ARRAY(
      SELECT DISTINCT m FROM (
        SELECT 'daep'::text AS m
        WHERE EXISTS (SELECT 1 FROM daep_placements p WHERE p.tenant_id = t.id)
        UNION
        SELECT 'trespass'::text AS m
        WHERE EXISTS (SELECT 1 FROM trespass_records tr WHERE tr.tenant_id = t.id)
      ) s
    ) AS modules
  FROM tenants t
) sub
WHERE t.id = sub.tenant_id
  AND cardinality(sub.modules) > 0;

-- 7b. user_profiles.module_access signals (guarded on column existence)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'module_access'
  ) THEN
    EXECUTE $sql$
      UPDATE tenants t
      SET enabled_modules = ARRAY(
        SELECT DISTINCT m FROM (
          SELECT unnest(t.enabled_modules) AS m
          UNION
          SELECT 'daep'::text
          WHERE EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.tenant_id = t.id
              AND up.module_access IN ('daep_only', 'both')
          )
          UNION
          SELECT 'trespass'::text
          WHERE EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.tenant_id = t.id
              AND up.module_access IN ('trespass_only', 'both')
          )
        ) s
      );
    $sql$;
  END IF;
END $$;
