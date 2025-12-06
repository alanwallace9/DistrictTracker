'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DAEPRoomGroupSchema, type CreateDAEPRoomGroupInput } from '@/lib/validation/schemas';
import { updateRoomGroup, type DAEPRoomGroup } from '@/app/actions/daep/room-groups';
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

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: DAEPRoomGroup | null;
  onSuccess: () => void;
}

// Preset colors for room groups
const PRESET_COLORS = [
  { name: 'Gray', value: '#6B7280' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
];

export function EditGroupDialog({ open, onOpenChange, group, onSuccess }: EditGroupDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateDAEPRoomGroupInput>({
    resolver: zodResolver(DAEPRoomGroupSchema),
  });

  const selectedColor = watch('color');

  useEffect(() => {
    if (group && open) {
      reset({
        group_name: group.group_name,
        description: group.description || '',
        color: group.color || '#6B7280',
        sort_order: group.sort_order,
        active: group.active,
      });
    }
  }, [group, open, reset]);

  const onSubmit = async (data: CreateDAEPRoomGroupInput) => {
    if (!group) return;

    setSubmitting(true);
    try {
      await updateRoomGroup(group.id, data);
      toast({
        title: 'Success',
        description: `Room group "${data.group_name}" updated successfully`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update room group',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] daep-theme">
        <DialogHeader>
          <DialogTitle>Edit Room Group</DialogTitle>
          <DialogDescription>
            Update room group configuration. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group_name">Group Name *</Label>
            <Input
              id="group_name"
              placeholder="e.g., Up, Down, East Wing"
              {...register('group_name')}
            />
            {errors.group_name && (
              <p className="text-sm text-destructive">{errors.group_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="e.g., Rooms 501-505 on the north side"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setValue('color', color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color.value
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Color helps visually distinguish rooms in this group
            </p>
          </div>

          {group && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <span className="font-medium">{group.room_count || 0}</span> room(s) assigned to this group
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
