-- Migration: create_daep_schema
-- Story 1.1: DAEP Database Schema Migration
-- Purpose: Create all DAEP tables with indexes, RLS policies, and triggers
-- Author: Claude Opus 4.5
-- Date: 2025-11-24

-- =====================================================
-- SECTION 1: Extend existing tables
-- =====================================================

-- Add DAEP-specific fields to trespass_records
ALTER TABLE trespass_records
  ADD COLUMN IF NOT EXISTS grade_level INT,
  ADD COLUMN IF NOT EXISTS parent_email TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS special_education BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan_504 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ell_status BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN trespass_records.grade_level IS 'Student grade level (9-12 for high school DAEP)';
COMMENT ON COLUMN trespass_records.parent_email IS 'Parent/guardian email for DAEP notifications';
COMMENT ON COLUMN trespass_records.emergency_contact_name IS 'Emergency contact name for DAEP';
COMMENT ON COLUMN trespass_records.emergency_contact_phone IS 'Emergency contact phone for DAEP';
COMMENT ON COLUMN trespass_records.special_education IS 'Student has IEP (special education)';
COMMENT ON COLUMN trespass_records.plan_504 IS 'Student has 504 plan';
COMMENT ON COLUMN trespass_records.ell_status IS 'English Language Learner status';

-- Add module column to admin_audit_log for filtering by module
ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS module TEXT;

COMMENT ON COLUMN admin_audit_log.module IS 'Module identifier: trespass_tracker or daep_management';

-- Backfill existing audit records as trespass_tracker
UPDATE admin_audit_log
SET module = 'trespass_tracker'
WHERE module IS NULL;

-- =====================================================
-- SECTION 2: Configuration tables (referenced by others)
-- =====================================================

-- DAEP Rooms
CREATE TABLE IF NOT EXISTS daep_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  campus_id TEXT REFERENCES campuses(id),
  room_number TEXT NOT NULL,
  room_name TEXT,
  capacity INT DEFAULT 15,
  active BOOLEAN DEFAULT TRUE,
  building_section TEXT, -- "501-505" or "506-509" for separation logic
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, campus_id, room_number)
);

COMMENT ON TABLE daep_rooms IS 'DAEP classroom configuration';

-- Room staff assignments
CREATE TABLE IF NOT EXISTS daep_room_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  room_id UUID NOT NULL REFERENCES daep_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user_id
  assignment_type TEXT DEFAULT 'homeroom', -- homeroom | rotational
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, room_id, user_id)
);

COMMENT ON TABLE daep_room_staff IS 'Staff-to-room assignments for DAEP';

-- Bell schedules
CREATE TABLE IF NOT EXISTS daep_bell_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  campus_id TEXT REFERENCES campuses(id),
  schedule_name TEXT NOT NULL, -- "Regular Day", "Early Release", "Half Day"
  periods JSONB NOT NULL,
  -- Example: [{ period: "1st", start_time: "08:00", end_time: "09:15" }]
  is_default BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE daep_bell_schedules IS 'Bell schedule configurations for period-based tracking';

-- School calendar
CREATE TABLE IF NOT EXISTS daep_school_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  school_year TEXT NOT NULL, -- "2024-2025"
  date DATE NOT NULL,
  is_school_day BOOLEAN DEFAULT TRUE,
  day_type TEXT, -- "Regular", "Holiday", "Teacher Workday", "Bad Weather"
  bell_schedule_id UUID REFERENCES daep_bell_schedules(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date)
);

COMMENT ON TABLE daep_school_calendar IS 'School calendar for calculating days served';

-- Discipline codes (Texas PEIMS)
CREATE TABLE IF NOT EXISTS daep_discipline_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL, -- PEIMS code
  label TEXT NOT NULL,
  mandatory_placement BOOLEAN DEFAULT FALSE,
  behavior_location TEXT, -- "on_campus", "off_campus", "school_sponsored"
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

COMMENT ON TABLE daep_discipline_codes IS 'Texas PEIMS discipline codes';

