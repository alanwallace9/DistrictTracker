# Story 3.11: Attendance Rate Calculations

**Status:** drafted
**Epic:** 3 - Daily Operations
**Points:** 3
**FR:** FR43

---

## Story

As a **DAEP staff member**,
I want **to see attendance rates for students**,
So that **I can identify attendance concerns and take proactive action**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Attendance problems don't appear overnight - they build up over time. By the time someone notices, the student might already be three weeks behind. With real-time attendance rate visibility, staff can spot a declining pattern after the second absent day, not the twentieth.

**The outcome:** At-risk students get intervention early. Teachers glance at the roster and instantly know who needs attention. The red badge isn't just a number - it's a call to action before the situation escalates.

---

## UI/UX Clarifications

### Student Profile Display

The CurrentPlacementCard shows attendance rate alongside the existing progress bar:

```
┌─────────────────────────────────────────────────┐
│ Current Placement                   [Active ▾]  │
├─────────────────────────────────────────────────┤
│ Progress                                         │
│ Days: ██████████████░░░░░░ 14/20 (6 remaining)  │
│ Points: ████████████████░░░ 280/320 (87.5%)     │
│                                                  │
│ Attendance                   Today: 100%  [94%] │
│ ████████████████████░░░░ 94%  ▏                 │
│ 47/50 periods              10 days tracked      │
├─────────────────────────────────────────────────┤
│ ⚠️ 3 consecutive absent days                    │  ← Only shows if >= 3
└─────────────────────────────────────────────────┘
```

### Room Roster Rate Column

Small badge in each student row:

```
Student Name    | Grade | Status | Attendance | Rate  | Days | Points
────────────────┼───────┼────────┼────────────┼───────┼──────┼────────
Maria Garcia    | 9     | Active | [P ▾]      | [94%] | 6    | 280
James Wilson    | 10    | Active | [A ▾]      | [78%] | 8    | 240  ← Red badge
```

### Color Coding Thresholds

| Rate | Color | Meaning |
|------|-------|---------|
| >90% | Green | On track |
| 85-90% | Yellow | Watch closely |
| <85% | Red | Needs intervention |

### Threshold Marker

Progress bar shows 85% threshold line:

```
████████████████████░░░░ 94%  ▏
                             ↑ 85% threshold marker
```

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 3.11.1 | Student profile shows daily attendance rate | "Today: 100%" displayed |
| 3.11.2 | Student profile shows cumulative attendance rate | "Overall: 94%" with progress bar |
| 3.11.3 | Rate = periods present / total periods × 100% | 8/10 periods = 80% |
| 3.11.4 | Color coding: green (>90%), yellow (85-90%), red (<85%) | Visual verification |
| 3.11.5 | Calculation function ready for dashboard (Epic 6) | `getStudentsBelowAttendanceThreshold()` exists |
| 3.11.6 | Attendance rate visible in room roster | Rate column shows badge |
| 3.11.7 | Consecutive absent day tracking for notifications (Epic 7) | `getConsecutiveAbsentDays()` returns correct count |

---

## Tasks / Subtasks

### Task 1: Types & Schemas

- [ ] 1.1 Add `AttendanceRateResult` interface to `lib/validation/schemas.ts`
- [ ] 1.2 Add `DailyAttendanceRate` type
- [ ] 1.3 Add `CumulativeAttendanceRate` type
- [ ] 1.4 Add `StudentAttendanceRates` combined type

### Task 2: Server Actions - Rate Calculations

- [ ] 2.1 Implement `getDailyAttendanceRate(placementId, date)`:
  - Query attendance for specific date
  - Calculate: periodsPresent / totalPeriods
  - Return rate with category (green/yellow/red)

- [ ] 2.2 Implement `getCumulativeAttendanceRate(placementId)`:
  - Query all attendance for placement
  - Calculate overall rate
  - Calculate consecutive absent days
  - Return complete stats

- [ ] 2.3 Implement `getStudentAttendanceRates(placementId, date?)`:
  - Combine daily + cumulative rates
  - Single call for student profile

- [ ] 2.4 Implement `getRoomAttendanceRates(roomId, date)`:
  - Batch query for all students in room
  - Efficient for roster display

- [ ] 2.5 Implement `getConsecutiveAbsentDays(placementId)`:
  - Track consecutive school days where all periods absent
  - For notification triggers (Epic 7)

- [ ] 2.6 Implement `getStudentsBelowAttendanceThreshold(threshold)`:
  - Return list of students below threshold
  - For dashboard KPI (Epic 6)

- [ ] 2.7 Add `getRateCategory()` helper:
  - >90% → 'green'
  - 85-90% → 'yellow'
  - <85% → 'red'

### Task 3: UI Components

- [ ] 3.1 Create `AttendanceRateBadge.tsx`:
  - Color-coded badge (green/yellow/red)
  - Shows percentage
  - Supports sm/md/lg sizes

