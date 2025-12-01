# Backlog: Add review_at_days Field

**Created:** 2025-11-30
**Priority:** High (blocks rollover review eligibility calculation)
**Type:** Data Model Gap

---

## Problem Statement

The `daep_placements` table has `review_met_date` (when review occurred) but no `review_at_days` field (when review becomes eligible).

Without `review_at_days`, we cannot calculate:
- Days until review eligibility for active placements
- Review eligibility carryover for rollover placements

### Example

| Field | Value |
|-------|-------|
| `days_assigned` | 45 |
| `review_at_days` | 30 ← **MISSING** |
| `days_served` | 17 |
| `review_eligible_day` | 30 - 17 = 13 more days |

For rollovers, this matters because a student with 13 days remaining who had a 30-day review would be eligible for review at day 3 of the new school year.

---

## Current State

```sql
-- What exists
review_met_date DATE  -- When review was held (outcome)

-- What's missing
review_at_days INTEGER  -- When review is eligible (input)
```

---

## Requirements (Clarified 2025-11-30)

### Where does review_at_days come from?
- **Set during placement creation** — manually entered from the incident report from home campus

### Is it fixed or formula?
**Both — three outcomes:**

| Scenario | Value | Example |
|----------|-------|---------|
| Specific review date | Manual entry | 40-day placement with 30-day review |
| Default (nothing chosen) | Formula: 50% of days_assigned | 40-day placement → review at day 20 |
| No review | NULL | Straight 40-day placement, no review |

### Can it change mid-placement?
**Yes** — home campus appeal process allows:
- Change total number of days
- Add a review
- Change the review day threshold

---

## Proposed Solution

```sql
ALTER TABLE daep_placements
ADD COLUMN review_at_days INTEGER;

COMMENT ON COLUMN daep_placements.review_at_days IS
  'Days into placement when review eligibility begins. Set at creation based on placement type/offense.';
```

---

## Impact

- **Story 2-11 (Rollover):** Can proceed but review eligibility display will be placeholder/null
- **Story 2-7 (Days Remaining):** May need this for review countdown
- **UI:** Student profile should show "Eligible for review in X days"

---

## Effort Estimate

- Migration: 1 point
- Backfill logic: Depends on where review_at_days originates
- UI updates: 1-2 points

---

*Created during Story 2-11 tech spec validation*
