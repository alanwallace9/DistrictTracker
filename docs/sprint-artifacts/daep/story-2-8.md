# Story 2.8: Edit Placement

**Status:** done
**Epic:** 2 - Placement Management
**Points:** 3
**FRs:** FR18, FR21

---

## Story

As a **DAEP administrator**,
I want **to edit placement details, change room assignments, update days assigned, and trigger status transitions**,
So that **I can correct errors, adjust placements as situations change, and move students through the lifecycle**.

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 2.8.1 | Edit form accessible from placement card/profile | Button navigates to edit form at `/daep/placements/[id]/edit` |
| 2.8.2 | Editable fields: days_assigned, assigned_room_id, intake_notes, completion_notes, offense_code, placement_reason | Form fields update correctly on save |
| 2.8.3 | Days recalculated on days_assigned change | Expected end date updates using `calculateExpectedEndDate()` |
| 2.8.4 | Room assignment validates separation constraints | Error shown when room contains separated student |
| 2.8.5 | Status transition buttons based on current state | Only valid transitions shown per state machine |
| 2.8.6 | All changes logged to audit trail | Audit entries created via `logAuditEvent()` |
| 2.8.7 | Validation prevents invalid data | Form shows Zod schema validation errors |
| 2.8.8 | Cancel returns to profile without saving | No changes persisted on cancel |

---

## Tasks / Subtasks

### Task 1: Add UpdatePlacementSchema (AC: 2.8.2, 2.8.7)

- [x] 1.1 Add `UpdatePlacementSchema` to `lib/validation/schemas.ts`
  ```typescript
  export const UpdatePlacementSchema = z.object({
    id: z.string().uuid(),
    days_assigned: z.number().int().min(1).max(365).optional(),
    assigned_room_id: z.string().uuid().nullable().optional(),
    intake_notes: z.string().max(2000).optional(),
    completion_notes: z.string().max(2000).optional(),
    placement_reason: z.string().min(10).max(1000).optional(),
    offense_code: z.string().optional(),
  });
  ```
- [x] 1.2 Export `UpdatePlacementInput` type

### Task 2: Server Actions (AC: 2.8.2, 2.8.3, 2.8.4, 2.8.6)

- [x] 2.1 Add `getPlacementForEdit(placementId: string)` to `app/actions/daep/placements.ts`
  - Fetch placement with tenant isolation via `getTenantId()`
  - Include relations: `home_campus`, `assigned_room`, `discipline_code`
  - Return `PlacementDetail` type for form population
- [x] 2.2 Add `updatePlacement(input: UpdatePlacementInput)` to `app/actions/daep/placements.ts`
  - Validate input with Zod schema
  - Check tenant isolation
  - Build update object only for changed fields
  - If `days_assigned` changed:
    - Calculate new `days_remaining = days_assigned - days_served`
    - Recalculate `expected_end_date` via `calculateExpectedEndDate()`
  - If `assigned_room_id` changed:
    - Validate room availability using `getAvailableRoomsForStudent()`
    - Return error if room has separation conflict
  - Update placement record
  - Sync TrespassTracker if `expected_end_date` changed
  - Log to audit trail with `{ changes }` details
  - Revalidate paths
- [x] 2.3 Add `getDisciplineCodesForForm()` to fetch available offense codes for dropdown
  - Note: Reused existing `getOffenseCodesForForm()` function

### Task 3: Edit Placement Page (AC: 2.8.1)

- [x] 3.1 Create `app/daep/placements/[id]/edit/page.tsx`
  - Server component that fetches placement data
  - Call `getPlacementForEdit()`, `getAvailableRoomsForStudent()`, `getOffenseCodesForForm()`
  - Handle not found with `notFound()`
  - Render `EditPlacementForm` with fetched data

### Task 4: Edit Form Component (AC: 2.8.2, 2.8.3, 2.8.4, 2.8.7, 2.8.8)

- [x] 4.1 Create `components/daep/placements/EditPlacementForm.tsx`
  - Accept props: `placement`, `availableRooms`, `offenseCodes`
  - Use `react-hook-form` with `zodResolver(UpdatePlacementSchema)`
  - Initialize form with current placement values
- [x] 4.2 Add form fields:
  - Days Assigned (number input, min 1, max 365)
  - Offense Code (select dropdown)
  - Assigned Room (select dropdown with availability status)
  - Placement Reason (textarea)
  - Intake Notes (textarea)
  - Completion Notes (textarea)
- [x] 4.3 Add status header card with `PlacementStatusBadge`
- [x] 4.4 Add `StatusTransitionActions` component for status buttons
- [x] 4.5 Add Cancel button that calls `router.back()` (AC 2.8.8)
- [x] 4.6 Add Save button that calls `updatePlacement()`
- [x] 4.7 Show validation errors from Zod schema (AC 2.8.7)
- [x] 4.8 Show toast on success/error