-- Behavior categories (district-configurable)
CREATE TABLE IF NOT EXISTS daep_behavior_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  category_type TEXT NOT NULL, -- positive | negative | neutral
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, category_name)
);

COMMENT ON TABLE daep_behavior_categories IS 'Configurable behavior categories for point entries';

-- Point bonus rules
CREATE TABLE IF NOT EXISTS daep_point_bonus_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- "perfect_streak" | "milestone" | "manual"
  trigger_value INT, -- e.g., 5 days for "perfect_streak"
  bonus_points INT NOT NULL,
  badge_name TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE daep_point_bonus_rules IS 'Configurable bonus point rules and milestones';

-- =====================================================
-- SECTION 3: Core DAEP tables
-- =====================================================

-- Placements (one per student incident)
CREATE TABLE IF NOT EXISTS daep_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  school_id TEXT NOT NULL, -- References trespass_records.school_id (student ID)
  incident_number TEXT NOT NULL, -- Unique per placement (e.g., INC-2024-12345)
  placement_date DATE NOT NULL, -- Date placement was approved
  start_date DATE NOT NULL, -- First day at DAEP
  days_assigned INT NOT NULL,
  days_served INT DEFAULT 0,
  days_remaining INT, -- Calculated via trigger
  expected_end_date DATE, -- Calculated based on school calendar
  actual_end_date DATE, -- When student actually completed
  offense_code TEXT NOT NULL,
  placement_reason TEXT NOT NULL,
  mandatory_placement BOOLEAN DEFAULT FALSE,
  home_campus_id TEXT REFERENCES campuses(id),
  assigned_room_id UUID REFERENCES daep_rooms(id),
  status TEXT DEFAULT 'pending', -- pending | active | transition | complete
  transition_requested_date DATE,
  transition_approved_date DATE,
  transition_meeting_date DATE,
  first_day_back_date DATE,
  rollover_student BOOLEAN DEFAULT FALSE,
  rollover_decision TEXT, -- continue | reset | null
  no_show BOOLEAN DEFAULT FALSE,
  assessment_90day_required BOOLEAN DEFAULT FALSE,
  assessment_90day_date DATE,
  assessment_90day_scores JSONB, -- { math: 85, reading: 78 }
  assessment_120day_date DATE,
  intake_notes TEXT,
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, school_id, incident_number),
  CHECK (school_id IS NOT NULL AND school_id != '')
);

COMMENT ON TABLE daep_placements IS 'DAEP placement records linked to student incidents';
COMMENT ON COLUMN daep_placements.school_id IS 'Student ID from trespass_records.school_id';
COMMENT ON COLUMN daep_placements.incident_number IS 'SIS incident number for linking';

-- Daily points (per student, per period, per day)
CREATE TABLE IF NOT EXISTS daep_daily_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  period TEXT NOT NULL, -- "1st", "2nd", "3rd", etc.
  points_earned INT NOT NULL CHECK (points_earned >= 0 AND points_earned <= 10),
  student_action TEXT, -- "On Task", "Helped Peer", "Talk Back", etc.
  teacher_action TEXT, -- "Redirected", "Called Home", "Conference", etc.
  notes TEXT,
  entered_by TEXT NOT NULL, -- Clerk user_id
  approved_by TEXT, -- Clerk user_id (if approval required)
  approval_status TEXT DEFAULT 'approved', -- pending | approved | rejected
  approved_at TIMESTAMPTZ,
  public BOOLEAN DEFAULT TRUE, -- False if pending approval or rejected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, placement_id, date, period)
);

COMMENT ON TABLE daep_daily_points IS 'Daily point tracking per student/period/day';

-- Attendance (per student, per period, per day)
CREATE TABLE IF NOT EXISTS daep_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  period TEXT NOT NULL,
  status TEXT NOT NULL, -- P (Present), A (Absent), T (Tardy), ED (Early Dismissal)
  tardy_time TIME,
  early_dismiss_time TIME,
  excused BOOLEAN DEFAULT FALSE,
  excuse_reason TEXT,
  counts_toward_days_served BOOLEAN DEFAULT TRUE, -- False for unexcused absences
  notes TEXT,
  entered_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, placement_id, date, period)
);

