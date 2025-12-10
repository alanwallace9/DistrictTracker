# Tech Spec: Story 4-2 - Predefined Behavior Categories

**Story:** 4-2
**Epic:** 4 - Behavior Documentation
**Points:** 2
**FRs:** FR47

---

## Overview

Enhance the behavior note entry experience by populating the category dropdown from `daep_behavior_categories`, grouping by type (positive, negative, neutral), sorting by most-used, and displaying color-coded badges in the timeline view.

**Design Philosophy:** Categories should be quick to find and visually distinct so staff can document behaviors accurately with minimal cognitive load.

---

## Current State Analysis

### What's Already Implemented

1. **Behavior Categories Management** (Story 1.10)
   - `daep_behavior_categories` table with `name`, `category_type`, `display_order`, `is_active`
   - CRUD server actions in `app/actions/daep/behavior-categories.ts`
   - Settings page at `/daep/settings/behaviors`
   - `getActiveBehaviorCategories()` returns active categories sorted by display_order

2. **Inline Student Panel** (Story 4-1 - in progress)
   - `components/daep/roster/InlineStudentPanel.tsx`
   - Student Action dropdown currently uses hardcoded filter on category_type
   - Teacher Action dropdown uses category_type='neutral'

3. **Behavior Notes Server Actions** (Story 4-1)
   - `app/actions/daep/behavior-notes.ts`
   - `createBehaviorNote()` accepts `category_id`
   - Recent activity displays behavior notes

### Current Category Display

```typescript
// Current approach in InlineStudentPanel.tsx (Story 4-1)
const studentActions = categories.filter(
  c => c.category_type === 'positive' || c.category_type === 'negative'
);
const teacherActions = categories.filter(c => c.category_type === 'neutral');
```

**Issues:**
- No visual grouping by type in the dropdown
- No color coding in the dropdown
- Categories not sorted by most-used (only display_order)
- Timeline doesn't show category badges

---

## UX Specification

### 1. Category Dropdown with Grouped Options

Replace flat dropdown with grouped structure:

```
┌─ Student Action ──────────────────┐
│ ▾ Select action...                │
├───────────────────────────────────┤
│ ── Positive ──                    │
│   ● On Task                       │
│   ● Completed Work                │
│   ● Helped Peer                   │
│   ● Showed Respect                │
│ ── Negative ──                    │
│   ● Off Task                      │
│   ● Disruptive                    │
│   ● Talk Back                     │
│   ● Incomplete Work               │
│ ── None ──                        │
│   ○ No action                     │
└───────────────────────────────────┘
```

**Grouping Rules:**
- Group by `category_type`: positive first, then negative
- Within each group, sort by `display_order`
- "None" option at the bottom
- Positive categories shown with green indicator
- Negative categories shown with red indicator

### 2. Teacher Action Dropdown (Neutral Categories)

```
┌─ Teacher Action ──────────────────┐
│ ▾ Select action...                │
├───────────────────────────────────┤
│   ○ Redirected                    │
│   ○ Conference                    │
│   ○ Parent Contact                │
│ ── None ──                        │
│   ○ No action                     │
└───────────────────────────────────┘
```

**Grouping Rules:**
- Neutral categories (teacher interventions)
- Sorted by `display_order`
- Gray/neutral indicator
- "None" option at bottom

### 3. Color-Coded Badges in Timeline

Activity timeline items show category badge:

```
┌────────────────────────────────────────────────────────────────────┐
│  ✎  -5 pts  [Off Task]  Redirect            Dec 6, 5:24 PM  │
│  ✎  +10 pts [On Task]                        Dec 6, 5:15 PM  │
│  ✎  0 pts   [Conference]  Parent contacted   Dec 6, 3:00 PM  │
│  ○  Absent (Excused)                         Dec 6           │
└────────────────────────────────────────────────────────────────────┘
```

**Badge Colors:**
| Type | Background | Text |
|------|-----------|------|
| positive | `bg-green-100` | `text-green-700` |
| negative | `bg-red-100` | `text-red-700` |
| neutral | `bg-blue-100` | `text-blue-600` |

### 4. Most-Used Categories First (Future Enhancement)

This story implements the foundation. Usage tracking for "most-used first" will be a future enhancement after we have enough data.

For now, use `display_order` which admins can configure in settings.

---

## Database Changes

### No Schema Changes Required

