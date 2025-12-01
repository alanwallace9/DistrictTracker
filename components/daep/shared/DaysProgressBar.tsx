'use client';

import { Progress } from '@/components/ui/progress';

interface DaysProgressBarProps {
  daysServed: number;
  daysAssigned: number;
  daysRemaining: number;
  showLabels?: boolean;
  className?: string;
}

/**
 * Days Progress Bar Component
 * Displays visual progress of days served vs days assigned
 *
 * Story 2-7: AC 2.7.6 - Display days remaining on placement cards
 *
 * Design decisions:
 * - Uses standard bg-primary color (no conditional coloring per PO decision)
 * - Shows served/remaining text labels when showLabels=true
 * - Progress percentage calculated as (daysServed / daysAssigned) * 100
 */
export function DaysProgressBar({
  daysServed,
  daysAssigned,
  daysRemaining,
  showLabels = true,
  className = '',
}: DaysProgressBarProps) {
  // Calculate progress percentage (0-100)
  const progressPercent = daysAssigned > 0
    ? Math.min(100, Math.round((daysServed / daysAssigned) * 100))
    : 0;

  // Is placement complete?
  const isComplete = daysRemaining === 0 && daysServed >= daysAssigned;

  return (
    <div className={`space-y-1 ${className}`}>
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {daysServed} of {daysAssigned} days served
          </span>
          <span>
            {isComplete ? (
              <span className="font-medium text-foreground">Complete</span>
            ) : (
              `${daysRemaining} remaining`
            )}
          </span>
        </div>
      )}

      <Progress value={progressPercent} className="h-2" />

      {showLabels && (
        <div className="text-xs text-center text-muted-foreground">
          {progressPercent}% complete
        </div>
      )}
    </div>
  );
}
