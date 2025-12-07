# Story 3.6: Pending Approval Workflow

**Status:** review
**Epic:** 3 - Daily Operations
**Points:** 3
**FRs:** FR32, FR33

---

## Story

As a **DAEP administrator**,
I want **to review and approve point entries from non-approved staff**,
So that **quality control is maintained while allowing all staff to enter data**.

---

## Design Philosophy

> "How did they ever do their job without this?"

New staff need oversight, but they shouldn't be blocked from doing their job. The approval workflow creates a safety net - entries flow into a queue where admins can quickly approve good entries, fix minor issues, or reject problematic ones. The goal is a 30-second review per entry, not a bureaucratic bottleneck.

**The outcome:** Quality control that doesn't slow anyone down.

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 3.6.1 | Pending entries visible to staff but NOT to students/parents | Verify `public = false` on pending entries |
| 3.6.2 | Navigation shows pending count badge for admins | Badge visible, updates on approve/reject |
| 3.6.3 | Approval queue page at `/daep/approvals` | Page loads, shows pending entries |
| 3.6.4 | Queue shows: student, period, date, points, entered_by, notes | All columns visible in table |
| 3.6.5 | Admin can Approve entry | Click approve, entry becomes approved |
| 3.6.6 | Admin can Reject entry | Click reject, confirm, entry becomes rejected |
| 3.6.7 | Admin can Edit & Approve | Edit dialog opens, save approves |
| 3.6.8 | Edit allows changing points, student_action, teacher_action, notes | All fields editable in dialog |
| 3.6.9 | Approve sets `approval_status = 'approved'`, `public = true` | Query DB to verify |
| 3.6.10 | Reject sets `approval_status = 'rejected'`, stays private | Query DB to verify |
| 3.6.11 | Bulk approve works for multiple entries | Select multiple, approve all |
| 3.6.12 | Non-admins cannot access approvals page | Redirect or access denied |

---

## Tasks / Subtasks

### Task 1: Database Migration (AC: 3.6.9, 3.6.10)

- [x] 1.1 Create migration `add_approval_metadata_columns`
- [x] 1.2 Add `approved_by UUID` column (references auth.users)
- [x] 1.3 Add `approved_at TIMESTAMPTZ` column
- [x] 1.4 Add `rejected_by UUID` column (references auth.users)
- [x] 1.5 Add `rejected_at TIMESTAMPTZ` column
- [x] 1.6 Add `rejection_reason TEXT` column
- [x] 1.7 Add index on `(tenant_id, approval_status)` WHERE pending
- [x] 1.8 Apply migration to Supabase

### Task 2: Server Actions - Read (AC: 3.6.2, 3.6.3, 3.6.4)

- [x] 2.1 Add `PendingApprovalEntry` interface to points.ts
- [x] 2.2 Implement `getPendingApprovals()`:
  - Join daep_placements → students for student name
  - Join user_profiles for entered_by name
  - Filter by tenant_id and approval_status = 'pending'
  - Order by date DESC, created_at DESC
- [x] 2.3 Implement `getPendingApprovalsCount()`:
  - Return count for nav badge
  - Return 0 for non-admin roles

### Task 3: Server Actions - Write (AC: 3.6.5, 3.6.6, 3.6.7, 3.6.9, 3.6.10, 3.6.11)

- [x] 3.1 Implement `approvePointEntry(entryId)`:
  - Verify admin role
  - Update approval_status = 'approved', public = true
  - Set approved_by, approved_at
  - Audit log: 'points.approved_by_admin'
- [x] 3.2 Implement `rejectPointEntry(entryId, reason?)`:
  - Verify admin role
  - Update approval_status = 'rejected', public = false
  - Set rejected_by, rejected_at, rejection_reason
  - Audit log: 'points.rejected_by_admin'
- [x] 3.3 Implement `bulkApproveEntries(entryIds[])`:
  - Verify admin role
  - Update all matching entries
  - Audit log: 'points.bulk_approved_by_admin'
- [x] 3.4 Implement `editAndApproveEntry(input)`:
  - Verify admin role
  - Update points, actions, notes AND approve in one operation
  - Audit log with before/after: 'points.edited_and_approved'

### Task 4: Navigation Badge (AC: 3.6.2)

- [x] 4.1 Add "Approvals" nav item to DAEPSidebar.tsx
- [x] 4.2 Set href to `/daep/approvals`
- [x] 4.3 Restrict to admin roles: super_admin, district_admin, daep_admin_l1
- [x] 4.4 Fetch pending count (consider caching or polling strategy)
- [x] 4.5 Show badge with count, hide when 0
- [x] 4.6 Style badge: red/orange background for urgency

### Task 5: Approvals Queue Page (AC: 3.6.3, 3.6.4)

- [x] 5.1 Create `app/daep/(main)/approvals/page.tsx`
- [x] 5.2 Add role guard (redirect non-admins)
- [x] 5.3 Fetch pending entries with `getPendingApprovals()`
- [x] 5.4 Create page header: "Point Approvals" with description
- [x] 5.5 Group entries by date (Today, Yesterday, older dates)
- [x] 5.6 Create `PendingEntryRow` component showing:
  - Student name (Last, First)
  - Period
  - Points with color coding (+green, -red)
  - Student action
  - Entered by name
  - Time
- [x] 5.7 Add action buttons to each row: Edit, Approve (✓), Reject (✗)
- [x] 5.8 Add empty state: "No pending entries" with checkmark icon
- [x] 5.9 Add loading skeleton while fetching

