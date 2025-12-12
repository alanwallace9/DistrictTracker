# Tech Spec: Story 5-6 - Side-by-Side Comparison UI

**Epic:** 5 - CSV Reconciliation
**Points:** 5
**Status:** Drafted
**FRs:** FR57
**Dependencies:** Story 5-5 (Discrepancy Categorization)

---

## Purpose

Display SIS and DAEP data in a side-by-side comparison view with conflicting fields highlighted, enabling administrators to make informed resolution decisions. This is the core UI for the banking-style reconciliation workflow.

---

## Acceptance Criteria Checklist

| AC | Description | Required Implementation |
|----|-------------|------------------------|
| 5.6.1 | Review page exists | Page at `/daep/reconciliation/[sessionId]` |
| 5.6.2 | Two-column layout | SIS Data (left) \| DAEP Data (right) |
| 5.6.3 | Highlight conflicts | Conflicting fields highlighted in yellow |
| 5.6.4 | New record display | Right column shows "Not in DAEP" |
| 5.6.5 | Missing record display | Left column shows "Not in SIS" |
| 5.6.6 | Student name prominent | Name at top of each comparison card |
| 5.6.7 | Navigation controls | Previous / Next discrepancy buttons |
| 5.6.8 | Progress indicator | "Reviewing 3 of 8 discrepancies" |

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ SIS Reconciliation - Session from Nov 15, 2025                       │
│ ◄ Back to Sessions                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ [Matched: 142] [Conflicts: 5] [New: 3] [Missing: 1]     Action: 9    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ John Smith (ID: 12345)                    [Field Conflict]    │   │
│  │ Incident: INC-2024-001                                        │   │
│  ├──────────────────────────┬───────────────────────────────────┤   │
│  │      SIS Data            │         DAEP Data                  │   │
│  ├──────────────────────────┼───────────────────────────────────┤   │
│  │ Start Date: 11/10/2025   │ Start Date: 11/09/2025  ⚠️        │   │
│  │ Days Assigned: 45        │ Days Assigned: 30       ⚠️        │   │
│  │ Offense Code: 26         │ Offense Code: 26                  │   │
│  │ Home Campus: Birdville HS│ Home Campus: Birdville HS         │   │
│  ├──────────────────────────┴───────────────────────────────────┤   │
│  │ [Accept SIS] [Keep DAEP] [Add Note & Accept SIS]             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ◄ Previous                           Reviewing 1 of 9    Next ►    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Page Component

```typescript
// app/daep/reconciliation/[sessionId]/page.tsx
import { notFound } from 'next/navigation';
import { getReconciliationSession, getSessionDiscrepancies } from '@/app/actions/daep/reconciliation';
import { ReconciliationReview } from './components/reconciliation-review';

interface Props {
  params: { sessionId: string };
}

export default async function ReconciliationSessionPage({ params }: Props) {
  const [session, discrepancies] = await Promise.all([
    getReconciliationSession(params.sessionId),
    getSessionDiscrepancies(params.sessionId),
  ]);

  if (!session) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <ReconciliationReview
        session={session}
        discrepancies={discrepancies}
      />
    </div>
  );
}
```

---

## UI Components

### Main Review Component

