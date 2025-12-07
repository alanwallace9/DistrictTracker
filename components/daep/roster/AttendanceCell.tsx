'use client';

/**
 * Attendance Cell Component
 *
 * Story 3-9: Attendance Entry
 *
 * Interactive attendance cell with inline dropdown.
 * iPad-friendly design - click to open dropdown, select status.
 * For Tardy/ED, opens time modal after selection.
 */

import { useState, useCallback, useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { AttendanceTimeModal } from './AttendanceTimeModal';
import { markAttendance } from '@/app/actions/daep/attendance';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AttendanceStatusType } from '@/app/actions/daep/attendance';

export interface AttendanceCellProps {
  placementId: string;
  date: string;
  period: string;
  currentStatus: string | null;
  tardyTime?: string | null;
  earlyDismissTime?: string | null;
  statusTypes: AttendanceStatusType[];
  onStatusChange?: (status: string) => void;
  disabled?: boolean;
}

export function AttendanceCell({
  placementId,
  date,
  period,
  currentStatus,
  tardyTime,
  earlyDismissTime,
  statusTypes,
  onStatusChange,
  disabled = false,
}: AttendanceCellProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'T' | 'ED' | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);

  // Use optimistic status if available, otherwise current
  const displayStatus = optimisticStatus ?? currentStatus;

  const handleStatusSelect = useCallback(
    async (status: string, time?: string) => {
      // Find the status type config
      const statusType = statusTypes.find((st) => st.status_code === status);

      // Check if this status requires time
      if (statusType?.requires_time && !time) {
        // Open time modal for T or ED
        setPendingStatus(status as 'T' | 'ED');
        setTimeModalOpen(true);
        setIsOpen(false);
        return;
      }

      // Close dropdown
      setIsOpen(false);

      // Optimistic update
      setOptimisticStatus(status);

      startTransition(async () => {
        const result = await markAttendance({
          placement_id: placementId,
          date,
          period,
          status,
          tardy_time: status === 'T' ? time : undefined,
          early_dismiss_time: status === 'ED' ? time : undefined,
        });

        if (result.success) {
          onStatusChange?.(status);

          // Show success toast with points info
          if (result.pointsCreated) {
            toast.success(`Marked ${status} - 10 points awarded`);
          } else if (result.pointsRemoved) {
            toast.success(`Marked ${status} - points removed`);
          } else {
            toast.success(`Marked ${status}`);
          }
        } else {
          // Revert optimistic update
          setOptimisticStatus(null);
          toast.error(result.error || 'Failed to save attendance');
        }
      });
    },
    [placementId, date, period, statusTypes, onStatusChange]
  );

  const handleTimeModalSave = useCallback(
    (time: string) => {
      setTimeModalOpen(false);
      if (pendingStatus) {
        handleStatusSelect(pendingStatus, time);
      }
      setPendingStatus(null);
    },
    [pendingStatus, handleStatusSelect]
  );

  const handleTimeModalCancel = useCallback(() => {
    setTimeModalOpen(false);
    setPendingStatus(null);
  }, []);

  // Get time display if applicable
  const timeDisplay =
    displayStatus === 'T' && tardyTime
      ? tardyTime
      : displayStatus === 'ED' && earlyDismissTime
        ? earlyDismissTime
        : null;

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild disabled={disabled || isPending}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-auto p-1 hover:bg-muted/50 focus-visible:ring-1',
              isPending && 'opacity-50'
            )}
            disabled={disabled || isPending}
          >
            <div className="flex items-center gap-1">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AttendanceStatusBadge status={displayStatus} size="sm" />
              )}
              {timeDisplay && (
                <span className="text-xs text-muted-foreground ml-1">
                  {timeDisplay}
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-40">
          {statusTypes.map((statusType) => (
            <DropdownMenuItem
              key={statusType.status_code}
              onClick={() => handleStatusSelect(statusType.status_code)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AttendanceStatusBadge status={statusType.status_code} size="sm" />
                <span>{statusType.label}</span>
              </div>
              {displayStatus === statusType.status_code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AttendanceTimeModal
        open={timeModalOpen}
        status={pendingStatus}
        onSave={handleTimeModalSave}
        onCancel={handleTimeModalCancel}
        isSubmitting={isPending}
      />
    </>
  );
}
