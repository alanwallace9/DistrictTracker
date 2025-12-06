'use client';

/**
 * Room Selector Component
 *
 * Story 3-1: Room Roster View
 * Dropdown to switch between rooms with student count badge (Quick Win #3)
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import type { RoomWithCount } from '@/app/actions/daep/roster';

interface RoomSelectorProps {
  rooms: RoomWithCount[];
  selectedRoomId: string;
  onRoomChange: (roomId: string) => void;
  disabled?: boolean;
}

export function RoomSelector({
  rooms,
  selectedRoomId,
  onRoomChange,
  disabled = false,
}: RoomSelectorProps) {
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Select
        value={selectedRoomId}
        onValueChange={onRoomChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select room">
            {selectedRoom && (
              <span className="flex items-center gap-2">
                <span>{selectedRoom.room_number}</span>
                {selectedRoom.room_name && (
                  <span className="text-muted-foreground truncate">
                    - {selectedRoom.room_name}
                  </span>
                )}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedRoom.student_count}
                </Badge>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {rooms.map((room) => (
            <SelectItem key={room.id} value={room.id}>
              <div className="flex items-center justify-between w-full gap-2">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{room.room_number}</span>
                  {room.room_name && (
                    <span className="text-muted-foreground">
                      - {room.room_name}
                    </span>
                  )}
                </span>
                <Badge
                  variant={room.student_count >= room.capacity ? 'destructive' : 'secondary'}
                  className="ml-2 text-xs"
                >
                  {room.student_count}/{room.capacity}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
