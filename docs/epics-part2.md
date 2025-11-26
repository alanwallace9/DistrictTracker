# DAEPManagement - Epic Breakdown (Part 2)

> **Document Split:** This is Part 2 covering Epics 3, 4, 5, 6, 7 and FR Coverage Matrix.
> See [epics-part1.md](./epics-part1.md) for Overview, FR Inventory, and Epics 1a, 1b, 2.

---

## Epic 3: Daily Operations - Points & Attendance (Detailed)

**Goal:** Staff can efficiently track daily points and attendance for DAEP students.

**Dependencies:** Epic 1 (schema, rooms, schedules), Epic 2 (placements)
**Estimated Stories:** 12

---

### Story 3.1: Room Roster View

**As a** DAEP staff member
**I want** to view all students assigned to my room
**So that** I can track points and attendance for my students

**Acceptance Criteria:**
- [ ] Room roster page at `/daep/rooms/[roomId]`
- [ ] Shows all students with active placements assigned to this room
- [ ] Columns: student name, student ID, days remaining, today's points total, attendance status
- [ ] Room selector dropdown to switch between rooms (for staff assigned to multiple)
- [ ] Period selector (defaults to current period based on bell schedule)
- [ ] Date picker (defaults to today)
- [ ] Staff can only see rooms they're assigned to
- [ ] District/DAEP admins can see all rooms

**Technical Notes:**
- Uses `daep_rooms`, `daep_room_staff`, `daep_placements` joins
- `getCurrentPeriod()` function from Story 1.6

**FRs:** FR67

---

### Story 3.2: Point Entry Grid

**As a** DAEP staff member
**I want** to enter points (0-10) for each student per period
**So that** student progress is tracked daily

**Acceptance Criteria:**
- [ ] Grid view on room roster: rows = students, columns = periods (or single period if filtered)
- [ ] Each cell: point input (0-10), defaults to 10
- [ ] Click cell to edit points
- [ ] Auto-save on blur or enter
- [ ] Visual indicator for unsaved changes
- [ ] Points saved to `daep_daily_points` table
- [ ] Shows previous points if editing existing entry
- [ ] Validation: points must be 0-10 integer
- [ ] Loading state while saving

**Technical Notes:**
- Server action: `enterPoints()` in `app/actions/daep/points.ts`
- Unique constraint: (tenant_id, placement_id, date, period)

**FRs:** FR27, FR28, FR29

---

### Story 3.3: Bulk Point Entry

**As a** DAEP staff member
**I want** to enter the same points for multiple students at once
**So that** I can efficiently handle common scenarios

**Acceptance Criteria:**
- [ ] Checkbox column for multi-select students
- [ ] "Select All" checkbox in header
- [ ] Bulk actions dropdown: "Set Points to 10", "Set Points to 8", "Set Points to 0"
- [ ] Custom bulk entry: "Set Points to [X]" with input
- [ ] Confirmation dialog before bulk action
- [ ] Success toast with count of updated students
- [ ] Audit trail records bulk action

**Technical Notes:**
- Server action: `bulkEnterPoints()` in `app/actions/daep/points.ts`

**FRs:** FR30

---

### Story 3.4: Point Notes/Comments

**As a** DAEP staff member
**I want** to add notes to point entries
**So that** I can document specific student behaviors

**Acceptance Criteria:**
- [ ] Click point cell to open detail modal
- [ ] Modal shows: points input, student_action dropdown, teacher_action dropdown, notes textarea
- [ ] student_action populated from behavior categories (Story 1.10)
- [ ] teacher_action: "Redirected", "Conference", "Parent Contact", "None"
- [ ] Notes field: free text, optional
- [ ] Save updates point entry with additional fields
- [ ] Notes visible on student profile daily activity

**Technical Notes:**
- Fields in `daep_daily_points`: `student_action`, `teacher_action`, `notes`

**FRs:** FR36

---

### Story 3.5: Approved Teacher Auto-Finalize

**As an** approved teacher
**I want** my point entries to be immediately visible
**So that** students and parents can see their progress without delay

**Acceptance Criteria:**
- [ ] If user has `approved_teacher = true`, points saved with `approval_status = 'approved'`
- [ ] Points immediately visible on student profile and parent portal
- [ ] No approval queue notification generated
- [ ] `public = true` set immediately
- [ ] Audit log records direct approval

**Technical Notes:**
- Check `approved_teacher` flag in `enterPoints()` server action
- Applies to all point entry methods (single, bulk)

**FRs:** FR31

---

### Story 3.6: Pending Approval Workflow

**As a** non-approved staff member
**I want** my point entries to be reviewed by an admin
**So that** quality control is maintained

**Acceptance Criteria:**
- [ ] If user has `approved_teacher = false`, points saved with `approval_status = 'pending'`
- [ ] Points visible to staff but NOT to students/parents (`public = false`)
- [ ] Notification sent to DAEP admins about pending approvals
- [ ] Approval queue page at `/daep/approvals`
- [ ] Queue shows: student, period, date, points, entered_by, student_action, notes
- [ ] Admin can: Approve, Reject, Edit & Approve
- [ ] Edit allows: changing points, editing verbiage, changing category
- [ ] Approve sets `approval_status = 'approved'`, `public = true`
- [ ] Reject sets `approval_status = 'rejected'`, remains private

**Technical Notes:**
- Server actions: `approvePoints()`, `rejectPoints()` in `app/actions/daep/points.ts`
- Notification in Epic 7

**FRs:** FR32, FR33

---

