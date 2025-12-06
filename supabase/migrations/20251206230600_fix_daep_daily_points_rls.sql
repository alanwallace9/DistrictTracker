-- Fix RLS policies on daep_daily_points to use get_my_tenant_id()
-- instead of get_current_tenant_id() for consistency with other DAEP tables
-- Story 3-2: Point Entry Grid

-- Drop existing policies
DROP POLICY IF EXISTS daep_daily_points_tenant_isolation ON daep_daily_points;
DROP POLICY IF EXISTS daep_daily_points_insert_restriction ON daep_daily_points;
DROP POLICY IF EXISTS daep_daily_points_update_restriction ON daep_daily_points;

-- Recreate with get_my_tenant_id() like other DAEP tables
CREATE POLICY daep_daily_points_tenant_isolation ON daep_daily_points
  FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE POLICY daep_daily_points_insert_policy ON daep_daily_points
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND NOT is_readonly_role(get_my_role_from_db())
  );

CREATE POLICY daep_daily_points_update_policy ON daep_daily_points
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND NOT is_readonly_role(get_my_role_from_db())
  );

CREATE POLICY daep_daily_points_delete_policy ON daep_daily_points
  FOR DELETE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role_from_db() IN ('super_admin', 'district_admin', 'daep_admin_l1')
  );
