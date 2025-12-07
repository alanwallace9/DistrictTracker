'use client';

/**
 * Room Roster View Component
 *
 * Story 3-1: Room Roster View
 * Story 3-2: Point Entry Grid
 * Story 3-3: Bulk Point Entry
 *
 * Client-side component that manages the roster view state and interactions.
 * Uses RoomRosterContext for shared state management.
 */

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  Copy,
  Check,
  AlertTriangle,
  Building2,
  Users,
} from 'lucide-react';
import {
  RoomRosterProvider,
  useRoomRoster,
  RoomSelector,
  DateSelector,
  PeriodSelector,
  RoomRosterTable,
  TodaysTotalCell,
  PointAdjustmentCell,
  PointsColorLegend,
  BulkActionsToolbar,
  BulkApplyDialog,
  AttendanceSummaryBanner,
  type StudentRowContext,
} from '@/components/daep/roster';
import { AttendanceCell } from '@/components/daep/roster/AttendanceCell';
import { TableCell } from '@/components/ui/table';
import { ClipboardCheck } from 'lucide-react';
import {
  getRoomRoster,
  type RoomRosterResult,
  type RoomWithCount,
} from '@/app/actions/daep/roster';
import { getDailyPointsSummary, bulkAddPoints } from '@/app/actions/daep/points';
import { getRoomAttendance, type AttendanceStatusType } from '@/app/actions/daep/attendance';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';
import type { DailyPointsSummary, AttendanceEntry } from '@/lib/validation/schemas';

// ========== COPY LINK BUTTON (Quick Win #2) ==========

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy Link
        </>
      )}
    </Button>
  );
}

// ========== NON-SCHOOL DAY ALERT ==========

function NonSchoolDayAlert({ dayType }: { dayType: string | null }) {
  return (
    <Alert variant="default" className="bg-yellow-50 border-yellow-200">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Non-School Day</AlertTitle>
      <AlertDescription className="text-yellow-700">
        {dayType
          ? `This date is marked as "${dayType}". Regular attendance and points may not apply.`
          : 'This date is not marked as a school day in the calendar.'}
      </AlertDescription>
    </Alert>
  );
}

// ========== ROSTER CONTENT ==========

