'use client';

/**
 * Today's Total Cell Component
 *
 * Story 3-2: Point Entry Grid
 *
 * Displays running point total for a student with color coding based on
 * percentage of expected points by current period.
 *
 * Colors:
 * - Green/Blue (90%+): On target
 * - Yellow (80-89%): Falling behind
 * - Red (<80%): Needs attention
 * - Gray (no data): No points recorded yet
 *
 * Format: "47/50" (current/expected) with percentage tooltip
 */

import { Badge } from '@/components/ui/badge';
import { TableCell } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DailyPointsSummary } from '@/lib/validation/schemas';

interface TodaysTotalCellProps {
  summary: DailyPointsSummary | null;
  className?: string;
}

// Color thresholds
const THRESHOLD_ON_TARGET = 90;
const THRESHOLD_FALLING_BEHIND = 80;

function getColorClasses(percentage: number): string {
  if (percentage >= THRESHOLD_ON_TARGET) {
    // Green/blue - on target
    return 'bg-emerald-500 hover:bg-emerald-600 text-white';
  } else if (percentage >= THRESHOLD_FALLING_BEHIND) {
    // Yellow - falling behind
    return 'bg-yellow-500 hover:bg-yellow-600 text-black';
  } else {
    // Red - needs attention
    return 'bg-red-500 hover:bg-red-600 text-white';
  }
}

function getStatusLabel(percentage: number): string {
  if (percentage >= THRESHOLD_ON_TARGET) {
    return 'On Target';
  } else if (percentage >= THRESHOLD_FALLING_BEHIND) {
    return 'Falling Behind';
  } else {
    return 'Needs Attention';
  }
}

export function TodaysTotalCell({ summary, className }: TodaysTotalCellProps) {
  // No data state
  if (!summary || summary.expected_points === 0) {
    return (
      <TableCell className={cn('text-center', className)}>
        <Badge variant="outline" className="text-muted-foreground">
          --
        </Badge>
      </TableCell>
    );
  }

  const { day_total, expected_points, percentage, base_points, adjustments } = summary;

  // Format the display
  const displayText = `${day_total}/${expected_points}`;
  const colorClasses = getColorClasses(percentage);
  const statusLabel = getStatusLabel(percentage);

  return (
    <TableCell className={cn('text-center', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={cn(colorClasses, 'cursor-help font-mono tabular-nums')}>
              {displayText}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-sm">
            <div className="space-y-1">
              <div className="font-medium">{statusLabel} ({percentage}%)</div>
              <div className="text-muted-foreground">
                Base: {base_points} pts
                {adjustments !== 0 && (
                  <span className={adjustments > 0 ? 'text-green-400' : 'text-red-400'}>
                    {' '}({adjustments > 0 ? '+' : ''}{adjustments})
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground/70">
                {summary.periods_present} period{summary.periods_present !== 1 ? 's' : ''} present
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TableCell>
  );
}

// Standalone badge for use outside table context
export function TodaysTotalBadge({ summary, className }: TodaysTotalCellProps) {
  if (!summary || summary.expected_points === 0) {
    return (
      <Badge variant="outline" className={cn('text-muted-foreground', className)}>
        --
      </Badge>
    );
  }

  const { day_total, expected_points, percentage } = summary;
  const displayText = `${day_total}/${expected_points}`;
  const colorClasses = getColorClasses(percentage);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={cn(colorClasses, 'cursor-help font-mono tabular-nums', className)}>
            {displayText}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-sm">
          <div className="font-medium">{getStatusLabel(percentage)} ({percentage}%)</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Color legend component for reference
export function PointsColorLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-xs', className)}>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="text-muted-foreground">90%+ On Target</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="text-muted-foreground">80-89% Falling Behind</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <span className="text-muted-foreground">&lt;80% Needs Attention</span>
      </div>
    </div>
  );
}
