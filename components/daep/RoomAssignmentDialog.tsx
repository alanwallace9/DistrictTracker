'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DAEPDialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/daep/DAEPDialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DoorOpen,
  Users,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Building,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAvailableRoomsForStudent,
  assignRoom,
  type RoomAvailability,
} from '@/app/actions/daep/rooms';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placementId: string;
  schoolId: string;
  studentName: string;
  currentRoomId?: string | null;
  onSuccess?: () => void;
}

export function RoomAssignmentDialog({
  open,
  onOpenChange,
  placementId,
  schoolId,
  studentName,
  currentRoomId,
  onSuccess,
}: Props) {
  const [rooms, setRooms] = useState<RoomAvailability[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if any rooms are blocked by separation
  const hasSeparationBlocks = rooms.some(
    (r) => r.blocked_reason?.startsWith('Separation:')
  );

  // Load rooms when dialog opens
  useEffect(() => {
    if (open && schoolId) {
      setLoading(true);
      getAvailableRoomsForStudent(schoolId, placementId)
        .then(setRooms)
        .catch((err) => {
          console.error('Failed to load rooms:', err);
          toast.error('Failed to load rooms');
        })
        .finally(() => setLoading(false));
    }
  }, [open, schoolId, placementId]);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedRoomId(null);
    }
  }, [open]);

  const handleAssign = async () => {
    if (!selectedRoomId) return;

    setSubmitting(true);
    try {
      const result = await assignRoom(placementId, selectedRoomId);
      if (result.success) {
        toast.success('Room assigned successfully');
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to assign room');
      }
    } catch (err) {
      console.error('Error assigning room:', err);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DAEPDialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="w-5 h-5" />
            Assign Room
          </DialogTitle>
          <DialogDescription>
            Select a room for <strong>{studentName}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Separation Warning Banner (AC: 2.5.4) */}
        {hasSeparationBlocks && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Some rooms are blocked due to student separation requirements.
              Blocked sections are shown in red.
            </AlertDescription>
          </Alert>
        )}

        {/* Room List */}
        <div className="py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No rooms available
            </div>
          ) : (
            <RadioGroup
              value={selectedRoomId || ''}
              onValueChange={setSelectedRoomId}
              className="space-y-2"
            >
              {rooms.map((room) => (
                <TooltipProvider key={room.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`relative flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                          room.is_available
                            ? selectedRoomId === room.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/50'
                            : 'opacity-60 cursor-not-allowed bg-muted/30'
                        } ${
                          room.blocked_reason?.startsWith('Separation:')
                            ? 'border-red-200 bg-red-50/50'
                            : room.available_spots <= 0
                            ? 'border-orange-200 bg-orange-50/50'
                            : ''
                        }`}
                        onClick={() =>
                          room.is_available && setSelectedRoomId(room.id)
                        }
                      >
                        <RadioGroupItem
                          value={room.id}
                          id={room.id}
                          disabled={!room.is_available}
                          className="shrink-0"
                        />
                        <Label
                          htmlFor={room.id}
                          className="flex-1 cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              Room {room.room_number}
                            </span>
                            {room.building_section && (
                              <Badge variant="outline" className="text-xs">
                                <Building className="w-3 h-3 mr-1" />
                                {room.building_section}
                              </Badge>
                            )}
                            {room.room_name && (
                              <span className="text-muted-foreground text-sm">
                                ({room.room_name})
                              </span>
                            )}
                            {currentRoomId === room.id && (
                              <Badge variant="secondary" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Occupancy Display (AC: 2.5.2) */}
                            <span
                              className={`text-sm flex items-center gap-1 ${
                                room.available_spots <= 0
                                  ? 'text-orange-600'
                                  : room.available_spots <= 3
                                  ? 'text-yellow-600'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              <Users className="w-4 h-4" />
                              {room.current_count}/{room.capacity}
                            </span>
                            {/* Status Icon */}
                            {room.is_available ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : room.blocked_reason?.startsWith(
                                'Separation:'
                              ) ? (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            ) : (
                              <X className="w-4 h-4 text-orange-500" />
                            )}
                          </div>
                        </Label>
                      </div>
                    </TooltipTrigger>
                    {!room.is_available && room.blocked_reason && (
                      <TooltipContent>
                        <p>{room.blocked_reason}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ))}
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedRoomId || submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assign Room
          </Button>
        </DialogFooter>
      </DAEPDialogContent>
    </Dialog>
  );
}
