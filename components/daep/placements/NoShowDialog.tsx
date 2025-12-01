'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { UserX, Loader2, AlertTriangle } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { markNoShow } from '@/app/actions/daep/placements';

interface NoShowDialogProps {
  placementId: string;
  studentName: string;
  daysAssigned: number;
  onSuccess?: () => void;
}

/**
 * No-Show Dialog Component
 * Story 2-12: AC 2.12.1, AC 2.12.2
 *
 * Confirmation dialog to mark a placement as no-show.
 * Uses AlertDialog pattern for confirmation-style interaction.
 */
export function NoShowDialog({
  placementId,
  studentName,
  daysAssigned,
  onSuccess,
}: NoShowDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      const result = await markNoShow({
        placement_id: placementId,
        reason: reason || undefined,
      });

      if (result.success) {
        toast.success(`${studentName} marked as no-show`);
        setOpen(false);
        setReason('');
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to mark as no-show');
      }
    } catch (error) {
      console.error('No-show error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-amber-600 border-amber-300 hover:bg-amber-50">
          <UserX className="w-4 h-4 mr-2" />
          Mark No-Show
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Mark as No-Show
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-slate-600">
                Are you sure you want to mark <strong className="text-slate-900">{studentName}</strong> as a no-show?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                <p className="font-medium text-amber-900">This action will:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-amber-800">
                  <li>Flag the student as No-Show for rescheduling</li>
                  <li>Show on Intake board as No-Show</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Label htmlFor="reason" className="text-sm font-medium text-slate-700">
            Reason (Optional)
          </Label>
          <Textarea
            id="reason"
            placeholder="Add any notes about why this student is being marked as no-show..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="mt-1.5 bg-white border-slate-200 focus:border-amber-400 focus:ring-amber-400"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm No-Show'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
