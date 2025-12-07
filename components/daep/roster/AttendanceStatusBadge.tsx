'use client';

/**
 * Attendance Status Badge
 *
 * Story 3-9: Attendance Entry
 *
 * Displays color-coded attendance status badge.
 * Used in the roster table attendance cell.
 */

import { cn } from '@/lib/utils';

export interface AttendanceStatusBadgeProps {
  status: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

// Default status configurations
const statusConfig: Record<string, { label: string; className: string; title: string }> = {
  P: {
    label: 'P',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    title: 'Present',
  },
  A: {
    label: 'A',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    title: 'Absent',
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
