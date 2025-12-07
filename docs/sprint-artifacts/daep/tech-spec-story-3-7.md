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

### Milestone Trigger Types

| Trigger Type | Description | Example |
|--------------|-------------|---------|
| `points_threshold` | Awarded when cumulative points reach threshold | "500 Club" at 500 points |
| `consecutive_perfect_days` | Awarded for X consecutive days with 100% points | "3-Day Streak" for 3 perfect days |

**Consecutive Perfect Days Logic:**
- A "perfect day" = student earned 100% of possible points that day
- Days must be consecutive school days (skips weekends/holidays)
- Streak resets if student misses a day or gets <100%
- Can award bonus points (e.g., +5 pts for 5-day streak)

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
- Table: Badge Name, Trigger Type, Threshold/Days, Bonus Points, Status, Actions
- Add/Edit dialogs with trigger type selector
- Seed defaults button on empty state
- Activate/Deactivate toggle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Milestone Badges                                          [+ Add Badge]     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Name             │ Trigger              │ Threshold │ Bonus │ Status │ ··· │
├──────────────────┼──────────────────────┼───────────┼───────┼────────┼─────┤
│ 🏆 100 Club      │ Points Threshold     │ 100 pts   │ -     │ Active │ ··· │
│ 🏆 250 Club      │ Points Threshold     │ 250 pts   │ -     │ Active │ ··· │
│ 🔥 3-Day Streak  │ Consecutive Perfect  │ 3 days    │ +3 pts│ Active │ ··· │
│ 🔥 5-Day Streak  │ Consecutive Perfect  │ 5 days    │ +5 pts│ Active │ ··· │
│ ⭐ Perfect Week  │ Consecutive Perfect  │ 5 days    │ +10pts│ Active │ ··· │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Add/Edit Badge Dialog

```
┌─────────────────────────────────────────────────────────────┐
│ Add Milestone Badge                                    [X]  │
├─────────────────────────────────────────────────────────────┤
│ Badge Name: [____________________________]                  │
│                                                             │
│ Trigger Type:                                               │
│ ○ Points Threshold    ● Consecutive Perfect Days            │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Consecutive Days: [5]                                   │ │
│ │ (Student must earn 100% points for X consecutive days)  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Bonus Points: [5] (awarded when milestone achieved)         │
│                                                             │
│                              [Cancel]  [Save Badge]         │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Update Table: `daep_point_bonus_rules` (Add trigger_type)

```sql
-- Add trigger_type column to existing table
ALTER TABLE daep_point_bonus_rules
ADD COLUMN IF NOT EXISTS trigger_type TEXT NOT NULL DEFAULT 'points_threshold';
-- Values: 'points_threshold' | 'consecutive_perfect_days'

ALTER TABLE daep_point_bonus_rules
ADD COLUMN IF NOT EXISTS consecutive_days INT;
-- Only used when trigger_type = 'consecutive_perfect_days'

-- Update constraint
ALTER TABLE daep_point_bonus_rules
ADD CONSTRAINT valid_trigger_config CHECK (
  (trigger_type = 'points_threshold' AND points_threshold IS NOT NULL) OR
  (trigger_type = 'consecutive_perfect_days' AND consecutive_days IS NOT NULL)
);
```

### New Table: `daep_student_milestones`

```sql
CREATE TABLE IF NOT EXISTS daep_student_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES daep_point_bonus_rules(id),
  points_at_achievement INT,              -- For points_threshold milestones
  streak_days INT,                        -- For consecutive_perfect_days milestones
  streak_start_date DATE,                 -- First day of the streak
  streak_end_date DATE,                   -- Last day of the streak
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  awarded_by TEXT,
  award_type TEXT NOT NULL DEFAULT 'auto',  -- 'auto' | 'manual'
  bonus_points_awarded INT DEFAULT 0,       -- Bonus points given for this milestone
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, placement_id, rule_id, streak_end_date)  -- Allow re-earning streak milestones
);

