# Story 3.10: Excused vs Unexcused Absences

**Status:** done
**Epic:** 3 - Daily Operations
**Points:** 3
**FRs:** FR42

---

## Story

As a **DAEP staff member**,
I want **to mark absences as excused or unexcused with appropriate reasons**,
So that **days served and points are calculated correctly based on documentation**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Court dates, PO meetings, driver's license appointments - these shouldn't penalize a student's DAEP progress. But teachers in the classroom don't have that documentation. The system matches real workflow: staff marks absent quickly, then the attendance clerk processes excuses the next day with proper documentation. One role stays focused on teaching, the other handles compliance. Everyone wins.

**The outcome:** Fair, accurate tracking. Students aren't penalized for government obligations. Administrators have clear records. Teachers aren't slowed down with paperwork.

---

## Two Concepts for Absences

| Concept | Purpose | Who Decides |
|---------|---------|-------------|
| **Excused vs Unexcused** | Truancy tracking | Admin L1/L2 with documentation |
| **Counts toward points/days** | DAEP progress | Based on reason type |

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
| Staff-marked (pending) | Pending | No | A (amber) |

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 3.10.1 | Staff marking Absent saves immediately (no modal) | Staff clicks A, saves with excused=null |
| 3.10.2 | Admin marking Absent opens ExcuseModal | Admin clicks A, modal appears |
| 3.10.3 | Modal has Excused/Unexcused radio buttons | Check modal UI |
| 3.10.4 | Excused shows reason dropdown with all options | Select Excused, verify dropdown |
| 3.10.5 | Court/Gov't reasons auto-check "counts toward points" | Select Court, verify auto-checked |
| 3.10.6 | Medical/Parent reasons don't auto-check points | Select Medical, verify unchecked |
| 3.10.7 | Parent call shows "X of 6 this semester" counter | Select Parent Call, verify counter |
| 3.10.8 | Badge: A (amber) for pending review | Staff marks A, check badge |
| 3.10.9 | Badge: E (green) for excused + points | Admin marks Court, check badge |
| 3.10.10 | Badge: E (red) for excused, no points | Admin marks Medical, check badge |
| 3.10.11 | Badge: U (red) for confirmed unexcused | Admin marks Unexcused, check badge |
| 3.10.12 | Points created only when counts_toward_days_served=true | Verify points logic |

---

## Tasks / Subtasks

### Task 1: Validation Schema Updates (AC: 3.10.4)

- [x] 1.1 Add `ExcuseReasonEnum` to schemas.ts:
  - `court_legal`, `parole_probation`, `drivers_license_dps`, `state_federal_gov`
  - `medical`, `parent_call`, `other`
