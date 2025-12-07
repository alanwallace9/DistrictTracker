# Story 3.9: Attendance Entry

**Status:** drafted
**Epic:** 3 - Daily Operations
**Points:** 5
**FRs:** FR38, FR39, FR40, FR41

---

## Story

As a **DAEP staff member**,
I want **to record attendance for each student per period**,
So that **attendance is accurately tracked and tied to the point system**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Taking attendance shouldn't feel like data entry. The teacher walks in, opens the roster, hits "Mark All Present," and adjusts the 1-2 exceptions. Done in under 30 seconds. The system handles the rest: points are granted, the room card shows a checkmark, and the admin dashboard reflects accurate totals.

**The outcome:** Attendance becomes effortless. Teachers spend time teaching, not clicking. Admins get real-time visibility across all rooms without chasing down paper sheets.

---

## UI/UX Clarifications

### Inline Dropdown (iPad-Friendly)
Cell shows `--` initially (no attendance taken). Click opens dropdown with status options.
- P - Present
- A - Absent
- T - Tardy (prompts for time)
- ED - Early Dismissal (prompts for time)
- FT - Field Trip (configurable)

### Primary Workflow: Bulk First
1. Check all students (Select All checkbox)
2. Bulk action: "Mark All Present"
3. Uncheck the 1-2 absent students
4. Manually mark those absent

**Result:** 3 clicks for 14 students present, 1 absent.

### Column Order
```
Student Name | Grade | Status | Attendance | Days Left | Total Points | Adjust
```

### Room Card Attendance Indicator
Each room card shows a small checkmark (✓) or count when attendance is complete for the current period.
```
┌─────────────────────────────┐
│ Room 101         8/15    ✓ │
│ Up Wing                     │
└─────────────────────────────┘
```

### Attendance Summary Banner
Shows on both room roster AND room cards:
- Room roster: "Period 3: 14/15 present"
- Room cards: Per-room summary
- Dashboard: All-rooms total

### Copy from Previous Period
When Period 2 is selected and Period 1 has attendance:
"Copy from Period 1?" button - one click to populate, then adjust exceptions.

### Auto-Advance Row
After marking a student's attendance, focus moves to next row (Excel-style).

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 3.9.1 | Attendance column added to room roster grid | Visual check - column present |
| 3.9.2 | Status options: P, A, T, ED (and custom types from settings) | Click cell, verify dropdown options |
| 3.9.3 | Default display is `--` (no attendance taken) | Load roster, verify empty shows `--` |
| 3.9.4 | Click opens inline dropdown (not quick-tap cycle) | iPad-friendly dropdown |
| 3.9.5 | Tardy prompts for arrival time (HH:MM) | Select T, modal appears |
| 3.9.6 | Early Dismissal prompts for departure time | Select ED, modal appears |
| 3.9.7 | Auto-save on selection | Select status, verify saved without separate action |
| 3.9.8 | Attendance saved to `daep_attendance` table | Check DB after marking |
| 3.9.9 | Present/Tardy/ED grants base points (configurable) | Mark P, verify 10 pts created |
| 3.9.10 | Absent removes base points | Mark A, verify points removed |
| 3.9.11 | Bulk "Mark All Present" action works | Select all, bulk action |
| 3.9.12 | Room card shows attendance indicator | Complete attendance, verify ✓ on card |
| 3.9.13 | Attendance summary banner on roster | "Period 3: 14/15 present" |
| 3.9.14 | Copy from previous period button | Select Period 2, see "Copy from Period 1?" |
| 3.9.15 | Auto-advance row after marking | Mark student, focus moves to next |
| 3.9.16 | Attendance settings tab in DAEP Settings | Navigate to /daep/settings/attendance |
| 3.9.17 | Status types configurable (points: full/partial/none) | Edit Tardy to give 5 points |
| 3.9.18 | Bell schedule periods have `requires_attendance` flag | View bell schedule settings |
| 3.9.19 | Room card indicator only counts attendance periods | Non-attendance periods excluded |
| 3.9.20 | All attendance changes logged to audit trail | Check admin_audit_log |

---

## Tasks / Subtasks

### Task 1: Database Migration (AC: 3.9.8, 3.9.16, 3.9.17, 3.9.18)

