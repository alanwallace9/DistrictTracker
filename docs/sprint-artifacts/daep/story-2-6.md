# Story 2.6: Placement Lifecycle State Machine

**Status:** done
**Epic:** 2 - Placement Management
**Points:** 5
**FRs:** FR21

---

## Story

As a **DAEP administrator**,
I want **placements to follow a defined state machine (Pending → Active → Met → Complete)**,
So that **I can track student progress through their DAEP placement with clear status transitions and audit trail**.

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 2.6.1 | Placement states: Pending, Active, Met, Complete | All 4 states exist in system |
| 2.6.2 | Visual state indicator on placement card | Status badge with correct color |
| 2.6.3 | State transition buttons based on current state | Only valid transitions shown |
| 2.6.4 | Pending → Active: Auto on attendance OR manual button | Status changes, start_date set |
| 2.6.5 | Active → Met: "Review Met" button (days complete) | review_met_date recorded |
| 2.6.6 | Met → Complete: Requires meeting + first day back | Both fields validated |
| 2.6.7 | All transitions logged to `daep_placement_transitions` | Audit trail complete |
| 2.6.8 | Invalid transitions rejected with error | Error message shows valid options |
| 2.6.9 | TrespassTracker sync on completion | is_daep flag updated |
| 2.6.10 | Met status triggers notifications | Parent email, staff notifications (placeholder for Epic 7) |

---

## Tasks / Subtasks

### Task 1: Database Migration - Transitions Table (AC: 2.6.7)

- [x] 1.1 Create migration for `daep_placement_transitions` table
  - `id`: UUID primary key
  - `tenant_id`: TEXT NOT NULL
  - `placement_id`: UUID FK to daep_placements
  - `from_status`: TEXT (nullable for initial state)
  - `to_status`: TEXT NOT NULL
  - `transition_reason`: TEXT
  - `transitioned_by`: TEXT NOT NULL (user ID)
  - `transitioned_at`: TIMESTAMPTZ DEFAULT NOW()
  - `notes`: TEXT
- [x] 1.2 Add indexes on `placement_id` and `tenant_id`
- [x] 1.3 Enable RLS with tenant policy

### Task 2: Update Validation Schemas (AC: 2.6.1)

- [x] 2.1 Update `PLACEMENT_STATUSES` in `lib/validation/schemas.ts`
  - Change from `['pending', 'active', 'transition', 'complete']`
  - To `['pending', 'active', 'met', 'complete']`
- [x] 2.2 Add `PlacementTransitionSchema`
  - `placement_id`: UUID required
  - `to_status`: enum of PLACEMENT_STATUSES
  - `transition_reason`: string optional
  - `notes`: string optional
  - `transition_meeting_date`: date string optional
  - `first_day_back_date`: date string optional

### Task 3: Server Actions - State Transitions (AC: 2.6.3, 2.6.4, 2.6.5, 2.6.6, 2.6.7, 2.6.8)

- [x] 3.1 Add `VALID_TRANSITIONS` map to `lib/daep/placement-state-machine.ts`
  ```typescript
  const VALID_TRANSITIONS = {
    pending: ['active'],
    active: ['met'],
    met: ['complete'],
    complete: [], // Terminal state
  };
  ```
- [x] 3.2 Implement `getValidTransitions(currentStatus)` function
- [x] 3.3 Implement `transitionPlacement(input)` server action
  - Validate transition is allowed
  - Set status-specific fields:
    - `active`: set `start_date = today`
    - `met`: set `review_met_date = today`
    - `complete`: set `actual_end_date`, `transition_meeting_date`, `first_day_back_date`, `completion_notes`
  - Create transition log in `daep_placement_transitions`
  - Trigger notifications on `met` status (placeholder)
  - Sync TrespassTracker on `complete`
  - Log to audit trail

### Task 4: Auto-Activate on Attendance (AC: 2.6.4)

- [x] 4.1 Implement `autoActivatePlacementOnAttendance(tenantId, studentSchoolId, attendanceStatus)`
  - Only activate on `present` or `tardy` (NOT `absent`)
  - Find pending placement for student
  - Transition to `active` with reason "Auto-activated on attendance"
- [x] 4.2 Document integration point for Epic 3 attendance recording
  - Add comment in code: "Call from attendance recording action"

### Task 5: TrespassTracker Sync (AC: 2.6.9)

- [x] 5.1 Implement `syncTrespassTrackerStatus(tenantId, schoolId)`
  - Check if student has any non-complete placements
  - Update `trespass_records.is_daep` flag accordingly
- [x] 5.2 Call sync on placement completion

### Task 6: Placement Status Badge Component (AC: 2.6.2)