### Task 6: Bulk Selection & Approve (AC: 3.6.11)

- [x] 6.1 Add checkbox to each row
- [x] 6.2 Add "Select All" checkbox in header
- [x] 6.3 Track selected entry IDs in state
- [x] 6.4 Show "Approve Selected (N)" button when selection > 0
- [x] 6.5 Wire button to `bulkApproveEntries()`
- [x] 6.6 Show success toast with count
- [x] 6.7 Clear selection and refresh after bulk approve

### Task 7: Edit & Approve Dialog (AC: 3.6.7, 3.6.8)

- [x] 7.1 Create `components/daep/approvals/EditApproveDialog.tsx`
- [x] 7.2 Accept entry data as prop
- [x] 7.3 Pre-fill form with current values:
  - Adjustment dropdown
  - Student action dropdown
  - Teacher action dropdown
  - Notes textarea
- [x] 7.4 Show original entry info: "Entered by X at Y"
- [x] 7.5 "Save & Approve" button calls `editAndApproveEntry()`
- [x] 7.6 Show success toast on save
- [x] 7.7 Close dialog and refresh queue

### Task 8: Reject Confirmation Dialog (AC: 3.6.6)

- [x] 8.1 Create `components/daep/approvals/RejectConfirmDialog.tsx`
- [x] 8.2 Show entry details being rejected
- [x] 8.3 Add optional "Reason" text input
- [x] 8.4 "Reject Entry" button calls `rejectPointEntry()`
- [x] 8.5 Show success toast on reject
- [x] 8.6 Close dialog and refresh queue

### Task 9: Testing

- [ ] 9.1 Test single approve → status changes, public = true
- [ ] 9.2 Test single reject → status changes, stays private
- [ ] 9.3 Test edit and approve → values updated, approved
- [ ] 9.4 Test bulk approve → multiple entries approved
- [ ] 9.5 Test nav badge updates after actions
- [ ] 9.6 Test non-admin access → redirected/denied
- [ ] 9.7 Test empty state when no pending entries
- [ ] 9.8 Verify audit log entries for all actions

---

## Dev Notes

### Admin Roles for Approvals

Only these roles can access the approvals page and actions:

| Role | Can Approve |
|------|-------------|
| super_admin | Yes |
| district_admin | Yes |
| daep_admin_l1 | Yes |
| daep_admin_l2 | No |
| daep_staff | No |

### Audit Event Types

| Action | Event Type |
|--------|------------|
| Single approve | `points.approved_by_admin` |
| Single reject | `points.rejected_by_admin` |
| Bulk approve | `points.bulk_approved_by_admin` |
| Edit and approve | `points.edited_and_approved` |

### Navigation Badge Placement

Add to DAEPSidebar after "Rooms" and before "Reports":

```typescript
{
  name: 'Approvals',
  href: '/daep/approvals',
  icon: CheckCircle,
  badge: pendingCount > 0 ? pendingCount : undefined,
  adminOnly: true,
}
```

### Query Optimization

The pending approvals query joins 3 tables. Add index for performance:

```sql
CREATE INDEX idx_daep_daily_points_pending
ON daep_daily_points(tenant_id, approval_status)
WHERE approval_status = 'pending';
```

### Relationship to Story 3.5

Story 3.5 creates pending entries with:
- `approval_status = 'pending'`
- `public = false`

Story 3.6 provides the UI to transition them to:
- `approval_status = 'approved'` + `public = true` (approve)
- `approval_status = 'rejected'` + `public = false` (reject)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Entry already processed | Show "Entry not found or already processed" error |
| Concurrent approval | First request wins, second gets error |
| Empty queue | Show friendly empty state with checkmark |
| Staff views approvals URL | Redirect to dashboard or show access denied |
| Entry from deleted staff | Still shows, use "Unknown" for name |
| Bulk approve with some already processed | Process valid ones, report count |

---

## Definition of Done

- [ ] Migration applied with new columns
- [ ] All 6 server actions implemented and working
- [ ] Navigation badge shows correct count (admins only)
- [ ] Approvals page lists pending entries grouped by date
- [ ] Single approve works with audit log
- [ ] Single reject works with optional reason
- [ ] Edit & Approve dialog works
- [ ] Bulk approve works
- [ ] Non-admins cannot access page
- [ ] Empty state displays when no pending entries
- [ ] TypeScript compiles with no errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-story-3-6.md`
- `docs/sprint-artifacts/daep/story-3-5.md` (creates pending entries)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

**Created:**
- `supabase/migrations/20251207100000_add_approval_metadata_columns.sql`
- `app/daep/(main)/approvals/page.tsx`
- `components/daep/approvals/EditApproveDialog.tsx`
- `components/daep/approvals/RejectConfirmDialog.tsx`

**Modified:**
- `app/actions/daep/points.ts` - Added 6 new server actions (getPendingApprovals, getPendingApprovalsCount, approvePointEntry, rejectPointEntry, bulkApproveEntries, editAndApproveEntry)
- `components/daep/layout/DAEPSidebar.tsx` - Added Approvals nav item with badge and role-based visibility

---

## References

- [Source: docs/reference/epics-part2.md#Story-3.6] - Epic definition
- [Source: docs/sprint-artifacts/daep/tech-spec-story-3-6.md] - Technical specification
- [Source: docs/sprint-artifacts/daep/story-3-5.md] - Prerequisite story (creates pending entries)
- [Source: app/actions/daep/points.ts] - Server actions to extend
