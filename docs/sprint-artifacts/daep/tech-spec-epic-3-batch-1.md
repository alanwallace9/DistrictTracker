# Tech Spec: Epic 3 Batch 1 - Room Roster View

**Story:** 3-1
**Points:** 3
**FRs:** FR67
**Dependencies:** Epic 1 (schema, rooms, schedules), Epic 2 (placements)

---

## Overview

The Room Roster View is the **foundational page for all daily operations** in Epic 3. It provides staff with a focused view of students assigned to their room, with period and date selectors that will be used for point entry (Story 3-2) and attendance tracking (Story 3-9).

**Critical Design Decision:** This page must be designed with extensibility in mind. Stories 3-2, 3-3, 3-4, and 3-9 will add columns and functionality to this roster. The initial implementation should create a clean component architecture that supports these future additions without refactoring.

---

## Acceptance Criteria (from Epic File)

- [ ] **AC 3.1.1:** Room roster page at `/daep/rooms/[roomId]`
- [ ] **AC 3.1.2:** Shows all students with active placements assigned to this room
- [ ] **AC 3.1.3:** Columns: student name, student ID, days remaining, today's points total, attendance status
- [ ] **AC 3.1.4:** Room selector dropdown to switch between rooms (for staff assigned to multiple)
- [ ] **AC 3.1.5:** Period selector (defaults to current period based on bell schedule)
- [ ] **AC 3.1.6:** Date picker (defaults to today)
- [ ] **AC 3.1.7:** Staff can only see rooms they're assigned to
- [ ] **AC 3.1.8:** District/DAEP admins can see all rooms

---

## Architecture Decisions

### 1. Route Structure

```
/daep/rooms              → Room selection landing (if user has multiple rooms)
/daep/rooms/[roomId]     → Room roster for specific room
```

**Rationale:** Explicit room in URL allows:
- Direct linking to specific rooms
- Browser back/forward navigation
- Bookmarking favorite rooms

### 2. Role-Based Access Model

**Current Implementation (Birdville ISD use case):**
- Students are assigned to a room all day
- Teachers rotate between rooms each period
- Therefore: **All DAEP staff have access to ALL rooms**

| Role | Access Level |
|------|--------------|
| `daep_staff` | All rooms in tenant |
| `daep_admin_l2` | All rooms in tenant |
| `daep_admin_l1` | All rooms in tenant |
| `district_admin` | All rooms in tenant |
| `super_admin` | All rooms in active tenant |

**Future Expansion (for other tenants):**
The `daep_room_staff` table structure is preserved for districts that need room-specific staff assignments. A tenant-level setting could toggle between:
- `room_access_mode: 'all'` - Staff sees all rooms (current default)
- `room_access_mode: 'assigned'` - Staff sees only assigned rooms

**Implementation:** For now, skip `daep_room_staff` check - all DAEP roles see all rooms. The assignment table is still useful for "primary teacher" designation per room.

### 2b. Room Groups for Separation Logic

**Business Requirement:**
- Separations (stay-aways) operate at the **room group level**, not individual rooms
- Birdville calls them "Up" and "Down" (sides of the building)
- Other districts may use different names (e.g., "East Wing", "West Wing", "Building A")
- If Student A must be separated from Student B, they cannot be in the **same room group**

**Database Change Required:**

```sql
-- New table for room groups
CREATE TABLE daep_room_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  group_name TEXT NOT NULL,           -- e.g., "Up", "Down", "East Wing"
  description TEXT,                   -- Optional description
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, group_name)
);

-- Add room_group_id to daep_rooms
ALTER TABLE daep_rooms
ADD COLUMN room_group_id UUID REFERENCES daep_room_groups(id);

-- RLS policies (same pattern as other DAEP tables)
```

**Impact on Existing Separation Logic (Story 2-5):**
The current `getAvailableRoomsForStudent()` in `app/actions/daep/rooms.ts` uses `building_section` for separation logic. This should be refactored to use `room_group_id`:

