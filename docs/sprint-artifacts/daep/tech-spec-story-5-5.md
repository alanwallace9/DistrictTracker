# Tech Spec: Story 5-5 - Discrepancy Categorization

**Epic:** 5 - CSV Reconciliation
**Points:** 2
**Status:** Drafted
**FRs:** FR56
**Dependencies:** Story 5-4 (Comparison Engine)

---

## Purpose

Provide clear visual categorization of discrepancies with summary counts and color-coded badges, enabling administrators to quickly understand the scope and types of reconciliation work needed.

---

## Acceptance Criteria Checklist

| AC | Description | Required Implementation |
|----|-------------|------------------------|
| 5.5.1 | Four categories defined | Matched, Field Conflict, New in SIS, Missing from SIS |
| 5.5.2 | Session summary shows counts | Total count for each category prominently displayed |
| 5.5.3 | Discrepancy cards show category | Badge on each card indicating category |
| 5.5.4 | Color coding | Green (matched), Yellow (conflict), Blue (new), Red (missing) |
| 5.5.5 | Filter by category | Ability to view only specific category types |

---

## Category Definitions

| Category | Color | Icon | Description | Action Required |
|----------|-------|------|-------------|-----------------|
| **Matched** | Green (`#22C55E`) | CheckCircle | SIS and DAEP data identical | No action (auto-resolved) |
| **Field Conflict** | Yellow (`#EAB308`) | AlertTriangle | Record exists in both but fields differ | Admin must choose Accept SIS or Keep DAEP |
| **New in SIS** | Blue (`#3B82F6`) | PlusCircle | Student/placement in SIS but not in DAEP | Admin can create new placement or dismiss |
| **Missing from SIS** | Red (`#EF4444`) | MinusCircle | Student/placement in DAEP but not in SIS | Admin reviews and marks for review or dismisses |

---

## UI Components

### Category Summary Cards

```typescript
// app/daep/reconciliation/[sessionId]/components/category-summary.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, PlusCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategorySummaryProps {
  matched: number;
  fieldConflicts: number;
  newInSIS: number;
  missingFromSIS: number;
  activeFilter: string | null;
  onFilterChange: (category: string | null) => void;
}

const CATEGORIES = [
  {
    key: 'matched',
    label: 'Matched',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badgeVariant: 'default' as const,
    description: 'No action needed',
  },
  {
    key: 'field_conflict',
    label: 'Field Conflicts',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badgeVariant: 'warning' as const,
    description: 'Review and resolve',
  },
  {
    key: 'new_in_sis',
    label: 'New in SIS',
    icon: PlusCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeVariant: 'secondary' as const,
    description: 'Not in DAEP yet',
  },
  {
    key: 'missing_from_sis',
    label: 'Missing from SIS',
    icon: MinusCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeVariant: 'destructive' as const,
    description: 'Not in SIS export',
  },
];

export function CategorySummary({
  matched,
  fieldConflicts,
  newInSIS,
  missingFromSIS,
  activeFilter,
  onFilterChange,
}: CategorySummaryProps) {
  const counts = {
    matched,
    field_conflict: fieldConflicts,
    new_in_sis: newInSIS,
    missing_from_sis: missingFromSIS,
  };

  const total = matched + fieldConflicts + newInSIS + missingFromSIS;
  const actionRequired = fieldConflicts + newInSIS + missingFromSIS;

  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Total Records Compared</p>
          <p className="text-3xl font-bold">{total}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Requires Action</p>
          <p className={cn(
            "text-3xl font-bold",
            actionRequired > 0 ? "text-yellow-600" : "text-green-600"
          )}>
            {actionRequired}
          </p>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {CATEGORIES.map((category) => {
          const count = counts[category.key as keyof typeof counts];
          const isActive = activeFilter === category.key;
          const Icon = category.icon;

          return (
            <Card
              key={category.key}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                category.borderColor,
                isActive && "ring-2 ring-offset-2 ring-primary",
                count === 0 && "opacity-50"
              )}
              onClick={() => onFilterChange(isActive ? null : category.key)}
            >
              <CardContent className={cn("pt-6", category.bgColor)}>
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-8 w-8", category.color)} />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {category.label}
                    </p>
                    <p className={cn("text-2xl font-bold", category.color)}>
                      {count}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Filter Indicator */}
      {activeFilter && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtered to:</span>
          <Badge
            variant={CATEGORIES.find(c => c.key === activeFilter)?.badgeVariant}
            className="cursor-pointer"
            onClick={() => onFilterChange(null)}
          >
            {CATEGORIES.find(c => c.key === activeFilter)?.label}
            <span className="ml-1">×</span>
          </Badge>
        </div>
      )}
    </div>
  );
}
```

### Category Badge Component

```typescript
// components/daep/reconciliation/category-badge.tsx
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, PlusCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiscrepancyType } from '@/lib/types/daep';

interface CategoryBadgeProps {
  type: DiscrepancyType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const BADGE_CONFIG = {
  matched: {
    label: 'Matched',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  field_conflict: {
    label: 'Field Conflict',
    icon: AlertTriangle,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  new_in_sis: {
    label: 'New in SIS',
    icon: PlusCircle,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  missing_from_sis: {
    label: 'Missing from SIS',
    icon: MinusCircle,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

export function CategoryBadge({ type, size = 'md', showIcon = true }: CategoryBadgeProps) {
  const config = BADGE_CONFIG[type];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        sizeClasses[size],
        "inline-flex items-center gap-1"
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}
```

