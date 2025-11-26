# DAEPManagement - Epic Breakdown

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
