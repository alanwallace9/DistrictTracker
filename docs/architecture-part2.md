# Architecture - DAEPManagement Module (Part 2)

> **Document Split:** This is Part 2 covering Data Architecture, Analytics, and Project Structure.
> See [architecture-part1.md](./architecture-part1.md) for Executive Summary, Patterns, Decisions, and CSV Reconciliation.

---

## Data Architecture

### Integration with TrespassTracker Infrastructure

**CRITICAL DESIGN PRINCIPLE:** DAEP module builds on existing TrespassTracker infrastructure rather than duplicating it.

**Shared Tables (already exist in production):**
- `trespass_records` - Contains student demographics (name, DOB, school_id, guardian info, photo)
  - **Key fields:** `school_id` (student ID), `is_daep` (boolean flag), `daep_expiration_date`
  - Extended with DAEP-specific fields: grade_level, parent_email, emergency contacts, special ed flags
- `admin_audit_log` - FERPA-compliant audit trail (who viewed/modified what)
- `tenants` - Multi-tenant organization data (subdomain, display_name, status)
- `campuses` - School campus data with composite PK (tenant_id, id) allowing same PEIMS codes across districts
- `user_profiles` - User accounts with role-based access (Clerk user_id, email, role, tenant_id)

**DAEP-Specific Tables (new):**
- `daep_placements` - DAEP placement records linked to `trespass_records.school_id`
- `daep_daily_points` - Point tracking per placement, period, day
- `daep_attendance` - Attendance per placement, period, day
- `daep_behavior_notes` - Detailed behavior incidents
- `daep_rooms`, `daep_bell_schedules`, `daep_school_calendar` - Configuration
- `daep_student_separations` - Room assignment constraints
- `daep_notifications` - In-app notification queue
- `daep_reconciliation_*` - CSV reconciliation workflow tables

**Linking Strategy:**
- DAEP placements reference `trespass_records.school_id` (student ID) as the foreign key
- No formal FK constraint because `school_id` is not unique in `trespass_records` (students can have multiple incidents)
- Application logic ensures referential integrity

**All DAEP tables use tenant_id for multi-tenant isolation with RLS policies.**

### Core DAEP Tables

```sql
-- CRITICAL: Student demographics already exist in trespass_records table
-- We extend trespass_records with DAEP-specific fields only
-- Linking: DAEP placements reference trespass_records.school_id (student ID)

-- Migration: Add DAEP-specific fields to existing trespass_records
ALTER TABLE trespass_records
  ADD COLUMN IF NOT EXISTS grade_level INT,
  ADD COLUMN IF NOT EXISTS parent_email TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS special_education BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS plan_504 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ell_status BOOLEAN DEFAULT FALSE;

-- Note: The following fields already exist in trespass_records:
-- - school_id (TEXT) - District student ID, used as FK for DAEP placements
-- - first_name, last_name, date_of_birth, guardian_first_name, guardian_last_name, guardian_phone
-- - photo, notes, campus_id, tenant_id
-- - is_daep (BOOLEAN) - Flag indicating current DAEP assignment
-- - daep_expiration_date (DATE) - Current DAEP expiration

-- Placements (one per incident)
CREATE TABLE daep_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  school_id TEXT NOT NULL, -- FK to trespass_records.school_id (student ID)
  incident_number TEXT NOT NULL, -- Unique per placement (e.g., INC-2024-12345)
  placement_date DATE NOT NULL, -- Date placement was approved
  start_date DATE NOT NULL, -- First day at DAEP
  days_assigned INT NOT NULL,
  days_served INT DEFAULT 0,
  days_remaining INT, -- Calculated field
  expected_end_date DATE, -- Calculated based on school calendar
  actual_end_date DATE, -- When student actually completed
  offense_code TEXT NOT NULL,
  placement_reason TEXT NOT NULL,
  mandatory_placement BOOLEAN DEFAULT FALSE,
  home_campus_id TEXT, -- FK: (tenant_id, home_campus_id) -> campuses(tenant_id, id)
  campus_id TEXT, -- DAEP campus where student is placed (usually same as home)
  assigning_campus_id TEXT, -- Campus that assigned the student to DAEP
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
  -- Note: No FK constraint to trespass_records because school_id is not unique
  -- Students may have multiple trespass records with same school_id
  -- Application logic ensures data integrity
  CHECK (school_id IS NOT NULL AND school_id != '')
);

CREATE INDEX idx_daep_placements_tenant ON daep_placements(tenant_id);
CREATE INDEX idx_daep_placements_student ON daep_placements(tenant_id, school_id);
CREATE INDEX idx_daep_placements_incident ON daep_placements(tenant_id, incident_number);
CREATE INDEX idx_daep_placements_status ON daep_placements(status);
CREATE INDEX idx_daep_placements_dates ON daep_placements(start_date, expected_end_date);

-- Daily points (per student, per period, per day)
CREATE TABLE daep_daily_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  -- school_id derived from placement_id -> daep_placements.school_id
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

CREATE INDEX idx_daep_daily_points_tenant ON daep_daily_points(tenant_id);
CREATE INDEX idx_daep_daily_points_placement ON daep_daily_points(placement_id);
CREATE INDEX idx_daep_daily_points_date ON daep_daily_points(date);
CREATE INDEX idx_daep_daily_points_approval ON daep_daily_points(approval_status);

-- Attendance (per student, per period, per day)
CREATE TABLE daep_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  -- school_id derived from placement_id -> daep_placements.school_id
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

CREATE INDEX idx_daep_attendance_tenant ON daep_attendance(tenant_id);
CREATE INDEX idx_daep_attendance_placement ON daep_attendance(placement_id);
CREATE INDEX idx_daep_attendance_date ON daep_attendance(date);
CREATE INDEX idx_daep_attendance_status ON daep_attendance(status);

-- Behavior notes (separate from point entries, more detailed)
CREATE TABLE daep_behavior_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  -- school_id derived from placement_id -> daep_placements.school_id
  date DATE NOT NULL,
  time TIME NOT NULL,
  category TEXT, -- "Positive", "Negative", "Neutral", etc.
  description TEXT NOT NULL,
  action_taken TEXT,
  staff_member TEXT NOT NULL, -- Clerk user_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daep_behavior_notes_tenant ON daep_behavior_notes(tenant_id);
CREATE INDEX idx_daep_behavior_notes_placement ON daep_behavior_notes(placement_id);
CREATE INDEX idx_daep_behavior_notes_date ON daep_behavior_notes(date);
```

