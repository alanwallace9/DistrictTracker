'use client';

/**
 * Days Remaining Badge Component
 *
 * Story 3-1: Room Roster View
 * Color-coded badge showing days remaining in placement
 *
 * Colors:
 * - Green (>10 days): Plenty of time remaining
 * - Yellow (5-10 days): Getting close
 * - Red (<5 days): Urgent attention needed
 * - Gray (null): No data
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DaysRemainingBadgeProps {
  days: number | null;
  className?: string;
}

export function DaysRemainingBadge({ days, className }: DaysRemainingBadgeProps) {
  if (days === null) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        --
      </Badge>
    );
  }

  // Determine color based on days remaining
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
  let colorClass = '';

  if (days > 10) {
    // Green - plenty of time
    variant = 'default';
    colorClass = 'bg-green-500 hover:bg-green-600 text-white';
  } else if (days >= 5) {
    // Yellow - getting close
    variant = 'secondary';
    colorClass = 'bg-yellow-500 hover:bg-yellow-600 text-black';
  } else if (days > 0) {
    // Red - urgent
    variant = 'destructive';
  } else {
    // Zero or negative - should be transitioning
    variant = 'destructive';
    colorClass = 'bg-red-600 hover:bg-red-700';
  }

  return (
    <Badge
      variant={variant}
      className={cn(colorClass, className)}
    >
      {days} {days === 1 ? 'day' : 'days'}
    </Badge>
  );
}
