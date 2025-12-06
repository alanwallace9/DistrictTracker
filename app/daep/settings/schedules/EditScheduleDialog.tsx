'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BellScheduleSchema, type CreateBellScheduleInput } from '@/lib/validation/schemas';
import { updateBellSchedule, type BellSchedule } from '@/app/actions/daep/schedules';
import { getCampuses } from '@/app/actions/campuses';
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
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: BellSchedule | null;
  onSuccess: () => void;
}

const SCHEDULE_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'early_release', label: 'Early Release' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'custom', label: 'Custom' },
] as const;

export function EditScheduleDialog({ open, onOpenChange, schedule, onSuccess }: EditScheduleDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  const [periodErrors, setPeriodErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBellScheduleInput>({
    resolver: zodResolver(BellScheduleSchema),
    defaultValues: {
      schedule_name: '',
      schedule_type: 'regular',
      campus_id: '',
      periods: [],
      is_default: false,
      active: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'periods',
  });

  const periods = watch('periods');

  useEffect(() => {
    if (open) {
      fetchCampuses();
    }
  }, [open]);

  useEffect(() => {
    if (schedule && open) {
      reset({
        schedule_name: schedule.schedule_name,
        schedule_type: schedule.schedule_type,
        campus_id: schedule.campus_id || '',
        periods: schedule.periods || [],
        is_default: schedule.is_default,
        active: schedule.active,
      });
    }
  }, [schedule, open, reset]);

  useEffect(() => {
    validatePeriods();
  }, [periods]);

  const fetchCampuses = async () => {
    try {
      const data = await getCampuses();
      setCampuses(data);
    } catch (error) {
      console.error('Failed to fetch campuses:', error);
    }
  };

  const validatePeriods = () => {
    const errors: string[] = [];
    if (!periods || periods.length === 0) return;

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      if (period.start_time && period.end_time && period.start_time >= period.end_time) {
        errors.push(`Period ${i + 1}: Start time must be before end time`);
      }
    }

    const sorted = [...periods]
      .map((p, i) => ({ ...p, index: i }))
      .filter(p => p.start_time && p.end_time)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].end_time > sorted[i + 1].start_time) {
        errors.push(`Periods ${sorted[i].index + 1} and ${sorted[i + 1].index + 1} overlap`);
      }
    }

    setPeriodErrors(errors);
  };

  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1];
    const periodNum = periods.length + 1;
    const suffixes = ['st', 'nd', 'rd'];
    const suffix = periodNum <= 3 ? suffixes[periodNum - 1] : 'th';

    let newStartTime = '08:00';
    if (lastPeriod?.end_time) {
      const [hours, mins] = lastPeriod.end_time.split(':').map(Number);
      const newMins = mins + 5;
      const newHours = hours + Math.floor(newMins / 60);
      newStartTime = `${String(newHours).padStart(2, '0')}:${String(newMins % 60).padStart(2, '0')}`;
    }

    const [startHours, startMins] = newStartTime.split(':').map(Number);
    const endMins = startMins + 50;
    const endHours = startHours + Math.floor(endMins / 60);
    const newEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;

    append({
      period_name: `${periodNum}${suffix} Period`,
      start_time: newStartTime,
      end_time: newEndTime,
    });
  };

  const onSubmit = async (data: CreateBellScheduleInput) => {
    if (!schedule) return;

    if (periodErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fix period time errors before saving',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await updateBellSchedule(schedule.id, data);
      toast({
        title: 'Success',
        description: `Schedule "${data.schedule_name}" updated successfully`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update schedule',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setPeriodErrors([]);
    }
    onOpenChange(open);
  };

  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto daep-theme">
        <DialogHeader>
          <DialogTitle>Edit Bell Schedule</DialogTitle>
          <DialogDescription>
            Update the schedule configuration and period times.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schedule_name">Schedule Name *</Label>
              <Input
                id="schedule_name"
                placeholder="e.g., Regular Day"
                {...register('schedule_name')}
              />
              {errors.schedule_name && (
                <p className="text-sm text-destructive">{errors.schedule_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule_type">Schedule Type *</Label>
              <Select
                value={watch('schedule_type')}
                onValueChange={(value) => setValue('schedule_type', value as CreateBellScheduleInput['schedule_type'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.schedule_type && (
                <p className="text-sm text-destructive">{errors.schedule_type.message}</p>
              )}
            </div>
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={watch('is_default')}
              onCheckedChange={(checked) => setValue('is_default', checked as boolean)}
            />
            <Label htmlFor="is_default" className="text-sm font-normal">
              Set as default schedule for this campus
            </Label>
          </div>

          {/* Period Builder */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Periods *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPeriod}
                disabled={fields.length >= 12}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Period
              </Button>
            </div>

            {periodErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                  <div className="text-sm text-destructive">
                    {periodErrors.map((error, i) => (
                      <div key={i}>{error}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="border rounded-lg divide-y">
              {fields.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No periods configured. Click "Add Period" to start.
                </div>
              ) : (
                fields.map((field, index) => (
                  <div key={field.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <Input
                          placeholder="Period name"
                          {...register(`periods.${index}.period_name`)}
                        />
                      </div>
                      <div>
                        <Input
                          type="time"
                          {...register(`periods.${index}.start_time`)}
                        />
                      </div>
                      <div>
                        <Input
                          type="time"
                          {...register(`periods.${index}.end_time`)}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {fields.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {fields.length} period{fields.length !== 1 ? 's' : ''} configured
              </p>
            )}

            {errors.periods && (
              <p className="text-sm text-destructive">{errors.periods.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || periodErrors.length > 0}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
