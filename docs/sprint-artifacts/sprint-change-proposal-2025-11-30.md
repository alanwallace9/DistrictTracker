# Sprint Change Proposal

**Date:** 2025-11-30
**Workflow:** correct-course
**Facilitator:** SM Agent (Bob)
**Approver:** Alan (Product Owner)
**Status:** APPROVED

---

## 1. Issue Summary

### Problem Statement

During implementation of Story 2-8 (Edit Placement), a UX fragmentation issue was discovered. The separate edit page approach creates:

1. **Two edit buttons** — Confusing for users (one in header, one on card)
2. **Navigation away from context** — User loses view of student profile during edits
3. **Duplicate code patterns** — Create and Edit forms have similar logic
4. **Inconsistent UX** — Room uses modal, placement uses page

### Discovery Context

- **When:** During Story 2-8 implementation (2025-11-29)
- **How:** Developer and PO review of implemented UI revealed suboptimal user workflow
- **Evidence:** Documented in `docs/sessions/ux-refactor-story-2-8-planning.md`

### Additional Discovery

- **Bug identified:** Offense code auto-changing overnight (21→22) without user action
- **Backlog items captured:** Multiple guardian contacts, room grouping for separation logic

---

## 2. Impact Analysis

### Epic Impact

| Epic | Impact | Details |
|------|--------|---------|
| Epic 2 (Placement Management) | Minor | Add 1 new story (2-8b), 5 additional points |
| Epic 3+ | None | No downstream impact |

### Story Impact

| Story | Status | Change |
|-------|--------|--------|
| 2-8 (Edit Placement) | Done | Add UX discovery note to completion notes |
| 2-8b (NEW) | Drafted | Inline Student & Placement Editing (5 pts) |

### Artifact Conflicts

| Artifact | Conflict | Resolution |
|----------|----------|------------|
| PRD | None | UX pattern change, not requirement change |
| Architecture | None | Same data model, different UI pattern |
| UI/UX Spec | Minor | Document inline editing pattern |

### Technical Impact

- Existing edit page remains functional (fallback)
- Room assignment modal to be replaced with inline dropdown
- New `updateStudent()` server action needed
- Separation logic preserved in all room selection UI

---

## 3. Recommended Approach

### Selected Path: Option D — Split Stories

**Rationale:**

1. **No wasted work** — Story 2-8 is complete and functional
2. **Clear boundaries** — Each story has single responsibility
3. **Velocity preserved** — Shipped what was done, new work is additive
4. **UX improves incrementally** — Inline editing in next sprint
5. **Tech debt avoided** — Not shipping suboptimal UX as final solution

### Alternatives Considered

| Option | Viable | Reason |
|--------|--------|--------|
| A. Ship as-is | Yes | But accumulates UX debt |
| B. Inline pivot (re-scope 2-8) | No | 2-8 already done, would invalidate completed work |
| C. Full refactor now | No | Scope creep, delays Epic 2 |
| **D. Split stories** | **Selected** | Best balance of velocity and quality |

### Effort & Risk

- **Effort:** Low-Medium (5 story points)
- **Risk:** Low (builds on existing patterns)
- **Timeline Impact:** +1 story to Epic 2 backlog

---

## 4. Detailed Change Proposals

### 4.1 Story Updates

**Story 2-8 (Edit Placement)**
- Status: Done (unchanged)
- Change: Added completion note #7 documenting UX discovery
- File: `docs/sprint-artifacts/daep/story-2-8.md`

**Story 2-8b (NEW - Inline Student & Placement Editing)**
- Status: Drafted
- Points: 5
- Scope: Full student record + placement inline editing
- Key features:
  - Edit button on header toggles edit mode
  - Student demographics editable (guardian, campus, grade, etc.)
  - Placement fields editable inline
  - Room dropdown replaces modal (with separation logic)
  - Role-based field access
- File: `docs/sprint-artifacts/daep/story-2-8b.md`

### 4.2 Sprint Status Updates

**File:** `docs/sprint-artifacts/sprint-status.yaml`

```yaml
# Added:
2-8b-inline-student-placement-editing: drafted   # Course correction: UX improvement (5 pts)
```

### 4.3 Bug Reports

**Offense Code Auto-Changing**
- Severity: Medium
- Status: To Investigate
- File: `docs/sprint-artifacts/daep/bug-offense-code-auto-change.md`

### 4.4 Backlog Items

| Item | Priority | File |
|------|----------|------|
| Multiple Guardian Contacts | Medium | `backlog-multiple-guardian-contacts.md` |
| Room Grouping for Separation | HIGH | `backlog-room-grouping-separation.md` |

### 4.5 Documentation Updates

**UX Planning Doc**
- File: `docs/sessions/ux-refactor-story-2-8-planning.md`
- Change: Added "Course Correction Applied" section with all artifact references

---

## 5. Implementation Handoff

### Change Scope Classification: **Minor**

This change can be implemented directly by the development team without requiring backlog reorganization or strategic replanning.

### Handoff Plan

| Role | Responsibility |
|------|----------------|
| SM Agent | Create story 2-8b, update sprint-status |
| Dev Agent | Implement story 2-8b when scheduled |
| PO (Alan) | Prioritize 2-8b in backlog, approve for sprint |

### Implementation Sequence

1. Story 2-8b added to Epic 2 backlog (DONE)
2. PO prioritizes relative to 2-9 through 2-13
3. When ready, SM creates story context for 2-8b
4. Dev implements per acceptance criteria
5. Bug investigation runs in parallel

### Success Criteria

- [ ] Story 2-8b implemented with all ACs passing
- [ ] Inline editing functional on student profile page
- [ ] Room assignment modal replaced with inline dropdown
- [ ] Separation logic preserved in all room selection
- [ ] Edit button consolidated to single location (header)
- [ ] Offense code bug investigated and resolved

---

## 6. Approval

**Decision:** APPROVED

**Approved By:** Alan (Product Owner)
**Date:** 2025-11-30

**Conditions:** None

---

## Artifacts Summary

### Created

| File | Description |
|------|-------------|
| `docs/sprint-artifacts/daep/story-2-8b.md` | New story for inline editing |
| `docs/sprint-artifacts/daep/bug-offense-code-auto-change.md` | Bug report |
| `docs/sprint-artifacts/daep/backlog-multiple-guardian-contacts.md` | Feature request |
| `docs/sprint-artifacts/daep/backlog-room-grouping-separation.md` | HIGH priority enhancement |
| `docs/sprint-artifacts/sprint-change-proposal-2025-11-30.md` | This document |

### Modified

| File | Change |
|------|--------|
| `docs/sprint-artifacts/sprint-status.yaml` | Added 2-8b to backlog |
| `docs/sprint-artifacts/daep/story-2-8.md` | Added UX discovery note |
| `docs/sessions/ux-refactor-story-2-8-planning.md` | Added course correction section |

---

*Generated by correct-course workflow on 2025-11-30*
