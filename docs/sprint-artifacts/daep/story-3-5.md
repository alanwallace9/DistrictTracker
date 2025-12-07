# Story 3.5: Approved Teacher Auto-Finalize

**Status:** done
**Epic:** 3 - Daily Operations
**Points:** 2
**FRs:** FR31

---

## Story

As an **approved teacher**,
I want **my point entries to be immediately visible**,
So that **students and parents can see their progress without delay**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Experienced teachers shouldn't have to wait for admin approval to do their job. When a trusted teacher marks a student's points, that data should flow immediately - no bottlenecks, no delays. Meanwhile, new staff get a safety net: their entries are reviewed before going public.

**The outcome:** Quality control where it matters, speed where it doesn't.

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 3.5.1 | If user has `approved_teacher = true`, points saved with `approval_status = 'approved'` | Query DB after entry, verify status |
| 3.5.2 | Points immediately visible on student profile and parent portal | Check student profile shows entry |
| 3.5.3 | No approval queue notification generated | Verify no notification created |
| 3.5.4 | `public = true` set immediately | Query DB, verify public flag |
| 3.5.5 | Audit log records direct approval | Check audit log for 'points.auto_approved' event |
| 3.5.6 | Non-approved staff entries saved with `approval_status = 'pending'` | Query DB after entry by non-approved user |
| 3.5.7 | Pending entries have `public = false` | Query DB, verify public = false |
| 3.5.8 | Admin roles always auto-approved regardless of flag | Test super_admin, district_admin, daep_admin_l1 |

---

## Tasks / Subtasks

### Task 1: Update checkDAEPStaffRole Helper (AC: 3.5.1, 3.5.8)

- [x] 1.1 Add `approved_teacher` to the select query in `checkDAEPStaffRole()`
- [x] 1.2 Add `isApprovedTeacher: boolean` to `DAEPStaffInfo` interface
- [x] 1.3 Compute `isApprovedTeacher`:
  - Admin roles (super_admin, district_admin, daep_admin_l1) → always true
  - Other roles → use `profile.approved_teacher` flag
- [x] 1.4 Return `isApprovedTeacher` in the result object

### Task 2: Update createPointAdjustment (AC: 3.5.1, 3.5.4, 3.5.5, 3.5.6, 3.5.7)

- [x] 2.1 Destructure `isApprovedTeacher` from `checkDAEPStaffRole()` result
- [x] 2.2 Set `approval_status` based on `isApprovedTeacher`:
  - true → 'approved'
  - false → 'pending'
- [x] 2.3 Set `public` based on `isApprovedTeacher`:
  - true → true
  - false → false
- [x] 2.4 Update audit event type:
  - Approved: 'points.auto_approved'
  - Pending: 'points.pending_approval'
- [x] 2.5 Add `isPending: boolean` to return type
- [x] 2.6 Include `approval_status` and `is_approved_teacher` in audit details

### Task 3: Update bulkAddPoints (AC: 3.5.1, 3.5.4, 3.5.5, 3.5.6, 3.5.7)

- [x] 3.1 Destructure `isApprovedTeacher` from `checkDAEPStaffRole()` result
- [x] 3.2 Set `approval_status` and `public` on all bulk entries
- [x] 3.3 Update audit event type:
  - Approved: 'points.bulk_auto_approved'
  - Pending: 'points.bulk_pending_approval'
- [x] 3.4 Add `isPending: boolean` to return type

### Task 4: Update createBasePoints (AC: 3.5.1, 3.5.4)

- [x] 4.1 Destructure `isApprovedTeacher` from `checkDAEPStaffRole()` result
- [x] 4.2 Set `approval_status` and `public` based on `isApprovedTeacher`
- [x] 4.3 Update audit event type accordingly

### Task 5: UI Toast Updates (AC: 3.5.2, 3.5.3)

- [x] 5.1 Update `PointAdjustmentDialog` to show different toast for pending:
  - Approved: "Points saved" (current)
  - Pending: "Points submitted for approval"
- [x] 5.2 Update `RoomRosterView` bulk apply toast for pending entries
- [x] 5.3 Handle `isPending` response from server actions

