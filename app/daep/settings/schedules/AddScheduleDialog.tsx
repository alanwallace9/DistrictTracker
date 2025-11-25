'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BellScheduleSchema, type CreateBellScheduleInput, type BellSchedulePeriod } from '@/lib/validation/schemas';
import { createBellSchedule } from '@/app/actions/daep/schedules';
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

interface AddScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SCHEDULE_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'early_release', label: 'Early Release' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'custom', label: 'Custom' },
] as const;

const DEFAULT_PERIODS: BellSchedulePeriod[] = [
  { period_name: '1st Period', start_time: '08:00', end_time: '08:50' },
  { period_name: '2nd Period', start_time: '08:55', end_time: '09:45' },
  { period_name: '3rd Period', start_time: '09:50', end_time: '10:40' },
  { period_name: '4th Period', start_time: '10:45', end_time: '11:35' },
  { period_name: '5th Period', start_time: '11:40', end_time: '12:30' },
  { period_name: '6th Period', start_time: '13:00', end_time: '13:50' },
  { period_name: '7th Period', start_time: '13:55', end_time: '14:45' },
  { period_name: '8th Period', start_time: '14:50', end_time: '15:40' },
];

export function AddScheduleDialog({ open, onOpenChange, onSuccess }: AddScheduleDialogProps) {
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
      periods: [{ period_name: '1st Period', start_time: '08:00', end_time: '08:50' }],
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
    validatePeriods();
  }, [periods]);

  const fetchCampuses = async () => {
    try {
      const data = await getCampuses();
      setCampuses(data);
      if (data.length === 1) {
        setValue('campus_id', data[0].id);
      }
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

  const loadDefaultPeriods = () => {
    while (fields.length > 0) {
      remove(0);
    }
    DEFAULT_PERIODS.forEach(period => append(period));
  };

  const onSubmit = async (data: CreateBellScheduleInput) => {
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
      await createBellSchedule(data);
      toast({
        title: 'Success',
        description: `Schedule "${data.schedule_name}" created successfully`,
      });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create schedule',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      reset();
      setPeriodErrors([]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Bell Schedule</DialogTitle>
          <DialogDescription>
            Create a new bell schedule with period times. You can add multiple periods.
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadDefaultPeriods}
                >
                  Load 8-Period Day
                </Button>
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
                  No periods added. Click "Add Period" to start.
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
              {submitting ? 'Creating...' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