The existing `daep_behavior_categories` table has all needed fields:
- `id` (UUID)
- `name` (VARCHAR)
- `category_type` (ENUM: positive, negative, neutral, bonus)
- `display_order` (INTEGER)
- `is_active` (BOOLEAN)
- `description` (VARCHAR, optional)

The `daep_behavior_notes` table already has:
- `category_id` (UUID FK to daep_behavior_categories)

---

## Component Changes

### 1. Create CategorySelect Component

**File:** `components/daep/roster/CategorySelect.tsx`

A reusable grouped select component for behavior categories.

```typescript
'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';

interface CategorySelectProps {
  categories: BehaviorCategory[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  variant: 'student' | 'teacher';
  className?: string;
}

const CATEGORY_TYPE_STYLES = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-blue-600',
  bonus: 'text-amber-600',
};

export function CategorySelect({
  categories,
  value,
  onValueChange,
  placeholder = 'Select action...',
  variant,
  className,
}: CategorySelectProps) {
  // Filter and group categories based on variant
  const filteredCategories = React.useMemo(() => {
    if (variant === 'student') {
      // Student actions: positive + negative
      return categories.filter(
        (c) => c.category_type === 'positive' || c.category_type === 'negative'
      );
    }
    // Teacher actions: neutral only
    return categories.filter((c) => c.category_type === 'neutral');
  }, [categories, variant]);

  // Group by category_type
  const groupedCategories = React.useMemo(() => {
    const groups: Record<string, BehaviorCategory[]> = {};

    filteredCategories.forEach((cat) => {
      if (!groups[cat.category_type]) {
        groups[cat.category_type] = [];
      }
      groups[cat.category_type].push(cat);
    });

    // Sort groups: positive first, then negative
    const groupOrder = variant === 'student'
      ? ['positive', 'negative']
      : ['neutral'];

    return groupOrder
      .filter((type) => groups[type]?.length > 0)
      .map((type) => ({
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        categories: groups[type].sort((a, b) => a.display_order - b.display_order),
      }));
  }, [filteredCategories, variant]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn('w-[160px] h-8', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* None option */}
        <SelectItem value="">
          <span className="text-muted-foreground">None</span>
        </SelectItem>

        {/* Grouped categories */}
        {groupedCategories.map((group) => (
          <SelectGroup key={group.type}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase">
              {group.label}
            </SelectLabel>
            {group.categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                <span className={cn(CATEGORY_TYPE_STYLES[cat.category_type])}>
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 2. Create CategoryBadge Component

**File:** `components/daep/roster/CategoryBadge.tsx`

A badge component for displaying categories in the timeline.

```typescript
'use client';

import { cn } from '@/lib/utils';

type CategoryType = 'positive' | 'negative' | 'neutral' | 'bonus';

interface CategoryBadgeProps {
  category: string;
  type?: CategoryType;
  className?: string;
}

const BADGE_STYLES: Record<CategoryType, string> = {
  positive: 'bg-green-100 text-green-700 border-green-200',
  negative: 'bg-red-100 text-red-700 border-red-200',
  neutral: 'bg-blue-100 text-blue-600 border-blue-200',
  bonus: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function CategoryBadge({ category, type = 'neutral', className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border',
        BADGE_STYLES[type],
        className
      )}
    >
      {category}
    </span>
  );
}
```

### 3. Update InlineStudentPanel Component

**File:** `components/daep/roster/InlineStudentPanel.tsx`

Replace the current Select components with the new CategorySelect.

```typescript
// Replace current student/teacher action selects with:
import { CategorySelect } from './CategorySelect';

// In the JSX:
<CategorySelect
  categories={categories}
  value={studentAction}
  onValueChange={setStudentAction}
  placeholder="Student Action"
  variant="student"
/>

<CategorySelect
  categories={categories}
  value={teacherAction}
  onValueChange={setTeacherAction}
  placeholder="Teacher Action"
  variant="teacher"
/>
```

### 4. Update CompactActivityItem Component

**File:** `components/daep/roster/CompactActivityItem.tsx`

Add category badge to the activity item display.

```typescript
import { CategoryBadge } from './CategoryBadge';
import type { RecentActivityItem } from '@/lib/validation/schemas';

