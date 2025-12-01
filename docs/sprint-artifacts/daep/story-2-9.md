# Story 2.9: Transition Workflow

**Status:** done
**Epic:** 2 - Placement Management
**Points:** 3
**FRs:** FR21, FR22

---

## Story

As a **DAEP administrator**,
I want **to process a student's transition back to home campus with notifications**,
So that **the return process is documented, tracked, and home campus admins are informed**.

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 2.9.1 | "Initiate Transition" available when status = 'met' | Button visible for eligible placements |
| 2.9.2 | Transition form captures meeting date | Date picker validates future date |
| 2.9.3 | Transition form captures campus contact person | Name field required |
| 2.9.4 | In-app notification created for home campus admins | Notification record(s) created |
| 2.9.5 | "Complete Transition" requires meeting confirmation | Modal with meeting date display |
| 2.9.6 | "Complete Transition" requires first day back date | Date field required |
| 2.9.7 | Status moves to Complete after confirmation | Placement status updated to 'complete' |
| 2.9.8 | TrespassTracker is_daep flag updated on completion | Flag synced via syncTrespassTrackerStatus() |
| 2.9.9 | Transition history visible on student profile | Timeline shows transitions |

---

## Tasks / Subtasks

### Task 1: Server Actions for Transition Workflow (AC: 2.9.1, 2.9.2, 2.9.3, 2.9.4)

- [x] 1.1 Add `initiateTransition()` to `app/actions/daep/placements.ts`
  - Accept: `placement_id`, `transition_meeting_date`, `campus_contact_name`, `campus_contact_email?`, `notes?`
  - Validate placement is in 'met' status
  - Validate meeting date is in the future
  - Update placement with `transition_requested_date` and `transition_meeting_date`
  - Log to `daep_placement_transitions` (status stays 'met', just logging meeting scheduled)
  - Create notifications for home campus admins (see Task 2)
  - Log audit event

- [x] 1.2 Add `completeTransition()` to `app/actions/daep/placements.ts`
  - Accept: `placement_id`, `first_day_back_date`, `meeting_confirmed`, `completion_notes?`
  - Validate placement is in 'met' status
  - Require `meeting_confirmed = true`
  - Update placement: `status = 'complete'`, `first_day_back_date`, `actual_end_date`
  - Log to `daep_placement_transitions` (met → complete)
  - Sync TrespassTracker via `syncTrespassTrackerStatus()`
  - Log audit event

### Task 2: Home Campus Admin Notifications (AC: 2.9.4)

- [x] 2.1 Query home campus admins
  ```typescript
  // MVP: Hardcoded to 'campus_admin' role. Future: configurable per-campus.
  const { data: homeCampusAdmins } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('campus_id', placement.home_campus_id)  // ONLY this campus
    .eq('role', 'campus_admin')
    .is('deleted_at', null);
  ```

- [x] 2.2 Create notification for each home campus admin
  - Use `user_id` field (recipient), NOT `created_by`
  - Notification type: `'transition_meeting'`
  - Include student name, meeting date, contact person
  - Set `action_url` to student profile page

### Task 3: Initiate Transition Dialog (AC: 2.9.1, 2.9.2, 2.9.3)

- [x] 3.1 Create `components/daep/placements/InitiateTransitionDialog.tsx`
  - Trigger button: "Initiate Transition" (visible when status = 'met')
  - Form fields:
    - `transition_meeting_date` (date picker, min: tomorrow)
    - `campus_contact_name` (required text)
    - `campus_contact_email` (optional email)
    - `notes` (optional textarea)
  - On submit: call `initiateTransition()`
  - Success: close dialog, show toast, refresh

### Task 4: Complete Transition Dialog (AC: 2.9.5, 2.9.6, 2.9.7)

- [x] 4.1 Create `components/daep/placements/CompleteTransitionDialog.tsx`
  - Trigger button: "Complete Transition" (visible when status = 'met' AND meeting scheduled)
  - Display scheduled meeting date
  - Form fields:
    - `meeting_confirmed` (checkbox, required)
    - `first_day_back_date` (date picker, required)
    - `completion_notes` (optional textarea)
  - On submit: call `completeTransition()`
  - Success: close dialog, show toast, refresh

### Task 5: Status Transition Actions Component (AC: 2.9.1)

- [x] 5.1 Updated `components/daep/placements/StatusTransitionActions.tsx`
  - Props: `placementId`, `currentStatus`, `daysRemaining`, `transitionMeetingDate?`, `onTransition`
  - Render appropriate buttons based on state:
    - Status = 'met', no meeting: Show `InitiateTransitionDialog`
    - Status = 'met', meeting scheduled: Show `CompleteTransitionDialog`
    - Status = 'complete': Show "Completed" badge only
  - Use state machine validation

### Task 6: Transition History Component (AC: 2.9.9)

- [x] 6.1 Create `components/daep/placements/TransitionHistory.tsx`
  - Props: `placementId`
  - Fetch via existing `getPlacementTransitions()`
  - Display timeline of status changes
  - Show: from_status → to_status, date, reason, user

- [x] 6.2 Integrate into student profile / edit placement page

