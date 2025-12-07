# Tech Spec: Story 3-9 - Attendance Entry

**Story:** 3-9
**Points:** 3
**FRs:** FR38, FR39, FR40, FR41
**Dependencies:** Story 3-1 (Room Roster), Story 3-2 (Point Entry Grid)

---

## Overview

Attendance Entry adds per-period attendance tracking to the existing room roster grid. Staff can mark students as Present (P), Absent (A), Tardy (T), or Early Dismissal (ED) for each period. When a student is marked present, base points (10) are automatically granted for that period (integration with existing points system from Story 3-2).

**Key UX Principle:** Quick-tap cycling through statuses for efficient entry. Tardy and Early Dismissal require additional time input via a minimal modal.

---

## Acceptance Criteria (from Epic File)

- [ ] **AC 3.9.1:** Attendance column in room roster grid
- [ ] **AC 3.9.2:** Status options: P (Present), A (Absent), T (Tardy), ED (Early Dismissal)
- [ ] **AC 3.9.3:** Default: Present (P)
- [ ] **AC 3.9.4:** Quick-tap to cycle through statuses
- [ ] **AC 3.9.5:** For Tardy: prompt for tardy_time (HH:MM)
- [ ] **AC 3.9.6:** For Early Dismissal: prompt for early_dismiss_time (HH:MM)
- [ ] **AC 3.9.7:** Auto-save on selection
- [ ] **AC 3.9.8:** Attendance saved to `daep_attendance` table

---

## Database Schema (Existing)

The `daep_attendance` table already exists from Epic 1a migrations:

```sql
daep_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id),
  date DATE NOT NULL,
  period TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'P', 'A', 'T', 'ED'
  tardy_time TIME,       -- HH:MM for Tardy
  early_dismiss_time TIME, -- HH:MM for Early Dismissal
  excused BOOLEAN DEFAULT false,  -- Story 3-10
  excuse_reason TEXT,             -- Story 3-10
  counts_toward_days_served BOOLEAN DEFAULT true,  -- Story 3-10
  notes TEXT,
  entered_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, placement_id, date, period)
)
```

**Note:** The `excused`, `excuse_reason`, and `counts_toward_days_served` fields will be implemented in Story 3-10. This story focuses on the core attendance entry workflow.

---

## Architecture Decisions

### 1. Attendance Status Values

| Status | Code | Description | Requires Time? | Grants Base Points? |
|--------|------|-------------|----------------|---------------------|
| Present | `P` | Student present for full period | No | Yes (10 pts) |
| Absent | `A` | Student absent for period | No | No |
| Tardy | `T` | Student arrived late | Yes (tardy_time) | Yes (10 pts) |
| Early Dismissal | `ED` | Student left early | Yes (early_dismiss_time) | Yes (10 pts) |

**Rationale:** Tardy and Early Dismissal still grant base points because the student was present for part of the period. Story 3-10 will handle excused vs unexcused logic which affects `counts_toward_days_served`.

### 2. Integration with Points System

Attendance and points are tightly coupled:

```
markAttendance('P' | 'T' | 'ED') → createBasePoints(10)
markAttendance('A') → removeBasePoints()
```

The existing `createBasePoints()` and `removeBasePoints()` functions from `points.ts` handle this. We'll call them from the attendance action.

### 3. Inline Dropdown Pattern (iPad-Friendly)

**User Feedback:** Quick-tap cycling is imprecise on iPad. Use an inline dropdown instead.

**Interaction:**
1. Cell shows current status as badge (or `--` if no attendance taken)
2. Click badge opens inline dropdown with options: P, A, T, ED
3. Select status to save immediately
4. If T or ED selected, time modal appears after dropdown closes

**Combined with Bulk Actions:**
- Staff can check all students → "Mark All Present" bulk action
- Then manually adjust the 1-2 absent students via dropdown
- This is the expected primary workflow for efficiency

### 4. Column Order (Per User Feedback)

```
Student Name | Grade | Status | Attendance | Days Left | Total Points | Adjust
```

**Attendance column position:** After Status, before Days Left.

### 5. UI Component Strategy

