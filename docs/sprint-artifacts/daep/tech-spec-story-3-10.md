# Tech Spec: Story 3-10 - Excused vs Unexcused Absences

**Story:** 3-10
**Epic:** 3 - Daily Operations
**Points:** 2
**FR:** FR42

---

## Overview

Extend the attendance system to distinguish between excused and unexcused absences. When staff marks a student Absent, they'll be prompted to specify whether the absence is excused and, if so, select a reason. This affects:
- **Days Served:** Excused absences count toward days served; unexcused do not
- **Points:** Excused absences can earn points; unexcused cannot
- **Visual Display:** Grid shows E (green) vs U (red) indicator

---

## Current State

### Database Schema (Already Exists)

The `daep_attendance` table already has the required columns from Story 3-9:

```sql
excused BOOLEAN DEFAULT FALSE,
excuse_reason TEXT,
counts_toward_days_served BOOLEAN DEFAULT TRUE
```

### Current UI Flow

1. User clicks attendance cell → dropdown shows P/A/T/ED
2. Selecting A marks absent with `excused = false`
3. No prompt for excuse status

---

## Target State

### New UI Flow

1. User clicks attendance cell → dropdown shows P/A/T/ED
2. User selects **A (Absent)**
3. **ExcusePromptModal** opens:
   - "Is this absence excused?"
   - **Yes** button → shows excuse_reason dropdown:
     - Court
     - Medical
     - School Event
     - Other (with text input)
   - **No** button → marks as unexcused
4. Attendance saved with excused flag and reason
5. Grid shows visual indicator: **E** (excused) or **U** (unexcused)

### Business Rules

| Scenario | counts_toward_days_served | Points Earned |
|----------|---------------------------|---------------|
| Present (P) | true | Full points |
| Tardy (T) | true | Partial/Full (configurable) |
| Early Dismiss (ED) | true | Partial/Full (configurable) |
| Absent - Excused | **true** | **Full points possible** |
| Absent - Unexcused | **false** | **No points** |

### Half-Day Scenarios

Period-level granularity allows:
- AM excused + PM unexcused (or vice versa)
- Each period tracked independently
- Example: Court appearance in morning, unexcused afternoon = morning counts, afternoon doesn't

---

## Implementation Plan

### 1. Schema Updates

**None required** - columns already exist in `daep_attendance`:
- `excused: boolean`
- `excuse_reason: text`
- `counts_toward_days_served: boolean`

### 2. Validation Schema Updates

**File:** `lib/validation/schemas.ts`

```typescript
// Add excuse reasons enum
export const ExcuseReasonEnum = z.enum([
  'court',
  'medical',
  'school_event',
  'other'
]);

export type ExcuseReason = z.infer<typeof ExcuseReasonEnum>;

// Update MarkAttendanceSchema
export const MarkAttendanceSchema = z.object({
  placement_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period: z.string().min(1),
  status: AttendanceStatusEnum,
  tardy_time: z.string().optional().nullable(),
  early_dismiss_time: z.string().optional().nullable(),
  // NEW fields for excused absences
  excused: z.boolean().optional().default(false),
  excuse_reason: ExcuseReasonEnum.optional().nullable(),
  excuse_notes: z.string().optional().nullable(), // For "Other" reason
});
```

### 3. Server Action Updates

**File:** `app/actions/daep/attendance.ts`

Update `markAttendance()`:

```typescript
export async function markAttendance(
  input: MarkAttendanceInput
): Promise<MarkAttendanceResult> {
  // ... existing validation ...

  const {
    placement_id, date, period, status,
    tardy_time, early_dismiss_time,
    excused, excuse_reason, excuse_notes  // NEW
  } = validation.data;

  // Determine counts_toward_days_served based on excused status
  const countsTowardDaysServed = status !== 'A' || excused === true;

  const attendanceData = {
    tenant_id: tenantId,
    placement_id,
    date,
    period,
    status,
    tardy_time: status === 'T' ? tardy_time : null,
    early_dismiss_time: status === 'ED' ? early_dismiss_time : null,
    // NEW: Excuse fields
    excused: status === 'A' ? (excused ?? false) : null,
    excuse_reason: status === 'A' && excused ? excuse_reason : null,
    counts_toward_days_served: countsTowardDaysServed,
    notes: excuse_notes || null,
    entered_by: userId,
  };

  // ... rest of function ...

  // Points logic update:
  // - Absent + Unexcused = no points
  // - Absent + Excused = full points (student should not be penalized)
  const isUnexcusedAbsent = status === 'A' && !excused;

  if (isUnexcusedAbsent && !wasUnexcusedAbsent) {
    await removeBasePoints(placement_id, date, period);
    pointsRemoved = true;
  } else if (!isUnexcusedAbsent && (wasUnexcusedAbsent || !previousStatus)) {
    if (pointsValue > 0) {
      await createBasePoints(placement_id, date, period);
      pointsCreated = true;
    }
  }
}
```