### Configuration Tables

```sql
-- DAEP rooms
CREATE TABLE daep_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  campus_id TEXT, -- FK: (tenant_id, campus_id) -> campuses(tenant_id, id)
  room_number TEXT NOT NULL,
  room_name TEXT,
  capacity INT DEFAULT 15,
  active BOOLEAN DEFAULT TRUE,
  building_section TEXT, -- "501-505" or "506-509" for separation logic
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, campus_id, room_number)
);

CREATE INDEX idx_daep_rooms_tenant ON daep_rooms(tenant_id);
CREATE INDEX idx_daep_rooms_campus ON daep_rooms(campus_id);

-- Room staff assignments
CREATE TABLE daep_room_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  room_id UUID NOT NULL REFERENCES daep_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user_id
  assignment_type TEXT DEFAULT 'homeroom', -- homeroom | rotational
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, room_id, user_id)
);

-- Bell schedules
CREATE TABLE daep_bell_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  campus_id TEXT, -- FK: (tenant_id, campus_id) -> campuses(tenant_id, id)
  schedule_name TEXT NOT NULL, -- "Regular Day", "Early Release", "Half Day"
  periods JSONB NOT NULL,
  -- Example: [
  --   { period: "1st", start_time: "08:00", end_time: "09:15" },
  --   { period: "2nd", start_time: "09:20", end_time: "10:35" }
  -- ]
  is_default BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daep_bell_schedules_tenant ON daep_bell_schedules(tenant_id);
CREATE INDEX idx_daep_bell_schedules_campus ON daep_bell_schedules(campus_id);

-- School calendar (defines school days)
CREATE TABLE daep_school_calendar (
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

CREATE INDEX idx_daep_school_calendar_tenant ON daep_school_calendar(tenant_id);
CREATE INDEX idx_daep_school_calendar_date ON daep_school_calendar(date);
CREATE INDEX idx_daep_school_calendar_year ON daep_school_calendar(school_year);

-- Discipline codes (Texas PEIMS codes)
CREATE TABLE daep_discipline_codes (
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

CREATE INDEX idx_daep_discipline_codes_tenant ON daep_discipline_codes(tenant_id);

-- Behavior categories (district-configurable)
CREATE TABLE daep_behavior_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  category_type TEXT NOT NULL, -- positive | negative | neutral
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, category_name)
);

-- Point bonus rules (district-configurable)
CREATE TABLE daep_point_bonus_rules (
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
```

### Student Separation & Constraints

```sql
-- Student separation flags (students who must be kept apart)
CREATE TABLE daep_student_separations (
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

CREATE INDEX idx_daep_separations_tenant ON daep_student_separations(tenant_id);
CREATE INDEX idx_daep_separations_students ON daep_student_separations(student_a_id, student_b_id);
```

### Notifications

```sql
-- Notifications (in-app bell icon)
CREATE TABLE daep_notifications (
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

CREATE INDEX idx_daep_notifications_tenant ON daep_notifications(tenant_id);
CREATE INDEX idx_daep_notifications_user ON daep_notifications(user_id);
CREATE INDEX idx_daep_notifications_read ON daep_notifications(read);
CREATE INDEX idx_daep_notifications_created ON daep_notifications(created_at DESC);
```

### Reconciliation Tables (already defined in CSV section)

```sql
-- CSV field mappings (one-time setup)
-- daep_csv_field_mappings

-- Reconciliation sessions
-- daep_reconciliation_sessions

-- Individual discrepancies
-- daep_reconciliation_discrepancies

-- Reconciliation audit trail
-- daep_reconciliation_audit
```

### Row-Level Security (RLS) Policies

**All DAEP tables inherit the same multi-tenant pattern:**

```sql
-- Example RLS policy (apply to all daep_* tables)
ALTER TABLE daep_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their tenant's data"
  ON daep_placements
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::text);

-- Campus-scoped access for non-district admins
CREATE POLICY "Campus admins see only their campus placements"
  ON daep_placements
  FOR SELECT
  USING (
    home_campus_id IN (
      SELECT campus_id FROM user_campus_access
      WHERE user_id = current_setting('app.current_user_id')::text
    )
  );

-- Note: trespass_records already has RLS enabled with tenant_id policies
-- DAEP module inherits existing multi-tenant security infrastructure
```

**Pattern:** Every DAEP table has `tenant_id`, every query filtered by RLS

### Database Functions & Triggers

```sql
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant DAEP tables (placements, rooms, etc.)
-- Note: trespass_records already has updated_at trigger from TrespassTracker
CREATE TRIGGER update_daep_placements_updated_at
  BEFORE UPDATE ON daep_placements
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
```

