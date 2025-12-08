'use client';

/**
 * Attendance Cell Component
 *
 * Story 3-9: Attendance Entry
 * Story 3-10: Role-based excuse handling
 * Story 3-12: Override with audit trail
 *
 * Interactive attendance cell with inline dropdown.
 * iPad-friendly design - click to open dropdown, select status.
 *
 * Role-based behavior:
 * - Staff: Absent saves immediately as pending (no modal)
 * - Admin L1/L2: Absent opens ExcuseModal for excuse details
 * - Admin editing someone else's entry: OverrideReasonModal opens
 *
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
import { ExcuseModal, type ExcuseData } from './ExcuseModal';
import { OverrideReasonModal, type OverrideData } from './OverrideReasonModal';
import { markAttendance, getParentCallCount } from '@/app/actions/daep/attendance';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AttendanceStatusType } from '@/app/actions/daep/attendance';
import type { ExcuseReason } from '@/lib/validation/schemas';

export interface AttendanceCellProps {
  placementId: string;
  studentName: string;
  date: string;
  period: string;
  currentStatus: string | null;
  tardyTime?: string | null;
  earlyDismissTime?: string | null;
  excused?: boolean | null;
  excuseReason?: ExcuseReason | null;
  countsTowardDaysServed?: boolean;
  statusTypes: AttendanceStatusType[];
  isAdmin: boolean;
  onStatusChange?: (status: string) => void;
  disabled?: boolean;
  // Story 3-12: Override detection
  enteredBy?: string | null;
  currentUserId?: string;
}

export function AttendanceCell({
  placementId,
  studentName,
  date,
  period,
  currentStatus,
  tardyTime,
  earlyDismissTime,
  excused,
  excuseReason,
  countsTowardDaysServed = true,
  statusTypes,
  isAdmin,
  onStatusChange,
  disabled = false,
  // Story 3-12: Override detection
  enteredBy,
  currentUserId,
}: AttendanceCellProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [excuseModalOpen, setExcuseModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'T' | 'ED' | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null);
  const [parentCallCount, setParentCallCount] = useState(0);
  // Story 3-12: Override modal state
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [pendingNewStatus, setPendingNewStatus] = useState<string | null>(null);
  const [pendingTime, setPendingTime] = useState<string | undefined>(undefined);

  // Use optimistic status if available, otherwise current
  const displayStatus = optimisticStatus ?? currentStatus;

  // Save attendance (called by handleStatusSelect, ExcuseModal, or OverrideReasonModal)
  const saveAttendance = useCallback(
    async (
      status: string,
      options?: {
        time?: string;
        excuseData?: ExcuseData;
        overrideData?: OverrideData;
      }
    ) => {
      const { time, excuseData, overrideData } = options || {};

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
          // Story 3-10: Excuse fields (only sent by admin)
          excused: excuseData?.excused,
          excuse_reason: excuseData?.excuse_reason,
          excuse_notes: excuseData?.excuse_notes,
          counts_toward_days_served: excuseData?.counts_toward_days_served,
          // Story 3-12: Override fields (when admin edits someone else's entry)
          override_reason: overrideData?.override_reason,
          override_notes: overrideData?.override_notes,
        });

        if (result.success) {
          onStatusChange?.(status);

          // Show success toast with context
          if (overrideData) {
            toast.success('Attendance override saved');
          } else if (status === 'A') {
            if (excuseData?.excused) {
              if (excuseData.counts_toward_days_served) {
                toast.success('Marked Excused - counts toward days served');
              } else {
                toast.success('Marked Excused - does not count toward days');
              }
            } else if (excuseData?.excused === false) {
              toast.success('Marked Unexcused');
            } else {
              toast.success('Marked Absent - pending review');
            }
          } else if (result.pointsCreated) {
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
    [placementId, date, period, onStatusChange]
  );

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

      // Story 3-12: Check if admin is editing someone else's existing entry
      const needsOverrideReason =
        isAdmin &&
        currentStatus !== null && // has existing entry
        enteredBy && // has entered_by info
        currentUserId && // has current user info
        enteredBy !== currentUserId; // entered by someone else

      if (needsOverrideReason) {
        // Store pending status and time, open override modal
        setPendingNewStatus(status);
        setPendingTime(time);
        setOverrideModalOpen(true);
        setIsOpen(false);
        return;
      }

      // Story 3-10: Check if Absent and user is admin
      if (status === 'A' && isAdmin) {
        // Fetch parent call count for this placement
        try {
          const count = await getParentCallCount(placementId);
          setParentCallCount(count);
        } catch {
          setParentCallCount(0);
        }
        setExcuseModalOpen(true);
        setIsOpen(false);
        return;
      }

      // Close dropdown and save
      setIsOpen(false);
      saveAttendance(status, { time });
    },
    [placementId, statusTypes, isAdmin, currentStatus, enteredBy, currentUserId, saveAttendance]
  );

  const handleTimeModalSave = useCallback(
    (time: string) => {
      setTimeModalOpen(false);

      if (!pendingStatus) {
        setPendingStatus(null);
        return;
      }

      // Story 3-12: Check if override is needed after time entry
      const needsOverrideReason =
        isAdmin &&
        currentStatus !== null &&
        enteredBy &&
        currentUserId &&
        enteredBy !== currentUserId;

      if (needsOverrideReason) {
        // Store pending status and time, open override modal
        setPendingNewStatus(pendingStatus);
        setPendingTime(time);
        setOverrideModalOpen(true);
        setPendingStatus(null);
        return;
      }

      saveAttendance(pendingStatus, { time });
      setPendingStatus(null);
    },
    [pendingStatus, isAdmin, currentStatus, enteredBy, currentUserId, saveAttendance]
  );

  const handleTimeModalCancel = useCallback(() => {
    setTimeModalOpen(false);
    setPendingStatus(null);
  }, []);

  const handleExcuseModalSave = useCallback(
    (excuseData: ExcuseData) => {
      setExcuseModalOpen(false);
      saveAttendance('A', { excuseData });
    },
    [saveAttendance]
  );

  const handleExcuseModalClose = useCallback(() => {
    setExcuseModalOpen(false);
  }, []);

  // Story 3-12: Override modal handlers
  const handleOverrideModalSave = useCallback(
    (overrideData: OverrideData) => {
      setOverrideModalOpen(false);
      if (pendingNewStatus) {
        saveAttendance(pendingNewStatus, { time: pendingTime, overrideData });
      }
      setPendingNewStatus(null);
      setPendingTime(undefined);
    },
    [pendingNewStatus, pendingTime, saveAttendance]
  );

  const handleOverrideModalClose = useCallback(() => {
    setOverrideModalOpen(false);
    setPendingNewStatus(null);
    setPendingTime(undefined);
  }, []);

  // Handle clicking on existing Absent badge (admin can edit excuse)
  const handleBadgeClick = useCallback(async () => {
    if (isAdmin && currentStatus === 'A') {
      // Fetch parent call count
      try {
        const count = await getParentCallCount(placementId);
        setParentCallCount(count);
      } catch {
        setParentCallCount(0);
      }
      setExcuseModalOpen(true);
    }
  }, [isAdmin, currentStatus, placementId]);

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
            onClick={(e) => {
              // If clicking on an existing A badge as admin, open excuse modal instead
              if (isAdmin && currentStatus === 'A') {
                e.preventDefault();
                handleBadgeClick();
              }
            }}
          >
            <div className="flex items-center gap-1">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AttendanceStatusBadge
                  status={displayStatus}
                  excused={excused}
                  countsTowardDaysServed={countsTowardDaysServed}
                  size="sm"
                />
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

      {/* Story 3-10: Excuse Modal for Admin */}
      <ExcuseModal
        isOpen={excuseModalOpen}
        onClose={handleExcuseModalClose}
        onSave={handleExcuseModalSave}
        studentName={studentName}
        currentData={
          currentStatus === 'A'
            ? {
                excused: excused ?? null,
                excuse_reason: excuseReason ?? null,
                counts_toward_days_served: countsTowardDaysServed,
              }
            : undefined
        }
        parentCallCount={parentCallCount}
        isLoading={isPending}
      />

      {/* Story 3-12: Override Reason Modal */}
      <OverrideReasonModal
        isOpen={overrideModalOpen}
        onClose={handleOverrideModalClose}
        onConfirm={handleOverrideModalSave}
        isLoading={isPending}
      />
    </>
  );
}
