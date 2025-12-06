# Story 3.2: Point Entry Grid

**Status:** done
**Epic:** 3 - Daily Operations
**Points:** 3
**FRs:** FR27, FR28, FR29

---

## Story

As a **DAEP staff member**,
I want **to view and adjust daily points for each student in my room**,
So that **student progress is tracked seamlessly with minimal manual entry**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Points entry should be **seamless and fit the natural workflow of the day**. Base points are auto-granted when attendance is marked present - staff only need to intervene for adjustments (bonus or deductions). This frees up teacher time to spend with students rather than on data entry.

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 3.2.1 | Room roster shows Today's Total column with running point total per student | Total updates as periods progress |
| 3.2.2 | Base 10 points auto-granted per period when student is marked present | No manual entry needed for base points |
| 3.2.3 | Quick adjust dropdown for point adjustments (+10, +5, 0, -5, -10, -15) | Select adjustment, auto-saves |
| 3.2.4 | Student action dropdown (from tenant's behavior categories) | Populated from settings |
| 3.2.5 | Teacher action dropdown (from tenant's configured actions) | Populated from settings |
| 3.2.6 | Notes field for free-text explanation | Optional, saves with adjustment |
| 3.2.7 | Adjustments saved to `daep_daily_points` table with all metadata | Verify DB record |
| 3.2.8 | Room header shows capacity: "8/12 present (15 max)" | Present count / assigned / capacity |
| 3.2.9 | Color coding for Today's Total based on % of expected by current period | Optional feature, time-aware calculation |
| 3.2.10 | Auto-save on selection/blur with optimistic UI updates | Feels snappy, no save button needed |

---

## Tasks / Subtasks

### Task 1: Create Points Server Actions (AC: 3.2.2, 3.2.7)

- [ ] 1.1 Create `app/actions/daep/points.ts`
- [ ] 1.2 Implement `createBasePoints(placementId, date, period)` server action
  - Called when attendance is marked present
  - Creates entry with `points_earned = 10`, `is_base_points = true`
  - Idempotent - doesn't duplicate if already exists
- [ ] 1.3 Implement `createPointAdjustment(input)` server action
  - Validates input with Zod schema
  - Creates adjustment entry with: adjustment_value, student_action, teacher_action, notes
  - Links to placement, date, period
  - Logs to audit trail
- [ ] 1.4 Implement `getDailyPointsSummary(roomId, date)` server action
  - Returns per-student totals for the day
  - Calculates: base points earned, adjustments, day total
  - Includes period-by-period breakdown if needed
- [ ] 1.5 Add audit event types: `points.base_created`, `points.adjustment_added`

### Task 2: Validation Schemas (AC: 3.2.3, 3.2.4, 3.2.5)

- [ ] 2.1 Add `PointAdjustmentSchema` to `lib/validation/schemas.ts`
  - `placement_id`: UUID required
  - `date`: date string required
  - `period`: string required
  - `adjustment_value`: enum (+10, +5, 0, -5, -10, -15)
  - `student_action`: string optional (from behavior categories)
  - `teacher_action`: string optional (from tenant settings)
  - `notes`: string optional (max 500 chars)
- [ ] 2.2 Add response types for point entries and summaries

### Task 3: Point Adjustment UI Component (AC: 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.10)

- [ ] 3.1 Create `components/daep/roster/PointAdjustmentCell.tsx`
  - Compact button/dropdown to trigger adjustment dialog
  - Shows current period adjustment if exists
- [ ] 3.2 Create `components/daep/roster/PointAdjustmentDialog.tsx`
  - Adjustment dropdown: +10, +5, 0, -5, -10, -15
  - Student action dropdown (from behavior categories)
  - Teacher action dropdown (from tenant settings)
  - Notes textarea
  - Save/Cancel buttons
- [ ] 3.3 Implement optimistic updates
  - Update UI immediately on save
  - Revert on error with user-friendly toast
  - If fails multiple times, suggest feedback page

### Task 4: Today's Total Column (AC: 3.2.1, 3.2.9)

- [ ] 4.1 Create `components/daep/roster/TodaysTotalCell.tsx`
  - Shows: current total / expected by this period
  - Example: "47/50" at 5th period
  - Percentage calculation based on periods completed
- [ ] 4.2 Implement color coding (optional, can toggle)
  - 90%+ = green/blue (on target)
  - 80-89% = yellow (falling behind)
  - Below 80% = red (needs attention)
- [ ] 4.3 Consider adding color key/legend somewhere on page

### Task 5: Room Header Updates (AC: 3.2.8)

- [ ] 5.1 Update room header to show capacity info
  - Format: "8/12 present (15 max)"
  - 8 = currently present this period
  - 12 = assigned to this room
  - 15 = room capacity (legal max in Texas)
- [ ] 5.2 Update as attendance changes

### Task 6: Integrate with Room Roster (AC: 3.2.1)

- [ ] 6.1 Update `RoomRosterTable.tsx` to include new columns
  - Today's Total column
  - Quick Adjust column
  - Notes indicator column
- [ ] 6.2 Update `RoomRosterContext.tsx`
  - Add `dailyPoints: Map<string, DailyPointsSummary>` to context
  - Add `addAdjustment()` action for optimistic updates
- [ ] 6.3 Fetch initial points data in `getRoomRoster()` server action

### Task 7: Attendance Integration (AC: 3.2.2)

- [ ] 7.1 Hook into attendance marking (prep for Story 3-9)
  - When student marked present → call `createBasePoints()`
  - When student marked absent → don't create base points
  - When attendance changed present→absent → handle point removal?
- [ ] 7.2 Define behavior for attendance changes mid-day

### Task 8: Testing & Edge Cases

- [ ] 8.1 Test base points auto-creation on attendance
- [ ] 8.2 Test adjustment with all dropdowns
- [ ] 8.3 Test Today's Total calculation across periods
- [ ] 8.4 Test color coding thresholds
- [ ] 8.5 Test error handling with user-friendly messages
- [ ] 8.6 Test with Playwright MCP

---

## Dev Notes

### Points Model (Clarified)

**Base Points (Automatic):**
- 10 points auto-granted per period when student is marked PRESENT
- Driven by attendance - no manual entry required
- Created via `createBasePoints()` when attendance is marked

**Adjustment Points (Teacher Action):**
- Teacher can add/subtract points for behavior
- Values: +10, +5, 0, -5, -10, -15
- Must include student_action and/or teacher_action from dropdowns
- Optional notes field for explanation
- **MULTIPLE ENTRIES PER PERIOD ALLOWED** - e.g.:
  - Halfway through period: +5 "Finished assignment early, started next without prompting"
  - End of period: 0 "Got bored, head down, off-task, had to be redirected"

**Entry Log (Visible to Student/Parent):**
- Each entry shows: timestamp, period, teacher name, adjustment, student_action, notes
- Student page shows running log of all entries
- Supports accountability and transparency

**Day Total Calculation:**
```
Day Total = SUM(base_points for present periods) + SUM(adjustments)

Example at 5th period:
- 5 periods present = 50 base points
- 1 adjustment of -5 (off task in period 3)
- Day Total = 50 + (-5) = 45 points
- Expected = 50, so 45/50 = 90% (green/blue)
```

### Database Schema Consideration

The current `daep_daily_points` table has a UNIQUE constraint on `(tenant_id, placement_id, date, period)`.
**This must be removed** to allow multiple entries per period.

**Required Migration:**
```sql
-- Remove unique constraint to allow multiple entries per period
ALTER TABLE daep_daily_points
DROP CONSTRAINT IF EXISTS daep_daily_points_tenant_id_placement_id_date_period_key;

-- Add is_base_points column to distinguish auto vs manual entries
ALTER TABLE daep_daily_points
ADD COLUMN IF NOT EXISTS is_base_points BOOLEAN DEFAULT false;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_daep_daily_points_lookup
ON daep_daily_points(tenant_id, placement_id, date);
```

**Entry Types:**
- Base entry: `points_earned = 10`, `is_base_points = true` (one per period when present)
- Adjustment entry: `points_earned = +/-value`, `is_base_points = false` (multiple allowed per period)

### Dropdown Data Sources

- **Student Action**: From `daep_behavior_categories` table (Story 1.10)
  - Configured per tenant in settings
  - Examples: "On Task", "Off Task", "Helped Peer", "Not Following Directions"

- **Teacher Action**: Need to add to settings (may be new table or extend behavior categories)
  - Examples: "Redirected", "Conference", "Called Home", "None"

### Visibility Model (Prep for Stories 3-5/3-6)

- `public = true`: Visible to student and parent
- `public = false`: Internal note, teacher-to-teacher
- `approval_status`: For teachers requiring review before going public

### Room Capacity Display

```
Room 501 - A Wing
8/12 present (15 max)
└─ 8 students marked present this period
   └─ 12 students assigned to this room
      └─ 15 is the legal max capacity (Texas law)
```

### Error Handling Philosophy

From previous sessions: errors should be **customer-facing and useful**.
- First failure: Toast with clear message, retry suggestion
- Multiple failures: Suggest going to feedback page
- Never show raw error codes to users

### Learnings from Story 3-1

**From Story 3-1 (Status: done):**

- **Extensibility Pattern**: `RosterStudentRow` has `renderExtraCells` prop ready
- **Context Pattern**: `RoomRosterContext` has `updateStudentData()` for optimistic updates
- **Room header**: Already shows student count, extend for capacity

[Source: docs/sprint-artifacts/daep/story-3-1.md]

### Watch Out For

1. **Attendance dependency**: Base points require attendance to be marked first. Story 3-9 (Attendance) may need to come before or alongside this story. **Add note to Story 3-9 about this integration.**

2. **Period identification**: Ensure period string matches between attendance, points, and bell schedule.

3. **Timezone**: ALL timestamps must use tenant timezone from district settings (`America/Chicago` default). Never use UTC for display. Check `daep_settings` or tenant config for timezone.

4. **Teacher action settings**: Need new settings table or extend `daep_behavior_categories` with `category_type` field. Must be tenant-configurable in admin settings - NOT hard-coded.

5. **Concurrent editing**: Multiple teachers adjusting same student - last write wins for now.

### Log Visibility by Role

| Role | What they see |
|------|---------------|
| Student | Their own log only - all entries for their placement, timestamped |
| Parent | Same as student - their child's log only |
| Teacher | ALL rooms (teachers rotate, students stay put) - can view any room or "All Rooms" for full DAEP roster |
| Admin | Same as teacher plus additional reporting/filtering options |

**Room Selector Enhancement:** Add "All Rooms" option at top of room selector to view entire DAEP roster across all rooms.

### Quick Wins (Recommendations)

| Enhancement | Why It Helps | Effort |
|-------------|--------------|--------|
| Default blank, require all marked | Accuracy first - can't submit until all students marked; subsequent periods default to previous period's status | Low |
| Recent adjustment indicator | TWO purposes: (1) Instant feedback to current user "yes, that saved", (2) Persistent indicator for NEXT teacher showing what was recently modified - prevents duplicate entry | Low |
| Color key legend | Small legend showing green=on target, yellow=falling behind, red=needs attention | Low |

### Attendance Default Behavior (Clarified)
1. **First period of day**: All students show BLANK - must mark each one (Present/Absent/Tardy)
2. **Cannot submit**: Until all students in roster are marked for that period
3. **Subsequent periods**: Default to previous period's status (if present in P1, default present in P2)
4. **Override allowed**: Teacher can change any status at any time

### Backlog (Future Stories)

| Idea | Target Story | Notes |
|------|--------------|-------|
| Keyboard shortcuts (Ctrl+Z undo) | Future polish | User mentioned adding to backlog |
| Multi-period view | Story 3-3 | See all periods in grid |
| Cumulative tracking / projections | Story 3-7 | Days to completion at current rate |
| Classroom running log | Future | See all entries across students for the day - identify patterns |
| Pattern analysis | Future | Track which student starts disruptions, behavioral chains across room |
| Teacher daily log view | Future | Click student → see full log for the day with all entries |

---

## Session References

**TODO:** Before implementation, review these session documents for additional context:
- `docs/sessions/brainstorming-*.md` - Product philosophy, "seamless workflow" decisions
- `docs/sessions/ux-*.md` - User journey and experience patterns

---

## Definition of Done

- [ ] All acceptance criteria verified
- [ ] Base points auto-created when attendance marked present
- [ ] Adjustment dialog works with all dropdowns
- [ ] Today's Total shows and updates correctly
- [ ] Room header shows capacity (present/assigned/max)
- [ ] Color coding works based on % of expected (optional toggle?)
- [ ] Optimistic updates provide instant feedback
- [ ] Errors are user-friendly with suggestions
- [ ] Mobile view works
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/story-3-2.context.xml`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## References

- [Source: docs/reference/epics-part2.md#Story-3.2] - Epic definition
- [Source: docs/sprint-artifacts/daep/story-3-1.md] - Previous story (Room Roster)
- [Source: components/daep/roster/RosterStudentRow.tsx] - Row component with renderExtraCells
- [Source: components/daep/roster/RoomRosterContext.tsx] - Context with updateStudentData
- [Source: supabase/migrations/20251124221840_create_daep_schema.sql] - daep_daily_points schema
- [Session docs TBD] - Brainstorming and UX sessions