**Room Roster Table:**
```
RoomRosterTable
├── Student Name
├── Grade
├── Status
├── AttendanceCell (new) ← dropdown + badge
│   ├── StatusBadge (shows P/A/T/ED or "--")
│   └── Dropdown (P, A, T, ED options)
├── Days Left
├── Total Points
└── Adjust

AttendanceTimeModal (new)
├── Time input (HH:MM)
├── Cancel button
└── Save button
```

**Room Cards (Rooms List Page):**
```
RoomCard
├── Room Number
├── Student Count (8 of 15)
└── AttendanceTakenIndicator (new) ← shows if attendance taken for current period
    └── Small icon/badge in corner (e.g., ✓ green checkmark)
```

### 6. Optimistic Updates

Match the pattern from point entry:
1. Update UI immediately on click
2. Save to database in background
3. Revert on error with toast notification

---

## Server Actions

### New File: `app/actions/daep/attendance.ts`

```typescript
// ========== TYPES ==========

export type AttendanceStatus = 'P' | 'A' | 'T' | 'ED';

export interface AttendanceEntry {
  id: string;
  placement_id: string;
  date: string;
  period: string;
  status: AttendanceStatus;
  tardy_time: string | null;
  early_dismiss_time: string | null;
  entered_by: string;
  created_at: string;
}

export interface MarkAttendanceInput {
  placement_id: string;
  date: string;
  period: string;
  status: AttendanceStatus;
  tardy_time?: string;        // Required if status = 'T'
  early_dismiss_time?: string; // Required if status = 'ED'
}

export interface MarkAttendanceResult {
  success: boolean;
  error?: string;
  entry?: AttendanceEntry;
  pointsCreated?: boolean;
  pointsRemoved?: boolean;
}

// ========== ACTIONS ==========

/**
 * Mark attendance for a student in a specific period.
 * Handles point creation/removal based on status.
 * Upserts - updates existing entry or creates new one.
 */
export async function markAttendance(
  input: MarkAttendanceInput
): Promise<MarkAttendanceResult>

/**
 * Get attendance for all students in a room for a date/period.
 * Used by roster view to populate attendance column.
 */
export async function getRoomAttendance(
  roomId: string,
  date: string,
  period: string
): Promise<Map<string, AttendanceEntry>>

/**
 * Get attendance history for a specific placement.
 * Used by student profile timeline (Story 4-5).
 */
export async function getPlacementAttendance(
  placementId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<AttendanceEntry[]>

/**
 * Bulk mark attendance for multiple students.
 * Used for "Mark All Present" quick action.
 */
export async function bulkMarkAttendance(
  input: {
    placementIds: string[];
    date: string;
    period: string;
    status: AttendanceStatus;
  }
): Promise<{ success: boolean; count: number; error?: string }>

/**
 * Check if attendance has been taken for a room/period.
 * Used by room cards to show "attendance taken" indicator.
 * Returns true if ALL students in room have attendance for the period.
 */
export async function isAttendanceTaken(
  roomId: string,
  date: string,
  period: string
): Promise<boolean>

/**
 * Get attendance status for all rooms (for room cards page).
 * Efficient batch query to show indicators on all room cards.
 */
export async function getRoomsAttendanceStatus(
  date: string,
  period: string
): Promise<Map<string, { taken: boolean; count: number; total: number }>>
```

### Implementation Details

#### `markAttendance()` Flow:

```typescript
async function markAttendance(input: MarkAttendanceInput): Promise<MarkAttendanceResult> {
  // 1. Validate input
  // 2. Check DAEP staff role
  // 3. Verify placement exists and belongs to tenant

  // 4. Get existing attendance entry (if any)
  const existing = await getExistingAttendance(placement_id, date, period);

  // 5. Upsert attendance record
  const entry = await upsertAttendance({
    tenant_id,
    placement_id,
    date,
    period,
    status,
    tardy_time: status === 'T' ? tardy_time : null,
    early_dismiss_time: status === 'ED' ? early_dismiss_time : null,
    entered_by: userId,
  });

  // 6. Handle points based on status change
  let pointsCreated = false;
  let pointsRemoved = false;

  if (status === 'A') {
    // Absent - remove base points
    await removeBasePoints(placement_id, date, period);
    pointsRemoved = true;
  } else if (!existing || existing.status === 'A') {
    // Present/Tardy/ED and no previous entry or was absent - create base points
    await createBasePoints(placement_id, date, period);
    pointsCreated = true;
  }
  // If changing between P/T/ED, points already exist - no action needed

  // 7. Audit log
  await logAttendanceAuditEvent(...)

  // 8. Revalidate paths
  revalidatePath('/daep/rooms');

  return { success: true, entry, pointsCreated, pointsRemoved };
}
```

