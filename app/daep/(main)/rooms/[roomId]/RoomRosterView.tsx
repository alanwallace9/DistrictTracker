'use client';

/**
 * Room Roster View Component
 *
 * Story 3-1: Room Roster View
 * Story 3-2: Point Entry Grid
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
import { TableCell } from '@/components/ui/table';
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
  type StudentRowContext,
} from '@/components/daep/roster';
import {
  getRoomRoster,
  type RoomRosterResult,
  type RoomWithCount,
} from '@/app/actions/daep/roster';
import { getDailyPointsSummary } from '@/app/actions/daep/points';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';
import type { DailyPointsSummary } from '@/lib/validation/schemas';

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
    dailyPoints,
    behaviorCategories,
    isLoading,
    error,
    setRoom,
    setDate,
    setPeriod,
    refreshDailyPoints,
  } = useRoomRoster();

  // Get current period name for adjustment dialog
  const currentPeriodName = periods[periodIndex]?.period_name || '';

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

      {/* Story 3-2: Points Color Legend */}
      {students.length > 0 && (
        <div className="flex justify-end">
          <PointsColorLegend />
        </div>
      )}

      {/* Student Table with Story 3-2 columns */}
      <RoomRosterTable
        students={students}
        isLoading={isLoading}
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
    </div>
  );
}

// ========== MAIN COMPONENT ==========

interface RoomRosterViewProps {
  initialData: RoomRosterResult;
  accessibleRooms: RoomWithCount[];
  behaviorCategories: BehaviorCategory[];
  initialDailyPoints: Map<string, DailyPointsSummary>;
}

export function RoomRosterView({
  initialData,
  accessibleRooms,
  behaviorCategories,
  initialDailyPoints,
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

  return (
    <RoomRosterProvider
      initialRoomId={initialData.room.id}
      initialDate={initialData.date}
      initialPeriodIndex={initialData.periodIndex}
      onRosterChange={handleRosterChange}
      onPointsRefresh={handlePointsRefresh}
    >
      <RosterInitializer
        initialData={initialData}
        accessibleRooms={accessibleRooms}
        behaviorCategories={behaviorCategories}
        initialDailyPoints={initialDailyPoints}
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
}: {
  initialData: RoomRosterResult;
  accessibleRooms: RoomWithCount[];
  behaviorCategories: BehaviorCategory[];
  initialDailyPoints: Map<string, DailyPointsSummary>;
}) {
  const { initializeFromData } = useRoomRoster();

  useEffect(() => {
    initializeFromData(initialData, accessibleRooms, behaviorCategories, initialDailyPoints);
  }, [initialData, accessibleRooms, behaviorCategories, initialDailyPoints, initializeFromData]);

  return null;
}