### Discrepancy List with Filtering

```typescript
// app/daep/reconciliation/[sessionId]/components/discrepancy-list.tsx
'use client';

import { useState, useMemo } from 'react';
import { CategorySummary } from './category-summary';
import { DiscrepancyCard } from './discrepancy-card';
import type { Discrepancy } from '@/lib/types/daep';

interface DiscrepancyListProps {
  discrepancies: Discrepancy[];
  sessionId: string;
}

export function DiscrepancyList({ discrepancies, sessionId }: DiscrepancyListProps) {
  const [filter, setFilter] = useState<string | null>(null);

  // Calculate counts
  const counts = useMemo(() => {
    return discrepancies.reduce(
      (acc, d) => {
        acc[d.discrepancyType]++;
        return acc;
      },
      { matched: 0, field_conflict: 0, new_in_sis: 0, missing_from_sis: 0 }
    );
  }, [discrepancies]);

  // Filter discrepancies
  const filteredDiscrepancies = useMemo(() => {
    if (!filter) {
      // By default, hide matched records (no action needed)
      return discrepancies.filter(d => d.discrepancyType !== 'matched');
    }
    return discrepancies.filter(d => d.discrepancyType === filter);
  }, [discrepancies, filter]);

  // Sort by priority: conflicts first, then new, then missing
  const sortedDiscrepancies = useMemo(() => {
    const priority = {
      field_conflict: 1,
      new_in_sis: 2,
      missing_from_sis: 3,
      matched: 4,
    };

    return [...filteredDiscrepancies].sort((a, b) => {
      const priorityDiff = priority[a.discrepancyType] - priority[b.discrepancyType];
      if (priorityDiff !== 0) return priorityDiff;
      return a.studentName.localeCompare(b.studentName);
    });
  }, [filteredDiscrepancies]);

  return (
    <div className="space-y-6">
      <CategorySummary
        matched={counts.matched}
        fieldConflicts={counts.field_conflict}
        newInSIS={counts.new_in_sis}
        missingFromSIS={counts.missing_from_sis}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {filter ? `${filteredDiscrepancies.length} Records` : `${filteredDiscrepancies.length} Records Requiring Review`}
          </h3>
        </div>

        {sortedDiscrepancies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {filter === 'matched'
              ? 'All matched records are auto-resolved. No action needed.'
              : 'No discrepancies to review.'}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDiscrepancies.map((discrepancy) => (
              <DiscrepancyCard
                key={discrepancy.id}
                discrepancy={discrepancy}
                sessionId={sessionId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Server Actions

### `getDiscrepancyCounts(sessionId: string)`

```typescript
export async function getDiscrepancyCounts(sessionId: string) {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_reconciliation_discrepancies')
    .select('discrepancy_type')
    .eq('session_id', sessionId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('[Reconciliation] Failed to get counts:', error);
    return { matched: 0, field_conflict: 0, new_in_sis: 0, missing_from_sis: 0 };
  }

  return data.reduce(
    (acc, d) => {
      const type = d.discrepancy_type as keyof typeof acc;
      acc[type]++;
      return acc;
    },
    { matched: 0, field_conflict: 0, new_in_sis: 0, missing_from_sis: 0 }
  );
}
```

### `getFilteredDiscrepancies(sessionId: string, filter?: string)`

```typescript
export async function getFilteredDiscrepancies(
  sessionId: string,
  filter?: string,
  resolution?: 'pending' | 'resolved'
) {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  let query = supabase
    .from('daep_reconciliation_discrepancies')
    .select('*')
    .eq('session_id', sessionId)
    .eq('tenant_id', tenantId);

  if (filter) {
    query = query.eq('discrepancy_type', filter);
  }

  if (resolution === 'pending') {
    query = query.eq('resolution', 'pending');
  } else if (resolution === 'resolved') {
    query = query.neq('resolution', 'pending');
  }

  const { data, error } = await query
    .order('discrepancy_type', { ascending: true })
    .order('student_name', { ascending: true });

  if (error) {
    console.error('[Reconciliation] Failed to get discrepancies:', error);
    return [];
  }

  return data;
}
```

---

## Color Theme Integration

```typescript
// lib/daep/reconciliation-theme.ts

export const RECONCILIATION_COLORS = {
  matched: {
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-100 dark:bg-green-900',
  },
  field_conflict: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
    badge: 'bg-yellow-100 dark:bg-yellow-900',
  },
  new_in_sis: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 dark:bg-blue-900',
  },
  missing_from_sis: {
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 dark:bg-red-900',
  },
};

export function getCategoryColors(type: string) {
  return RECONCILIATION_COLORS[type as keyof typeof RECONCILIATION_COLORS] ||
    RECONCILIATION_COLORS.matched;
}
```

---

## Edge Cases

1. **All records matched:** Show success state, no action required message
2. **No matches:** Show full list of discrepancies grouped by type
3. **Very large number of conflicts:** Paginate or virtualize list
4. **Filter with zero results:** Show appropriate empty state
5. **Session with no discrepancies:** Handle gracefully (shouldn't happen)

---

## Testing Checklist

- [ ] Display all four category counts correctly
- [ ] Color coding matches specifications
- [ ] Click category card to filter
- [ ] Click again to clear filter
- [ ] Show correct count of "requires action" items
- [ ] Sort by priority (conflicts first)
- [ ] Hide matched records by default
- [ ] Show matched records when explicitly filtered
- [ ] Badge displays correctly on discrepancy cards
- [ ] Dark mode colors work correctly