### Audit Logging (FERPA Compliance)

**CRITICAL:** DAEP module reuses existing `admin_audit_log` table from TrespassTracker.

**Table already exists in production (migration required to add `module` column):**
```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_email TEXT,
  actor_role TEXT,
  target_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  record_subject_name TEXT,
  record_school_id TEXT,
  tenant_id TEXT,
  module TEXT, -- NEW: 'trespass_tracker' | 'daep_management' (for filtering)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration to add module column
ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS module TEXT;

-- Backfill existing records (everything so far is TrespassTracker)
UPDATE admin_audit_log
SET module = 'trespass_tracker'
WHERE module IS NULL;
```

**Existing utility function at `lib/audit-logger.ts`:**
```typescript
import { supabaseAdmin } from '@/lib/supabase/server';

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  await supabaseAdmin.from('admin_audit_log').insert({
    event_type: entry.eventType,
    module: entry.module, // 'trespass_tracker' | 'daep_management'
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    actor_role: entry.actorRole,
    target_id: entry.targetId,
    action: entry.action,
    details: entry.details,
    record_subject_name: entry.recordSubjectName,
    record_school_id: entry.recordSchoolId,
    tenant_id: entry.tenantId,
  });
}
```

**TrespassTracker Event Types (already exist):**
- `record.created` - New trespass record created
- `record.updated` - Trespass record modified
- `record.viewed` - Staff viewed trespass record
- `record.deleted` - Trespass record soft-deleted
- `record.exported` - Records exported to PDF/CSV
- `incident.repeat_offender` - New incident added for existing student (recidivism tracking)

**DAEP Event Types (new):**
- `placement.created` - New DAEP placement created
- `placement.updated` - Placement details modified
- `placement.viewed` - Staff viewed placement details
- `placement.transitioned` - Placement status changed (pending → active → transition → complete)
- `points.entered` - Daily points entered
- `points.approved` - Points approved by teacher
- `points.rejected` - Points rejected, requires re-entry
- `attendance.marked` - Attendance recorded
- `reconciliation.session_created` - CSV reconciliation session started
- `reconciliation.discrepancy_resolved` - Discrepancy manually resolved
- `student.separation_added` - Student separation flag added
- `room.assignment_changed` - Student reassigned to different room

**Module Separation Strategy (Option B - Chosen Approach):**
Each audit event has an explicit `module` field for clean filtering:
- TrespassTracker events: `module = 'trespass_tracker'`
- DAEP events: `module = 'daep_management'`

**Why Option B:**
- Simple, elegant filtering (single `.eq()` query)
- Developer-friendly (no complex LIKE patterns)
- Easy to add future modules (just add new module value)
- Can index `module` column for fast queries

Event types still use prefixes for subcategory organization:
- TrespassTracker: `record.*` and `incident.*`
- DAEP: `placement.*`, `points.*`, `attendance.*`, `reconciliation.*`

**Sample Audit Log Data:**
```
| ID  | Event Type       | Module           | Actor        | Action                       | Student     | Timestamp           |
|-----|------------------|------------------|--------------|------------------------------|-------------|---------------------|
| 001 | record.created   | trespass_tracker | admin@bi.com | Created trespass record      | John Smith  | 2025-11-24 10:30 AM |
| 002 | placement.created| daep_management  | admin@bi.com | Created DAEP placement       | Jane Doe    | 2025-11-24 11:45 AM |
| 003 | points.approved  | daep_management  | teacher@bi   | Approved 8 daily points      | Jane Doe    | 2025-11-24 02:15 PM |
| 004 | record.updated   | trespass_tracker | admin@bi.com | Updated trespass record      | John Smith  | 2025-11-24 03:00 PM |
```

Users can filter by module to see only relevant events for their role.

**Filtering in UI:**
```typescript
// DAEP audit log view
const daepEvents = await supabase
  .from('admin_audit_log')
  .select('*')
  .eq('module', 'daep_management')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });

// TrespassTracker audit log view
const trespassEvents = await supabase
  .from('admin_audit_log')
  .select('*')
  .eq('module', 'trespass_tracker')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });

// Full audit log (all modules)
const allEvents = await supabase
  .from('admin_audit_log')
  .select('*')
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });
```

**Implementation Pattern:**
```typescript
// In app/actions/daep-placements.ts
export async function createPlacement(data: PlacementData) {
  const { userId } = await auth();
  const supabase = await createServerClient();

  const { data: placement, error } = await supabase
    .from('daep_placements')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Get user profile for audit log
  const { data: userProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('email, role, tenant_id')
    .eq('id', userId)
    .single();

  // Log to existing audit trail
  await logAuditEvent({
    eventType: 'placement.created',
    module: 'daep_management',
    actorId: userId,
    actorEmail: userProfile?.email,
    actorRole: userProfile?.role,
    targetId: placement.id,
    action: `Created DAEP placement for ${studentName}`,
    recordSubjectName: studentName,
    recordSchoolId: data.school_id,
    tenantId: userProfile?.tenant_id,
    details: {
      placement_date: data.placement_date,
      days_assigned: data.days_assigned,
      offense_code: data.offense_code,
    },
  });

  revalidatePath('/daep/placements');
  return placement;
}
```

**Why This Matters:**
- **FERPA Compliance:** Complete audit trail of who accessed student data
- **Accountability:** Track all changes to DAEP records with timestamps
- **Debugging:** Understand data flow and user actions for support
- **Reporting:** Generate access reports for compliance audits

