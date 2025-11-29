# Product Brief: DAEP Module for DistrictTracker

**Date:** 2025-11-24
**Author:** Alan
**Context:** Multi-Tenant SaaS Platform - Second Module (TrespassTracker operational, DAEP in development)

---

## Executive Summary

The DAEP (Disciplinary Alternative Education Program) Module transforms manual, error-prone DAEP management into an integrated, data-driven command central. Built as the second module for **DistrictTracker.com** - a multi-tenant SaaS platform for school districts - it replaces Excel spreadsheets, paper binders, and Teams chats with a unified system that ensures data accuracy, reduces teacher burden, and enables predictive intervention.

**Platform Context:** DistrictTracker.com launched with TrespassTracker (proof of concept, now operational) and expands with DAEP Module. Multi-tenant architecture with district-level customization allows each district to configure workflows (points systems, offense codes, review criteria) to match their existing processes rather than forcing process changes.

**Core Value Proposition:** Single source of truth for DAEP operations with automated CSV reconciliation, real-time sync with TrespassTracker, and teacher-friendly workflows that drive adoption through simplicity.

**Success Metric:** Data accuracy - ensuring administrators can trust their data, eliminating the "is this number right?" question that plagues current manual processes.

**Primary Beneficiaries:**
- DAEP administrators (registrars, directors) who currently manually check Focus SIS, update Excel, and wonder if data is accurate
- Teachers who need consistent, time-saving workflows for daily operations (attendance, behavior tracking, points)
- Students and families who benefit from transparent, accurate tracking of placement progress

---

## Core Vision

### Problem Statement

**The Current Reality: Manual Chaos and Data Distrust**

DAEP administrators and staff currently operate in a world of manual reconciliation, disconnected systems, and constant uncertainty about data accuracy:

**Data Integrity Crisis:**
- Registrars manually check Focus SIS daily for student updates
- Manually update BMS (Behavior Management System - Excel spreadsheet)
- Data is "often inaccurate and time-consuming"
- No way to know if enrollment counts, attendance percentages, or recidivism rates are correct
- Multiple systems showing different numbers with no clear source of truth

**Operational Inefficiency:**
- CSV exports from Focus checked by hand
- Academic progress tracked in paper binders
- Staff communication scattered across Microsoft Teams (invisible to admin)
- Reviews conducted with printed CSV files and physical binders
- Grade reports manually generated and emailed

**Teacher Burden Leading to Poor Adoption:**
- If the system is tedious, teachers won't use it consistently
- Manual data entry and complex workflows lead to incomplete records
- Inconsistent tracking means unreliable data downstream

**Integration Complexity:**
- Students can be simultaneously trespassed (1-2 year ban) AND placed in DAEP (educational program)
- No clear linkage between trespass incidents and DAEP placements
- Expiration dates managed separately, leading to sync issues
- Recidivism tracking requires manual counting across multiple placements

**Critical Impact:**
- **Funding at risk**: Attendance data affects ADA (Average Daily Attendance), which drives funding to home campuses
- **Program credibility**: Recidivism rate is the primary success metric - inaccurate data makes the program look worse than reality
- **State reporting**: Inaccurate data reported to Texas education agency influences statewide DAEP policy
- **Resource allocation**: Enrollment counts drive staffing decisions (15:1 ratio)
- **Professional credibility**: Need accurate data to defend program value and justify resources

### Problem Impact

**Quantified Pain Points:**

1. **Time Waste:**
   - Registrar spends hours daily on manual CSV checking and Excel updates
   - Reviews require printing and assembling physical documentation
   - Academic tracking relies on paper binders that must be physically reviewed

2. **Data Accuracy Issues:**
   - Enrollment counts inflated when students return multiple times (double-counting)
   - Attendance percentages off due to incorrect denominators
   - Recidivism rates inaccurate (can't reliably track 1st, 2nd, 3rd visits)
   - "Registrar was out sick, didn't unenroll student in Focus" - no system to catch gaps

3. **Operational Gaps:**
   - 73 students rolled over at beginning of year (complex edge case handling)
   - Start dates don't match actual attendance start (parent can't get off work, student suspended first)
   - No way to catch discrepancies: "Focus shows 73 students, DAEP shows student released 2 days ago"

4. **Compliance Risk:**
   - FERPA audit trail confusion when duplicate records exist
   - State reporting inaccuracies
   - Unable to defend program effectiveness with reliable metrics

### Why Existing Solutions Fall Short

**Current "Solutions" and Their Failures:**

1. **Focus SIS (Student Information System):**
   - ✗ Only tracks enrollment, not DAEP-specific operations
   - ✗ No placement tracking, behavior points, or review workflows
   - ✗ Dates not reliable (home campus assigns start date, student may not start then)
   - ✗ No API or secure FTP export - manual CSV only
   - ✗ DAEP teachers don't have Focus access (teachers of record are home campus)

2. **Excel BMS (Behavior Management System):**
   - ✗ Manual data entry prone to errors
   - ✗ No validation or reconciliation
   - ✗ Can't calculate expiration dates dynamically (absences extend placement)
   - ✗ No audit trail
   - ✗ No role-based access control

3. **Microsoft Teams for Communication:**
   - ✗ Admin has no visibility into operational conversations
   - ✗ "Need paper/pencil in room 504" requests lost in chat
   - ✗ No structured task delegation or completion tracking
   - ✗ Scattered information, no single source of truth

4. **Paper Binders for Academic Tracking:**
   - ✗ Physical assembly required for each review
   - ✗ No digital searchability
   - ✗ No automatic compilation of teacher confirmations
   - ✗ Cumbersome during review meetings

**The Gap:** No system exists that combines DAEP-specific workflows (placement tracking, points, reviews) with automated CSV reconciliation, TrespassTracker integration, and teacher-friendly data entry.

### Proposed Solution

**DAEP Module: Command Central for Data-Driven DAEP Operations**

An integrated module within DistrictTracker that provides:

**Foundation: Data Accuracy Through Automated Reconciliation**
- **CSV Import with "Banking Reconciliation" Logic:**
  - Daily roster CSV + Incident report CSV from Focus SIS
  - Automated duplicate prevention via **Student ID + Incident Number** composite key
  - "Expected vs Actual" dashboard showing discrepancies
  - Flag students in system but not in CSV (trigger registrar action)
  - Flag students in CSV but not in system (pending intake)
  - Manual override capability (corrections not overwritten by next import)

- **Single Source of Truth with TrespassTracker:**
  - Shared tables: students, campuses, tenants, user_profiles
  - DAEP-specific tables linked via foreign keys
  - `trespass_records.is_daep` flag + `daep_expiration_date` field
  - Real-time sync (not batch) when absences extend placement
  - One expiration date, always the furthest out

**Core Operations: Teacher-Friendly Daily Workflows**
- **Points System (110 points/day):**
  - Attendance-based accrual: Present at period = automatic points
  - Teacher quick-tap interface: Dropdowns, not typing
  - Categorized behavior notes for data analysis
  - Auto-calculation prevents errors
  - Admin approval workflow for overly zealous teachers

