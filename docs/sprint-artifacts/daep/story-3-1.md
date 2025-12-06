# Story 3.1: Room Roster View

Status: done

## Story

As a **DAEP staff member**,
I want **to view all students assigned to my room with period and date selectors**,
so that **I can track points and attendance for my students efficiently**.

## Acceptance Criteria

| AC # | Criteria | Source |
|------|----------|--------|
| 3.1.1 | Room roster page at `/daep/rooms/[roomId]` | Epic 3, FR67 |
| 3.1.2 | Shows all students with active placements assigned to this room | Epic 3 |
| 3.1.3 | Columns: student name, student ID, days remaining, today's points total, attendance status | Epic 3 |
| 3.1.4 | Room selector dropdown to switch between rooms (for staff assigned to multiple) | Epic 3 |
| 3.1.5 | Period selector (defaults to current period based on bell schedule) | Epic 3 |
| 3.1.6 | Date picker (defaults to today) | Epic 3 |
| 3.1.7 | All DAEP staff can see all rooms (Birdville model; `daep_room_staff` table preserved for future tenant setting to enable assigned-room-only mode) | Epic 3 |
| 3.1.8 | District/DAEP admins can see all rooms | Epic 3 |

## Tasks / Subtasks

### Task 1: Create Bell Schedule Utilities (AC: 3.1.5)
- [x] Create `lib/daep/bell-schedule.ts`
- [x] Implement `getCurrentPeriod(tenantId)` - returns current period based on time and bell schedule
- [x] Implement `getPeriodsForDate(tenantId, date)` - returns periods array for date picker
- [x] Implement `getScheduleForDate(tenantId, date)` - checks calendar for schedule overrides
- [x] Handle edge cases: before first period, after last period, weekends/holidays, no schedule configured

### Task 2: Create Roster Server Actions (AC: 3.1.1, 3.1.2, 3.1.7, 3.1.8)
- [x] Create `app/actions/daep/roster.ts`
- [x] Implement `getUserAccessibleRooms()` - returns rooms user can access (all rooms for DAEP roles per Birdville model)
- [x] Implement `getRoomRoster(roomId, date, period)` - main data fetch with students, points totals, attendance
- [x] Implement `canAccessRoom(roomId)` - authorization check
- [x] Query pattern: join `daep_placements` + `trespass_records` + aggregate points/attendance

### Task 3: Create Roster UI Components (AC: 3.1.3, 3.1.4, 3.1.5, 3.1.6)
- [x] Create `components/daep/roster/RoomRosterContext.tsx` - context provider for roster state
- [x] Create `components/daep/roster/RoomSelector.tsx` - dropdown to switch rooms
- [x] Create `components/daep/roster/DateSelector.tsx` - date picker, defaults to today
- [x] Create `components/daep/roster/PeriodSelector.tsx` - period dropdown from bell schedule
- [x] Create `components/daep/roster/DaysRemainingBadge.tsx` - color-coded badge (green >10, yellow 5-10, red <5)

### Task 4: Create Roster Table Components (AC: 3.1.3)
- [x] Create `components/daep/roster/RoomRosterTable.tsx` - main table with sortable columns
- [x] Create `components/daep/roster/RosterStudentRow.tsx` - student row with extensible cells pattern
- [x] Implement render props pattern for points/attendance cells (placeholders for Stories 3-2, 3-9)
- [x] Column visibility configuration for future extensibility

### Task 5: Create Room Selection Page (AC: 3.1.4)
- [x] Create `app/daep/(main)/rooms/page.tsx`
- [x] If user has 1 room → redirect to `/daep/rooms/[roomId]`
- [x] If user has multiple → show room cards to select
- [x] If admin → show all rooms with search

### Task 6: Create Room Roster Page (AC: 3.1.1, 3.1.2)
- [x] Create `app/daep/(main)/rooms/[roomId]/page.tsx`
- [x] Integrate all components: header, selectors, table
- [x] Handle loading/error states
- [x] Implement URL-based state for room, date, period (for bookmarking/sharing)

