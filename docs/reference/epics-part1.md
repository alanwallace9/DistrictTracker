# DAEPManagement - Epic Breakdown (Part 1)

> **Document Split:** This is Part 1 covering Overview, FR Inventory, and Epics 1a, 1b, 2.
> See [epics-part2.md](./epics-part2.md) for Epics 3, 4, 5, 6, 7 and FR Coverage Matrix.

**Author:** Alan
**Date:** 2025-11-24
**Project Level:** Multi-Tenant SaaS Platform
**Target Scale:** 10-100 Texas school districts

---

## Overview

This document provides the complete epic and story breakdown for DAEPManagement, decomposing the requirements from the [PRD](./PRD.md) into implementable stories.

**Living Document Notice:** This is the initial version. It will be updated after UX Design and Architecture workflows add interaction and technical details to stories.

## Epics Summary

| Epic | Name | Stories | Points | FRs Covered | Priority |
|------|------|---------|--------|-------------|----------|
| **1a** | Core Schema & Security | 5 | 21 | Schema + FR4a, FR4b, FR3, FR4, FR5 | P0 - Must be first |
| **1b** | Configuration UI | 6 | 18 | FR63-FR72, FR99-FR104 | P0 - Before features |
| **2** | Placement Management | 13 | 34 | FR9-FR26, FR73-FR77 | P0 - Core functionality |
| **3** | Daily Operations (Points & Attendance) | 12 | 29 | FR27-FR44 | P0 - Daily use |
| **4** | Behavior Documentation | 5 | 13 | FR45-FR51 | P1 - Important |
| **5** | CSV Reconciliation | 10 | 34 | FR52-FR62 | P0 - Core differentiator |
| **6** | Dashboard & Reporting | 12 | 34 | FR78-FR92, FR108 | P1 - Analytics |
| **7** | Notifications & Alerts | 8 | 21 | FR93-FR98, FR102-FR103 | P2 - Enhancement |
| **Total** | | **71 stories** | **204 pts** | **110 FRs** | |

**Recommended Epic Order:**
1. Epic 1a (Core Schema) → Must be first - TT migration, DAEP schema, roles
2. Epic 1b (Configuration) → Settings UI before feature work
3. Epic 2 (Placements) → Can't track students without placements
4. Epic 3 (Daily Ops) → Core daily workflow
5. Epic 5 (Reconciliation) → Core differentiator
6. Epic 4 (Behavior) → Can be parallel with Epic 5
7. Epic 6 (Reporting) → Needs data from Epics 2-5
8. Epic 7 (Notifications) → Enhancement layer

**Story Point Scale:** 1=trivial, 2=small, 3=medium, 5=large, 8=extra-large, 13=epic-sized (should split)

---

## Functional Requirements Inventory

> **Legend:**
> - ✅ **INHERITED** = Already built in TrespassTracker, no work needed
> - 🔄 **PARTIAL** = Infrastructure exists, needs DAEP-specific extension
> - 🆕 **NEW** = Entirely new for DAEP module

### User Management & Authentication (FR1-FR8 + FR4a, FR4b)
- ✅ **FR1:** Users can authenticate via magic link email (passwordless) — *Clerk handles this*
- ✅ **FR2:** Users can create a password after initial magic link authentication — *Clerk handles this*
- 🔄 **FR3:** Administrators can create, edit, and deactivate user accounts — *Admin panel exists; need DAEP roles*
- 🔄 **FR4:** Administrators can assign roles and permissions to users — *Role system exists; need: DAEP Staff, DAEP Admin L1/L2, Parent, Student, Counselor*
- 🆕 **FR4a:** Administrators can assign module access to users (TrespassTracker only, DAEP only, or both) — *New module_access field in user_profiles*
- 🆕 **FR4b:** System restricts navigation and data access based on user's assigned modules — *Middleware + UI filtering*
- 🆕 **FR5:** Administrators can designate teachers as "approved" for immediate point posting — *New DAEP-specific permission*
- ✅ **FR6:** Users can only access data within their assigned scope (district/campus/room) — *RLS policies exist*
- ✅ **FR7:** System maintains session with automatic logout after inactivity period — *Clerk handles this*
- ✅ **FR8:** System logs all authentication events for security audit — *admin_audit_log exists*

### Student Management (FR9-FR16)
- 🔄 **FR9:** Users can view student profiles with demographics and contact information — *trespass_records has demographics; need DAEP profile view*
- 🆕 **FR10:** Users can search students by name, ID, home campus, or current status — *New DAEP search UI*
- 🆕 **FR11:** Users can filter student lists by placement status, campus, room, or date range — *New DAEP filters*
- 🔄 **FR12:** Administrators can create student records manually — *Can create in trespass_records; need DAEP intake flow*
- 🔄 **FR13:** Administrators can edit student demographic information — *trespass_records editable; need DAEP UI*
- 🆕 **FR14:** System displays student's current placement status prominently on profile — *New DAEP status display*
- 🔄 **FR15:** System shows TrespassTracker status for students with active trespass records — *trespass_records.is_daep flag exists*
- 🆕 **FR16:** Users can view student's placement history across all DAEP assignments — *New placement history view*

### Placement Management (FR17-FR26)
- 🆕 **FR17:** Administrators can create new placements with intake information — *daep_placements table + intake workflow*
- 🆕 **FR18:** Administrators can assign students to specific DAEP rooms — *daep_rooms + separation logic*
- 🆕 **FR19:** System captures placement details: incident number, discipline code, start date, days assigned — *New schema*
- 🆕 **FR20:** System calculates and displays days remaining in placement — *School calendar-aware calculation*
- 🆕 **FR21:** System tracks placement lifecycle: Pending → Active → Transition → Complete — *State machine*
- 🆕 **FR22:** Administrators can modify placement details (extend/reduce days, change room) — *Placement editing*
- 🆕 **FR23:** Administrators can process student transition back to home campus — *Transition workflow*
- 🆕 **FR24:** System prevents duplicate active placements for the same student — *Unique constraint*
- 🆕 **FR25:** System handles rollover students (placement spanning school years) — *Rollover logic*
- 🆕 **FR26:** System handles no-show students (assigned but never attended) — *No-show tracking*

