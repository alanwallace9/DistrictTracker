'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BehaviorCategorySchema,
  BEHAVIOR_CATEGORY_TYPES,
  type CreateBehaviorCategoryInput,
} from '@/lib/validation/schemas';
import { createBehaviorCategory } from '@/app/actions/daep/behavior-categories';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORY_TYPE_OPTIONS = [
  { value: 'positive', label: 'Positive', description: 'Earns points' },
  { value: 'negative', label: 'Negative', description: 'Loses points' },
  { value: 'neutral', label: 'Neutral', description: 'No point impact' },
  { value: 'bonus', label: 'Bonus', description: 'Extra points awarded' },
] as const;

export function AddCategoryDialog({ open, onOpenChange, onSuccess }: AddCategoryDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBehaviorCategoryInput>({
    resolver: zodResolver(BehaviorCategorySchema),
    defaultValues: {
      name: '',
      description: '',
      category_type: 'neutral',
      is_active: true,
    },
  });

  const onSubmit = async (data: CreateBehaviorCategoryInput) => {
    setSubmitting(true);
    try {
      await createBehaviorCategory(data);
      toast({
        title: 'Success',
        description: `Behavior category "${data.name}" created successfully`,
      });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create behavior category';
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
          <DialogTitle>Add Behavior Category</DialogTitle>
          <DialogDescription>
            Create a new behavior category for point tracking. Categories appear in point entry dropdowns.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              placeholder="e.g., On Task"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description of this behavior category"
              rows={2}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_type">Category Type *</Label>
            <Select
              value={watch('category_type')}
              onValueChange={(value) =>
                setValue('category_type', value as (typeof BEHAVIOR_CATEGORY_TYPES)[number])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category type" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">({option.description})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines how this behavior affects student points
            </p>
            {errors.category_type && (
              <p className="text-sm text-destructive">{errors.category_type.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