### Task 7: Empty States and Polish
- [x] Empty state: no students assigned to room
- [x] Empty state: no rooms available (with CTA for admin)
- [x] Mobile responsiveness: responsive table or card view
- [x] Test with Playwright MCP

### Task 8: Quick Win Enhancements
- [x] Keyboard navigation for period selector (arrow keys to move between periods)
- [x] "Copy link" button for current room/date/period URL
- [x] Student count badge in room selector (show count next to room number)

## Dev Notes

### Critical Design Decision: Extensibility

This page is the **foundation for all Epic 3 daily operations**. Stories 3-2 (Point Entry), 3-3 (Bulk Points), 3-4 (Point Notes), and 3-9 (Attendance) will add columns and functionality. Implementation must support these future additions:

1. **Render Props Pattern** for cells - allows swapping placeholder cells with interactive components
2. **RoomRosterContext** - shared state for child components without prop drilling
3. **Optimistic Updates Pattern** - establish `updateStudentData()` for instant UI feedback
4. **Column Visibility Config** - stored in state for future column additions

### Role-Based Access (Birdville ISD Model)

Per tech spec, current implementation uses simplified access:
- **All DAEP staff see ALL rooms** (teachers rotate, students stay in one room)
- `daep_room_staff` table is preserved for future "assigned room only" mode
- Configurable via tenant setting `room_access_mode: 'all' | 'assigned'`

| Role | Access |
|------|--------|
| `daep_staff` | All rooms in tenant |
| `daep_admin_l2` | All rooms in tenant |
| `daep_admin_l1` | All rooms in tenant |
| `district_admin` | All rooms in tenant |
| `super_admin` | All rooms in active tenant |

### Learnings from Previous Story

**From Story 3-0: Room Groups (Status: done)**

- **New Table Created**: `daep_room_groups` for separation logic grouping
- **New Server Actions**: `app/actions/daep/room-groups.ts` - CRUD for room groups
- **Schema Updated**: `daep_rooms` now has `room_group_id` FK column
- **Separation Logic Refactored**: `getAvailableRoomsForStudent()` uses `room_group_id` instead of `building_section` string
- **UI Components**: `AddGroupDialog.tsx`, `EditGroupDialog.tsx` in rooms settings
- **Patterns to Reuse**: Room settings dialog pattern, validation schema pattern

[Source: docs/sprint-artifacts/daep/story-3-0.md]

### Query Pattern for Roster

```sql
SELECT
  p.id as placement_id,
  p.school_id,
  p.days_remaining,
  p.status,
  t.first_name,
  t.last_name,
  t.grade_level,
  COALESCE(
    (SELECT SUM(points) FROM daep_daily_points dp
     WHERE dp.placement_id = p.id AND dp.date = $date),
    0
  ) as today_points_total,
  (SELECT status FROM daep_attendance da
   WHERE da.placement_id = p.id AND da.date = $date AND da.period = $period)
  as attendance_status
FROM daep_placements p
JOIN trespass_records t ON t.school_id = p.school_id AND t.tenant_id = p.tenant_id
WHERE p.tenant_id = $tenantId
  AND p.assigned_room_id = $roomId
  AND p.status IN ('pending', 'active', 'transition')
ORDER BY t.last_name, t.first_name;
```

### Timezone Handling

Bell schedule times must respect tenant timezone (`America/Chicago` default). Date picker should use local date, not UTC.

### Watch Out For

1. **Bell schedule edge cases**: before first period, after last period, weekends/holidays, no default schedule
2. **Room assignment gaps**: student assigned but no room yet, room deactivated while students assigned
3. **Performance**: large rosters (30+ students) - consider efficient rendering
4. **Timezone**: bell schedule times respect tenant timezone

### Project Structure Notes