- [ ] 3.2 Create `AttendanceRateProgress.tsx`:
  - Progress bar with rate
  - Threshold marker at 85%
  - Shows daily + cumulative
  - Period count stats

### Task 4: Student Profile Integration

- [ ] 4.1 Update `CurrentPlacementCard` props:
  - Add `attendanceRates` prop
  - Type: `StudentAttendanceRates | undefined`

- [ ] 4.2 Add `AttendanceRateProgress` to card:
  - Below existing Progress section
  - Show daily + cumulative rates

- [ ] 4.3 Add consecutive absence warning:
  - Alert when >= 2 days consecutive
  - Amber warning styling

- [ ] 4.4 Update student profile page:
  - Fetch rates with `getStudentAttendanceRates()`
  - Pass to `CurrentPlacementCard`

### Task 5: Room Roster Integration

- [ ] 5.1 Update `RoomRosterContext`:
  - Add `attendanceRates: Map<string, AttendanceRateResult>`
  - Add `refreshAttendanceRates()` function
  - Update `initializeFromData()` to accept rates

- [ ] 5.2 Update room roster page:
  - Fetch rates with `getRoomAttendanceRates()`
  - Pass to context initialization

- [ ] 5.3 Add Rate column to `RoomRosterTable`:
  - Position: after Attendance column
  - Show `AttendanceRateBadge`
  - Show "—" when no data

### Task 6: Export Components

- [ ] 6.1 Update `components/daep/roster/index.ts`:
  - Export `AttendanceRateBadge`

- [ ] 6.2 Update `components/daep/shared/index.ts` (if exists):
  - Export `AttendanceRateProgress`

### Task 7: Testing

- [ ] 7.1 TypeScript compilation passes
- [ ] 7.2 Test daily rate calculation:
  - P counts as present
  - T counts as present
  - ED counts as present
  - A (unexcused) counts as absent
  - A (excused + counts_toward=true) counts as present
  - A (excused + counts_toward=false) counts as absent

- [ ] 7.3 Test cumulative rate calculation:
  - Across multiple days
  - Across multiple periods

- [ ] 7.4 Test color thresholds:
  - 95% → green
  - 87% → yellow
  - 80% → red

- [ ] 7.5 Test consecutive absent days:
  - Single absent day → 1
  - Three absent days → 3 (warning shows)
  - Present day resets streak → 0

- [ ] 7.6 Test UI display:
  - Student profile shows rates
  - Roster shows rate badges
  - Warning shows for 2+ consecutive absences

- [ ] 7.7 Playwright MCP verification:
  - Navigate to student profile
  - Verify attendance rate display
  - Navigate to room roster
  - Verify rate column

---

## Dev Notes

### Calculation Logic

```typescript
// "Present" includes:
// - P (Present)
// - T (Tardy)
// - ED (Early Dismissal)
// - A with counts_toward_days_served = true (Gov't excused)

// Rate = periodsPresent / totalPeriods * 100

function isConsideredPresent(record: AttendanceEntry): boolean {
  return record.status !== 'A' || record.counts_toward_days_served === true;
}
```

### Consecutive Absent Days Logic

```typescript
// Group attendance by date
// For each date, check if ANY period was "present"
// Count consecutive days from today backwards where ALL periods were absent
// Gov't excused (counts_toward=true) breaks the streak
```

### No Attendance Scenario

```typescript
// When no records exist:
// - daily rate: null (display "—")
// - cumulative rate: 100% (assume perfect until proven otherwise)
// - Don't penalize students before attendance is taken
```

### Threshold Configuration

Default threshold: 85%

Configurable in district settings (General tab) - included in this story.

---

## Out of Scope

| Item | Deferred To |
|------|-------------|
| Dashboard KPI card | Epic 6 (Story 6.1) |
| Auto-notification on 3+ absences | Epic 7 (Story 7.6) |
| Attendance trend chart | Epic 6 (Story 6.3) |
| Export attendance report | Epic 6 (Story 6.7) |

**Note:** Threshold is configurable in settings (included in scope). Warning display at 3+ consecutive absent days.

---

## Dependencies

- Story 3-9 (Attendance Entry) - **DONE**
- Story 3-10 (Excused/Unexcused) - **DONE**
- `daep_attendance` table with `counts_toward_days_served` field

---

## References

- **Tech Spec:** `docs/sprint-artifacts/daep/tech-spec-story-3-11.md`
- **Attendance Actions:** `app/actions/daep/attendance.ts`
- **Current Placement Card:** `components/daep/CurrentPlacementCard.tsx`
- **Room Roster Context:** `components/daep/roster/RoomRosterContext.tsx`

---

_Story Version: 1.0_
_Created: 2025-12-07_
_Author: Claude (AI Assistant)_