```typescript
// Current: checks building_section string match
// Updated: checks room_group_id match
const blockedGroupIds = new Set<string>();
(occupancy || []).forEach((p) => {
  if (separatedStudentIds.has(p.school_id) && p.assigned_room_id) {
    const room = rooms.find((r) => r.id === p.assigned_room_id);
    if (room?.room_group_id) {
      blockedGroupIds.add(room.room_group_id);
    }
  }
});
```

**Settings UI Enhancement:**
Add "Room Groups" section to `/daep/settings/rooms`:
- CRUD for room groups (name, description)
- Assign rooms to groups (dropdown on room edit form)
- Visual grouping of rooms in the room list

**Migration Path:**
1. Create `daep_room_groups` table
2. Add `room_group_id` to `daep_rooms`
3. Migrate existing `building_section` values to room groups (if any exist)
4. Update separation logic to use groups
5. Update Room Settings UI

**Note:** This is a prerequisite enhancement. Should be completed before Story 3-1 or as Story 3-0.

### 3. Component Architecture for Extensibility

```
RoomRosterPage (page.tsx)
├── RoomRosterHeader
│   ├── RoomSelector (dropdown)
│   ├── DatePicker
│   └── PeriodSelector
├── RoomRosterToolbar (future: bulk actions for 3-3)
└── RoomRosterTable
    ├── RosterTableHeader
    └── RosterTableRows
        └── RosterStudentRow (one per student)
            ├── StudentInfoCell
            ├── DaysRemainingCell
            ├── PointsCell (placeholder for 3-2)
            └── AttendanceCell (placeholder for 3-9)
```

**Key Pattern:** Each cell type is its own component. Stories 3-2 and 3-9 will replace placeholder cells with interactive components.

### 4. Period Calculation Utility

Create `getCurrentPeriod()` function that:
1. Gets today's date
2. Looks up active bell schedule for DAEP campus
3. Checks if there's a calendar override for today
4. Returns current period based on time of day

```typescript
// lib/daep/bell-schedule.ts
interface CurrentPeriodResult {
  periodNumber: number;
  periodName: string;
  startTime: string;
  endTime: string;
  isActive: boolean; // false if outside school hours
  schedule: BellSchedule;
}

export async function getCurrentPeriod(tenantId: string): Promise<CurrentPeriodResult | null>
```

### 5. Data Fetching Strategy

**Server-side data fetching** with client-side interactivity:

1. Page component fetches initial data (today, current period)
2. Room/date/period changes trigger client-side refetch
3. Use React Query or SWR pattern for caching (matches existing patterns)

---

## Database Schema (Existing)

### Tables Used

```sql
-- Already exist from Epic 1b
daep_rooms (id, tenant_id, room_number, room_name, capacity, building_section, active)
daep_room_staff (id, tenant_id, room_id, user_id, assignment_type)
daep_bell_schedules (id, tenant_id, schedule_name, periods JSONB, is_default, active)
daep_school_calendar (id, tenant_id, date, is_school_day, day_type, schedule_id)

-- Already exist from Epic 2
daep_placements (id, tenant_id, school_id, assigned_room_id, status, days_remaining, ...)
trespass_records (school_id, first_name, last_name, ...)

-- Will be used in Stories 3-2, 3-9 (exist but empty)
daep_daily_points (id, tenant_id, placement_id, date, period, points, ...)
daep_attendance (id, tenant_id, placement_id, date, period, status, ...)
```

### Query Pattern for Roster

