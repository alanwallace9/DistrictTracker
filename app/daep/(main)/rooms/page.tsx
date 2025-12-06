'use client';

/**
 * Room Selection Page
 *
 * Story 3-1: Room Roster View
 *
 * Entry point for daily operations - lists all accessible rooms
 * with student counts and room group indicators.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, RefreshCw, ArrowRight } from 'lucide-react';
import { getUserAccessibleRooms, type RoomWithCount } from '@/app/actions/daep/roster';

// ========== LOADING SKELETON ==========

function RoomCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <RoomCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ========== EMPTY STATE ==========

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-xl font-medium text-muted-foreground">
        No rooms available
      </h3>
      <p className="text-sm text-muted-foreground/70 mt-2 max-w-md">
        There are no DAEP rooms configured yet. Visit Settings to add rooms before using the daily roster.
      </p>
      <Button
        variant="outline"
        className="mt-6"
        onClick={() => window.location.href = '/daep/settings/rooms'}
      >
        Go to Room Settings
      </Button>
    </div>
  );
}

// ========== ROOM CARD ==========

interface RoomCardProps {
  room: RoomWithCount;
  onClick: () => void;
}

function RoomCard({ room, onClick }: RoomCardProps) {
  const isFull = room.student_count >= room.capacity;
  const utilization = room.capacity > 0
    ? Math.round((room.student_count / room.capacity) * 100)
    : 0;

  // Determine card border/accent based on room group
  const groupColor = room.room_group?.color;
  const borderStyle = groupColor
    ? { borderLeftColor: groupColor, borderLeftWidth: '4px' }
    : {};

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group"
      style={borderStyle}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            {room.room_number}
          </CardTitle>
          <Badge
            variant={isFull ? 'destructive' : room.student_count === 0 ? 'outline' : 'secondary'}
          >
            <Users className="h-3 w-3 mr-1" />
            {room.student_count}/{room.capacity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {room.room_name && (
          <p className="text-sm text-muted-foreground mb-2 truncate">
            {room.room_name}
          </p>
        )}

        {room.room_group && (
          <Badge
            variant="outline"
            className="text-xs"
            style={{ borderColor: groupColor, color: groupColor }}
          >
            {room.room_group.group_name}
          </Badge>
        )}

        {/* Capacity bar */}
        <div className="mt-3">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isFull
                  ? 'bg-destructive'
                  : utilization > 75
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {utilization}% capacity
          </p>
        </div>

        {/* Hover indicator */}
        <div className="flex items-center justify-end mt-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs mr-1">View Roster</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

// ========== MAIN PAGE ==========

export default function RoomsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<RoomWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserAccessibleRooms();
      setRooms(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch rooms',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleRoomClick = (roomId: string) => {
    router.push(`/daep/rooms/${roomId}`);
  };

  // Calculate summary stats
  const totalStudents = rooms.reduce((sum, r) => sum + r.student_count, 0);
  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Room Rosters
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select a room to view and manage its daily roster
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Summary stats */}
          {!loading && rooms.length > 0 && (
            <div className="text-sm text-muted-foreground hidden sm:block">
              <span className="font-medium text-foreground">{totalStudents}</span> students
              {' '}in{' '}
              <span className="font-medium text-foreground">{rooms.length}</span> rooms
              {' '}({totalCapacity} total capacity)
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRooms}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <LoadingState />
      ) : rooms.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onClick={() => handleRoomClick(room.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