### Story 3.7: Cumulative Points & Milestones

**As a** DAEP staff member
**I want** to see cumulative points and milestones for each student
**So that** I can track progress toward goals

**Acceptance Criteria:**
- [ ] Student profile shows: total points earned, points possible, percentage
- [ ] Points possible = days_served × periods × 10
- [ ] Progress bar visualization
- [ ] Milestone badges: 100 points, 250 points, 500 points, etc.
- [ ] Badge displayed on student card when earned
- [ ] Milestone notification to student/parent (Epic 7)
- [ ] Dashboard shows milestone achievers (Epic 6)

**Technical Notes:**
- Calculate from `daep_daily_points` where `approval_status = 'approved'`
- Milestones configured in `daep_point_bonus_rules` (Story 1.10)

**FRs:** FR34, FR35

---

### Story 3.8: Point Audit Trail

**As a** DAEP administrator
**I want** a complete audit trail of all point changes
**So that** I can investigate discrepancies and maintain accountability

**Acceptance Criteria:**
- [ ] All point entries logged to `admin_audit_log` with `module = 'daep_management'`
- [ ] Event types: `points.entered`, `points.approved`, `points.rejected`, `points.edited`
- [ ] Details include: student_id, date, period, points, entered_by, approved_by
- [ ] Before/after values recorded for edits
- [ ] Audit log accessible from student profile
- [ ] Can filter audit log by student, date range, user

**Technical Notes:**
- Uses existing `logAuditEvent()` utility
- Add filter UI in Epic 6

**FRs:** FR37

---

### Story 3.9: Attendance Entry

**As a** DAEP staff member
**I want** to record attendance for each student per period
**So that** attendance is accurately tracked

**Acceptance Criteria:**
- [ ] Attendance column in room roster grid
- [ ] Status options: P (Present), A (Absent), T (Tardy), ED (Early Dismissal)
- [ ] Default: Present (P)
- [ ] Quick-tap to cycle through statuses
- [ ] For Tardy: prompt for tardy_time (HH:MM)
- [ ] For Early Dismissal: prompt for early_dismiss_time (HH:MM)
- [ ] Auto-save on selection
- [ ] Attendance saved to `daep_attendance` table

**Technical Notes:**
- Server action: `markAttendance()` in `app/actions/daep/attendance.ts`
- Unique constraint: (tenant_id, placement_id, date, period)

**FRs:** FR38, FR39, FR40, FR41

---

### Story 3.10: Excused vs Unexcused Absences

**As a** DAEP staff member
**I want** to mark absences as excused or unexcused
**So that** days served is calculated correctly

**Acceptance Criteria:**
- [ ] When marking Absent, additional prompt: Excused? (Yes/No)
- [ ] If Excused: prompt for excuse_reason (Court, Medical, School Event, Other)
- [ ] Excused absences: counts toward days served, student earns points possible
- [ ] Unexcused absences: does NOT count toward days served, no points earned
- [ ] Half-day scenarios: can be excused AM + unexcused PM (tracked per period)
- [ ] Absence type indicated visually in grid (E vs U)

**Technical Notes:**
- Fields in `daep_attendance`: `excused`, `excuse_reason`, `counts_toward_days_served`
- `counts_toward_days_served` calculated based on `excused` flag

**FRs:** FR42

---

### Story 3.11: Attendance Rate Calculations

**As a** DAEP staff member
**I want** to see attendance rates for students
**So that** I can identify attendance concerns

**Acceptance Criteria:**
- [ ] Student profile shows: daily attendance rate, cumulative attendance rate
- [ ] Rate = periods present / total periods × 100%
- [ ] Color coding: green (>90%), yellow (85-90%), red (<85%)
- [ ] Dashboard shows students below 85% threshold (Epic 6)
- [ ] Attendance rate visible in student list
- [ ] Three consecutive absent days triggers notification (Epic 7)

**Technical Notes:**
- Calculate from `daep_attendance` where `status = 'P'` or excused absences
- Threshold configurable in settings (default 85%)

**FRs:** FR43

---

### Story 3.12: Attendance Override with Audit

**As a** DAEP administrator
**I want** to correct attendance records with full audit trail
**So that** errors can be fixed while maintaining accountability

**Acceptance Criteria:**
- [ ] Admin can edit any attendance record
- [ ] Edit modal shows: current status, change to dropdown, reason for change (required)
- [ ] All changes logged to audit trail
- [ ] Original entry preserved in audit log
- [ ] Override reason visible in attendance history
- [ ] Only daep_admin_l1 and district_admin can override

**Technical Notes:**
- Server action: `overrideAttendance()` in `app/actions/daep/attendance.ts`
- Log to `admin_audit_log` with before/after values

**FRs:** FR44

---

## Epic 4: Behavior Documentation (Detailed)

**Goal:** Quick behavior note entry with timeline visibility.

**Dependencies:** Epic 1 (schema, categories), Epic 2 (placements)
**Estimated Stories:** 5

---

### Story 4.1: Quick Behavior Note Modal

**As a** DAEP staff member
**I want** to quickly add a behavior note
**So that** I can document incidents without disrupting my workflow

**Acceptance Criteria:**
- [ ] "+ Add Note" button on student profile and room roster
- [ ] Modal with fields: category (dropdown), description (textarea), action_taken (optional)
- [ ] Date/time auto-populated (editable)
- [ ] Staff member auto-populated (current user)
- [ ] Target: complete entry in under 30 seconds
- [ ] Keyboard shortcuts: Tab through fields, Enter to save
- [ ] Save creates record in `daep_behavior_notes`
- [ ] Success toast and modal closes