- **Attendance Tracking (Period-Based):**
  - 9:30am count (matches Texas state reporting)
  - Unexcused absence = +1 day to end date (auto-extends)
  - Excused absence (doctor's note) = does NOT extend
  - Partial credit: 10 points per period attended

- **Review Process:**
  - Digital checklist guides in-person conversation
  - Student self-assessment workflow
  - Teacher digital initials on assignments
  - "What's left" visibility for students
  - Automated grade report generation + notification on approval

**Operational Intelligence: Predictive Intervention**
- **Pattern Detection (Phase 2):**
  - Student had head down for 3 periods → alert admin
  - Student didn't earn 100 points for 3+ consecutive days → intervention
  - Proactive vs reactive: Intervene BEFORE Code Yellow

- **Dashboard as Command Central:**
  - Daily meeting prep view: Intakes, conflicts, medical notes
  - Notification bell with role-filtered pending actions
  - Replace Teams with in-system messaging (admin visibility)

**Placement Lifecycle Management**
- **Intake Workflow:**
  - Digital intake, room assignment with conflict management
  - iPad signature capture (acknowledgement, counseling, trespass forms)
  - Actual start date set after intake (not from Focus)

- **Room Management Intelligence:**
  - Student separation rules: "Student A can't be in Room 503 because of Student B"
  - Conflict tracking across rooms, hallways, lunch periods
  - Room leveling/balancing functionality

- **End Date Calculation:**
  ```
  Actual End Date =
    Actual Start Date (set after intake)
    + Placement Days Assigned
    + Days Extended (unexcused absences)
    - Days Earned (community service @ 100 pts = 1 day)
    [School days only - skip weekends/holidays]
  ```

**Reporting & Analytics:**
- **Recidivism Tracking:**
  - Placement number (1st, 2nd, 3rd visit) per student per year
  - Time between placements
  - Recidivism rate by campus, offense type, demographics

- **Campus Comparison Reports:**
  - Which campuses send what types of offenses
  - Placement duration by campus
  - Defense reports: "DAEP attendance vs home campus attendance"

- **Custom Report Builder:**
  - Save and share reports via link
  - Filter by campus, offense, date range, demographics

### Key Differentiators

**What Makes This Solution Unique:**

1. **Reconciliation-First Mindset:**
   - "Looking for that penny" approach
   - Flag discrepancies, don't hide them
   - Manual override capability with audit trail
   - Trust but verify

2. **Teacher Efficiency = Data Quality:**
   - Quick-tap interfaces, not forms
   - Automatic calculations
   - Minimal burden = consistent use = reliable data
   - If teachers find it tedious, adoption fails

3. **Seamless Integration, No Duplication:**
   - Shared tables with TrespassTracker
   - No duplicate student records
   - One expiration date, synced in real-time
   - Incident ID prevents double-counting

4. **Predictive, Not Just Reactive:**
   - Early intervention alerts (3 bad periods → notify admin)
   - Pattern detection for at-risk students
   - Proactive support before crisis

5. **Digital + Human Connection:**
   - Checklists guide conversations, don't replace them
   - Structure without rigidity
   - In-person review meetings remain essential

6. **Rollover Student Handling:**
   - Year-end "clock out" / new year "clock in"
   - Recidivism per school year (not lifetime)
   - Continuation placements tracked correctly

---

## Target Users

### Primary Users

**DAEP Administrators (Registrars, Directors)**

**Current State:**
- Spend hours daily manually checking Focus SIS and updating Excel
- Question whether data is accurate
- Print CSV files and assemble paper binders for reviews
- Make critical decisions (staffing, resource allocation) based on uncertain data

**Pain Points:**
- "Is this enrollment number correct?"
- "Did I miss updating someone who returned to campus?"
- "How do I know the recidivism rate is right?"
- Manual reconciliation errors lead to funding and credibility issues

**What They Need:**
- Dashboard that shows data health (expected vs actual)
- Confidence in metrics for reporting to stakeholders
- Automated workflows that catch operational gaps
- Single source of truth for all DAEP data

**Success Looks Like:**
- Walk into a meeting with the superintendent with 100% confidence in the data
- Catch discrepancies immediately ("registrar out sick" scenario)
- Generate reports in minutes, not hours
- Defend program value with accurate recidivism rates

**DAEP Teachers**

**Current State:**
- Use Teams for operational communication (admin has no visibility)
- Manual points tracking
- Inconsistent behavior note entry
- No clear workflow for academic progress documentation

**Pain Points:**
- "This system is tedious, I won't use it consistently"
- Typing-heavy interfaces slow them down
- No guidance on what to document
- Communication scattered, no task completion tracking

**What They Need:**
- Quick-tap interfaces: Buttons, not forms
- Automatic point calculations from attendance
- Dropdown selections for behavior categories (data analysis downstream)
- Clear task delegation: "Check on Student X in room 504" with checkbox completion

**Success Looks Like:**
- Enter behavior notes in 30 seconds, not 5 minutes
- Points automatically calculated, no math errors
- Tasks assigned by admin, mark complete when done
- Admin can see all staff conversations (transparency)

### Secondary Users

**Home Campus Administrators**

**Current State:**
- Receive return notifications via registrar email forwarding
- Schedule transition meetings for returning students
- Limited visibility into DAEP progress

**What They Need (Phase 2):**
- Read-only access to DAEP rubric and student progress
- Notification when student returns to campus
- Upload transition form to close the loop
- Enter meeting date (date picker) + upload transition document

**Success Looks Like:**
- Know exactly when student returns
- Prepared for transition meeting
- Documentation stored digitally (accountability)

**Students and Parents**

**Current State:**
- No visibility into points, days remaining, or progress
- Receive behavior notes inconsistently
- Unclear what's needed to complete placement successfully

**What They Need (Phase 1 Basic, Phase 2 Enhanced):**
- View own points, days left, behavior notes (if marked visible)
- "What's left" visibility: Clear checklist of what's needed
- Motivational transparency: "You have 3 days left!"

**Success Looks Like:**
- Student can answer: "What do I need to do to go home?"
- Parents can see progress without calling registrar
- Transparent criteria enable motivational conversations

---

## Success Metrics

### North Star Metric

**Data Accuracy - Elimination of "Is This Right?" Questions**

**How We'll Measure:**
1. **Reconciliation Success Rate:**
   - % of CSV imports with zero discrepancies
   - Time to resolve flagged discrepancies (target: < 5 minutes)

2. **Administrator Confidence:**
   - Subjective: "Do you trust this data to present to stakeholders?" (Yes/No)
   - Frequency of manual data double-checking (target: eliminate)

3. **Data Integrity Validation:**
   - Enrollment count matches Focus SIS ±0 students
   - Recidivism rate calculation verified against manual count (target: 100% match)
   - No duplicate placement records (Student ID + Incident Number uniqueness enforced)

### Key Performance Indicators

**Operational Efficiency:**
- **Registrar Time Saved:** Hours per week on manual CSV checking and Excel updates (baseline: ~10 hours/week, target: <1 hour/week)
- **Review Preparation Time:** Minutes to prepare for review meeting (baseline: 30 min, target: 5 min)
- **Report Generation Time:** Minutes to generate recidivism report (baseline: hours, target: <5 min)

**Teacher Adoption & Efficiency:**
- **Behavior Note Entry Time:** Seconds per note (target: <30 seconds)
- **Consistent Daily Use:** % of teachers logging behavior notes daily (target: >90%)
- **Point Calculation Errors:** Count of manual corrections needed (target: 0)

**Data Quality:**
- **Expiration Date Accuracy:** % of students with correctly calculated end dates (target: 100%)
- **Attendance Sync Success:** % of daily attendance records synced without errors (target: 100%)
- **Audit Trail Completeness:** % of actions logged to admin_audit_log (target: 100%)

**Program Outcomes (Baseline for Future):**
- Recidivism Rate: Current baseline 15.3% (for comparison post-implementation)
- Average time between placements (for pattern analysis)
- Student placement completion rate

### Business Objectives

**Short-Term (MVP Launch):**
1. **Operational Foundation:** Replace manual Excel BMS with integrated DAEP module
2. **Data Trust:** Eliminate "is this number right?" questions for administrators
3. **Teacher Buy-In:** Achieve >85% daily teacher usage within first month

**Medium-Term (Phase 2-3):**
4. **Efficiency Gains:** Reduce registrar administrative burden by 80%
5. **Enhanced Decision-Making:** Enable data-driven intervention strategies
6. **Stakeholder Confidence:** Present program metrics with full confidence to district leadership

**Long-Term (Future Vision):**
7. **Predictive Success:** Reduce recidivism through early intervention (pattern detection)
8. **Statewide Impact:** Provide accurate data to Texas education agency for policy decisions
9. **Multi-District Adoption:** Expand to other districts with proven success metrics

---

## MVP Scope

**Guiding Principle:** Build the foundation that ensures data accuracy and teacher adoption. Without accurate data, nothing else matters. Without teacher buy-in through simple workflows, data won't be entered consistently.

### Core Features

**Priority Tier 1: Data Foundation (Without this, MVP doesn't work)**

**1. District Configuration Admin Panel**
- **Why it's critical:** Different districts have different workflows. Forcing process changes kills adoption.
- **Capabilities:**
  - **Behavior Tracking System Selection:**
    - Points-based (e.g., 100 points/day, 110 points/day)
    - Color-tier system (gold, green, pink, intervention)
    - Custom point values per period
  - **Offense Code Management:**
    - Upload Texas PEIMS codes (state-mandated, updated annually)
    - Map offense codes to descriptions
    - Set default placement durations per offense type
    - Per-state or per-district customization capability
  - **Review Criteria Configuration:**
    - Define 3-pillar criteria (attendance, academics, behavior)
    - Set thresholds:
      - Attendance minimum percentage (e.g., >85%, with admin override for illness/COVID)
      - Total points required for completion (days assigned × points/day)
      - Points required for early review (e.g., 2000 points for 20-day review in 30-day placement)
      - Behavior criteria (subjective, admin review decision)
      - Academic participation (captured via daily points)
    - Customize review eligibility rules (15-day review, 20-day review, etc.)
    - **Admin override capability:** For compassionate cases (illness, extenuating circumstances)
  - **Notification Preferences:**
    - Advance notice days (3, 5, or 7 days for review alerts)
    - Role-based notification routing
  - **Academic Calendar:**
    - School holidays (for expiration date calculation)
    - District-specific non-school days
  - **Period Structure:**
    - Number of periods per day
    - Lunch and break schedules
    - Attendance checkpoint time (e.g., 9:30am for state reporting)
- **Implementation:** Configuration set during district onboarding, updatable by district admin
- **Your District Logic:** Default configuration templates based on your district's 110-point system, PEIMS codes, and workflows

**2. CSV Import with Banking Reconciliation**
- **Why it's critical:** Foundation of data accuracy. Eliminates "is this right?" questions.
- **Two CSV Import Processes:**
  - **CSV #1: Daily DAEP Roster** (who's currently placed)
    - Student ID, Name, Grade, Campus, Current enrollment
    - Students appear EVERY DAY they're placed (whether absent or present)
    - Purpose: Sync current enrollment, detect students who returned home
  - **CSV #2: Discipline Incident Report** (with incident IDs)
    - Student ID, **Incident ID Number** (unique deduplication key), Offense Code, Placement days, Assigned start date
    - Incident ID prevents duplicate placement records
- **Import Logic:**
  - New student NOT in system → Create student record, await intake
  - Existing student, same incident ID → Skip (already imported)
  - Existing student, NEW incident ID → Create new placement, increment visit count
  - Student in system but NOT in CSV → Flag for registrar reconciliation
- **Reconciliation Dashboard:**
  - "Expected vs Actual" view
  - Flag discrepancies with pending action for registrar
  - Manual override capability (corrections persist across imports)
  - Import error log with specific row failures
- **Validation Rules:**
  - Missing incident ID → Flag row, skip import, notify user
  - Duplicate incident IDs across students → Reject both, notify admin
  - Student ID format mismatches (leading zeros) → Flag with error message
  - Date inconsistencies → Block (end before start) or allow with warning (start in past)

**3. Student & Placement Core Data Model**
- **Student Records:**
  - Student ID, Name, DOB, Gender, Race/Ethnicity, Grade
  - Home campus, Address
  - Guardian info (primary + secondary contacts)
  - Synced from CSV import or manual entry at intake
- **Placement Records:**
  - Linked to student + trespass_record (if applicable)
  - Offense code, description, placement reason
  - Start date (actual, set after intake), planned end date, actual end date
  - Days assigned, days served (calculated), days owed, days earned
  - Placement number (1st, 2nd, 3rd visit - recidivism tracking)
  - Current roster room
  - Status: active, completed, withdrawn
  - Progress percentage (visual indicator)
- **TrespassTracker Integration:**
  - Shared tables: tenants, campuses, user_profiles
  - `trespass_records.is_daep` flag + `daep_expiration_date` field
  - Foreign key: `daep_placements.trespass_record_id → trespass_records.id`
  - Real-time sync of expiration dates (not batch)

**4. Attendance Tracking (Period-Based)**
- **Daily Attendance Capture:**
  - By room roster
  - Status: Present, Absent, Tardy, Excused
  - Period-level tracking (for partial day credit)
  - 9:30am checkpoint (matches Texas state reporting)
- **Impact on Placement:**
  - Unexcused absence → Auto-extend end date by 1 day
  - Excused absence (doctor's note) → No extension
  - Partial credit: 10 points per period attended
  - Early dismissal: Excused with note = partial points, Unexcused = 0 points + extends placement
- **Attendance Recording Interface:**
  - Bulk entry by roster (take whole room at once)
  - Individual student quick edit
  - Mobile-responsive for iPad use

**5. Points & Behavior Tracking System**
- **Points Structure (Configurable per District):**
  - Default: 110 points/day (7 periods + 2 breaks + lunch + check-in)
  - Attendance-based accrual: Present at period = automatic points earned
  - Teacher deductions for misbehavior
  - Running balance displayed prominently
  - **Total points calculation:** Days assigned × points/day = total required (e.g., 20 days × 100 pts = 2000 points)
- **Behavior Notes:**
  - Quick-tap interface: 3-4 dropdowns max (30-second entry target)
    - Points adjustment dropdown (+/- 5, +/- 10, or 0)
    - Student action dropdown (On Task, Helping Others, Disruption, etc.)
    - Teacher action dropdown (Verbal Warning, Parent Contact, Positive Recognition, Redirect, etc.)
    - Optional free-text note field
  - **Privacy Controls:**
    - **Private notes:** Staff-only (for operational communication between teachers/admin)
    - **Public notes:** Visible to students and parents (motivational, informational)
    - Toggle: "Make this note public" (default: private)
- **Teacher Approval Workflow:**
  - Default: Private notes immediately visible to staff, public notes visible to families
  - **Pre-approval list:** Admin can flag specific teachers requiring approval for public notes
  - Teacher on pre-approval list: Public notes stay private until admin reviews and approves
  - Prevents inflammatory or poorly-worded comments reaching families
  - Admin dashboard shows: "X public notes pending approval"
- **Auto-Calculation:**
  - Points from attendance + behavior adjustments
  - No manual math (eliminates errors)
  - Alert if student doesn't earn minimum threshold points for 3+ consecutive days (configurable threshold)

**6. Placement Lifecycle & Expiration Calculation**
- **Intake Workflow:**
  - Scheduled intake appointment (from pending CSV import or manual entry)
  - Digital intake form capture
  - Room assignment with conflict management
  - Actual start date set via calendar picker (not from Focus CSV)
- **Room Assignment Intelligence:**
  - Student separation rules: Flag conflicts ("Student A can't be in Room 503 with Student B")
  - Conflict tracking: Rooms, hallways, lunch periods
  - Room capacity limits and leveling suggestions
- **End Date Calculation Engine:**
  ```
  Actual End Date =
    Actual Start Date (set after intake)
    + Placement Days Assigned
    + Days Extended (unexcused absences)
    - Days Earned (community service @ 100 pts = 1 day, monthly cap)
    [School days only - skip weekends/holidays from district calendar]
  ```
- **Community Service Tracking:**
  - Yes/No toggle (not manual point entry to prevent inflation)
  - Fixed 100-point bonus per completion
  - Monthly cap (1 service day per month)
  - Required documentation note (e.g., "Food bank 10/21")
- **Placement Status Management:**
  - Active → Completed (successful return)
  - Active → Withdrawn (transfer, expulsion, incomplete)
  - Track days owed for incomplete placements
- **Sync to TrespassTracker:**
  - Real-time update of `trespass_records.daep_expiration_date`
  - Triggered on: attendance logged, absence recorded, community service added
  - `is_daep` checkbox toggles ON when placed, OFF when returned to campus

**Priority Tier 2: Daily Operations (MVP must support basic workflows)**

**7. Intake Scheduling & Workflow**
- **Why it's critical:** Daily operational process from CSV import to student starting placement
- **Scheduled Intake Management:**
  - Pending intakes list (students approved in Focus, not yet intake scheduled)
  - Calendar picker to schedule intake appointment (date + time)
  - Intake queue view (Today / Tomorrow tabs on dashboard)
  - Intake appointment details: Student name, Student ID, Campus, Incident code, Scheduled time
- **No-Show Tracking:**
  - "No Show" button on scheduled intake
  - Triggers reschedule action (add to pending actions)
  - Track no-show count per student (if pattern emerges)
  - **Escalation workflow:**
    - After X no-shows (configurable, e.g., 2-3), adds task to teacher notification tab
    - Task: "Parent contact needed for [Student Name] (no-show follow-up)"
    - Teacher marks task as complete with note documenting contact attempt/outcome
    - **Admin monitoring:** Dashboard shows "Teachers with pending parent contacts"
    - Teacher dashboard shows overdue tasks: "1 parent contact overdue (2 days past due)"
    - Enables admin intervention during end-of-day meetings: "These 3 teachers need to make contacts before Friday"
- **Conducting Intake:**
  - Digital intake form (basic MVP version):
    - Confirm student demographics (from CSV)
    - Confirm guardian contact info
    - Add/update secondary contacts if needed
    - Record placement details:
      - Offense code (from CSV, confirm or adjust)
      - Days assigned (from CSV, confirm or adjust)
      - **Actual start date** (calendar picker - critical, not from Focus)
      - Placement reason (text field)
    - Room assignment (dropdown, with conflict checks)
  - Mark intake as complete
  - Creates active placement record
  - Removes from scheduled intake list
- **Post-Intake Actions:**
  - Calculate planned end date (actual start date + days assigned)
  - Add student to room roster
  - Update `trespass_records.daep_expiration_date` if linked
  - Notify teachers of new student (notification bell)
- **No-Show Resolution:**
  - Reschedule intake (new date/time)
  - Parent contact documentation (log call attempts)
  - Escalation after X no-shows (configurable, e.g., 2-3 no-shows)

**8. Dashboard Overview**
- **KPI Cards:**
  - Student Enrollment (current count)
  - Active Placements
  - Attendance Rate (aggregate)
  - Recidivism Rate (students with >1 placement / total students)
- **Scheduled Intakes Section:**
  - Today / Tomorrow tabs
  - Intake time, student name, student ID, campus, incident code
  - "No Show" status button (triggers reschedule action)
  - Click on intake card → Opens intake workflow
- **Pending Actions Panel:**
  - Color-coded alerts:
    - No-shows needing reschedule
    - Review dates approaching (configurable advance notice)
    - Intake scheduled
    - Students pending intake (approved but not scheduled)
  - Notification bell with role-filtered pending actions

**9. Room Rosters View**
- **Room Selector:**
  - Dropdown to select room (e.g., Room 501)
  - Room summary: Student count, average points
- **Student Cards by Room:**
  - Avatar, name, student ID
  - Days Served / Days Remaining
  - Current points (color-coded: green 85+, orange 70-84, red <70)
  - Recent behavior note display
  - Quick actions: "View Details", "Attendance", "Add Note"
- **Mobile-Responsive:**
  - Works on iPad mini for hallway use
  - Quick lookup by room or student name
  - Large display of days remaining + current points for motivational conversations

**10. Students List (Master View)**
- **Search & Filter:**
  - Search by name, student ID, or roster
  - Filter by: Status (Active, At Risk, Completed, Pending Intake), Grade, Roster, Date range
  - Export button (Excel/PDF)
- **Table Columns:**
  - Student (avatar + name + enrolled date)
  - Student ID
  - Grade
  - Roster (room assignment, "Pending Intake" if not yet assigned)
  - Attendance (percentage, color-coded)
  - Discipline (incident count - KEY for recidivism)
  - Status badge (Active, At Risk, Completed, Pending Intake)
- **Pagination:**
  - Showing X of Y students
  - Previous / Next navigation

**11. Student Detail Panel**
- **Right-side Drawer (Sheet component):**
  - Opens from students list, roster view, or scheduled intake
- **Overview Tab:**
  - Student information (DOB, gender, race/ethnicity, grade)
  - Contact information (address)
  - Guardian information (primary + secondary)
  - Performance metrics (attendance rate, discipline count, status)
  - Edit Student button
  - Add New Placement button
  - **If Pending Intake:** "Schedule Intake" or "Conduct Intake" button (depending on status)
- **Placement History Tab (CRITICAL for Recidivism):**
  - Placement overview card:
    - Badge: "2nd Time" (indicates repeat offender)
    - Total Placements, Active count, Days Owed
  - Current placement card (ACTIVE badge):
    - Offense code + description (e.g., "Code 02 - Insubordination")
    - Start date, Days served/assigned, Days remaining (red if >30)
    - Placement reason (text)
    - Home campus
    - Progress bar (% complete)
  - **Pending Intake card (if applicable):**
    - Shows: Incident code, Days assigned (from CSV), Scheduled intake date/time
    - "Conduct Intake" button
  - Previous placements (accordion, newest first):
    - Complete badge (green)
    - Start/end dates
    - Offense code
    - Days served
    - Final status
  - Recent behavior notes within placement context

**12. Review Process (Basic)**
- **Review Eligibility Notification:**
  - Notification when student reaches review eligibility (e.g., 15 days served of 30-day placement)
  - Configurable advance notice (3, 5, or 7 days)
  - Notification bell for admins
- **Digital Review Checklist:**
  - 3 pillars: Attendance, Academics, Behavior
  - Pre-populated data for each pillar
  - Admin decision: Approve return or continue placement
  - Optional notes field
- **Post-Review Actions:**
  - Approve return → Generates grade report (PDF)
  - Send return notification (to registrar)
  - Set actual end date
  - Mark placement status = completed
  - Student returns to home campus next school day

**13. Basic Reporting**
- **Pre-Built Reports:**
  - Monthly Enrollment Summary
  - Daily Attendance Summary
  - Incident Summary Report
  - **Recidivism Rate Analysis (CRITICAL)**
- **Report Output:**
  - Excel export (following TrespassTracker pattern)
  - PDF export
  - Downloadable from "Recent Reports" list
- **Recidivism Calculation:**
  - Total unique students (historical)
  - Students with multiple placements (placement_number > 1)
  - Recidivism rate percentage
  - Time between placements (average)
  - Breakdown by: Demographics, campus, offense type

**14. Role-Based Access Control**
- **Roles (Reusing TrespassTracker hierarchy):**
  - `viewer` - Read-only, assigned campus only
  - `campus_admin` - Full CRUD for assigned campus
  - `district_admin` - Full CRUD for all campuses in tenant (most DAEP admins)
  - `master_admin` - Cross-tenant access (Alan only)
- **DAEP-Specific Permissions:**
  - Teachers: Add behavior notes, record attendance (room-level access)
  - Registrars: CSV import, intake scheduling, conduct intakes, reconciliation dashboard
  - Administrators: Reviews, placement management, reporting
- **Granular Feature-Level Permissions (New):**
  - **Pattern:** Similar to Focus/Skyward - pull up user, assign per-feature access (read/write/edit/view)
  - **Permissions to configure per user:**
    - `can_approve_community_service` (admin, counselor, department chair)
    - `can_conduct_intakes` (registrar, admin)
    - `can_edit_placements` (admin only)
    - `requires_behavior_note_approval` (flagged teachers requiring pre-approval for public notes)
    - `can_view_private_notes` (all staff)
    - `can_override_review_criteria` (admin only)
  - **Implementation:** Stored in `user_profiles` or separate `user_permissions` table
  - **Admin UI:** User management panel with checkboxes/toggles per permission
  - **Syncs to Supabase RLS:** Permissions enforced at database level
- **RLS Policies:**
  - All queries auto-filtered by tenant_id
  - Campus-scoped access for campus_admin and viewer roles
  - Feature-level permissions checked on mutations
  - Audit trail for all admin actions (including intake completions, no-shows, permission changes)

**Priority Tier 2.5: Student/Parent Portal (Moved from Tier 3 - CRITICAL for MVP)**

**15. Student/Parent Portal (Basic View)**
- **Why moved to MVP:** Transparency enables motivational conversations and student accountability (core to program success)
- **Student View:**
  - Own points balance (large, prominent display)
  - Days remaining (visual countdown)
  - Behavior notes (only public notes marked visible)
  - Attendance record (daily status)
  - **Purpose:** Daily check-in, self-monitoring, motivation
- **Parent View:**
  - Same as student view
  - Cannot edit anything
  - Read-only access
  - **Purpose:** Family engagement, transparency
- **Access:**
  - Digital login (web-based, mobile-responsive)
  - No printed reports (always digital)
- **Privacy:**
  - Only public notes visible (private staff notes hidden)
  - Only own student data visible (multi-tenant isolation)

**Priority Tier 3: MVP Nice-to-Haves (Include if time allows)**

**16. Daily Meeting Prep View**
- **"Command Central" Quick Button:**
  - Opens focused view for daily end-of-day meeting
  - Shows: Intakes scheduled (tomorrow), Conflict/separation alerts, Medical notes
  - Staff-only notes (not visible to parents/students)
  - Quick-tag students for operational planning

**17. Email Notifications (Manual Trigger)**
- **Review Completion Notification:**
  - Sent to registrar when review approved
  - Includes: Student name, return date, grade report attachment
  - Registrar manually forwards to campus admin + parents (using existing Outlook distribution lists)
- **No Automatic Email:** All notifications in-app via dashboard (MVP keeps it simple)

### Out of Scope for MVP

**Explicitly NOT in MVP (Future Phases):**

1. **Predictive Code Yellow Alerts:**
   - Pattern detection (3 bad periods → alert admin)
   - Highest impact potential but requires baseline data collection first
   - Defer to Phase 2

2. **Internal Staff Communication (Replace Teams):**
   - In-system messaging with admin visibility
   - Task delegation and completion tracking
   - Defer to Phase 2 (current Teams workflow continues)

3. **Academic Tracking in Dashboard:**
   - Teacher digital initials on assignments
   - "What's left" visibility for students
   - Student self-assessment workflow
   - Defer to Phase 2 (reviews use existing process with digital checklist)

4. **Advanced Reporting:**
   - Custom report builder (save and share reports)
   - Campus comparison reports (offense types, placement duration)
   - Performance defense reports (DAEP vs home campus attendance)
   - Defer to Phase 2 (pre-built reports sufficient for MVP)

5. **Gamification:**
   - Badges, streaks, peer recognition
   - Non-stakes motivational features
   - Defer to Phase 3

6. **Home Campus Read-Only Access:**
   - View rubric and student progress
   - Upload transition form
   - Defer to Phase 2

7. **iPad Digital Signatures:**
   - Intake forms (acknowledgement, counseling, trespass)
   - Defer to Phase 2 (paper forms continue)

8. **Advanced Intake Features:**
   - Photo upload (JWT token from Focus)
   - Barcode scanning on student IDs
   - Voice search
   - Defer to Phase 2+

9. **Focus API Integration:**
   - Replace CSV with real-time sync
   - Webhook notifications when student approved
   - Future: When Focus supports API/FTP (not available yet)

10. **Exit Survey Integration:**
    - Digital survey required before review completion
    - Track metrics over time
    - Defer to Phase 3

### MVP Success Criteria

**The MVP is successful if:**

1. **Data Accuracy Achieved:**
   - CSV import reconciliation catches 100% of discrepancies
   - Enrollment count matches Focus SIS within ±0 students
   - Zero duplicate placement records (Student ID + Incident Number enforcement works)
   - Admin says: "I trust this data to present to stakeholders"

2. **Teacher Adoption Secured:**
   - >85% of teachers use system daily for behavior notes within first month
   - Behavior note entry time <30 seconds (measured via observation)
   - Teachers say: "This is easier than what we had before"

3. **Registrar Efficiency Gained:**
   - Time spent on manual CSV checking reduced from ~10 hours/week to <1 hour/week
   - Review preparation time reduced from 30 minutes to <5 minutes
   - Registrar says: "I can catch operational gaps immediately"

4. **Core Workflows Operational:**
   - CSV import runs daily without blocking
   - Attendance recorded daily for all students
   - Expiration dates calculated automatically and accurately
   - Placements progress from intake → active → review → completed

5. **Integration with TrespassTracker Works:**
   - `daep_expiration_date` syncs in real-time to trespass_records
   - No data duplication between modules
   - Recidivism tracking counts incidents across both systems
   - Single source of truth maintained

### Future Vision Features

**Phase 2: Operational Intelligence (Post-MVP)**
- Predictive Code Yellow alerts (pattern detection)
- Internal staff communication (replace Teams)
- Academic tracking with "what's left" student visibility
- Student self-assessment in review workflow
- Home campus read-only access with transition form upload
- iPad digital signature capture
- Advanced task delegation and completion tracking

**Phase 3: Analytics & Enhancement (6+ months)**
- Custom report builder (save and share)
- Campus comparison and defense reports
- Predictive recidivism analytics (what patterns predict success?)
- Teacher/room effectiveness analytics
- Gamification (badges, streaks, peer recognition)
- Shareable report links for district stakeholders

**Phase 4: Ecosystem Integration (Future)**
- Focus API integration (when available)
- Direct SIS sync replacing CSV
- Exit survey integration
- Voice search and barcode scanning
- Multi-state PEIMS code support
- Advanced mobile app (native iOS/Android)

---

## Technical Preferences

### Multi-Tenant Architecture

**Platform:** DistrictTracker.com is a multi-tenant SaaS application

**Tenant Isolation:**
- Subdomain-based routing (e.g., `birdville.districttracker.com`, `district2.districttracker.com`)
- Row-Level Security (RLS) policies on all tables
- All queries auto-filtered by `tenant_id`
- Shared infrastructure: Clerk auth, Supabase database, Vercel deployment

**District Customization Model:**
- **Configuration at Onboarding:**
  - Admin panel for district configuration during rollout
  - Select behavior tracking system (points-based vs color-tier)
  - Upload offense codes (PEMS codes or custom)
  - Define review criteria and thresholds
  - Set period structure and academic calendar
- **Ongoing Updates:**
  - District admins can update configuration anytime
  - Changes affect future placements only (not historical data)
  - Configuration versioning for audit trail
- **Default Templates:**
  - Your district's 110-point system as default template
  - Texas PEIMS codes as default offense code set
  - Other districts customize during onboarding

**Shared vs Module-Specific Tables:**
- **Shared (TrespassTracker + DAEP):**
  - `tenants`, `campuses`, `user_profiles`, `admin_audit_log`
- **DAEP-Specific (Linked via FK):**
  - `daep_students`, `daep_placements`, `daep_attendance`, `daep_behavior_notes`
  - `daep_guardians`, `daep_offense_codes`, `daep_room_assignments`
  - `daep_district_config` (stores district-specific workflow settings)
  - `district_school_calendar` (school days, holidays, weather cancellations)
  - `user_permissions` or extended `user_profiles` (granular feature-level access control)

**Critical Schema Notes (for Architecture Phase):**

**daep_district_config table structure:**
```
daep_district_config
  - id (PK)
  - tenant_id (FK to tenants)
  - behavior_system_type ('points' | 'color-tier')
  - points_per_day (if points-based, e.g., 110)
  - points_threshold_total (total points = days × points/day)
  - points_threshold_review (points needed for early review)
  - review_criteria (JSON: attendance_min_pct, behavior_subjective, academic_participation)
  - period_structure (JSON: number of periods, break times, lunch schedule)
  - attendance_checkpoint_time (time, e.g., '09:30:00' for Texas state reporting)
  - no_show_escalation_count (integer, e.g., 2-3 no-shows triggers parent contact task)
  - notification_advance_days (integer, e.g., 3, 5, or 7 days for review alerts)
  - created_at, updated_at
  - UNIQUE(tenant_id)
```

**district_school_calendar table structure:**
```
district_school_calendar
  - id (PK)
  - tenant_id (FK to tenants)
  - calendar_date (date)
  - is_school_day (boolean)
  - reason (text: 'Holiday - Thanksgiving', 'Weather - Ice Storm', NULL if regular school day)
  - created_at, updated_at
  - UNIQUE(tenant_id, calendar_date)
```

**user_permissions (or extend user_profiles):**
```
user_permissions
  - user_id (FK to user_profiles)
  - tenant_id (FK to tenants)
  - can_approve_community_service (boolean, default: false)
  - can_conduct_intakes (boolean, default: false)
  - can_edit_placements (boolean, default: false)
  - requires_behavior_note_approval (boolean, default: false)
  - can_view_private_notes (boolean, default: true for staff)
  - can_override_review_criteria (boolean, default: false)
  - created_at, updated_at
  - UNIQUE(user_id, tenant_id)
```

**Performance Indexes (Critical):**
- `daep_placements`: Composite index on (days_served, status, tenant_id) for review eligibility queries
- `daep_placements`: Index on (tenant_id, status) for active placement filtering
- `daep_attendance`: Composite index on (attendance_date, tenant_id) for daily attendance queries
- `daep_behavior_notes`: Index on (student_id, created_at) for recent notes retrieval
- `district_school_calendar`: Composite index on (tenant_id, calendar_date, is_school_day) for expiration calculations
- **ALL tables:** Index on tenant_id for RLS performance

### Technology Stack

**Frontend:**
- Next.js 15 App Router with React Server Components
- React 19 with Suspense and Transitions
- TypeScript 5.9+ (strict mode)
- Radix UI component primitives (28 packages)
- Tailwind CSS with custom design system
- shadcn/ui component library

**Backend:**
- Next.js Server Actions (primary API layer)
- REST API routes for webhooks/cron jobs
- Supabase PostgreSQL with Row-Level Security
- Clerk authentication (invite-based, SSO planned)

**Infrastructure:**
- Vercel deployment (production)
- Supabase (database + storage)
- Clerk (authentication + user management)
- Upstash Redis (rate limiting)

**Security:**
- Comprehensive CSP headers
- FERPA-compliant audit logging
- Input validation (Zod schemas)
- Rate limiting on all mutations

### Integration Requirements

**TrespassTracker Module:**
- Foreign key relationships between modules
- Real-time expiration date sync (not batch jobs)
- Shared authentication and authorization
- Unified audit logging
- Cross-module reporting capabilities

**Focus SIS (Current State):**
- Manual CSV export (2 files: daily roster + incident report)
- No API or FTP available (district using Focus currently)
- Future: API integration when Focus supports it

**Email (Future):**
- SMTP configuration per tenant
- Currently: Manual email forwarding via registrar's Outlook

### Mobile Considerations

**Responsive Web (MVP):**
- Mobile-responsive layout for all views
- iPad mini support for hallway use (room rosters, behavior notes)
- Touch-optimized interfaces
- No native app required

**Future Native App (Phase 4):**
- iOS/Android native apps for enhanced mobile experience
- Push notifications
- Offline capability for attendance taking

---

## Organizational Context

### Platform Evolution

**Phase 1: Proof of Concept**
- Built TrespassTracker module as first module
- Validated multi-tenant architecture
- Established shared infrastructure (Clerk, Supabase, RLS)
- Operational with paying customer (Birdville ISD)

**Phase 2: Module Expansion (Current)**
- Building DAEP Module as second module
- Leveraging proven architecture from TrespassTracker
- Focus on district configurability for multi-tenant growth

**Phase 3: Platform Maturity (Future)**
- Additional modules (attendance tracking, behavior management, etc.)
- Cross-module analytics and insights
- Expanded district adoption

### Development Resources

**Solo Developer (Alan):**
- Full-stack development (Next.js, React, TypeScript, Supabase)
- Domain expert (DAEP administrator at Birdville ISD)
- Design and UX
- DevOps and deployment

**Time Availability:**
- Dedicated: Thanksgiving break (current)
- Ongoing: Weekends during school year
- Need to scope MVP realistically for available time

**AI-Assisted Development:**
- Leveraging Claude Code for development acceleration
- BMAD Method for structured planning
- Bolt.new for UI mockup prototyping

### Strategic Alignment

**District Adoption Strategy:**
- Start with own district (Birdville ISD) as pilot
- Refine based on real-world usage
- Expand to other Texas districts with similar DAEP requirements
- District customization critical for broader adoption (not forcing process changes)

**Revenue Model:**
- Multi-tenant SaaS subscription
- Per-district pricing (TBD)
- Potential per-module add-ons

**Competitive Positioning:**
- Most school district software is legacy, clunky, desktop-only
- Modern web-first approach with mobile responsiveness
- District configurability (not one-size-fits-all)
- Integrated modules (TrespassTracker + DAEP + future) in single platform

---

## Risks and Assumptions

### Critical Assumptions

1. **CSV Import Reliability:**
   - **Assumption:** Focus SIS exports are consistent and reliable (format doesn't change)
   - **Risk:** Focus changes CSV format without notice
   - **Mitigation:** Validation on import, clear error messages, flexible parsing

2. **Incident ID as Deduplication Key:**
   - **Assumption:** Incident IDs are unique per incident in Focus
   - **Risk:** Focus assigns duplicate incident IDs or format changes
   - **Mitigation:** Validation logic, flag duplicates, manual reconciliation workflow

3. **Teacher Adoption Through Simplicity:**
   - **Assumption:** Quick-tap interfaces will drive teacher adoption
   - **Risk:** Teachers resist new system regardless of simplicity
   - **Mitigation:** Training, show immediate value (auto-calculations), iterative UX improvements

4. **District Configurability Drives Adoption:**
   - **Assumption:** Other districts will adopt if they can customize workflows
   - **Risk:** Configuration complexity becomes overwhelming
   - **Mitigation:** Sane defaults (your district's workflows), guided onboarding, templates

5. **Real-Time Sync is Reliable:**
   - **Assumption:** Supabase triggers and RLS policies are performant at scale
   - **Risk:** Sync delays or failures at high volume
   - **Mitigation:** Monitoring, retry logic, fallback to manual reconciliation

### Key Risks

**Technical Risks:**

1. **Data Migration Complexity:**
   - Importing historical placements from Excel BMS
   - Risk of data quality issues in legacy data
   - Mitigation: Clean import process, validation, manual review

2. **Performance at Scale:**
   - 247 students (current) could grow to 500+
   - Daily attendance records accumulate quickly
   - Mitigation: Database indexes, query optimization, pagination

3. **TrespassTracker Integration:**
   - Sync failures could corrupt expiration dates
   - Risk of data inconsistency between modules
   - Mitigation: Transaction-based updates, validation checks, reconciliation reports

**Operational Risks:**

4. **Training Time:**
   - Registrar and teachers need training during active school year
   - Limited time for onboarding
   - Mitigation: Phased rollout, start with intake/roster workflows, add features incrementally

5. **Parallel System Operation:**
   - May need to run Excel BMS in parallel during transition
   - Risk of dual data entry burden
   - Mitigation: Fast MVP delivery (Thanksgiving break), prove value quickly

6. **Scope Creep:**
   - Feature requests from teachers/admin during pilot
   - Risk of delaying MVP launch
   - Mitigation: Strict MVP scope adherence, Phase 2 feature parking lot

**Business Risks:**

7. **District-Specific Workflows:**
   - Configuration may not cover all district edge cases
   - Risk of requiring code changes per district
   - Mitigation: Design flexible configuration schema, prioritize common workflows

8. **Regulatory Changes:**
   - Texas PEIMS codes change annually
   - State reporting requirements may shift
   - Mitigation: Admin panel for offense code updates, flexible data model

### Open Questions

**Technical:**
1. How often do Focus CSV exports fail or have data quality issues?
2. What's the maximum student count we should design for? (500? 1000?)
3. Should we cache district configuration or query on every request?

**Operational:**
4. What's the training timeline for registrar and teachers?
5. Is there a pilot group willing to test before full rollout?
6. What's the fallback plan if system goes down? (Keep Excel BMS as backup initially?)

**Business:**
7. What pricing model makes sense for multi-district adoption?
8. How do we handle district-specific feature requests?
9. What's the support model for other districts (beyond your own)?

---

## Timeline Constraints

### Development Timeline

**No Specific Time Estimates Provided** (AI-assisted development speed is unpredictable)

**Phases:**
- **MVP:** Core data foundation + daily operations (Priority Tier 1 + Tier 2 features)
- **Phase 2:** Operational intelligence (predictive alerts, staff communication, enhanced workflows)
- **Phase 3:** Analytics and enhancement (custom reports, gamification)
- **Phase 4:** Ecosystem integration (API sync, native apps)

### Key Milestones

**MVP Launch Targets:**
1. ✅ Product Brief complete (this document)
2. ⏳ Technical Architecture & Data Model
3. ⏳ Database schema + RLS policies
4. ⏳ CSV import + reconciliation dashboard
5. ⏳ Student/placement CRUD
6. ⏳ Attendance tracking
7. ⏳ Points & behavior notes
8. ⏳ Room rosters view
9. ⏳ Dashboard KPIs
10. ⏳ Basic reporting
11. ⏳ District configuration admin panel
12. ⏳ Pilot testing with registrar
13. ⏳ Teacher training
14. ⏳ Production launch (replace Excel BMS)

**Dependencies:**
- CSV import blocks everything else (foundation feature)
- Student/placement data model blocks operational workflows
- District configuration must be in place before customizable workflows

### External Constraints

**School Calendar:**
- Active school year (current)
- Training must fit around operational demands
- Thanksgiving break = dedicated development time (now)
- Weekends = ongoing development (post-break)

**Regulatory:**
- Texas DAEP compliance (must maintain state reporting capability)
- FERPA compliance (audit logging, data privacy)
- No specific deadline but regulatory requirements are non-negotiable

---

## Supporting Materials

### Discovery Documentation

**1. Brainstorming Session Results (2025-11-23)**
- **Location:** `docs/brainstorming-session-results-2025-11-23.md`
- **Session Duration:** ~2.5 hours across multiple rounds
- **Techniques Used:** Mind Mapping, Five Whys, What If Scenarios, SCAMPER
- **Total Ideas Generated:** 100+ features and requirements

**Key Outputs:**
- 8 major workflow branches mapped (Student Management, Placement & Review, Points System, Mobile Operations, Communication, Focus Integration, TrespassTracker Integration, Reporting)
- 2 root cause problems solved (TrespassTracker integration, Date calculation complexity)
- 20+ edge cases analyzed (rollover students, mid-placement status changes, sync failures, workflow exceptions)
- 6 feature areas systematically enhanced through SCAMPER

**Party Mode Review Findings:**
- Schema design requirements clarified (district config, school calendar, user permissions)
- Edge cases documented (rollover logic, no-show escalation, private/public notes)
- Granular permissions system defined (feature-level access control)
- Performance considerations identified (review eligibility indexes)
- Pilot testing strategy confirmed (phased rollout)
- **See:** `docs/product-brief-party-mode-findings-2025-11-24.md` for complete Party Mode session documentation

**Critical Realizations from Brainstorming:**
1. One expiration date solves sync problems (`is_daep` checkbox as toggle)
2. Incident ID is the deduplication key (Student ID + Incident Number)
3. PEIMS codes prevent campus mapping chaos
4. Points from attendance, not from zero (automatic accrual)
5. Registrar as single recipient simplifies notification routing
6. Community service must be standardized (Yes/No toggle prevents inflation)
7. Teacher approval workflow protects families from inflammatory comments
8. Predictive Code Yellow has highest impact potential (defer to Phase 2)
9. Rollover students break standard rules (must handle explicitly)
10. Manual override is non-negotiable (compassionate cases, operational flexibility)

**Priority Ideas Integrated into MVP:**
- CSV Import with Banking Reconciliation (Priority #1)
- Points System (110/day) with Teacher Notes Dropdown (Priority #2)
- Review Process with Student Self-Assessment (Priority #3 - basic version in MVP, enhanced in Phase 2)

**2. DAEP UI Mockup Analysis (bolt.new)**
- **Location:** `docs/daep-ui-mockup-analysis.md`
- **Source:** bolt.new mockup (dap-student-dashboar-k5ih.bolt.host)
- **Date Analyzed:** 2025-11-23

**Screen-by-Screen Coverage:**
1. Dashboard Overview (KPI cards, scheduled intakes, pending actions)
2. Room Rosters (student cards, room selector, mobile-responsive)
3. Add Behavior Note Modal (points, actions, visibility toggle)
4. Students List View (search, filter, export, table columns)
5. Student Detail Panel - Overview (demographics, contacts, metrics)
6. Student Detail Panel - Placement History (CRITICAL for recidivism tracking)
7. Reports Page (pre-built reports, custom report builder button)
8. Settings Page (profile, notifications, security, system config)

**Critical Integration Points Identified:**
- Incident codes link DAEP placements to TrespassTracker incidents
- Days Served / Days Remaining calculation drives expiration dates
- Placement number (1st, 2nd, 3rd visit) enables recidivism tracking
- Offense codes map to incident descriptions
- Real-time sync required for expiration dates

**Component Library Mapping:**
- Radix UI components mapped to mockup (Dialog, Select, Sheet, Badge, Button, Avatar, Table, Card, Tabs, Switch, Progress, Alert)
- Color palette documented (blue primary, status colors, semantic usage)
- Responsive design considerations identified

**Data Model Requirements Extracted:**
- `daep_placements` table structure defined
- `daep_students`, `daep_guardians`, `daep_behavior_notes`, `daep_attendance`, `daep_offense_codes` tables specified
- Foreign key relationships mapped
- TrespassTracker integration points detailed

**3. DistrictTracker Project Documentation**
- **Location:** `docs/index.md`
- **Generated:** 2025-11-23 via BMAD document-project workflow
- **Scan Level:** Exhaustive

**4. Party Mode Review Session Findings**
- **Location:** `docs/product-brief-party-mode-findings-2025-11-24.md`
- **Session Date:** 2025-11-24
- **Participants:** John (PM), Winston (Architect), Mary (Analyst), Sally (UX Designer), Bob (Scrum Master)

**Existing Infrastructure:**
- TrespassTracker module (operational) provides proven architecture
- Multi-tenant SaaS with subdomain routing (e.g., birdville.districttracker.com)
- Shared tables: tenants, campuses, user_profiles, admin_audit_log
- RLS policies for data isolation (70+ verified policies)
- Clerk authentication, Supabase PostgreSQL, Vercel deployment
- 40+ shadcn/ui components, 28 Radix UI packages
- FERPA-compliant audit logging
- Excel/PDF export functionality (pattern to replicate)

**Technology Stack:**
- Next.js 15.5.4 with App Router
- React 19.2.0 + TypeScript 5.9.3 (strict mode)
- Radix UI + Tailwind CSS
- Server Actions (24+ existing for TrespassTracker)
- Supabase with Row-Level Security
- Comprehensive CSP headers, rate limiting, CSRF protection

**Integration Architecture:**
- Module communication pattern established
- Cross-module data links defined (`trespass_records.is_daep` flag, `daep_expiration_date` field)
- Shared authentication and authorization
- Unified audit logging approach

### Research Gaps

**Recommended Research Topics (Future Sessions):**

1. **Competitor Analysis:**
   - Existing DAEP management software solutions
   - Feature comparison (what do others offer?)
   - Pricing models in education SaaS
   - User reviews and pain points

2. **Regulatory Research:**
   - Texas DAEP compliance requirements (detailed)
   - FERPA audit trail best practices
   - State reporting formats and schedules
   - Changes to PEIMS codes (historical trends)

3. **Market Sizing:**
   - Number of Texas school districts with DAEP programs
   - Typical DAEP program sizes (students, staff)
   - Budget allocation for DAEP software
   - Decision-makers and procurement processes

4. **Technology Research:**
   - Focus SIS API roadmap (if available)
   - Alternative SIS systems used by districts
   - Education sector integration standards
   - Mobile app adoption in education

5. **User Research:**
   - Interview registrars from other districts (pain points)
   - Observe teacher workflows in other DAEP programs
   - Survey administrators on reporting needs
   - Parent/student perspectives on transparency

**Note:** Research not required for MVP development (sufficient domain expertise from Alan). Recommended before scaling to multiple districts (Phase 3).

---

## Next Steps

**Immediate: Technical Architecture & Data Model**

With this Product Brief complete, the next critical step is designing the technical architecture and data model:

1. **Database Schema Design:**
   - Finalize table structures for all DAEP-specific tables
   - Define foreign key relationships with TrespassTracker
   - Specify indexes for performance
   - Design RLS policies for multi-tenant isolation
   - Create `daep_district_config` table schema for customization

2. **CSV Import Architecture:**
   - Design parsing and validation logic
   - Reconciliation dashboard data model
   - Error handling and retry mechanisms
   - Import history and audit trail

3. **Expiration Date Calculation Engine:**
   - School calendar data model
   - Absence tracking impact algorithm
   - Community service credit logic
   - Real-time sync triggers to TrespassTracker

4. **District Configuration Schema:**
   - Behavior tracking system options (points vs color-tier)
   - Offense code structure
   - Review criteria definition format
   - Period structure and calendar management

5. **API Contracts:**
   - Server Actions for DAEP operations
   - CSV import endpoint
   - Reporting endpoints
   - Integration points with TrespassTracker

**Recommended Workflow:**

Run `/bmad:bmm:workflows:architecture` to create the technical architecture document that will guide implementation.

---

_This Product Brief captures the vision and requirements for the DAEP Module within DistrictTracker.com._

_It was created through collaborative discovery, synthesizing extensive brainstorming (100+ features across 4 techniques), UI mockup analysis, and existing platform documentation._

_Next: Architecture workflow will transform this brief into detailed technical design and data models for implementation._