- [ ] 1.1 Create `daep_attendance_status_types` table:
  - `id` UUID PRIMARY KEY
  - `tenant_id` TEXT NOT NULL
  - `status_code` TEXT NOT NULL (P, A, T, ED, FT)
  - `label` TEXT NOT NULL
  - `points_type` TEXT NOT NULL (full, partial, none)
  - `requires_time` BOOLEAN DEFAULT false
  - `sort_order` INTEGER DEFAULT 0
  - `is_default` BOOLEAN DEFAULT false
  - `active` BOOLEAN DEFAULT true
  - UNIQUE(tenant_id, status_code)
- [ ] 1.2 Add RLS policy for tenant isolation
- [ ] 1.3 Seed default status types (P, A, T, ED) on tenant creation
- [ ] 1.4 Update `daep_bell_schedules.periods` JSONB schema:
  - Add `requires_attendance` BOOLEAN (default true)
  - Add `grants_points` BOOLEAN (default true)
- [ ] 1.5 Migration to set defaults for existing bell schedule periods

### Task 2: Attendance Settings UI (AC: 3.9.16, 3.9.17)

- [ ] 2.1 Create `/daep/settings/attendance/page.tsx`
- [ ] 2.2 Create `AttendanceStatusTypeList.tsx` - list status types
- [ ] 2.3 Create `EditStatusTypeDialog.tsx` - edit points_type for each status
- [ ] 2.4 Create `AddStatusTypeDialog.tsx` - add custom status (e.g., FT)
- [ ] 2.5 Add "Attendance" tab to settings navigation
- [ ] 2.6 Create `app/actions/daep/attendance-settings.ts` - CRUD actions

### Task 3: Bell Schedule Enhancement (AC: 3.9.18, 3.9.19)

- [ ] 3.1 Update bell schedule period editor UI:
  - Add checkbox "Requires Attendance"
  - Add checkbox "Grants Points"
- [ ] 3.2 Update `BellSchedulePeriod` type in schemas.ts
- [ ] 3.3 Update bell schedule server actions to handle new fields
- [ ] 3.4 Update `getScheduleForDate()` to include period flags

### Task 4: Server Actions - Attendance Entry (AC: 3.9.7, 3.9.8, 3.9.9, 3.9.10, 3.9.20)

- [ ] 4.1 Create `app/actions/daep/attendance.ts`
- [ ] 4.2 Implement `markAttendance(input)`:
  - Validate input
  - Upsert to `daep_attendance` table
  - Look up status type points_type
  - Call `createBasePoints()` or `removeBasePoints()` accordingly
  - Audit log
- [ ] 4.3 Implement `getRoomAttendance(roomId, date, period)`:
  - Return attendance map for roster display
- [ ] 4.4 Implement `getPlacementAttendance(placementId, options)`:
  - Return attendance history for student profile
- [ ] 4.5 Implement `bulkMarkAttendance(input)`:
  - Bulk mark for "Mark All Present"
  - Handle points for all students

### Task 5: Room Card Attendance Indicator (AC: 3.9.12, 3.9.19)

- [ ] 5.1 Implement `getRoomsAttendanceStatus(date, period)`:
  - For each room, count students with attendance vs total
  - Only count periods where `requires_attendance = true`
  - Return map: roomId → { taken: boolean, count: number, total: number }
- [ ] 5.2 Create `AttendanceTakenIndicator.tsx` component
- [ ] 5.3 Update `RoomCard.tsx` to show indicator
- [ ] 5.4 Update rooms page to fetch attendance status

### Task 6: Attendance Summary Banner (AC: 3.9.13)

- [ ] 6.1 Create `AttendanceSummaryBanner.tsx`:
  - Shows "Period X: 14/15 present" on roster
  - Color coding: green (100%), yellow (85-99%), red (<85%)
- [ ] 6.2 Add banner to room roster page
- [ ] 6.3 Add per-room summary to room cards

### Task 7: UI Components - Attendance Cell (AC: 3.9.1-3.9.6, 3.9.15)

- [ ] 7.1 Create `StatusBadge.tsx`:
  - Color-coded badge (P=green, A=red, T=yellow, ED=orange)
  - Shows `--` for no attendance
- [ ] 7.2 Create `AttendanceCell.tsx`:
  - Inline dropdown (not quick-tap)
  - Shows current status as badge
  - Opens dropdown on click
  - Auto-saves on selection
  - Auto-advances to next row
