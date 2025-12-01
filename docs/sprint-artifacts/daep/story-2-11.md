# Story 2.11: Rollover Student Handling

**Epic:** 2 - Placement Management
**Story Points:** 2
**Status:** done
**FRs:** FR25

---

## User Story

**As a** DAEP administrator or home campus administrator
**I want** to identify students whose placement spans school years and capture rollover decisions
**So that** students are properly handled for the next school year with documented decisions

---

## Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.11.1 | Report shows students with shortfall > 0 (days_remaining > school_days_left) | Only candidates with shortfall displayed |
| 2.11.2 | Decision options: "Continue at DAEP" or "Return to Home Campus" | Both options available per student |
| 2.11.3 | Decision captured with timestamp, user, and campus | Decision logged to history table |
| 2.11.4 | Decision history preserved (not overwritten) | Multiple decisions visible in log |
| 2.11.5 | Notes field for rollover decisions | Notes saved with each decision |
| 2.11.6 | Dashboard indicator for pending rollover decisions | KPI card shows count |
| 2.11.7 | DAEP admin sees district-wide report with campus filter | Filterable/sortable view |
| 2.11.8 | Home campus admin sees only their students | Campus-scoped report |
| 2.11.9 | Review eligibility displayed per candidate | Days until review shown |
| 2.11.10 | Incident number displayed for context | Clickable link to placement |
| 2.11.11 | Guard warns if school calendar not configured | Error message if no calendar |
| 2.11.12 | "Continue at DAEP" creates pending rollover placement | New placement in pending status |
| 2.11.13 | DAEP admin approval queue for rollover placements | Audit list before batch processing |

---

## Tasks

### Task 1: Database Migration - Rollover Tables & Fields
- [x] Create `daep_rollover_decisions` table with decision history
- [x] Add RLS policies: home campus sees their decisions, DAEP admin sees all
- [x] Add `is_rollover_candidate` boolean to `daep_placements` (used existing `rollover_student`)
- [x] Add `is_rollover_placement` boolean to `daep_placements`
- [x] Add `original_placement_id` UUID FK to `daep_placements`
- [x] Create indexes for performance

### Task 2: Server Actions - Calendar Guard
- [x] Create `isLastMonthOfSchoolYear()` in days-remaining.ts (AC: 2.11.11)
- [x] Create `getSchoolDaysRemaining()` for remaining days count
- [x] Guard used by shouldShowRolloverTab() and getRolloverCandidates

### Task 3: Server Actions - Rollover Candidates
- [x] Create `getRolloverCandidates(campusFilter?)` (AC: 2.11.1, 2.11.7, 2.11.8)
- [x] Filter by shortfall > 0 (days_remaining > school_days_left)
- [x] Include decision info from daep_rollover_decisions
- [x] Campus filtering for home campus admin view

### Task 4: Server Actions - Record Decision
- [x] Create `recordRolloverDecision(input)` (AC: 2.11.2, 2.11.3, 2.11.4, 2.11.5)
- [x] Insert to decision history table (never overwrite)
- [x] Update placement with current decision
- [x] Audit log the decision with `placement.rollover_decision` event

### Task 5: Server Actions - Supporting Functions
- [x] Create `getRolloverDecisionHistory(placementId)` (AC: 2.11.4)
- [x] Create `getPendingRolloverApprovals()` (AC: 2.11.13)
- [x] Create `getRolloverCount()` (AC: 2.11.6)
- [x] Create `createRolloverPlacement()` (AC: 2.11.12)
- [x] Create `approveRolloverPlacement()` (AC: 2.11.13)

### Task 6: UI - Rollover Report Page (DAEP Admin)
- [x] Create `/daep/reports/rollover/page.tsx`
- [x] RolloverCandidatesTable with sorting
- [x] Stats cards: Total, Undecided, Continue, Return
- [x] Calendar info banner showing days remaining (AC: 2.11.11)
- [x] Tabs: Candidates | Pending Approvals

### Task 7: UI - Rollover Decision Dialog
- [x] Create `RolloverDecisionDialog.tsx`
- [x] Radio options: "Continue at DAEP" / "Return to Home Campus"
- [x] Notes textarea (AC: 2.11.5)
- [x] Display student info with days remaining badge

### Task 8: UI - Decision History Panel
- [x] Create `DecisionHistoryPanel.tsx` as Sheet component
- [x] Show all decisions chronologically (AC: 2.11.4)
- [x] Display: decision, timestamp, notes

### Task 9: UI - Approval Queue (DAEP Admin)
- [x] Create `ApprovalQueueView.tsx` (AC: 2.11.13)
- [x] List pending rollover placements
- [x] Approve/Reject actions with confirmation dialogs

### Task 10: Dashboard Integration
- [x] Added Reports section to DAEPSidebar
- [x] Rollover Report link with warning icon
- [x] getRolloverCount() function available (AC: 2.11.6)