```typescript
// app/daep/reconciliation/[sessionId]/components/reconciliation-review.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { CategorySummary } from './category-summary';
import { ComparisonCard } from './comparison-card';
import type { Discrepancy } from '@/lib/types/daep';

interface Props {
  session: any;
  discrepancies: Discrepancy[];
}

export function ReconciliationReview({ session, discrepancies }: Props) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Filter to pending (unresolved) discrepancies that need action
  const actionableDiscrepancies = useMemo(() => {
    let filtered = discrepancies.filter(d =>
      d.discrepancyType !== 'matched' && d.resolution === 'pending'
    );

    if (categoryFilter) {
      filtered = filtered.filter(d => d.discrepancyType === categoryFilter);
    }

    return filtered;
  }, [discrepancies, categoryFilter]);

  const currentDiscrepancy = actionableDiscrepancies[currentIndex];
  const totalActionable = actionableDiscrepancies.length;

  const handlePrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex(Math.min(totalActionable - 1, currentIndex + 1));
  };

  const handleResolved = () => {
    // Move to next or stay if at end
    if (currentIndex >= totalActionable - 1) {
      // Check if all resolved
      router.refresh();
    } else {
      // List will update, stay at same index to show next item
    }
  };

  // Calculate counts
  const counts = useMemo(() => {
    return discrepancies.reduce(
      (acc, d) => {
        acc[d.discrepancyType]++;
        if (d.resolution === 'pending' && d.discrepancyType !== 'matched') {
          acc.pending++;
        }
        return acc;
      },
      { matched: 0, field_conflict: 0, new_in_sis: 0, missing_from_sis: 0, pending: 0 }
    );
  }, [discrepancies]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/daep/reconciliation')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Review Discrepancies</h1>
            <p className="text-muted-foreground">
              {session.file_name} • Uploaded {new Date(session.upload_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <CategorySummary
        matched={counts.matched}
        fieldConflicts={counts.field_conflict}
        newInSIS={counts.new_in_sis}
        missingFromSIS={counts.missing_from_sis}
        activeFilter={categoryFilter}
        onFilterChange={setCategoryFilter}
      />

      {/* Comparison View */}
      {totalActionable === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">
            All Discrepancies Resolved!
          </h2>
          <p className="text-muted-foreground mb-6">
            {counts.matched} records matched, {discrepancies.length - counts.matched} discrepancies resolved.
          </p>
          <Button onClick={() => router.push('/daep/reconciliation')}>
            View Summary Report
          </Button>
        </div>
      ) : (
        <>
          {/* Current Comparison */}
          {currentDiscrepancy && (
            <ComparisonCard
              discrepancy={currentDiscrepancy}
              sessionId={session.id}
              onResolved={handleResolved}
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="text-sm text-muted-foreground">
              Reviewing <span className="font-semibold">{currentIndex + 1}</span> of{' '}
              <span className="font-semibold">{totalActionable}</span> discrepancies
            </div>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentIndex >= totalActionable - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

### Comparison Card Component

```typescript
// app/daep/reconciliation/[sessionId]/components/comparison-card.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/daep/reconciliation/category-badge';
import { ComparisonView } from './comparison-view';
import { ResolutionActions } from './resolution-actions';
import type { Discrepancy } from '@/lib/types/daep';

interface Props {
  discrepancy: Discrepancy;
  sessionId: string;
  onResolved: () => void;
}

export function ComparisonCard({ discrepancy, sessionId, onResolved }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">
              {discrepancy.studentName}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>ID: {discrepancy.studentId}</span>
              <span>•</span>
              <span>Incident: {discrepancy.incidentNumber}</span>
            </div>
          </div>
          <CategoryBadge type={discrepancy.discrepancyType} size="lg" />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ComparisonView discrepancy={discrepancy} />
        <ResolutionActions
          discrepancy={discrepancy}
          sessionId={sessionId}
          onResolved={onResolved}
        />
      </CardContent>
    </Card>
  );
}
```

### Side-by-Side Comparison View

```typescript
// app/daep/reconciliation/[sessionId]/components/comparison-view.tsx
'use client';

import { AlertTriangle, Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Discrepancy, FieldConflict } from '@/lib/types/daep';

interface Props {
  discrepancy: Discrepancy;
}

const DISPLAY_FIELDS = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'days_assigned', label: 'Days Assigned' },
  { key: 'offense_code', label: 'Offense Code' },
  { key: 'home_campus', label: 'Home Campus' },
  { key: 'parent_email', label: 'Parent Email' },
  { key: 'grade_level', label: 'Grade Level' },
];