COMMENT ON TABLE daep_attendance IS 'Attendance tracking per student/period/day';

-- Behavior notes (detailed, separate from point entries)
CREATE TABLE IF NOT EXISTS daep_behavior_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  category TEXT, -- "Positive", "Negative", "Neutral", etc.
  description TEXT NOT NULL,
  action_taken TEXT,
  staff_member TEXT NOT NULL, -- Clerk user_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE daep_behavior_notes IS 'Detailed behavior incident notes';

-- =====================================================
-- SECTION 4: Student separation & notifications
-- =====================================================

-- Student separation flags
CREATE TABLE IF NOT EXISTS daep_student_separations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  student_a_id TEXT NOT NULL, -- References trespass_records.school_id
  student_b_id TEXT NOT NULL, -- References trespass_records.school_id
  reason TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(tenant_id, student_a_id, student_b_id),
  CHECK (student_a_id < student_b_id) -- Prevent duplicate pairs (A,B) and (B,A)
);

COMMENT ON TABLE daep_student_separations IS 'Students who must be kept in different rooms/sections';

-- Notifications (in-app bell icon)
CREATE TABLE IF NOT EXISTS daep_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- Clerk user_id (recipient)
  notification_type TEXT NOT NULL, -- "return_reminder" | "absent_streak" | "below_threshold" | "approval_pending"
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_school_id TEXT, -- References trespass_records.school_id
  related_placement_id UUID REFERENCES daep_placements(id),
  action_url TEXT, -- Link to relevant page
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE daep_notifications IS 'In-app notification queue for DAEP alerts';

-- =====================================================
-- SECTION 5: CSV Reconciliation tables
-- =====================================================

-- CSV field mappings (one-time setup per district)
CREATE TABLE IF NOT EXISTS daep_csv_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  sis_name TEXT NOT NULL, -- e.g., "Skyward", "Focus", "PowerSchool"
  field_mappings JSONB NOT NULL,
  -- Example: { "student_id": "StudentNumber", "first_name": "FirstName" }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, sis_name)
);

COMMENT ON TABLE daep_csv_field_mappings IS 'SIS-specific CSV column mappings per tenant';

-- Reconciliation sessions
CREATE TABLE IF NOT EXISTS daep_reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  uploaded_by TEXT NOT NULL, -- Clerk user_id
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  total_records INT NOT NULL,
  matched_count INT DEFAULT 0,
  discrepancy_count INT DEFAULT 0,
  new_in_sis_count INT DEFAULT 0,
  missing_from_sis_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending | in_review | completed
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE daep_reconciliation_sessions IS 'CSV reconciliation upload sessions';

-- Individual discrepancies
CREATE TABLE IF NOT EXISTS daep_reconciliation_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES daep_reconciliation_sessions(id) ON DELETE CASCADE,
  student_id TEXT, -- May be null for "new in SIS" records
  discrepancy_type TEXT NOT NULL, -- 'field_conflict' | 'new_in_sis' | 'missing_from_sis'
  sis_data JSONB NOT NULL, -- Full SIS record
  daep_data JSONB, -- Current DAEP record (null if new)
  conflicts JSONB, -- Array of conflicting fields
  resolution TEXT, -- 'accept_sis' | 'keep_daep' | 'pending'
  resolution_note TEXT, -- Admin's explanation
  resolved_by TEXT, -- Clerk user_id
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE daep_reconciliation_discrepancies IS 'Individual discrepancies found during reconciliation';

-- Reconciliation audit trail
CREATE TABLE IF NOT EXISTS daep_reconciliation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES daep_reconciliation_sessions(id),
  discrepancy_id UUID REFERENCES daep_reconciliation_discrepancies(id),
  action TEXT NOT NULL, -- 'session_started' | 'discrepancy_resolved' | 'session_completed'
  actor_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE daep_reconciliation_audit IS 'Audit trail for CSV reconciliation actions';

-- =====================================================
-- SECTION 6: Indexes for performance
-- =====================================================

