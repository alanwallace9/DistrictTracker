'use client';

/**
 * SummaryStatsBar
 *
 * Story 4-3: Behavior Notes List View - UX Quick Win
 *
 * Displays summary stats at the top of the page:
 * - Total notes count
 * - Today's notes count (blue)
 * - Negative notes count (red)
 * - Unverified notes count (yellow)
 */

import { cn } from '@/lib/utils';
import type { BehaviorNotesStats } from '@/lib/validation/schemas';

interface SummaryStatsBarProps {
  stats: BehaviorNotesStats;
  loading?: boolean;
}

export function SummaryStatsBar({ stats, loading }: SummaryStatsBarProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-4 text-sm animate-pulse">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-18 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="text-muted-foreground">
        <span className="font-semibold text-foreground">{stats.total}</span> total
      </span>
      <span className="text-muted-foreground/40">•</span>
      <span className={cn('text-muted-foreground', stats.today > 0 && 'text-blue-600')}>
        <span className="font-semibold">{stats.today}</span> today
      </span>
      <span className="text-muted-foreground/40">•</span>
      <span className={cn('text-muted-foreground', stats.negative > 0 && 'text-red-600')}>
        <span className="font-semibold">{stats.negative}</span> negative
      </span>
      <span className="text-muted-foreground/40">•</span>
      <span className={cn('text-muted-foreground', stats.unverified > 0 && 'text-yellow-600')}>
        <span className="font-semibold">{stats.unverified}</span> unverified
      </span>
    </div>
  );
}
