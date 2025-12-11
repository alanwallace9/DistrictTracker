'use client';

/**
 * QuickFilterChips
 *
 * Story 4-3: Behavior Notes List View - UX Quick Win
 *
 * One-click filter presets for common queries:
 * - Today: Notes from today
 * - This Week: Notes from current week
 * - Negative: Only negative category notes
 * - My Notes: Notes created by current user
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface QuickFilter {
  label: string;
  filter: {
    date_from?: string;
    date_to?: string;
    category_type?: 'positive' | 'negative' | 'neutral';
    staff_id?: string;
  };
}

interface QuickFilterChipsProps {
  activeFilter: string | null;
  onFilterSelect: (filter: QuickFilter | null) => void;
  currentUserId?: string;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export function QuickFilterChips({
  activeFilter,
  onFilterSelect,
  currentUserId,
}: QuickFilterChipsProps) {
  const today = getToday();
  const weekStart = getWeekStart();

  const QUICK_FILTERS: QuickFilter[] = [
    {
      label: 'Today',
      filter: { date_from: today, date_to: today },
    },
    {
      label: 'This Week',
      filter: { date_from: weekStart, date_to: today },
    },
    {
      label: 'Negative',
      filter: { category_type: 'negative' },
    },
    ...(currentUserId
      ? [
          {
            label: 'My Notes',
            filter: { staff_id: currentUserId },
          },
        ]
      : []),
  ];

  const handleClick = (filter: QuickFilter) => {
    if (activeFilter === filter.label) {
      // Clear filter if clicking active one
      onFilterSelect(null);
    } else {
      onFilterSelect(filter);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_FILTERS.map((filter) => (
        <Button
          key={filter.label}
          variant={activeFilter === filter.label ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleClick(filter)}
          className={cn(
            'rounded-full',
            activeFilter === filter.label &&
              'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
