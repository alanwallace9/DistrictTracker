# Story 4.2: Predefined Behavior Categories

**Status:** done
**Epic:** 4 - Behavior Documentation
**Points:** 2
**FRs:** FR47

---

## Story

As a **DAEP staff member**,
I want **to select from predefined behavior categories that are grouped and color-coded**,
So that **behavior notes are consistent, visually distinct, and easier to report on**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Categories should be instantly recognizable. Green for positive behaviors, red for negative - no cognitive load needed. Staff can glance at the timeline and immediately understand the pattern: mostly green = doing well, red spots = areas of concern.

---

## UX Overview

### Category Dropdown with Grouping

```
┌─ Student Action ──────────────────┐
│ ▾ Select action...                │
├───────────────────────────────────┤
│ ── POSITIVE ──                    │
│   ● On Task                       │
│   ● Completed Work                │
│   ● Helped Peer                   │
│   ● Showed Respect                │
│ ── NEGATIVE ──                    │
│   ● Off Task                      │
│   ● Disruptive                    │
│   ● Talk Back                     │
│   ● Incomplete Work               │
│ ─────────────────                 │
│   ○ None                          │
└───────────────────────────────────┘
```

### Color-Coded Timeline Badges

```
┌────────────────────────────────────────────────────────────────────┐
│  ✎  -5 pts  [Off Task]  Redirect                  Dec 6, 5:24 PM  │
│  ✎  +10 pts [On Task]                              Dec 6, 5:15 PM  │
│  ✎  0 pts   [Conference]  Parent contacted         Dec 6, 3:00 PM  │
└────────────────────────────────────────────────────────────────────┘
```

Badge colors:
- **Positive:** Green background, green text
- **Negative:** Red background, red text
- **Neutral:** Blue background, blue text

---

## Acceptance Criteria

| AC | Description | Status | Test |
|----|-------------|--------|------|
| 4.2.1 | Category dropdown populated from `daep_behavior_categories` | Pending | Open panel, verify categories |
| 4.2.2 | Categories grouped by type (Positive, Negative, Neutral) | Pending | Verify group headers |
| 4.2.3 | Most-used categories appear first (via display_order) | Pending | Order matches settings |
| 4.2.4 | Color-coded text: green/red/blue by type | Pending | Verify text colors |
| 4.2.5 | Category badge shown on timeline items | Pending | See badge next to entries |
| 4.2.6 | Badge colors match category type | Pending | Verify green/red/blue |
| 4.2.7 | "None" option at bottom of dropdown | Pending | Verify last option |
| 4.2.8 | Only active categories shown | Pending | Deactivate, verify hidden |

---

## Tasks / Subtasks

### Task 1: Create CategorySelect Component (AC: 4.2.1-4.2.4, 4.2.7)

- [ ] 1.1 Create `components/daep/roster/CategorySelect.tsx`
  - Props: categories, value, onValueChange, variant ('student' | 'teacher')
  - Filter by variant: student = positive+negative, teacher = neutral
  - Group by category_type with headers
- [ ] 1.2 Implement grouped SelectGroup structure
  - Positive group first, then Negative
  - Within groups, sort by display_order
  - "None" option at bottom
- [ ] 1.3 Add color-coded text styling
  - Positive categories: `text-green-600`
  - Negative categories: `text-red-600`
  - Neutral categories: `text-blue-600`

### Task 2: Create CategoryBadge Component (AC: 4.2.5, 4.2.6)

- [ ] 2.1 Create `components/daep/roster/CategoryBadge.tsx`
  - Props: category (string), type (positive|negative|neutral)
  - Small inline badge with color-coded background
- [ ] 2.2 Define badge color styles
  - Positive: `bg-green-100 text-green-700 border-green-200`
  - Negative: `bg-red-100 text-red-700 border-red-200`
  - Neutral: `bg-blue-100 text-blue-600 border-blue-200`

### Task 3: Update Type Definitions (AC: 4.2.5, 4.2.6)