### Daily Point Tracking (FR27-FR37)
- 🆕 **FR27:** Staff can enter points (0-10) for each student per period — *daep_daily_points table*
- 🆕 **FR28:** System defaults point entry to 10 (full points) for efficiency — *Default value in form*
- 🆕 **FR29:** Staff can enter points for multiple students in a grid view — *Point entry grid UI*
- 🆕 **FR30:** System supports bulk point entry for common scenarios — *Bulk actions dropdown*
- 🆕 **FR31:** Approved teachers' points are immediately finalized — *approval_status logic*
- 🆕 **FR32:** Non-approved staff points require administrator approval — *Pending approval workflow*
- 🆕 **FR33:** Administrators can approve or reject pending point entries — *Approval queue UI*
- 🆕 **FR34:** System calculates cumulative points toward placement goals — *Aggregate calculations*
- 🆕 **FR35:** System displays progress toward point milestones (e.g., 500 points, 200 remaining) — *Progress display*
- 🆕 **FR36:** Staff can add notes/comments to individual point entries — *Notes field in daep_daily_points*
- 🔄 **FR37:** System maintains complete audit trail of all point changes — *Uses admin_audit_log*

### Attendance Tracking (FR38-FR44)
- 🆕 **FR38:** Staff can record attendance status per student per period (Present/Absent/Tardy) — *daep_attendance table*
- 🆕 **FR39:** System captures timestamps for tardy arrivals — *tardy_time field*
- 🆕 **FR40:** System captures timestamps for early dismissals — *early_dismiss_time field*
- 🆕 **FR41:** Staff can record attendance for multiple periods simultaneously — *Bulk attendance UI*
- 🆕 **FR42:** System distinguishes between excused and unexcused absences — *excused boolean + reason*
- 🆕 **FR43:** System calculates daily and cumulative attendance rates — *Aggregate calculations*
- 🔄 **FR44:** Administrators can override or correct attendance records with audit trail — *Uses admin_audit_log*

### Behavior Documentation (FR45-FR51)
- 🆕 **FR45:** Staff can create behavior notes for any student in their scope — *daep_behavior_notes table*
- 🆕 **FR46:** Behavior notes capture: date, time, category, description, staff member — *Schema fields*
- 🆕 **FR47:** System supports predefined behavior categories (positive and negative) — *daep_behavior_categories*
- 🆕 **FR48:** Staff can complete behavior note entry in under 30 seconds — *Quick-tap modal (UX spec)*
- 🆕 **FR49:** Administrators can review all behavior notes for students — *Notes list view*
- 🆕 **FR50:** System supports attaching behavior notes to specific incidents — *placement_id FK*
- 🆕 **FR51:** Behavior notes are visible on student profile timeline — *Timeline component*

### Data Reconciliation (FR52-FR62) - 🌟 CORE DIFFERENTIATOR
- 🆕 **FR52:** Administrators can upload CSV files from district SIS — *Supabase Storage upload*
- 🆕 **FR53:** System parses CSV and maps fields to internal data model — *PapaParse + field mapping config*
- 🆕 **FR54:** System compares uploaded data against existing DAEP records — *Reconciliation engine*
- 🆕 **FR55:** System flags discrepancies between SIS and DAEP data — *Banking-style comparison*
- 🆕 **FR56:** System categorizes discrepancies: new students, missing students, data conflicts — *Discrepancy types*
- 🆕 **FR57:** Administrators can review each discrepancy with side-by-side comparison — *Comparison UI*
- 🆕 **FR58:** Administrators can accept SIS data, keep DAEP data, or merge manually — *Resolution actions*
- 🆕 **FR59:** Administrators can add notes explaining reconciliation decisions — *Notes field*
- 🔄 **FR60:** System maintains audit trail of all reconciliation actions — *Uses admin_audit_log*
- 🆕 **FR61:** System generates reconciliation summary report — *Summary view*
- 🆕 **FR62:** System alerts administrators to unresolved discrepancies — *Notification trigger*

### Room & Schedule Management (FR63-FR68)
- 🆕 **FR63:** Administrators can create and configure DAEP rooms — *daep_rooms table*
- 🆕 **FR64:** Administrators can assign staff to rooms — *daep_room_staff table*
- 🆕 **FR65:** Administrators can configure bell schedules per campus — *daep_bell_schedules table*
- 🆕 **FR66:** System supports multiple bell schedule variations (regular, early release, etc.) — *Schedule types*
- 🆕 **FR67:** Staff can view roster of students assigned to their room — *Room roster view*
- 🆕 **FR68:** System displays current period based on bell schedule — *Real-time period calc*

### Discipline Code Management (FR69-FR72)
- 🆕 **FR69:** Administrators can configure discipline codes with labels and categories — *daep_discipline_codes table*
- 🆕 **FR70:** System supports mandatory vs. discretionary placement flags — *mandatory_placement field*
- 🆕 **FR71:** Discipline codes include behavior location classification — *behavior_location field*
- 🆕 **FR72:** System validates placement entries against configured codes — *Code validation*

### TrespassTracker Integration (FR73-FR77)
- 🔄 **FR73:** System shares student lookup across DAEP and TrespassTracker modules — *trespass_records.school_id as FK*
- 🔄 **FR74:** System synchronizes expiration dates between modules — *is_daep + daep_expiration_date fields*
- ✅ **FR75:** System shares parent/guardian contact information — *trespass_records has guardian info*
- 🆕 **FR76:** Users can view TrespassTracker status from DAEP student profile — *Cross-module display*
- 🔄 **FR77:** System prevents conflicting data between modules — *Application logic + constraints*

