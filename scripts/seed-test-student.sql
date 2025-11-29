-- Seed Test Student for DAEP Testing
-- Run this via Supabase MCP or SQL Editor
-- Schema notes:
--   - tenant_id and campus_id are TEXT (not UUID)
--   - daep_rooms.id is UUID
--   - trespass_records.user_id is required (NOT NULL)
--   - No unique constraint on (tenant_id, school_id) - use delete+insert pattern

DO $$
DECLARE
  v_tenant_id TEXT;
  v_campus_id TEXT;
  v_room_id UUID;
BEGIN
  -- Get first tenant (tenant_id is TEXT, e.g. 'birdville')
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found. Please create a tenant first.';
  END IF;

  RAISE NOTICE 'Using tenant_id: %', v_tenant_id;

  -- Get an existing campus (campus.id is TEXT, e.g. '101')
  SELECT id INTO v_campus_id FROM campuses WHERE tenant_id = v_tenant_id LIMIT 1;

  IF v_campus_id IS NULL THEN
    -- Create campus with TEXT id
    INSERT INTO campuses (tenant_id, id, name, status, is_daep)
    VALUES (v_tenant_id, 'LHS001', 'Lincoln High School', 'active', false)
    RETURNING id INTO v_campus_id;
  END IF;

  -- Get or create a DAEP room (room.id is UUID)
  SELECT id INTO v_room_id FROM daep_rooms WHERE tenant_id = v_tenant_id LIMIT 1;

  IF v_room_id IS NULL THEN
    INSERT INTO daep_rooms (tenant_id, campus_id, room_number, room_name, capacity, active)
    VALUES (v_tenant_id, v_campus_id, '101', 'Main DAEP Room', 25, true)
    RETURNING id INTO v_room_id;
  END IF;

  -- Delete existing test data first (no unique constraint on school_id)
  DELETE FROM daep_placements WHERE tenant_id = v_tenant_id AND school_id = 'TEST001';
  DELETE FROM trespass_records WHERE tenant_id = v_tenant_id AND school_id = 'TEST001';

  -- Insert test student into trespass_records
  -- Note: user_id is required (NOT NULL), using 'temp-user-id' for test data
  -- Note: Uses actual column names from schema (no middle_name, address fields, etc.)
  INSERT INTO trespass_records (
    tenant_id,
    user_id,
    school_id,
    first_name,
    last_name,
    aka,
    date_of_birth,
    grade_level,
    current_school,
    campus_id,
    guardian_first_name,
    guardian_last_name,
    guardian_phone,
    parent_email,
    emergency_contact_name,
    emergency_contact_phone,
    is_current_student,
    is_daep,
    special_education,
    plan_504,
    ell_status,
    status,
    expiration_date
  )
  VALUES (
    v_tenant_id,
    'temp-user-id',  -- Required field
    'TEST001',
    'Marcus',
    'Johnson',
    'MJ',            -- aka field instead of middle_name
    '2008-05-15',
    10,
    'Lincoln High School',
    v_campus_id,
    'Patricia',      -- guardian_first_name
    'Johnson',       -- guardian_last_name
    '(555) 123-4567',
    'pjohnson@email.com',
    'Robert Johnson',
    '(555) 987-6543',
    true,            -- is_current_student (not is_student)
    true,            -- is_daep
    true,            -- special_education (IEP)
    false,           -- plan_504
    false,           -- ell_status
    'active',
    NOW() + INTERVAL '1 year'
  );

  -- Insert a discipline code if not exists
  INSERT INTO daep_discipline_codes (tenant_id, code, label, mandatory_placement, active)
  VALUES (v_tenant_id, '37A', 'Controlled Substance - Possession', true, true)
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Insert DAEP placement for test student
  INSERT INTO daep_placements (
    tenant_id,
    school_id,
    incident_number,
    placement_date,
    start_date,
    days_assigned,
    days_served,
    days_remaining,
    expected_end_date,
    status,
    offense_code,
    placement_reason,
    mandatory_placement,
    home_campus_id,
    assigned_room_id,
    rollover_student,
    no_show,
    assessment_90day_required,
    intake_notes
  )
  VALUES (
    v_tenant_id,
    'TEST001',
    'INC-2024-001',
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE - INTERVAL '7 days',
    45,
    7,
    38,
    CURRENT_DATE + INTERVAL '38 days',
    'active',
    '37A',
    'Violation of controlled substance policy - possession on campus',
    true,
    v_campus_id,
    v_room_id,
    false,
    false,
    true,  -- 90-day assessment required
    'Student transferred from Lincoln HS following disciplinary hearing.'
  );

  RAISE NOTICE 'Test student TEST001 (Marcus Johnson) created successfully!';
  RAISE NOTICE 'Navigate to /daep/students/TEST001 to view the profile';

END $$;

-- Verify the data was inserted
SELECT
  tr.school_id,
  tr.first_name,
  tr.last_name,
  tr.grade_level,
  dp.status as placement_status,
  dp.days_served,
  dp.days_remaining
FROM trespass_records tr
LEFT JOIN daep_placements dp ON dp.school_id = tr.school_id AND dp.tenant_id = tr.tenant_id
WHERE tr.school_id = 'TEST001';