- [ ] 3.1 Update `RecentActivityItem` in `lib/validation/schemas.ts`
  - Add `category_type?: 'positive' | 'negative' | 'neutral' | 'bonus'`
- [ ] 3.2 Export category type constant/helper if needed

### Task 4: Update Server Action (AC: 4.2.5)

- [ ] 4.1 Modify `getRecentActivityForPlacement()` in behavior-notes.ts
  - Look up category_type for student_action values
  - Include category_type in returned activity items

### Task 5: Integrate into UI Components (AC: 4.2.1-4.2.8)

- [ ] 5.1 Update `InlineStudentPanel.tsx`
  - Replace current Select with CategorySelect for student action
  - Replace current Select with CategorySelect for teacher action
- [ ] 5.2 Update `CompactActivityItem.tsx`
  - Import and use CategoryBadge
  - Display badge when student_action is present
- [ ] 5.3 Update exports in `components/daep/roster/index.ts`

### Task 6: Testing (All ACs)

- [ ] 6.1 Verify dropdown shows grouped categories
- [ ] 6.2 Verify text colors in dropdown
- [ ] 6.3 Verify badge appears on timeline with correct colors
- [ ] 6.4 Test with deactivated category (should be hidden)
- [ ] 6.5 Verify TypeScript compilation
- [ ] 6.6 Playwright MCP verification

---

## Dev Notes

### Category Type Colors

```typescript
// Text colors for dropdown
const CATEGORY_TEXT_STYLES = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-blue-600',
  bonus: 'text-amber-600',
};

// Badge styles for timeline
const CATEGORY_BADGE_STYLES = {
  positive: 'bg-green-100 text-green-700 border-green-200',
  negative: 'bg-red-100 text-red-700 border-red-200',
  neutral: 'bg-blue-100 text-blue-600 border-blue-200',
  bonus: 'bg-amber-100 text-amber-700 border-amber-200',
};
```

### Select Group Structure

Use shadcn/ui Select with SelectGroup:

```typescript
<SelectGroup>
  <SelectLabel>Positive</SelectLabel>
  <SelectItem value="On Task">On Task</SelectItem>
  ...
</SelectGroup>
```

### Category Type Lookup

To get category_type for badge coloring:

```typescript
// In server action
const { data: categories } = await supabase
  .from('daep_behavior_categories')
  .select('name, category_type')
  .eq('tenant_id', tenantId)
  .in('name', studentActionNames);

const typeMap = new Map(categories?.map(c => [c.name, c.category_type]) || []);
```

### Watch Out For

1. **Performance** - Fetch categories once per roster view, not per row
2. **Category changes** - If admin renames a category, existing notes keep old name
3. **Empty dropdown** - Handle case where tenant has no categories configured

---

## Out of Scope

| Item | Story |
|------|-------|
| Usage tracking for "most-used first" | Future |
| Category management from note UI | Use settings page |
| Full behavior notes list page | Story 4-3 |
| Category filtering on list view | Story 4-3 |
| Badge click to filter timeline | Future |

---

## Dependencies

- Story 1.10 (Behavior Categories) - **DONE**
- Story 4-1 (Quick Behavior Note Entry) - **In Progress**

---

## Definition of Done

- [ ] CategorySelect component shows grouped categories
- [ ] Dropdown text is color-coded by type
- [ ] CategoryBadge component displays with correct colors
- [ ] Timeline items show category badge when student_action exists
- [ ] Only active categories appear in dropdown
- [ ] "None" option is at the bottom of dropdown
- [ ] TypeScript compiles without errors
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-story-4-2.md`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## References

- [Source: docs/reference/epics-part2.md#Story-4.2] - Epic definition
- [Source: docs/sprint-artifacts/daep/tech-spec-story-4-2.md] - Technical specification
- [Source: app/actions/daep/behavior-categories.ts] - Existing category actions
- [Source: components/daep/roster/InlineStudentPanel.tsx] - Panel to update
- [Source: components/daep/roster/CompactActivityItem.tsx] - Activity item to update
- [Source: lib/validation/schemas.ts] - Type definitions
