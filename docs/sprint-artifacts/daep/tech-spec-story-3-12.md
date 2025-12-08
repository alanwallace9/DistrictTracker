# Tech Spec: Story 3-12 - Attendance Override with Audit

**Story:** 3-12
**Points:** 2
**FRs:** FR44
**Dependencies:** Story 3-9 (Attendance Entry), Story 3-10 (Excused/Unexcused)

---

## Overview

Enhance the existing attendance workflow to require an override reason when administrators edit existing attendance records. This maintains the simple "tap and done" UX while ensuring accountability for changes.

**Key Insight:** The existing attendance flow already works well. We're just adding a required reason when admins change existing records, not creating a separate workflow.

---

## Acceptance Criteria

| AC | Description | Validation |
|----|-------------|------------|
| 3.12.1 | Admin can edit any attendance record | Already works - just use dropdown |
| 3.12.2 | When admin changes existing record, prompt for reason | Reason modal appears |
| 3.12.3 | All changes logged to audit trail with before/after | Check `admin_audit_log` |
| 3.12.4 | Override reason visible in attendance history | Show in student profile |
| 3.12.5 | Only admins (L1/L2/District) can change other users' entries | Staff can only edit their own |
| 3.12.6 | Staff editing not restricted (future: teacher schedules) | No restrictions for now |

---

## Design Decisions

### 1. Simplified Flow (No Separate Override UI)

**Current flow (keep as-is):**
```
Staff/Admin clicks dropdown → selects status → saved
If Absent + Admin → ExcuseModal opens
```

**Enhanced flow:**
```
Admin changes EXISTING record → OverrideReasonModal opens → saves with reason
```

The only change is: **when an admin changes an existing attendance entry, show a quick reason prompt.**

### 2. Who Can Edit What

| Role | Can Edit | Notes |
|------|----------|-------|
| `daep_staff` | Own entries only | Future: restricted to assigned room/period |
| `daep_admin_l2` | Any entry | Reason required when editing others' entries |
| `daep_admin_l1` | Any entry | Reason required when editing others' entries |
| `district_admin` | Any entry | Reason required when editing others' entries |
| `super_admin` | Any entry | Reason required when editing others' entries |

**Future enhancement (out of scope):** Teacher schedules will restrict staff to only edit attendance for their assigned room/period.

### 3. When Override Reason is Required

