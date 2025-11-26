'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateSchoolYearCalendar } from '@/app/actions/daep/school-calendar';
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
import { Calendar } from 'lucide-react';

interface GenerateCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolYear: string;
  onSuccess: () => void;
}

export function GenerateCalendarDialog({
  open,
  onOpenChange,
  schoolYear,
  onSuccess,
}: GenerateCalendarDialogProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  // Default dates based on school year
  const [startYear, endYear] = schoolYear.split('-').map(Number);
  const defaultStart = `${startYear}-08-12`;
  const defaultEnd = `${endYear}-05-30`;

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Missing dates',
        description: 'Please enter both start and end dates',
        variant: 'destructive',
      });
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast({
        title: 'Invalid dates',
        description: 'Start date must be before end date',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      const result = await generateSchoolYearCalendar(schoolYear, startDate, endDate);
      toast({
        title: 'Success',
        description: `Generated ${result.created} calendar entries for ${schoolYear}`,
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate calendar',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate School Year Calendar</DialogTitle>
          <DialogDescription>
            Create calendar entries for {schoolYear}. Weekdays will be marked as
            school days, weekends as non-school days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <strong>Note:</strong> This will create or update entries for all
            dates in the range. Existing entries will be overwritten with
            default values.
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_date">First Day of School</Label>
            <Input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_date">Last Day of School</Label>
            <Input
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {startDate && endDate && new Date(startDate) < new Date(endDate) && (
            <div className="text-sm text-muted-foreground">
              This will generate approximately{' '}
              {Math.ceil(
                (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )}{' '}
              calendar entries.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            <Calendar className="w-4 h-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Calendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