**Pattern:** Every server action that creates/reads/updates/deletes DAEP data MUST log an audit event.

**TrespassTracker: Tracking Repeat Offenders**

When creating a new trespass record, check if the student already has existing incidents (recidivism):

```typescript
// In app/actions/records.ts - createRecord()
export async function createRecord(data: Omit<TrespassRecord, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createServerClient();
  const { userId } = await auth();

  // Insert the record
  const { data: record, error } = await supabase
    .from('trespass_records')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Get user profile for audit log
  const { data: userProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('email, role, tenant_id')
    .eq('id', userId)
    .single();

  // Check for repeat incidents (same school_id, different records)
  const { data: existingRecords } = await supabase
    .from('trespass_records')
    .select('id')
    .eq('tenant_id', userProfile?.tenant_id || '')
    .eq('school_id', data.school_id)
    .is('deleted_at', null);

  const isRepeatOffender = existingRecords && existingRecords.length > 1; // >1 because we just inserted this one
  const totalIncidents = existingRecords?.length || 1;

  // Log to audit trail with appropriate event type
  await logAuditEvent({
    eventType: isRepeatOffender ? 'incident.repeat_offender' : 'record.created',
    module: 'trespass_tracker',
    actorId: userId,
    actorEmail: userProfile?.email,
    actorRole: userProfile?.role,
    targetId: record.id,
    action: isRepeatOffender
      ? `Added repeat incident for ${data.first_name} ${data.last_name} (incident #${totalIncidents})`
      : `Created trespass record for ${data.first_name} ${data.last_name}`,
    recordSubjectName: `${data.first_name} ${data.last_name}`,
    recordSchoolId: data.school_id,
    tenantId: userProfile?.tenant_id,
    details: {
      incident_date: data.incident_date,
      trespassed_from: data.trespassed_from,
      incident_count: totalIncidents,
      is_repeat_offender: isRepeatOffender,
    },
  });

  revalidatePath('/dashboard');
  return record;
}
```

**Why This Matters:**
- Track recidivism patterns in TrespassTracker
- Flag students who repeatedly violate trespass orders
- Generate intervention plans for repeat offenders
- Audit trail shows progression of incidents for each student

## Analytics & Reporting

### Recidivism Deep-Dive Queries

**CRITICAL:** Support drill-down from recidivism KPI to individual student analysis and pattern identification.

**User requirement:** "Click on recidivism count → see list of students → analyze patterns (drug-related? bullying?) → create intervention plans"

#### Query 1: DAEP Recidivism (Students with 2+ Placements)

```sql
-- Get students with multiple DAEP placements
SELECT
  p.school_id,
  tr.first_name,
  tr.last_name,
  tr.grade_level,
  tr.home_campus,
  COUNT(DISTINCT p.id) as placement_count,
  ARRAY_AGG(DISTINCT dc.label ORDER BY dc.label) as offense_types,
  MIN(p.start_date) as first_placement_date,
  MAX(p.start_date) as most_recent_placement_date,
  SUM(p.days_assigned) as total_days_assigned,
  SUM(p.days_served) as total_days_served
FROM daep_placements p
JOIN trespass_records tr ON tr.school_id = p.school_id AND tr.tenant_id = p.tenant_id
LEFT JOIN daep_discipline_codes dc ON dc.code = p.offense_code AND dc.tenant_id = p.tenant_id
WHERE p.tenant_id = :tenant_id
  AND p.status != 'pending'
GROUP BY p.school_id, tr.first_name, tr.last_name, tr.grade_level, tr.home_campus
HAVING COUNT(DISTINCT p.id) >= 2
ORDER BY placement_count DESC, most_recent_placement_date DESC;
```

**Returns:** List of repeat DAEP students with offense types (e.g., "Drugs (Marijuana), Assault, Bullying")

#### Query 2: Placement History for Student (Drill-Down)

```sql
-- Get all placements for a specific student
SELECT
  p.id,
  p.incident_number,
  p.start_date,
  p.expected_end_date,
  p.actual_end_date,
  p.days_assigned,
  p.days_served,
  p.status,
  dc.label as offense_description,
  dc.code as offense_code,
  r.room_number,
  r.room_name,
  c.name as campus_name,
  -- Point average for this placement
  (SELECT AVG(points_earned)::NUMERIC(4,1)
   FROM daep_daily_points
   WHERE placement_id = p.id AND approval_status = 'approved') as avg_points,
  -- Attendance rate for this placement
  (SELECT COUNT(*) FILTER (WHERE status = 'P')::FLOAT / NULLIF(COUNT(*), 0) * 100
   FROM daep_attendance
   WHERE placement_id = p.id) as attendance_rate
FROM daep_placements p
JOIN trespass_records tr ON tr.school_id = p.school_id AND tr.tenant_id = p.tenant_id
LEFT JOIN daep_discipline_codes dc ON dc.code = p.offense_code AND dc.tenant_id = p.tenant_id
LEFT JOIN daep_rooms r ON r.id = p.assigned_room_id
LEFT JOIN campuses c ON c.id = p.home_campus_id
WHERE p.tenant_id = :tenant_id
  AND p.school_id = :school_id
