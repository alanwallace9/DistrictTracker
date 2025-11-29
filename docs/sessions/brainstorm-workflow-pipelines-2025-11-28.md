# Workflow Pipelines Brainstorm Session

**Date:** 2025-11-28
**Participants:** Party Mode - All BMAD Agents
**Status:** In Progress
**Related Epic:** Epic 2b (Workflow Orchestration) - NEW

---

## Session Overview

This session explored adding kanban-style workflow automation to DAEP management. The outcome is two separate pipelines plus a Rooms tab, overlaying the existing Epic 2 functionality.

**Key Decision:** Create Epic 2b for workflow orchestration that builds ON TOP of Epic 2 (not replacing it).

---

## Architecture Summary

```
┌─────────────────────────────────────────────────┐
│           Workflow Orchestration Layer           │  ← Epic 2b (NEW)
│  (Kanban boards, state transitions, triggers)    │
├─────────────────────────────────────────────────┤
│              Business Logic Layer                │  ← Epic 2 (existing)
│  (Placement rules, point calculations, etc.)     │
├─────────────────────────────────────────────────┤
│              Data Layer (existing)               │
│  (Students, Placements, Points, Attendance)      │
└─────────────────────────────────────────────────┘
```

---

## Navigation Structure

```
Left Nav (Operations section):
├── Dashboard
├── Rooms          ← NEW: All active students (table view)
├── Students
├── Intakes        ← Intake Pipeline (kanban)
├── Placements     ← Placement Pipeline (kanban)
├── Reconciliation
└── Reports
```

**Mobile (iPad):** Hamburger menu → slide-out nav → dropdown to switch between Intake/Placement pipelines

---

## INTAKE PIPELINE (4 Columns) ✅ FINALIZED

### Column 1: APPROVED

| Attribute | Specification |
|-----------|---------------|
| **Entry** | CSV Import only (requires exec director approval) |
| **Badge States** | "Ready to Schedule" (can drag) OR "Verification Needed" + ⚠️ icon (frozen) |
| **Card Display** | Name, Home Campus, Badge |
| **Click Action** | Opens Intake Form (reformatted to look like profile page) |
| **Verification Flow** | Side-by-side reconciliation view (bank-style), highlights conflicting fields |
| **After Verification** | Badge changes to "Ready to Schedule", ⚠️ icon removed |
| **Sort** | Verification Needed cards sorted to TOP |
| **Exit** | Click → Schedule → Auto-moves to Scheduled |

**Duplicate Detection:**
- System auto-detects existing student (by tenant + student ID)
- Auto-applies "Verification Needed" badge
- Typically requires new incident number entry

### Column 2: SCHEDULED

| Attribute | Specification |
|-----------|---------------|
| **Entry** | From Approved (click-save flow, NOT drag - requirements must be met) |
| **Required Before Save** | Room selected, Date/Time selected |
| **Card Display** | Name, Campus type (HS/MS/Elem), Date @ Time, "Today" badge if applicable, 🌐 if translator needed |
| **Sort** | By date (chronological) |
| **Filter** | Today / Tomorrow / All (optional - scrollable may be sufficient) |
| **Room Picker** | Dropdown showing occupancy count: `501 (14)`, `502 (8)` |
| **Time Slot Picker** | Shows availability: `8:30 AM (2 scheduled)`, `9:30 AM (0 scheduled)` - informative not restrictive |
| **Other Time Option** | Custom date/time picker below standard slots for emergencies |
| **Translator Flag** | Checkbox + required language dropdown (to group same-language intakes) |
| **Exit** | Drag to Arrived Today OR Drag to No-Show |

**Triggers on Entry:**
- Calendar entry created
- Parent confirmation email (draft to registrar until Resend hooked up)
- Staff notification (pending action)
- Teacher notified of new student + prompted to assign seat

**Expected End Date Calculation:**
- Calculated when scheduled
- If after noon (1pm+), start date = next school day
- Recalculated when first marked PRESENT

### Column 3: ARRIVED TODAY

| Attribute | Specification |
|-----------|---------------|
| **Entry** | Drag from Scheduled (when student arrives for intake) |
| **Card Display** | Name, Room number, Level (HS/MS/Elem), Days assigned, "Processing" badge |
| **Exit Trigger** | First attendance marked PRESENT |
| **Exit Destination** | Placement Pipeline (end of day processing) |
| **Badge** | "Processing" - does NOT change |

**Triggers on Entry:**
- Staff notification: "New Students Today"
- Teacher sees list with room assignments
- Seat assignment prompt

