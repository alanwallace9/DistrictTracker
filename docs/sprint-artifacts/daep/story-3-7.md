# Story 3.7: Cumulative Points & Milestones

**Status:** drafted
**Epic:** 3 - Daily Operations
**Points:** 5
**FRs:** FR34, FR35

---

## Story

As a **DAEP staff member**,
I want **to see cumulative points and milestones for each student**,
So that **I can track progress toward goals and celebrate achievements**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Students in DAEP need to see tangible progress. When Maria crosses 500 points, that's not just a number - it's motivation to keep going. Staff need this visibility too: is Carlos trending up or down? Is Sarah close to a milestone that might motivate her through a tough week?

**The outcome:** Progress becomes visible, goals become achievable, and achievements get celebrated.

---

## UI/UX Clarifications

### Milestone Badge Placement
Badges appear on the **same row** as "Current Placement" title:
```
┌─────────────────────────────────────────────────────────┐
│ Current Placement  🏆🏆🏆○○                [Status]    │
├─────────────────────────────────────────────────────────┤
```

### Toggleable Progress Bar
Single progress bar that **toggles on click** between:
- Days view: "15/20 days (5 remaining)"
- Points view: "1,147/1,400 pts (82%)"

Saves space, user chooses which metric to view.

### Milestones vs Bonus Points (Two Separate Concepts)

**Milestones** = Achievement badges awarded when point thresholds are reached
- **Auto-awarded**: System grants when cumulative points cross threshold
- **Manually awarded**: Admin can grant badge directly (individual or bulk)
- Examples: "100 Club", "500 Club", "Star Performer"

**Bonus Points** = Extra points added to a student's cumulative total
- **Manually applied only** (never automatic)
- Individual: Via point adjustment dialog with "bonus" category
- Bulk: Via bulk actions on roster page
- Examples: +5 for helping peer, +10 for perfect week

These are separate: a student earns bonus points → total increases → may trigger milestone auto-award.

### Quick Wins (Included)

1. **Progress tooltip** - Hover on unearned badge shows "47 pts to 500 Club"
2. **Seed defaults button** - Empty badges page offers "Load Defaults"
3. **Animated badge glow** - Brief highlight when milestone just earned (same session)

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 3.7.1 | Cumulative points shown on CurrentPlacementCard | View student profile, verify points displayed |
| 3.7.2 | Points possible calculated: days_served × periods × 10 | Verify calculation |
| 3.7.3 | Progress bar toggles between days and points on click | Click to toggle, verify switch |
| 3.7.4 | Milestone badges on same row as "Current Placement" title | Visual check |
| 3.7.5 | Earned badges show gold/trophy styling | Visual check |
| 3.7.6 | Unearned badges grayed out with hover progress hint | Hover shows "47 pts to 500 Club" |
| 3.7.7 | Milestones auto-awarded when threshold crossed | Enter points, verify auto-award |
| 3.7.8 | Milestones can be manually awarded by admin | Use manual award action |
| 3.7.9 | Only approved points count toward cumulative total | Pending points excluded |
| 3.7.10 | Badges settings page at `/daep/settings/badges` | CRUD for milestone rules |
| 3.7.11 | "bonus" type added to behavior categories | Verify in behaviors settings |
| 3.7.12 | Milestone achievements logged to audit trail | Check audit log |

---

## Tasks / Subtasks

### Task 1: Database Migration (AC: 3.7.7, 3.7.8, 3.7.11)

- [ ] 1.1 Create `daep_student_milestones` table:
  - `id` UUID PRIMARY KEY
  - `tenant_id` TEXT NOT NULL
  - `placement_id` UUID FK to daep_placements
  - `rule_id` UUID FK to daep_point_bonus_rules
  - `points_at_achievement` INT
  - `achieved_at` TIMESTAMPTZ
  - `awarded_by` TEXT (user who triggered)
  - `award_type` TEXT ('auto' | 'manual')
  - UNIQUE(tenant_id, placement_id, rule_id)
- [ ] 1.2 Add indexes on tenant_id, placement_id
- [ ] 1.3 Add RLS policy for tenant isolation
- [ ] 1.4 Add 'bonus' to BehaviorCategoryType (schema + validation)
- [ ] 1.5 Seed default milestone rules in `daep_point_bonus_rules` (if empty)