ORDER BY p.start_date ASC;
```

**Returns:** Complete placement history with performance metrics

#### Query 3: Pattern Analysis (Offense Type Distribution for Repeat Offenders)

```sql
-- Analyze what types of offenses lead to repeat placements
SELECT
  dc.label as offense_type,
  dc.code,
  COUNT(DISTINCT p.school_id) as unique_repeat_students,
  COUNT(p.id) as total_placements,
  ROUND(AVG(p.days_assigned), 1) as avg_days_assigned,
  ROUND(AVG(p.days_served), 1) as avg_days_served,
  -- Completion rate
  ROUND(
    COUNT(*) FILTER (WHERE p.status = 'complete')::FLOAT / NULLIF(COUNT(*), 0) * 100,
    1
  ) as completion_rate_pct
FROM daep_placements p
JOIN daep_discipline_codes dc ON dc.code = p.offense_code AND dc.tenant_id = p.tenant_id
WHERE p.tenant_id = :tenant_id
  AND p.school_id IN (
    -- Subquery: Get students with 2+ placements (repeat offenders only)
    SELECT school_id
    FROM daep_placements
    WHERE tenant_id = :tenant_id AND status != 'pending'
    GROUP BY school_id
    HAVING COUNT(*) >= 2
  )
GROUP BY dc.label, dc.code
ORDER BY total_placements DESC;
```

**Returns:** Offense breakdown showing which violations lead to recidivism

**Example Result:**
| Offense Type | Students | Total Placements | Avg Days | Completion % |
|--------------|----------|------------------|----------|--------------|
| Drugs (Marijuana) | 8 | 19 | 45.2 | 73.7% |
| Assault | 5 | 12 | 90.0 | 58.3% |
| Bullying | 3 | 7 | 60.0 | 85.7% |

#### Query 4: Timeline Analysis (When Do Repeat Placements Occur?)

```sql
-- Analyze time between placements for repeat offenders
WITH placement_gaps AS (
  SELECT
    school_id,
    start_date,
    LAG(actual_end_date) OVER (PARTITION BY school_id ORDER BY start_date) as previous_end_date,
    start_date - LAG(actual_end_date) OVER (PARTITION BY school_id ORDER BY start_date) as days_between_placements
  FROM daep_placements
  WHERE tenant_id = :tenant_id
    AND status IN ('complete', 'active')
)
SELECT
  CASE
    WHEN days_between_placements IS NULL THEN 'First Placement'
    WHEN days_between_placements <= 30 THEN '0-30 days'
    WHEN days_between_placements <= 90 THEN '31-90 days'
    WHEN days_between_placements <= 180 THEN '91-180 days'
    WHEN days_between_placements <= 365 THEN '181-365 days'
    ELSE '1+ years'
  END as gap_category,
  COUNT(*) as placement_count
FROM placement_gaps
GROUP BY gap_category
ORDER BY
  CASE gap_category
    WHEN 'First Placement' THEN 1
    WHEN '0-30 days' THEN 2
    WHEN '31-90 days' THEN 3
    WHEN '91-180 days' THEN 4
    WHEN '181-365 days' THEN 5
    ELSE 6
  END;
