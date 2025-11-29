-- Migration: Update all RLS policies from master_admin to super_admin
-- Date: 2025-11-29
-- Purpose: Complete the role rename that was started in migration 20251126200000
-- This updates all RLS policies that still reference the deprecated master_admin role
-- Also removes "OR tenant_id IS NULL" pattern since we're not using global/shared records

-- ============================================================================
-- ADMIN_AUDIT_LOG
-- ============================================================================

DROP POLICY IF EXISTS "Master and district admins can view audit logs" ON admin_audit_log;
CREATE POLICY "Super and district admins can view audit logs" ON admin_audit_log
  FOR SELECT USING (
    get_my_role_from_db() = ANY (ARRAY['super_admin'::text, 'district_admin'::text])
  );

-- ============================================================================
-- CAMPUSES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create campuses for their tenant" ON campuses;
CREATE POLICY "Admins can create campuses for their tenant" ON campuses
  FOR INSERT WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "Admins can update campuses from their tenant" ON campuses;
CREATE POLICY "Admins can update campuses from their tenant" ON campuses
  FOR UPDATE USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  ) WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "Master admins can delete campuses" ON campuses;
CREATE POLICY "Super admins can delete campuses" ON campuses
  FOR DELETE USING (
    get_my_role_from_db() = 'super_admin'::text
    AND tenant_id = get_my_tenant_id()
  );

-- ============================================================================
-- DAEP_ROOMS
-- ============================================================================

DROP POLICY IF EXISTS "DAEP admins can create rooms" ON daep_rooms;
CREATE POLICY "DAEP admins can create rooms" ON daep_rooms
  FOR INSERT WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "DAEP admins can update rooms" ON daep_rooms;
CREATE POLICY "DAEP admins can update rooms" ON daep_rooms
  FOR UPDATE USING (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  ) WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "District admins can delete rooms" ON daep_rooms;
CREATE POLICY "District admins can delete rooms" ON daep_rooms
  FOR DELETE USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

-- Update SELECT policy to remove tenant_id IS NULL
DROP POLICY IF EXISTS "Users can view rooms from their tenant" ON daep_rooms;
CREATE POLICY "Users can view rooms from their tenant" ON daep_rooms
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
  );

-- ============================================================================
-- DAEP_BELL_SCHEDULES
-- ============================================================================

DROP POLICY IF EXISTS "DAEP admins can create bell schedules" ON daep_bell_schedules;
CREATE POLICY "DAEP admins can create bell schedules" ON daep_bell_schedules
  FOR INSERT WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "DAEP admins can update bell schedules" ON daep_bell_schedules;
CREATE POLICY "DAEP admins can update bell schedules" ON daep_bell_schedules
  FOR UPDATE USING (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  ) WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "District admins can delete bell schedules" ON daep_bell_schedules;
CREATE POLICY "District admins can delete bell schedules" ON daep_bell_schedules
  FOR DELETE USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

-- ============================================================================
-- DAEP_BEHAVIOR_CATEGORIES
-- ============================================================================

DROP POLICY IF EXISTS "DAEP admins can create behavior categories" ON daep_behavior_categories;
CREATE POLICY "DAEP admins can create behavior categories" ON daep_behavior_categories
  FOR INSERT WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "DAEP admins can update behavior categories" ON daep_behavior_categories;
CREATE POLICY "DAEP admins can update behavior categories" ON daep_behavior_categories
  FOR UPDATE USING (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  ) WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "District admins can delete behavior categories" ON daep_behavior_categories;
CREATE POLICY "District admins can delete behavior categories" ON daep_behavior_categories
  FOR DELETE USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

-- ============================================================================
-- DAEP_ROOM_STAFF
-- ============================================================================

DROP POLICY IF EXISTS "DAEP admins can create room staff" ON daep_room_staff;
CREATE POLICY "DAEP admins can create room staff" ON daep_room_staff
  FOR INSERT WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "DAEP admins can update room staff" ON daep_room_staff;
