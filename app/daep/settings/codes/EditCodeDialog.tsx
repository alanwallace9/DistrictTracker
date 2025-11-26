'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DisciplineCodeSchema, type CreateDisciplineCodeInput } from '@/lib/validation/schemas';
import { updateDisciplineCode, type DisciplineCode } from '@/app/actions/daep/discipline-codes';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: DisciplineCode | null;
  onSuccess: () => void;
}

export function EditCodeDialog({ open, onOpenChange, code, onSuccess }: EditCodeDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateDisciplineCodeInput>({
    resolver: zodResolver(DisciplineCodeSchema),
  });

  useEffect(() => {
    if (open && code) {
      reset({
        code: code.code,
        label: code.label,
        mandatory_placement: code.mandatory_placement,
        behavior_location: code.behavior_location,
        active: code.active,
      });
    }
  }, [open, code, reset]);

  const onSubmit = async (data: CreateDisciplineCodeInput) => {
    if (!code) return;

    setSubmitting(true);
    try {
      await updateDisciplineCode(code.id, data);
      toast({
        title: 'Success',
        description: `Discipline code ${data.code} updated successfully`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update discipline code',
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Discipline Code</DialogTitle>
          <DialogDescription>
            Update discipline code configuration. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">PEIMS Code *</Label>
            <Input
              id="code"
              placeholder="e.g., 21"
              {...register('code')}
            />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label *</Label>
            <Input
              id="label"
              placeholder="e.g., Felony controlled substance"
              {...register('label')}
            />
            {errors.label && (
              <p className="text-sm text-destructive">{errors.label.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="behavior_location">Behavior Location</Label>
            <Select
              value={watch('behavior_location') || ''}
              onValueChange={(value) => setValue('behavior_location', value === '' ? null : value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_campus">On Campus</SelectItem>
                <SelectItem value="off_campus">Off Campus</SelectItem>
                <SelectItem value="school_sponsored">School Sponsored</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Where the behavior occurred (optional)
            </p>
            {errors.behavior_location && (
              <p className="text-sm text-destructive">{errors.behavior_location.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="mandatory_placement"
              checked={watch('mandatory_placement')}
              onCheckedChange={(checked) => setValue('mandatory_placement', checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="mandatory_placement"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Mandatory Placement
              </Label>
              <p className="text-xs text-muted-foreground">
                Check if this code requires mandatory DAEP placement (vs discretionary)
              </p>
            </div>
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