```sql
-- Get students for room roster
SELECT
  p.id as placement_id,
  p.school_id,
  p.days_remaining,
  p.status,
  t.first_name,
  t.last_name,
  t.grade_level,
  -- Subquery for today's points (Story 3-2 will populate)
  COALESCE(
    (SELECT SUM(points) FROM daep_daily_points dp
     WHERE dp.placement_id = p.id AND dp.date = $date),
    0
  ) as today_points_total,
  -- Subquery for period attendance (Story 3-9 will populate)
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

---

## Server Actions

### New File: `app/actions/daep/roster.ts`

```typescript
// Types
export interface RosterStudent {
  placement_id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  grade_level: number | null;
  days_remaining: number | null;
  status: PlacementStatus;
  today_points_total: number;
  attendance_status: AttendanceStatus | null;
}

export interface RoomRosterResult {
  room: {
    id: string;
    room_number: string;
    room_name: string | null;
    capacity: number;
  };
  students: RosterStudent[];
  date: string;
  period: number | null;
  currentPeriodInfo: CurrentPeriodResult | null;
}

// Actions
export async function getUserAccessibleRooms(): Promise<DAEPRoom[]>
export async function getRoomRoster(roomId: string, date: string, period?: number): Promise<RoomRosterResult>
export async function canAccessRoom(roomId: string): Promise<boolean>
```

### New File: `lib/daep/bell-schedule.ts`

```typescript
export async function getCurrentPeriod(tenantId: string): Promise<CurrentPeriodResult | null>
export async function getPeriodsForDate(tenantId: string, date: string): Promise<BellSchedulePeriod[]>
export async function getScheduleForDate(tenantId: string, date: string): Promise<BellSchedule | null>
```

---

## UI Components

### New File: `app/daep/(main)/rooms/page.tsx`

Room selection landing page (when user has multiple rooms):

```tsx
// If user has 1 room → redirect to /daep/rooms/[roomId]
// If user has multiple → show room cards to select
// If admin → show all rooms with search
```

### New File: `app/daep/(main)/rooms/[roomId]/page.tsx`

Main roster page with:
- Header with room info
- Selectors (room, date, period)
- Student roster table

### New Components in `components/daep/roster/`

| Component | Purpose |
|-----------|---------|
| `RoomSelector.tsx` | Dropdown to switch rooms |
| `DateSelector.tsx` | Date picker, defaults to today |
| `PeriodSelector.tsx` | Period dropdown based on bell schedule |
| `RoomRosterTable.tsx` | Table component with sortable columns |
| `RosterStudentRow.tsx` | Row component (extensible for points/attendance) |
| `DaysRemainingBadge.tsx` | Color-coded badge (green/yellow/red) |

---

## Implementation Order

### Phase 1: Server Actions & Utilities (Do First)

1. **Create `lib/daep/bell-schedule.ts`**
   - `getCurrentPeriod()` - uses existing `daep_bell_schedules` and `daep_school_calendar`
   - `getPeriodsForDate()` - returns periods array for a given date
   - Unit tests for period calculation edge cases

2. **Create `app/actions/daep/roster.ts`**
   - `getUserAccessibleRooms()` - checks `daep_room_staff` + role fallback
   - `getRoomRoster()` - main data fetch with points/attendance placeholders
   - `canAccessRoom()` - authorization check

### Phase 2: UI Components

3. **Create roster components** in `components/daep/roster/`
   - Start with `RoomSelector`, `DateSelector`, `PeriodSelector`
   - Then `RoomRosterTable` and `RosterStudentRow`
   - `DaysRemainingBadge` for color-coded display

### Phase 3: Pages

4. **Create `/daep/rooms` landing page**
   - Room cards or redirect logic

5. **Create `/daep/rooms/[roomId]` roster page**
   - Integrate all components
   - Handle loading/error states

### Phase 4: Polish

6. **Add empty states**
   - No students assigned to room
   - No rooms assigned to user (with CTA for admin)

7. **Mobile responsiveness**
   - Responsive table or card view on mobile

---

## Key Decisions to Avoid Refactoring

### Decision 1: Points & Attendance Cells as Props

The `RosterStudentRow` component should accept optional render props for points and attendance cells:

```tsx
interface RosterStudentRowProps {
  student: RosterStudent;
  date: string;
  period: number | null;
  renderPointsCell?: (student: RosterStudent) => React.ReactNode;
  renderAttendanceCell?: (student: RosterStudent) => React.ReactNode;
}
```

In Story 3-1, we render placeholder text. In Stories 3-2/3-9, we pass interactive components.

### Decision 2: Roster Context Provider

Create a `RoomRosterContext` that stores:
- Current room, date, period
- Student list
- Refresh function

This allows child components (added in future stories) to access and modify roster state without prop drilling.

### Decision 3: Optimistic Updates Pattern

Establish the pattern now for optimistic updates (used heavily in 3-2):

```typescript
// In context
const updateStudentData = (placementId: string, updates: Partial<RosterStudent>) => {
  setStudents(prev => prev.map(s =>
    s.placement_id === placementId ? { ...s, ...updates } : s
  ));
};
```

### Decision 4: Column Visibility Configuration

Store column visibility in component state to support future stories adding columns:

```typescript
const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>([
  'student_info',
  'days_remaining',
  'points_total',      // Placeholder, replaced in 3-2
  'attendance_status', // Placeholder, replaced in 3-9
]);
```

---

## Testing Checklist

- [ ] Staff sees only their assigned rooms
- [ ] Admin sees all rooms
- [ ] Period selector defaults to current period (or first period if before school)
- [ ] Date defaults to today
- [ ] Roster shows only active/pending/transition placements
- [ ] Days remaining color coding works (green >10, yellow 5-10, red <5)
- [ ] Room switch updates URL and roster
- [ ] Date/period change refetches roster
- [ ] Empty state displays correctly
- [ ] Mobile view is usable

---

## Files to Create

```
lib/daep/bell-schedule.ts                         # Period utilities
app/actions/daep/roster.ts                        # Server actions
components/daep/roster/RoomSelector.tsx           # Room dropdown
components/daep/roster/DateSelector.tsx           # Date picker
components/daep/roster/PeriodSelector.tsx         # Period dropdown
components/daep/roster/RoomRosterTable.tsx        # Main table
components/daep/roster/RosterStudentRow.tsx       # Student row
components/daep/roster/DaysRemainingBadge.tsx     # Color badge
components/daep/roster/RoomRosterContext.tsx      # Context provider
app/daep/(main)/rooms/page.tsx                    # Room selection
app/daep/(main)/rooms/[roomId]/page.tsx           # Roster page
```

---

## Patterns to Reuse from Existing Code

| Pattern | Source File | Usage |
|---------|-------------|-------|
| Server action structure | `app/actions/daep/rooms.ts` | `getTenantId()`, `checkDAEPAdminRole()`, audit logging |
| Filter components | `components/daep/StudentFilters.tsx` | Select dropdowns, date picker styling |
| Table component | `components/daep/StudentListTable.tsx` | Sortable columns, pagination |
| List page structure | `app/daep/(main)/students/page.tsx` | Loading states, error handling, refresh |

---

## Watch Out For

1. **Bell schedule edge cases:**
   - Before first period (show period 1)
   - After last period (show last period)
   - Weekends/holidays (show "No school today")
   - No default schedule configured

2. **Room assignment gaps:**
   - Student assigned to placement but no room yet
   - Room deactivated while students assigned

3. **Performance:**
   - Large rosters (30+ students) need efficient rendering
   - Points/attendance subqueries could be slow - consider caching

4. **Timezone:**
   - Bell schedule times should respect tenant timezone (`America/Chicago` default)
   - Date picker should use local date, not UTC

---

## Success Metrics

After Story 3-1 is complete:
- Staff can navigate to `/daep/rooms` and see their assigned room(s)
- Staff can view all students in a room with days remaining
- Staff can switch rooms, dates, and periods
- Admins can access any room
- Page is ready for points column (3-2) and attendance column (3-9)
