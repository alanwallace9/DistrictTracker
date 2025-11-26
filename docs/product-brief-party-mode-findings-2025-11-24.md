# Product Brief Party Mode Review - Findings & Clarifications

**Date:** 2025-11-24
**Session Type:** Multi-Agent Review (Party Mode)
**Participants:** John (PM), Winston (Architect), Mary (Analyst), Sally (UX Designer), Bob (Scrum Master)
**Objective:** Review Product Brief for blind spots, gaps, and areas needing clarification before architecture phase

---

## Executive Summary

A focused Party Mode session with 5 BMAD agents reviewed the DAEP Module Product Brief and surfaced critical clarifications on:
1. Schema design requirements (district config, school calendar, permissions)
2. Edge case handling (rollover students, mid-placement changes, no-show escalation)
3. Privacy controls (private vs public behavior notes)
4. Granular permissions system (feature-level access control)
5. Performance considerations (review eligibility indexes)
6. Pilot testing strategy (phased rollout plan)

**Key Outcome:** Product Brief updated with schema structures, performance indexes, and clarified edge cases. Ready for architecture phase.

---

## Key Findings by Agent

### John (Product Manager) - Strategic Clarifications

**Finding 1: Rollover Student Logic**
- **Question:** How do students with remaining days at end of school year get handled?
- **Clarification:**
  - Home campus decides: Let student start new year at home campus, OR finish remaining days first
  - If finishing days: Placement "pauses" (days don't accrue over summer)
  - Checkbox: "Rollover to next year"
  - First day of new school year: Student "clocks in" and days resume accruing
  - **Impact:** Need "pause placement" workflow and rollover checkbox in data model

**Finding 2: Teacher Training & Resistance**
- **Question:** What's the plan if teachers resist the system?
- **Clarification:**
  - Alan is their district admin (boss) - training done by him for MVP
  - Phased rollout: Alan tests alone first, then 15 staff in January if successful
  - Parallel Excel BMS during transition for data validation
  - **Impact:** Training plan is internal, no external training materials needed for MVP

**Finding 3: District Configuration Onboarding**
- **Question:** Who sets up district config during onboarding?
- **Clarification:**
  - Alan manually configures for MVP and initial tenants
  - Guided wizard needed for Phase 2 (when scaling to multiple districts)
  - **Impact:** Admin panel for config exists in MVP, but wizard deferred to Phase 2

**Finding 4: You're the Bottleneck**
- **Observation:** Manual tenant setup means Alan is bottleneck for scaling
- **Recommendation:** Prioritize district config wizard in Phase 2

---

### Winston (Architect) - Technical Design Requirements

**Finding 1: Real-Time Sync Architecture**
- **Question:** How does real-time sync work between DAEP and TrespassTracker?
- **Clarification:**
  - **Single source of truth:** Shared tables, no sync needed
  - Expiration date stored once in `trespass_records.daep_expiration_date`
  - DAEP module updates that field directly (not syncing between systems)
  - Triggers handle status updates (e.g., expiration passed → mark inactive)
  - **Impact:** Eliminates sync complexity, retry logic, dead letter queues

**Finding 2: District Configuration Schema** (DOCUMENTED)
- **Requirement:** Define complete schema NOW to avoid custom code per district
- **Schema designed:**
  ```
  daep_district_config
    - behavior_system_type, points_per_day, points_threshold_total, points_threshold_review
    - review_criteria (JSON), period_structure (JSON), attendance_checkpoint_time
    - no_show_escalation_count, notification_advance_days
  ```
- **Impact:** Architecture phase must finalize this schema with all edge cases

**Finding 3: School Calendar Service** (DOCUMENTED)
- **Requirement:** Expiration calculation needs school day lookup
- **Schema designed:**
  ```
  district_school_calendar
    - tenant_id, calendar_date, is_school_day, reason
  ```
- **Initial Load:** CSV upload or manual entry (table format)
- **Future:** PDF parsing of school calendar (Phase 2+)
- **Maintenance:** Admin updates for weather cancellations throughout year
- **Impact:** Architecture must include calendar management UI

**Finding 4: Performance Indexes** (DOCUMENTED)
- **Critical Queries:**
  - Review eligibility: "Who's eligible for review today?" (daily query)
  - Notification filtering: "Who needs review notification in 3/5/7 days?" (daily query)
- **Indexes added:**
  - `daep_placements` (days_served, status, tenant_id)
  - `district_school_calendar` (tenant_id, calendar_date, is_school_day)
  - All tables: tenant_id for RLS performance
- **Impact:** Query optimization critical for daily operations

**Finding 5: Current Student Count**
- **Correction:** 73 students currently, not 247 (247 was from Bolt mockup)
- **Design Target:** Plan for 500-1000 students to handle growth
- **Impact:** Performance targets are achievable with proper indexes

---

### Mary (Analyst) - Edge Cases & Business Rules

**Finding 1: Home Campus Change Mid-Placement**
- **Frequency:** Rare (1-2 times per 6 weeks)
- **Common Scenarios:**
  1. Student leaves district → Pause placement, track days owed
  2. Student goes to JJAEP (county jail) → Pause placement, resume after return
- **Process:** Manual update, not CSV-driven
- **Impact:** Need "pause placement" status and days owed tracking

**Finding 2: Community Service Approval** (DOCUMENTED)
- **Who approves:** Admin, Counselor, or Department chair only (3 people)
- **Documentation:** Upload sign-in sheet OR enter date + location note
- **Purpose:** Accountability if questioned
- **Impact:** Granular permission needed: `can_approve_community_service`

**Finding 3: Review Criteria Thresholds** (DOCUMENTED)
- **Current State:** Subjective, case-by-case admin decision
- **Goal:** Systematize with objective thresholds
- **Thresholds:**
  - Attendance: >85% (with admin override for illness/COVID)
  - Total points: Days assigned × points/day (e.g., 2000 for 20 days @ 100pts)
  - Review points: Early review threshold (e.g., 2000 points @ 20-day review in 30-day placement)
  - Behavior: Subjective admin assessment
  - Academic: Captured via daily points
- **Override:** Admin can override for compassionate cases
- **Impact:** District config must store these thresholds (configurable per district)

**Finding 4: No-Show Escalation Workflow** (DOCUMENTED)
- **Trigger:** After X no-shows (configurable, e.g., 2-3)
- **Action:** Adds task to teacher notification tab
  - Task: "Parent contact needed for [Student Name]"
  - Teacher marks complete with note documenting contact
- **Admin Monitoring:**
  - Dashboard shows: "Teachers with pending parent contacts"
  - Teacher dashboard shows: "1 parent contact overdue (2 days past due)"
  - Enables intervention at end-of-day meetings
- **Impact:** Task tracking system needed with overdue indicators

**Finding 5: Rollover/Summer Pause** (DOCUMENTED)
- **Process:**
  - End of year: Admin decides if student finishes days or pauses
  - If pause: Checkbox "Rollover to next year"
  - Days owed carry over
  - First day of new year: Student "clocks in," days resume accruing
- **Summer School Option:** Future consideration to close small placements (4-5 days)
- **Impact:** Placement status "paused," rollover checkbox in data model

**Recommendation: Document All Edge Cases**
- COVID/illness absences don't count against attendance threshold
- Community service requires documentation
- No-show escalation workflow with task tracking
- Rollover logic with summer pause
- JJAEP transfer handling (pause/resume)

---

### Sally (UX Designer) - User Experience Gaps

**Finding 1: Student/Parent Portal Priority** (MOVED TO MVP)
- **Original:** Tier 3 (Nice-to-Have)
- **Updated:** Tier 2.5 (Critical for MVP)
- **Rationale:** Transparency = motivation = better outcomes
- **Access:** Digital login, mobile-responsive, no printed reports
- **Impact:** Must design student/parent views for MVP

**Finding 2: Quick-Tap Behavior Note Interface** (DOCUMENTED)
- **Current:** Described as "quick-tap dropdowns" but not detailed
- **Clarified:** 3-4 taps maximum (30-second entry target)
  1. Points adjustment dropdown (+/- 5, +/- 10, 0)
  2. Student action dropdown (On Task, Disruption, Helping Others, etc.)
  3. Teacher action dropdown (Verbal Warning, Parent Contact, Redirect, etc.)
  4. Optional free-text note field
- **Impact:** UX design can now create specific mockup

**Finding 3: Private vs Public Notes** (NEW FEATURE)
- **Requirement:** Teachers need staff-only notes for operational communication
- **Solution:**
  - **Private notes:** Staff-only (default)
  - **Public notes:** Visible to students/parents (toggle to enable)
  - **Approval workflow:** Admin can flag specific teachers requiring pre-approval for public notes
- **Use Cases:**
  - Private: "John had rough night, seems upset, needs extra support today"
  - Public: "John earned 5 extra points for helping classmate with assignment"
- **Impact:** Privacy toggle on behavior note form, approval queue for admin

**Finding 4: Room Conflict Visualization**
- **Question:** How does registrar see conflicts during room assignment?
- **Clarification:**
  - Similar to E-hall pass logic (Student A out → Student B can't leave)
  - Store conflicts by student ID pairs
  - Cluster logic: Rooms divided by building sections (hallway A vs hallway B)
  - Lunch period separation also tracked
  - Visual indicator: "Student A must avoid Student B"
  - Room dropdown filters out conflicting options
- **Impact:** UX design needed for conflict display and room filtering

**Finding 5: Intake Wizard Flow** (DOCUMENTED)
- **Question:** Long form or wizard?
- **Clarification:** Wizard preferred (registrar gets interrupted frequently)
- **Flow:**
  1. CSV import creates pending intakes
  2. Student appears in "Pending Intakes" on dashboard
  3. Click student → Opens intake wizard
  4. Step 1: Demographics (confirm from CSV)
  5. Step 2: Placement details (offense code, days, actual start date, reason)
  6. Step 3: Room assignment (with conflict checks)
- **Auto-save:** Required for interruption handling
- **Impact:** Multi-step wizard with save/resume capability

**Missing:** Wireframes, mobile layouts, detailed mockups
- **Action:** Defer to UX design workflow (post-architecture)

---

### Bob (Scrum Master) - Implementation Readiness

**Finding 1: MVP Scope is Large**
- **Count:** 17 features across 3 tiers
- **Complexity:** Not yet estimated (need t-shirt sizes: S/M/L)
- **Observation:** District config alone could be 2-3 sprints
- **Recommendation:** Sprint 0 for infrastructure, then feature sprints

**Finding 2: Dependency Mapping** (CLARIFIED)
- **Dependencies:**
  1. District config setup → MUST be first (manual by Alan)
  2. CSV import → Loads students, creates pending intakes
  3. Intake workflow → Creates active placements
  4. Attendance → Requires active placements
  5. Reporting → Requires data (can start immediately once data exists)
- **Critical Path:** Config → CSV → Intake → Attendance → Everything else

**Finding 3: Definition of Done** (CLARIFIED)
- **Question:** What does "CSV import complete" mean?
- **Clarification:**
  - Tested with mock Focus CSVs (AI-generated demo data)
  - Error handling tested with malformed data
  - Reconciliation dashboard functional
  - Real Focus reports validated (format confirmed)
  - Manual updates okay initially, formalized report spec later
- **Recommendation:** Write acceptance criteria for each Tier 1 feature during architecture

**Finding 4: Pilot Testing Strategy** (DOCUMENTED)
- **Phase 1: Solo Testing (Alan only)**
  - Alan uses system, compares to Excel BMS
  - Validates data accuracy
  - Identifies workflow issues
  - Duration: 1-2 weeks minimum
- **Phase 2: Staff Rollout (if Phase 1 succeeds)**
  - 15 staff: Teachers, EAs, registrar, counselor, department chair
  - Target: January (start of spring semester)
  - Parallel BMS continues for data validation
- **Rollback:** If MVP fails, revert to Excel BMS
  - Data migration strategy needed (export from system back to Excel if needed)

**Finding 5: Scrum Knowledge Gap**
- **Observation:** Alan is solo developer, not deeply versed in Scrum
- **Clarification:** That's okay - using BMAD Method for structured planning instead
- **Recommendation:** Focus on clear milestones and acceptance criteria, not rigid sprint structure

**Missing:** Complexity estimates, story breakdown
- **Action:** Defer to sprint planning workflow (post-architecture)

---

## Critical Schema Additions

### 1. daep_district_config (Complete Structure)

```sql
CREATE TABLE daep_district_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Behavior Tracking System
  behavior_system_type text NOT NULL CHECK (behavior_system_type IN ('points', 'color-tier')),
  points_per_day integer, -- e.g., 110 (if points-based)
  points_threshold_total integer, -- days × points/day (e.g., 2000 for 20 days @ 100pts)
  points_threshold_review integer, -- points needed for early review

  -- Review Criteria
  review_criteria jsonb NOT NULL DEFAULT '{
    "attendance_min_pct": 85,
    "behavior_subjective": true,
    "academic_participation": true
  }'::jsonb,

  -- Period Structure
  period_structure jsonb NOT NULL DEFAULT '{
    "periods": 7,
    "breaks": 2,
    "lunch": 1,
    "checkin": 1
  }'::jsonb,

  -- Operational Settings
  attendance_checkpoint_time time NOT NULL DEFAULT '09:30:00',
  no_show_escalation_count integer NOT NULL DEFAULT 3,
  notification_advance_days integer NOT NULL DEFAULT 5,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id)
);
```

**Notes:**
- JSON fields allow flexibility for complex configurations
- Default values ensure system works out-of-box
- Single row per tenant (UNIQUE constraint)

### 2. district_school_calendar

```sql
CREATE TABLE district_school_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  calendar_date date NOT NULL,
  is_school_day boolean NOT NULL DEFAULT true,
  reason text, -- 'Holiday - Thanksgiving', 'Weather - Ice Storm', NULL for regular days

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, calendar_date)
);

CREATE INDEX idx_school_calendar_lookup
  ON district_school_calendar(tenant_id, calendar_date, is_school_day);
```

**Usage:**
- Expiration calculation queries: "Is this date a school day?"
- Initial load: CSV upload or manual entry
- Ongoing maintenance: Admin updates for weather cancellations
- Future: PDF calendar parsing

### 3. user_permissions (Granular Access Control)

```sql
CREATE TABLE user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Feature-Level Permissions
  can_approve_community_service boolean DEFAULT false,
  can_conduct_intakes boolean DEFAULT false,
  can_edit_placements boolean DEFAULT false,
  requires_behavior_note_approval boolean DEFAULT false,
  can_view_private_notes boolean DEFAULT true,
  can_override_review_criteria boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, tenant_id)
);
```

**Pattern:** Similar to Focus/Skyward admin panels
- Pull up user → See checkboxes for each permission
- Admin toggles permissions → Saves to database
- RLS policies check these permissions on mutations

### 4. Performance Indexes (All Tables)

```sql
-- Review Eligibility Queries (Daily)
CREATE INDEX idx_review_eligibility
  ON daep_placements(days_served, status, tenant_id);

-- Active Placements Filtering
CREATE INDEX idx_active_placements
  ON daep_placements(tenant_id, status);

-- Daily Attendance Queries
CREATE INDEX idx_attendance_daily
  ON daep_attendance(attendance_date, tenant_id);

-- Recent Behavior Notes Retrieval
CREATE INDEX idx_behavior_notes
  ON daep_behavior_notes(student_id, created_at);

-- RLS Performance (ALL Tables)
CREATE INDEX idx_[table]_tenant ON [table](tenant_id);
```

---

## Edge Cases Documented

### 1. Rollover Students (End of Year)

**Scenario:** Student has 10 days remaining at end of school year

**Process:**
1. Admin communicates with home campus
2. Home campus decides:
   - **Option A:** Student starts new year at home campus (placement ends, days owed tracked)
   - **Option B:** Student finishes remaining days first
3. If Option B:
   - Mark placement status = "paused"
   - Set checkbox: "Rollover to next year"
   - Days don't accrue over summer
4. First day of new school year:
   - Student "clocks in" (like punch clock)
   - Days resume accruing
   - Continue until days served = days assigned

**Data Model Impact:**
- `daep_placements.status` needs "paused" option
- `daep_placements.rollover_to_next_year` boolean field
- Logic: If paused AND rollover, don't count summer days

**Future Enhancement:** Summer school option to close small placements (4-10 days)

### 2. Mid-Placement Status Changes

**Scenario A: Student Leaves District**
- **Action:** Pause placement
- **Track:** Days owed
- **Status:** "withdrawn - left district"
- **Future:** If student returns to district, placement can resume

**Scenario B: Student Transferred to JJAEP (County Jail)**
- **Action:** Pause placement
- **Track:** Days owed
- **Process:** Time served at JJAEP may count toward DAEP days (varies by district)
- **Resume:** When student returns from JJAEP, placement resumes from paused state

**Scenario C: Home Campus Change (Rare)**
- **Frequency:** 1-2 times per 6 weeks
- **Action:** Manual update of `home_campus_id` field
- **Not CSV-driven:** Registrar updates directly in system

### 3. Review Criteria with Override

**Standard Thresholds (Configurable):**
- Attendance: >85%
- Total points: Days assigned × points/day
- Review points: Threshold for early review eligibility
- Behavior: Subjective admin decision
- Academic: Captured via daily points

**Override Cases:**
- COVID/illness absences: Don't count against 85% threshold
- Extended illness: If student served assigned days but attendance low due to illness, admin can approve return
- Extenuating circumstances: Family emergency, medical issues, etc.

**Process:**
- System flags student as "review eligible" based on thresholds
- Admin reviews case-by-case
- Admin can override any threshold with documented reason

### 4. No-Show Escalation with Task Tracking

**Trigger:** Student no-shows for intake X times (configurable: 2-3)

**Workflow:**
1. System adds task to teacher notification tab
   - Task: "Parent contact needed for [Student Name] (no-show follow-up)"
   - Priority: High
2. Teacher receives notification (dashboard + notification bell)
3. Teacher contacts parent, documents attempt:
   - "Called 11/24 @ 2pm, left voicemail"
   - "Spoke with parent 11/25, rescheduled intake for 11/27"
4. Teacher marks task complete
5. **Admin Monitoring:**
   - Dashboard report: "Teachers with pending parent contacts"
   - Shows: Teacher name, student name, task age (days overdue)
6. **Overdue Indicator:**
   - Teacher dashboard: "1 parent contact overdue (2 days past due)"
   - Visual alert (red badge)
7. **Admin Intervention:**
   - End-of-day meeting: "These 3 teachers, see me before Friday"
   - Accountability without micromanagement

**Data Model Impact:**
- Task tracking table (or extend notifications)
- Task status: pending, in-progress, completed, overdue
- Task assignment: teacher_id, task_type, related_student_id

### 5. Community Service Approval & Documentation

**Who Can Approve:** Admin, Counselor, Department chair (3 people only)

**Documentation Required:**
- **Option A:** Upload sign-in sheet (PDF/image)
- **Option B:** Enter date + location note (e.g., "Food bank 10/21")

**Points Credit:**
- Fixed: 100 points per completion
- Monthly cap: 1 service day per month maximum
- Prevents point inflation

**Approval Workflow:**
- Student reports community service completion
- One of 3 authorized people reviews documentation
- Approves → 100 points added
- System logs: Who approved, when, documentation reference

**Data Model Impact:**
- `can_approve_community_service` permission flag
- Community service table: student_id, completion_date, location, approved_by, documentation_url

### 6. Private vs Public Behavior Notes

**Private Notes (Default):**
- **Audience:** Staff only (teachers + admin)
- **Purpose:** Operational communication
- **Examples:**
  - "John had rough night, seems upset today"
  - "Sarah responding well to seating change"
  - "Needs extra support in math period"
- **Visibility:** NOT visible to students or parents

**Public Notes:**
- **Audience:** Students, parents, staff
- **Purpose:** Motivational, informational, accountability
- **Examples:**
  - "Earned 5 extra points for helping classmate"
  - "Great participation in class discussion today"
  - "-10 points for disruption during instruction"
- **Visibility:** Visible in student/parent portal

**Approval Workflow (Flagged Teachers):**
- Admin can flag specific teachers: `requires_behavior_note_approval = true`
- Teacher on pre-approval list creates public note → Note stays private
- Admin reviews note in approval queue
- Admin approves → Note becomes public
- Admin rejects → Note stays private (or deleted)
- **Purpose:** Prevent inflammatory or poorly-worded comments reaching families

**UI Flow:**
1. Teacher selects "Make this note public" toggle
2. If teacher flagged: "Note submitted for admin approval before becoming public"
3. If teacher not flagged: Note immediately public
4. Admin dashboard: "X public notes pending approval"

---

## Recommendations for Architecture Phase

### 1. Document Everything

**Schema Design:**
- Complete table structures with field types, constraints, indexes
- Foreign key relationships mapped
- RLS policies specified per table
- Default values documented

**Edge Cases:**
- All scenarios documented with process flows
- Data model impacts specified
- UI/UX implications noted

**Business Rules:**
- Point calculation formulas
- Expiration date algorithm
- Review eligibility logic
- Override conditions

### 2. Prioritize District Config Wizard (Phase 2)

**Current:** Alan manually configures each tenant
**Problem:** Bottleneck for scaling
**Solution:** Guided setup wizard for district onboarding

**Wizard Flow:**
1. Behavior tracking system selection (points vs color-tier)
2. If points: Configure points/day, period structure
3. Review criteria thresholds
4. School calendar upload/entry
5. PEIMS code upload (or select from library)
6. Notification preferences

**Target:** Phase 2 (post-MVP), before scaling to 5+ districts

### 3. Sprint 0: Infrastructure First

**Goal:** Rock-solid foundation before feature development

**Sprint 0 Scope:**
1. Database schema creation (all tables)
2. RLS policies (tenant isolation)
3. Indexes (performance)
4. District config setup (Alan's district)
5. School calendar load (Alan's district)
6. User permissions setup
7. Seed data for testing

**Outcome:** Ready to build features on stable foundation

### 4. Write Acceptance Criteria

**Pattern:** For each Tier 1 feature, define "done"

**Example: CSV Import Complete**
- [ ] Parses roster CSV (student demographics)
- [ ] Parses incident CSV (incident IDs, offense codes, days assigned)
- [ ] Validates incident ID uniqueness (composite key: student_id + incident_id)
- [ ] Creates student records (or updates existing)
- [ ] Creates pending intake records
- [ ] Reconciliation dashboard shows discrepancies
- [ ] Error log displays specific row failures with explanations
- [ ] Handles malformed CSVs gracefully (doesn't crash)
- [ ] Import history tracked (who, when, rows processed)

**Apply to:** All 17 MVP features

### 5. Design UX Workflows

**Deferred to UX Design Workflow** (post-architecture)

**Priority Mockups Needed:**
1. Teacher behavior note entry (3-dropdown quick-tap)
2. Room conflict visualization during intake
3. Intake wizard (3-step flow)
4. Student portal view (points, days, notes)
5. Parent portal view (same as student)
6. Reconciliation dashboard (expected vs actual)
7. Admin approval queue (public notes pending approval)
8. Teacher notification tab (pending tasks, overdue indicators)

---

## Updated MVP Scope Summary

### Tier 1: Data Foundation (Critical)
1. District Configuration Admin Panel
2. CSV Import with Banking Reconciliation
3. Student & Placement Core Data Model
4. Attendance Tracking (Period-Based)
5. Points & Behavior Tracking System (with private/public notes)
6. Placement Lifecycle & Expiration Calculation

### Tier 2: Daily Operations (Critical)
7. Intake Scheduling & Workflow
8. Dashboard Overview
9. Room Rosters View
10. Students List (Master View)
11. Student Detail Panel
12. Review Process (Basic)
13. Basic Reporting
14. Role-Based Access Control (with granular permissions)

### Tier 2.5: Student/Parent Portal (Moved from Tier 3 - CRITICAL)
15. Student/Parent Portal (Basic View)

### Tier 3: Nice-to-Haves (Time Permitting)
16. Daily Meeting Prep View
17. Email Notifications (Manual Trigger)

**Total MVP Features:** 17 (up from 16, portal moved to critical)

---

## Next Steps

**1. Architecture Workflow**
- Run `/bmad:bmm:workflows:architecture`
- Design complete technical architecture
- Finalize database schema with all edge cases
- Define API contracts (Server Actions)
- Create system diagrams
- Document integration points

**2. Update Workflow Status**
- Mark Product Brief as complete
- Set next workflow: architecture

**3. Reference Documents**
- Product Brief: `docs/product-brief-DAEPManagement-2025-11-24.md` (updated)
- Party Mode Findings: `docs/product-brief-party-mode-findings-2025-11-24.md` (this document)
- Brainstorming Results: `docs/brainstorming-session-results-2025-11-23.md`
- DAEP UI Mockup Analysis: `docs/daep-ui-mockup-analysis.md`
- Project Documentation: `docs/index.md`

---

## Additional Session: Permissions System Deep Dive

**Date:** 2025-11-24 (continued session after initial Party Mode review)
**Focus:** RBAC system architecture, student/parent access, data privacy

### Key Findings

#### 1. Student & Parent Portal Users (NEW ROLES)

**Roles Added:**
- `student` - Read own data only
- `parent` - Read own student's data only

**Permissions:**
- **Can view:**
  - Student Demographics (own info only)
  - Placement (days remaining, progress - NOT offense details)
  - Attendance (own attendance record)
  - Behavior (public notes only, own points)
  - Reviews (own review status, when eligible)

- **Cannot view:**
  - Offense codes/reasons (FERPA privacy)
  - Private staff notes (staff communication only)
  - Other students' data (multi-tenant + student isolation)
  - Student separation/conflict rules (privacy)

**RLS Implementation:**
```sql
-- Student can only see own records
CREATE POLICY student_view_own ON daep_students
FOR SELECT TO authenticated
USING (
  id = (SELECT student_id FROM user_profiles WHERE user_id = auth.uid())
  AND tenant_id = current_tenant_id()
);

-- Parent can only see own student's records
CREATE POLICY parent_view_own_student ON daep_students
FOR SELECT TO authenticated
USING (
  id IN (SELECT student_id FROM parent_student_links WHERE parent_user_id = auth.uid())
  AND tenant_id = current_tenant_id()
);
```

**Data Model Addition:**
```sql
CREATE TABLE parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES user_profiles(id),
  student_id uuid NOT NULL REFERENCES daep_students(id),
  relationship text NOT NULL, -- 'Mother', 'Father', 'Guardian', etc.
  is_primary boolean DEFAULT false,
  tenant_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_user_id, student_id, tenant_id)
);
```

#### 2. Student Conflict/Separation Rules

**Requirement:** Track which students cannot be placed together

**Who Can View:**
- ✓ Teachers (need for classroom management, hallway supervision)
- ✓ Registrars (need for room assignment)
- ✓ Administrators (manage conflicts)
- ✗ Students (privacy - don't reveal conflict relationships)
- ✗ Parents (privacy)

**Use Case:**
When assigning rooms or viewing rosters, teachers see indicator: "⚠️ Keep separated from [Student Name]"

**Data Model:**
```sql
CREATE TABLE student_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id),
  student_a_id uuid NOT NULL REFERENCES daep_students(id),
  student_b_id uuid NOT NULL REFERENCES daep_students(id),
  conflict_scope text[] NOT NULL, -- ['room', 'hallway', 'lunch']
  reason text, -- Admin-only field, not visible to teachers
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, student_a_id, student_b_id),
  CHECK (student_a_id != student_b_id)
);

CREATE INDEX idx_conflicts_student_a ON student_conflicts(student_a_id);
CREATE INDEX idx_conflicts_student_b ON student_conflicts(student_b_id);
```

**UI Considerations:**
- Room assignment dropdown filters out conflicting rooms
- Roster view shows conflict warnings
- Conflict reason visible to admin only (sensitive info)

#### 3. Offense Code Privacy (FERPA Compliance)

**Teachers Can See:**
- ✓ Days assigned (20 days, 30 days, etc.)
- ✓ Days remaining
- ✓ Progress percentage
- ✓ Placement start/end dates

**Teachers CANNOT See:**
- ✗ Offense code (e.g., "Code 02")
- ✗ Offense description (e.g., "Insubordination")
- ✗ Incident details from TrespassTracker
- ✗ Placement reason text field (potentially sensitive)

**Who CAN See Offense Details:**
- Admin, Registrar, Counselor only

**Rationale:** FERPA privacy - teachers don't need to know "why" student is there, just "how long"

**Query Implementation:**
```typescript
// For teachers - filtered fields
SELECT
  id, student_id, start_date, planned_end_date,
  days_assigned, days_served, days_remaining,
  -- offense_code HIDDEN
  -- offense_description HIDDEN
  -- placement_reason HIDDEN
  current_roster_room, status, progress_percentage
FROM daep_placements
WHERE tenant_id = $1 AND status = 'active';

// For admin/registrar - full access
SELECT * FROM daep_placements
WHERE tenant_id = $1 AND status = 'active';
```

#### 4. System Roles - Complete List

**MVP Roles (7 total):**

1. **`student`** - Read own data only
   - Student portal access
   - Public notes, points, days remaining visible
   - No offense details

2. **`parent`** - Read own student's data only
   - Parent portal access
   - Same view as student
   - Multiple students supported (via parent_student_links)

3. **`teacher`** - Room/campus-scoped operations
   - Read students in assigned room/campus
   - Create/edit attendance + behavior notes
   - Can see conflict rules (for classroom management)
   - Cannot see offense codes (FERPA)
   - Can view private notes (staff communication)

4. **`counselor`** - Read all, limited write
   - Read all student data (including offense details)
   - Approve community service
   - Participate in reviews (not final approval)
   - Add behavior notes

5. **`registrar`** - Full operational CRUD
   - Full CRUD on students/placements/intakes
   - CSV import capability
   - Conduct intakes
   - Cannot manage users/permissions
   - Cannot see other tenants

6. **`district_admin`** - Full administrative control (NEW)
   - Full CRUD + Approve + Override
   - Manage users and permissions within tenant
   - Add/remove users
   - Assign roles
   - Configure district settings
   - Full reporting access
   - **Scoped to own tenant only** (cannot see other districts)

7. **`master_admin`** - Platform superuser (Alan only)
   - Cross-tenant access
   - Can switch between districts
   - Tenant management (create/delete tenants)
   - Platform-level settings

**Key Distinction:**
- `district_admin`: Full power within their district (e.g., Birdville ISD admin)
- `master_admin`: Platform superuser, cross-tenant (Alan only)

#### 5. MVP vs Phase 2 Permission Strategy

**MVP: Simple Role-Based (Predefined Roles)**

**Approach:** Hardcoded permissions in TypeScript, simple `user_roles` table

**Schema:**
```sql
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id),
  tenant_id text NOT NULL REFERENCES tenants(id),
  role text NOT NULL CHECK (role IN ('student', 'parent', 'teacher', 'counselor', 'registrar', 'district_admin', 'master_admin')),
  scope text DEFAULT 'district', -- 'district', 'campus', 'room'
  scope_id uuid, -- campus_id or room_id if scoped
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id, role)
);
```

**Permissions Logic (Hardcoded):**
```typescript
const ROLE_PERMISSIONS = {
  student: {
    student_demographics: { read: 'own' },
    placement: { read: 'own-days-only' }, // No offense
    attendance: { read: 'own' },
    behavior: { read: 'own-public-only' },
    reviews: { read: 'own' },
  },
  teacher: {
    student_demographics: { read: 'all' },
    placement: { read: 'days-only' }, // No offense codes
    attendance: { read: 'all', create: true, update: 'own' },
    behavior: { read: 'all', create: true, update: 'own' },
    conflicts: { read: 'all' }, // Can see separation rules
  },
  district_admin: {
    all_sections: { read: 'all', create: true, update: 'all', delete: 'all', approve: true, override: true },
    user_management: { read: 'all', create: true, update: 'all', delete: 'all', assign_roles: true },
    reporting: { read: 'all', export: 'all', custom_reports: true },
    district_config: { read: 'all', update: 'all' },
  },
  // ... other roles
};
```

**Phase 2: Granular CRUD Matrix (SharePoint Model)**

**Approach:** Database-driven permissions with full CRUD matrix per section

**Schema:**
```sql
-- Permission Levels (Predefined + Custom)
CREATE TABLE permission_levels (
  id uuid PRIMARY KEY,
  tenant_id text NOT NULL,
  level_name text NOT NULL, -- 'Viewer', 'Contributor', 'Editor', 'Author', 'Administrator', or custom
  is_system_level boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Permission Definitions (CRUD per section)
CREATE TABLE permission_definitions (
  id uuid PRIMARY KEY,
  permission_level_id uuid REFERENCES permission_levels(id),
  resource_section text NOT NULL, -- 'student_demographics', 'placement', 'attendance', etc.
  can_read boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_update_own boolean DEFAULT false,
  can_update_all boolean DEFAULT false,
  can_delete_own boolean DEFAULT false,
  can_delete_all boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  can_override boolean DEFAULT false,
  can_export boolean DEFAULT false,
  UNIQUE(permission_level_id, resource_section)
);

-- User Permission Assignment
CREATE TABLE user_permission_assignments (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES user_profiles(id),
  tenant_id text NOT NULL,
  permission_level_id uuid REFERENCES permission_levels(id),
  scope text DEFAULT 'district',
  scope_id uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tenant_id, permission_level_id, scope)
);
```

**UI Pattern:** SharePoint-style admin panel with tabs for sections (Student Demographics, Placement, Attendance, etc.) and CRUD checkboxes

**Migration Path (MVP → Phase 2):**
1. Create Phase 2 tables (permission_levels, permission_definitions, user_permission_assignments)
2. Migrate existing roles to permission levels (INSERT FROM user_roles)
3. Populate permission_definitions from hardcoded ROLE_PERMISSIONS
4. Update code to check database instead of hardcoded permissions
5. Keep user_roles table for rollback capability

**Result:** Additive upgrade, backward compatible during transition

---

_This document captures the Party Mode review session findings and additional permissions deep dive, serving as a supplement to the Product Brief with detailed clarifications and schema designs for the architecture phase._
