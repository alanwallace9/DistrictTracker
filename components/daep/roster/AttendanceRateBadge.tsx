'use client';

/**
 * AttendanceRateBadge - Story 3-11
 *
 * Color-coded badge showing attendance rate.
 * - Green: >90%
 * - Yellow: 85-90%
 * - Red: <85%
 */

import { cn } from '@/lib/utils';
import type { AttendanceRateCategory } from '@/lib/validation/schemas';

interface AttendanceRateBadgeProps {
  rate: number;
  category?: AttendanceRateCategory;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const categoryColors: Record<AttendanceRateCategory, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-2.5 py-1.5 text-base',
};

function getRateCategoryFromRate(rate: number): AttendanceRateCategory {
  if (rate > 90) return 'green';
  if (rate >= 85) return 'yellow';
  return 'red';
}

export function AttendanceRateBadge({
  rate,
  category,
  size = 'md',
  showLabel = false,
  className,
}: AttendanceRateBadgeProps) {
  const effectiveCategory = category || getRateCategoryFromRate(rate);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-medium',
        categoryColors[effectiveCategory],
        sizeClasses[size],
        className
      )}
    >
      {showLabel && <span className="mr-1">Attendance:</span>}
      {rate.toFixed(0)}%
    </span>
  );
}
