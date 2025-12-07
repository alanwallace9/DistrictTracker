# Tech Spec: Story 3.4 - Point Notes/Comments

**Story:** 3-4
**Points:** 2
**FRs:** FR36
**Dependencies:** Story 3-2 (Point Entry Grid)

---

## Overview

Story 3.4 enables DAEP staff to add contextual notes and metadata to point entries, documenting specific student behaviors and teacher responses. This creates a detailed log that is visible on the student profile for accountability and transparency.

**Key Insight:** Most of Story 3.4's functionality was **already implemented in Story 3-2**. The PointAdjustmentDialog already supports:
- Student action dropdown (from behavior categories)
- Teacher action dropdown (from neutral behavior categories)
- Notes textarea for free-text explanation
- Saving all fields to `daep_daily_points` table

**Remaining scope:** Display of point notes on the student profile "Activity" tab.

---

## What's Already Implemented (Story 3-2)

| Feature | Implementation | Status |
|---------|----------------|--------|
| Click point cell to open detail modal | `PointAdjustmentCell.tsx` + `PointAdjustmentDialog.tsx` | Done |
| Modal with points input | Adjustment dropdown (+10, +5, 0, -5, -10, -15) | Done |
| Student action dropdown | Populated from `daep_behavior_categories` (positive/negative types) | Done |
| Teacher action dropdown | Populated from `daep_behavior_categories` (neutral type) | Done |
| Notes textarea | Optional, max 500 chars | Done |
| Save to database | `createPointAdjustment()` server action | Done |
| Audit logging | `points.adjustment_added` event | Done |
| View existing adjustments | Shown in dialog with delete option | Done |

**Source files:**
- `components/daep/roster/PointAdjustmentDialog.tsx`
- `components/daep/roster/PointAdjustmentCell.tsx`
- `app/actions/daep/points.ts`

---

## Remaining Scope: Point Notes on Student Profile

The student profile page at `/daep/students/[school_id]` has an "Activity Timeline" tab that currently shows a placeholder:

```tsx
<TabsContent value="activity">
  <div className="text-muted-foreground">
    Activity timeline coming in Epic 4 (Story 4.5)
  </div>
</TabsContent>
```

**Options for Story 3.4:**

### Option A: Minimal Point Log (Recommended)

Create a focused "Point Entries" component that shows point adjustments for the student. This can later be incorporated into the full Activity Timeline in Story 4.5.

**Scope:**
- Create `StudentPointsLog.tsx` component
- Shows point entries for a date range (default: current placement or last 30 days)
- Each entry shows: date, period, adjustment, student_action, teacher_action, notes, entered_by
- Filter by date range
- Color-coded by adjustment value (positive green, negative red)

### Option B: Defer to Story 4.5

Mark "notes visible on student profile" as out-of-scope for 3.4 and defer entirely to Story 4.5 (Student Profile Timeline) which combines points, attendance, and behavior notes.

**Recommendation:** Option A - implement a minimal point log now. This:
- Completes FR36 requirement for notes visibility
- Provides immediate value to teachers checking student history
- Creates a reusable component for Story 4.5

---

## User Workflow

### Scenario: Teacher Checks Student Point History

```
Teacher opens Student Profile for "Martinez, Carlos"
→ Clicks "Activity Timeline" tab
→ Sees recent point entries:
   - 12/05 P4: +5 (On Task) - "Finished early, helped peer"
   - 12/05 P2: -5 (Off Task) - Redirected - "Phone out, had to confiscate"
   - 12/04 P5: +10 (Showed Respect) - "Apologized to peer unprompted"
→ Can filter by date range
→ Color-coded: green for positive, red for negative
```

---

## Data Model

Uses existing `daep_daily_points` table. No schema changes needed.

```sql
-- Relevant columns for point notes display
SELECT
  id,
  placement_id,
  date,
  period,
  points_earned,
  is_base_points,
  student_action,
  teacher_action,
  notes,
  entered_by,
  created_at
FROM daep_daily_points
WHERE placement_id = $1
  AND is_base_points = false  -- Only adjustments, not base points
ORDER BY date DESC, created_at DESC;
```

---

## Technical Implementation

### Server Action: Get Student Point Entries

Already exists in `app/actions/daep/points.ts`:

```typescript
export async function getStudentPointEntries(
  placementId: string,
  date: string
): Promise<DailyPointEntry[]>
```

**Enhancement needed:** Support date range instead of single date:

```typescript
// New server action
export async function getStudentPointHistory(
  placementId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    adjustmentsOnly?: boolean;
  }
): Promise<DailyPointEntry[]>
```

### New Component: StudentPointsLog

```typescript
// components/daep/StudentPointsLog.tsx

interface StudentPointsLogProps {
  placementId: string;
  studentName: string;
}

export function StudentPointsLog({ placementId, studentName }: StudentPointsLogProps) {
  // Fetch point entries for this placement
  // Display as a list/timeline
  // Filter by date range
  // Color-code by adjustment value
}
```

### Integration with Student Profile