### Task 5: Status Transition Actions Component (AC: 2.8.5)

- [x] 5.1 Verified `components/daep/placements/StatusTransitionActions.tsx` already exists (from Story 2-6)
  - Accept props: `placementId`, `currentStatus`, `daysRemaining`, `onTransitionComplete`
  - Import `getValidTransitions()` from `lib/daep/placement-state-machine.ts`
  - Display buttons only for valid next states
  - For `pending → active`: Show "Activate Placement" button
  - For `active → met`: Show "Mark Days Met" button (disabled if daysRemaining > 0)
  - For `met → complete`: Show "Complete Placement" button
- [x] 5.2 Each button calls existing `transitionPlacement()` server action
- [x] 5.3 On successful transition, call `onTransitionComplete()` callback to refresh page

### Task 6: Edit Button on CurrentPlacementCard (AC: 2.8.1)

- [x] 6.1 Add "Edit" button to `components/daep/CurrentPlacementCard.tsx`
  - Use `Link` to `/daep/placements/[id]/edit`
  - Position in card header next to PlacementStatusBadge
  - Use outline variant with Edit icon

### Task 7: Shared Components (Supporting)

- [x] 7.1 Verified `components/daep/shared/PlacementStatusBadge.tsx` already exists (from Story 2-6)
  - Accept `status: PlacementStatus` prop
  - Return styled badge with status text
  - Uses theme colors via variant classes

### Task 8: Unit Tests (AC: 2.8.2, 2.8.3, 2.8.4, 2.8.6, 2.8.7) - OPTIONAL

- [ ] 8.1 Test `updatePlacement` validates days range (1-365)
- [ ] 8.2 Test `updatePlacement` recalculates expected end date when days change
- [ ] 8.3 Test `updatePlacement` returns error for blocked room
- [ ] 8.4 Test `updatePlacement` calls `logAuditEvent()` with changes
- [ ] 8.5 Test `UpdatePlacementSchema` validation errors

**Note:** Unit tests skipped per project conventions - manual testing verified

---

## Dev Notes

### Key Patterns (from Bug Fixes)

**Tenant ID Resolution** (CRITICAL - from `bug-fix-daep-rls.md`):
```typescript
// CORRECT - use centralized helper
import { getTenantId } from '@/lib/tenant';
const tenantId = await getTenantId();

// WRONG - don't read from Clerk metadata
// const tenantId = user.publicMetadata?.tenant_id; // RLS mismatch!
```

**Role Names** (from `bug-room-creation-rls-policies.md`):
```typescript
// CORRECT roles
['daep_admin_l1', 'daep_admin_l2', 'district_admin', 'super_admin']

// WRONG - renamed in migration 20251126200000
// ['master_admin'] // No longer exists!
```

**State Machine Enforcement** (from Story 2-6):
```typescript
import { isValidTransition, getValidTransitions } from '@/lib/daep/placement-state-machine';

// Always validate before updating
if (!isValidTransition(currentStatus, newStatus)) {
  return { error: `Invalid transition from ${currentStatus} to ${newStatus}` };
}
```

### Existing Code to Reuse

**From `app/actions/daep/placements.ts`:**
- `transitionPlacement()` - already handles state machine validation (Story 2-6)
- `getPlacementTransitions()` - already implemented (Story 2-6)
- `syncTrespassTrackerStatus()` - already handles TrespassTracker sync

**From `lib/daep/placement-state-machine.ts`:**
- `isValidTransition(from, to)` - validates state changes
- `getValidTransitions(status)` - returns valid next states
- `getStatusDescription(status)` - human-readable status text

**From `lib/daep/days-remaining.ts`:**
- `calculateExpectedEndDate()` - recalculates end date from school calendar (Story 2-7)
- `calculateDaysInfo()` - complete days calculation

**From `app/actions/daep/rooms.ts`:**
- `getAvailableRoomsForStudent()` - checks room availability and separation conflicts (Story 2-5)

### Non-Functional Requirements

- **Performance:** Edit form load < 500ms, save < 1s
- **Security:** All queries use `tenant_id = getTenantId()` for multi-tenant isolation
- **Security:** Authorized roles: `daep_admin_l1`, `daep_admin_l2`, `district_admin`, `super_admin`
- **Observability:** All mutations logged via `logAuditEvent()`

### Project Structure Notes

