'use client';

/**
 * AttendanceRateProgress - Story 3-11
 *
 * Visual progress bar showing attendance rate for student profile.
 * Shows daily + cumulative rates with configurable threshold marker.
 *
 * Color coding:
 * - Green: >90%
 * - Yellow: 85-90%
 * - Red: <85%
 */

import { Progress } from '@/components/ui/progress';
import { AttendanceRateBadge } from '../roster/AttendanceRateBadge';
import { cn } from '@/lib/utils';
import type { AttendanceRateCategory } from '@/lib/validation/schemas';

interface AttendanceRateProgressProps {
  dailyRate: number | null;
  cumulativeRate: number;
  cumulativeCategory: AttendanceRateCategory;
  cumulativeData: {
    periodsPresent: number;
    totalPeriods: number;
    daysWithAttendance: number;
  };
  threshold?: number;
  className?: string;
}

const progressColors: Record<AttendanceRateCategory, string> = {
  green: '[&>div]:bg-green-500',
  yellow: '[&>div]:bg-yellow-500',
  red: '[&>div]:bg-red-500',
};

export function AttendanceRateProgress({
  dailyRate,
  cumulativeRate,
  cumulativeCategory,
  cumulativeData,
  threshold = 85,
  className,
}: AttendanceRateProgressProps) {
  const { periodsPresent, totalPeriods, daysWithAttendance } = cumulativeData;

  // Don't show if no attendance has been tracked yet
  if (totalPeriods === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Attendance</span>
          <span className="text-xs text-muted-foreground">No attendance recorded yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header with rates */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Attendance</span>
        <div className="flex items-center gap-3">
          {dailyRate !== null && (
            <span className="text-xs text-muted-foreground">
              Today:{' '}
              <AttendanceRateBadge rate={dailyRate} size="sm" />
            </span>
          )}
          <span className="font-medium">
            Overall:{' '}
            <AttendanceRateBadge rate={cumulativeRate} category={cumulativeCategory} />
          </span>
        </div>
      </div>

      {/* Progress bar with threshold marker */}
      <div className="relative">
        <Progress
          value={Math.min(cumulativeRate, 100)}
          className={cn('h-2', progressColors[cumulativeCategory])}
        />
        {/* Threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/50"
          style={{ left: `${threshold}%` }}
          title={`${threshold}% threshold`}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {periodsPresent} / {totalPeriods} periods present
        </span>
        <span>
          {daysWithAttendance} {daysWithAttendance === 1 ? 'day' : 'days'} tracked
        </span>
      </div>
    </div>
  );
}
