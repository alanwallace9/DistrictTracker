'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createMilestoneRule, type CreateMilestoneRuleInput } from '@/app/actions/daep/milestones';
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

interface AddBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddBadgeSchema = z.object({
  badgeName: z.string().min(1, 'Badge name is required').max(100),
  triggerValue: z.coerce.number().min(1, 'Threshold must be at least 1'),
  bonusPoints: z.coerce.number().min(0, 'Bonus points cannot be negative'),
});

type AddBadgeInput = z.infer<typeof AddBadgeSchema>;

export function AddBadgeDialog({ open, onOpenChange, onSuccess }: AddBadgeDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddBadgeInput>({
    resolver: zodResolver(AddBadgeSchema),
    defaultValues: {
      badgeName: '',
      triggerValue: 100,
      bonusPoints: 0,
    },
  });

  const onSubmit = async (data: AddBadgeInput) => {
    setSubmitting(true);
    try {
      const input: CreateMilestoneRuleInput = {
        ruleName: `${data.triggerValue} Point Milestone`,
        triggerValue: data.triggerValue,
        bonusPoints: data.bonusPoints,
        badgeName: data.badgeName,
      };

      await createMilestoneRule(input);

      toast({
        title: 'Success',
        description: `Badge "${data.badgeName}" created successfully`,
      });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create badge';
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
          <DialogTitle>Add Milestone Badge</DialogTitle>
          <DialogDescription>
            Create a new milestone badge awarded when students reach a point threshold.
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
              {submitting ? 'Creating...' : 'Create Badge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