```
app/daep/placements/
└── [id]/
    └── edit/
        └── page.tsx              # NEW - Edit placement page

app/actions/daep/
└── placements.ts                 # MODIFY - Add getPlacementForEdit, updatePlacement

components/daep/
├── placements/
│   ├── EditPlacementForm.tsx     # NEW - Edit form component
│   └── StatusTransitionActions.tsx # NEW - Status buttons
├── shared/
│   └── PlacementStatusBadge.tsx  # NEW (if not exists)
└── CurrentPlacementCard.tsx      # MODIFY - Add Edit button

lib/validation/
└── schemas.ts                    # MODIFY - Add UpdatePlacementSchema
```

### Learnings from Previous Story

**From Story 2-7 (Status: done)**

- **Days Calculation**: Use `calculateExpectedEndDate()` from `lib/daep/days-remaining.ts` when days_assigned changes
- **DaysProgressBar Component**: Available at `components/daep/shared/DaysProgressBar.tsx` - can be displayed on edit form
- **Audit Logging Pattern**: Use `eventType: 'placement.updated'` with descriptive `details` object
- **Calendar Integration**: Recalculation hooks exist in school-calendar.ts - no need to re-implement

**Files Created in 2-7:**
- `components/daep/shared/DaysProgressBar.tsx` - reusable progress display

**Files Modified in 2-7:**
- `lib/daep/days-remaining.ts` - has all calculation utilities
- `app/actions/daep/placements.ts` - has recalculation actions

[Source: docs/sprint-artifacts/daep/story-2-7.md#Dev-Agent-Record]

### References

- [Source: docs/sprint-artifacts/daep/tech-spec-stories-2-8-2-9.md] - Full implementation spec
- [Source: docs/reference/epics-part1.md#Story-2.8] - Epic definition
- [Source: docs/sprint-artifacts/daep/story-2-7.md] - Previous story learnings
- [Source: lib/daep/placement-state-machine.ts] - State machine utilities
- [Source: lib/daep/days-remaining.ts] - Days calculation utilities

---

## Dev Agent Record

### Context Reference

- [docs/sprint-artifacts/daep/story-2-8.context.xml](./story-2-8.context.xml)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None required - TypeScript errors fixed during implementation.

### Completion Notes List

1. **Reused Existing Components**: Tasks 5 and 7 verified that `StatusTransitionActions` and `PlacementStatusBadge` already exist from Story 2-6, reducing implementation scope.

2. **Offense Code Dropdown**: Used existing `getOffenseCodesForForm()` instead of creating new `getDisciplineCodesForForm()` - same functionality.

3. **Supabase Nested Relations**: Fixed TypeScript errors with nested relation handling - Supabase returns objects for single joins, but TypeScript infers arrays. Solution: check for array and extract first element if needed.

4. **syncTrespassTrackerStatus Call**: Fixed function signature - only takes 2 args (tenantId, schoolId), not 3.

5. **Room Separation Validation**: `updatePlacement()` validates room assignments using existing `getAvailableRoomsForStudent()` which already handles separation constraints.

6. **Days Recalculation**: When `days_assigned` changes, automatically recalculates `days_remaining` and `expected_end_date` using `calculateExpectedEndDate()` from Story 2-7.

7. **UX Discovery**: During implementation, identified that separate edit page creates UX fragmentation (two edit buttons, navigation away from context, inconsistent patterns). Current implementation is functional but not optimal. See `docs/sessions/ux-refactor-story-2-8-planning.md` for full analysis. Inline editing approach created as Story 2-8b via correct-course workflow.

### File List

**New Files:**
- `app/daep/placements/[id]/edit/page.tsx` - Edit placement server page
- `components/daep/placements/EditPlacementForm.tsx` - Edit form component

**Modified Files:**
- `lib/validation/schemas.ts` - Added `UpdatePlacementSchema` and `UpdatePlacementInput` type
- `app/actions/daep/placements.ts` - Added `PlacementForEdit` interface, `getPlacementForEdit()`, `UpdatePlacementResult` interface, `updatePlacement()`
- `components/daep/CurrentPlacementCard.tsx` - Added Edit button linking to edit page

**Existing Files Used (no changes):**
- `components/daep/placements/StatusTransitionActions.tsx` - From Story 2-6
- `components/daep/shared/PlacementStatusBadge.tsx` - From Story 2-6
- `components/daep/shared/DaysProgressBar.tsx` - From Story 2-7
- `lib/daep/placement-state-machine.ts` - State machine utilities
- `lib/daep/days-remaining.ts` - Days calculation utilities
- `app/actions/daep/rooms.ts` - `getAvailableRoomsForStudent()` for separation validation

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-29 | SM Agent | Story drafted from validated tech spec |
| 2025-11-29 | Dev Agent | Story implemented - all ACs satisfied |