| Scenario | Reason Required? |
|----------|-----------------|
| Initial entry (no existing record) | No |
| User editing their own entry | No |
| Admin editing someone else's entry | **Yes** |
| Admin changing status from what they set | No (it's their own) |

### 4. Override Reasons (Quick Selection)

| Reason | Label |
|--------|-------|
| `data_entry_error` | Data Entry Error |
| `late_documentation` | Late Documentation |
| `admin_correction` | Administrative Correction |
| `other` | Other (requires note) |

**Simplified from original spec** - removed rarely-used options.

---

## Database Changes

Add 4 columns to `daep_attendance`:

```sql
ALTER TABLE daep_attendance
ADD COLUMN IF NOT EXISTS override_reason TEXT,
ADD COLUMN IF NOT EXISTS override_notes TEXT,
ADD COLUMN IF NOT EXISTS overridden_by TEXT,
ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMPTZ;
```

---

## Implementation

### 1. New Component: `OverrideReasonModal.tsx`

**Simple modal - just reason + optional notes:**

```
┌─────────────────────────────────────────┐
│ Override Reason                     [X] │
├─────────────────────────────────────────┤
│ Why is this being changed?              │
│                                         │
│ ○ Data Entry Error                      │
│ ○ Late Documentation                    │
│ ○ Administrative Correction             │
│ ○ Other                                 │
│                                         │
│ Notes (required for Other)              │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Cancel]  [Continue]       │
└─────────────────────────────────────────┘
```

**Props:**
```typescript
interface OverrideReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: OverrideReason, notes?: string) => void;
}
```

### 2. Update `markAttendance()` Server Action

Add override parameters:

```typescript
export interface MarkAttendanceInput {
  // ... existing fields ...

  // Override fields (optional - only when editing existing)
  override_reason?: OverrideReason;
  override_notes?: string;
}
```

**Logic:**
1. If editing existing record AND user is admin AND entered_by !== current user:
   - Require override_reason
   - Save override metadata
   - Log detailed audit event

### 3. Update `AttendanceCell.tsx`

Add override flow:

```typescript
// When admin selects a different status on an existing entry
if (isAdmin && currentStatus && currentStatus !== selectedStatus) {
  // Check if this was entered by someone else
  const isEditingOthers = existingEnteredBy !== currentUserId;

  if (isEditingOthers) {
    // Open override reason modal
    setOverrideModalOpen(true);
    setPendingStatus(selectedStatus);
    return;
  }
}

// Continue with normal save...
```

### 4. Enhanced Audit Logging

When override fields are present:

```typescript
await logAttendanceAuditEvent(supabase, 'attendance.override', userId, placementId,
  `Override: ${before.status} → ${after.status}`,
  tenantId,
  {
    before: { status, excused, counts_toward_days_served, entered_by },
    after: { status, excused, counts_toward_days_served },
    override_reason,
    override_notes,
    original_entered_by: existingEntry.entered_by,
  }
);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `lib/validation/schemas.ts` | Add `OverrideReasonEnum`, `OVERRIDE_REASONS` |
| `app/actions/daep/attendance.ts` | Add override fields to `markAttendance()` |
| `components/daep/roster/OverrideReasonModal.tsx` | **NEW** - simple reason modal |
| `components/daep/roster/AttendanceCell.tsx` | Add override flow check |
| `components/daep/roster/index.ts` | Export new component |

---

## Implementation Order

1. **Schema updates** - Add override types (10 min)
2. **Migration** - Add columns to daep_attendance (5 min)
3. **Server action** - Update markAttendance with override support (20 min)
4. **OverrideReasonModal** - Simple modal component (20 min)
5. **AttendanceCell** - Integrate override flow (15 min)
6. **Testing** - Verify flows (20 min)

**Total: ~90 minutes**

---

## Future: Teacher Schedules (Out of Scope)

**Concept:** Restrict which staff can edit which room/period based on a schedule.

```
Settings → Staff Schedules
┌────────────────────────────────────────────┐
│ Teacher Schedule                           │
├────────────────────────────────────────────┤
│ Teacher: [Ms. Johnson     ▾]               │
│                                            │
│ Period 1: [Room 101  ▾]                    │
│ Period 2: [Room 102  ▾]                    │
│ Period 3: [Room 101  ▾]                    │
│ ...                                        │
└────────────────────────────────────────────┘
```

**Business rules:**
- Students stay in one room all day
- Teachers rotate between rooms each period
- Only the assigned teacher can mark attendance for that room/period
- Admins can edit any room

**Database:** New `daep_staff_schedules` table with teacher/room/period assignments.

**This will be a separate story in a future sprint.**

---

## Testing Checklist

- [ ] Staff can edit their own entries (no reason required)
- [ ] Admin editing staff's entry triggers reason modal
- [ ] Admin editing their own entry doesn't require reason
- [ ] "Other" reason requires notes
- [ ] Override metadata saved to daep_attendance
- [ ] Audit log contains before/after values
- [ ] Override reason visible in audit log
- [ ] TypeScript compilation passes

---

## References

- **UX Guidelines:** `docs/sessions/ux-design-specification.md`
- **Existing Code:** `components/daep/roster/AttendanceCell.tsx`
- **PRD FR44:** Admin can override attendance with audit

---

_Tech Spec Version: 2.0 (Simplified)_
_Created: 2025-12-07_
_Updated: 2025-12-07 - Simplified to enhance existing workflow_