### Reporting & Analytics (FR78-FR86)
- 🆕 **FR78:** Dashboard displays real-time KPI cards (enrollment, attendance, points) — *Tremor charts*
- 🆕 **FR79:** KPI cards are clickable, drilling down to filtered student lists — *Drill-down navigation*
- 🆕 **FR80:** System generates attendance reports by date range — *Attendance report*
- 🆕 **FR81:** System generates discipline reports by code, campus, or date range — *Discipline report*
- 🆕 **FR82:** System generates point progress reports — *Point progress report*
- 🆕 **FR83:** System generates placement length reports — *Placement report*
- 🔄 **FR84:** Administrators can export reports in PDF and Excel formats — *Export patterns from TT*
- 🆕 **FR85:** System tracks recidivism (same-year re-placements) — *Recidivism queries*
- 🆕 **FR86:** Dashboard displays recidivism rate metrics — *Recidivism KPI card*

### Compliance & State Reporting (FR87-FR92)
- 🆕 **FR87:** System tracks 90-day assessment requirements per TEC §37.0082 — *assessment_90day_required flag*
- 🆕 **FR88:** System generates alerts for upcoming 90-day assessment deadlines — *Compliance notifications*
- 🆕 **FR89:** System tracks 120-day status review requirements — *120-day tracking*
- 🆕 **FR90:** System generates PEIMS Submission 3 export in TEA-required format — *PEIMS export*
- 🆕 **FR91:** System validates PEIMS export data against TEA requirements — *PEIMS validation*
- 🆕 **FR92:** System maintains discipline action records (Code 425) per PEIMS standards — *Code 425 tracking*

### Notifications & Alerts (FR93-FR98)
- 🆕 **FR93:** System sends email notifications for pending approvals — *Email infrastructure needed*
- 🆕 **FR94:** System sends alerts for compliance deadlines (90-day, 120-day) — *Cron job triggers*
- 🆕 **FR95:** System sends notifications for point milestones achieved — *Milestone triggers*
- 🆕 **FR96:** Administrators can configure notification preferences — *Preferences UI*
- 🔄 **FR97:** System displays in-app notification bell with unread count — *Bell pattern from TT (enhanced)*
- 🆕 **FR98:** Users can dismiss or mark notifications as read — *daep_notifications table*

### Configuration & Settings (FR99-FR104)
- 🔄 **FR99:** Administrators can configure district-wide settings — *Settings pattern from TT; DAEP-specific*
- 🔄 **FR100:** Administrators can configure campus-specific settings — *Campus config pattern*
- 🆕 **FR101:** Administrators can configure point bonus rules — *daep_point_bonus_rules table*
- 🆕 **FR102:** Administrators can customize email notification templates — *Template config*
- 🆕 **FR103:** Administrators can manage distribution lists for notifications — *Distribution lists*
- 🆕 **FR104:** System supports district calendar configuration (school days, holidays) — *daep_school_calendar table*

### Audit & History (FR105-FR108)
- ✅ **FR105:** System logs all data changes with user, timestamp, and before/after values — *admin_audit_log exists*
- 🔄 **FR106:** Administrators can view audit history for any record — *Audit UI pattern from TT; DAEP filter*
- ✅ **FR107:** System maintains immutable audit trail for compliance — *admin_audit_log is immutable*
- 🆕 **FR108:** Administrators can generate audit reports by user or date range — *Audit report UI*

---

## FR Status Summary

| Status | Count | Description |
|--------|-------|-------------|
| ✅ INHERITED | 9 | Already built, no work needed |
| 🔄 PARTIAL | 17 | Infrastructure exists, needs extension |
| 🆕 NEW | 84 | Entirely new for DAEP module |
| **Total** | **110** | (108 original + FR4a, FR4b for module access) |

**Key Inherited Infrastructure:**
- Clerk authentication (FR1, FR2, FR7)
- RLS/scoped access (FR6)
- Audit logging (FR8, FR37, FR44, FR60, FR105, FR107)
- Guardian info in trespass_records (FR75)

**Key Partial Work:**
- Add new roles: DAEP Staff, DAEP Admin L1/L2, Parent, Student, Counselor (FR3, FR4)
- Student demographics in trespass_records (FR9, FR12, FR13, FR15)
- TrespassTracker integration fields (FR73, FR74, FR77)
- Export patterns (FR84)
- Settings/notification patterns (FR97, FR99, FR100, FR106)

**Critical Addition - Module Access Control (FR4a, FR4b):**
- Users can be assigned access to: TrespassTracker only, DAEP only, or Both modules
- Navigation sidebar shows only modules user has access to
- API/Server Actions enforce module access (not just role-based)

---

## Epic Structure

### Epic 1a: Core Schema & Security
**Goal:** Establish database schema foundation including TrespassTracker integration fields and security controls
**FRs:** FR3, FR4, FR4a, FR4b, FR5 + Schema foundation
**Stories:** 5
**Total Points:** 21

| Story | Description | FRs | Points |
|-------|-------------|-----|--------|
| 1.0 | TrespassTracker schema update (incident_number, incident_date) | TT Integration | 3 |
| 1.1 | Database migrations for all 21 DAEP tables | Schema foundation | 8 |
| 1.2 | Add module_access field to user_profiles + RLS policies | FR4a, FR4b | 3 |
| 1.3 | Add new roles (DAEP Admin L1/L2, DAEP Staff, Parent, Student, Counselor) | FR3, FR4 | 5 |
| 1.4 | "Approved teacher" flag for point approval bypass | FR5 | 2 |

**Demo Checkpoint:** After Epic 1a, can demo role assignment and module access control

---

### Epic 1b: Configuration UI
**Goal:** Build configuration screens for rooms, schedules, codes, and settings before feature work
**FRs:** FR63-FR72, FR99-FR104
**Stories:** 6
**Total Points:** 18