### Task 7: Integration with Edit Placement Page

- [x] 7.1 Add `StatusTransitionActions` to `EditPlacementForm`
- [x] 7.2 Add `TransitionHistory` to edit placement page

---

## Dev Notes

### Existing Implementation to Reuse

**Already implemented (Story 2-6):**
- `transitionPlacement()` in `app/actions/daep/placements.ts` - handles state machine
- `getPlacementTransitions()` - fetches transition history
- `syncTrespassTrackerStatus()` - syncs TrespassTracker on completion
- `daep_placement_transitions` table with RLS

**State Machine (from `lib/daep/placement-state-machine.ts`):**
```typescript
// Flow: pending → active → met → complete
isValidTransition(from, to)    // Validate transition
getValidTransitions(status)    // Get valid next states
getStatusDescription(status)   // Human-readable text
```

### Critical: Notification Schema

The `daep_notifications` table uses `user_id` for the RECIPIENT:
```sql
user_id TEXT NOT NULL  -- Clerk user_id (recipient)
```

Do NOT use `created_by` - that field doesn't exist.

### MVP Notification Recipients

Query for home campus admins:
```typescript
// Only notify campus_admin users assigned to the home campus
.eq('campus_id', placement.home_campus_id)
.eq('role', 'campus_admin')
```

**Future:** Per-campus configurable notification lists.
See: `docs/sprint-artifacts/daep/architecture-notes-daep-vs-trespass.md`

### Key Patterns

**Tenant Isolation:**
```typescript
import { getTenantId } from '@/lib/tenant';
const tenantId = await getTenantId();
```

**Audit Logging:**
```typescript
await logAuditEvent({
  eventType: 'placement.transition_initiated',
  module: 'daep_management',
  actorId: user.id,
  targetId: placementId,
  // ...
});
```

### Project Structure

```
components/daep/placements/
├── InitiateTransitionDialog.tsx   # NEW
├── CompleteTransitionDialog.tsx   # NEW
├── StatusTransitionActions.tsx    # NEW
└── TransitionHistory.tsx          # NEW

app/actions/daep/
└── placements.ts                  # MODIFY - add initiateTransition, completeTransition
```

### Non-Functional Requirements

- **Performance:** Dialog load < 500ms, transition save < 1s
- **Security:** All queries use RLS with `tenant_id = get_my_tenant_id()`
- **Reliability:** Notification insert failure doesn't block status update (log warning)
- **Observability:** Audit trail for all transitions

### Dependencies

- Story 2-6 (State Machine) - provides `transitionPlacement()`, state machine utils
- Story 2-7 (Days Calculation) - provides days remaining logic
- Story 2-8 (Edit Placement) - provides edit form structure

### References

- [Tech Spec](./tech-spec-stories-2-8-2-9.md) - Full implementation spec
- [Architecture Notes](./architecture-notes-daep-vs-trespass.md) - Workflow clarifications
- [Epic Definition](../../reference/epics-part1.md#Story-2.9)

---

## Dev Agent Record

### Context Reference
- `docs/sprint-artifacts/daep/story-2-9.context.xml`

### Files Created/Modified

**Server Actions (`app/actions/daep/placements.ts`):**
- Added `initiateTransition()` (lines 1484-1630)
- Added `completeTransition()` (lines 1646-1762)
- Added `getPlacementTransitionInfo()` (lines 1778-1802)
- Updated `PlacementForEdit` interface to include `transition_meeting_date`
- Updated `getPlacementForEdit()` to fetch `transition_meeting_date`

**Validation Schemas (`lib/validation/schemas.ts`):**
- Added `InitiateTransitionSchema` and `InitiateTransitionInput`
- Added `CompleteTransitionSchema` and `CompleteTransitionInput`

**UI Components:**
- Created `components/daep/placements/InitiateTransitionDialog.tsx`
- Created `components/daep/placements/CompleteTransitionDialog.tsx`
- Created `components/daep/placements/TransitionHistory.tsx`
- Updated `components/daep/placements/StatusTransitionActions.tsx` for two-phase workflow
- Updated `components/daep/placements/EditPlacementForm.tsx` to integrate transition components

### AC Satisfaction

| AC | Implementation |
|----|----------------|
| 2.9.1 | `StatusTransitionActions` shows "Initiate Transition" when status='met' |
| 2.9.2 | `InitiateTransitionDialog` captures meeting date with future date validation |
| 2.9.3 | `InitiateTransitionDialog` captures campus contact person (required) |
| 2.9.4 | `initiateTransition()` creates notifications for home campus admins |
| 2.9.5 | `CompleteTransitionDialog` requires meeting confirmation checkbox |
| 2.9.6 | `CompleteTransitionDialog` requires first day back date |
| 2.9.7 | `completeTransition()` updates status to 'complete' |
| 2.9.8 | `completeTransition()` calls `syncTrespassTrackerStatus()` |
| 2.9.9 | `TransitionHistory` displays timeline from `getPlacementTransitions()` |

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-30 | SM Agent | Story drafted from validated tech spec with workflow corrections |
| 2025-11-30 | Dev Agent | Story implemented - all ACs satisfied |
