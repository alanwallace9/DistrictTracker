 the t# Story Development Workflow

**Purpose:** Step-by-step process for implementing each story. Follow this checklist sequentially.

---

## Per-Story Workflow Checklist

For each story, complete these steps **in order**:

### Phase 1: Preparation

```
□ 1. Check sprint-status.yaml for next story
     Command: Read docs/sprint-artifacts/sprint-status.yaml
     Find first story with status: backlog or drafted

□ 2. Check if tech spec exists
     Location: docs/sprint-artifacts/daep/tech-spec-*.md
     If NO tech spec → create one first (see Tech Spec Creation below)
     If YES → proceed to step 3

□ 3. Review tech spec
     Command: /bmad:bmm:workflows:tech-spec (if creating new)
     Or: Read the existing tech spec file
     Confirm: Does spec cover this story's requirements?

□ 4. Create/update story file (if not drafted)
     Command: /bmad:bmm:workflows:create-story
     Or: Manually create in docs/sprint-artifacts/daep/
     Output: {story-key}.md with acceptance criteria and tasks
```

### Phase 2: Context Assembly

```
□ 5. Create story context file
     Command: /bmad:bmm:workflows:story-context
     Output: {story-key}.context.xml
     Contains: Relevant code snippets, schemas, dependencies

□ 6. Mark story as ready-for-dev
     Command: /bmad:bmm:workflows:story-ready
     Updates: sprint-status.yaml status to "ready-for-dev"
```

### Phase 3: Implementation

```
□ 7. Implement the story
     Command: /bmad:bmm:workflows:dev-story
     Or: Manual implementation following story tasks

     During implementation:
     - Complete tasks in order listed in story file
     - Check off subtasks as you go
     - Run tests frequently
     - Don't skip to next task until current is done

□ 8. Verify all acceptance criteria met
     Check each AC in the story file
     Run: npm run build (must pass)
     Run: npm run test (if tests exist)
```

### Phase 4: Review & Completion

```
□ 9. Code review (optional but recommended)
     Command: /bmad:bmm:workflows:code-review
     Appends review notes to story file

□ 10. Mark story as done
      Command: /bmad:bmm:workflows:story-done
      Updates: sprint-status.yaml status to "done"

□ 11. Commit changes
      git add . && git commit -m "feat(daep): Implement Story X.X - [Title]"
```

---

## Tech Spec Creation (When Needed)

If no tech spec exists for the story batch:

```
□ A. Review PRD and Architecture docs
     docs/reference/prd.md
     docs/reference/architecture-part1.md (or part2)

□ B. Create tech spec
     Command: /bmad:bmm:workflows:tech-spec
     Output: docs/sprint-artifacts/daep/tech-spec-story-X-X.md

□ C. Review tech spec for gaps
     Does it cover all acceptance criteria?
     Are implementation details clear?
     Any dependencies on other stories?

□ D. Proceed to story creation (step 4 above)
```

---

## Quick Reference: Status Flow

```
backlog → drafted → ready-for-dev → in-progress → review → done
   ↑          ↑           ↑              ↑          ↑        ↑
   │          │           │              │          │        │
 Start    Story file   Context      Dev working   Code    Complete
         created      assembled                  review
```

---

## Tips

- **One story at a time** - Don't start the next until current is done
- **Don't skip steps** - Each step builds on the previous
- **Trust the story file** - It has all the info you need
- **Check existing code** - Don't recreate what exists
- **Run builds often** - Catch errors early

---

## Common Commands Quick Reference

| Task | Command |
|------|---------|
| Check status | Read `docs/sprint-artifacts/sprint-status.yaml` |
| Create tech spec | `/bmad:bmm:workflows:tech-spec` |
| Create story | `/bmad:bmm:workflows:create-story` |
| Build context | `/bmad:bmm:workflows:story-context` |
| Mark ready | `/bmad:bmm:workflows:story-ready` |
| Implement | `/bmad:bmm:workflows:dev-story` |
| Code review | `/bmad:bmm:workflows:code-review` |
| Mark done | `/bmad:bmm:workflows:story-done` |

---

## Epic 2 Execution Order (Remaining Stories)

Complete these **in this exact order**:

| Step | Story | Title | Tech Spec |
|------|-------|-------|-----------|
| 1 | **2-6** | Placement Lifecycle State Machine | `tech-spec-stories-2-6-2-7.md` |
| 2 | **2-7** | Days Remaining Calculation | `tech-spec-stories-2-6-2-7.md` |
| 3 | **2-8** | Edit Placement | `tech-spec-stories-2-8-2-9.md` |
| 4 | **2-9** | Transition Workflow | `tech-spec-stories-2-8-2-9.md` |
| 5 | **2-12** | No-Show Student Tracking | `tech-spec-stories-2-11-2-12-2-13.md` |
| 6 | **2-11** | Rollover Student Handling | `tech-spec-stories-2-11-2-12-2-13.md` |
| 7 | **2-13** | TrespassTracker Sync | `tech-spec-stories-2-11-2-12-2-13.md` |

**Note:** 2-12 comes BEFORE 2-11 due to dependencies.

---

## Epic 2b Execution Order (Workflow Orchestration)

**PREREQUISITE:** Complete ALL of Epic 2 first!

Epic 2b adds the kanban workflow layer on top of Epic 2.

| Step | Story | Title | Description |
|------|-------|-------|-------------|
| 1 | **2b-1** | Pending Actions Component | Role-based task queue UI (foundation for triggers) |
| 2 | **2b-2** | Rooms Tab | Table view of active students, room filter, quick notes |
| 3 | **2b-3** | Intake Pipeline: Approved | CSV import, verification badge, reconciliation view |
| 4 | **2b-4** | Intake Pipeline: Scheduled | Room picker, time slots, translator flag, triggers |
| 5 | **2b-5** | Intake Pipeline: Arrived/No-Show | Arrived Today cards, contact log, exit triggers |
| 6 | **2b-6** | Placement Pipeline: At-Risk | Threshold config, auto-population, manual clear |
| 7 | **2b-7** | Placement Pipeline: Review | Ready for Review, Review Met, one-page review screen |
| 8 | **2b-8** | Placement Pipeline: Completed | Exit triggers, withdrawal workflow |
| 9 | **2b-9** | Drag Confirmation & Preferences | Confirmation modals, "don't show again" setting |

**Reference:** `docs/sessions/brainstorm-workflow-pipelines-2025-11-28.md`

---

## Full Execution Sequence

```
EPIC 2 (Foundation):
□ 2-6 → □ 2-7 → □ 2-8 → □ 2-9 → □ 2-12 → □ 2-11 → □ 2-13
                                                      ↓
                                            Epic 2 Complete!
                                                      ↓
EPIC 2b (Workflow Overlay):
□ 2b-1 → □ 2b-2 → □ 2b-3 → □ 2b-4 → □ 2b-5 → □ 2b-6 → □ 2b-7 → □ 2b-8 → □ 2b-9
```

---

## Quick Start

**To begin Epic 2 remaining work:**
```
Read docs/sprint-artifacts/daep/tech-spec-stories-2-6-2-7.md
```

**To begin Epic 2b (after Epic 2 done):**
```
Read docs/sessions/brainstorm-workflow-pipelines-2025-11-28.md
Then create: docs/sprint-artifacts/daep/tech-spec-epic-2b.md
```

---

## Patterns & Lessons Learned

### Supabase Joins with Multiple Foreign Keys

**Problem:** When a table has multiple FKs to the same target table, Supabase/PostgREST can't auto-detect which relationship to use.

**Example:** `daep_placements` has 3 FKs to `campuses`:
- `home_campus_id`
- `assigning_campus_id`
- `campus_id`

**WRONG (ambiguous):**
```typescript
.select(`
  id,
  home_campus:campuses(id, name)  // Error: which FK?
`)
```

**CORRECT (explicit FK hint):**
```typescript
.select(`
  id,
  home_campus:campuses!fk_daep_placements_home_campus(id, name)
`)
```

**Before writing any Supabase join:**
```bash
# Search for existing patterns in codebase
grep -r "tablename!" app/actions/
```

Copy the existing pattern. Don't assume.

### Verify Schema Before Assuming Columns Exist

**Lesson (Story 2-8):** Assumed `intake_date` column existed. It didn't.

**Before using a column:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'your_table';
```

Or use `mcp__supabase__list_tables` or check existing queries that use the same table.