```

**Returns:** Distribution of time gaps between placements (helps identify intervention timing)

### UI Requirements for Recidivism Feature

**Page:** `/daep/analytics/recidivism`

**Components:**
1. **KPI Summary Card:**
   - Total repeat offenders (students with 2+ placements)
   - Recidivism rate % (repeat students / total unique students × 100)
   - Trend indicator (▲ or ▼ compared to previous period)

2. **Student List Table (Sortable):**
   - Columns: Name, Student ID, Grade, Campus, Placement Count, Offense Types, Date Range
   - Click row → Navigate to `/daep/students/[id]` with placement history tab

3. **Pattern Analysis Section:**
   - Bar chart: Offense types for repeat offenders (Query 4)
   - Timeline chart: Gap distribution (Query 5)
   - Filters: Grade level, campus, date range, offense type

4. **Intervention Planning Tools:**
   - "Export to CSV" button (includes notes column for planning)
   - "Tag for Intervention" action (multi-select students)
   - Notes field per student for end-of-year planning
   - Generate intervention report (PDF)

**Implementation in Epic/Story Phase:** This analytics feature should be Story 4-6 in Epic 5 (Analytics & Reporting).

## Project Structure

**Complete DAEP module file organization:**

```
DistrictTracker/                         # Monorepo root
├── modules/                              # Module-specific documentation
│   ├── TrespassTracker/
│   └── DAEPManagement/
│       └── daep_implementation_plan.md
│
├── docs/                                 # Project-wide documentation
│   ├── prd.md                           # DAEP PRD
│   ├── ux-design-specification.md       # DAEP UX Design
│   ├── architecture.md                  # This document
│   └── bmm-workflow-status.yaml
│
├── app/                                  # Next.js App Router
│   ├── daep/                            # DAEP module routes (NEW)
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # Main dashboard (KPIs, charts)
│   │   │   └── components/
│   │   │       ├── kpi-cards.tsx
│   │   │       ├── attendance-chart.tsx
│   │   │       └── enrollment-chart.tsx
│   │   ├── rooms/
│   │   │   ├── page.tsx                # Room roster view
│   │   │   ├── [roomId]/
│   │   │   │   └── page.tsx
│   │   │   └── components/
│   │   │       ├── room-selector.tsx
│   │   │       ├── period-selector.tsx
│   │   │       ├── roster-grid.tsx
│   │   │       └── point-entry-modal.tsx
│   │   ├── students/
│   │   │   ├── page.tsx                # Student list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx            # Student profile
│   │   │   └── components/
│   │   │       ├── student-list.tsx
│   │   │       ├── student-search.tsx
│   │   │       ├── profile-header.tsx
│   │   │       ├── placement-card.tsx
│   │   │       ├── daily-activity.tsx
│   │   │       └── placement-history.tsx
│   │   ├── placements/
│   │   │   ├── page.tsx                # Intake pipeline
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx            # Placement details
│   │   │   └── components/
│   │   │       ├── intake-pipeline.tsx
│   │   │       ├── placement-form.tsx
│   │   │       └── transition-workflow.tsx
│   │   ├── reconciliation/
│   │   │   ├── page.tsx                # Reconciliation dashboard
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx            # Review discrepancies
│   │   │   └── components/
│   │   │       ├── upload-csv.tsx
│   │   │       ├── reconciliation-summary.tsx
│   │   │       ├── discrepancy-card.tsx
│   │   │       └── comparison-view.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx                # Reports dashboard
│   │   │   └── components/
│   │   │       ├── report-tiles.tsx
│   │   │       ├── parameter-modal.tsx
│   │   │       └── placement-explorer.tsx
│   │   └── settings/
│   │       ├── page.tsx                # DAEP settings
│   │       ├── csv-mapping/
│   │       │   └── page.tsx            # CSV field mapping
│   │       └── components/
│   │           ├── bell-schedule.tsx
│   │           ├── discipline-codes.tsx
│   │           ├── behavior-categories.tsx
│   │           └── room-management.tsx
│   │
│   ├── actions/                         # Server Actions
│   │   └── daep/                        # DAEP-specific actions (NEW)
│   │       ├── students.ts              # Student CRUD
│   │       ├── placements.ts            # Placement management
│   │       ├── points.ts                # Point entry & approval
│   │       ├── attendance.ts            # Attendance tracking
│   │       ├── behavior-notes.ts        # Behavior documentation
│   │       ├── reconciliation.ts        # CSV reconciliation
│   │       ├── reports.ts               # Report generation
│   │       ├── notifications.ts         # Notification triggers
│   │       └── settings.ts              # Configuration management
│   │
│   ├── trespass/                        # TrespassTracker routes (existing)
│   ├── admin/                           # Cross-module admin
│   └── (auth routes)
│
├── components/                          # React components
│   ├── daep/                            # DAEP-specific (NEW)
│   │   ├── dashboard/
│   │   │   ├── kpi-card.tsx
│   │   │   ├── trend-chart.tsx
│   │   │   └── quick-actions.tsx
│   │   ├── students/
│   │   │   ├── student-card.tsx
│   │   │   ├── student-health-indicator.tsx
│   │   │   └── placement-timeline.tsx
│   │   ├── rooms/
│   │   │   ├── point-entry-grid.tsx
│   │   │   ├── attendance-quick-entry.tsx
│   │   │   └── student-row.tsx
│   │   ├── reconciliation/
│   │   │   ├── field-mapping-editor.tsx
│   │   │   ├── conflict-highlighter.tsx
│   │   │   └── resolution-actions.tsx
│   │   └── shared/
│   │       ├── placement-status-badge.tsx
│   │       ├── days-remaining-chip.tsx
│   │       └── student-separator-warning.tsx
│   │
│   ├── ui/                              # shadcn/ui components (shared)
│   ├── shared/                          # Cross-module shared
│   └── trespass/                        # TrespassTracker-specific
│
├── lib/                                 # Utilities & helpers
│   ├── supabase/                        # Supabase clients (shared)
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts
│   ├── validation/                      # Zod schemas
│   │   └── daep-schemas.ts              # DAEP validation schemas (NEW)
│   ├── utils/                           # Utility functions
│   │   ├── daep/                        # DAEP-specific utils (NEW)
│   │   │   ├── points-calculator.ts
│   │   │   ├── days-remaining.ts
│   │   │   ├── recidivism.ts
│   │   │   └── csv-parser.ts
│   │   └── date-helpers.ts
│   ├── stores/                          # Zustand stores
│   │   └── daep-notifications.ts        # DAEP notification store (NEW)
│   └── types/
│       └── daep.ts                      # DAEP TypeScript types (NEW)
│
├── supabase/migrations/                 # Database migrations (shared)
│   ├── 001_initial_schema.sql          # Existing: tenants, users, campuses
│   ├── 029_trespass_*.sql              # TrespassTracker migrations
│   └── 030_daep_*.sql                   # DAEP migrations (NEW)
│       ├── 030_daep_students.sql
│       ├── 031_daep_placements.sql
│       ├── 032_daep_daily_points.sql
│       ├── 033_daep_attendance.sql
│       ├── 034_daep_configuration.sql
│       ├── 035_daep_reconciliation.sql
│       ├── 036_daep_rls_policies.sql
│       └── 037_daep_triggers.sql
│
├── middleware.ts                        # Tenant routing (shared)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── vercel.json                          # Vercel Cron configuration
```

### Key Organization Principles

**1. Module Isolation:**
- `/app/daep/` - All DAEP routes
- `/components/daep/` - All DAEP components
- `/app/actions/daep/` - All DAEP server actions
- `/lib/utils/daep/` - DAEP-specific utilities

**2. Shared Infrastructure:**
- `/components/ui/` - shadcn/ui components (both modules)
- `/lib/supabase/` - Database clients (both modules)
- `/middleware.ts` - Multi-tenant routing (both modules)

**3. Clear Boundaries:**
- DAEP never imports from `/app/trespass/` or `/components/trespass/`
- Shared code goes in `/components/shared/` or `/lib/`
- Each module is self-contained except for shared infrastructure

## Architecture Summary

### Complete Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js | 15.5.4 | App Router, React 19, Server Components |
| **Language** | TypeScript | 5.9.3 | Type safety across codebase |
| **Frontend** | React | 19.2.0 | UI library |
| **UI Components** | shadcn/ui + Radix UI | Latest | Accessible component library |
| **Styling** | Tailwind CSS | Latest | Utility-first CSS |
| **Charts** | Tremor | Latest | Dashboard visualizations |
| **Database** | Supabase PostgreSQL | Latest | Multi-tenant with RLS |
| **Authentication** | Clerk | Latest | Invite-based user management |
| **Email** | Resend | Latest | Transactional emails (optional/future) |
| **CSV Parsing** | PapaParse | Latest | SIS export parsing |
| **Date/Time** | date-fns + date-fns-tz | Latest | US format, Central Time, school calendars |
| **Validation** | Zod | Latest | Schema validation |
| **Forms** | React Hook Form | Latest | Form state management |
| **State** | React Server Components | N/A | Server-first, minimal client state |
| **File Storage** | Supabase Storage | N/A | CSV uploads, student photos |
| **Cron Jobs** | Vercel Cron | N/A | Daily KPI updates, notifications |
| **Deployment** | Vercel | N/A | Edge functions, horizontal scaling |

### Integration Points

| Integration | Type | Purpose | Status |
|-------------|------|---------|--------|
| **TrespassTracker** | Internal module | Student lookup, expiration sync | Active |
| **District SIS** | CSV import | Reconciliation, enrollment data | MVP |
| **Clerk** | Authentication | User management, magic links | Active |
| **Supabase** | Database + Storage | Multi-tenant data, file uploads | Active |
| **Resend** | Email (future) | Return-to-campus notifications | Future |

### Security Architecture

**Multi-Tenant Isolation:**
- Subdomain routing: `{tenant}.districttracker.com`
- RLS policies on all tables filter by `tenant_id`
- Clerk organizations map to tenants
- No cross-tenant data leakage possible

**FERPA Compliance:**
- All student data access logged via `audit_log` table
- PII encrypted at rest (AES-256) and in transit (TLS 1.3)
- Access controls enforced server-side (never client-side)
- Parent consent tracked per placement
- Data retention: 7 years (Texas requirement)

**Permission Model:**
- District Admin: Full access across all campuses
- DAEP Admin: Full DAEP operations, point approval
- Campus Admin: View students from their campus only
- DAEP Staff: Point entry for assigned rooms, approval based on flag
- Approved teachers bypass point approval workflow

### Performance Architecture

**For typical DAEP deployment (20-30 concurrent users, <100 students):**

| Operation | Target | Strategy |
|-----------|--------|----------|
| Page load | <2s | Server Components, static generation where possible |
| Point entry | <500ms | Optimistic updates, background validation |
| CSV reconciliation | <5s | PapaParse streaming, batch processing |
| Dashboard KPIs | <5s refresh | Daily midnight cron recalculation, cached results |
| Search | <1s | PostgreSQL indexes on student_id, tenant_id |
| Reports | <10s | Pre-aggregated data, Tremor charts |

**Scalability (100+ districts):**
- Horizontal scaling: Vercel auto-scales compute
- Database: Supabase handles 500K+ placement records
- RLS ensures tenant isolation without performance degradation
- CDN for static assets (charts, images)

### Deployment Architecture

**Infrastructure:**
```
                               Internet
                                  │
                            Vercel Edge Network
                                  │
                   ┌──────────────┴──────────────┐
                   │                              │
            Next.js App                    Supabase
         (Server Components                  │
          + API Routes)              ┌───────┴────────┐
                   │                 │                 │
                   │           PostgreSQL       Supabase Storage
                   │           (Multi-tenant)    (CSV uploads)
                   │                 │
                   └─────────────────┘
                         Clerk Auth