export function ComparisonView({ discrepancy }: Props) {
  const { sisData, daepData, conflicts, discrepancyType } = discrepancy;

  // Build conflict lookup
  const conflictMap = new Map(
    conflicts.map(c => [c.field, c])
  );

  const getValue = (data: any, field: string): string => {
    if (!data) return '';
    const value = data[field];
    if (value === null || value === undefined) return '';
    if (field === 'home_campus' && !data[field]) {
      return data['home_campus_name'] || '';
    }
    return String(value);
  };

  return (
    <div className="grid grid-cols-2 divide-x">
      {/* SIS Column */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-blue-600">SIS Data</h4>
          {discrepancyType === 'missing_from_sis' && (
            <Badge variant="secondary">Not in SIS Export</Badge>
          )}
        </div>

        {discrepancyType === 'missing_from_sis' ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground bg-muted/30 rounded-lg">
            <div className="text-center">
              <Minus className="h-12 w-12 mx-auto mb-2 text-red-400" />
              <p>No matching record in SIS export</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {DISPLAY_FIELDS.map(({ key, label }) => {
              const value = getValue(sisData, key);
              const isConflict = conflictMap.has(key);

              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    isConflict && "bg-yellow-50 border border-yellow-200"
                  )}
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className={cn(
                    "font-medium",
                    isConflict && "text-yellow-700"
                  )}>
                    {value || <span className="text-muted-foreground italic">—</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DAEP Column */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-green-600">DAEP Data</h4>
          {discrepancyType === 'new_in_sis' && (
            <Badge variant="secondary">Not in DAEP</Badge>
          )}
        </div>

        {discrepancyType === 'new_in_sis' ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground bg-muted/30 rounded-lg">
            <div className="text-center">
              <Minus className="h-12 w-12 mx-auto mb-2 text-blue-400" />
              <p>No placement in DAEP system</p>
              <p className="text-sm mt-1">Accept SIS to create new placement</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {DISPLAY_FIELDS.map(({ key, label }) => {
              const value = getValue(daepData, key);
              const conflict = conflictMap.get(key);

              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    conflict && "bg-yellow-50 border border-yellow-200"
                  )}
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium",
                      conflict && "text-yellow-700"
                    )}>
                      {value || <span className="text-muted-foreground italic">—</span>}
                    </span>
                    {conflict && (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Conflict Highlight Component

```typescript
// components/daep/reconciliation/conflict-highlighter.tsx
import { cn } from '@/lib/utils';

interface ConflictHighlightProps {
  isConflict: boolean;
  sisValue: string | null;
  daepValue: string | null;
  children?: React.ReactNode;
}

export function ConflictHighlight({
  isConflict,
  sisValue,
  daepValue,
  children,
}: ConflictHighlightProps) {
  if (!isConflict) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className={cn(
        "p-2 rounded border-2",
        "bg-yellow-50 border-yellow-300",
        "dark:bg-yellow-950 dark:border-yellow-700"
      )}>
        {children}
      </div>
      <div className="absolute -top-2 -right-2">
        <div className="bg-yellow-500 text-white text-xs px-1 rounded">
          Conflict
        </div>
      </div>
    </div>
  );
}
```

---

## Responsive Design

```typescript
// Mobile-first approach with responsive breakpoints

// On mobile (< 768px):
// - Stack SIS and DAEP sections vertically
// - Collapse to accordion-style view
// - Swipe gestures for navigation

// On tablet/desktop (>= 768px):
// - Side-by-side columns
// - Full comparison visible
// - Button-based navigation
```

---

## Keyboard Navigation

```typescript
// Keyboard shortcuts for power users
// Arrow Left: Previous discrepancy
// Arrow Right: Next discrepancy
// S: Accept SIS
// D: Keep DAEP
// N: Add Note
// Escape: Close note modal
```

---

## Edge Cases

1. **Very long field values:** Truncate with tooltip on hover
2. **Null vs empty string:** Display consistently as "—"
3. **Date format differences:** Normalize to display format (MM/DD/YYYY)
4. **Unicode in names:** Display correctly
5. **Single discrepancy:** Hide navigation arrows
6. **All discrepancies resolved during session:** Show completion screen
7. **Session refresh during review:** Maintain position if possible

---

## Testing Checklist

- [ ] Two-column layout displays correctly
- [ ] Conflicting fields highlighted in yellow
- [ ] "Not in DAEP" displays for new_in_sis
- [ ] "Not in SIS" displays for missing_from_sis
- [ ] Student name prominent at top
- [ ] Navigation Previous/Next works
- [ ] Progress indicator accurate
- [ ] Keyboard shortcuts work
- [ ] Responsive layout on mobile
- [ ] Dark mode colors correct