```tsx
// app/daep/(main)/students/[school_id]/page.tsx

<TabsContent value="activity" className="mt-4">
  {profile.currentPlacement ? (
    <StudentPointsLog
      placementId={profile.currentPlacement.id}
      studentName={`${profile.student.first_name} ${profile.student.last_name}`}
    />
  ) : (
    <div className="text-muted-foreground">
      No active placement to show activity for.
    </div>
  )}
</TabsContent>
```

---

## UI Design

### Point Entry Card

```
┌──────────────────────────────────────────────────────────────┐
│ Dec 5, 2025 • Period 4                        [+5] On Task  │
├──────────────────────────────────────────────────────────────┤
│ Finished early, helped peer with math problem               │
│                                                              │
│ Teacher Action: None                                         │
│ Entered by: Ms. Johnson • 2:34 PM                           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Dec 5, 2025 • Period 2                        [-5] Off Task │
├──────────────────────────────────────────────────────────────┤
│ Phone out, had to confiscate                                │
│                                                              │
│ Teacher Action: Redirected                                   │
│ Entered by: Mr. Davis • 10:15 AM                            │
└──────────────────────────────────────────────────────────────┘
```

### Color Coding

| Adjustment | Background | Badge Color |
|------------|------------|-------------|
| +10, +5    | Green/10   | Green-500   |
| 0          | Gray/10    | Gray-500    |
| -5, -10, -15 | Red/10   | Red-500     |

---

## Acceptance Criteria Mapping

| AC from Epic | Implementation | Status |
|--------------|----------------|--------|
| 3.4.1: Click point cell to open detail modal | PointAdjustmentCell → PointAdjustmentDialog | Done (3-2) |
| 3.4.2: Modal shows points input | Adjustment dropdown | Done (3-2) |
| 3.4.3: Student action dropdown from behavior categories | Uses positive/negative categories | Done (3-2) |
| 3.4.4: Teacher action dropdown | Uses neutral categories | Done (3-2) |
| 3.4.5: Notes field free text optional | Textarea, 500 char max | Done (3-2) |
| 3.4.6: Save updates point entry with fields | createPointAdjustment() | Done (3-2) |
| 3.4.7: Notes visible on student profile daily activity | StudentPointsLog component | **NEW** |

---

## Task Breakdown

### Task 1: Server Action Enhancement

- [ ] 1.1 Add `getStudentPointHistory()` to `app/actions/daep/points.ts`
  - Accepts placementId and optional date range
  - Returns adjustments (non-base points) ordered by date desc
  - Includes entered_by user name via join or separate query

### Task 2: StudentPointsLog Component

- [ ] 2.1 Create `components/daep/StudentPointsLog.tsx`
  - Fetches point history for placement
  - Displays as card list
  - Color-coded badges for adjustment values
  - Shows: date, period, adjustment, student_action, teacher_action, notes, entered_by
- [ ] 2.2 Add date range filter (last 7 days, 30 days, all)
- [ ] 2.3 Add empty state for no adjustments
- [ ] 2.4 Add loading state

### Task 3: Student Profile Integration

- [ ] 3.1 Update `app/daep/(main)/students/[school_id]/page.tsx`
  - Replace placeholder in "Activity Timeline" tab
  - Import and render StudentPointsLog
  - Handle case when no active placement

### Task 4: Testing

- [ ] 4.1 Test point history display with multiple entries
- [ ] 4.2 Test date range filtering
- [ ] 4.3 Test empty state
- [ ] 4.4 Test Playwright MCP verification

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `app/actions/daep/points.ts` | Modify - add getStudentPointHistory |
| `components/daep/StudentPointsLog.tsx` | Create |
| `app/daep/(main)/students/[school_id]/page.tsx` | Modify - integrate StudentPointsLog |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No adjustments for student | Show "No point adjustments recorded" |
| Student has no active placement | Show message, no point log |
| Entry with no notes | Show adjustment without notes section |
| Entry with no student/teacher action | Show "—" or omit |
| Deleted user entered points | Show "Unknown" for entered_by |

---

## Relationship to Story 4.5

Story 4.5 (Student Profile Timeline) will create a unified timeline combining:
- Point entries (this story)
- Behavior notes (Story 4.1-4.4)
- Attendance events (Story 3.9-3.12)

The `StudentPointsLog` component created here can be:
1. Used directly in the interim
2. Refactored into the unified timeline in Story 4.5
3. Kept as a standalone "Points" tab if timeline becomes complex

**Recommendation:** Build StudentPointsLog as a self-contained component now. In Story 4.5, either integrate it into the unified timeline or keep it as a focused "Points" view.

---

## Success Metrics

After Story 3-4 is complete:
1. Teacher can add point adjustment with student action, teacher action, and notes (already works)
2. Teacher can view student profile → Activity tab → see all point adjustments
3. Each entry shows date, period, adjustment value, student action, teacher action, notes, entered by
4. Entries are color-coded and clearly formatted

---

## Dependencies

- **Story 3-2 (Point Entry Grid):** Must be complete (Done)
- **Story 1.10 (Behavior Categories):** Must be complete for dropdowns (Done)
- **Story 2-2 (Student Profile):** Must be complete for profile page (Done)

---

## Out of Scope

- Full activity timeline with behavior notes and attendance (Story 4.5)
- Editing existing point entries from student profile
- Bulk export of point history
- Parent/student view of point history (future story)