function RosterContent() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    room,
    students,
    periods,
    periodIndex,
    date,
    isSchoolDay,
    dayType,
    currentPeriodInfo,
    accessibleRooms,
    isAdmin,
    dailyPoints,
    behaviorCategories,
    attendance,
    attendanceStatusTypes,
    isLoading,
    error,
    setRoom,
    setDate,
    setPeriod,
    refreshDailyPoints,
    refreshAttendance,
    selectedPlacements,
    clearSelection,
  } = useRoomRoster();

  // Story 3-3: Bulk action dialog state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAdjustment, setBulkAdjustment] = useState<number>(0);

  // Get current period name for adjustment dialog
  const currentPeriodName = periods[periodIndex]?.period_name || '';

  // Story 3-3: Handle bulk action selection from toolbar
  const handleBulkAction = useCallback((adjustment: number) => {
    setBulkAdjustment(adjustment);
    setBulkDialogOpen(true);
  }, []);

  // Story 3-3: Handle bulk action confirmation
  const handleBulkConfirm = useCallback(
    async (adjustment: number, notes: string) => {
      const placementIds = Array.from(selectedPlacements);

      const result = await bulkAddPoints({
        placementIds,
        date,
        period: currentPeriodName,
        adjustment,
        notes,
      });

      if (result.success) {
        // Story 3.5: Different toast for pending vs approved entries
        if (result.isPending) {
          toast({
            title: 'Submitted for Approval',
            description: `${adjustment > 0 ? '+' : ''}${adjustment} points submitted for ${result.count} student${result.count !== 1 ? 's' : ''}. An admin will review.`,
          });
        } else {
          toast({
            title: 'Points Applied',
            description: `Added ${adjustment > 0 ? '+' : ''}${adjustment} points to ${result.count} student${result.count !== 1 ? 's' : ''}`,
          });
        }
        // Refresh points data
        await refreshDailyPoints();
      }

      return result;
    },
    [selectedPlacements, date, currentPeriodName, toast, refreshDailyPoints]
  );

  // Handle room change - navigate to new room
  const handleRoomChange = useCallback((newRoomId: string) => {
    router.push(`/daep/rooms/${newRoomId}?date=${date}&period=${periodIndex}`);
  }, [router, date, periodIndex]);

  if (!room) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/daep/rooms')}
              className="gap-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Room {room.room_number}
            {room.room_name && (
              <span className="text-muted-foreground font-normal">
                - {room.room_name}
              </span>
            )}
          </h2>
          {/* Story 3-2: Capacity display format: "present/assigned (max capacity)" */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {students.filter((s) => s.attendance_status === 'present').length}/
                {students.length} present
              </span>
              <span className="text-muted-foreground/60">
                ({room.capacity} max)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Current period indicator */}
          {currentPeriodInfo?.period && (
            <Badge variant="default" className="gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              Live: {currentPeriodInfo.period.period_name}
            </Badge>
          )}
          <CopyLinkButton />
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border">
        {/* Room Selector */}
        <RoomSelector
          rooms={accessibleRooms}
          selectedRoomId={room.id}
          onRoomChange={handleRoomChange}
          disabled={isLoading}
        />

        <div className="w-px h-8 bg-border hidden sm:block" />

        {/* Date Selector */}
        <DateSelector
          date={date}
          onDateChange={setDate}
          disabled={isLoading}
        />

        <div className="w-px h-8 bg-border hidden sm:block" />

        {/* Period Selector */}
        <PeriodSelector
          periods={periods}
          selectedPeriodIndex={periodIndex}
          onPeriodChange={setPeriod}
          currentPeriodInfo={currentPeriodInfo}
          disabled={isLoading}
        />
      </div>

      {/* Non-school day warning */}
      {!isSchoolDay && <NonSchoolDayAlert dayType={dayType} />}

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Story 3-2 & 3-9: Combined Actions Row - Attendance, Bulk Actions, Points Legend */}
      {students.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Compact Attendance Summary - left of bulk actions */}
            {attendanceStatusTypes.length > 0 && (
              <AttendanceSummaryBanner
                date={date}
                period={currentPeriodName}
                placementIds={students.map((s) => s.placement_id)}
                attendance={attendance}
                onAttendanceUpdated={() => {
                  refreshAttendance();
                  refreshDailyPoints();
                }}
                compact
              />
            )}
            <BulkActionsToolbar onApplyAction={handleBulkAction} />
          </div>
          <PointsColorLegend />
        </div>
      )}

      {/* Student Table with Story 3-2 and 3-9 columns */}
      <RoomRosterTable
        students={students}
        isLoading={isLoading}
        showAttendanceColumn={attendanceStatusTypes.length > 0}
        attendanceColumnHeader={
          <div className="flex items-center gap-1">
            <ClipboardCheck className="h-4 w-4" />
            Attendance
          </div>
        }
        renderAttendanceCell={(context: StudentRowContext) => {
          const { student } = context;
          const entry = attendance.get(student.placement_id);
          const studentName = `${student.first_name} ${student.last_name}`;

          return (
            <TableCell className="px-2">
              <AttendanceCell
                placementId={student.placement_id}
                studentName={studentName}
                date={date}
                period={currentPeriodName}
                currentStatus={entry?.status || null}
                tardyTime={entry?.tardy_time}
                earlyDismissTime={entry?.early_dismiss_time}
                excused={entry?.excused}
                excuseReason={entry?.excuse_reason}
                countsTowardDaysServed={entry?.counts_toward_days_served ?? true}
                statusTypes={attendanceStatusTypes}
                isAdmin={isAdmin}
                onStatusChange={() => {
                  // Refresh both attendance and points (P grants points)
                  refreshAttendance();
                  refreshDailyPoints();
                }}
              />
            </TableCell>
          );
        }}
        extraColumns={[
          { id: 'today_total', header: "Today's Total", width: '100px' },
          { id: 'adjust', header: 'Adjust', width: '80px' },
        ]}
        renderExtraCells={(context: StudentRowContext) => {
          const { student } = context;
          const summary = dailyPoints.get(student.placement_id) || null;

          return (
            <>
              <TodaysTotalCell summary={summary} />
              <PointAdjustmentCell
                placementId={student.placement_id}
                date={date}
                period={currentPeriodName}
                summary={summary}
                studentName={`${student.first_name} ${student.last_name}`}
                behaviorCategories={behaviorCategories}
                onAdjustmentAdded={refreshDailyPoints}
              />
            </>
          );
        }}
      />

      {/* Story 3-3: Bulk Apply Dialog */}
      <BulkApplyDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        adjustment={bulkAdjustment}
        onConfirm={handleBulkConfirm}
      />
    </div>
  );
}

