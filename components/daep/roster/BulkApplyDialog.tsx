'use client';

/**
 * Bulk Apply Dialog Component
 *
 * Story 3-3: Bulk Point Entry
 *
 * Confirmation dialog before applying bulk point adjustment.
 * Shows:
 * - Adjustment being applied
 * - List of affected students (first 5 + "and N more")
 * - Optional note input
 * - Apply / Cancel buttons
 */

import { useState } from 'react';
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
import { Loader2, AlertCircle } from 'lucide-react';
import { useRoomRoster } from './RoomRosterContext';
import { ADJUSTMENT_OPTIONS } from './BulkActionsToolbar';
import { cn } from '@/lib/utils';

// ========== PROPS ==========

interface BulkApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustment: number;
  onConfirm: (adjustment: number, notes: string) => Promise<{ success: boolean; count?: number; error?: string }>;
}

// ========== COMPONENT ==========

export function BulkApplyDialog({
  open,
  onOpenChange,
  adjustment,
  onConfirm,
}: BulkApplyDialogProps) {
  const { selectedPlacements, students, periods, periodIndex, clearSelection } = useRoomRoster();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get adjustment option details
  const option = ADJUSTMENT_OPTIONS.find((o) => o.value === adjustment);
  const adjustmentLabel = option?.label || `${adjustment > 0 ? '+' : ''}${adjustment}`;

  // Get current period name
  const currentPeriodName = periods[periodIndex]?.period_name || `Period ${periodIndex + 1}`;

  // Get selected students
  const selectedStudents = students.filter((s) => selectedPlacements.has(s.placement_id));
  const displayCount = 5;
  const showStudents = selectedStudents.slice(0, displayCount);
  const moreCount = selectedStudents.length - displayCount;

  // Default note
  const defaultNote = `Bulk: ${adjustment > 0 ? '+' : ''}${adjustment} points`;

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onConfirm(adjustment, notes || defaultNote);

      if (result.success) {
        // Success - close dialog and clear selection
        onOpenChange(false);
        clearSelection();
        setNotes('');
      } else {
        setError(result.error || 'Failed to apply points');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setNotes('');
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={cn(
            adjustment > 0 ? 'text-green-700' : 'text-red-700'
          )}>
            Apply {adjustmentLabel}
          </DialogTitle>
          <DialogDescription>
            Add {adjustment > 0 ? '+' : ''}{adjustment} points to {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} for {currentPeriodName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Students list */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Students affected:</Label>
            <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
              {showStudents.map((student) => (
                <li key={student.placement_id} className="text-muted-foreground">
                  • {student.last_name}, {student.first_name}
                </li>
              ))}
              {moreCount > 0 && (
                <li className="text-muted-foreground italic">
                  ...and {moreCount} more
                </li>
              )}
            </ul>
          </div>

          {/* Optional note input */}
          <div className="space-y-2">
            <Label htmlFor="bulk-note" className="text-sm font-medium">
              Note (optional)
            </Label>
            <Input
              id="bulk-note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={defaultNote}
              maxLength={500}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Applied to all selected students
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedStudents.length === 0}
            className={cn(
              adjustment > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              `Apply to ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
