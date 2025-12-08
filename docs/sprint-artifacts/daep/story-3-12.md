# Story 3.12: Attendance Override with Audit

**Status:** drafted
**Epic:** 3 - Daily Operations
**Points:** 2
**FR:** FR44

---

## Story

As a **DAEP administrator**,
I want **to correct attendance records with full audit trail**,
So that **errors can be fixed while maintaining accountability**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Mistakes happen. A teacher marks the wrong student. Documentation arrives late. The solution isn't a separate "override" workflow - it's the same simple dropdown, with one quick question: "Why?" When an admin changes someone else's entry, they pick a reason from a short list. That's it. The system handles the rest - timestamps, before/after values, audit trail. Clean, simple, accountable.

**The outcome:** Same easy workflow. Built-in accountability. Auditors get what they need without slowing anyone down.

---

## Simplified Approach

**No separate override UI.** Just enhance the existing attendance dropdown:

| Who | What Happens |
|-----|--------------|
| Staff edits their own entry | Saves normally (no reason needed) |
| Admin edits their own entry | Saves normally (no reason needed) |
| Admin edits someone else's entry | Quick reason modal → then saves |

**Future (out of scope):** Teacher schedules will restrict staff to only edit their assigned room/period.

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 3.12.1 | Admin can edit any attendance record | Use existing dropdown |
| 3.12.2 | When admin changes someone else's entry, prompt for reason | Reason modal appears |
| 3.12.3 | All changes logged to audit trail with before/after | Check `admin_audit_log` |
| 3.12.4 | Override reason saved to attendance record | Check `override_reason` column |
| 3.12.5 | Staff can edit their own entries (no restrictions yet) | Works without reason prompt |
| 3.12.6 | "Other" reason requires notes | Validation enforced |

---

## Tasks / Subtasks

### Task 1: Database Migration

- [ ] 1.1 Add `override_reason` column to `daep_attendance`
- [ ] 1.2 Add `override_notes` column to `daep_attendance`
- [ ] 1.3 Add `overridden_by` column to `daep_attendance`
- [ ] 1.4 Add `overridden_at` column to `daep_attendance`
- [ ] 1.5 Apply migration via Supabase MCP

### Task 2: Validation Schema Updates

- [ ] 2.1 Add `OverrideReasonEnum` to schemas.ts:
  - `data_entry_error`, `late_documentation`
  - `admin_correction`, `other`
- [ ] 2.2 Add `OVERRIDE_REASON_LABELS` constant
- [ ] 2.3 Update `MarkAttendanceSchema` to include optional override fields
- [ ] 2.4 Export new types

### Task 3: Server Action Updates

- [ ] 3.1 Update `markAttendance()` to accept override fields:
  - `override_reason`, `override_notes`
- [ ] 3.2 When override fields present:
  - Save to override columns
  - Set `overridden_by` and `overridden_at`
- [ ] 3.3 Enhance audit log with before/after + override reason
- [ ] 3.4 Change event_type to `attendance.override` when applicable

### Task 4: OverrideReasonModal Component

- [ ] 4.1 Create `components/daep/roster/OverrideReasonModal.tsx`
  - Props: isOpen, onClose, onConfirm
- [ ] 4.2 Add radio buttons for reasons:
  - Data Entry Error
  - Late Documentation
  - Administrative Correction
  - Other
- [ ] 4.3 Add notes textarea (required when "Other")
- [ ] 4.4 Add Continue/Cancel buttons
- [ ] 4.5 Export from `components/daep/roster/index.ts`

### Task 5: AttendanceCell Integration

- [ ] 5.1 Add `enteredBy` prop to AttendanceCell
- [ ] 5.2 Add `currentUserId` prop (or get from context)
- [ ] 5.3 When admin selects new status on existing entry:
  - Check if `enteredBy !== currentUserId`
  - If true, open OverrideReasonModal
  - Pass reason to `saveAttendance()`
- [ ] 5.4 Handle modal confirm → save with reason
- [ ] 5.5 Handle modal cancel → revert selection

### Task 6: Testing

- [ ] 6.1 TypeScript compilation passes
- [ ] 6.2 Staff edits own entry - no modal
- [ ] 6.3 Admin edits own entry - no modal
- [ ] 6.4 Admin edits staff's entry - modal appears
- [ ] 6.5 "Other" reason requires notes
- [ ] 6.6 Override metadata saved correctly
- [ ] 6.7 Audit log has before/after + reason
- [ ] 6.8 Playwright MCP verification

---

## Dev Notes

### Override Reasons

```typescript
export const OverrideReasonEnum = z.enum([
  'data_entry_error',
  'late_documentation',
  'admin_correction',
  'other'
]);

export const OVERRIDE_REASON_LABELS = {
  data_entry_error: 'Data Entry Error',
  late_documentation: 'Late Documentation',
  admin_correction: 'Administrative Correction',
  other: 'Other',
};
```

### Detection Logic

```typescript
// In AttendanceCell - when admin changes existing entry
const needsOverrideReason =
  isAdmin &&
  currentStatus !== null &&  // has existing entry
  enteredBy !== currentUserId;  // entered by someone else

if (needsOverrideReason) {
  setOverrideModalOpen(true);
  setPendingStatus(selectedStatus);
  return;
}
```

### Audit Log Structure

```typescript
{
  event_type: 'attendance.override',
  action: 'Override: P → A',
  details: {
    before: { status: 'P', excused: null, entered_by: 'user123' },
    after: { status: 'A', excused: true },
    override_reason: 'late_documentation',
    override_notes: 'Court document received today',
  }
}
```

---

## Future: Teacher Schedules

**Not in this story** - will be a separate enhancement.

Concept:
- Teachers rotate between rooms each period
- Students stay in one room all day
- Settings → Staff Schedules: assign teacher to room/period
- Staff can only edit attendance for their assigned room/period
- Admins can edit any room

---

## Out of Scope

| Item | Notes |
|------|-------|
| Teacher schedule restrictions | Future story |
| Bulk override | Not needed |
| Override history panel | Can view in audit log |
| Override notifications | Epic 7 |

---

## Dependencies

- Story 3-9 (Attendance Entry) - **DONE**
- Story 3-10 (Excused/Unexcused) - **DONE**

---

## References

- **Tech Spec:** `docs/sprint-artifacts/daep/tech-spec-story-3-12.md`
- **UX Guidelines:** `docs/sessions/ux-design-specification.md`
- **Existing Code:** `components/daep/roster/AttendanceCell.tsx`

---

_Story Version: 2.0 (Simplified)_
_Created: 2025-12-07_
_Updated: 2025-12-07 - Simplified to enhance existing workflow_