CREATE INDEX idx_daep_milestones_placement ON daep_student_milestones(placement_id);
ALTER TABLE daep_student_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON daep_student_milestones
  FOR ALL USING (tenant_id = get_current_tenant_id());
```

**Note:** Streak milestones can be earned multiple times (unique per streak_end_date), unlike point threshold milestones which are one-time.

### Schema Update: Add 'bonus' to BehaviorCategoryType

```typescript
// lib/validation/schemas.ts
export const BehaviorCategoryType = z.enum(['positive', 'negative', 'neutral', 'bonus']);

// New milestone rule schema
export const MilestoneRuleSchema = z.object({
  name: z.string().min(1),
  trigger_type: z.enum(['points_threshold', 'consecutive_perfect_days']),
  points_threshold: z.number().positive().optional(),
  consecutive_days: z.number().int().min(2).max(30).optional(),
  bonus_points: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
```

---

## Server Actions

### `app/actions/daep/milestones.ts`

```typescript
// Core functions
getCumulativePoints(placementId): CumulativePointsData
getStudentMilestones(placementId): MilestoneAchievement[]
getMilestoneRules(): MilestoneRule[]
getCurrentStreak(placementId): StreakData  // Get current consecutive perfect days

// Award functions - Points Threshold
checkAndAwardMilestones(placementId, currentTotal, awardedBy): MilestoneAchievement[]  // Auto
manuallyAwardMilestone(placementId, ruleId): MilestoneAchievement  // Individual manual
bulkAwardMilestones(placementIds, ruleId): { success: number, failed: number }  // Bulk manual

// Award functions - Consecutive Perfect Days
checkAndAwardStreakMilestones(placementId, date, awardedBy): MilestoneAchievement[]  // Auto after daily points finalized

// Settings CRUD
createMilestoneRule(data): MilestoneRule
updateMilestoneRule(id, data): MilestoneRule
deleteMilestoneRule(id): void
seedDefaultMilestones(): { seeded: number }
```

### Consecutive Perfect Days Algorithm

```typescript
interface StreakData {
  currentStreak: number;        // Current consecutive perfect days
  streakStartDate: string;      // When the streak started
  lastPerfectDate: string;      // Most recent perfect day
  isPerfectToday: boolean;      // Did student get 100% today?
}

async function getCurrentStreak(placementId: string): Promise<StreakData> {
  // 1. Get all daily point summaries for placement, ordered by date DESC
  // 2. For each day, check if points_earned === points_possible (100%)
  // 3. Count consecutive perfect days from most recent
  // 4. Stop counting when a non-perfect day is found
  // 5. Skip non-school days (weekends, holidays from school_calendar)
}

async function checkAndAwardStreakMilestones(
  placementId: string,
  date: string,
  awardedBy: string
): Promise<MilestoneAchievement[]> {
  // 1. Get current streak data
  const streak = await getCurrentStreak(placementId);

  // 2. Get all active streak milestone rules
  const rules = await getMilestoneRules()
    .filter(r => r.trigger_type === 'consecutive_perfect_days' && r.is_active);

  // 3. For each rule, check if streak meets threshold
  const awarded: MilestoneAchievement[] = [];
  for (const rule of rules) {
    if (streak.currentStreak >= rule.consecutive_days) {
      // Check if already earned this streak (same end date)
      const existing = await checkExistingStreak(placementId, rule.id, date);
      if (!existing) {
        // Award milestone + bonus points
        const achievement = await awardStreakMilestone(placementId, rule, streak, awardedBy);
        awarded.push(achievement);
      }
    }
  }
  return awarded;
}
```

### When to Check Streaks

Call `checkAndAwardStreakMilestones()` at end of day when:
1. All periods have been marked for a student
2. Final daily points are calculated
3. Could be triggered by:
   - Admin "finalize day" action
   - Automated end-of-day cron job
   - When last period's points are approved

---

## UI Components

### `MilestoneBadges.tsx`

Compact badge row for placement card header:
- 🏆 Trophy icon for points threshold badges
- 🔥 Flame icon for streak badges
- Gray circle for unearned
- **Hover tooltip:** "47 pts to 500 Club" or "🔥 3-day streak!"
- **Animated glow** on newly earned (same session)

```typescript
interface Props {
  milestones: Milestone[];
  currentPoints: number;
  currentStreak: number;      // Current consecutive perfect days
  newlyEarned?: string[];     // IDs of just-earned milestones for animation
}
```

### `CurrentStreakIndicator.tsx`

Shows current streak prominently:

```
┌──────────────────────────────────┐
│ 🔥 4-day streak!                 │
│ 1 more day for +5 bonus pts     │
└──────────────────────────────────┘
```

```typescript
interface Props {
  currentStreak: number;
  nextStreakMilestone?: { days: number; bonus: number };
  isPerfectToday: boolean;
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
| `supabase/migrations/XXXXXX_create_student_milestones.sql` | New table + trigger_type column |
| `app/actions/daep/milestones.ts` | All milestone server actions |
| `app/daep/settings/badges/page.tsx` | Badges settings CRUD |
| `app/daep/settings/badges/AddBadgeDialog.tsx` | Add milestone dialog (with trigger type) |
| `app/daep/settings/badges/EditBadgeDialog.tsx` | Edit milestone dialog |
| `components/daep/MilestoneBadges.tsx` | Badge display component |
| `components/daep/CurrentStreakIndicator.tsx` | Streak display + next milestone |
| `components/daep/ToggleableProgressBar.tsx` | Days/points toggle |

**Modify:**
| File | Changes |
|------|---------|
| `components/daep/CurrentPlacementCard.tsx` | Add badges to header, add streak indicator |
| `app/daep/(main)/students/[school_id]/page.tsx` | Fetch cumulative points + streak data |
| `app/actions/daep/points.ts` | Hook milestone check after approval |
| `app/daep/settings/behaviors/page.tsx` | Add 'bonus' type |
| `lib/validation/schemas.ts` | Add MilestoneRuleSchema, BehaviorCategoryType |

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
| Streak broken (non-perfect day) | Reset streak counter to 0, keep earned badges |
| Weekend/holiday in streak | Skip non-school days, streak continues |
| Student absent but excused | Day doesn't count toward streak (no data) |
| Multiple streak milestones at once | Award all applicable (3-day AND 5-day if 5+ days) |
| Same streak milestone re-earned | Allowed - new streak_end_date creates new record |

---

## Out of Scope

- Milestone notifications (Epic 7)
- Dashboard milestone leaderboard (Epic 6)
- Auto-applied bonus points ~~(manual only)~~ → **Now in scope for streaks**

---

## Default Milestone Seeds

When "Seed Defaults" is clicked:

```typescript
const defaultMilestones = [
  // Points Thresholds
  { name: '100 Club', trigger_type: 'points_threshold', points_threshold: 100, bonus_points: 0 },
  { name: '250 Club', trigger_type: 'points_threshold', points_threshold: 250, bonus_points: 0 },
  { name: '500 Club', trigger_type: 'points_threshold', points_threshold: 500, bonus_points: 0 },
  { name: '1000 Club', trigger_type: 'points_threshold', points_threshold: 1000, bonus_points: 0 },

  // Consecutive Perfect Days (with bonus points)
  { name: '3-Day Streak', trigger_type: 'consecutive_perfect_days', consecutive_days: 3, bonus_points: 3 },
  { name: '5-Day Streak', trigger_type: 'consecutive_perfect_days', consecutive_days: 5, bonus_points: 5 },
  { name: 'Perfect Week', trigger_type: 'consecutive_perfect_days', consecutive_days: 5, bonus_points: 10 },
  { name: '10-Day Streak', trigger_type: 'consecutive_perfect_days', consecutive_days: 10, bonus_points: 15 },
];
```

---

_Tech Spec Updated: 2025-12-07_
_Synced with Story 3-7 v3 - Added consecutive perfect days milestone type_