**Technical Notes:**
- Server action: `createBehaviorNote()` in `app/actions/daep/behavior-notes.ts`
- Optimized for speed (minimal required fields)

**FRs:** FR45, FR46, FR48

---

### Story 4.2: Predefined Behavior Categories

**As a** DAEP staff member
**I want** to select from predefined categories
**So that** behavior notes are consistent and reportable

**Acceptance Criteria:**
- [ ] Category dropdown populated from `daep_behavior_categories`
- [ ] Categories grouped by type: Positive, Negative, Neutral
- [ ] Most-used categories appear first (sort_order)
- [ ] Color-coded badges: green (positive), red (negative), gray (neutral)
- [ ] Category shown on note in timeline

**Technical Notes:**
- Uses `daep_behavior_categories` from Story 1.10
- Filter to active categories only

**FRs:** FR47

---

### Story 4.3: Behavior Notes List View

**As a** DAEP administrator
**I want** to review all behavior notes
**So that** I can monitor student conduct and staff documentation

**Acceptance Criteria:**
- [ ] Behavior notes page at `/daep/behavior-notes`
- [ ] List shows: date/time, student, category, description snippet, staff
- [ ] Filter by: student, category type, staff member, date range
- [ ] Sort by: date (newest first default)
- [ ] Click to view full note detail
- [ ] Pagination for large lists
- [ ] Export to CSV

**Technical Notes:**
- Query `daep_behavior_notes` joined with placements and trespass_records

**FRs:** FR49

---

### Story 4.4: Attach Notes to Incidents

**As a** DAEP staff member
**I want** to attach behavior notes to specific placements
**So that** notes are linked to the relevant context

**Acceptance Criteria:**
- [ ] Behavior notes automatically linked to active placement via `placement_id`
- [ ] Note shows which placement/incident it's associated with
- [ ] Can view all notes for a specific placement
- [ ] If student has no active placement, note still created (linked to student, not placement)

**Technical Notes:**
- `daep_behavior_notes.placement_id` FK to `daep_placements`
- Nullable for notes without active placement

**FRs:** FR50

---

### Story 4.5: Student Profile Timeline

**As a** DAEP staff member
**I want** to see behavior notes in a timeline on student profile
**So that** I have a chronological view of student conduct

**Acceptance Criteria:**
- [ ] Student profile has "Activity" or "Timeline" tab
- [ ] Timeline shows: behavior notes, point entries, attendance events
- [ ] Chronological order (newest first)
- [ ] Filter by type: Notes only, Points only, Attendance only, All
- [ ] Each entry shows: date/time, type icon, summary, staff member
- [ ] Click to expand full details
- [ ] Color-coded by category (positive green, negative red)

**Technical Notes:**
- Combine queries from `daep_behavior_notes`, `daep_daily_points`, `daep_attendance`
- Virtual timeline (not stored as single table)

**FRs:** FR51

---

## Epic 5: CSV Reconciliation (Detailed)

**Goal:** Banking-style SIS data comparison with side-by-side resolution - the core differentiator.

**Dependencies:** Epic 1 (schema), Epic 2 (placements exist)
**Estimated Stories:** 10

---

### Story 5.1: CSV Upload

**As a** DAEP administrator
**I want** to upload a CSV file from our district SIS
**So that** I can compare SIS data against DAEP records

**Acceptance Criteria:**
- [ ] Reconciliation page at `/daep/reconciliation`
- [ ] File dropzone accepts CSV files only
- [ ] Max file size: 10MB
- [ ] Upload to Supabase Storage in `daep-uploads` bucket
- [ ] File named: `{tenant_id}/{timestamp}-{original_name}`
- [ ] Progress indicator during upload
- [ ] Error handling: invalid file type, too large, upload failed
- [ ] After upload, proceed to field mapping (if first time) or parsing

**Technical Notes:**
- Server action: `uploadCSVFile()` in `app/actions/daep/reconciliation.ts`
- Use existing file upload patterns from TrespassTracker

**FRs:** FR52

---

### Story 5.2: Field Mapping Setup

**As a** DAEP administrator
**I want** to map CSV columns to DAEP fields (one-time setup)
**So that** future uploads are automatically parsed correctly

**Acceptance Criteria:**
- [ ] If no mapping exists for tenant, show mapping UI
- [ ] Upload sample CSV, system extracts column headers
- [ ] Two-column UI: SIS field (dropdown of CSV headers) → DAEP field (fixed list)
- [ ] Required DAEP fields: student_id, first_name, last_name, incident_number, start_date, days_assigned, offense_code, home_campus
- [ ] Optional fields: parent_email, guardian_phone, grade_level
- [ ] Save mapping to `daep_csv_field_mappings`
- [ ] Include SIS name (Skyward, Focus, PowerSchool, Other)
- [ ] Mapping reused for all future uploads

**Technical Notes:**
- Settings page: `/daep/settings/csv-mapping`
- Mapping stored as JSONB in `field_mappings` column

**FRs:** FR53

---

### Story 5.3: CSV Parsing

**As the** system
**I want** to parse uploaded CSV using saved field mapping
**So that** data can be compared against DAEP records

**Acceptance Criteria:**
- [ ] Use PapaParse for CSV parsing
- [ ] Apply field mapping to transform CSV columns to DAEP fields
- [ ] Validate required fields present
- [ ] Parse dates in multiple formats (MM/DD/YYYY, YYYY-MM-DD, M/D/YY)
- [ ] Handle encoding issues (UTF-8, Windows-1252)
- [ ] Skip header row
- [ ] Return array of normalized SIS records
- [ ] Log parsing errors with row numbers and student names