### 4. UI Components

#### 4.1 ExcusePromptModal

**File:** `components/daep/roster/ExcusePromptModal.tsx`

```typescript
interface ExcusePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (excused: boolean, reason?: string, notes?: string) => void;
  studentName: string;
}

// Modal content:
// - Question: "Is [Student Name]'s absence excused?"
// - Two buttons: "Yes, Excused" / "No, Unexcused"
// - If Yes: Show excuse_reason dropdown
// - If Other selected: Show text input for notes
// - Confirm button saves and closes
```

#### 4.2 Update AttendanceCell

**File:** `components/daep/roster/AttendanceCell.tsx`

When user selects 'A':
1. Don't immediately save
2. Open ExcusePromptModal
3. On confirm → call markAttendance with excuse data
4. On cancel → revert selection

#### 4.3 Update AttendanceStatusBadge

**File:** `components/daep/roster/AttendanceStatusBadge.tsx`

Update to show E/U indicator for absences:

```typescript
// When status is 'A':
// - If excused === true: Show "A" with green "E" subscript
// - If excused === false: Show "A" with red "U" subscript
// Example: "A(E)" in amber/green, "A(U)" in red
```

#### 4.4 Excuse Reason Labels

```typescript
const EXCUSE_REASON_LABELS: Record<string, string> = {
  court: 'Court Appearance',
  medical: 'Medical',
  school_event: 'School Event',
  other: 'Other',
};
```

### 5. Database Query Updates

No migration needed. Existing columns:
- `excused` - already exists, default false
- `excuse_reason` - already exists, nullable text
- `counts_toward_days_served` - already exists, default true

### 6. Audit Trail Updates

Update audit log details to include excuse information:

```typescript
details: {
  date,
  period,
  before_status: previousStatus,
  after_status: status,
  excused: status === 'A' ? excused : null,
  excuse_reason: excused ? excuse_reason : null,
  counts_toward_days_served: countsTowardDaysServed,
  // ... existing fields
}
```

---

## Acceptance Criteria Mapping

| AC | Implementation |
|----|----------------|
| 3.10.1 | ExcusePromptModal opens when marking Absent |
| 3.10.2 | Excuse reason dropdown with Court/Medical/School Event/Other |
| 3.10.3 | Excused absences: `counts_toward_days_served = true`, points earned |
| 3.10.4 | Unexcused absences: `counts_toward_days_served = false`, no points |
| 3.10.5 | Half-day: Period-level tracking (already supported) |
| 3.10.6 | Visual indicator E/U in attendance grid |

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `lib/validation/schemas.ts` | Modify | Add ExcuseReasonEnum, update MarkAttendanceSchema |
| `app/actions/daep/attendance.ts` | Modify | Handle excused field, update points logic |
| `components/daep/roster/ExcusePromptModal.tsx` | Create | Modal for excuse prompt |
| `components/daep/roster/AttendanceCell.tsx` | Modify | Open modal on Absent selection |
| `components/daep/roster/AttendanceStatusBadge.tsx` | Modify | Show E/U indicator |
| `components/daep/roster/index.ts` | Modify | Export new component |

---

## Out of Scope

- Bulk excused marking (mark multiple students excused at once)
- Attendance reports filtering by excuse type
- Excuse document upload/attachment
- Excuse approval workflow

---

## Testing Plan

1. **TypeScript compilation passes**
2. **Mark student absent:**
   - Modal appears with Yes/No buttons
   - Selecting Yes shows reason dropdown
   - Selecting No marks as unexcused
3. **Excused absence:**
   - Saves with `excused = true`
   - Saves with selected reason
   - `counts_toward_days_served = true`
   - Points are created
   - Shows "A(E)" badge in green/amber
4. **Unexcused absence:**
   - Saves with `excused = false`
   - `counts_toward_days_served = false`
   - No points created (or removed if changing from present)
   - Shows "A(U)" badge in red
5. **Half-day scenario:**
   - Period 1: Excused (Court)
   - Period 4: Unexcused
   - Verify each period tracked independently
6. **Audit trail:**
   - Check admin_audit_log includes excuse details
7. **Playwright MCP verification**

---

## Dependencies

- Story 3-9 (Attendance Entry) - **DONE**
- `daep_attendance` table with excused columns - **EXISTS**

---

## References

- **Epic:** `docs/reference/epics-part2.md` (Story 3.10 section)
- **Architecture:** `docs/reference/architecture-part2.md` (daep_attendance schema)
- **PRD:** FR42 - "System distinguishes between excused and unexcused absences"
- **Story 3-9:** `docs/sprint-artifacts/daep/story-3-9.md`

---

_Tech Spec Version: 1.0_
_Created: 2025-12-07_
_Author: Claude (AI Assistant)_
