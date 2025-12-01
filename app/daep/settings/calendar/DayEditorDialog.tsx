'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  upsertSchoolCalendarEntry,
  deleteSchoolCalendarEntry,
  type SchoolCalendarEntry,
} from '@/app/actions/daep/school-calendar';
import { type BellSchedule } from '@/app/actions/daep/schedules';
import { DAY_TYPES, type DayType } from '@/lib/validation/schemas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

interface DayEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  entry: SchoolCalendarEntry | null;
  schoolYear: string;
  bellSchedules: BellSchedule[];
  onSuccess: () => void;
}

export function DayEditorDialog({
  open,
  onOpenChange,
  date,
  entry,
  schoolYear,
  bellSchedules,
  onSuccess,
}: DayEditorDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [isSchoolDay, setIsSchoolDay] = useState(true);
  const [dayType, setDayType] = useState<DayType | ''>('Regular');
  const [bellScheduleId, setBellScheduleId] = useState<string>('__default__');
  const [notes, setNotes] = useState('');

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setIsSchoolDay(entry.is_school_day);
      setDayType(entry.day_type || 'Regular');
      setBellScheduleId(entry.bell_schedule_id || '__default__');
      setNotes(entry.notes || '');
    } else {
      // Default for new entry (weekday = school day)
      const dayOfWeek = date ? new Date(date).getDay() : 1;
      const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
      setIsSchoolDay(isWeekday);
      setDayType('Regular');
      setBellScheduleId('__default__');
      setNotes('');
    }
  }, [entry, date, open]);

  const handleSubmit = async () => {
    if (!date) return;

    setSubmitting(true);
    try {
      await upsertSchoolCalendarEntry({
        date,
        school_year: schoolYear,
        is_school_day: isSchoolDay,
        day_type: dayType || null,
        bell_schedule_id: bellScheduleId === '__default__' ? null : bellScheduleId,
        notes: notes || null,
      });
      toast({
        title: 'Success',
        description: `Calendar entry for ${formatDate(date)} saved`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save calendar entry',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;

    setDeleting(true);
    try {
      await deleteSchoolCalendarEntry(entry.id);
      toast({
        title: 'Success',
        description: `Calendar entry for ${formatDate(entry.date)} deleted`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete calendar entry',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] daep-theme">
        <DialogHeader>
          <DialogTitle>
            {entry ? 'Edit Calendar Day' : 'Configure Calendar Day'}
          </DialogTitle>
          <DialogDescription>
            {date && formatDate(date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* School Day Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_school_day" className="text-base">
                School Day
              </Label>
              <p className="text-sm text-muted-foreground">
                Is this a regular instructional day?
              </p>
            </div>
            <Switch
              id="is_school_day"
              checked={isSchoolDay}
              onCheckedChange={setIsSchoolDay}
            />
          </div>

          {/* Day Type */}
          <div className="space-y-2">
            <Label htmlFor="day_type">Day Type</Label>
            <Select
              value={dayType}
              onValueChange={(val) => setDayType(val as DayType | '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day type" />
              </SelectTrigger>
              <SelectContent>
                {DAY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Categorize this day (Holiday, Teacher Workday, etc.)
            </p>
          </div>

          {/* Bell Schedule */}
          <div className="space-y-2">
            <Label htmlFor="bell_schedule">Bell Schedule (Optional)</Label>
            <Select
              value={bellScheduleId}
              onValueChange={setBellScheduleId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use default schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Use default schedule</SelectItem>
                {bellSchedules.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.schedule_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Override the bell schedule for this specific day
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Spring Break, State Testing, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {entry && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || submitting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || deleting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
