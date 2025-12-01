# Epic 2 & 2b Execution Order

**Generated:** 2025-11-29
**Purpose:** Exact sequence for implementing remaining stories

---

## Current Status (as of 2025-11-29)

### Epic 2: Placement Management
| Story | Status | Notes |
|-------|--------|-------|
| 2-1 Student Search List View | ✅ done | |
| 2-2 Student Profile Page | ✅ done | |
| 2-3 TrespassTracker Status Display | ✅ done | |
| 2-4 Create New Placement | ✅ done | |
| 2-5 Room Assignment + Separation | ✅ done | |
| 2-6 Placement Lifecycle State Machine | backlog | Tech spec exists |
| 2-7 Days Remaining Calculation | backlog | Tech spec exists |
| 2-8 Edit Placement | backlog | Tech spec exists |
| 2-9 Transition Workflow | backlog | Tech spec exists |
| 2-10 Prevent Duplicate Placements | ✅ done | |
| 2-11 Rollover Student Handling | backlog | Tech spec exists |
| 2-12 No-Show Student Tracking | backlog | Tech spec exists |
| 2-13 TrespassTracker Sync | backlog | Tech spec exists |

### Epic 2b: Workflow Orchestration (NEW)
| Story | Status | Notes |
|-------|--------|-------|
| 2b-1 through 2b-X | not created | Defined in brainstorm session |

---

## EXECUTION ORDER

### Part 1: Finish Epic 2 Foundation

Execute these **in this exact order**:

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Story 2-6 (Placement Lifecycle State Machine)           │
├─────────────────────────────────────────────────────────────────┤
│ Tech Spec: docs/sprint-artifacts/daep/tech-spec-stories-2-6-2-7.md
│ Why First: Core state machine needed for all other placement ops
│ Dependencies: None (builds on 2-1 through 2-5)
│
│ Checklist:
│ □ Read tech spec
│ □ Create story file (if not exists)
│ □ Build context
│ □ Mark ready-for-dev
│ □ Implement
│ □ Test
│ □ Mark done
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Story 2-7 (Days Remaining Calculation)                  │
├─────────────────────────────────────────────────────────────────┤
│ Tech Spec: docs/sprint-artifacts/daep/tech-spec-stories-2-6-2-7.md
│ Why Next: End date calculation needed for review triggers
│ Dependencies: 2-6 (uses placement states)
│
│ Checklist:
│ □ Read tech spec
│ □ Create story file (if not exists)
│ □ Build context
│ □ Mark ready-for-dev
│ □ Implement
│ □ Test
│ □ Mark done
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Story 2-8 (Edit Placement)                              │
├─────────────────────────────────────────────────────────────────┤
│ Tech Spec: docs/sprint-artifacts/daep/tech-spec-stories-2-8-2-9.md
│ Why Next: Need to edit placements before transitions
│ Dependencies: 2-6, 2-7
│
│ Checklist:
│ □ Read tech spec
│ □ Create story file (if not exists)
│ □ Build context
│ □ Mark ready-for-dev
│ □ Implement
│ □ Test
│ □ Mark done
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Story 2-9 (Transition Workflow)                         │
├─────────────────────────────────────────────────────────────────┤
│ Tech Spec: docs/sprint-artifacts/daep/tech-spec-stories-2-8-2-9.md
│ Why Next: Transitions depend on edit capability
│ Dependencies: 2-6, 2-7, 2-8
│
│ Checklist:
│ □ Read tech spec
│ □ Create story file (if not exists)
│ □ Build context
│ □ Mark ready-for-dev
│ □ Implement
│ □ Test
│ □ Mark done
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Story 2-12 (No-Show Student Tracking)                   │
├─────────────────────────────────────────────────────────────────┤
│ Tech Spec: docs/sprint-artifacts/daep/tech-spec-stories-2-11-2-12-2-13.md
│ Why Next: No-show tracking needed before rollover logic
│ Dependencies: 2-6, 2-9 (uses transitions)
│
│ Checklist:
│ □ Read tech spec
│ □ Create story file (if not exists)
│ □ Build context
│ □ Mark ready-for-dev
│ □ Implement
│ □ Test
│ □ Mark done
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Story 2-11 (Rollover Student Handling)                  │
├─────────────────────────────────────────────────────────────────┤
│ Tech Spec: docs/sprint-artifacts/daep/tech-spec-stories-2-11-2-12-2-13.md
│ Why Next: Rollover uses no-show and transition logic
│ Dependencies: 2-9, 2-12
│
│ Checklist:
│ □ Read tech spec
│ □ Create story file (if not exists)
│ □ Build context
│ □ Mark ready-for-dev
│ □ Implement
│ □ Test
│ □ Mark done
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: Story 2-13 (TrespassTracker Sync)                       │
├─────────────────────────────────────────────────────────────────┤
│ Tech Spec: docs/sprint-artifacts/daep/tech-spec-stories-2-11-2-12-2-13.md
│ Why Last: Sync requires all placement logic complete
│ Dependencies: All previous Epic 2 stories
│
│ Checklist:
│ □ Read tech spec
│ □ Create story file (if not exists)
│ □ Build context
│ □ Mark ready-for-dev
│ □ Implement
│ □ Test
│ □ Mark done
│ □ Run Epic 2 retrospective (optional)
└─────────────────────────────────────────────────────────────────┘
```

---

### Part 2: Epic 2b (Workflow Orchestration)

**DO NOT START UNTIL EPIC 2 IS COMPLETE**

Epic 2b builds the kanban workflow layer ON TOP of Epic 2.

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: Create Epic 2b Tech Spec                                │
├─────────────────────────────────────────────────────────────────┤
│ Input: docs/sessions/brainstorm-workflow-pipelines-2025-11-28.md
│ Output: docs/sprint-artifacts/daep/tech-spec-epic-2b.md
│
│ Checklist:
│ □ Review brainstorm document
│ □ Finalize Review Met → Completed flow (open item)
│ □ Create comprehensive tech spec
│ □ Define story breakdown with acceptance criteria
│ □ Add SQL schema additions from brainstorm
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 9: Create Epic 2b Stories (Proposed Order)                 │
├─────────────────────────────────────────────────────────────────┤
│ 2b-1: Pending Actions Component (Foundation)
│       - Must come before workflow triggers can populate it
│       - Role-based task queue UI
│
│ 2b-2: Rooms Tab (Active Students View)
│       - Table view with room filter
│       - Quick notes dropdown
│       - Attendance entry capability
│
│ 2b-3: Intake Pipeline - Approved Column
│       - CSV import flow
│       - Verification badge logic
│       - Side-by-side reconciliation view
│
│ 2b-4: Intake Pipeline - Scheduled Column
│       - Room picker with occupancy
│       - Time slot picker
│       - Translator flag
│       - Calendar/notification triggers
│
│ 2b-5: Intake Pipeline - Arrived/No-Show Columns
│       - Arrived Today cards
│       - No-Show contact log
│       - Exit to Placement Pipeline trigger
│
│ 2b-6: Placement Pipeline - At-Risk Column
│       - Threshold configuration (DAEP Settings)
│       - Auto-population logic
│       - Manual clear capability
│
│ 2b-7: Placement Pipeline - Review Columns
│       - Ready for Review (computed)
│       - Review Met (manual)
│       - One-page review screen
│       - Admin notes (internal)
│
│ 2b-8: Placement Pipeline - Completed Column
│       - Exit triggers
│       - Withdrawal workflow
│       - Database retention
│
│ 2b-9: Drag Confirmation & User Preferences
│       - Confirmation modals for external triggers
│       - "Don't show again" per-user setting
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start Command

To begin, open a new session and type:

```
Read docs/sprint-artifacts/daep/tech-spec-stories-2-6-2-7.md