**Afternoon Intake Edge Case:**
- 1pm+ intake cannot start same day (state law)
- Start date = next school day
- Attendance marked on actual first day

### Column 4: NO-SHOW

| Attribute | Specification |
|-----------|---------------|
| **Entry** | Drag from Scheduled (when student doesn't show) |
| **Card Display** | Name, Original intake date, No-show count badge (top-right) |
| **Click Action** | Opens intake form with Contact Log section |
| **Exit** | Reschedule → Drag back to Scheduled |
| **Stays Here** | Until rescheduled (registrar's workflow) |

**Contact Log (on form, not card):**
- Date/Time: Auto-captured on save
- Method: Dropdown (Parent called, Parent emailed, No answer, Voicemail left, Other)
- Notes: Optional text field
- Required: Must select contact method before save
- History: Multiple attempts logged over time
- 6 attempts → clears from pending actions

---

## PLACEMENT PIPELINE (4 Columns) 🔄 IN PROGRESS

### Rooms Tab (Replaces "Active" Column)

**Decision:** Active students are NOT a workflow stage - they're just enrolled. Move to dedicated Rooms tab.

| Attribute | Specification |
|-----------|---------------|
| **Location** | Left nav: `/daep/rooms` |
| **View Type** | Table/List (not kanban) |
| **Purpose** | "I'm walking in and want to see the 9 kids in this room for my walkthrough" |
| **Users** | Staff (walkthroughs), Teachers (their classroom), Admin (overview) |

**Room Filter:**
- Dropdown at top to select room (501, 502, 507, etc.)
- "All" option shows entire roster (same as Students tab but with room context)
- Teachers default to their assigned room

**Table Columns:**
| Column | Description |
|--------|-------------|
| Name | Student name |
| Room | Room number |
| Days Assigned | Total placement days |
| Days Left | Remaining days |
| Current Avg | Points per day average |
| Quick Notes | Action dropdown (far right) |

**Quick Notes Dropdown (Far Right):**
Constrained variables for data analysis:

| Field | Options |
|-------|---------|
| Student Behavior | Positive options, Negative options (predefined list) |
| Teacher Action | Call parent, Redirect student, Change seat, etc. |
| Point Outcome | Recommended deduction based on behavior selected |
| Notes | Optional text (with public/private toggle) |

**Additional Features:**
- Can also be used for attendance entry
- Supports the teacher's workflow: pull up room, quick-enter for each student
- Data from quick notes feeds into behavior trend calculations for At-Risk

**Public/Private Notes:**
- Public: Visible to student/parent
- Private: Internal only (admin, counselor, dept chair)

### Column 1: AT-RISK (Computed)

| Attribute | Specification |
|-----------|---------------|
| **Entry** | Auto-populated based on threshold triggers |
| **Type** | Computed column (cannot drag INTO) |
| **Card Display** | TBD |
| **Exit** | Auto-clear when resolved OR manual clear (DECISION NEEDED) |
| **Can Drag Back From** | Review Met (rare cases) |

**Threshold Categories (configurable per campus in DAEP Settings):**

| Category | Trigger | Example Setting |
|----------|---------|-----------------|
| Attendance | Below X% | < 90% |
| Attendance | Absent Y consecutive days | 3+ days in a row |
| Points | Below X% of expected for rolling 5-day period | < 85% (425 of 500 pts) |
| Behavior | Pattern/trend detection (not single incident) | Declining trend |

**Key Insight:** Looking for PATTERNS over time, not single bad days.

**Behavior Trend Calculation:**
- Uses teacher notes data (quick buttons: student action, teacher action, points)
- Example triggers: "5 teachers on this day said X" or "3 teachers over the week noted off-task"
- Captures students who found the "line" - getting warnings/redirections but never losing points
- Combination of subjective notes + constrained button choices enables data analysis

### Column 2: READY FOR REVIEW (Computed)

| Attribute | Specification |
|-----------|---------------|
| **Entry** | Auto-populated when points reach review threshold |
| **Type** | Computed column |
| **Trigger** | Points-based (day they COULD earn enough to hit threshold) |
| **Card Display** | Name, Room, Level, Points progress (e.g., "1,950 / 2,000 pts"), "Review: Tomorrow" |
| **Click Action** | Opens One-Page Review Screen |
| **Exit** | Drag to Review Met |

**Points Threshold Calculation:**
```
With Review: review_days × 100 pts/day
  Example: 20-day review = 2,000 points

Without Review: total_days × 100 pts/day
  Example: 30-day placement = 3,000 points
```

**Notification Bell (Separate from Pipeline):**
- User-configurable: 2, 3, 5, 7 days out
- Calculated: threshold - (preference_days × 100)
- Example: 5-day notice on 2,000 threshold = notify at 1,500 points

**Pipeline Column Setting (Campus-Wide):**
- Separate setting in DAEP Settings
- Review notification days for pipeline (not per-user)

### Column 3: REVIEW MET (Manual)

| Attribute | Specification |
|-----------|---------------|
| **Entry** | TWO OPTIONS: (1) Drag from Ready for Review, OR (2) Open review screen, add notes, click Save (auto-moves) |
| **Type** | Manual drag target |
| **Card Display** | TBD |
| **Click Action** | TBD |
| **Exit** | Drag to Completed (flow TBD - need to revisit) |
| **Can Drag Back** | Yes - to At-Risk or Ready for Review if issues arise (rare) |

**One-Page Review Screen:**
```
┌─────────────────────────────────────────────────────────────┐
│ REVIEW: [Student Name]                               [Close]│
├─────────────────────────────────────────────────────────────┤
│ Demographics          │ Current Placement                   │
│ - Home Campus         │ - X days (Y-day review)             │
│ - Grade               │ - Started: [date]                   │
│ - DOB                 │ - Day X of Y                        │
├─────────────────────────────────────────────────────────────┤
│ Points: X / Y         ████████████████░░░░ XX%              │
│ Attendance: XX%       ████████████████░░░░                  │
├─────────────────────────────────────────────────────────────┤
│ Teacher Notes (Recent):                                     │
│ - [Date]: "[Note]" - [Teacher]                              │
│ (Dropdown filter by teacher available)                      │
├─────────────────────────────────────────────────────────────┤
│ Admin Notes (INTERNAL - not visible to student/parent):     │
│ - [Date]: "[Note]" - [Admin Name]                           │
│ - [Date]: "[Note]" - [Counselor Name]                       │
│ (For internal communication about accommodations, etc.)     │
├─────────────────────────────────────────────────────────────┤
│ Previous Placements: X                                      │
├─────────────────────────────────────────────────────────────┤
│                                         [Review Met ✓]      │
└─────────────────────────────────────────────────────────────┘
```

**Admin Notes Section:**
- Visible only to: Admin, Counselor, Department Chair
- NOT visible to: Student, Parent
- Timestamped with who logged them
- Used for internal communication (e.g., "If he completes 2 assignments, give credit for X")
- Prevents students from seeing accommodations/internal decisions

**Triggers on Entry (drag to Review Met):**
- Counselor notified
- Home campus notified
- Parent email with grades (when grade report ready)
- Registrar notified to begin withdrawal prep

### Column 4: COMPLETED (Manual)

| Attribute | Specification |
|-----------|---------------|
| **Entry** | Drag from Review Met |
| **Type** | Manual drag target |
| **Card Display** | TBD |
| **Exit** | Registrar sets status to Inactive |
| **Result** | Removed from Completed, remains in database (searchable for history) |

**Exit Triggers:**
- Registrar clicks → updates status to Inactive
- Student removed from active enrollment
- Withdrawal process completed in Focus
- Data retained for parole officer requests, history, etc.

---

## CROSS-CUTTING CONCERNS

### Drag Confirmation Pattern

For drags that trigger external actions (parent email, staff notification, etc.):

```
┌─────────────────────────────────────────────┐
│ Moving to "[Column]" will:                  │
│                                             │
│ • [Action 1]                                │
│ • [Action 2]                                │
│ • [Action 3]                                │
│                                             │
│ ☐ Don't show this again                     │
│                                             │
│        [Cancel]  [Confirm Move]             │
└─────────────────────────────────────────────┘
```

**Per-user preference:** `suppress_drag_confirmations`

### Drag Behavior for Incomplete Requirements

When dragging from Approved → Scheduled (requirements not met):
- Allow drag initiation (dopamine feedback)
- Card slides back to original column
- Border highlights in color
- Tooltip on hover explains what's needed
- Forces click → form → save workflow

### Pending Actions vs Notification Bell

| Feature | Notification Bell | Pending Actions Panel |
|---------|-------------------|----------------------|
| Purpose | Alerts/reminders | Work queue |
| Timing | Configurable (N days out) | Real-time task list |
| Action | Click → View details | Click → Take action |
| Clearance | Dismiss/snooze | Complete task |
| Setting | Per-user preference | Role-based defaults |
| Examples | "Review in 5 days" | "Call parent (absent 3 days)" |

**Pending Actions needs to be built BEFORE Epic 7 (Notifications).**

---

## SQL SCHEMA ADDITIONS NEEDED

### New Fields

| Table/Field | Type | Description |
|-------------|------|-------------|
| `needs_translator` | boolean | Student needs translator at intake |
| `translator_language` | string | Required if needs_translator = true |
| `assigned_seat` | string/int | Seat assignment in room |
| `no_show_count` | integer | Counter for repeat no-shows |
| `suppress_drag_confirmations` | boolean | User preference |

### New Tables

**intake_contact_attempts:**
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| intake_id | uuid | FK to intake/placement |
| contact_method | enum | called, emailed, no_answer, voicemail, other |
| contact_date | timestamp | Auto-captured on save |
| notes | text | Optional details |
| created_by | uuid | User who logged attempt |

**admin_notes (Internal Notes):**
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| student_id | uuid | FK to student |
| placement_id | uuid | FK to placement (optional) |
| note_text | text | The note content |
| created_at | timestamp | Auto-timestamp |
| created_by | uuid | Admin/counselor who created |
| is_private | boolean | Always true for admin notes |

**quick_notes (Rooms Tab entries):**
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| student_id | uuid | FK to student |
| placement_id | uuid | FK to current placement |
| student_behavior | enum | Predefined positive/negative behaviors |
| teacher_action | enum | call_parent, redirect, change_seat, etc. |
| point_outcome | integer | Points added/deducted |
| notes | text | Optional additional context |
| is_private | boolean | Public (student/parent visible) or private |
| created_at | timestamp | Auto-timestamp |
| created_by | uuid | User who entered |
| room_id | uuid | FK to room where entered |

### DAEP Settings Additions (Campus-Level)

| Setting | Type | Description |
|---------|------|-------------|
| `at_risk_attendance_threshold` | decimal | e.g., 0.90 for 90% |
| `at_risk_consecutive_absences` | integer | e.g., 3 days |
| `at_risk_points_threshold` | decimal | e.g., 0.85 for 85% |
| `pipeline_review_notification_days` | integer | Days before end for Ready for Review (separate from user bell setting) |
| `intake_time_slots` | jsonb | Configurable intake times |
| `max_intakes_per_slot` | integer | e.g., 3 |

---

## MARKETING LANGUAGE CAPTURED

Compelling phrases for future marketing materials:

- **"Human in the loop"** - Automation with oversight, not replacement
- **"Bank-style reconciliation"** - Familiar, trustworthy pattern for data comparison
- **"Continue where you left off"** - Dashboard pattern for workflow continuity
- **"Workflow automation with oversight"** - Efficiency without losing control
- **"Informative, not restrictive"** - UI guides decisions without blocking options
- **"Designed for the hallway"** - Quick interactions between student meetings

---

## OPEN DECISIONS

### 1. At-Risk Clearing Mechanism ✅ DECIDED
**Decision:** BOTH options available
- Auto-clear when metrics improve above threshold
- AND Admin/counselor can manually clear (with or without notes) for mitigating circumstances (grandfather died, etc.)

### 2. Review Met → Completed Flow ⏸️ NEEDS REVISIT
How exactly does a student move from Review Met to Completed?
- Admin drags after confirming review complete?
- Auto-move after certain conditions?
- What triggers the registrar to start withdrawal?

**Current Understanding:**
- Admin drags after one-on-one review, gives return instructions
- Registrar clicks on Completed tab → sets status to Inactive
- User asked to be reminded what was said earlier about this flow

**ACTION:** Revisit this flow in next session

---

## NEXT STEPS

### Immediate (This Session - Paused)
- [ ] Finalize At-Risk clearing mechanism
- [ ] Complete Placement Pipeline card displays
- [ ] Define Completed column exit triggers in detail

### After Session
- [ ] Create workflow specification document (workflow-spec-epic-2b.md)
- [ ] Audit Epic 2 remaining stories (2.3 → 2.13)
- [ ] Create Epic 2b story breakdown with ORDERED sequence
- [ ] Add Rooms tab to scope (Epic 2b or separate)

### Phase Execution Order
1. **Finish Epic 2** - Foundation must be solid
2. **Create Epic 2b spec** - Full workflow specification
3. **Build Epic 2b** - Sequential story execution

---

## SESSION ARTIFACTS

- **This Document:** `docs/sessions/brainstorm-workflow-pipelines-2025-11-28.md`
- **Marketing Language:** To be compiled in `docs/sessions/marketing-language.md`
- **UX Mockups Referenced:** `docs/sessions/ux-design-directions.html`

---

*Session paused for break. Type "let's continue" to resume.*