| Story | Description | FRs | Points |
|-------|-------------|-----|--------|
| 1.5 | Room management (CRUD + staff assignment) | FR63, FR64, FR67 | 3 |
| 1.6 | Bell schedule configuration | FR65, FR66, FR68 | 3 |
| 1.7 | Discipline code management (PEIMS codes) | FR69-FR72 | 3 |
| 1.8 | School calendar configuration | FR104 | 5 |
| 1.9 | District/campus settings for DAEP | FR99, FR100 | 2 |
| 1.10 | Behavior categories configuration | FR47, FR101 | 2 |

**Demo Checkpoint:** After Epic 1b, can demo full configuration workflow

---

### Epic 2: Placement Management
**Goal:** Complete student intake, placement lifecycle, and transition workflows
**FRs:** FR9-FR26, FR73-FR77
**Stories:** 13
**Total Points:** 34

| Story | Description | FRs | Points |
|-------|-------------|-----|--------|
| 2.1 | Student search and list view (DAEP-specific) | FR10, FR11 | 3 |
| 2.2 | Student profile page with demographics | FR9, FR14, FR16 | 3 |
| 2.3 | TrespassTracker status display on DAEP profile | FR15, FR76 | 2 |
| 2.4 | Create new placement (intake form) | FR17, FR19 | 5 |
| 2.5 | Room assignment with separation logic | FR18 | 3 |
| 2.6 | Placement lifecycle state machine (Pending→Active→Transition→Complete) | FR21 | 5 |
| 2.7 | Days remaining calculation (school calendar aware) | FR20 | 3 |
| 2.8 | Edit placement (extend/reduce days, change room) | FR22 | 2 |
| 2.9 | Transition workflow (return to home campus) | FR23 | 3 |
| 2.10 | Prevent duplicate active placements | FR24 | 1 |
| 2.11 | Rollover student handling | FR25 | 2 |
| 2.12 | No-show student tracking | FR26 | 1 |
| 2.13 | TrespassTracker sync (is_daep flag, expiration dates) | FR73, FR74, FR77 | 1 |

---

### Epic 3: Daily Operations (Points & Attendance)
**Goal:** Staff can efficiently track daily points and attendance for DAEP students
**FRs:** FR27-FR44
**Stories:** 12
**Total Points:** 29

| Story | Description | FRs | Points |
|-------|-------------|-----|--------|
| 3.1 | Room roster view (students assigned to room) | FR67 | 3 |
| 3.2 | Point entry grid (0-10 per student per period) | FR27, FR28, FR29 | 5 |
| 3.3 | Bulk point entry (select all, common scenarios) | FR30 | 2 |
| 3.4 | Point notes/comments | FR36 | 2 |
| 3.5 | Approved teacher auto-finalize | FR31 | 2 |
| 3.6 | Pending approval workflow for non-approved staff | FR32, FR33 | 3 |
| 3.7 | Cumulative points calculation + milestones | FR34, FR35 | 3 |
| 3.8 | Point audit trail | FR37 | 2 |
| 3.9 | Attendance entry (P/A/T/ED per period) | FR38, FR39, FR40, FR41 | 3 |
| 3.10 | Excused vs unexcused absences | FR42 | 1 |
| 3.11 | Attendance rate calculations | FR43 | 2 |
| 3.12 | Attendance override with audit | FR44 | 1 |

---

### Epic 4: Behavior Documentation
**Goal:** Quick behavior note entry with timeline visibility
**FRs:** FR45-FR51
**Stories:** 5
**Total Points:** 13

| Story | Description | FRs | Points |
|-------|-------------|-----|--------|
| 4.1 | Quick behavior note modal (<30 seconds) | FR45, FR46, FR48 | 3 |
| 4.2 | Predefined behavior categories (positive/negative) | FR47 | 2 |
| 4.3 | Behavior notes list view (admin review) | FR49 | 3 |
| 4.4 | Attach notes to specific incidents/placements | FR50 | 2 |
| 4.5 | Student profile timeline with behavior notes | FR51 | 3 |

---

### Epic 5: CSV Reconciliation (Core Differentiator)
**Goal:** Banking-style SIS data comparison with side-by-side resolution
**FRs:** FR52-FR62
**Stories:** 10
**Total Points:** 34

| Story | Description | FRs | Points |
|-------|-------------|-----|--------|
| 5.1 | CSV upload to Supabase Storage | FR52 | 2 |
| 5.2 | One-time field mapping setup (per district) | FR53 | 5 |
| 5.3 | Parse CSV with PapaParse | FR53 | 3 |
| 5.4 | Comparison engine (SIS vs DAEP records) | FR54, FR55 | 5 |
| 5.5 | Discrepancy categorization (new, missing, conflict) | FR56 | 3 |
| 5.6 | Side-by-side comparison UI | FR57 | 5 |
| 5.7 | Resolution actions (Accept SIS, Keep DAEP, Add Note) | FR58, FR59 | 5 |
| 5.8 | Reconciliation audit trail | FR60 | 2 |
| 5.9 | Reconciliation summary report | FR61 | 2 |
| 5.10 | Unresolved discrepancy alerts | FR62 | 2 |

---

### Epic 6: Dashboard & Reporting
**Goal:** KPI dashboard with drill-down and exportable reports
**FRs:** FR78-FR92, FR108
**Stories:** 12
**Total Points:** 34

| Story | Description | FRs | Points |
|-------|-------------|-----|--------|
| 6.1 | Dashboard page with KPI cards (Tremor) | FR78 | 5 |
| 6.2 | Clickable KPIs → filtered student lists | FR79 | 2 |
| 6.3 | Attendance reports | FR80 | 3 |
| 6.4 | Discipline reports (by code, campus, date) | FR81 | 3 |
| 6.5 | Point progress reports | FR82 | 3 |
| 6.6 | Placement length reports | FR83 | 2 |
| 6.7 | PDF/Excel export | FR84 | 3 |
| 6.8 | Recidivism tracking and KPI | FR85, FR86 | 5 |
| 6.9 | 90-day assessment tracking (TEC §37.0082) | FR87, FR88 | 3 |
| 6.10 | 120-day status review tracking | FR89 | 2 |
| 6.11 | PEIMS Submission 3 export | FR90, FR91, FR92 | 5 |
| 6.12 | Audit reports by user/date | FR108 | 2 |

