/**
 * Room Roster Loading State
 *
 * Story 3-1: Room Roster View
 */

import { Skeleton } from '@/components/ui/skeleton';

export default function RoomRosterLoading() {
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
      <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg border">
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