-- daep_rooms indexes
CREATE INDEX IF NOT EXISTS idx_daep_rooms_tenant ON daep_rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_rooms_campus ON daep_rooms(campus_id);

-- daep_bell_schedules indexes
CREATE INDEX IF NOT EXISTS idx_daep_bell_schedules_tenant ON daep_bell_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_bell_schedules_campus ON daep_bell_schedules(campus_id);

-- daep_school_calendar indexes
CREATE INDEX IF NOT EXISTS idx_daep_school_calendar_tenant ON daep_school_calendar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_school_calendar_date ON daep_school_calendar(date);
CREATE INDEX IF NOT EXISTS idx_daep_school_calendar_year ON daep_school_calendar(school_year);

-- daep_discipline_codes indexes
CREATE INDEX IF NOT EXISTS idx_daep_discipline_codes_tenant ON daep_discipline_codes(tenant_id);

-- daep_placements indexes
CREATE INDEX IF NOT EXISTS idx_daep_placements_tenant ON daep_placements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_placements_student ON daep_placements(tenant_id, school_id);
CREATE INDEX IF NOT EXISTS idx_daep_placements_incident ON daep_placements(tenant_id, incident_number);
CREATE INDEX IF NOT EXISTS idx_daep_placements_status ON daep_placements(status);
CREATE INDEX IF NOT EXISTS idx_daep_placements_dates ON daep_placements(start_date, expected_end_date);

