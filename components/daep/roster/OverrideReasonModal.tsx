'use client';

/**
 * OverrideReasonModal - Story 3-12
 *
 * Simple modal shown when an admin edits someone else's attendance entry.
 * Requires selecting a reason for the override to maintain accountability.
 * Notes are optional except when "Other" is selected.
 */

import { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  type OverrideReason,
  OVERRIDE_REASONS,
  OVERRIDE_REASON_LABELS,
} from '@/lib/validation/schemas';

export interface OverrideData {
  override_reason: OverrideReason;
  override_notes?: string;
}

interface OverrideReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: OverrideData) => void;
  isLoading?: boolean;
}

export function OverrideReasonModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: OverrideReasonModalProps) {
  const [reason, setReason] = useState<OverrideReason | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setNotes('');
      setError('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    // Validate
    if (!reason) {
      setError('Please select a reason');
      return;
    }

    if (reason === 'other' && !notes.trim()) {
      setError('Notes are required when selecting "Other"');
      return;
    }

    const data: OverrideData = {
      override_reason: reason,
      override_notes: notes.trim() || undefined,
    };
    onConfirm(data);
  };

  const handleReasonChange = (value: string) => {
    setReason(value as OverrideReason);
    setError('');
  };

  const isOther = reason === 'other';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Override Reason</DialogTitle>
          <DialogDescription>
            Why is this attendance being changed?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Reason radio buttons */}
          <RadioGroup
            value={reason}
            onValueChange={handleReasonChange}
            className="gap-3"
          >
            {OVERRIDE_REASONS.map((key) => (
              <div key={key} className="flex items-center space-x-3">
                <RadioGroupItem value={key} id={`reason-${key}`} />
                <Label
                  htmlFor={`reason-${key}`}
                  className="cursor-pointer font-normal"
                >
                  {OVERRIDE_REASON_LABELS[key]}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Notes textarea */}
          <div className="space-y-2">
            <Label htmlFor="override-notes">
              Notes {isOther && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="override-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (error && e.target.value.trim()) {
                  setError('');
                }
              }}
              placeholder={isOther ? 'Please explain...' : 'Optional details...'}
              rows={2}
              className={error && isOther && !notes.trim() ? 'border-destructive' : ''}
            />
            {isOther && (
              <p className="text-xs text-muted-foreground">
                Required when reason is &quot;Other&quot;
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !reason}>
            {isLoading ? 'Saving...' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
