'use client';

/**
 * Attendance Summary Banner
 *
 * Story 3-9: Attendance Entry
 *
 * Displays attendance summary with count and "Mark All Present" button.
 * Shows: "5/12 students marked (7 unmarked) | [Mark All Present]"
 */

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Users, Loader2, CheckCircle2 } from 'lucide-react';
import { bulkMarkAttendance } from '@/app/actions/daep/attendance';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AttendanceEntry } from '@/lib/validation/schemas';

export interface AttendanceSummaryBannerProps {
  date: string;
  period: string;
  placementIds: string[];
  attendance: Map<string, AttendanceEntry>;
  onAttendanceUpdated?: () => void;
  className?: string;
  /** Compact mode for inline display next to other controls */
  compact?: boolean;
}

export function AttendanceSummaryBanner({
  date,
  period,
  placementIds,
  attendance,
  onAttendanceUpdated,
  className,
  compact = false,
}: AttendanceSummaryBannerProps) {
  const [isPending, startTransition] = useTransition();

  // Calculate attendance stats
  const totalStudents = placementIds.length;
  const markedCount = placementIds.filter((id) => attendance.has(id)).length;
  const unmarkedCount = totalStudents - markedCount;
  const presentCount = placementIds.filter(
    (id) => attendance.get(id)?.status === 'P'
  ).length;
  const allMarked = unmarkedCount === 0;
  const allPresent = presentCount === totalStudents;

  const handleMarkAllPresent = () => {
    // Get all placement IDs that are not already marked as Present
    const idsToMark = placementIds.filter((id) => {
      const entry = attendance.get(id);
      return entry?.status !== 'P';
    });

    if (idsToMark.length === 0) {
      toast.info('All students are already marked present');
      return;
    }

    startTransition(async () => {
      const result = await bulkMarkAttendance({
        placement_ids: idsToMark,
        date,
        period,
        status: 'P',
      });

      if (result.success) {
        toast.success(`Marked ${result.count} students present`);
        onAttendanceUpdated?.();
      } else {
        toast.error(result.error || 'Failed to mark attendance');
      }
    });
  };

  if (totalStudents === 0) {
    return null;
  }

  // Compact mode: inline display for toolbar row
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Compact stats */}
        <div className="flex items-center gap-2 text-sm">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          <Badge
            variant={allPresent ? 'default' : allMarked ? 'secondary' : 'outline'}
            className={cn(
              'gap-1',
              allPresent && 'bg-emerald-500 hover:bg-emerald-500'
            )}
          >
            {allPresent ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                All Present
              </>
            ) : (
              <>
                <Users className="h-3 w-3" />
                {markedCount}/{totalStudents}
                {unmarkedCount > 0 && (
                  <span className="text-amber-500 ml-1">({unmarkedCount})</span>
                )}
              </>
            )}
          </Badge>
        </div>

        {/* Compact Mark All Button */}
        {!allPresent && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllPresent}
            disabled={isPending}
            className="h-7 px-2 text-xs gap-1"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3" />
                All P
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // Full banner mode (original)
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg border',
        allPresent
          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
          : allMarked
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
            : 'bg-muted/50 border-border',
        className
      )}
    >
      {/* Summary Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Attendance</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {/* Marked Count */}
          <div className="flex items-center gap-1">
            <Badge
              variant={allMarked ? 'default' : 'secondary'}
              className="gap-1"
            >
              <Users className="h-3 w-3" />
              {markedCount}/{totalStudents}
            </Badge>
            <span className="text-muted-foreground">marked</span>
          </div>

          {/* Unmarked Count (if any) */}
          {unmarkedCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              ({unmarkedCount} unmarked)
            </span>
          )}

          {/* All Present Indicator */}
          {allPresent && (
            <Badge
              variant="default"
              className="bg-emerald-500 hover:bg-emerald-500 gap-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              All Present
            </Badge>
          )}
        </div>
      </div>

      {/* Mark All Present Button */}
      {!allPresent && (
        <Button
          variant={unmarkedCount > 0 ? 'default' : 'outline'}
          size="sm"
          onClick={handleMarkAllPresent}
          disabled={isPending}
          className="gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Marking...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Mark All Present
            </>
          )}
        </Button>
      )}
    </div>
  );
}