**Technical Notes:**
- PapaParse: `Papa.parse(csvText, { header: true })`
- Human-readable errors per architecture.md validation patterns

**FRs:** FR53

---

### Story 5.4: Comparison Engine

**As the** system
**I want** to compare SIS records against DAEP placement records
**So that** discrepancies can be identified

**Acceptance Criteria:**
- [ ] Compare by composite key: student_id + incident_number
- [ ] For each SIS record, find matching DAEP placement
- [ ] Categorize result: Matched, Field Conflict, New in SIS, Missing from SIS
- [ ] For Field Conflicts, identify which fields differ
- [ ] Compare: start_date, days_assigned, offense_code, first_name, last_name, home_campus, parent_email
- [ ] Store results in `daep_reconciliation_sessions` and `daep_reconciliation_discrepancies`

**Technical Notes:**
- Server action: `startReconciliationSession()` per architecture.md
- Use `compareRecords()` and `findConflicts()` functions

**FRs:** FR54, FR55

---

### Story 5.5: Discrepancy Categorization

**As a** DAEP administrator
**I want** discrepancies categorized clearly
**So that** I know what type of action each requires

**Acceptance Criteria:**
- [ ] Categories:
  - **Matched**: SIS and DAEP data identical (no action needed)
  - **Field Conflict**: Record exists in both but fields differ
  - **New in SIS**: Student/placement in SIS but not in DAEP
  - **Missing from SIS**: Student/placement in DAEP but not in SIS
- [ ] Session summary shows counts for each category
- [ ] Discrepancy cards show category badge
- [ ] Color coding: green (matched), yellow (conflict), blue (new), red (missing)

**Technical Notes:**
- `daep_reconciliation_discrepancies.discrepancy_type` field

**FRs:** FR56

---

### Story 5.6: Side-by-Side Comparison UI

**As a** DAEP administrator
**I want** to see SIS and DAEP data side by side
**So that** I can make informed resolution decisions

**Acceptance Criteria:**
- [ ] Review page at `/daep/reconciliation/[sessionId]`
- [ ] Two-column layout: SIS Data (left) | DAEP Data (right)
- [ ] Conflicting fields highlighted in yellow
- [ ] For new records, right column shows "Not in DAEP"
- [ ] For missing records, left column shows "Not in SIS"
- [ ] Shows student name prominently at top of card
- [ ] Navigation: Previous / Next discrepancy buttons
- [ ] Progress indicator: "Reviewing 3 of 8 discrepancies"

**Technical Notes:**
- Uses `DiscrepancyCard`, `ComparisonView` components per architecture.md

**FRs:** FR57

---

### Story 5.7: Resolution Actions

**As a** DAEP administrator
**I want** to resolve each discrepancy with clear actions
**So that** data is reconciled consistently

**Acceptance Criteria:**
- [ ] Three action buttons per discrepancy:
  - **Accept SIS**: Overwrite DAEP data with SIS data
  - **Keep DAEP**: Ignore SIS data, keep existing DAEP data
  - **Add Note**: Accept one source but add explanation note
- [ ] For "New in SIS": Accept SIS creates new DAEP placement
- [ ] For "Missing from SIS": Keep DAEP or Mark for Review
- [ ] Action confirmation dialog for Accept SIS (data will be overwritten)
- [ ] After resolution, auto-advance to next discrepancy
- [ ] When all resolved, show completion summary

**Technical Notes:**
- Server action: `resolveDiscrepancy()` per architecture.md
- Updates `daep_placements` or `daep_students` based on action

**FRs:** FR58, FR59

---

### Story 5.8: Reconciliation Audit Trail

**As a** DAEP administrator
**I want** a complete audit trail of reconciliation decisions
**So that** I can review and justify data changes

**Acceptance Criteria:**
- [ ] All reconciliation actions logged to `daep_reconciliation_audit`
- [ ] Event types: session_started, discrepancy_resolved, session_completed
- [ ] Details include: resolution type, note if added, before/after values
- [ ] Audit entries reference session_id and discrepancy_id
- [ ] Also logged to main `admin_audit_log` with module='daep_management'
- [ ] Can view audit history for specific reconciliation session

**Technical Notes:**
- Uses `daep_reconciliation_audit` table
- Also calls `logAuditEvent()` for main audit log

**FRs:** FR60

---

### Story 5.9: Reconciliation Summary Report

**As a** DAEP administrator
**I want** a summary report of reconciliation results
**So that** I can document the reconciliation for records

**Acceptance Criteria:**
- [ ] Summary shown at session completion
- [ ] Metrics: total records, matched, conflicts resolved, new added, missing flagged
- [ ] Resolution breakdown: how many Accept SIS vs Keep DAEP
- [ ] Export summary as PDF
- [ ] Summary stored in session record for historical reference
- [ ] Email summary to administrator (optional)

**Technical Notes:**
- Update `daep_reconciliation_sessions` with final counts
- PDF generation using existing patterns

**FRs:** FR61

---

### Story 5.10: Unresolved Discrepancy Alerts

**As a** DAEP administrator
**I want** to be alerted about unresolved discrepancies
**So that** I don't forget to complete reconciliation