### Task 2: Server Actions - Cumulative Points (AC: 3.7.1, 3.7.2, 3.7.3, 3.7.9)

- [ ] 2.1 Create `app/actions/daep/milestones.ts` file
- [ ] 2.2 Implement `getCumulativePoints(placementId)`:
  - Query SUM of `points_earned` WHERE `approval_status = 'approved'`
  - Get `days_served` from placement
  - Get `periods_per_day` from settings (default 7)
  - Calculate points_possible = days_served × periods × 10
  - Calculate percentage
  - Return `CumulativePointsData` object
- [ ] 2.3 Add helper `getPeriodsPerDaySetting()` for tenant config

### Task 3: Server Actions - Milestones (AC: 3.7.7, 3.7.8, 3.7.12)

- [ ] 3.1 Implement `getMilestoneRules()` - get active milestone rules
- [ ] 3.2 Implement `getStudentMilestones(placementId)` - get achieved milestones
- [ ] 3.3 Implement `checkAndAwardMilestones(placementId, currentTotal, awardedBy)`:
  - Auto-award when threshold crossed, `award_type = 'auto'`
- [ ] 3.4 Implement `manuallyAwardMilestone(placementId, ruleId)`:
  - Admin grants milestone, `award_type = 'manual'`
- [ ] 3.5 Implement `bulkAwardMilestones(placementIds, ruleId)`:
  - Bulk manual award for multiple students

### Task 4: Integrate Milestone Check with Points Entry (AC: 3.7.8)

- [ ] 4.1 Update `createPointAdjustment` in `points.ts`:
  - After successful approved entry, calculate new total
  - Call `checkAndAwardMilestones()`
- [ ] 4.2 Update `approvePointEntry` in `points.ts`:
  - After approval, calculate new total
  - Call `checkAndAwardMilestones()`
- [ ] 4.3 Update `bulkApproveEntries` in `points.ts`:
  - For each affected placement, check milestones

### Task 5: Badges Settings Page (AC: 3.7.10)

- [ ] 5.1 Create `/daep/settings/badges/page.tsx` - CRUD for milestone rules
- [ ] 5.2 Create `AddBadgeDialog.tsx` - add new milestone
- [ ] 5.3 Create `EditBadgeDialog.tsx` - edit existing milestone
- [ ] 5.4 Add "Badges" to settings navigation
- [ ] 5.5 **Quick Win:** Seed defaults button on empty state

### Task 6: Update Behaviors Page (AC: 3.7.11)

- [ ] 6.1 Add 'bonus' to `CATEGORY_TYPE_LABELS` in behaviors page
- [ ] 6.2 Update `BehaviorCategoryType` in schemas.ts
- [ ] 6.3 Update AddCategoryDialog to include 'bonus' option

### Task 7: UI Components (AC: 3.7.3, 3.7.4, 3.7.5, 3.7.6)

- [ ] 7.1 Create `components/daep/MilestoneBadges.tsx`:
  - Compact badge row for placement card header
  - Gold trophy for earned, gray circle for unearned
  - **Quick Win:** Hover tooltip "47 pts to 500 Club"
  - **Quick Win:** Animated glow on newly earned badge
- [ ] 7.2 Create `components/daep/ToggleableProgressBar.tsx`:
  - Click to toggle between days/points view
  - State persists in localStorage
  - Color coding by percentage

### Task 8: CurrentPlacementCard Integration (AC: 3.7.1-3.7.6)

- [ ] 8.1 Add MilestoneBadges to card header (same row as title)
- [ ] 8.2 Replace DaysProgressBar with ToggleableProgressBar
- [ ] 8.3 Fetch cumulative points in parent page, pass as props
- [ ] 8.4 Handle zero days served gracefully

### Task 9: Testing

- [ ] 9.1 TypeScript compilation passes
- [ ] 9.2 Test cumulative points calculation (only approved)
- [ ] 9.3 Test milestone auto-award when threshold crossed
- [ ] 9.4 Test manual milestone award (individual + bulk)
- [ ] 9.5 Test toggleable progress bar (days ↔ points)
- [ ] 9.6 Test badges settings CRUD
- [ ] 9.7 Test 'bonus' category type in behaviors
- [ ] 9.8 Playwright MCP verification