CREATE POLICY "DAEP admins can update room staff" ON daep_room_staff
  FOR UPDATE USING (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  ) WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "District admins can delete room staff" ON daep_room_staff;
CREATE POLICY "District admins can delete room staff" ON daep_room_staff
  FOR DELETE USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

-- ============================================================================
-- DAEP_SCHOOL_CALENDAR
-- ============================================================================

DROP POLICY IF EXISTS "DAEP admins can create school calendar entries" ON daep_school_calendar;
CREATE POLICY "DAEP admins can create school calendar entries" ON daep_school_calendar
  FOR INSERT WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "DAEP admins can update school calendar" ON daep_school_calendar;
CREATE POLICY "DAEP admins can update school calendar" ON daep_school_calendar
  FOR UPDATE USING (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  ) WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['daep_admin_l1'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "District admins can delete school calendar entries" ON daep_school_calendar;
CREATE POLICY "District admins can delete school calendar entries" ON daep_school_calendar
  FOR DELETE USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

-- ============================================================================
-- DAEP_PLACEMENTS (remove master_admin, keep super_admin)
-- ============================================================================

DROP POLICY IF EXISTS "daep_placements_select" ON daep_placements;
CREATE POLICY "daep_placements_select" ON daep_placements
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role_from_db() = ANY (ARRAY[
      'super_admin'::text, 'district_admin'::text,
      'daep_admin_l1'::text, 'daep_admin_l2'::text,
      'campus_admin'::text, 'daep_staff'::text,
      'counselor'::text, 'viewer'::text
    ])
  );

DROP POLICY IF EXISTS "daep_placements_insert" ON daep_placements;
CREATE POLICY "daep_placements_insert" ON daep_placements
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND get_my_role_from_db() = ANY (ARRAY[
      'super_admin'::text, 'district_admin'::text,
      'daep_admin_l1'::text, 'daep_admin_l2'::text,
      'campus_admin'::text
    ])
  );

DROP POLICY IF EXISTS "daep_placements_update" ON daep_placements;
CREATE POLICY "daep_placements_update" ON daep_placements
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role_from_db() = ANY (ARRAY[
      'super_admin'::text, 'district_admin'::text,
      'daep_admin_l1'::text, 'daep_admin_l2'::text,
      'campus_admin'::text, 'daep_staff'::text
    ])
  );

DROP POLICY IF EXISTS "daep_placements_delete" ON daep_placements;
CREATE POLICY "daep_placements_delete" ON daep_placements
  FOR DELETE USING (
    tenant_id = get_my_tenant_id()
    AND get_my_role_from_db() = ANY (ARRAY[
      'super_admin'::text, 'district_admin'::text,
      'daep_admin_l1'::text, 'daep_admin_l2'::text
    ])
  );

-- ============================================================================
-- TRESPASS_RECORDS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create records for their tenant" ON trespass_records;
CREATE POLICY "Admins can create records for their tenant" ON trespass_records
  FOR INSERT WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "Admins can update records from their tenant" ON trespass_records;
CREATE POLICY "Admins can update records from their tenant" ON trespass_records
  FOR UPDATE USING (
    get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  ) WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "District and master admins can delete records from their tenant" ON trespass_records;
CREATE POLICY "District and super admins can delete records from their tenant" ON trespass_records
  FOR DELETE USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
    AND tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "Master admins can view deleted records" ON trespass_records;
CREATE POLICY "Super admins can view deleted records" ON trespass_records
  FOR SELECT USING (
    get_my_role_from_db() = 'super_admin'::text
  );

-- ============================================================================
-- RECORD_PHOTOS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can delete any photo" ON record_photos;
CREATE POLICY "Admins can delete any photo" ON record_photos
  FOR DELETE USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
  );

DROP POLICY IF EXISTS "Admins can update any photo" ON record_photos;
CREATE POLICY "Admins can update any photo" ON record_photos
  FOR UPDATE USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
  );