- [x] 6.1 Create `components/daep/shared/PlacementStatusBadge.tsx`
  - Props: `status`, `size`
  - Status colors:
    - `pending`: Yellow/Warning
    - `active`: Green/Success
    - `met`: Blue/Info
    - `complete`: Gray
  - Use theme CSS variables (no hardcoded colors)

### Task 7: Status Transition Actions Component (AC: 2.6.3, 2.6.4, 2.6.5, 2.6.6)

- [x] 7.1 Create `components/daep/placements/StatusTransitionActions.tsx`
  - Props: `placementId`, `currentStatus`, `daysRemaining`, `onTransition`
  - Show only valid transition buttons based on current status
  - Button labels:
    - pending → active: "Activate Placement"
    - active → met: "Mark Requirements Met" (disabled if days_remaining > 0)
    - met → complete: "Complete Placement"
- [x] 7.2 Implement transition confirmation dialog
  - Show from/to status
  - Required fields based on target status:
    - `complete`: Transition Meeting Date, First Day Back
  - Optional notes field for all transitions
- [x] 7.3 Handle loading and error states
  - Disable buttons during transition
  - Show toast on success/error

### Task 8: Integration Points

- [x] 8.1 Add `PlacementStatusBadge` to `CurrentPlacementCard`
- [x] 8.2 Add `StatusTransitionActions` to student profile placement section
- [x] 8.3 Update placement list to show new status badge (updated StudentFilters and StudentListTable)

---

## Dev Notes

### State Machine Diagram

```
┌─────────────┐   attendance    ┌─────────────┐    days met     ┌─────────────┐   meeting +    ┌─────────────┐
│   PENDING   │────────────────▶│   ACTIVE    │────────────────▶│     MET     │───first day───▶│  COMPLETE   │
│ (scheduled) │  (present/tardy)│ (at DAEP)   │                 │  (review)   │    back        │  (closed)   │
└─────────────┘   OR manual btn └─────────────┘                 └─────────────┘               └─────────────┘
       │                               │                               │
       │                               │                               │
       │                               │                               │
       └───────────────────────────────┴───────────────────────────────┘
                                    │
                             appeal/early term
                             (mark complete with notes)
```

### Status vs Kanban Column

**Important distinction (per PO review session 2025-11-29):**

- **Placement Status** (`status` field): Lifecycle stage - `pending`, `active`, `met`, `complete`
- **Kanban Column** (`intake_stage` field): Workflow position - handled in Epic 2B

A student can be:
- Status: `pending` + Kanban: `no_show` (missed intake, still pending)
- Status: `pending` + Kanban: `scheduled` (intake date set)
- Status: `active` + Kanban: N/A (intake complete)

### What's NOT a Status

These are workflow states or processes, not placement statuses:
- `no_show` → Kanban column position (Epic 2B)
- `appealed` → Workflow process, student stays pending/active
- `cancelled` → Use `complete` with notes

### Button Visibility by Role

| Status | Buttons | Visible To |
|--------|---------|------------|
| Pending | Start Placement, Edit | Admin, DAEP Staff |
| Active | Edit, Review Met | Admin, DAEP Staff |
| Met | Edit, Complete, Revert | Admin only |
| Complete | Edit (notes only) | Admin only |

### Met Status Triggers

When a placement transitions to `met`:
1. Log transition in `daep_placement_transitions`
2. Placeholder for Epic 7 notifications:
   - Parent email notification
   - Home campus staff notification
   - DAEP staff notification

### Dependency on Story 2-7

This story uses `days_remaining` from Story 2-7 to:
- Enable/disable "Review Met" button (only enabled when days_remaining = 0)
- Display progress in status area

### Project Structure Notes

```
lib/
└── validation/
    └── schemas.ts              # MODIFY - Update PLACEMENT_STATUSES, add PlacementTransitionSchema

app/actions/daep/
└── placements.ts               # MODIFY - Add transition actions

components/daep/
├── shared/
│   └── PlacementStatusBadge.tsx   # NEW
└── placements/
    └── StatusTransitionActions.tsx # NEW

supabase/migrations/
└── YYYYMMDD_create_placement_transitions.sql  # NEW
```

### Learnings from Previous Story

**From Story 2-5 (Status: done)**

- **Room Actions Pattern**: Tenant isolation with `getTenantId()`, role checking with `checkDAEPAdminRole()`
- **Audit Logging**: Use `logAuditEvent()` consistently - placement transitions should follow same pattern
- **Validation Schemas**: `AssignRoomSchema`, `CreateSeparationSchema` patterns to follow
- **Soft Delete Pattern**: Separations use `active = false` for soft delete - transitions table is append-only (no deletes)
- **Bidirectional Logic**: Separation creates two-way relationship - placement transitions are one-way (from → to)

