'use client';

/**
 * Point Adjustment Dialog Component
 *
 * Story 3-2: Point Entry Grid
 *
 * Full dialog for entering point adjustments with:
 * - Adjustment value dropdown (+10, +5, 0, -5, -10, -15)
 * - Student action dropdown (from behavior categories)
 * - Teacher action dropdown (from behavior categories - neutral type)
 * - Notes textarea
 * - List of existing adjustments for this period
 */

import { useState, useTransition } from 'react';
import {
  Dialog,
  DAEPDialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/daep/DAEPDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPointAdjustment, deletePointAdjustment } from '@/app/actions/daep/points';
import {
  POINT_ADJUSTMENT_VALUES,
  type PointAdjustmentValue,
  type DailyPointEntry,
} from '@/lib/validation/schemas';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';

interface PointAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placementId: string;
  date: string;
  period: string;
  studentName: string;
  behaviorCategories: BehaviorCategory[];
  existingAdjustments?: DailyPointEntry[];
  currentUserId?: string;
  onSuccess?: () => void;
}

// Adjustment value display
function formatAdjustment(value: number): string {
  if (value > 0) return `+${value}`;
  if (value === 0) return '0 (Note Only)';
  return String(value);
}

// Get color for adjustment badge
function getAdjustmentColor(value: number): string {
  if (value > 0) return 'bg-emerald-500 text-white';
  if (value < 0) return 'bg-red-500 text-white';
  return 'bg-gray-500 text-white';
}

export function PointAdjustmentDialog({
  open,
  onOpenChange,
  placementId,
  date,
  period,
  studentName,
  behaviorCategories,
  existingAdjustments = [],
  currentUserId,
  onSuccess,
}: PointAdjustmentDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [adjustmentValue, setAdjustmentValue] = useState<PointAdjustmentValue | null>(null);
  const [studentAction, setStudentAction] = useState<string>('');
  const [teacherAction, setTeacherAction] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Separate categories by type
  const studentActions = behaviorCategories.filter(
    (c) => c.is_active && (c.category_type === 'positive' || c.category_type === 'negative')
  );
  const teacherActions = behaviorCategories.filter(
    (c) => c.is_active && c.category_type === 'neutral'
  );

  // Reset form
  const resetForm = () => {
    setAdjustmentValue(null);
    setStudentAction('');
    setTeacherAction('');
    setNotes('');
  };

  // Handle form submission
  const handleSubmit = () => {
    if (adjustmentValue === null) {
      toast({
        title: 'Adjustment Required',
        description: 'Please select an adjustment value.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const result = await createPointAdjustment({
        placement_id: placementId,
        date,
        period,
        adjustment_value: adjustmentValue,
        student_action: studentAction || null,
        teacher_action: teacherAction || null,
        notes: notes.trim() || null,
      });

      if (result.success) {
        toast({
          title: 'Adjustment Saved',
          description: `${formatAdjustment(adjustmentValue)} points recorded.`,
        });
        resetForm();
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save adjustment. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  // Handle delete adjustment
  const handleDelete = (entryId: string) => {
    startTransition(async () => {
      const result = await deletePointAdjustment(entryId);

      if (result.success) {
        toast({
          title: 'Adjustment Deleted',
          description: 'The adjustment has been removed.',
        });
        onSuccess?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete adjustment.',
          variant: 'destructive',
        });
      }
    });
  };

  // Format time from ISO string
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DAEPDialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Point Adjustment</DialogTitle>
          <DialogDescription>
            {studentName} &bull; {period}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 flex-1 overflow-y-auto">
          {/* Adjustment Value */}
          <div className="space-y-1">
            <Label htmlFor="adjustment">Adjustment *</Label>
            <Select
              value={adjustmentValue !== null ? String(adjustmentValue) : ''}
              onValueChange={(val) => setAdjustmentValue(Number(val) as PointAdjustmentValue)}
            >
              <SelectTrigger id="adjustment">
                <SelectValue placeholder="Select adjustment..." />
              </SelectTrigger>
              <SelectContent>
                {POINT_ADJUSTMENT_VALUES.map((val) => (
                  <SelectItem key={val} value={String(val)}>
                    <span className={cn(
                      'font-medium',
                      val > 0 && 'text-emerald-600',
                      val < 0 && 'text-red-600'
                    )}>
                      {formatAdjustment(val)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student Action */}
          <div className="space-y-1">
            <Label htmlFor="student-action">Student Action</Label>
            <Select
              value={studentAction || '__none__'}
              onValueChange={(val) => setStudentAction(val === '__none__' ? '' : val)}
            >
              <SelectTrigger id="student-action">
                <SelectValue placeholder="Select student behavior..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {studentActions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    <span className={cn(
                      cat.category_type === 'positive' && 'text-emerald-600',
                      cat.category_type === 'negative' && 'text-red-600'
                    )}>
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Teacher Action */}
          <div className="space-y-1">
            <Label htmlFor="teacher-action">Teacher Action</Label>
            <Select
              value={teacherAction || '__none__'}
              onValueChange={(val) => setTeacherAction(val === '__none__' ? '' : val)}
            >
              <SelectTrigger id="teacher-action">
                <SelectValue placeholder="What action did you take..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {teacherActions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional..."
              rows={1}
              maxLength={500}
              className="resize-y text-sm min-h-[32px]"
            />
          </div>

          {/* Existing Adjustments for this Period */}
          {existingAdjustments.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="space-y-1 overflow-hidden">
                <Label className="text-muted-foreground text-xs">
                  Previous ({period}) - {existingAdjustments.length} entries
                </Label>
                <div className="h-[130px] overflow-hidden rounded border bg-muted/20">
                  <ScrollArea className="h-full">
                    <div className="space-y-1.5 p-2">
                    {existingAdjustments.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between p-1.5 bg-muted/50 rounded text-xs gap-1.5"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', getAdjustmentColor(entry.points_earned))}>
                            {formatAdjustment(entry.points_earned)}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-2.5 w-2.5 shrink-0" />
                              <span>{formatTime(entry.created_at)}</span>
                              {entry.student_action && (
                                <span className="truncate">• {entry.student_action}</span>
                              )}
                            </div>
                            {entry.notes && (
                              <div className="italic text-muted-foreground truncate">
                                {entry.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Only show delete for entries created by current user */}
                        {currentUserId && entry.entered_by === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => handleDelete(entry.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || adjustmentValue === null}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Adjustment
          </Button>
        </DialogFooter>
      </DAEPDialogContent>
    </Dialog>
  );
}
