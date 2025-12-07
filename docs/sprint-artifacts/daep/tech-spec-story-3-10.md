# Tech Spec: Story 3-10 - Excused vs Unexcused Absences

**Story:** 3-10
**Epic:** 3 - Daily Operations
**Points:** 3 (revised from 2)
**FR:** FR42

---

## Overview

Extend the attendance system to handle the two-phase absence workflow:

1. **Phase 1 (Classroom):** Staff marks student Absent → defaults to Unexcused, no modal
2. **Phase 2 (Office):** Admin L1/L2 reviews with documentation → can mark Excused with reason and points eligibility

This separation reflects real workflow: teachers don't have documentation in the moment; attendance clerks/registrars process it the next day.

---

## Two Concepts for Absences

| Concept | Purpose | Who Decides |
|---------|---------|-------------|
| **Excused vs Unexcused** | Truancy tracking | Admin L1/L2 with documentation |
| **Counts toward points/days** | DAEP progress | Based on reason type (Court/Gov't = yes) |

### Business Rules

| Absence Type | Excused? | Counts Toward Points? | Badge |
|--------------|----------|----------------------|-------|
| Court/Legal | Yes | **Yes** | E (green) |
| Parole/Probation Officer | Yes | **Yes** | E (green) |
| Driver's License (DPS) | Yes | **Yes** | E (green) |
| State/Federal Government | Yes | **Yes** | E (green) |
| Medical (with note) | Yes | No | E (red) |
| Parent Call (1-6/semester) | Yes | No | E (red) |
| Parent Call (7+/semester) | **No** | No | U (red) |
| No-show/No call | No | No | U (red) |
| Staff-marked (pending review) | Pending | No | A (amber) |

---

## Role-Based UI Flow

### DAEP Staff (Classroom)

```
Staff clicks A in dropdown
         ↓
Saves immediately as:
  - status: 'A'
  - excused: null (pending review)
  - counts_toward_days_served: false
         ↓
Badge shows: A (amber) - pending review
```

No modal. Quick entry. Done.

### DAEP Admin L1/L2 (Office - Next Day)

```
Admin clicks A in dropdown (or edits existing A)
         ↓
┌─────────────────────────────────────────┐
│  Absence Status                         │
│                                         │
│  ○ Unexcused                            │
│  ○ Excused                              │
│                                         │
│  [If Excused selected:]                 │
│  ┌─────────────────────────────────┐    │
│  │ Reason: [Court/Legal        ▼] │    │
│  │                                 │    │
│  │ ☑ Counts toward points/days    │    │
│  │   (auto-checked for Gov't)     │    │
│  │                                 │    │
│  │ Notes: [___________________]   │    │
│  │                                 │    │
│  │ 📎 Attach Documentation        │    │
│  │    (drag & drop or browse)     │    │
│  └─────────────────────────────────┘    │
│                                         │
│              [Save]  [Cancel]           │
└─────────────────────────────────────────┘
```

---

## Current State

### Database Schema (Already Exists)

The `daep_attendance` table has the required columns:

```sql
excused BOOLEAN DEFAULT FALSE,
excuse_reason TEXT,
counts_toward_days_served BOOLEAN DEFAULT TRUE
```

### Additional Column Needed

```sql
-- Track parent call count per semester
-- Actually stored in a separate query, no new column needed
```

---

## Implementation Plan

### 1. Schema Updates

**File:** `lib/validation/schemas.ts`

```typescript
// Excuse reason categories
export const ExcuseReasonEnum = z.enum([
  'court_legal',
  'parole_probation',
  'drivers_license_dps',
  'state_federal_gov',
  'medical',
  'parent_call',
  'other'
]);

export type ExcuseReason = z.infer<typeof ExcuseReasonEnum>;

// Reasons that auto-check "counts toward points"
export const POINTS_ELIGIBLE_REASONS: ExcuseReason[] = [
  'court_legal',
  'parole_probation',
  'drivers_license_dps',
  'state_federal_gov',
];

// Update MarkAttendanceSchema
export const MarkAttendanceSchema = z.object({
  placement_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period: z.string().min(1),
  status: AttendanceStatusEnum,
  tardy_time: z.string().optional().nullable(),
  early_dismiss_time: z.string().optional().nullable(),
  // Excuse fields (only for Admin L1/L2)
  excused: z.boolean().optional().nullable(), // null = pending review
  excuse_reason: ExcuseReasonEnum.optional().nullable(),
  excuse_notes: z.string().optional().nullable(),
  counts_toward_days_served: z.boolean().optional().default(false),
});
```

### 2. Server Action Updates

**File:** `app/actions/daep/attendance.ts`

```typescript
// Update markAttendance to be role-aware
export async function markAttendance(
  input: MarkAttendanceInput
): Promise<MarkAttendanceResult> {
  const { userId, role, tenantId, displayName } = await checkDAEPStaffRole();

  const isAdmin = ['super_admin', 'district_admin', 'daep_admin_l1', 'daep_admin_l2'].includes(role);

  // For non-admin staff marking Absent:
  // - excused = null (pending review)
  // - counts_toward_days_served = false
  // - No modal shown on frontend

  if (status === 'A' && !isAdmin) {
    attendanceData.excused = null; // Pending review
    attendanceData.counts_toward_days_served = false;
  }

  // For admin:
  // - Use provided values from modal
  // - Auto-set counts_toward_days_served based on reason if not specified
  if (status === 'A' && isAdmin) {
    const countsToward = POINTS_ELIGIBLE_REASONS.includes(excuse_reason)
      ? true
      : (input.counts_toward_days_served ?? false);

    attendanceData.excused = input.excused ?? false;
    attendanceData.excuse_reason = input.excused ? input.excuse_reason : null;
    attendanceData.counts_toward_days_served = countsToward;
  }

  // Points logic:
  // Only create points if counts_toward_days_served = true
  if (attendanceData.counts_toward_days_served) {
    await createBasePoints(placement_id, date, period);
  } else {
    await removeBasePoints(placement_id, date, period);
  }
}

// Add helper to get parent call count for semester
export async function getParentCallCount(
  placementId: string,
  semesterStartDate: string
): Promise<number> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const { count } = await supabase
    .from('daep_attendance')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .eq('excuse_reason', 'parent_call')
    .gte('date', semesterStartDate);

  return count || 0;
}
```

### 3. UI Components

#### 3.1 ExcuseModal (Admin Only)

**File:** `components/daep/roster/ExcuseModal.tsx`

```typescript
interface ExcuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExcuseData) => void;
  studentName: string;
  currentData?: {
    excused: boolean | null;
    excuse_reason: string | null;
    counts_toward_days_served: boolean;
  };
  parentCallCount?: number; // For showing "Call X of 6"
}

interface ExcuseData {
  excused: boolean;
  excuse_reason?: string;
  excuse_notes?: string;
  counts_toward_days_served: boolean;
}
```

Features:
- Radio buttons: Unexcused / Excused
- Reason dropdown (shown when Excused selected)
- Auto-check "Counts toward points" for Court/Gov't reasons
- Show "Parent Call (3 of 6 this semester)" when parent_call selected
- Notes text area
- Document upload placeholder (backlog)

#### 3.2 Update AttendanceCell

**File:** `components/daep/roster/AttendanceCell.tsx`

```typescript
// Add role check
const { role } = useUser(); // or pass from context
const isAdmin = ['super_admin', 'district_admin', 'daep_admin_l1', 'daep_admin_l2'].includes(role);

// When selecting 'A':
if (status === 'A') {
  if (isAdmin) {
    // Open ExcuseModal
    setShowExcuseModal(true);
  } else {
    // Save directly as pending unexcused
    await markAttendance({
      ...baseData,
      status: 'A',
      excused: null,
      counts_toward_days_served: false,
    });
  }
}
```

#### 3.3 Update AttendanceStatusBadge

**File:** `components/daep/roster/AttendanceStatusBadge.tsx`

```typescript
// Badge logic for Absent status:
if (status === 'A') {
  if (excused === null) {
    // Pending review (staff-marked)
    return <Badge variant="warning">A</Badge>; // Amber
  } else if (excused === true) {
    if (counts_toward_days_served) {
      // Excused + points (Court/Gov't)
      return <Badge variant="success">E</Badge>; // Green
    } else {
      // Excused but no points (Medical/Parent)
      return <Badge variant="destructive">E</Badge>; // Red
    }
  } else {
    // Confirmed unexcused
    return <Badge variant="destructive">U</Badge>; // Red
  }
}
```

### 4. Excuse Reason Labels

```typescript
export const EXCUSE_REASON_LABELS: Record<string, string> = {
  court_legal: 'Court/Legal Appearance',
  parole_probation: 'Parole/Probation Officer',
  drivers_license_dps: "Driver's License (DPS)",
  state_federal_gov: 'State/Federal Government',
  medical: 'Medical (with documentation)',
  parent_call: 'Parent Call',
  other: 'Other',
};

export const EXCUSE_REASON_ORDER = [
  'court_legal',
  'parole_probation',
  'drivers_license_dps',
  'state_federal_gov',
  'medical',
  'parent_call',
  'other',
];
```

---

## Quick Wins

| Quick Win | Implementation |
|-----------|----------------|
| Auto-select based on reason | Court/Gov't reasons auto-check "counts toward points" |
| Parent call counter | Show "Call 3 of 6 this semester" in modal |
| Reason presets | Gov't reasons at top of dropdown (most common for DAEP) |
| Role-based simplicity | Staff gets one-click absent, admin gets full modal |

---

## Acceptance Criteria (Updated)

| AC | Description | Test |
|----|-------------|------|
| 3.10.1 | Staff marking Absent saves immediately as pending (no modal) | Staff clicks A, verify saves with excused=null |
| 3.10.2 | Admin marking Absent opens ExcuseModal | Admin clicks A, verify modal appears |
| 3.10.3 | Modal has Excused/Unexcused radio buttons | Check modal UI |
| 3.10.4 | Excused shows reason dropdown with all options | Select Excused, verify dropdown |
| 3.10.5 | Court/Gov't reasons auto-check "counts toward points" | Select Court, verify checkbox auto-checked |
| 3.10.6 | Medical/Parent reasons don't auto-check points | Select Medical, verify unchecked |
| 3.10.7 | Parent call shows "X of 6 this semester" | Select Parent Call, verify counter |
| 3.10.8 | Badge: A (amber) for pending review | Staff marks A, check badge |
| 3.10.9 | Badge: E (green) for excused + points | Admin marks Court, check badge |
| 3.10.10 | Badge: E (red) for excused, no points | Admin marks Medical, check badge |
| 3.10.11 | Badge: U (red) for confirmed unexcused | Admin marks Unexcused, check badge |
| 3.10.12 | Points created only when counts_toward_days_served=true | Verify points logic |

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `lib/validation/schemas.ts` | Modify | Add ExcuseReasonEnum, POINTS_ELIGIBLE_REASONS |
| `app/actions/daep/attendance.ts` | Modify | Role-aware marking, getParentCallCount() |
| `components/daep/roster/ExcuseModal.tsx` | Create | Full excuse modal for admins |
| `components/daep/roster/AttendanceCell.tsx` | Modify | Role-based behavior |
| `components/daep/roster/AttendanceStatusBadge.tsx` | Modify | A/E/U badge with colors |
| `components/daep/roster/index.ts` | Modify | Export ExcuseModal |

---

## Backlog Items (Out of Scope)

| Item | Description |
|------|-------------|
| Document upload | Drag & drop or browse to attach court docs, medical notes |
| Semester reset | Auto-reset parent call count at semester start |
| Bulk excuse marking | Mark multiple students excused at once |

---

## Testing Plan

1. **TypeScript compilation passes**
2. **Staff workflow:**
   - Staff marks A → saves immediately, no modal
   - Badge shows amber A (pending)
   - No points created
3. **Admin workflow:**
   - Admin marks A → modal opens
   - Select Unexcused → saves, red U badge
   - Select Excused + Court → auto-checks points, green E badge, points created
   - Select Excused + Medical → unchecked points, red E badge, no points
4. **Parent call counter:**
   - Select Parent Call → shows "X of 6 this semester"
5. **Editing existing:**
   - Admin edits staff-marked A → can add excuse
   - Badge updates correctly
6. **Playwright MCP verification**

---

## Dependencies

- Story 3-9 (Attendance Entry) - **DONE**
- `daep_attendance` table with excused columns - **EXISTS**
- User role available in roster context

---

## References

- **Story 3-9:** `docs/sprint-artifacts/daep/story-3-9.md`
- **PRD:** FR42 - "System distinguishes between excused and unexcused absences"
- **Architecture:** `docs/reference/architecture-part2.md`

---

_Tech Spec Version: 2.0_
_Created: 2025-12-07_
_Updated: 2025-12-07 - Role-based workflow, two-phase process_
_Author: Claude (AI Assistant)_