---

### Epic 7: Notifications & Alerts
**Goal:** In-app notifications and email alerts for key events
**FRs:** FR93-FR98, FR102-FR103
**Stories:** 8
**Total Points:** 21

| Story | Description | FRs | Points |
|-------|-------------|-----|--------|
| 7.1 | daep_notifications table + in-app bell icon | FR97 | 3 |
| 7.2 | Notification dismiss/mark as read | FR98 | 2 |
| 7.3 | Notification preferences configuration | FR96 | 2 |
| 7.4 | Email infrastructure (Resend integration) | FR93 | 5 |
| 7.5 | Point approval pending notifications | FR93 | 2 |
| 7.6 | Compliance deadline alerts (90-day, 120-day) | FR94 | 3 |
| 7.7 | Point milestone notifications | FR95 | 2 |
| 7.8 | Email template customization | FR102, FR103 | 2 |

**Email Decision Required:** Confirm Resend as email provider before starting Story 7.4

---

## FR Coverage Map

{{fr_coverage_map}}

---

## Epic 1a: Core Schema & Security (Detailed)

**Goal:** Establish database schema foundation including TrespassTracker integration fields and security controls.

**Dependencies:** None (must be first)
**Stories:** 5
**Total Points:** 21

---

### Story 1.0: TrespassTracker Schema Update

**As a** developer
**I want** incident_number and incident_date fields added to trespass_records
**So that** DAEP placements can link to specific incidents for CSV reconciliation

**Story Points:** 3

**Acceptance Criteria:**
- [ ] Migration adds `incident_number` (TEXT, nullable) to `trespass_records`
- [ ] Migration adds `incident_date` (DATE, nullable) to `trespass_records`
- [ ] Index created on `incident_number` for fast lookups
- [ ] Backfill script available for manual incident number assignment
- [ ] Existing TrespassTracker UI unchanged (display logic uses incident_date for ordering if available, fallback to created_at)
- [ ] Migration runs successfully on local and staging Supabase
- [ ] Documentation updated in architecture.md

**Technical Notes:**
- See Architecture.md "Future Enhancements" section for detailed requirements
- `incident_number` comes from SIS CSV during DAEP reconciliation
- For non-students (manual entries): format `{campus}-{date}` (e.g., "BHS-10/24/25")
- TrespassTracker UI should NOT display `incident_number` - it's for backend linking only
- This migration is prerequisite for Epic 5 (CSV Reconciliation) full functionality

**FRs:** TT Integration (prerequisite for FR52-FR62)

---

### Story 1.1: DAEP Database Schema Migration

**As a** developer
**I want** all DAEP tables created with proper indexes and RLS policies
**So that** subsequent stories have the data foundation they need

**Acceptance Criteria:**
- [ ] Migration creates all 21 DAEP tables per architecture.md schema
- [ ] All tables have `tenant_id` column with NOT NULL constraint
- [ ] RLS policies enabled on all tables filtering by `tenant_id`
- [ ] Indexes created on `tenant_id`, `school_id`, `placement_id`, `date` columns
- [ ] `updated_at` triggers created for applicable tables
- [ ] Migration runs successfully on local Supabase
- [ ] No breaking changes to existing TrespassTracker tables

**Technical Notes:**
- Tables: `daep_placements`, `daep_daily_points`, `daep_attendance`, `daep_behavior_notes`, `daep_rooms`, `daep_room_staff`, `daep_bell_schedules`, `daep_school_calendar`, `daep_discipline_codes`, `daep_behavior_categories`, `daep_point_bonus_rules`, `daep_student_separations`, `daep_notifications`, `daep_csv_field_mappings`, `daep_reconciliation_sessions`, `daep_reconciliation_discrepancies`, `daep_reconciliation_audit`
- Add `module` column to `admin_audit_log` if not exists
- Add DAEP fields to `trespass_records`: `grade_level`, `parent_email`, `emergency_contact_name`, `emergency_contact_phone`, `special_education`, `plan_504`, `ell_status`

**FRs:** Schema foundation for all FRs

---

### Story 1.2: Module Access Control

**As an** administrator
**I want** to assign module access to users (TrespassTracker only, DAEP only, or Both)
**So that** users only see and access the modules they're authorized for

**Acceptance Criteria:**
- [ ] `user_profiles` table has new `module_access` column (enum: 'trespass_only', 'daep_only', 'both')
- [ ] Default value is 'both' for existing users (backwards compatible)
- [ ] Admin panel shows module access dropdown when editing users
- [ ] Navigation sidebar only shows modules user has access to
- [ ] Middleware blocks access to `/daep/*` routes if user has 'trespass_only'
- [ ] Middleware blocks access to `/trespass/*` routes if user has 'daep_only'
- [ ] Server actions check module access before processing requests
- [ ] Audit log records module access changes

**Technical Notes:**
- Update `middleware.ts` to check `module_access` from user profile
- Update sidebar component to filter nav items by module access
- Add `checkModuleAccess()` utility for server actions

**FRs:** FR4a, FR4b

---

### Story 1.3: New DAEP Roles

**As an** administrator
**I want** to assign DAEP-specific roles to users
**So that** staff have appropriate permissions for their responsibilities

**Acceptance Criteria:**
- [ ] New roles added to `user_profiles.role` enum: `daep_admin_l1`, `daep_admin_l2`, `daep_staff`, `parent`, `student`, `counselor`
- [ ] Role permissions documented in code comments
- [ ] Admin panel role dropdown includes new roles
- [ ] RLS policies updated to handle new roles
- [ ] Role hierarchy: district_admin > daep_admin_l1 > daep_admin_l2 > daep_staff
- [ ] Parent/Student roles have read-only access to own data only
- [ ] Existing roles (viewer, campus_admin, district_admin, master_admin) unchanged