### Task 6: Testing

- [x] 6.1 TypeScript compilation passes with no errors
- [ ] 6.2 Manual test: approved teacher entry → approval_status = 'approved', public = true
- [ ] 6.3 Manual test: non-approved staff entry → approval_status = 'pending', public = false
- [x] 6.4 Code review: Admin roles (super_admin, district_admin, daep_admin_l1) always approved
- [x] 6.5 Code review: daep_admin_l2/daep_staff use approved_teacher flag

---

## Dev Notes

### Admin Roles Always Approved

To prevent workflow bottlenecks, these roles bypass the `approved_teacher` check:

| Role | Always Approved | Notes |
|------|-----------------|-------|
| super_admin | Yes | Full system access |
| district_admin | Yes | District-level oversight |
| daep_admin_l1 | Yes | DAEP management |
| daep_admin_l2 | No | Uses approved_teacher flag |
| daep_staff | No | Uses approved_teacher flag |

### Implementation Pattern

```typescript
// In checkDAEPStaffRole()
const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
const isApprovedTeacher = adminRoles.includes(profile.role) || profile.approved_teacher === true;
```

### Audit Event Types

| Scenario | Event Type |
|----------|------------|
| Single entry, approved | `points.auto_approved` |
| Single entry, pending | `points.pending_approval` |
| Bulk entry, approved | `points.bulk_auto_approved` |
| Bulk entry, pending | `points.bulk_pending_approval` |
| Base points, approved | `points.base_auto_approved` |
| Base points, pending | `points.base_pending_approval` |

### Toast Messages

```typescript
// Approved teacher
toast({ title: "Points saved", description: "Added +5 points" });

// Non-approved staff
toast({
  title: "Points submitted for approval",
  description: "+5 points submitted. An admin will review.",
});
```

### Existing Fields Used

No schema changes needed. Uses existing columns:

- `daep_daily_points.approval_status` - TEXT, values: 'approved', 'pending', 'rejected'
- `daep_daily_points.public` - BOOLEAN, controls visibility to students/parents
- `user_profiles.approved_teacher` - BOOLEAN, added in Story 1.4

### Relationship to Story 3.6

This story creates the **data foundation**:
- Sets `approval_status = 'pending'` for non-approved staff
- Sets `public = false` to hide from students/parents

Story 3.6 creates the **admin workflow**:
- Approval queue page at `/daep/approvals`
- Approve/Reject/Edit actions
- Notifications to admins

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User role changed mid-session | Next entry uses new role's approval logic |
| approved_teacher flag changed | Next entry uses new flag value |
| Admin demoted to daep_staff | Future entries use approved_teacher flag |
| Bulk entry with mixed placements | All entries use same approval status (from current user) |

---

## Definition of Done

- [ ] Approved teacher entries saved with `approval_status = 'approved'`
- [ ] Approved teacher entries saved with `public = true`
- [ ] Non-approved staff entries saved with `approval_status = 'pending'`
- [ ] Non-approved staff entries saved with `public = false`
- [ ] Admin roles (super_admin, district_admin, daep_admin_l1) always auto-approved
- [ ] Audit log records different event types for auto-approved vs pending
- [ ] Toast messages inform user when entry is pending approval
- [ ] Bulk entries respect approval logic
- [ ] Base points respect approval logic
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-story-3-5.md`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

**Modified:**
- `app/actions/daep/points.ts` - Update checkDAEPStaffRole, createPointAdjustment, bulkAddPoints, createBasePoints
- `components/daep/roster/PointAdjustmentDialog.tsx` - Update toast messages
- `components/daep/roster/BulkApplyDialog.tsx` - Update toast messages

---

## References

- [Source: docs/reference/epics-part2.md#Story-3.5] - Epic definition
- [Source: docs/sprint-artifacts/daep/tech-spec-story-3-5.md] - Technical specification
- [Source: docs/sprint-artifacts/daep/1-4-approved-teacher-flag.md] - approved_teacher flag implementation
- [Source: app/actions/daep/points.ts] - Server actions to modify
- [Source: lib/roles.ts] - Role definitions and approved_teacher helpers
