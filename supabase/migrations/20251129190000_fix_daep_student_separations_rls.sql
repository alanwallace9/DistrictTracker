-- Fix daep_student_separations RLS policies
-- The table was using get_current_tenant_id() (session variable)
-- but should use get_my_tenant_id() (JWT-based) like other DAEP tables
--
-- Applied via MCP on 2025-11-29

-- Drop the existing policy
DROP POLICY IF EXISTS "daep_student_separations_tenant_isolation" ON daep_student_separations;

-- SELECT: All DAEP users can view separations from their tenant
CREATE POLICY "Users can view student separations from their tenant"
ON daep_student_separations FOR SELECT
USING (tenant_id = get_my_tenant_id());

-- INSERT: DAEP admins can create separations
CREATE POLICY "DAEP admins can create student separations"
ON daep_student_separations FOR INSERT
WITH CHECK (
  (get_my_role_from_db() = ANY (ARRAY['daep_admin_l1', 'daep_admin_l2', 'district_admin', 'super_admin']))
  AND (tenant_id = get_my_tenant_id())
);

-- UPDATE: DAEP admins can update separations
CREATE POLICY "DAEP admins can update student separations"
ON daep_student_separations FOR UPDATE
USING (
  (get_my_role_from_db() = ANY (ARRAY['daep_admin_l1', 'daep_admin_l2', 'district_admin', 'super_admin']))
  AND (tenant_id = get_my_tenant_id())
)
WITH CHECK (
  (get_my_role_from_db() = ANY (ARRAY['daep_admin_l1', 'daep_admin_l2', 'district_admin', 'super_admin']))
  AND (tenant_id = get_my_tenant_id())
);

-- DELETE: District admins and above can delete separations
CREATE POLICY "District admins can delete student separations"
ON daep_student_separations FOR DELETE
USING (
  (get_my_role_from_db() = ANY (ARRAY['district_admin', 'super_admin']))
  AND (tenant_id = get_my_tenant_id())
);

-- Demo tenant policy for role simulation
CREATE POLICY "Demo tenant allows DAEP role simulation - student_separations"
ON daep_student_separations FOR ALL
USING (
  CASE
    WHEN (tenant_id = 'demo') THEN
      CASE get_effective_role()
        WHEN 'viewer' THEN true
        WHEN 'campus_admin' THEN true
        WHEN 'district_admin' THEN true
        WHEN 'daep_admin_l1' THEN true
        WHEN 'daep_admin_l2' THEN true
        ELSE false
      END
    ELSE false
  END
)
WITH CHECK (
  CASE
    WHEN (tenant_id = 'demo') THEN
      (get_effective_role() = ANY (ARRAY['district_admin', 'daep_admin_l1', 'daep_admin_l2']))
    ELSE false
  END
);