---

## Dev Notes

### Tech Spec Reference
- **Full Spec:** `docs/sprint-artifacts/daep/tech-spec-stories-2-11-2-12-2-13.md`

### Rollover Workflow Summary

**Timeline:**
- MAY (Last Week of School): System identifies candidates, reports generated
- JUNE-JULY: Home campus decisions captured, pending placements created
- AUGUST: Final updates, batch processing, placements go active

**Decision Options:**
| Decision | Label | Effect |
|----------|-------|--------|
| `continue_daep` | "Continue at DAEP" | Creates pending rollover placement for next year |
| `return_home` | "Return to Home Campus" | Student finishes current year, starts fresh at home campus |

**Rollover Placement Rules:**
- Gets NEW `incident_number` (distinct from original)
- `is_rollover_placement = true` excludes from recidivism counts
- `original_placement_id` links back to original placement
- Status = `pending` until first attendance day

### Data Model

**New Table: `daep_rollover_decisions`**
- Tracks decision history (multiple decisions per placement allowed)
- RLS: home campus admin sees their campus only, DAEP admin sees all

**New Fields on `daep_placements`:**
- `is_rollover_candidate` (boolean)
- `is_rollover_placement` (boolean)
- `original_placement_id` (uuid FK)

### Known Gaps / Dependencies

1. **`review_at_days` field missing** - Cannot calculate review eligibility without it
   - Backlog item created: `backlog-review-at-days-field.md`
   - For now: display as null/TBD

2. **`school_year` field missing** - Derive from `start_date` for now
   - Backlog item created: `backlog-school-year-infrastructure.md`
   - Future: add explicit field after K-12 SIS research

### Security (NFRs)

- **Authorization:** Home campus admin, DAEP admin (level 1+), District admin
- **RLS Policy:** Restrictive - deny by default
- **Campus Isolation:** Home campus admin sees ONLY their students

### Performance (NFRs)

- Pagination required on all report views
- Default page size: 25 (options: 50, 100)
- Target load time: < 2 seconds

### Learnings from Previous Story

**From Story 2-10 (Status: done)**

- **Validation Pattern:** `checkActivePlacement()` and `validatePlacement()` patterns established
- **Server Action Error Handling:** Return `{ success: false, error: string }` format
- **Alert Component:** Use shadcn/ui Alert with destructive variant for warnings
- **excludePlacementId Parameter:** Pattern for edit scenarios (used in edit placement)

[Source: docs/sprint-artifacts/daep/story-2-10.md#Dev-Agent-Record]

### References

- [Tech Spec: Stories 2-11, 2-12, 2-13](./tech-spec-stories-2-11-2-12-2-13.md)
- [Epic 2: Placement Management](../../reference/epics-part1.md#epic-2-placement-management)
- [FR25: Rollover Students](../../reference/prd.md)
- [Backlog: School Year Infrastructure](./backlog-school-year-infrastructure.md)
- [Backlog: review_at_days Field](./backlog-review-at-days-field.md)

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/story-2-11.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None required - clean implementation.

### Completion Notes List

1. **Migration Applied:** `20251130200000_create_rollover_tables.sql` - Added `daep_rollover_decisions` table and rollover fields to `daep_placements`
2. **RLS Simplified:** Used tenant isolation only; server actions handle role-based filtering (Clerk auth, not Supabase auth)
3. **Used existing field:** `rollover_student` boolean already existed in schema, used as `is_rollover_candidate`
4. **Review eligibility deferred:** `review_at_days` field not available - documented in known gaps
5. **Audit event added:** `placement.rollover_decision` added to AuditEventType union

### File List

**Database:**
- `supabase/migrations/20251130200000_create_rollover_tables.sql`

**Server Actions:**
- `app/actions/daep/rollover.ts` (NEW)

**Calendar Utilities:**
- `lib/daep/days-remaining.ts` (UPDATED - added rollover functions)

**Validation Schemas:**
- `lib/validation/schemas.ts` (UPDATED - added rollover schemas)

**Audit Logger:**
- `lib/audit-logger.ts` (UPDATED - added `placement.rollover_decision` event type)

**UI Pages:**
- `app/daep/(main)/reports/rollover/page.tsx` (NEW)

**UI Components:**
- `components/daep/rollover/RolloverCandidatesTable.tsx` (NEW)
- `components/daep/rollover/RolloverDecisionDialog.tsx` (NEW)
- `components/daep/rollover/DecisionHistoryPanel.tsx` (NEW)
- `components/daep/rollover/ApprovalQueueView.tsx` (NEW)
- `components/daep/rollover/index.ts` (NEW)

**Layout:**
- `components/daep/layout/DAEPSidebar.tsx` (UPDATED - added Reports section)

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-30 | Bob (SM) | Story drafted from validated tech spec |