- [x] 1.2 Add `POINTS_ELIGIBLE_REASONS` array (court/gov't reasons)
- [x] 1.3 Update `MarkAttendanceSchema` with new fields:
  - `excused: z.boolean().optional().nullable()` (null = pending)
  - `excuse_reason: ExcuseReasonEnum.optional().nullable()`
  - `excuse_notes: z.string().optional().nullable()`
  - `counts_toward_days_served: z.boolean().optional().default(false)`
- [x] 1.4 Add `EXCUSE_REASON_LABELS` and `EXCUSE_REASON_ORDER` constants

### Task 2: Server Action Updates (AC: 3.10.1, 3.10.5, 3.10.6, 3.10.12)

- [x] 2.1 Update `markAttendance()` to be role-aware:
  - Check if user is admin (L1/L2/district/super)
  - Staff: set excused=null, counts_toward_days_served=false
  - Admin: use provided values from modal
- [x] 2.2 Auto-set counts_toward_days_served for POINTS_ELIGIBLE_REASONS
- [x] 2.3 Update points logic:
  - Create points only if counts_toward_days_served=true
  - Remove points otherwise
- [x] 2.4 Add `getParentCallCount()` function for semester tracking
- [x] 2.5 Update audit log to include excuse details

### Task 3: ExcuseModal Component (AC: 3.10.2, 3.10.3, 3.10.4, 3.10.7)

- [x] 3.1 Create `components/daep/roster/ExcuseModal.tsx`:
  - Props: isOpen, onClose, onSave, studentName, currentData, parentCallCount
- [x] 3.2 Add radio buttons: Unexcused / Excused
- [x] 3.3 Add reason dropdown (shown when Excused selected):
  - Court/Legal Appearance
  - Parole/Probation Officer
  - Driver's License (DPS)
  - State/Federal Government
  - Medical (with documentation)
  - Parent Call
  - Other
- [x] 3.4 Add "Counts toward points/days" checkbox:
  - Auto-check for Court/Gov't reasons
  - Unchecked for Medical/Parent
- [x] 3.5 Show parent call counter: "Call X of 6 this semester"
- [x] 3.6 Add notes text area
- [x] 3.7 Add placeholder for document upload (disabled, shows "Coming soon")
- [x] 3.8 Export from `components/daep/roster/index.ts`

### Task 4: AttendanceCell Role-Based Behavior (AC: 3.10.1, 3.10.2)

- [x] 4.1 Get user role from context or props
- [x] 4.2 Define isAdmin check (super_admin, district_admin, daep_admin_l1, daep_admin_l2)
- [x] 4.3 When staff selects 'A':
  - Save directly with excused=null, counts_toward_days_served=false
  - No modal
- [x] 4.4 When admin selects 'A':
  - Open ExcuseModal
  - On save, call markAttendance with modal data
- [x] 4.5 When admin clicks existing 'A' badge:
  - Open ExcuseModal pre-populated with current data

### Task 5: AttendanceStatusBadge Updates (AC: 3.10.8-3.10.11)

- [x] 5.1 Update badge logic for Absent status:
  - excused=null → A (amber/warning) "Pending review"
  - excused=true + counts_toward=true → E (green/success)
  - excused=true + counts_toward=false → E (red/destructive)
  - excused=false → U (red/destructive)
- [x] 5.2 Add tooltip showing reason on hover for excused badges
- [x] 5.3 Ensure consistent styling with existing P/T/ED badges

### Task 6: Testing

- [x] 6.1 TypeScript compilation passes
- [x] 6.2 Test staff workflow: A saves immediately, amber badge, no modal
- [x] 6.3 Test admin workflow: A opens modal
- [x] 6.4 Test Unexcused selection: red U badge
- [x] 6.5 Test Excused + Court: auto-checks points, green E badge, points created
- [x] 6.6 Test Excused + Medical: unchecked points, red E badge, no points
- [x] 6.7 Test parent call counter shows correctly
- [x] 6.8 Test editing existing A (admin can add excuse)
- [x] 6.9 Test points created only when counts_toward_days_served=true
- [x] 6.10 Playwright MCP verification

---

## Dev Notes

### Database Columns (Already Exist)

```sql
-- In daep_attendance table:
excused BOOLEAN DEFAULT FALSE,
excuse_reason TEXT,
counts_toward_days_served BOOLEAN DEFAULT TRUE
```

No migration needed.

### Role Check Helper

```typescript
const ADMIN_ROLES = ['super_admin', 'district_admin', 'daep_admin_l1', 'daep_admin_l2'];
const isAdmin = ADMIN_ROLES.includes(userRole);
```

### Excuse Reason Constants

```typescript
export const POINTS_ELIGIBLE_REASONS = [
  'court_legal',
  'parole_probation',
  'drivers_license_dps',
  'state_federal_gov',
];

export const EXCUSE_REASON_LABELS = {
  court_legal: 'Court/Legal Appearance',
  parole_probation: 'Parole/Probation Officer',
  drivers_license_dps: "Driver's License (DPS)",
  state_federal_gov: 'State/Federal Government',
  medical: 'Medical (with documentation)',
  parent_call: 'Parent Call',
  other: 'Other',
};
```

### Badge Color Summary

| State | Badge | Color | Meaning |
|-------|-------|-------|---------|
| excused=null | A | Amber | Pending review |
| excused=true, counts=true | E | Green | Excused + points |
| excused=true, counts=false | E | Red | Excused, no points |
| excused=false | U | Red | Unexcused |

---

## Quick Wins

| Quick Win | Implementation |
|-----------|----------------|
| Auto-select based on reason | Court/Gov't auto-checks "counts toward points" |
| Parent call counter | Show "Call 3 of 6 this semester" in modal |
| Reason presets | Gov't reasons at top (most common for DAEP) |
| Role-based simplicity | Staff = one-click, Admin = full modal |

---

## Backlog Items

| Item | Description |
|------|-------------|
| Document upload | Drag & drop to attach court docs, medical notes |
| Semester reset | Auto-reset parent call count at semester start |
| Bulk excuse marking | Mark multiple students excused at once |

---

## Out of Scope

- Document upload/scanning (backlog)
- Semester parent call reset (backlog)
- Bulk excuse operations
- Parent portal attendance view

---

## References

- **Tech Spec:** `docs/sprint-artifacts/daep/tech-spec-story-3-10.md`
- **Attendance Actions:** `app/actions/daep/attendance.ts`
- **Story 3-9:** `docs/sprint-artifacts/daep/story-3-9.md`
- **PRD:** FR42

---

_Story Version: 2.0_
_Created: 2025-12-07_
_Updated: 2025-12-07 - Role-based two-phase workflow_
_Author: Claude (AI Assistant)_
