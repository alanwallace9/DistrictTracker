'use client';

import { useState } from 'react';
import { Loader2, User, Calendar, Clock } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { editAndApproveEntry, type PendingApprovalEntry } from '@/app/actions/daep/points';

// Point adjustment options (matching RoomRosterView)
const ADJUSTMENT_OPTIONS = [
  { value: '10', label: '+10 Points' },
  { value: '5', label: '+5 Points' },
  { value: '0', label: '0 Points' },
  { value: '-5', label: '-5 Points' },
  { value: '-10', label: '-10 Points' },
];

// Student action options
const STUDENT_ACTIONS = [
  'Arrived on time',
  'Completed all assignments',
  'Helped classmates',
  'Participated actively',
  'Showed improvement',
  'Off task',
  'Disruptive behavior',
  'Incomplete work',
  'Tardiness',
  'Other',
];

// Teacher action options
const TEACHER_ACTIONS = [
  'Verbal praise',
  'Written commendation',
  'Parent contact (positive)',
  'Verbal warning',
  'Written warning',
  'Parent contact (concern)',
  'Conference scheduled',
  'No action needed',
];

interface EditApproveDialogProps {
  entry: PendingApprovalEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function EditApproveDialog({
  entry,
  open,
  onOpenChange,
  onComplete,
}: EditApproveDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [points, setPoints] = useState(entry.points_earned.toString());
  const [studentAction, setStudentAction] = useState(entry.student_action || '');
  const [teacherAction, setTeacherAction] = useState(entry.teacher_action || '');
  const [notes, setNotes] = useState(entry.notes || '');

  // Format date for display
  const entryDate = new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const entryTime = new Date(entry.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await editAndApproveEntry({
        entryId: entry.id,
        adjustment_value: parseInt(points, 10),
        student_action: studentAction || null,
        teacher_action: teacherAction || null,
        notes: notes || null,
      });

      if (result.success) {
        toast({
          title: 'Approved',
          description: 'Entry updated and approved successfully.',
        });
        onComplete();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to approve entry.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[EditApproveDialog] Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve entry.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit & Approve Entry</DialogTitle>
            <DialogDescription>
              Review and modify this entry before approving it.
            </DialogDescription>
          </DialogHeader>

          {/* Entry metadata */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <span>
                {entry.student_last_name}, {entry.student_first_name}
              </span>
              <span className="text-muted-foreground">- Period {entry.period}</span>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {entryDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {entryTime}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Entered by {entry.entered_by_name}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {/* Points */}
            <div className="space-y-2">
              <Label htmlFor="points">Point Adjustment</Label>
              <Select value={points} onValueChange={setPoints}>
                <SelectTrigger id="points">
                  <SelectValue placeholder="Select points" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student Action */}
            <div className="space-y-2">
              <Label htmlFor="student-action">Student Action</Label>
              <Select value={studentAction} onValueChange={setStudentAction}>
                <SelectTrigger id="student-action">
                  <SelectValue placeholder="Select student action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {STUDENT_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Action */}
            <div className="space-y-2">
              <Label htmlFor="teacher-action">Teacher Action</Label>
              <Select value={teacherAction} onValueChange={setTeacherAction}>
                <SelectTrigger id="teacher-action">
                  <SelectValue placeholder="Select teacher action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {TEACHER_ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[rgb(var(--daep-success))] hover:bg-[rgb(var(--daep-success))]/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Approve'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
