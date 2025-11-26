'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { PLACEMENT_STATUSES, type PlacementStatus } from '@/lib/validation/schemas';

interface Room {
  id: string;
  room_number: string;
  room_name: string | null;
}

interface StudentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: PlacementStatus | 'all';
  onStatusChange: (status: PlacementStatus | 'all') => void;
  roomFilter: string | 'all';
  onRoomChange: (roomId: string | 'all') => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  rooms: Room[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const STATUS_LABELS: Record<PlacementStatus | 'all', string> = {
  all: 'All Statuses',
  pending: 'Pending',
  active: 'Active',
  transition: 'Transition',
  complete: 'Complete',
};

export function StudentFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  roomFilter,
  onRoomChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  rooms,
  onClearFilters,
  hasActiveFilters,
}: StudentFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, student ID, or home campus..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-white border border-slate-300"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status Filter */}
        <div className="flex-shrink-0 w-40">
          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusChange(value as PlacementStatus | 'all')}
          >
            <SelectTrigger className="bg-white border border-slate-300">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PLACEMENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Room Filter */}
        <div className="flex-shrink-0 w-44">
          <Select value={roomFilter} onValueChange={onRoomChange}>
            <SelectTrigger className="bg-white border border-slate-300">
              <SelectValue placeholder="All Rooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.room_number}
                  {room.room_name ? ` - ${room.room_name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-36 bg-white border border-slate-300"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To:</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-36 bg-white border border-slate-300"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-slate-600 hover:text-slate-900"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