---

## UI Components

### New Components in `components/daep/roster/`

#### 1. `AttendanceCell.tsx`

```tsx
interface AttendanceCellProps {
  placementId: string;
  date: string;
  period: string;
  currentStatus: AttendanceStatus | null;
  onStatusChange: (status: AttendanceStatus, time?: string) => Promise<void>;
}

/**
 * Clickable attendance status badge.
 * - Click cycles through statuses
 * - T and ED open time modal
 * - Shows time indicator for T/ED
 */
export function AttendanceCell({ ... }: AttendanceCellProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'T' | 'ED' | null>(null);

  const handleClick = async () => {
    const nextStatus = getNextStatus(currentStatus);

    if (nextStatus === 'T' || nextStatus === 'ED') {
      // Need time input - show modal
      setPendingStatus(nextStatus);
      setShowTimeModal(true);
    } else {
      // Direct save
      setIsLoading(true);
      await onStatusChange(nextStatus);
      setIsLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleClick} disabled={isLoading}>
        <StatusBadge status={currentStatus || 'P'} />
        {(currentStatus === 'T' || currentStatus === 'ED') && (
          <TimeIndicator status={currentStatus} />
        )}
      </button>

      <AttendanceTimeModal
        open={showTimeModal}
        status={pendingStatus}
        onSave={async (time) => {
          await onStatusChange(pendingStatus!, time);
          setShowTimeModal(false);
        }}
        onCancel={() => setShowTimeModal(false)}
      />
    </>
  );
}
```

#### 2. `StatusBadge.tsx`

```tsx
interface StatusBadgeProps {
  status: AttendanceStatus;
  size?: 'sm' | 'md';
}

const statusConfig = {
  P: { label: 'P', color: 'bg-green-100 text-green-800', title: 'Present' },
  A: { label: 'A', color: 'bg-red-100 text-red-800', title: 'Absent' },
  T: { label: 'T', color: 'bg-yellow-100 text-yellow-800', title: 'Tardy' },
  ED: { label: 'ED', color: 'bg-orange-100 text-orange-800', title: 'Early Dismissal' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-medium',
        config.color,
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'
      )}
      title={config.title}
    >
      {config.label}
    </span>
  );
}
```

#### 3. `AttendanceTimeModal.tsx`

```tsx
interface AttendanceTimeModalProps {
  open: boolean;
  status: 'T' | 'ED' | null;
  onSave: (time: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Modal for entering tardy or early dismissal time.
 * Simple time input with save/cancel.
 */
export function AttendanceTimeModal({ open, status, onSave, onCancel }: AttendanceTimeModalProps) {
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = status === 'T' ? 'Enter Tardy Time' : 'Enter Early Dismissal Time';
  const placeholder = status === 'T' ? 'Time arrived' : 'Time dismissed';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!time) return;

    setIsSubmitting(true);
    await onSave(time);
    setIsSubmitting(false);
    setTime('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder={placeholder}
            required
            autoFocus
          />
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!time || isSubmitting}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Modify Existing Components

#### `RoomRosterTable.tsx` - Add Attendance Column

```tsx
// Add to column definitions
const columns = [
  // ... existing columns ...
  {
    id: 'attendance',
    header: 'Attendance',
    cell: ({ row }) => (
      <AttendanceCell
        placementId={row.placement_id}
        date={date}
        period={period?.period_name || ''}
        currentStatus={row.attendance_status as AttendanceStatus | null}
        onStatusChange={async (status, time) => {
          await handleAttendanceChange(row.placement_id, status, time);
        }}
      />
    ),
  },
];
```

#### `RoomRosterContext.tsx` - Add Attendance State

```tsx
interface RoomRosterContextValue {
  // ... existing ...
  attendanceMap: Map<string, AttendanceEntry>;
  updateAttendance: (placementId: string, entry: AttendanceEntry) => void;
}
```

---

## Validation Schema

### Add to `lib/validation/schemas.ts`

```typescript
// Attendance status enum
export const AttendanceStatusEnum = z.enum(['P', 'A', 'T', 'ED']);
export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>;

