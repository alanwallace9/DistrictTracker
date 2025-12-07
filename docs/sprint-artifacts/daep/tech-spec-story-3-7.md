# Tech Spec: Story 3.7 - Cumulative Points & Milestones

**Story:** 3-7
**Points:** 5
**FRs:** FR34, FR35
**Dependencies:** Story 1.10 (behavior categories), Story 3-2 (Point Entry), Story 3-5/3-6 (Approval workflow)

---

## Overview

Add **cumulative point tracking** and **milestone badges** to the CurrentPlacementCard, with a new settings page to configure milestone rules.

**Key Concepts:**
- **Milestones** = Achievement badges (auto when threshold met OR manual award)
- **Bonus Points** = Extra points added manually (never automatic)

---

## UI/UX Design

### CurrentPlacementCard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Current Placement  🏆🏆🏆○○                    [Active ▼]   │  ← Badges on title row
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [████████████████░░░░] 15/20 days (5 remaining)    [🔄]    │  ← Click to toggle
│                  OR                                         │
│ [██████████████░░░░░░] 1,147/1,400 pts (82%)       [🔄]    │  ← days ↔ points
│                                                             │
│ 📋 Code 42 - Fighting (Mandatory)                          │
│ ...rest of placement card...                               │
└─────────────────────────────────────────────────────────────┘
```

### Badges Settings Page (`/daep/settings/badges`)

Same pattern as behaviors page:
- Table: Badge Name, Threshold, Bonus Points, Status, Actions
- Add/Edit dialogs
- Seed defaults button on empty state
- Activate/Deactivate toggle

---

## Data Model

### New Table: `daep_student_milestones`

```sql
CREATE TABLE IF NOT EXISTS daep_student_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES daep_point_bonus_rules(id),
  points_at_achievement INT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  awarded_by TEXT,
  award_type TEXT NOT NULL DEFAULT 'auto',  -- 'auto' | 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, placement_id, rule_id)
);

CREATE INDEX idx_daep_milestones_placement ON daep_student_milestones(placement_id);
ALTER TABLE daep_student_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON daep_student_milestones
  FOR ALL USING (tenant_id = get_current_tenant_id());
```

### Schema Update: Add 'bonus' to BehaviorCategoryType

```typescript
// lib/validation/schemas.ts
export const BehaviorCategoryType = z.enum(['positive', 'negative', 'neutral', 'bonus']);
```

---

## Server Actions

### `app/actions/daep/milestones.ts`

```typescript
// Core functions
getCumulativePoints(placementId): CumulativePointsData
getStudentMilestones(placementId): MilestoneAchievement[]
getMilestoneRules(): MilestoneRule[]

// Award functions
checkAndAwardMilestones(placementId, currentTotal, awardedBy): MilestoneAchievement[]  // Auto
manuallyAwardMilestone(placementId, ruleId): MilestoneAchievement  // Individual manual
bulkAwardMilestones(placementIds, ruleId): { success: number, failed: number }  // Bulk manual

// Settings CRUD
createMilestoneRule(data): MilestoneRule
updateMilestoneRule(id, data): MilestoneRule
deleteMilestoneRule(id): void
seedDefaultMilestones(): { seeded: number }
```

---

## UI Components

### `MilestoneBadges.tsx`

Compact badge row for placement card header:
- Gold trophy icon for earned badges
- Gray circle for unearned
- **Hover tooltip:** "47 pts to 500 Club"
- **Animated glow** on newly earned (same session)

```typescript
interface Props {
  milestones: Milestone[];
  currentPoints: number;
  newlyEarned?: string[];  // IDs of just-earned milestones for animation
}
```

### `ToggleableProgressBar.tsx`

Single progress bar that toggles between views:

```typescript
interface Props {
  daysServed: number;
  daysAssigned: number;
  daysRemaining: number;
  pointsEarned: number;
  pointsPossible: number;
  percentage: number;
}
```

- Click anywhere to toggle days ↔ points
- Persist preference in localStorage
- Color coding: green (≥90%), blue (≥80%), amber (≥70%), red (<70%)

---

## Files to Create/Modify

**Create:**
| File | Purpose |
|------|---------|
| `supabase/migrations/XXXXXX_create_student_milestones.sql` | New table + 'bonus' type |
| `app/actions/daep/milestones.ts` | All milestone server actions |
| `app/daep/settings/badges/page.tsx` | Badges settings CRUD |
| `app/daep/settings/badges/AddBadgeDialog.tsx` | Add milestone dialog |
| `app/daep/settings/badges/EditBadgeDialog.tsx` | Edit milestone dialog |
| `components/daep/MilestoneBadges.tsx` | Badge display component |
| `components/daep/ToggleableProgressBar.tsx` | Days/points toggle |

**Modify:**
| File | Changes |
|------|---------|
| `components/daep/CurrentPlacementCard.tsx` | Add badges to header, replace progress bar |
| `app/daep/(main)/students/[school_id]/page.tsx` | Fetch cumulative points |
| `app/actions/daep/points.ts` | Hook milestone check after approval |
| `app/daep/settings/behaviors/page.tsx` | Add 'bonus' type |
| `lib/validation/schemas.ts` | Add 'bonus' to BehaviorCategoryType |

---

## Quick Wins

| Feature | Location | Effort |
|---------|----------|--------|
| Hover tooltip "47 pts to 500 Club" | MilestoneBadges | Low |
| Seed defaults button | Badges settings page | Low |
| Animated glow on new badge | MilestoneBadges | Low |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Zero days served | Show "No data yet" instead of 0% |
| No milestones configured | Hide badges section |
| Duplicate award attempt | Unique constraint prevents |
| Bulk approval crosses milestones | Award all crossed, once per student |
| Points rejected after milestone | Keep milestone (already earned) |

---

## Out of Scope

- Milestone notifications (Epic 7)
- Dashboard milestone leaderboard (Epic 6)
- Perfect streak badges (different trigger_type)
- Auto-applied bonus points (manual only)

---

_Tech Spec Updated: 2025-12-07_
_Synced with Story 3-7 v2_
