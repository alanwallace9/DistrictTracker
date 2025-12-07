'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateMilestoneRule, type MilestoneRule } from '@/app/actions/daep/milestones';
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

interface EditBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badge: MilestoneRule | null;
  onSuccess: () => void;
}

const EditBadgeSchema = z.object({
  badgeName: z.string().min(1, 'Badge name is required').max(100),
  triggerValue: z.coerce.number().min(1, 'Threshold must be at least 1'),
  bonusPoints: z.coerce.number().min(0, 'Bonus points cannot be negative'),
});

type EditBadgeInput = z.infer<typeof EditBadgeSchema>;

export function EditBadgeDialog({ open, onOpenChange, badge, onSuccess }: EditBadgeDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditBadgeInput>({
    resolver: zodResolver(EditBadgeSchema),
  });

  useEffect(() => {
    if (open && badge) {
      reset({
        badgeName: badge.badgeName,
        triggerValue: badge.triggerValue,
        bonusPoints: badge.bonusPoints,
      });
    }
  }, [open, badge, reset]);

  const onSubmit = async (data: EditBadgeInput) => {
    if (!badge) return;

    setSubmitting(true);
    try {
      await updateMilestoneRule(badge.id, {
        ruleName: `${data.triggerValue} Point Milestone`,
        triggerValue: data.triggerValue,
        bonusPoints: data.bonusPoints,
        badgeName: data.badgeName,
      });

      toast({
        title: 'Success',
        description: `Badge "${data.badgeName}" updated successfully`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update badge';
      toast({
        title: 'Error',
        description: message,
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
          <DialogTitle>Edit Milestone Badge</DialogTitle>
          <DialogDescription>
            Update milestone badge configuration. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="badgeName">Badge Name *</Label>
            <Input
              id="badgeName"
              placeholder="e.g., 500 Club"
              {...register('badgeName')}
            />
            {errors.badgeName && (
              <p className="text-sm text-destructive">{errors.badgeName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="triggerValue">Point Threshold *</Label>
            <Input
              id="triggerValue"
              type="number"
              min={1}
              placeholder="e.g., 500"
              {...register('triggerValue')}
            />
            <p className="text-xs text-muted-foreground">
              Badge is awarded when student reaches this many cumulative points
            </p>
            {errors.triggerValue && (
              <p className="text-sm text-destructive">{errors.triggerValue.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bonusPoints">Bonus Points</Label>
            <Input
              id="bonusPoints"
              type="number"
              min={0}
              placeholder="e.g., 5"
              {...register('bonusPoints')}
            />
            <p className="text-xs text-muted-foreground">
              Extra points awarded with this badge (0 for badge only)
            </p>
            {errors.bonusPoints && (
              <p className="text-sm text-destructive">{errors.bonusPoints.message}</p>
            )}
          </div>

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
