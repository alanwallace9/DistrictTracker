/**
 * Room Roster Page
 *
 * Story 3-1: Room Roster View
 * Story 3-2: Point Entry Grid
 *
 * Displays students assigned to a specific room with period/date selectors.
 * This is the main operational view for DAEP staff daily activities.
 */

import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import {
  getRoomRoster,
  getUserAccessibleRooms,
  canAccessRoom,
} from '@/app/actions/daep/roster';
import { getActiveBehaviorCategories } from '@/app/actions/daep/behavior-categories';
import { getDailyPointsSummary } from '@/app/actions/daep/points';
import { getRoomAttendance, getAttendanceStatusTypes } from '@/app/actions/daep/attendance';
import { RoomRosterView } from './RoomRosterView';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ date?: string; period?: string }>;
}

// Loading skeleton for roster
function RosterLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Controls skeleton */}
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>

      {/* Table skeleton */}
      <div className="border rounded-md">
        <div className="border-b p-4">
          <div className="flex gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b p-4">
            <div className="flex gap-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function RoomRosterPage({ params, searchParams }: PageProps) {
  const { roomId } = await params;
  const { date, period } = await searchParams;

  // Check room access
  const accessCheck = await canAccessRoom(roomId);
  if (!accessCheck.canAccess) {
    if (accessCheck.reason === 'Room not found') {
      notFound();
    }
    redirect('/daep/access-denied');
  }

  // Parse period number from search params
  const periodNumber = period !== undefined ? parseInt(period, 10) : undefined;

  // Fetch room roster, accessible rooms, behavior categories, and attendance status types in parallel
  const [rosterData, accessibleRooms, behaviorCategories, attendanceStatusTypes] = await Promise.all([
    getRoomRoster(roomId, date, periodNumber),
    getUserAccessibleRooms(),
    getActiveBehaviorCategories(),
    getAttendanceStatusTypes(),
  ]);

  // Fetch daily points summary and attendance (after we have the date/period from roster)
  const currentPeriodName = rosterData.periods[rosterData.periodIndex]?.period_name || '';
  const [dailyPoints, attendanceData] = await Promise.all([
    getDailyPointsSummary(roomId, rosterData.date),
    currentPeriodName ? getRoomAttendance(roomId, rosterData.date, currentPeriodName) : Promise.resolve(new Map()),
  ]);

  return (
    <Suspense fallback={<RosterLoadingSkeleton />}>
      <RoomRosterView
        initialData={rosterData}
        accessibleRooms={accessibleRooms}
        behaviorCategories={behaviorCategories}
        initialDailyPoints={dailyPoints}
        initialAttendance={attendanceData}
        attendanceStatusTypes={attendanceStatusTypes}
      />
    </Suspense>
  );
}

// Generate metadata for the page
export async function generateMetadata({ params }: PageProps) {
  const { roomId } = await params;

  try {
    const accessCheck = await canAccessRoom(roomId);
    if (!accessCheck.canAccess) {
      return { title: 'Room Not Found' };
    }

    const rosterData = await getRoomRoster(roomId);
    return {
      title: `Room ${rosterData.room.room_number} - DAEP Roster`,
      description: `View roster for Room ${rosterData.room.room_number}`,
    };
  } catch {
    return { title: 'Room Roster' };
  }
}