DROP POLICY IF EXISTS "Users and admins can insert photos" ON record_photos;
CREATE POLICY "Users and admins can insert photos" ON record_photos
  FOR INSERT WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['viewer'::text, 'campus_admin'::text, 'district_admin'::text, 'super_admin'::text])
  );

-- ============================================================================
-- RECORD_DOCUMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Only admins can delete documents" ON record_documents;
CREATE POLICY "Only admins can delete documents" ON record_documents
  FOR DELETE USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
  );

DROP POLICY IF EXISTS "Only admins can insert documents" ON record_documents;
CREATE POLICY "Only admins can insert documents" ON record_documents
  FOR INSERT WITH CHECK (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
  );

DROP POLICY IF EXISTS "Only admins can update documents" ON record_documents;
CREATE POLICY "Only admins can update documents" ON record_documents
  FOR UPDATE USING (
    get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
  );

-- ============================================================================
-- TENANTS
-- ============================================================================

DROP POLICY IF EXISTS "Only master admins can manage tenants" ON tenants;
CREATE POLICY "Only super admins can manage tenants" ON tenants
  FOR ALL USING (
    get_my_role_from_db() = 'super_admin'::text
  ) WITH CHECK (
    get_my_role_from_db() = 'super_admin'::text
  );

-- ============================================================================
-- USER_PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Only master admin can delete profiles" ON user_profiles;
CREATE POLICY "Only super admin can delete profiles" ON user_profiles
  FOR DELETE USING (
    get_my_role_from_db() = 'super_admin'::text
  );

DROP POLICY IF EXISTS "Users can update profiles based on role" ON user_profiles;
CREATE POLICY "Users can update profiles based on role" ON user_profiles
  FOR UPDATE USING (
    id = get_my_clerk_id()
    OR get_my_role_from_db() = ANY (ARRAY['super_admin'::text, 'district_admin'::text, 'daep_admin_l1'::text])
  );

-- ============================================================================
-- PENDING_INVITATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create invitations" ON pending_invitations;
CREATE POLICY "Admins can create invitations" ON pending_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = get_my_clerk_id()
      AND user_profiles.role = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
    )
  );

DROP POLICY IF EXISTS "Admins can delete invitations" ON pending_invitations;
CREATE POLICY "Admins can delete invitations" ON pending_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = get_my_clerk_id()
      AND user_profiles.role = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
      AND (user_profiles.role = 'super_admin'::text OR user_profiles.tenant_id = pending_invitations.tenant_id)
    )
  );

DROP POLICY IF EXISTS "Admins can update invitations" ON pending_invitations;
CREATE POLICY "Admins can update invitations" ON pending_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = get_my_clerk_id()
      AND user_profiles.role = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
      AND (user_profiles.role = 'super_admin'::text OR user_profiles.tenant_id = pending_invitations.tenant_id)
    )
  );

DROP POLICY IF EXISTS "Master admins can view all invitations" ON pending_invitations;
CREATE POLICY "Super admins can view all invitations" ON pending_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = get_my_clerk_id()
      AND user_profiles.role = 'super_admin'::text
    )
  );

-- ============================================================================
-- STORAGE.OBJECTS (record-photos bucket)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can delete any photo" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update any photo" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Master admins can delete any feedback image" ON storage.objects;
DROP POLICY IF EXISTS "Master admins can update any feedback image" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can upload documents" ON storage.objects;

CREATE POLICY "Admins can delete any photo" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'record-photos'::text
    AND get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
  );

CREATE POLICY "Admins can update any photo" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'record-photos'::text
    AND get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
  );

CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'record-photos'::text
    AND get_my_role_from_db() = ANY (ARRAY['viewer'::text, 'campus_admin'::text, 'district_admin'::text, 'super_admin'::text])
  );