Then follow the workflow in docs/workflows/story-development-workflow.md
```

---

## Dependency Map

```
Epic 2 (Foundation):
2-1 ─┬─> 2-2 ─┬─> 2-4 ─┬─> 2-6 ─┬─> 2-7 ─┬─> 2-8 ─┬─> 2-9 ─┬─> 2-12 ─┬─> 2-11 ─┬─> 2-13
     │        │        │        │        │        │        │         │         │
     └─> 2-3  └─> 2-5  │        │        │        │        │         │         │
          │        │   └────────┴────────┴────────┴────────┴─────────┴─────────┘
          └────────┴──────────────> 2-10 (done)

Epic 2b (Overlay - after Epic 2 complete):
2b-1 ─> 2b-2 ─> 2b-3 ─> 2b-4 ─> 2b-5 ─> 2b-6 ─> 2b-7 ─> 2b-8 ─> 2b-9
  │       │       │       │       │       │       │       │       │
  └───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┘
                    All depend on Epic 2 being complete
```

---

## Files Referenced

| Document | Location |
|----------|----------|
| Story Development Workflow | `docs/workflows/story-development-workflow.md` |
| Sprint Status | `docs/sprint-artifacts/sprint-status.yaml` |
| Tech Spec 2-6, 2-7 | `docs/sprint-artifacts/daep/tech-spec-stories-2-6-2-7.md` |
| Tech Spec 2-8, 2-9 | `docs/sprint-artifacts/daep/tech-spec-stories-2-8-2-9.md` |
| Tech Spec 2-11, 2-12, 2-13 | `docs/sprint-artifacts/daep/tech-spec-stories-2-11-2-12-2-13.md` |
| Workflow Brainstorm | `docs/sessions/brainstorm-workflow-pipelines-2025-11-28.md` |