// ========== MAIN COMPONENT ==========

interface RoomRosterViewProps {
  initialData: RoomRosterResult;
  accessibleRooms: RoomWithCount[];
  behaviorCategories: BehaviorCategory[];
  initialDailyPoints: Map<string, DailyPointsSummary>;
  initialAttendance: Map<string, AttendanceEntry>;
  attendanceStatusTypes: AttendanceStatusType[];
  isAdmin: boolean;
}

export function RoomRosterView({
  initialData,
  accessibleRooms,
  behaviorCategories,
  initialDailyPoints,
  initialAttendance,
  attendanceStatusTypes,
  isAdmin,
}: RoomRosterViewProps) {
  const { toast } = useToast();

  // Handler for fetching roster data when params change
  const handleRosterChange = useCallback(
    async (roomId: string, date: string, periodIndex: number) => {
      try {
        return await getRoomRoster(roomId, date, periodIndex);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load roster',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [toast]
  );

  // Story 3-2: Handler for refreshing daily points
  const handlePointsRefresh = useCallback(
    async (roomId: string, date: string) => {
      return await getDailyPointsSummary(roomId, date);
    },
    []
  );

  // Story 3-9: Handler for refreshing attendance
  const handleAttendanceRefresh = useCallback(
    async (roomId: string, date: string, period: string) => {
      return await getRoomAttendance(roomId, date, period);
    },
    []
  );

  return (
    <RoomRosterProvider
      initialRoomId={initialData.room.id}
      initialDate={initialData.date}
      initialPeriodIndex={initialData.periodIndex}
      isAdmin={isAdmin}
      onRosterChange={handleRosterChange}
      onPointsRefresh={handlePointsRefresh}
      onAttendanceRefresh={handleAttendanceRefresh}
    >
      <RosterInitializer
        initialData={initialData}
        accessibleRooms={accessibleRooms}
        behaviorCategories={behaviorCategories}
        initialDailyPoints={initialDailyPoints}
        initialAttendance={initialAttendance}
        attendanceStatusTypes={attendanceStatusTypes}
      />
      <RosterContent />
    </RoomRosterProvider>
  );
}

// Separate component to handle initialization
function RosterInitializer({
  initialData,
  accessibleRooms,
  behaviorCategories,
  initialDailyPoints,
  initialAttendance,
  attendanceStatusTypes,
}: {
  initialData: RoomRosterResult;
  accessibleRooms: RoomWithCount[];
  behaviorCategories: BehaviorCategory[];
  initialDailyPoints: Map<string, DailyPointsSummary>;
  initialAttendance: Map<string, AttendanceEntry>;
  attendanceStatusTypes: AttendanceStatusType[];
}) {
  const { initializeFromData } = useRoomRoster();

  useEffect(() => {
    initializeFromData(
      initialData,
      accessibleRooms,
      behaviorCategories,
      initialDailyPoints,
      initialAttendance,
      attendanceStatusTypes
    );
  }, [initialData, accessibleRooms, behaviorCategories, initialDailyPoints, initialAttendance, attendanceStatusTypes, initializeFromData]);

  return null;
}