**Acceptance Criteria:**
- [ ] If session left with unresolved discrepancies, show warning on dashboard
- [ ] Dashboard card: "X unresolved discrepancies from [date]"
- [ ] Click navigates to reconciliation session
- [ ] Notification sent if session incomplete after 24 hours
- [ ] Reconciliation page shows list of incomplete sessions
- [ ] Can resume incomplete session where left off

**Technical Notes:**
- Check sessions where `status = 'in_review'` and unresolved discrepancies exist
- Notification via Epic 7 system

**FRs:** FR62

---

## Epic 6: Dashboard & Reporting (Detailed)

**Goal:** KPI dashboard with drill-down and exportable reports.

**Dependencies:** Epics 2, 3, 4, 5 (data exists to report on)
**Estimated Stories:** 12

---

### Story 6.1: Dashboard Page with KPI Cards

**As a** DAEP administrator
**I want** a dashboard showing key metrics at a glance
**So that** I can monitor program health quickly

**Acceptance Criteria:**
- [ ] Dashboard page at `/daep/dashboard`
- [ ] KPI cards using Tremor components:
  - Current Enrollment (active placements count)
  - Today's Attendance Rate (%)
  - Average Points Today
  - Students Below 85% Attendance
  - Pending Transitions
  - Pending Approvals
- [ ] Cards show: metric value, trend indicator (▲▼), comparison to last period
- [ ] Refresh: data from daily midnight cron job (24-hour freshness)
- [ ] Mobile-responsive grid layout

**Technical Notes:**
- Tremor `Card`, `Metric`, `BadgeDelta` components
- Pre-aggregated data in KPI cache table or computed on load

**FRs:** FR78

---

### Story 6.2: Clickable KPIs with Drill-Down

**As a** DAEP administrator
**I want** to click KPIs to see the underlying student list
**So that** I can investigate metrics in detail

**Acceptance Criteria:**
- [ ] Each KPI card is clickable
- [ ] Click navigates to student list with appropriate filter applied
- [ ] Examples:
  - "Current Enrollment" → Student list filtered to active placements
  - "Below 85% Attendance" → Students with attendance < 85%
  - "Pending Transitions" → Students in transition status
- [ ] Breadcrumb shows: Dashboard > [KPI Name]
- [ ] "Back to Dashboard" button

**Technical Notes:**
- URL parameters for filters: `/daep/students?status=active`

**FRs:** FR79

---

### Story 6.3: Attendance Reports

**As a** DAEP administrator
**I want** to generate attendance reports
**So that** I can analyze attendance patterns

**Acceptance Criteria:**
- [ ] Reports page at `/daep/reports`
- [ ] Attendance report with parameters: date range, campus, room
- [ ] Report shows: student, days present, days absent, attendance rate
- [ ] Summary row with totals/averages
- [ ] Sortable by any column
- [ ] Filter by attendance threshold (e.g., < 85%)
- [ ] Chart: daily attendance trend line

**Technical Notes:**
- Query `daep_attendance` grouped by placement

**FRs:** FR80

---

### Story 6.4: Discipline Reports

**As a** DAEP administrator
**I want** to generate discipline reports by offense code
**So that** I can analyze placement reasons

**Acceptance Criteria:**
- [ ] Discipline report with parameters: date range, offense code, home campus
- [ ] Report shows: offense code, offense label, count, mandatory vs discretionary breakdown
- [ ] Pie chart: placements by offense category
- [ ] Bar chart: placements by home campus
- [ ] Drill-down: click offense code to see student list

**Technical Notes:**
- Query `daep_placements` joined with `daep_discipline_codes`

**FRs:** FR81

---

### Story 6.5: Point Progress Reports

**As a** DAEP administrator
**I want** to see point progress across students
**So that** I can identify students excelling or struggling

**Acceptance Criteria:**
- [ ] Point progress report with parameters: date range, room, min/max points
- [ ] Report shows: student, total points, points possible, percentage, milestone badges
- [ ] Sort by: percentage (ascending for struggling, descending for excelling)
- [ ] Highlight students below 70% threshold
- [ ] Histogram: point distribution across students

**Technical Notes:**
- Query `daep_daily_points` where approved, aggregate by placement

**FRs:** FR82

---

### Story 6.6: Placement Length Reports

**As a** DAEP administrator
**I want** to analyze placement lengths
**So that** I can understand typical DAEP durations

**Acceptance Criteria:**
- [ ] Placement length report with parameters: date range, status
- [ ] Report shows: average days assigned, average days served, completion rate
- [ ] Breakdown by offense code: which offenses have longest placements
- [ ] Breakdown by home campus: which campuses have most placements
- [ ] Histogram: days assigned distribution

**Technical Notes:**
- Query `daep_placements` with aggregations

**FRs:** FR83

---

### Story 6.7: PDF/Excel Export

**As a** DAEP administrator
**I want** to export reports to PDF and Excel
**So that** I can share reports with stakeholders

**Acceptance Criteria:**
- [ ] "Export" button on each report: PDF, Excel (CSV)
- [ ] PDF: formatted with headers, logos (if configured), footer with date
- [ ] Excel: raw data with column headers, filterable
- [ ] Export includes: report title, parameters used, generated date, generated by
- [ ] Download starts automatically
- [ ] Audit log records export action

**Technical Notes:**
- Use existing export patterns from TrespassTracker
- PDF: react-pdf or similar
- Excel: xlsx package or CSV download

**FRs:** FR84

---

### Story 6.8: Recidivism Tracking and KPI

**As a** DAEP administrator
**I want** to track student recidivism rates
**So that** I can measure program effectiveness