**Files to Create:**
```
lib/daep/bell-schedule.ts                         # Period utilities
app/actions/daep/roster.ts                        # Server actions
components/daep/roster/RoomRosterContext.tsx      # Context provider
components/daep/roster/RoomSelector.tsx           # Room dropdown
components/daep/roster/DateSelector.tsx           # Date picker
components/daep/roster/PeriodSelector.tsx         # Period dropdown
components/daep/roster/RoomRosterTable.tsx        # Main table
components/daep/roster/RosterStudentRow.tsx       # Student row
components/daep/roster/DaysRemainingBadge.tsx     # Color badge
app/daep/(main)/rooms/page.tsx                    # Room selection
app/daep/(main)/rooms/[roomId]/page.tsx           # Roster page
```

### Quick Wins (Added to Scope)

| Enhancement | Why It Helps | Effort |
|-------------|--------------|--------|
| Keyboard navigation for period selector | Arrow keys for fast period switching during point entry | Low |
| "Copy link" button | One-click share current room/date/period URL with colleagues | Low |
| Student count badge in room selector | See room load at a glance without switching | Low |

### Backlog (Future Stories)

| Idea | Target Story | Notes |
|------|--------------|-------|
| Period auto-advance | Story 3-2 | Auto-select next period when current ends (requires timer) |

### References

- [Source: docs/sprint-artifacts/daep/tech-spec-epic-3-batch-1.md] - Full technical specification
- [Source: docs/reference/epics-part2.md#Story-3.1] - Epic definition and ACs
- [Source: docs/sprint-artifacts/daep/story-3-0.md] - Previous story (Room Groups)
- [Source: app/actions/daep/rooms.ts] - Existing room actions pattern
- [Source: components/daep/StudentFilters.tsx] - Existing filter component patterns
- [Source: components/daep/StudentListTable.tsx] - Existing table patterns

## Definition of Done

- [x] All acceptance criteria verified
- [x] Staff can navigate to `/daep/rooms` and see room selection
- [x] Staff can view all students in a room with days remaining
- [x] Room/date/period selectors work and update URL
- [x] Admins can access any room
- [x] Empty states display correctly
- [x] Mobile view is usable
- [x] No console errors
- [x] Tested with Playwright MCP
- [x] Page ready for points column (3-2) and attendance column (3-9)

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/story-3-1.context.xml`

### Agent Model Used

Claude Opus 4.5

### Debug Log References

N/A

### Completion Notes List

1. **Bell Schedule Utilities** - Extended existing `lib/daep/current-period.ts` pattern. Created comprehensive utilities for schedule resolution with calendar overrides.

2. **Roster Server Actions** - Implemented Birdville model (all DAEP staff see all rooms). Query pattern joins placements + trespass_records with aggregated points and attendance.

3. **Render Props Pattern** - RosterStudentRow accepts `renderExtraCells` prop for Stories 3-2 and 3-9 to add columns without modifying base component.

4. **Context Provider** - RoomRosterContext manages shared state, URL synchronization, and `updateStudentData()` for optimistic updates.

5. **Quick Wins Implemented**:
   - Keyboard navigation (arrow keys) in PeriodSelector
   - Copy link button in room roster header
   - Student count badge in RoomSelector and room cards

6. **Type Fix** - PlacementStatus uses 'pending', 'active', 'met', 'complete' (not 'transition', 'cancelled', 'expelled').

### File List

**New Files Created:**
```
lib/daep/bell-schedule.ts
app/actions/daep/roster.ts
components/daep/roster/RoomRosterContext.tsx
components/daep/roster/RoomSelector.tsx
components/daep/roster/DateSelector.tsx
components/daep/roster/PeriodSelector.tsx
components/daep/roster/DaysRemainingBadge.tsx
components/daep/roster/RoomRosterTable.tsx
components/daep/roster/RosterStudentRow.tsx
components/daep/roster/index.ts
app/daep/(main)/rooms/page.tsx
app/daep/(main)/rooms/[roomId]/page.tsx
app/daep/(main)/rooms/[roomId]/RoomRosterView.tsx
app/daep/(main)/rooms/[roomId]/loading.tsx
app/daep/(main)/rooms/[roomId]/not-found.tsx
```

**Modified Files:**
```
components/daep/layout/DAEPSidebar.tsx - Added Room Rosters nav link
```