-- daep_daily_points indexes
CREATE INDEX IF NOT EXISTS idx_daep_daily_points_tenant ON daep_daily_points(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_daily_points_placement ON daep_daily_points(placement_id);
CREATE INDEX IF NOT EXISTS idx_daep_daily_points_date ON daep_daily_points(date);
CREATE INDEX IF NOT EXISTS idx_daep_daily_points_approval ON daep_daily_points(approval_status);

-- daep_attendance indexes
CREATE INDEX IF NOT EXISTS idx_daep_attendance_tenant ON daep_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_attendance_placement ON daep_attendance(placement_id);
CREATE INDEX IF NOT EXISTS idx_daep_attendance_date ON daep_attendance(date);
CREATE INDEX IF NOT EXISTS idx_daep_attendance_status ON daep_attendance(status);

-- daep_behavior_notes indexes
CREATE INDEX IF NOT EXISTS idx_daep_behavior_notes_tenant ON daep_behavior_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_behavior_notes_placement ON daep_behavior_notes(placement_id);
CREATE INDEX IF NOT EXISTS idx_daep_behavior_notes_date ON daep_behavior_notes(date);

-- daep_student_separations indexes
CREATE INDEX IF NOT EXISTS idx_daep_separations_tenant ON daep_student_separations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_separations_students ON daep_student_separations(student_a_id, student_b_id);

-- daep_notifications indexes
CREATE INDEX IF NOT EXISTS idx_daep_notifications_tenant ON daep_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_notifications_user ON daep_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_daep_notifications_read ON daep_notifications(read);
CREATE INDEX IF NOT EXISTS idx_daep_notifications_created ON daep_notifications(created_at DESC);

-- daep_reconciliation_sessions indexes
CREATE INDEX IF NOT EXISTS idx_daep_recon_sessions_tenant ON daep_reconciliation_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_recon_sessions_status ON daep_reconciliation_sessions(status);

-- =====================================================
-- SECTION 7: Enable Row-Level Security
-- =====================================================

ALTER TABLE daep_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_room_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_bell_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_school_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_discipline_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_behavior_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_point_bonus_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_daily_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_student_separations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_csv_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE daep_reconciliation_audit ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 8: RLS Policies (tenant isolation)
-- =====================================================

-- Helper function to get current tenant (reuse if exists)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant', true), '');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- daep_rooms policies
CREATE POLICY "daep_rooms_tenant_isolation" ON daep_rooms
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_room_staff policies
CREATE POLICY "daep_room_staff_tenant_isolation" ON daep_room_staff
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_bell_schedules policies
CREATE POLICY "daep_bell_schedules_tenant_isolation" ON daep_bell_schedules
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_school_calendar policies
CREATE POLICY "daep_school_calendar_tenant_isolation" ON daep_school_calendar
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_discipline_codes policies
CREATE POLICY "daep_discipline_codes_tenant_isolation" ON daep_discipline_codes
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_behavior_categories policies
CREATE POLICY "daep_behavior_categories_tenant_isolation" ON daep_behavior_categories
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_point_bonus_rules policies
CREATE POLICY "daep_point_bonus_rules_tenant_isolation" ON daep_point_bonus_rules
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_placements policies
CREATE POLICY "daep_placements_tenant_isolation" ON daep_placements
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_daily_points policies
CREATE POLICY "daep_daily_points_tenant_isolation" ON daep_daily_points
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_attendance policies
CREATE POLICY "daep_attendance_tenant_isolation" ON daep_attendance
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_behavior_notes policies
CREATE POLICY "daep_behavior_notes_tenant_isolation" ON daep_behavior_notes
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_student_separations policies
CREATE POLICY "daep_student_separations_tenant_isolation" ON daep_student_separations
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_notifications policies (user-specific)
CREATE POLICY "daep_notifications_tenant_isolation" ON daep_notifications
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_csv_field_mappings policies
CREATE POLICY "daep_csv_field_mappings_tenant_isolation" ON daep_csv_field_mappings
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_reconciliation_sessions policies
CREATE POLICY "daep_reconciliation_sessions_tenant_isolation" ON daep_reconciliation_sessions
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- daep_reconciliation_discrepancies policies (via session)
CREATE POLICY "daep_reconciliation_discrepancies_tenant_isolation" ON daep_reconciliation_discrepancies
  FOR ALL USING (
    session_id IN (
      SELECT id FROM daep_reconciliation_sessions
      WHERE tenant_id = get_current_tenant_id()
    )
  );

-- daep_reconciliation_audit policies (via session)
CREATE POLICY "daep_reconciliation_audit_tenant_isolation" ON daep_reconciliation_audit
  FOR ALL USING (
    session_id IN (
      SELECT id FROM daep_reconciliation_sessions
      WHERE tenant_id = get_current_tenant_id()
    )
  );

-- =====================================================
-- SECTION 9: Triggers for updated_at and calculations
-- =====================================================

-- Generic updated_at trigger function (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to tables with updated_at column
CREATE TRIGGER update_daep_rooms_updated_at
  BEFORE UPDATE ON daep_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daep_bell_schedules_updated_at
  BEFORE UPDATE ON daep_bell_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daep_discipline_codes_updated_at
  BEFORE UPDATE ON daep_discipline_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daep_placements_updated_at
  BEFORE UPDATE ON daep_placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daep_daily_points_updated_at
  BEFORE UPDATE ON daep_daily_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daep_attendance_updated_at
  BEFORE UPDATE ON daep_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daep_behavior_notes_updated_at
  BEFORE UPDATE ON daep_behavior_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daep_csv_field_mappings_updated_at
  BEFORE UPDATE ON daep_csv_field_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate days_remaining when placement updated
CREATE OR REPLACE FUNCTION calculate_days_remaining()
RETURNS TRIGGER AS $$
BEGIN
  NEW.days_remaining = NEW.days_assigned - NEW.days_served;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_placement_days
  BEFORE INSERT OR UPDATE ON daep_placements
  FOR EACH ROW EXECUTE FUNCTION calculate_days_remaining();

-- Auto-flag 90-day assessment requirement
CREATE OR REPLACE FUNCTION check_90day_assessment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.days_assigned > 90 THEN
    NEW.assessment_90day_required = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flag_90day_assessment
  BEFORE INSERT OR UPDATE ON daep_placements
  FOR EACH ROW EXECUTE FUNCTION check_90day_assessment();

-- =====================================================
-- SECTION 10: Summary comments
-- =====================================================

COMMENT ON SCHEMA public IS 'DAEP schema added 2025-11-24. Tables: 17 new DAEP tables, extended trespass_records and admin_audit_log';