**Acceptance Criteria:**
- [ ] Recidivism KPI on dashboard: recidivism rate %
- [ ] Formula: (Students with 2+ placements) / (Total unique students) × 100
- [ ] Recidivism report at `/daep/reports/recidivism`
- [ ] Report shows: students with multiple placements, placement count, offense types
- [ ] Click student to see all their placements
- [ ] Breakdown: 2 placements, 3 placements, 4+ placements
- [ ] Filter by home campus for comparative analysis
- [ ] Pattern analysis: which offenses lead to recidivism

**Technical Notes:**
- Uses recidivism queries from architecture.md
- Critical metric per PRD

**FRs:** FR85, FR86

---

### Story 6.9: 90-Day Assessment Tracking

**As a** DAEP administrator
**I want** to track students approaching 90-day assessments
**So that** I comply with TEC §37.0082

**Acceptance Criteria:**
- [ ] Auto-flag placements where days_assigned > 90
- [ ] Dashboard card: "90-Day Assessments Due"
- [ ] Click shows students needing assessment
- [ ] Track assessment completion: math score, reading score, date completed
- [ ] Alert 7 days before 90-day threshold
- [ ] Report: students with/without assessments by due date

**Technical Notes:**
- `daep_placements.assessment_90day_required`, `assessment_90day_date`, `assessment_90day_scores`
- Trigger in Story 1.1 database migration

**FRs:** FR87, FR88

---

### Story 6.10: 120-Day Status Review Tracking

**As a** DAEP administrator
**I want** to track students requiring 120-day reviews
**So that** I meet state compliance requirements

**Acceptance Criteria:**
- [ ] Auto-flag placements where days_served > 120
- [ ] Dashboard card: "120-Day Reviews Due"
- [ ] Track review completion date
- [ ] Alert 7 days before 120-day threshold
- [ ] Report: students pending vs completed reviews

**Technical Notes:**
- `daep_placements.assessment_120day_date` field

**FRs:** FR89

---

### Story 6.11: PEIMS Submission 3 Export

**As a** DAEP administrator
**I want** to export DAEP data in PEIMS format
**So that** I can submit to TEA

**Acceptance Criteria:**
- [ ] PEIMS export at `/daep/reports/peims`
- [ ] Parameters: school year, submission period
- [ ] Export format matches TEA Submission 3 requirements
- [ ] Includes Code 425 discipline action records
- [ ] Validation: checks for missing required fields before export
- [ ] Validation errors show which students have issues
- [ ] Export as CSV in TEA-specified layout
- [ ] Documentation: link to TEA PEIMS requirements

**Technical Notes:**
- Research exact TEA PEIMS format requirements
- Validate `offense_code` against PEIMS discipline codes

**FRs:** FR90, FR91, FR92

---

### Story 6.12: Audit Reports

**As a** DAEP administrator
**I want** to generate audit reports by user or date
**So that** I can review system activity for compliance

**Acceptance Criteria:**
- [ ] Audit report at `/daep/reports/audit`
- [ ] Filter by: user, date range, event type, student
- [ ] Shows: timestamp, user, action, target, details
- [ ] Sortable, paginated
- [ ] Export to CSV
- [ ] Module filter: DAEP only (using module='daep_management')

**Technical Notes:**
- Query `admin_audit_log` where `module = 'daep_management'`

**FRs:** FR108

---

## Epic 7: Notifications & Alerts (Detailed)

**Goal:** In-app notifications and email alerts for key events.

**Dependencies:** Epic 1 (schema), Epics 2-6 (events to notify about)
**Estimated Stories:** 8

---

### Story 7.1: Notification Bell Icon

**As a** DAEP user
**I want** to see a notification bell with unread count
**So that** I know when there are items needing my attention

**Acceptance Criteria:**
- [ ] Bell icon in header navigation
- [ ] Badge shows unread notification count
- [ ] Click opens notification dropdown/panel
- [ ] Shows recent notifications (last 10)
- [ ] "View All" link to notifications page
- [ ] Real-time updates using Supabase Realtime or polling

**Technical Notes:**
- Uses `daep_notifications` table
- Zustand store for client-side state (per architecture.md)

**FRs:** FR97

---

### Story 7.2: Notification Management

**As a** DAEP user
**I want** to dismiss or mark notifications as read
**So that** I can manage my notification queue

**Acceptance Criteria:**
- [ ] Clicking notification marks it as read
- [ ] "Mark all as read" button
- [ ] Dismiss (x) button removes from list but keeps in database
- [ ] Notifications page at `/daep/notifications` shows all
- [ ] Filter: Unread, All, By Type
- [ ] Click notification action_url navigates to relevant page

**Technical Notes:**
- `daep_notifications.read`, `read_at` fields
- Server actions: `markNotificationRead()`, `markAllRead()`

**FRs:** FR98

---

### Story 7.3: Notification Preferences

**As a** DAEP administrator
**I want** to configure notification preferences
**So that** users receive relevant notifications only

**Acceptance Criteria:**
- [ ] Notification settings at `/daep/settings/notifications`
- [ ] Toggle on/off by notification type:
  - Point approval pending
  - Compliance deadlines (90-day, 120-day)
  - Student milestones
  - Transition reminders
  - Below attendance threshold
- [ ] Email preferences: receive email, in-app only, or both
- [ ] Per-user preferences stored in user profile or settings table

**Technical Notes:**
- Could extend `user_profiles` or create `daep_notification_preferences`

**FRs:** FR96

---

### Story 7.4: Email Infrastructure

**As the** system
**I want** to send email notifications via Resend
**So that** critical alerts reach users outside the app