[Source: docs/sprint-artifacts/daep/story-2-5.md#Dev-Agent-Record]

**From Story 2-7 (Dependency)**

- `calculateDaysInfo()` returns `days_remaining` needed for "Review Met" button enable/disable
- `DaysProgressBar` component available for status display integration

### References

- [Source: docs/sprint-artifacts/daep/tech-spec-stories-2-6-2-7.md] - Full implementation spec
- [Source: docs/reference/epics-part1.md#Story-2.6] - Epic definition
- [Source: docs/sessions/ux-design-specification.md] - UX patterns

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/daep/story-2-6.context.xml

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None

### Completion Notes List

- **Migration**: Created `daep_placement_transitions` table with RLS, indexes, and `review_met_date` column on placements
- **Schema Update**: Changed PLACEMENT_STATUSES from 'transition' to 'met'; added PlacementTransitionSchema
- **State Machine**: Implemented strict flow: pending → active → met → complete (no skip transitions)
- **Server Actions**: transitionPlacement() with validation, audit logging, and TrespassTracker sync
- **Auto-Activation**: autoActivatePlacementOnAttendance() ready for Epic 3 integration
- **Components**: PlacementStatusBadge and StatusTransitionActions with confirmation dialog
- **Integration**: Updated CurrentPlacementCard, StudentFilters, StudentListTable with 'met' status support

### File List

**New Files:**
- supabase/migrations/20251129200000_create_placement_transitions.sql
- lib/daep/placement-state-machine.ts
- components/daep/shared/PlacementStatusBadge.tsx
- components/daep/placements/StatusTransitionActions.tsx

**Modified Files:**
- lib/validation/schemas.ts (PLACEMENT_STATUSES, PlacementTransitionSchema)
- app/actions/daep/placements.ts (transitionPlacement, autoActivate, syncTrespassTracker)
- components/daep/CurrentPlacementCard.tsx (PlacementStatusBadge, StatusTransitionActions)
- app/daep/(main)/students/page.tsx (statusOrder update)
- components/daep/StudentFilters.tsx (met status label)
- components/daep/StudentListTable.tsx (met status colors/label)

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-29 | SM Agent | Story drafted from validated tech spec |
| 2025-11-29 | Dev Agent | Implemented all 8 tasks, build passes |
| 2025-11-29 | SM Agent | Senior Developer Review completed |

---

## Senior Developer Review (AI)

### Reviewer
Alan (SM Agent)

### Date
2025-11-29

### Outcome
**APPROVED** - All issues resolved

~~One MEDIUM severity issue identified: legacy 'transition' status references remain in two active placement check queries.~~ **FIXED**

### Summary

The implementation is comprehensive and well-structured. All 10 acceptance criteria have evidence of implementation, and all 8 tasks with their subtasks were verified as complete. Code follows established patterns from prior stories (tenant isolation, audit logging, Zod validation). The state machine logic is clean and properly separated. One bug was found where two queries still reference the old 'transition' status instead of 'met'.

### Key Findings

**MEDIUM Severity:**
- [ ] [Med] `searchStudentsForPlacement()` at line 211 uses `['pending', 'active', 'transition']` instead of `['pending', 'active', 'met']` - students with 'met' status won't be flagged as having active placements [file: app/actions/daep/placements.ts:211]
- [ ] [Med] `checkActivePlacement()` at line 284 uses `['pending', 'active', 'transition']` instead of `['pending', 'active', 'met']` - could allow duplicate placements for students in 'met' status [file: app/actions/daep/placements.ts:284]

**LOW Severity:**
- Note: Empty if block at lines 926-928 could be cleaned up (comment-only block for pending → active transition)

### Acceptance Criteria Coverage

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| 2.6.1 | Placement states: Pending, Active, Met, Complete | IMPLEMENTED | `lib/validation/schemas.ts:307` - PLACEMENT_STATUSES array |
| 2.6.2 | Visual state indicator on placement card | IMPLEMENTED | `components/daep/shared/PlacementStatusBadge.tsx:23-32`, used in `CurrentPlacementCard.tsx:47` |
| 2.6.3 | State transition buttons based on current state | IMPLEMENTED | `StatusTransitionActions.tsx:151-173` - renders valid buttons via `getValidTransitions()` |
| 2.6.4 | Pending → Active: Auto on attendance OR manual button | IMPLEMENTED | Manual: `StatusTransitionActions.tsx:63-70`, Auto: `placements.ts:1018-1104` |
| 2.6.5 | Active → Met: "Review Met" button (days complete) | IMPLEMENTED | `StatusTransitionActions.tsx:71-78`, disabled when `daysRemaining > 0` at line 157 |
| 2.6.6 | Met → Complete: Requires meeting + first day back | IMPLEMENTED | Server validation: `placements.ts:909-917`, UI fields: `StatusTransitionActions.tsx:79-87` |
| 2.6.7 | All transitions logged to daep_placement_transitions | IMPLEMENTED | Migration creates table, `placements.ts:952-968` inserts transition log |
| 2.6.8 | Invalid transitions rejected with error | IMPLEMENTED | `placements.ts:890-899` - validation with descriptive error message |
| 2.6.9 | TrespassTracker sync on completion | IMPLEMENTED | `placements.ts:971-973` calls `syncTrespassTrackerStatus()` defined at lines 1112-1153 |
| 2.6.10 | Met status triggers notifications | PLACEHOLDER | Correctly noted as placeholder for Epic 7 per story definition |

**Summary: 10 of 10 acceptance criteria implemented (1 is intentional placeholder)**

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| 1.1 Create migration for transitions table | [x] | VERIFIED | `20251129200000_create_placement_transitions.sql:5-16` |
| 1.2 Add indexes | [x] | VERIFIED | Migration lines 19-22, three indexes created |
| 1.3 Enable RLS with tenant policy | [x] | VERIFIED | Migration lines 24-30 |
| 2.1 Update PLACEMENT_STATUSES | [x] | VERIFIED | `schemas.ts:307` - changed to 'met' |
| 2.2 Add PlacementTransitionSchema | [x] | VERIFIED | `schemas.ts:381-395` |
| 3.1 Add VALID_TRANSITIONS map | [x] | VERIFIED | `placement-state-machine.ts:16-21` |
| 3.2 Implement getValidTransitions() | [x] | VERIFIED | `placement-state-machine.ts:27-29` |
| 3.3 Implement transitionPlacement() | [x] | VERIFIED | `placements.ts:855-1005` with all required logic |
| 4.1 Implement autoActivatePlacementOnAttendance() | [x] | VERIFIED | `placements.ts:1018-1104` |
| 4.2 Document integration point | [x] | VERIFIED | JSDoc comment at lines 1010-1017 |
| 5.1 Implement syncTrespassTrackerStatus() | [x] | VERIFIED | `placements.ts:1112-1153` |
| 5.2 Call sync on completion | [x] | VERIFIED | `placements.ts:971-973` |
| 6.1 Create PlacementStatusBadge.tsx | [x] | VERIFIED | `components/daep/shared/PlacementStatusBadge.tsx` |
| 7.1 Create StatusTransitionActions.tsx | [x] | VERIFIED | `components/daep/placements/StatusTransitionActions.tsx` |
| 7.2 Implement confirmation dialog | [x] | VERIFIED | Lines 175-248 with required fields logic |
| 7.3 Handle loading/error states | [x] | VERIFIED | isLoading state, toast notifications, disabled buttons |
| 8.1 Add PlacementStatusBadge to CurrentPlacementCard | [x] | VERIFIED | `CurrentPlacementCard.tsx:47` |
| 8.2 Add StatusTransitionActions to student profile | [x] | VERIFIED | `CurrentPlacementCard.tsx:174-180` |
| 8.3 Update placement list with new status | [x] | VERIFIED | `StudentFilters.tsx:41`, `StudentListTable.tsx:33`, `students/page.tsx:125` |

**Summary: 19 of 19 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

- No automated tests exist for the state machine logic
- Manual testing paths defined in story ACs
- Recommend: Unit tests for `isValidTransition()` and `getValidTransitions()` in future

### Architectural Alignment

- **Tech-spec compliance**: Follows `tech-spec-stories-2-6-2-7.md` state machine design
- **Patterns followed**:
  - Tenant isolation via `getTenantId()` ✓
  - Audit logging via `logAuditEvent()` ✓
  - Zod validation schemas ✓
  - Separation of sync utilities from server actions ✓
- **No architecture violations detected**

### Security Notes

- RLS policy correctly implemented on transitions table
- Tenant ID checked in all queries
- User authentication verified before mutations
- No SQL injection risks (parameterized queries)

### Best-Practices and References

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) - 'use server' pattern correctly applied
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security) - tenant isolation pattern
- [Zod Validation](https://zod.dev/) - schema validation for type safety

### Action Items

**Code Changes Required:**
- [x] [Med] Update `searchStudentsForPlacement()` to use `['pending', 'active', 'met']` instead of `['pending', 'active', 'transition']` [file: app/actions/daep/placements.ts:211] - FIXED 2025-11-29
- [x] [Med] Update `checkActivePlacement()` to use `['pending', 'active', 'met']` instead of `['pending', 'active', 'transition']` [file: app/actions/daep/placements.ts:284] - FIXED 2025-11-29

**Advisory Notes:**
- Note: Consider removing empty comment block at lines 926-928 (cosmetic, no action required)
- Note: Add unit tests for state machine functions in future sprint