**Role Definitions:**
| Role | Scope | Permissions |
|------|-------|-------------|
| daep_admin_l1 | DAEP campus | Full DAEP ops, point approval, staff management |
| daep_admin_l2 | DAEP campus | Daily ops, point entry, limited reports |
| daep_staff | Assigned rooms | Point entry, attendance, behavior notes |
| parent | Own child | Read-only student progress |
| student | Self | Read-only own progress |
| counselor | Assigned students | View profiles, placement history |

**FRs:** FR3, FR4

---

### Story 1.4: Approved Teacher Flag

**As an** administrator
**I want** to designate specific teachers as "approved" for immediate point posting
**So that** trusted staff don't need admin approval for their point entries

**Acceptance Criteria:**
- [ ] `user_profiles` table has new `approved_teacher` boolean column (default: false)
- [ ] Admin panel shows "Approved Teacher" toggle on user edit form
- [ ] Only visible for users with `daep_staff` or `daep_admin_l2` role
- [ ] Point entry logic checks this flag to determine if approval needed
- [ ] Audit log records when flag is changed
- [ ] Flag can be toggled without changing other user properties

**Technical Notes:**
- This flag is per-user, not per-room
- Used in Story 3.5 and 3.6 for point approval workflow

**FRs:** FR5

---

## Epic 1b: Configuration UI (Detailed)

**Goal:** Build configuration screens for rooms, schedules, codes, and settings before feature work.

**Dependencies:** Epic 1a (schema must exist)
**Stories:** 6
**Total Points:** 18

---

### Story 1.5: Room Management

**As a** DAEP administrator
**I want** to create and configure DAEP rooms with staff assignments
**So that** students can be assigned to specific rooms and staff can view their rosters

**Acceptance Criteria:**
- [ ] Settings page has "Rooms" tab at `/daep/settings/rooms`
- [ ] Can create room with: room_number, room_name, capacity (default 15), building_section
- [ ] Can edit existing room properties
- [ ] Can deactivate room (soft delete, not hard delete)
- [ ] Can assign multiple staff to a room
- [ ] Can set staff assignment type (homeroom vs rotational)
- [ ] Room list shows current student count vs capacity
- [ ] Building section used for separation logic (e.g., "501-505" vs "506-509")

**Technical Notes:**
- Uses `daep_rooms` and `daep_room_staff` tables
- Building section is free text for flexibility across districts

**FRs:** FR63, FR64, FR67

---

### Story 1.6: Bell Schedule Configuration

**As a** DAEP administrator
**I want** to configure bell schedules with multiple variations
**So that** the system knows current period for point/attendance entry

**Acceptance Criteria:**
- [ ] Settings page has "Bell Schedules" tab at `/daep/settings/schedules`
- [ ] Can create schedule with name (e.g., "Regular Day", "Early Release")
- [ ] Can define periods with: period name, start_time, end_time
- [ ] Can set one schedule as default
- [ ] Can assign schedule to specific calendar dates
- [ ] System calculates current period based on active schedule + current time
- [ ] Period selector in point entry auto-selects current period
- [ ] Support for 6-8 periods per day

**Technical Notes:**
- Uses `daep_bell_schedules` table with JSONB `periods` column
- `daep_school_calendar` links dates to schedules
- `getCurrentPeriod()` utility function for real-time calculation

**FRs:** FR65, FR66, FR68

---

### Story 1.7: Discipline Code Management

**As a** DAEP administrator
**I want** to configure Texas PEIMS discipline codes
**So that** placements can be categorized correctly for state reporting

**Acceptance Criteria:**
- [ ] Settings page has "Discipline Codes" tab at `/daep/settings/codes`
- [ ] Can create code with: PEIMS code, label, mandatory_placement flag, behavior_location
- [ ] Can edit existing codes
- [ ] Can deactivate codes (not delete - historical data integrity)
- [ ] Behavior location options: on_campus, off_campus, school_sponsored
- [ ] Mandatory flag indicates required DAEP placement vs discretionary
- [ ] Codes dropdown in placement form only shows active codes
- [ ] Placement form validates selected code exists

**Technical Notes:**
- Uses `daep_discipline_codes` table
- Pre-seed common Texas PEIMS codes on first setup
- Code validation in Story 2.4 (Create Placement)

**FRs:** FR69, FR70, FR71, FR72

---

### Story 1.8: School Calendar Configuration

**As a** DAEP administrator
**I want** to upload and manage the school calendar
**So that** days remaining calculations use actual school days

**Acceptance Criteria:**
- [ ] Settings page has "Calendar" tab at `/daep/settings/calendar`
- [ ] Can upload CSV with school calendar (date, is_school_day, day_type)
- [ ] Can manually mark dates as non-school days (holidays, weather days)
- [ ] Can assign bell schedule to specific dates
- [ ] Calendar view shows month grid with day types color-coded
- [ ] Day types: Regular, Holiday, Teacher Workday, Bad Weather, Early Release
- [ ] School year selector (e.g., "2024-2025")
- [ ] Days remaining calculation uses this calendar (Story 2.7)

**Technical Notes:**
- Uses `daep_school_calendar` table
- CSV format: date (MM/DD/YYYY), is_school_day (true/false), day_type, notes
- Weather days typically added mid-year (second semester)

**FRs:** FR104

---

### Story 1.9: District/Campus DAEP Settings

**As a** DAEP administrator
**I want** to configure district-wide and campus-specific DAEP settings
**So that** the system behaves according to our policies

**Acceptance Criteria:**
- [ ] Settings page has "General" tab at `/daep/settings`
- [ ] District-level settings: timezone, default points per period, attendance threshold
- [ ] Campus-level settings: DAEP campus name, address, phone
- [ ] Settings stored in tenant-scoped configuration
- [ ] Changes logged to audit trail
- [ ] Settings take effect immediately (no restart needed)

**Technical Notes:**
- Could use `daep_settings` table or extend existing tenant settings
- Timezone defaults to 'America/Chicago' for this build