**Acceptance Criteria:**
- [ ] Resend integration configured
- [ ] Email template: DAEP branded, responsive HTML
- [ ] Templates for: approval pending, compliance deadline, transition reminder
- [ ] Include action link to relevant page
- [ ] Unsubscribe link in footer
- [ ] Track email delivery status
- [ ] Fallback: queue emails if Resend unavailable

**Technical Notes:**
- Resend API integration
- React Email for templates (matches architecture.md)

**FRs:** FR93

---

### Story 7.5: Point Approval Notifications

**As a** DAEP administrator
**I want** to be notified when points need approval
**So that** I can process the approval queue promptly

**Acceptance Criteria:**
- [ ] In-app notification when non-approved staff enters points
- [ ] Notification shows: student name, staff name, period, points entered
- [ ] Batched: if multiple entries, combine into single notification
- [ ] Action link goes to approval queue
- [ ] Email: daily digest of pending approvals (optional)

**Technical Notes:**
- Trigger in `enterPoints()` server action
- Check if user is not approved_teacher

**FRs:** FR93

---

### Story 7.6: Compliance Deadline Alerts

**As a** DAEP administrator
**I want** alerts for 90-day and 120-day compliance deadlines
**So that** I don't miss state requirements

**Acceptance Criteria:**
- [ ] Alert at 7 days before 90-day assessment due
- [ ] Alert at 7 days before 120-day review due
- [ ] Notification shows: student name, deadline date, days remaining
- [ ] Action link goes to student profile
- [ ] Email alert to district admins
- [ ] Daily cron job checks for upcoming deadlines

**Technical Notes:**
- Vercel Cron job runs daily
- Check `days_served` against 90 and 120 thresholds

**FRs:** FR94

---

### Story 7.7: Point Milestone Notifications

**As a** DAEP student/parent
**I want** to be notified when milestones are achieved
**So that** I can celebrate progress

**Acceptance Criteria:**
- [ ] Notification when student reaches milestone (100, 250, 500 points)
- [ ] In-app notification for staff
- [ ] Email to parent (if configured and has parent email)
- [ ] Include: student name, milestone reached, total points
- [ ] Badge displayed on student profile

**Technical Notes:**
- Check cumulative points after each point entry
- Compare against `daep_point_bonus_rules` milestones

**FRs:** FR95

---

### Story 7.8: Email Template Customization

**As a** DAEP administrator
**I want** to customize email notification templates
**So that** communications reflect our district branding

**Acceptance Criteria:**
- [ ] Settings page for email templates at `/daep/settings/email-templates`
- [ ] Editable templates: subject line, body text, footer
- [ ] Variables: {{student_name}}, {{date}}, {{action_link}}
- [ ] Preview before save
- [ ] Reset to default option
- [ ] Distribution lists: configure who receives each notification type

**Technical Notes:**
- Store templates in settings table or `daep_email_templates`
- Distribution lists in `daep_notification_distribution_lists`

**FRs:** FR102, FR103

---

## FR Coverage Matrix

