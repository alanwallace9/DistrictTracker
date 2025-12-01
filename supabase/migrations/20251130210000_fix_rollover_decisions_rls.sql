-- Migration: fix_rollover_decisions_rls
-- Story 2.11: Fix RLS to match daep_placements pattern
-- Purpose: Change from tenant-only to role-based RLS (same as daep_placements)
-- Author: Claude Opus 4.5
-- Date: 2025-11-30

-- =====================================================
-- CONTEXT
-- =====================================================
-- Previous migration (20251130200000) created tenant-only RLS:
--   "rollover_decisions_tenant_isolation" FOR ALL USING (tenant_id = get_current_tenant_id())
--
-- This was WRONG - it allows any authenticated user in the tenant to see all decisions.
-- Correct pattern (matching daep_placements) uses role-based policies:
--   - SELECT: Only admin roles can view
--   - INSERT: Only admin roles can create
--   - UPDATE: Only admin roles can update
--   - DELETE: Only admin roles can delete
-- =====================================================

-- =====================================================
-- SECTION 1: Drop existing tenant-only policy
-- =====================================================

DROP POLICY IF EXISTS "rollover_decisions_tenant_isolation" ON daep_rollover_decisions;

-- =====================================================
-- SECTION 2: Create role-based policies (matching daep_placements)
-- =====================================================

-- SELECT: Same roles as daep_placements_select
CREATE POLICY "rollover_decisions_select" ON daep_rollover_decisions
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

-- INSERT: Same roles as daep_placements_insert (admin roles only)
CREATE POLICY "rollover_decisions_insert" ON daep_rollover_decisions
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

-- UPDATE: Same roles as daep_placements_update
CREATE POLICY "rollover_decisions_update" ON daep_rollover_decisions
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

-- DELETE: Same roles as daep_placements_delete (most restrictive)
CREATE POLICY "rollover_decisions_delete" ON daep_rollover_decisions
  FOR DELETE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role_from_db() = ANY(ARRAY[
      'super_admin',
      'district_admin',
      'daep_admin_l1',
      'daep_admin_l2'
    ])
  );

-- =====================================================
-- SECTION 3: Demo tenant policy (matching daep_placements)
-- =====================================================

CREATE POLICY "rollover_decisions_demo_tenant" ON daep_rollover_decisions
  FOR ALL USING (
    CASE
      WHEN (tenant_id = 'demo') THEN
        CASE get_effective_role()
          WHEN 'viewer' THEN true
          WHEN 'campus_admin' THEN true
          WHEN 'district_admin' THEN true
          WHEN 'daep_admin_l1' THEN true
          WHEN 'daep_admin_l2' THEN true
          WHEN 'daep_staff' THEN true
          ELSE false
        END
      ELSE false
    END
  );

-- =====================================================
-- SECTION 4: Comments
-- =====================================================

COMMENT ON POLICY "rollover_decisions_select" ON daep_rollover_decisions IS
  'Role-based SELECT: Only admin roles can view rollover decisions (matches daep_placements)';

COMMENT ON POLICY "rollover_decisions_insert" ON daep_rollover_decisions IS
  'Role-based INSERT: Only admin roles can record decisions (matches daep_placements)';

COMMENT ON POLICY "rollover_decisions_update" ON daep_rollover_decisions IS
  'Role-based UPDATE: Only admin roles can modify decisions (matches daep_placements)';

COMMENT ON POLICY "rollover_decisions_delete" ON daep_rollover_decisions IS
  'Role-based DELETE: Only highest admin roles can delete decisions (matches daep_placements)';

COMMENT ON POLICY "rollover_decisions_demo_tenant" ON daep_rollover_decisions IS
  'Demo tenant policy: Allows role simulation for demo purposes (matches daep_placements)';