// Mark attendance input
export const MarkAttendanceSchema = z.object({
  placement_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  period: z.string().min(1, 'Period is required'),
  status: AttendanceStatusEnum,
  tardy_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM').optional(),
  early_dismiss_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM').optional(),
}).refine(
  (data) => {
    if (data.status === 'T' && !data.tardy_time) return false;
    if (data.status === 'ED' && !data.early_dismiss_time) return false;
    return true;
  },
  { message: 'Time is required for Tardy and Early Dismissal' }
);
```

---

## Implementation Order

### Phase 1: Server Actions (Do First)

1. **Create `app/actions/daep/attendance.ts`**
   - `markAttendance()` with points integration
   - `getRoomAttendance()` for roster view
   - `bulkMarkAttendance()` for bulk actions
   - Audit logging

2. **Add validation schema** to `lib/validation/schemas.ts`

### Phase 2: UI Components

3. **Create attendance components** in `components/daep/roster/`
   - `StatusBadge.tsx` - status display
   - `AttendanceTimeModal.tsx` - time input
   - `AttendanceCell.tsx` - main interactive cell

4. **Update `RoomRosterTable.tsx`**
   - Add attendance column
   - Wire up handlers

### Phase 3: Integration

5. **Update `RoomRosterContext.tsx`**
   - Add attendance state
   - Add optimistic update helpers

6. **Update `getRoomRoster()` in roster.ts**
   - Already queries attendance - verify it returns status correctly

### Phase 4: Polish

7. **Add keyboard shortcuts**
   - Arrow keys to navigate cells
   - P/A/T/E keys for direct status entry

8. **Add "Mark All Present" button**
   - Bulk action in toolbar

---

## Edge Cases

### 1. Changing Status with Existing Points

| From | To | Points Action |
|------|-----|---------------|
| null/no entry | P/T/ED | Create base points |
| null/no entry | A | No points created |
| P | A | Remove base points |
| P | T/ED | No change (points exist) |
| A | P/T/ED | Create base points |
| T | P/ED | No change (points exist) |
| T | A | Remove base points |
| ED | P/T | No change (points exist) |
| ED | A | Remove base points |

### 2. Time Validation

- Tardy time must be within the period's time range
- Early dismissal time must be within the period's time range
- **Decision:** For MVP, accept any valid time format. Validation against period times can be a future enhancement.

### 3. Non-School Days

- If date is marked as non-school day in calendar, show warning
- Still allow attendance entry (staff may need to correct data)

### 4. Period Not Found

- If selected period doesn't exist in bell schedule, show error
- Prevent attendance entry until valid period selected

---

## Audit Trail

All attendance actions logged to `admin_audit_log`:

| Event Type | Description |
|------------|-------------|
| `attendance.marked` | Initial attendance entry |
| `attendance.changed` | Status changed (includes before/after) |
| `attendance.time_updated` | Tardy/ED time modified |
| `attendance.bulk_marked` | Bulk attendance action |

Details include:
- `placement_id`, `school_id`, `student_name`
- `date`, `period`
- `before_status`, `after_status`
- `tardy_time`, `early_dismiss_time`
- `entered_by`, `entered_by_name`
- `points_created`, `points_removed`

---

## Testing Checklist

### Attendance Cell (Dropdown)
- [ ] Click `--` badge opens dropdown with P, A, T, ED options
- [ ] Select P from dropdown saves and shows P badge
- [ ] Select A from dropdown saves and shows A badge
- [ ] Select T from dropdown opens time modal
- [ ] Select ED from dropdown opens time modal
- [ ] Time modal requires valid HH:MM format
- [ ] Cancel in time modal closes without saving
- [ ] Save in time modal updates status with time

### Points Integration
- [ ] Present creates base points (10)
- [ ] Absent removes base points
- [ ] Tardy creates base points (10)
- [ ] Early Dismissal creates base points (10)
- [ ] Changing P → A removes points
- [ ] Changing A → P creates points

### Data Persistence
- [ ] Status persists on page reload
- [ ] Status shows correctly for different periods
- [ ] Status shows correctly for different dates
- [ ] Audit log records all changes with before/after

### Bulk Actions
- [ ] "Mark All Present" bulk action works
- [ ] Bulk action creates base points for all students
- [ ] Can select subset and apply bulk action

### Room Cards Indicator
- [ ] Room card shows indicator when ALL students have attendance
- [ ] Indicator updates after bulk "Mark All Present"
- [ ] Different rooms can show different indicator status

### UX
- [ ] Optimistic update works (instant UI feedback)
- [ ] Error toast shows on save failure
- [ ] iPad: dropdown is easy to tap
- [ ] Column order: Name → Grade → Status → Attendance → Days → Points → Adjust

---

## Files to Create/Modify

### New Files
```
app/actions/daep/attendance.ts                      # Server actions
app/actions/daep/attendance-settings.ts             # Settings CRUD
components/daep/roster/AttendanceCell.tsx           # Dropdown + badge cell
components/daep/roster/StatusBadge.tsx              # Status display badge
components/daep/roster/AttendanceTimeModal.tsx      # Time input modal
components/daep/roster/AttendanceTakenIndicator.tsx # Room card indicator
components/daep/roster/AttendanceSummaryBanner.tsx  # Summary banner component
app/daep/(main)/settings/attendance/page.tsx        # Attendance settings tab
supabase/migrations/xxx_add_attendance_status_types.sql # New table + seed data
```

### Modified Files
```
lib/validation/schemas.ts                   # Add attendance schemas
components/daep/roster/RoomRosterTable.tsx  # Add attendance column (reorder columns)
components/daep/roster/RoomRosterContext.tsx # Add attendance state
components/daep/roster/RoomCard.tsx         # Add attendance taken indicator + summary
app/daep/(main)/rooms/page.tsx              # Fetch attendance status for room cards
app/daep/(main)/settings/layout.tsx         # Add "Attendance" tab to settings nav
lib/validation/schemas.ts                   # Add BellSchedulePeriod requires_attendance/grants_points
```

---

## Patterns to Reuse

| Pattern | Source File | Usage |
|---------|-------------|-------|
| Server action structure | `app/actions/daep/points.ts` | `checkDAEPStaffRole()`, audit logging |
| Optimistic updates | `components/daep/roster/PointEntryCell.tsx` | Instant UI feedback |
| Badge styling | `components/daep/roster/DaysRemainingBadge.tsx` | Color-coded badges |
| Modal pattern | `components/daep/roster/PointAdjustmentModal.tsx` | Dialog structure |
| Bulk actions | `app/actions/daep/points.ts` | `bulkAddPoints()` pattern |

---

## Quick Wins

### Included in Story (User Requirements)
| Quick Win | Effort | Value |
|-----------|--------|-------|
| "Attendance taken" indicator on room cards | Low | High - Staff instantly sees which rooms need attention |
| Default `--` display (not P) | Low | High - Clear visual that attendance hasn't been taken yet |
| Bulk "Mark All Present" action | Low | High - Primary workflow, leverages existing bulk UI |

### Additional Quick Wins (New Ideas - Approved)
| Quick Win | Effort | Value | 3-Clicks-or-Less Impact |
|-----------|--------|-------|-------------------------|
| **Copy from previous period** | Low | Very High | "Period 2: Copy from Period 1?" - One click to populate, adjust exceptions only |
| **Auto-advance row** | Low | High | After marking student, cursor moves to next row (Excel-style data entry) |
| **Attendance summary banner** | Low | High | Show on BOTH room roster AND room cards. Cards show per-room count, Dashboard shows all-rooms total |

### Already Implemented (Story 3-7)
| Feature | Status | Notes |
|---------|--------|-------|
| **Streak indicator** | ✓ Exists | `consecutive_perfect_days` milestone type in milestones.ts |

### Not Needed
| Quick Win | Reason |
|-----------|--------|
| Period navigation arrows | Bell schedule dropdown already auto-switches by time; dropdown sufficient for manual navigation |

---

## Settings Enhancements (Include in Story)

### Bell Schedule Period Types

**Requirement:** Not all periods require attendance. Need to distinguish class periods from transitions/breaks.

**Add to Bell Schedule Period Configuration:**
```typescript
interface BellSchedulePeriod {
  period_name: string;
  start_time: string;
  end_time: string;
  requires_attendance: boolean;  // NEW - Should staff take attendance?
  grants_points: boolean;        // NEW - Does this period grant base points?
}
```

**Examples:**

| Period | requires_attendance | grants_points |
|--------|---------------------|---------------|
| Period 1 | ✓ true | ✓ true |
| Period 2 | ✓ true | ✓ true |
| Restroom | false | ✓ true |
| Lunch | false | ✓ true |
| Period 3 | ✓ true | ✓ true |

**Impact:**
- Room card attendance indicator only checks periods where `requires_attendance = true`
- Period selector in roster only shows attendance periods (filter option)
- Points system checks `grants_points` for base point eligibility

**UI Change:** Add checkboxes to bell schedule period editor (Story 1-6 page).

### Configurable Attendance Status Types

**User Request:** Allow DAEP admin to define attendance status types and their point values.

**Default Status Types:**

| Status Code | Label | Points Awarded | Configurable |
|-------------|-------|----------------|--------------|
| P | Present | Full (10) | Yes |
| A | Absent | None (0) | Yes |
| T | Tardy | Full (10) | Yes |
| ED | Early Dismissal | Full (10) | Yes |
| FT | Field Trip | Full (10) | Yes (new) |

**Points Options per Status:**
- Full points (10)
- Partial points (5)
- No points (0)

**Location:** `/daep/settings` → New "Attendance" tab

**UI Design:**
```
Attendance Settings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status Types                    Points Awarded
┌─────────────────────────────┬──────────────┐
│ P - Present                 │ [Full ▼]     │
│ A - Absent                  │ [None ▼]     │
│ T - Tardy                   │ [Full ▼]     │
│ ED - Early Dismissal        │ [Full ▼]     │
│ FT - Field Trip             │ [Full ▼]     │
└─────────────────────────────┴──────────────┘
                              [+ Add Status Type]