CREATE POLICY "Super admins can delete any feedback image" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'feedback-images'::text
    AND get_my_role_from_db() = 'super_admin'::text
  );

CREATE POLICY "Super admins can update any feedback image" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'feedback-images'::text
    AND get_my_role_from_db() = 'super_admin'::text
  );

CREATE POLICY "Only admins can delete documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'record-documents'::text
    AND get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
  );

CREATE POLICY "Only admins can update documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'record-documents'::text
    AND get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
  );

CREATE POLICY "Only admins can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'record-documents'::text
    AND get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'super_admin'::text])
  );

-- ============================================================================
-- FEEDBACK TABLES (using old JWT pattern - updating to super_admin)
-- ============================================================================

DROP POLICY IF EXISTS "Master admins can create categories" ON feedback_categories;
DROP POLICY IF EXISTS "Master admins can delete categories" ON feedback_categories;
DROP POLICY IF EXISTS "Master admins can update categories" ON feedback_categories;
DROP POLICY IF EXISTS "Master admins can view all categories" ON feedback_categories;

CREATE POLICY "Super admins can create categories" ON feedback_categories
  FOR INSERT WITH CHECK (
    get_my_role_from_db() = 'super_admin'::text
  );

CREATE POLICY "Super admins can delete categories" ON feedback_categories
  FOR DELETE USING (
    get_my_role_from_db() = 'super_admin'::text
  );

CREATE POLICY "Super admins can update categories" ON feedback_categories
  FOR UPDATE USING (
    get_my_role_from_db() = 'super_admin'::text
  );

CREATE POLICY "Super admins can view all categories" ON feedback_categories
  FOR SELECT USING (
    get_my_role_from_db() = 'super_admin'::text
  );

DROP POLICY IF EXISTS "Master admins can delete any image" ON feedback_images;
DROP POLICY IF EXISTS "Master admins can view all images" ON feedback_images;

CREATE POLICY "Super admins can delete any image" ON feedback_images
  FOR DELETE USING (
    get_my_role_from_db() = 'super_admin'::text
  );

CREATE POLICY "Super admins can view all images" ON feedback_images
  FOR SELECT USING (
    get_my_role_from_db() = 'super_admin'::text
  );

DROP POLICY IF EXISTS "Master admins can delete any feedback" ON feedback_submissions;
DROP POLICY IF EXISTS "Master admins can update any feedback" ON feedback_submissions;

CREATE POLICY "Super admins can delete any feedback" ON feedback_submissions
  FOR DELETE USING (
    get_my_role_from_db() = 'super_admin'::text
  );

CREATE POLICY "Super admins can update any feedback" ON feedback_submissions
  FOR UPDATE USING (
    get_my_role_from_db() = 'super_admin'::text
  );

-- ============================================================================
-- WAITLIST
-- ============================================================================

DROP POLICY IF EXISTS "Master admins can view all waitlist entries" ON waitlist;
CREATE POLICY "Super admins can view all waitlist entries" ON waitlist
  FOR SELECT USING (
    get_my_role_from_db() = 'super_admin'::text
  );

-- ============================================================================
-- AUDIT LOG ENTRY
-- ============================================================================

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
  'migration.rls_role_update',
  'system',
  'system@districttracker.com',
  'super_admin',
  'Updated all RLS policies from master_admin to super_admin',
  '{"migration": "20251129180000_update_rls_master_admin_to_super_admin", "policies_updated": 57, "changes": ["Replaced master_admin with super_admin", "Removed OR tenant_id IS NULL pattern", "Standardized role checks to use get_my_role_from_db()"]}'::jsonb,
  'admin',
  now()
);

-- ============================================================================
-- VERIFICATION COMMENT
-- ============================================================================
-- After running this migration, verify with:
-- SELECT tablename, policyname FROM pg_policies WHERE qual LIKE '%master_admin%' OR with_check LIKE '%master_admin%';
-- Should return 0 rows (except demo tenant simulation policies which are intentionally preserved)