```

**Deployment Process:**
1. Developer pushes to GitHub
2. Vercel auto-deploys to staging
3. Supabase migrations run automatically
4. Manual production promotion
5. Zero-downtime deployments

**Environments:**
- **Development:** Local Next.js + Supabase local
- **Staging:** Vercel preview + Supabase staging
- **Production:** Vercel production + Supabase production

### Development Environment Setup

**Prerequisites:**
- Node.js 18+ and npm/yarn
- Supabase CLI
- Git

**Setup Commands:**
```bash
# Clone repository
git clone https://github.com/yourusername/DistrictTracker.git
cd DistrictTracker

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Add: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
#      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY

# Run Supabase locally
supabase start

# Run database migrations
supabase db push

# Start development server
npm run dev

# Open http://localhost:3000
```

## Architecture Decision Records (ADRs)

**Key decisions documented for future reference:**

### ADR-001: Modular Monolith over Microservices
**Decision:** Build DAEP as a module within DistrictTracker monorepo, not a separate service
**Rationale:** Shared authentication, tenant routing, and UI components. TrespassTracker integration is seamless. Simpler deployment and development.
**Consequences:** Clear module boundaries required to prevent coupling

### ADR-002: CSV Reconciliation over Real-Time SIS Sync
**Decision:** Manual CSV upload + reconciliation workflow, not automatic API sync
**Rationale:** Texas SIS platforms (Skyward, Focus) have inconsistent API support. CSV is universal and allows manual override for data trust. Banking-style reconciliation is the differentiator.
**Consequences:** Admin must upload CSV regularly (daily/weekly recommended)

### ADR-003: Composite Key (student_id + incident_number) for Placements
**Decision:** Placements identified by student_id + incident_number, not just student_id
**Rationale:** Students can have multiple placements (recidivism). Each incident is unique. Reconciliation compares specific placements, not just students.
**Consequences:** All placement queries must filter by both fields

### ADR-004: Server-Side Business Logic Only
**Decision:** All data access, calculations, and permission checks run on server
**Rationale:** FERPA compliance, security, data integrity. Client-side code is easily manipulated.
**Consequences:** Developers must use Server Components and Server Actions exclusively for data operations

### ADR-005: Tenant Isolation via RLS, Not Application Logic
**Decision:** PostgreSQL Row-Level Security enforces tenant isolation, not application code
**Rationale:** Database-level security is foolproof. Application bugs cannot leak data across tenants. Performance is excellent with proper indexes.
**Consequences:** Every DAEP table must have `tenant_id` column and RLS policy

### ADR-006: In-App Notifications Primary, Email Secondary
**Decision:** Notification bell icon for most alerts, email only for critical events
**Rationale:** Teachers use the app daily. Email fatigue is real. Resend costs scale with volume.
**Consequences:** Notification system must be reliable and real-time

### ADR-007: US Date Format (MM/DD/YYYY) and Central Time
**Decision:** All user-facing dates use MM/DD/YYYY format and 12-hour clock (Central Time)
**Rationale:** Texas school district standard. Match existing workflows and expectations.
**Consequences:** Server stores UTC, convert to Central for display using date-fns-tz

### ADR-008: Human-Readable Error Messages
**Decision:** Error messages include student names, context, and remediation steps
**Rationale:** Non-technical administrators need clear guidance. "Row 42 error" is useless.
**Consequences:** Validation logic must construct descriptive messages with student context

---

## Future Enhancements

**TrespassTracker module updates to fully support DAEP integration:**

### Enhancement 1: Add Incident Number and Incident Date Fields

**Current State:**
- `trespass_records` table does NOT have `incident_number` or `incident_date` fields
- UI displays incident numbers as calculated array positions (Incident #1, #2, #3) based on `created_at`
- Calculation logic: `{relatedIncidents.map((incident, index) => "Incident #" + (index + 1))}`
- Located in: `components/trespass/RecordDetailDialog.tsx:587-594`

**Required Changes:**

1. **Database Migration:**
   ```sql
   -- File: supabase/migrations/YYYYMMDDHHMMSS_add_incident_tracking_to_trespass_records.sql

   ALTER TABLE trespass_records
     ADD COLUMN IF NOT EXISTS incident_number TEXT,
     ADD COLUMN IF NOT EXISTS incident_date DATE;

   COMMENT ON COLUMN trespass_records.incident_number IS 'Unique incident identifier from SIS (e.g., INC-2024-12345 or BHS-10/24/25). Used for DAEP placement linking. NULL for legacy records.';
   COMMENT ON COLUMN trespass_records.incident_date IS 'Actual date of incident (may differ from created_at timestamp). Used for incident ordering in UI.';
   ```

2. **Manual Backfill (One-Time Task):**
   - Admin panel tool to manually assign incident numbers to existing trespass records
   - For students: Incident numbers come from SIS CSV (district's student information system)
   - For non-students (manual entries): Use format `{campus}-{date}` (e.g., "BHS-10/24/25")
   - Alternative: Leave `incident_number` NULL for legacy records (acceptable)
   - Incident date defaults to existing `created_at` date if not known

3. **UI Updates (TrespassTracker):**
   - **KEEP existing display logic:** Continue showing "Incident #1", "Incident #2", "Incident #3" in UI
   - **Backend change only:** Use `incident_date` for sorting (if available), fallback to `created_at`
   - **Backend change only:** Use `incident_number` for DAEP CSV reconciliation matching
   - **TrespassTracker UI should NOT display `incident_number` field** - it's purely for backend linking

4. **Form Updates:**
   - Add `incident_number` field to "Add New Record" form (OPTIONAL)
   - Add `incident_date` field to "Add New Record" form (defaults to today)
   - Field hints: "Leave blank for non-students" or "Upload from SIS CSV"
   - No auto-generation of incident numbers

**Impact on DAEP Module:**
- DAEP CSV upload will populate `incident_number` from SIS data
- DAEP placements link to trespass records via `school_id` + `incident_number` (composite key)
- CSV reconciliation compares `incident_number` between SIS and DAEP placements to detect duplicates

**Priority:** High (required for full DAEP CSV reconciliation workflow)

---

## Next Steps

**This architecture document is ready for epic breakdown and implementation.**

**Recommended workflow progression:**

1. ✅ **Architecture Complete** (this document)
2. **Create Epics & Stories** - Break down into implementable units
3. **Sprint Planning** - Organize epics into 2-week sprints
4. **Implementation** - Build DAEP module following these patterns
5. **Testing** - Validate against acceptance criteria
6. **Deployment** - Roll out to Birdville ISD (pilot)

**Critical handoff artifacts:**
- This architecture document
- Database schema (21 tables defined)
- CSV reconciliation workflow design
- Implementation patterns for AI agents
- Complete file structure

**Success criteria for architecture:**
- ✅ 51 architectural decisions documented
- ✅ Complete database schema (21 tables)
- ✅ CSV reconciliation pattern designed
- ✅ Security model defined (RLS + FERPA)
- ✅ File structure mapped
- ✅ Technology stack locked
- ✅ Implementation patterns established

---

_Generated by BMad Method Architecture Workflow v1.0_
_Date: 2025-11-24_
_For: Alan (Birdville ISD)_
_Project: DAEPManagement - Module 2 of DistrictTracker.com_
