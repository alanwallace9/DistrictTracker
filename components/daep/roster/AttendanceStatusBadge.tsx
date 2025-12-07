'use client';

/**
 * Attendance Status Badge
 *
 * Story 3-9: Attendance Entry
 * Story 3-10: Excuse status display (A/E/U badges)
 *
 * Displays color-coded attendance status badge.
 * For Absent status, shows:
 * - A (amber) - pending review (staff-marked, excused=null)
 * - E (green) - excused + counts toward points (Court/Gov't)
 * - E (red) - excused but no points (Medical/Parent)
 * - U (red) - confirmed unexcused
 */

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EXCUSE_REASON_LABELS, type ExcuseReason } from '@/lib/validation/schemas';

export interface AttendanceStatusBadgeProps {
  status: string | null;
  excused?: boolean | null;
  excuseReason?: ExcuseReason | null;
  countsTowardDaysServed?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

// Default status configurations (non-absent)
const statusConfig: Record<string, { label: string; className: string; title: string }> = {
  P: {
    label: 'P',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    title: 'Present',
  },
  T: {
    label: 'T',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    title: 'Tardy',
  },
  ED: {
    label: 'ED',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    title: 'Early Dismissal',
  },
  FT: {
    label: 'FT',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    title: 'Field Trip',
  },
};

// Default config for unknown statuses
const defaultConfig = {
  className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  title: 'Unknown',
};

export function AttendanceStatusBadge({
  status,
  excused,
  excuseReason,
  countsTowardDaysServed = true,
  size = 'md',
  className,
}: AttendanceStatusBadgeProps) {
  // No attendance taken yet
  if (!status) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded font-medium',
          'bg-muted text-muted-foreground',
          size === 'sm' ? 'px-1.5 py-0.5 text-xs min-w-[24px]' : 'px-2 py-1 text-sm min-w-[32px]',
          className
        )}
        title="No attendance taken"
      >
        --
      </span>
    );
  }

  // Story 3-10: Special handling for Absent status
  if (status === 'A') {
    return (
      <AbsentBadge
        excused={excused}
        excuseReason={excuseReason}
        countsTowardDaysServed={countsTowardDaysServed}
        size={size}
        className={className}
      />
    );
  }

  // Non-absent statuses use standard config
  const config = statusConfig[status] || {
    label: status,
    ...defaultConfig,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-medium',
        config.className,
        size === 'sm' ? 'px-1.5 py-0.5 text-xs min-w-[24px]' : 'px-2 py-1 text-sm min-w-[32px]',
        className
      )}
      title={config.title}
    >
      {config.label}
    </span>
  );
}

/**
 * Absent Badge - handles A/E/U states
 */
function AbsentBadge({
  excused,
  excuseReason,
  countsTowardDaysServed,
  size,
  className,
}: {
  excused?: boolean | null;
  excuseReason?: ExcuseReason | null;
  countsTowardDaysServed?: boolean;
  size: 'sm' | 'md';
  className?: string;
}) {
  // Determine badge state
  let label: string;
  let badgeClassName: string;
  let title: string;

  if (excused === null || excused === undefined) {
    // Pending review (staff-marked)
    label = 'A';
    badgeClassName = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    title = 'Absent - Pending Review';
  } else if (excused === true) {
    // Excused
    label = 'E';
    if (countsTowardDaysServed) {
      // Excused + counts toward points (green)
      badgeClassName = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      title = excuseReason
        ? `Excused (${EXCUSE_REASON_LABELS[excuseReason]}) - Counts toward days`
        : 'Excused - Counts toward days';
    } else {
      // Excused but no points (red)
      badgeClassName = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      title = excuseReason
        ? `Excused (${EXCUSE_REASON_LABELS[excuseReason]}) - Does not count`
        : 'Excused - Does not count toward days';
    }
  } else {
    // Unexcused (excused === false)
    label = 'U';
    badgeClassName = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    title = 'Unexcused Absence';
  }

  const badge = (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded font-medium',
        badgeClassName,
        size === 'sm' ? 'px-1.5 py-0.5 text-xs min-w-[24px]' : 'px-2 py-1 text-sm min-w-[32px]',
        className
      )}
    >
      {label}
    </span>
  );

  // Wrap in tooltip for excused badges with reason
  if (excused === true && excuseReason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{EXCUSE_REASON_LABELS[excuseReason]}</p>
            <p className="text-xs text-muted-foreground">
              {countsTowardDaysServed
                ? 'Counts toward days served'
                : 'Does not count toward days'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <span title={title}>{badge}</span>;
}