**FRs:** FR99, FR100

---

### Story 1.10: Behavior Categories Configuration

**As a** DAEP administrator
**I want** to configure behavior categories for point entries and notes
**So that** staff can quickly categorize student behaviors

**Acceptance Criteria:**
- [ ] Settings page has "Behavior Categories" tab at `/daep/settings/behaviors`
- [ ] Can create category with: name, type (positive/negative/neutral), sort_order
- [ ] Can edit existing categories
- [ ] Can deactivate categories
- [ ] Categories appear in point entry dropdown (student_action field)
- [ ] Categories appear in behavior note form
- [ ] Pre-seed common categories on first setup
- [ ] Sort order controls display sequence in dropdowns

**Pre-seeded Categories:**
- Positive: On Task, Helped Peer, Showed Respect, Completed Work
- Negative: Talk Back, Off Task, Disruptive, Incomplete Work
- Neutral: Redirected, Conference, Parent Contact

**Technical Notes:**
- Uses `daep_behavior_categories` table
- Also configure point bonus rules (`daep_point_bonus_rules`) - Story 1.10b if needed

**FRs:** FR47, FR101

---

## Epic 2: Placement Management (Detailed)

**Goal:** Complete student intake, placement lifecycle, room assignment, and transition workflows.

**Dependencies:** Epic 1 (schema, roles, rooms, discipline codes)
**Estimated Stories:** 13

---

### Story 2.1: Student Search and List View

**As a** DAEP staff member
**I want** to search and filter DAEP students
**So that** I can quickly find students I need to work with

**Acceptance Criteria:**
- [ ] Student list page at `/daep/students`
- [ ] Search by: student name, student ID (school_id), home campus
- [ ] Filter by: placement status (Pending/Active/Transition/Complete), assigned room, date range
- [ ] List shows: name, student ID, status badge, home campus, days remaining, room
- [ ] Pagination for large lists (25 per page)
- [ ] Click row to navigate to student profile
- [ ] Empty state when no results
- [ ] Search is case-insensitive and partial match

**Technical Notes:**
- Query `daep_placements` joined with `trespass_records` for demographics
- Use existing search patterns from TrespassTracker

**FRs:** FR10, FR11

---

### Story 2.2: Student Profile Page

**As a** DAEP staff member
**I want** to view a student's complete profile with demographics and placement info
**So that** I have full context when working with the student

**Acceptance Criteria:**
- [ ] Profile page at `/daep/students/[school_id]`
- [ ] Header: photo (if available), name, student ID, grade level, home campus
- [ ] Demographics section: DOB, guardian name, guardian phone, parent email, emergency contact
- [ ] Special flags: Special Ed, 504 Plan, ELL status (from trespass_records)
- [ ] Current placement card (if active): status, days assigned/served/remaining, room, offense code
- [ ] Placement history tab: all past placements with dates and outcomes
- [ ] Quick actions: Edit placement, Add behavior note, View attendance

**Technical Notes:**
- Demographics from `trespass_records` (shared with TrespassTracker)
- Placement data from `daep_placements`

**FRs:** FR9, FR14, FR16

---

### Story 2.3: TrespassTracker Status Display

**As a** DAEP staff member
**I want** to see if a student has active trespass records
**So that** I'm aware of their full disciplinary history

**Acceptance Criteria:**
- [ ] Student profile shows "TrespassTracker Status" section
- [ ] Displays: is_daep flag status, daep_expiration_date
- [ ] If student has trespass records, show count and most recent incident
- [ ] Link to view full trespass details (if user has TT module access)
- [ ] Warning banner if student is flagged in TrespassTracker
- [ ] Handle case where student exists in DAEP but not in trespass_records