export function CompactActivityItem({ item }: { item: RecentActivityItem }) {
  // ... existing code ...

  return (
    <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />

        {/* Points badge */}
        {item.points !== undefined && (
          <span className={cn(
            'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
            getPointBadgeClass(item.points)
          )}>
            {item.points > 0 ? `+${item.points}` : item.points}
          </span>
        )}

        {/* Category badge - NEW */}
        {item.student_action && (
          <CategoryBadge
            category={item.student_action}
            type={item.category_type}
          />
        )}

        <span className="text-foreground truncate">
          {item.summary}
        </span>
      </div>

      <span className="text-muted-foreground whitespace-nowrap ml-2 flex-shrink-0">
        {formatRelativeTime(item.timestamp)}
      </span>
    </div>
  );
}
```

### 5. Update RecentActivityItem Type

**File:** `lib/validation/schemas.ts`

Add `category_type` to the RecentActivityItem interface.

```typescript
export interface RecentActivityItem {
  id: string;
  type: 'point_entry' | 'behavior_note' | 'attendance';
  timestamp: string;
  summary: string;
  points?: number;
  period?: string;
  student_action?: string;
  teacher_action?: string;
  category_type?: 'positive' | 'negative' | 'neutral' | 'bonus'; // NEW
  staff_name: string;
}
```

### 6. Update Server Action to Include Category Type

**File:** `app/actions/daep/behavior-notes.ts`

Modify `getRecentActivityForPlacement` to look up category type.

```typescript
// In getRecentActivityForPlacement, after fetching point entries:

// Fetch category types for student_actions
const studentActions = new Set<string>();
(pointsResult.data || []).forEach((p) => {
  if (p.student_action) studentActions.add(p.student_action);
});

const categoryTypeMap = new Map<string, 'positive' | 'negative' | 'neutral' | 'bonus'>();

if (studentActions.size > 0) {
  const { data: categories } = await supabase
    .from('daep_behavior_categories')
    .select('name, category_type')
    .eq('tenant_id', tenantId)
    .in('name', Array.from(studentActions));

  categories?.forEach((c) => categoryTypeMap.set(c.name, c.category_type));
}

// Then when building activities, add:
category_type: categoryTypeMap.get(p.student_action) || 'neutral',
```

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 4.2.1 | Category dropdown populated from `daep_behavior_categories` | Open inline panel, verify categories match settings |
| 4.2.2 | Categories grouped by type (Positive, Negative) | Verify group headers appear in dropdown |
| 4.2.3 | Most-used categories appear first (via display_order) | Check order matches settings page |
| 4.2.4 | Color-coded text: green (positive), red (negative), gray (neutral) | Verify text colors in dropdown |
| 4.2.5 | Category badge shown on timeline items | See badge next to point entries with actions |
| 4.2.6 | Badge colors match category type | Verify green/red/gray badges |
| 4.2.7 | "None" option at bottom of dropdown | Verify "None" is last option |
| 4.2.8 | Only active categories shown | Deactivate category, verify it's hidden |

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `components/daep/roster/CategorySelect.tsx` | Create | Grouped select component |
| `components/daep/roster/CategoryBadge.tsx` | Create | Color-coded badge component |
| `components/daep/roster/InlineStudentPanel.tsx` | Modify | Use CategorySelect |
| `components/daep/roster/CompactActivityItem.tsx` | Modify | Add CategoryBadge |
| `lib/validation/schemas.ts` | Modify | Add category_type to RecentActivityItem |
| `app/actions/daep/behavior-notes.ts` | Modify | Include category_type in activity |
| `components/daep/roster/index.ts` | Modify | Export new components |

---

## Dependencies

- Story 1.10 (Behavior Categories) - **DONE**
- Story 4-1 (Quick Behavior Note Entry) - **In Progress** (can work in parallel)

---

## Out of Scope

| Item | Story |
|------|-------|
| Usage tracking for "most-used first" sorting | Future |
| Category management from behavior note UI | N/A (use settings page) |
| Full behavior notes list page | Story 4-3 |
| Category filtering on list view | Story 4-3 |

---

## Testing Plan

1. **TypeScript compilation** - Ensure no type errors
2. **Category dropdown:**
   - Opens with grouped categories
   - Text colors match type
   - Only active categories shown
3. **Timeline badges:**
   - Badge appears for entries with student_action
   - Badge color matches category type
4. **Integration:**
   - Create note with category, verify badge appears
   - Deactivate category in settings, verify hidden in dropdown
5. **Playwright MCP verification**

---

_Tech Spec Version: 1.0_
_Created: 2025-12-10_
_Author: Claude (AI Assistant)_
