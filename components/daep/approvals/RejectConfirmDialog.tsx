'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, User, Calendar, Clock } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { rejectPointEntry, type PendingApprovalEntry } from '@/app/actions/daep/points';
import { cn } from '@/lib/utils';

interface RejectConfirmDialogProps {
  entry: PendingApprovalEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function RejectConfirmDialog({
  entry,
  open,
  onOpenChange,
  onComplete,
}: RejectConfirmDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');

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

  const isPositive = entry.points_earned >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await rejectPointEntry(entry.id, reason || undefined);

      if (result.success) {
        toast({
          title: 'Rejected',
          description: 'Point entry has been rejected.',
        });
        onComplete();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reject entry.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[RejectConfirmDialog] Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject entry.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[rgb(var(--daep-danger))]/10 p-2">
                <AlertTriangle className="h-5 w-5 text-[rgb(var(--daep-danger))]" />
              </div>
              <div>
                <DialogTitle>Reject Point Entry</DialogTitle>
                <DialogDescription>
                  This entry will not be published and will be marked as rejected.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Entry details */}
          <div className="mt-4 p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {entry.student_last_name}, {entry.student_first_name}
              </span>
              <span
                className={cn(
                  'text-lg font-semibold tabular-nums',
                  isPositive ? 'text-[rgb(var(--daep-success))]' : 'text-[rgb(var(--daep-danger))]'
                )}
              >
                {isPositive ? '+' : ''}
                {entry.points_earned} pts
              </span>
            </div>

            <div className="text-sm text-muted-foreground">Period {entry.period}</div>

            {entry.student_action && (
              <div className="text-sm">
                <span className="text-muted-foreground">Action: </span>
                {entry.student_action}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {entryDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {entryTime}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Entered by {entry.entered_by_name}
            </div>
          </div>

          {/* Reason input */}
          <div className="mt-4 space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this entry is being rejected..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will be recorded in the audit log and may be visible to the staff member.
            </p>
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
              variant="destructive"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject Entry'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