---

## Dev Notes

### Points Possible Formula

```
points_possible = days_served × periods_per_day × max_points_per_period
                = days_served × 7 × 10
                = days_served × 70
```

For a student with 20 days served: 20 × 70 = 1,400 points possible

### Default Milestone Thresholds

| Badge Name | Threshold | Bonus Points |
|------------|-----------|--------------|
| 100 Club | 100 pts | 0 |
| 250 Club | 250 pts | 0 |
| 500 Club | 500 pts | 0 |
| 1000 Club | 1000 pts | 5 |
| 1500 Club | 1500 pts | 5 |
| 2000 Club | 2000 pts | 10 |

### Milestone Table Schema

```sql
CREATE TABLE daep_student_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES daep_point_bonus_rules(id),
  points_at_achievement INT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  awarded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, placement_id, rule_id)
);
```

### Percentage Color Coding

| Percentage | Color | Meaning |
|------------|-------|---------|
| >= 90% | Green | Excellent |
| >= 80% | Blue | Good |
| >= 70% | Amber | Needs attention |
| < 70% | Red | Concern |

### Audit Event Types

| Event | Description |
|-------|-------------|
| `milestone.achieved` | Student crossed milestone threshold |

### Only Approved Points Count

Critical: The cumulative total MUST only include points where `approval_status = 'approved'`. Pending points don't count toward milestones.

```sql
SELECT SUM(points_earned) FROM daep_daily_points
WHERE placement_id = $1 AND approval_status = 'approved'
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Zero days served | Show "No points yet" instead of 0% |
| No milestones configured | Hide milestones section entirely |
| Student already has milestone | Don't duplicate (unique constraint) |
| Bulk approval crosses multiple milestones | Award all crossed milestones |
| Points rejected after milestone | Keep milestone (already earned) |
| Historical placement | Show read-only milestones |

---

## Out of Scope

- Milestone notification to student/parent (Epic 7)
- Dashboard showing milestone achievers (Epic 6)
- Perfect streak badges (different trigger_type)
- Bonus points auto-added (manually applied only)

---

## Definition of Done

- [ ] Milestone badges on CurrentPlacementCard header (same row as title)
- [ ] Progress bar toggles between days/points on click
- [ ] Milestones auto-awarded when thresholds crossed
- [ ] Milestones can be manually awarded (individual + bulk)
- [ ] Badges settings page at `/daep/settings/badges` with CRUD
- [ ] 'bonus' type added to behavior categories
- [ ] Earned badges gold/trophy, unearned gray with hover progress
- [ ] Only approved points count toward total
- [ ] Audit trail for milestone achievements
- [ ] No TypeScript errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-story-3-7.md`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

**Created:**
- `supabase/migrations/XXXXXX_create_student_milestones.sql`
- `app/actions/daep/milestones.ts`
- `app/daep/settings/badges/page.tsx`
- `app/daep/settings/badges/AddBadgeDialog.tsx`
- `app/daep/settings/badges/EditBadgeDialog.tsx`
- `components/daep/MilestoneBadges.tsx`
- `components/daep/ToggleableProgressBar.tsx`

**Modified:**
- `app/actions/daep/points.ts` - Add milestone check hooks
- `app/daep/(main)/students/[school_id]/page.tsx` - Fetch cumulative points
- `components/daep/CurrentPlacementCard.tsx` - Add badges + toggleable progress
- `app/daep/settings/behaviors/page.tsx` - Add 'bonus' type
- `lib/validation/schemas.ts` - Add 'bonus' to BehaviorCategoryType

---

## References

- [Source: docs/reference/epics-part2.md#Story-3.7] - Epic definition
- [Source: docs/sprint-artifacts/daep/tech-spec-story-3-7.md] - Technical specification
- [Source: supabase/migrations/20251124221840_create_daep_schema.sql] - daep_point_bonus_rules table
- [Source: app/actions/daep/points.ts] - Points entry server actions
- [Source: app/daep/(main)/students/[school_id]/page.tsx] - Student profile page