**Technical Notes:**
- Query `trespass_records` by `school_id` and `tenant_id`
- Respect module access (don't show TT link if user is 'daep_only')

**FRs:** FR15, FR76

---

### Story 2.4: Create New Placement (Intake Form)

**As a** DAEP administrator
**I want** to create a new placement with all required intake information
**So that** a student can be officially enrolled at DAEP

**Acceptance Criteria:**
- [ ] "New Placement" button on student list and student profile
- [ ] Form fields: student lookup (autocomplete), incident_number, offense_code (dropdown), placement_reason, days_assigned, start_date, home_campus (dropdown), assigned_room (dropdown)
- [ ] Student lookup searches `trespass_records` by name or school_id
- [ ] If student not found, option to create new (adds to trespass_records)
- [ ] Incident number must be unique per student (validation)
- [ ] Offense code dropdown populated from `daep_discipline_codes`
- [ ] Room dropdown shows available rooms with capacity
- [ ] Placement created with status='pending'
- [ ] Audit log records placement creation
- [ ] Success: redirect to student profile with success toast

**Technical Notes:**
- Server action: `createPlacement()` in `app/actions/daep/placements.ts`
- Validates against `daep_discipline_codes`
- Uses pattern from architecture.md

**FRs:** FR17, FR19

---

### Story 2.5: Room Assignment with Separation Logic

**As a** DAEP administrator
**I want** room assignment to enforce student separation rules
**So that** students who must be kept apart are not in adjacent rooms

**Acceptance Criteria:**
- [ ] Room dropdown in placement form filters based on separation rules
- [ ] If Student A must be separated from Student B, and B is in rooms 501-505, A can only be assigned to 506-509 (and vice versa)
- [ ] Separation rules stored in `daep_student_separations` table
- [ ] Admin can create/edit/delete separation rules from student profile
- [ ] Warning shown if trying to assign student to room that violates separation
- [ ] Separation reason documented (required field)
- [ ] Separations can have expiration date (optional)

**Technical Notes:**
- Building sections defined in `daep_rooms.building_section`
- Check constraint: `student_a_id < student_b_id` to prevent duplicates

**FRs:** FR18

---

### Story 2.6: Placement Lifecycle State Machine

**As a** DAEP administrator
**I want** placements to follow a defined lifecycle
**So that** student progress through DAEP is tracked consistently

**Acceptance Criteria:**
- [ ] Placement states: Pending → Active → Transition → Complete
- [ ] Visual state indicator on placement card and list view
- [ ] State transitions:
  - Pending → Active: Admin clicks "Start Placement" (sets intake date)
  - Active → Transition: Admin clicks "Ready for Transition" (requirements met)
  - Transition → Complete: Admin clicks "Complete" (meeting done, first day back confirmed)
  - Pending → Complete: Skip (appeal overturned before intake)
- [ ] State change records timestamp and user who made change
- [ ] Audit log records all state transitions
- [ ] Cannot go backwards (Active → Pending) without admin override

**Technical Notes:**
- State stored in `daep_placements.status`
- Transition dates: `transition_requested_date`, `transition_approved_date`, `transition_meeting_date`, `first_day_back_date`

**FRs:** FR21

---

### Story 2.7: Days Remaining Calculation

**As a** DAEP staff member
**I want** to see accurate days remaining that accounts for school calendar
**So that** I know when students will complete their placement

**Acceptance Criteria:**
- [ ] Days remaining = days_assigned - days_served
- [ ] Days served only increments on school days (per `daep_school_calendar`)
- [ ] Expected end date calculated based on school calendar
- [ ] Days remaining displayed on: student profile, placement card, student list
- [ ] Color coding: green (>10 days), yellow (5-10 days), red (<5 days)
- [ ] Handles mid-year calendar changes (weather days added)
- [ ] Recalculates when days_assigned is modified

**Technical Notes:**
- Utility function: `calculateDaysRemaining(startDate, daysAssigned, schoolCalendar)`
- May need daily cron job to update `expected_end_date`

**FRs:** FR20

---

### Story 2.8: Edit Placement

**As a** DAEP administrator
**I want** to modify placement details
**So that** I can extend/reduce days or change room assignments

**Acceptance Criteria:**
- [ ] "Edit Placement" button on placement card
- [ ] Can edit: days_assigned, assigned_room, placement_reason, intake_notes
- [ ] Cannot edit: student_id, incident_number, offense_code (immutable after creation)
- [ ] When days_assigned changes, days_remaining auto-recalculates
- [ ] Room change validates against separation rules
- [ ] All changes logged to audit trail with before/after values
- [ ] Success toast on save

**Technical Notes:**
- Server action: `updatePlacement()` in `app/actions/daep/placements.ts`

**FRs:** FR22

---

### Story 2.9: Transition Workflow

**As a** DAEP administrator
**I want** to process a student's transition back to home campus
**So that** the return process is documented and tracked

**Acceptance Criteria:**
- [ ] "Ready for Transition" button appears when days_served >= days_assigned
- [ ] Transition form captures: transition_meeting_date, completion_notes
- [ ] Email notification sent to home campus counselor (if configured)
- [ ] Home campus admin can view pending transitions for their campus
- [ ] Home campus confirms: transition meeting held + first day back date
- [ ] Status changes to 'complete' after confirmation
- [ ] Updates `trespass_records.is_daep = false` and clears expiration date

**Technical Notes:**
- Uses notification system (Epic 7)
- Cross-module update to TrespassTracker data

**FRs:** FR23

---

### Story 2.10: Prevent Duplicate Active Placements

**As the** system
**I want** to prevent creating duplicate active placements for the same student
**So that** data integrity is maintained

**Acceptance Criteria:**
- [ ] Validation error if creating placement for student with existing active/pending placement
- [ ] Error message: "Student already has an active placement (incident #{number})"
- [ ] Database constraint: UNIQUE(tenant_id, school_id, incident_number)
- [ ] Allow multiple placements with different incident numbers (recidivism)
- [ ] Completed placements don't block new placements

**Technical Notes:**
- Check in `createPlacement()` server action
- Database-level unique constraint as backup

**FRs:** FR24

---

### Story 2.11: Rollover Student Handling

**As a** DAEP administrator
**I want** to handle students whose placement spans school years
**So that** decisions are documented and tracked

**Acceptance Criteria:**
- [ ] End-of-year report shows students with days_remaining > 0
- [ ] Rollover decision options: Continue (days carry over), Reset (start fresh next year)
- [ ] Decision recorded in `rollover_decision` field
- [ ] Rollover flag set on placement
- [ ] Next school year: rollover students appear in "returning students" list
- [ ] Days calculation pauses at school year end until decision made

**Technical Notes:**
- May need `school_year` field on placements
- Report in Epic 6 (Dashboard & Reporting)

**FRs:** FR25

---

### Story 2.12: No-Show Student Tracking

**As a** DAEP administrator
**I want** to track students who were assigned but never attended
**So that** I can report on no-shows and follow up

**Acceptance Criteria:**
- [ ] "Mark as No-Show" action on pending/active placements
- [ ] No-show flag sets `no_show = true`
- [ ] No-show students: days_owed = days_assigned (they still owe the time)
- [ ] No-show students appear in dedicated report
- [ ] No-show placements can be reactivated if student returns
- [ ] Audit trail records no-show action

**Technical Notes:**
- `daep_placements.no_show` boolean field
- Different from Transition→Complete (no-show never started)

**FRs:** FR26

---

### Story 2.13: TrespassTracker Sync

**As the** system
**I want** to synchronize DAEP data with TrespassTracker
**So that** both modules have consistent student status

**Acceptance Criteria:**
- [ ] When placement created: set `trespass_records.is_daep = true`
- [ ] When placement created: set `trespass_records.daep_expiration_date` to expected end date
- [ ] When placement completed: set `trespass_records.is_daep = false`
- [ ] When placement extended: update expiration date
- [ ] If student has multiple incidents, show farthest expiration date
- [ ] TrespassTracker displays DAEP status on student records
- [ ] Handle case where student doesn't exist in trespass_records (create record)

**Technical Notes:**
- Update happens in placement server actions
- No separate sync process - immediate updates

**FRs:** FR73, FR74, FR77

---