| FR | Epic | Story | Status |
|----|------|-------|--------|
| FR1 | - | - | ✅ Inherited (Clerk) |
| FR2 | - | - | ✅ Inherited (Clerk) |
| FR3 | 1 | 1.3 | New roles |
| FR4 | 1 | 1.3 | Role assignment |
| FR4a | 1 | 1.2 | Module access |
| FR4b | 1 | 1.2 | Module restrictions |
| FR5 | 1 | 1.4 | Approved teacher flag |
| FR6 | - | - | ✅ Inherited (RLS) |
| FR7 | - | - | ✅ Inherited (Clerk) |
| FR8 | - | - | ✅ Inherited (audit_log) |
| FR9 | 2 | 2.2 | Student profile |
| FR10 | 2 | 2.1 | Student search |
| FR11 | 2 | 2.1 | Student filters |
| FR12 | 2 | 2.4 | Create student |
| FR13 | 2 | 2.2 | Edit demographics |
| FR14 | 2 | 2.2 | Placement status |
| FR15 | 2 | 2.3 | TT status display |
| FR16 | 2 | 2.2 | Placement history |
| FR17 | 2 | 2.4 | Create placement |
| FR18 | 2 | 2.5 | Room assignment |
| FR19 | 2 | 2.4 | Placement details |
| FR20 | 2 | 2.7 | Days remaining |
| FR21 | 2 | 2.6 | Lifecycle states |
| FR22 | 2 | 2.8 | Edit placement |
| FR23 | 2 | 2.9 | Transition |
| FR24 | 2 | 2.10 | Prevent duplicates |
| FR25 | 2 | 2.11 | Rollover |
| FR26 | 2 | 2.12 | No-show |
| FR27 | 3 | 3.2 | Point entry |
| FR28 | 3 | 3.2 | Default points |
| FR29 | 3 | 3.2 | Grid view |
| FR30 | 3 | 3.3 | Bulk entry |
| FR31 | 3 | 3.5 | Auto-finalize |
| FR32 | 3 | 3.6 | Pending approval |
| FR33 | 3 | 3.6 | Approve/reject |
| FR34 | 3 | 3.7 | Cumulative points |
| FR35 | 3 | 3.7 | Milestones |
| FR36 | 3 | 3.4 | Point notes |
| FR37 | 3 | 3.8 | Point audit |
| FR38 | 3 | 3.9 | Attendance entry |
| FR39 | 3 | 3.9 | Tardy time |
| FR40 | 3 | 3.9 | Early dismiss |
| FR41 | 3 | 3.9 | Multi-period |
| FR42 | 3 | 3.10 | Excused/unexcused |
| FR43 | 3 | 3.11 | Attendance rate |
| FR44 | 3 | 3.12 | Override |
| FR45 | 4 | 4.1 | Create note |
| FR46 | 4 | 4.1 | Note fields |
| FR47 | 4 | 4.2 | Categories |
| FR48 | 4 | 4.1 | Quick entry |
| FR49 | 4 | 4.3 | Review notes |
| FR50 | 4 | 4.4 | Attach to incident |
| FR51 | 4 | 4.5 | Timeline |
| FR52 | 5 | 5.1 | CSV upload |
| FR53 | 5 | 5.2, 5.3 | Field mapping |
| FR54 | 5 | 5.4 | Compare data |
| FR55 | 5 | 5.4 | Flag discrepancies |
| FR56 | 5 | 5.5 | Categorize |
| FR57 | 5 | 5.6 | Side-by-side |
| FR58 | 5 | 5.7 | Resolution actions |
| FR59 | 5 | 5.7 | Add notes |
| FR60 | 5 | 5.8 | Reconciliation audit |
| FR61 | 5 | 5.9 | Summary report |
| FR62 | 5 | 5.10 | Unresolved alerts |
| FR63 | 1 | 1.5 | Room config |
| FR64 | 1 | 1.5 | Staff assignment |
| FR65 | 1 | 1.6 | Bell schedules |
| FR66 | 1 | 1.6 | Schedule variations |
| FR67 | 1, 3 | 1.5, 3.1 | Room roster |
| FR68 | 1 | 1.6 | Current period |
| FR69 | 1 | 1.7 | Discipline codes |
| FR70 | 1 | 1.7 | Mandatory flag |
| FR71 | 1 | 1.7 | Behavior location |
| FR72 | 1 | 1.7 | Code validation |
| FR73 | 2 | 2.13 | Shared lookup |
| FR74 | 2 | 2.13 | Expiration sync |
| FR75 | - | - | ✅ Inherited |
| FR76 | 2 | 2.3 | TT status display |
| FR77 | 2 | 2.13 | Prevent conflicts |
| FR78 | 6 | 6.1 | KPI cards |
| FR79 | 6 | 6.2 | Drill-down |
| FR80 | 6 | 6.3 | Attendance reports |
| FR81 | 6 | 6.4 | Discipline reports |
| FR82 | 6 | 6.5 | Point reports |
| FR83 | 6 | 6.6 | Placement reports |
| FR84 | 6 | 6.7 | Export |
| FR85 | 6 | 6.8 | Recidivism |
| FR86 | 6 | 6.8 | Recidivism KPI |
| FR87 | 6 | 6.9 | 90-day tracking |
| FR88 | 6 | 6.9 | 90-day alerts |
| FR89 | 6 | 6.10 | 120-day tracking |
| FR90 | 6 | 6.11 | PEIMS export |
| FR91 | 6 | 6.11 | PEIMS validation |
| FR92 | 6 | 6.11 | Code 425 |
| FR93 | 7 | 7.4, 7.5 | Email notifications |
| FR94 | 7 | 7.6 | Compliance alerts |
| FR95 | 7 | 7.7 | Milestone notifications |
| FR96 | 7 | 7.3 | Notification prefs |
| FR97 | 7 | 7.1 | Bell icon |
| FR98 | 7 | 7.2 | Dismiss/read |
| FR99 | 1 | 1.9 | District settings |
| FR100 | 1 | 1.9 | Campus settings |
| FR101 | 1 | 1.10 | Point bonus rules |
| FR102 | 7 | 7.8 | Email templates |
| FR103 | 7 | 7.8 | Distribution lists |
| FR104 | 1 | 1.8 | School calendar |
| FR105 | - | - | ✅ Inherited |
| FR106 | 6 | 6.12 | Audit view |
| FR107 | - | - | ✅ Inherited |
| FR108 | 6 | 6.12 | Audit reports |

---

## Summary

**Total Epics:** 7
**Total Stories:** 70
**Total FRs:** 110 (9 inherited, 17 partial, 84 new)

### Epic Breakdown

| Epic | Stories | Key Deliverables |
|------|---------|------------------|
| 1. Foundation | 10 | Schema, roles, module access, configuration |
| 2. Placement | 13 | Intake, lifecycle, transitions, TT sync |
| 3. Daily Ops | 12 | Points, attendance, approval workflow |
| 4. Behavior | 5 | Quick notes, categories, timeline |
| 5. Reconciliation | 10 | CSV upload, comparison, resolution |
| 6. Reporting | 12 | Dashboard, KPIs, exports, compliance |
| 7. Notifications | 8 | Bell, email, preferences |

### Recommended Implementation Order

1. **Epic 1** - Foundation (must be first)
2. **Epic 2** - Placements (core data)
3. **Epic 3** - Daily Operations (daily workflow)
4. **Epic 5** - CSV Reconciliation (core differentiator)
5. **Epic 4** - Behavior (can parallel Epic 5)
6. **Epic 6** - Reporting (needs data from 2-5)
7. **Epic 7** - Notifications (enhancement layer)

---

_Generated by BMAD Method Create-Epics-and-Stories Workflow_
_Date: 2025-11-24_
_For: Alan (Birdville ISD)_
_Project: DAEPManagement Module_

---

_For implementation: Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown._

_This document will be updated after UX Design and Architecture workflows to incorporate interaction details and technical decisions._
