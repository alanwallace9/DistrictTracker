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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface AddBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddBadgeSchema = z.object({
  badgeName: z.string().min(1, 'Badge name is required').max(100),
  triggerType: z.enum(['milestone', 'consecutive_perfect_days']),
  triggerValue: z.coerce.number().min(1, 'Value must be at least 1'),
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
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddBadgeInput>({
    resolver: zodResolver(AddBadgeSchema),
    defaultValues: {
      badgeName: '',
      triggerType: 'milestone',
      triggerValue: 100,
      bonusPoints: 0,
    },
  });

  const triggerType = watch('triggerType');

  const onSubmit = async (data: AddBadgeInput) => {
    setSubmitting(true);
    try {
      const ruleName = data.triggerType === 'milestone'
        ? `${data.triggerValue} Point Milestone`
        : `${data.triggerValue}-Day Perfect Streak`;

      const input: CreateMilestoneRuleInput = {
        ruleName,
        triggerType: data.triggerType,
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

  const handleTypeChange = (value: 'milestone' | 'consecutive_perfect_days') => {
    setValue('triggerType', value);
    // Reset to sensible defaults for each type
    if (value === 'milestone') {
      setValue('triggerValue', 100);
      setValue('bonusPoints', 0);
    } else {
      setValue('triggerValue', 3);
      setValue('bonusPoints', 3);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] daep-theme">
        <DialogHeader>
          <DialogTitle>Add Milestone Badge</DialogTitle>
          <DialogDescription>
            Create a new milestone badge for student achievements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="badgeName">Badge Name *</Label>
            <Input
              id="badgeName"
              placeholder="e.g., 500 Club or 5-Day Streak"
              {...register('badgeName')}
            />
            {errors.badgeName && (
              <p className="text-sm text-destructive">{errors.badgeName.message}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Trigger Type *</Label>
            <RadioGroup
              value={triggerType}
              onValueChange={(v) => handleTypeChange(v as 'milestone' | 'consecutive_perfect_days')}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="milestone" id="type-points" />
                <Label htmlFor="type-points" className="font-normal cursor-pointer">
                  Points Threshold
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="consecutive_perfect_days" id="type-streak" />
                <Label htmlFor="type-streak" className="font-normal cursor-pointer">
                  Consecutive Perfect Days
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="triggerValue">
              {triggerType === 'milestone' ? 'Point Threshold *' : 'Consecutive Days *'}
            </Label>
            <Input
              id="triggerValue"
              type="number"
              min={1}
              max={triggerType === 'consecutive_perfect_days' ? 30 : undefined}
              placeholder={triggerType === 'milestone' ? 'e.g., 500' : 'e.g., 5'}
              {...register('triggerValue')}
            />
            <p className="text-xs text-muted-foreground">
              {triggerType === 'milestone'
                ? 'Badge awarded when student reaches this many cumulative points'
                : 'Badge awarded for this many consecutive days with 100% points'}
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
              placeholder={triggerType === 'consecutive_perfect_days' ? 'e.g., 5' : 'e.g., 0'}
              {...register('bonusPoints')}
            />
            <p className="text-xs text-muted-foreground">
              {triggerType === 'consecutive_perfect_days'
                ? 'Extra points awarded when streak is achieved (recommended for streaks)'
                : 'Extra points awarded with this badge (0 for badge only)'}
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
