'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DAEPRoomSchema, type CreateDAEPRoomInput } from '@/lib/validation/schemas';
import { createDAEPRoom } from '@/app/actions/daep/rooms';
import { getDAEPCampuses } from '@/app/actions/daep/settings';
import { getRoomGroups, type DAEPRoomGroup } from '@/app/actions/daep/room-groups';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddRoomDialog({ open, onOpenChange, onSuccess }: AddRoomDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  const [roomGroups, setRoomGroups] = useState<DAEPRoomGroup[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateDAEPRoomInput>({
    resolver: zodResolver(DAEPRoomSchema),
    defaultValues: {
      room_number: '',
      room_name: '',
      campus_id: '',
      capacity: 15,
      building_section: '',
      room_group_id: null,
      active: true,
    },
  });

  useEffect(() => {
    if (open) {
      fetchCampuses();
      fetchRoomGroups();
    }
  }, [open]);

  const fetchCampuses = async () => {
    try {
      const data = await getDAEPCampuses();
      setCampuses(data);
      // Auto-select if only one campus
      if (data.length === 1) {
        setValue('campus_id', data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch DAEP campuses:', error);
    }
  };

  const fetchRoomGroups = async () => {
    try {
      const data = await getRoomGroups();
      setRoomGroups(data.filter((g) => g.active));
    } catch (error) {
      console.error('Failed to fetch room groups:', error);
    }
  };

  const onSubmit = async (data: CreateDAEPRoomInput) => {
    setSubmitting(true);
    try {
      await createDAEPRoom(data);
      toast({
        title: 'Success',
        description: `Room ${data.room_number} created successfully`,
      });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create room',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] daep-theme">
        <DialogHeader>
          <DialogTitle>Add New Room</DialogTitle>
          <DialogDescription>
            Create a new DAEP room. Staff can be assigned after creation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="room_number">Room Number *</Label>
              <Input
                id="room_number"
                placeholder="e.g., 501"
                {...register('room_number')}
              />
              {errors.room_number && (
                <p className="text-sm text-destructive">{errors.room_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={50}
                {...register('capacity', { valueAsNumber: true })}
              />
              {errors.capacity && (
                <p className="text-sm text-destructive">{errors.capacity.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_name">Room Name (Optional)</Label>
            <Input
              id="room_name"
              placeholder="e.g., Main Classroom"
              {...register('room_name')}
            />
            {errors.room_name && (
              <p className="text-sm text-destructive">{errors.room_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="campus_id">Campus *</Label>
            <Select
              value={watch('campus_id')}
              onValueChange={(value) => setValue('campus_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a campus" />
              </SelectTrigger>
              <SelectContent>
                {campuses.map((campus) => (
                  <SelectItem key={campus.id} value={campus.id}>
                    {campus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.campus_id && (
              <p className="text-sm text-destructive">{errors.campus_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_group_id">Building Section (Optional)</Label>
            <Select
              value={watch('room_group_id') || 'none'}
              onValueChange={(value) => setValue('room_group_id', value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No group assigned</span>
                </SelectItem>
                {roomGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      {group.group_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for separation logic when assigning students from different incidents
            </p>
            {roomGroups.length === 0 && (
              <p className="text-xs text-amber-600">
                No room groups configured. Add groups in the Room Groups section above.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