```

**Database:** Add `daep_attendance_status_types` table:
```sql
CREATE TABLE daep_attendance_status_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  status_code TEXT NOT NULL,       -- 'P', 'A', 'T', 'ED', 'FT', etc.
  label TEXT NOT NULL,             -- 'Present', 'Absent', etc.
  points_type TEXT NOT NULL,       -- 'full', 'partial', 'none'
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false, -- System defaults can't be deleted
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, status_code)
);

-- Seed default types on tenant creation
```

**Effort:** Medium (~1-2 hours) - new table + settings UI + seed data

---

## Backlog Items (Future Stories)

### Student Attendance Dispute Workflow

**User Request:** Students need a way to flag when Focus (SIS) attendance is incorrect.

**Story Candidate:**
> **As a** DAEP student
> **I want** to flag when my attendance record is incorrect
> **So that** discrepancies with Focus can be resolved

**Workflow:**
1. Student views attendance history on their portal
2. Sees date/period where Focus says Absent but they were Present
3. Clicks "Report Issue" button on that entry
4. Creates pending task for Registrar/Attendance Clerk
5. Registrar sees in dashboard → "Pending Attendance Disputes"
6. Reviews → Resolves (Accept/Reject with reason)
7. Student + Parent notified when resolved

**Components Needed:**
- Student portal attendance view (read-only history)
- "Report Issue" button per attendance entry
- `daep_attendance_disputes` table
- Registrar dashboard widget
- Resolution workflow
- Notification integration (Epic 7)

**Epic:** Could be part of Epic 7 (Notifications) or new Student Portal epic

**Priority:** Backlog - capture as draft story

---

## Integration with Story 3-10

Story 3-10 (Excused vs Unexcused Absences) will extend this implementation:

1. Add "Excused?" prompt when marking Absent
2. Add `excuse_reason` dropdown (Court, Medical, School Event, Other)
3. Update `counts_toward_days_served` based on excused status
4. Visual indicator in StatusBadge for excused (E) vs unexcused (U) absences

**Design for extensibility:** The `AttendanceCell` component should accept optional props for the excused workflow that Story 3-10 can provide.

---

## Success Metrics

After Story 3-9 is complete:
- Staff can mark attendance for any student in the roster
- Quick-tap cycling enables fast entry across many students
- Tardy and Early Dismissal times are captured
- Base points are automatically granted/removed based on attendance
- All actions are audited
- UI provides immediate feedback (optimistic updates)

---

_Tech Spec Version: 1.0_
_Created: 2025-12-07_
_Story: 3-9 Attendance Entry_
_Author: Claude (AI Assistant)_
