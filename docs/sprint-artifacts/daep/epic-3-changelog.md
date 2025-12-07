# Epic 3: Daily Operations - Changelog

**Epic Status:** In Progress (9 of 12 stories complete)
**Version Range:** v0.3.1 - v0.3.8
**FRs Covered:** FR27-FR44

---

## v0.3.8 - Attendance Entry

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | Attendance Entry |
| **Story** | 3-9 |
| **FRs** | FR38, FR39, FR40, FR41 |

**Description:**
DAEP staff can now record attendance directly in the room roster with an iPad-friendly inline dropdown. Status options include Present, Absent, Tardy, and Early Dismissal. Tardy and Early Dismissal prompt for time entry. Attendance is tied to the point system: Present grants base points, Absent removes them.

**Key Features:**
- Attendance column in room roster with inline status dropdown
- Status options: Present (P), Absent (A), Tardy (T), Early Dismissal (ED)
- Time entry modal for Tardy/Early Dismissal
- Auto-save on selection with optimistic UI updates
- Color-coded status badges (green/red/yellow/orange)
- Attendance summary banner showing period counts (e.g., "Period 3: 14/15 present")
- Points integration: Present grants base points, Absent removes them
- Configurable attendance status types in Settings
- Bell schedule periods can specify `requires_attendance` flag

---

## v0.3.7 - Point Audit Trail

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | Point Audit Trail |
| **Story** | 3-8 |
| **FRs** | FR42 |

**Description:**
Administrators can now view a complete audit trail of all point-related events. The student profile includes an "Audit Log" tab with filters by date, user, and event type. Each placement card shows recent activity with a "View All" option for the full history. Color-coded entries make it easy to spot approvals, pending items, and rejections at a glance.

**Key Features:**
- Admin-only "Audit Log" tab on student profile page
- Color-coded audit entries by event type (approved/pending/rejected)
- Expandable before/after diff view for edited entries
- Filter by date range, user, and event category
- "Recent Activity" preview on placement card
- Pagination with "Load More" pattern

---

## v0.3.6 - Cumulative Points & Milestones

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | Cumulative Points & Milestones |
| **Story** | 3-7 |
| **FRs** | FR34, FR35 |

**Description:**
Students can now earn milestone badges as they accumulate points during their DAEP placement. Badges like "100 Club" and "500 Club" appear on their profile, celebrating progress and encouraging positive behavior. Staff can configure milestones with custom thresholds and optional bonus points in Settings.

**Key Features:**
- Milestone badges (100, 250, 500, 1000, 1500, 2000 Club) on student profiles
- Toggleable progress bar: switch between days served and points earned views
- Badges Settings page at /daep/settings/badges with full CRUD
- Auto-award milestones when point thresholds crossed during approval
- Bonus points can be awarded with milestone badges

---

## v0.3.5 - Approval Workflow

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | Point Approval Workflow |
| **Stories** | 3-5, 3-6 |
| **FRs** | FR31, FR32, FR33 |

**Description:**
Point entries now follow an approval workflow. Approved teachers and admins can auto-approve their entries, while other staff submissions go to a pending queue for admin review. The new Approvals page lets admins review, approve, reject, or edit pending entries individually or in bulk.

**Key Features:**
- Approved teachers auto-finalize their point entries
- Non-approved staff entries go to pending status
- New /daep/approvals page for admin review queue
- Entries grouped by date (Today, Yesterday, older)
- Single approve, reject, edit & approve actions
- Bulk selection with "Approve Selected" button
- Nav badge showing pending count (admin-only)

---

## v0.3.4 - Bulk Point Entry & Point History

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | Bulk Point Entry & Point History |
| **Stories** | 3-3, 3-4 |
| **FRs** | FR30, FR36 |

**Description:**
Staff can now select multiple students in the room roster and apply point adjustments to all of them at once. The student profile Activity tab displays a complete point history timeline with the ability to edit previous entries and export to CSV or PDF.

**Key Features:**
- Checkbox selection for multiple students in room roster
- "Select All" toggle for bulk operations
- Bulk actions toolbar with preset adjustments (+10, +5, -5, -10, -15)
- Confirmation dialog showing affected students
- Point history display on student profile Activity tab
- Edit point entries from timeline (original teacher + admins)
- Export point history to CSV/PDF

---

## v0.3.3 - Room Roster & Point Entry Grid

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | Room Roster & Point Entry Grid |
| **Stories** | 3-1, 3-2 |
| **FRs** | FR27, FR28, FR29 |

**Description:**
DAEP staff can now view room rosters with period and date selectors and enter point adjustments for student behavior tracking. The point entry grid shows today's running total with color-coded progress indicators. Base points (10 per period) are auto-granted when students are present.

**Key Features:**
- Room Roster page at /daep/rooms/[roomId]
- Period and date selectors with bell schedule awareness
- Point Entry Grid with quick adjustment dropdown (+10 to -15)
- Today's Total column with color-coded progress
- Room capacity display (present/assigned/max)
- Base points auto-granted when present
- Multiple point entries per period allowed

---

## v0.3.2 - Rate Limit Error Handling

| Field | Value |
|-------|-------|
| **Type** | Bug Fix |
| **Title** | Feedback Rate Limit Error Handling |
| **Story** | N/A (Bug fix) |

**Description:**
Fixed "fetch failed" error when submitting feedback by adding defensive error handling for Upstash rate limiting service failures. If the rate limiting service is unavailable, submissions now proceed instead of failing with a cryptic error message.

**Key Fixes:**
- Wrapped rate limit checks in try/catch for graceful degradation
- Rate limit failures logged but don't block user submissions
- User sees "Unable to connect to server" instead of "fetch failed"

---

## v0.3.1 - Room Groups

| Field | Value |
|-------|-------|
| **Type** | Feature |
| **Title** | Room Groups for Separation Logic |
| **Story** | 3-0 |
| **FRs** | FR64 (enhanced) |

**Description:**
Room Groups allow administrators to define building sections (e.g., "Up", "Down") for separation logic. Students with separations can now be properly isolated by group rather than relying on free-text matching. Groups are managed in Settings with color-coded badges.

**Key Features:**
- Room Groups management in Settings → Rooms
- Color-coded group badges with room counts
- Unassigned rooms indicator for quick visibility
- Building Section dropdown replaces free-text input
- Separation logic uses group membership with fallback

---

## Summary Table

| Version | Type | Title | Stories |
|---------|------|-------|---------|
| v0.3.8 | Feature | Attendance Entry | 3-9 |
| v0.3.7 | Feature | Point Audit Trail | 3-8 |
| v0.3.6 | Feature | Cumulative Points & Milestones | 3-7 |
| v0.3.5 | Feature | Point Approval Workflow | 3-5, 3-6 |
| v0.3.4 | Feature | Bulk Point Entry & Point History | 3-3, 3-4 |
| v0.3.3 | Feature | Room Roster & Point Entry Grid | 3-1, 3-2 |
| v0.3.2 | Bug Fix | Feedback Rate Limit Error Handling | N/A |
| v0.3.1 | Feature | Room Groups for Separation Logic | 3-0 |

---

## Remaining Stories (Backlog)

| Story | Title | Points |
|-------|-------|--------|
| 3-10 | Excused/Unexcused Absences | 2 |
| 3-11 | Attendance Rate Calculations | 2 |
| 3-12 | Attendance Override Audit | 2 |
