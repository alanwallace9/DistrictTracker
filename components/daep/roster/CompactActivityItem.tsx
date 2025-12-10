'use client';

/**
 * Compact Activity Item Component
 *
 * Story 4-1: Quick Behavior Note Entry
 *
 * Single-line format for displaying activity items in the inline panel.
 * Shows: Icon + Points Badge + Summary + Timestamp
 *
 * Used in:
 * - InlineStudentPanel recent activity section
 * - StudentPointsLog (future update for consistent styling)
 */

import { Pencil, Circle, FileText } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { RecentActivityItem } from '@/lib/validation/schemas';

// ========== HELPER: Point Badge Styling ==========

function getPointBadgeClass(points: number): string {
  if (points > 0) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (points < 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
}

// ========== HELPER: Activity Icon ==========

function getActivityIcon(type: RecentActivityItem['type']) {
  switch (type) {
    case 'point_entry':
      return Pencil;
    case 'behavior_note':
      return FileText;
    case 'attendance':
      return Circle;
    default:
      return Pencil;
  }
}

// ========== PROPS ==========

export interface CompactActivityItemProps {
  item: RecentActivityItem;
  className?: string;
}

// ========== COMPONENT ==========

export function CompactActivityItem({ item, className }: CompactActivityItemProps) {
  const Icon = getActivityIcon(item.type);

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 py-1.5 px-2 rounded',
        'hover:bg-muted/50 transition-colors',
        'text-xs',
        className
      )}
    >
      {/* Left side: Icon + Badge + Summary */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Icon */}
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

        {/* Points badge (if applicable) */}
        {item.points !== undefined && (
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 min-w-[32px] text-center',
              getPointBadgeClass(item.points)
            )}
          >
            {item.points > 0 ? `+${item.points}` : item.points}
          </span>
        )}

        {/* Summary text */}
        <span className="text-foreground truncate">{item.summary}</span>
      </div>

      {/* Right side: Timestamp */}
      <span className="text-muted-foreground whitespace-nowrap flex-shrink-0">
        {formatRelativeTime(item.timestamp)}
      </span>
    </div>
  );
}

// ========== EMPTY STATE ==========

export function CompactActivityEmpty() {
  return (
    <div className="py-4 px-2 text-center text-xs text-muted-foreground">
      No recent activity
    </div>
  );
}