- [ ] 7.3 Create `AttendanceTimeModal.tsx`:
  - Simple time input for Tardy/ED
  - Cancel/Save buttons
- [ ] 7.4 Load status types from settings dynamically

### Task 8: Room Roster Integration (AC: 3.9.1, 3.9.3)

- [ ] 8.1 Add Attendance column to `RoomRosterTable.tsx`:
  - Column order: Name → Grade → Status → Attendance → Days → Points → Adjust
- [ ] 8.2 Update `RoomRosterContext.tsx` with attendance state
- [ ] 8.3 Wire up optimistic updates
- [ ] 8.4 Handle loading/error states

### Task 9: Copy from Previous Period (AC: 3.9.14)

- [ ] 9.1 Implement `copyAttendanceFromPeriod(roomId, date, fromPeriod, toPeriod)`:
  - Copy all attendance entries from one period to another
  - Create base points for all copied "present" statuses
- [ ] 9.2 Create "Copy from Period X" button in roster toolbar
- [ ] 9.3 Only show when previous period has attendance, current doesn't

### Task 10: Bulk Actions (AC: 3.9.11)

- [ ] 10.1 Add "Mark All Present" to bulk actions dropdown
- [ ] 10.2 Add "Mark Selected Present" variant
- [ ] 10.3 Wire up to `bulkMarkAttendance()` action
- [ ] 10.4 Show success toast with count

### Task 11: Validation & Schemas

- [ ] 11.1 Add `AttendanceStatusEnum` to schemas.ts
- [ ] 11.2 Add `MarkAttendanceSchema` with validation
- [ ] 11.3 Add `BellSchedulePeriod` type updates
- [ ] 11.4 Add `AttendanceStatusType` type

### Task 12: Testing

- [ ] 12.1 TypeScript compilation passes
- [ ] 12.2 Test dropdown opens on cell click
- [ ] 12.3 Test status selection saves to database
- [ ] 12.4 Test Tardy/ED time modal
- [ ] 12.5 Test points created on Present
- [ ] 12.6 Test points removed on Absent
- [ ] 12.7 Test bulk "Mark All Present"
- [ ] 12.8 Test room card indicator
- [ ] 12.9 Test copy from previous period
- [ ] 12.10 Test auto-advance row
- [ ] 12.11 Test attendance settings CRUD
- [ ] 12.12 Playwright MCP verification

---

## Dev Notes

### Points Integration (from points.ts)

```typescript
// When marking Present/Tardy/ED
await createBasePoints(placementId, date, period);

// When marking Absent
await removeBasePoints(placementId, date, period);
```

Use existing functions from Story 3-2.

### Status Type Points Lookup

```typescript
async function getPointsForStatus(statusCode: string): Promise<number> {
  const statusType = await getStatusType(statusCode);
  switch (statusType.points_type) {
    case 'full': return 10;
    case 'partial': return 5;
    case 'none': return 0;
  }
}
```

### Bell Schedule Period Example

```json
{
  "period_name": "Period 1",
  "start_time": "08:00",
  "end_time": "09:00",
  "requires_attendance": true,
  "grants_points": true
}
```

### Audit Log Events

| Event Type | Description |
|------------|-------------|
| `attendance.marked` | Initial attendance entry |
| `attendance.changed` | Status changed (includes before/after) |
| `attendance.bulk_marked` | Bulk attendance action |
| `attendance.copied` | Copied from previous period |

---

## Out of Scope (Story 3-10)

- Excused vs Unexcused absences
- `excuse_reason` dropdown
- `counts_toward_days_served` logic
- Half-day attendance tracking

---

## Quick Wins (Included)

| Quick Win | Implementation |
|-----------|----------------|
| Copy from previous period | "Copy from Period 1?" button |
| Auto-advance row | Focus next row after selection |
| Attendance summary banner | Both roster and room cards |
| Room card indicator | ✓ when all students marked |

---

## References

- **Tech Spec:** `docs/sprint-artifacts/daep/tech-spec-story-3-9.md`
- **Points Actions:** `app/actions/daep/points.ts`
- **Bell Schedule:** `app/actions/daep/bell-schedules.ts`
- **Roster Actions:** `app/actions/daep/roster.ts`

---

_Story Version: 1.0_
_Created: 2025-12-07_
_Author: Claude (AI Assistant)_
