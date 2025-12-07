'use client';

/**
 * ExcuseModal - Story 3-10
 *
 * Modal for Admin L1/L2 to set excuse status when marking a student absent.
 * Allows setting:
 * - Excused vs Unexcused
 * - Reason (if excused)
 * - Whether it counts toward points/days served
 * - Notes
 *
 * Gov't reasons (Court, PO, DPS, etc.) auto-check "counts toward points".
 * Shows parent call counter when parent_call is selected.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ExcuseReason,
  EXCUSE_REASONS,
  EXCUSE_REASON_LABELS,
  EXCUSE_REASON_ORDER,
  POINTS_ELIGIBLE_REASONS,
} from '@/lib/validation/schemas';

export interface ExcuseData {
  excused: boolean;
  excuse_reason?: ExcuseReason;
  excuse_notes?: string;
  counts_toward_days_served: boolean;
}

interface ExcuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExcuseData) => void;
  studentName: string;
  currentData?: {
    excused: boolean | null;
    excuse_reason: ExcuseReason | null;
    counts_toward_days_served: boolean;
    notes?: string | null;
  };
  parentCallCount?: number;
  isLoading?: boolean;
}

export function ExcuseModal({
  isOpen,
  onClose,
  onSave,
  studentName,
  currentData,
  parentCallCount = 0,
  isLoading = false,
}: ExcuseModalProps) {
  // Form state
  const [excuseType, setExcuseType] = useState<'excused' | 'unexcused'>('unexcused');
  const [reason, setReason] = useState<ExcuseReason | ''>('');
  const [countsTowardPoints, setCountsTowardPoints] = useState(false);
  const [notes, setNotes] = useState('');

  // Initialize from currentData when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentData) {
        setExcuseType(currentData.excused === true ? 'excused' : 'unexcused');
        setReason(currentData.excuse_reason || '');
        setCountsTowardPoints(currentData.counts_toward_days_served);
        setNotes(currentData.notes || '');
      } else {
        // Default to unexcused for new entries
        setExcuseType('unexcused');
        setReason('');
        setCountsTowardPoints(false);
        setNotes('');
      }
    }
  }, [isOpen, currentData]);

  // Auto-check points when selecting gov't reasons
  useEffect(() => {
    if (reason && POINTS_ELIGIBLE_REASONS.includes(reason)) {
      setCountsTowardPoints(true);
    } else if (reason) {
      setCountsTowardPoints(false);
    }
  }, [reason]);

  const handleSave = () => {
    const data: ExcuseData = {
      excused: excuseType === 'excused',
      excuse_reason: excuseType === 'excused' && reason ? reason : undefined,
      excuse_notes: notes || undefined,
      counts_toward_days_served: excuseType === 'excused' ? countsTowardPoints : false,
    };
    onSave(data);
  };

  const isGovtReason = reason !== '' && POINTS_ELIGIBLE_REASONS.includes(reason);
  const isParentCall = reason === 'parent_call';
  const parentCallsRemaining = Math.max(0, 6 - parentCallCount);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Absence Status</DialogTitle>
          <DialogDescription>
            Set excuse status for <span className="font-medium">{studentName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Excused / Unexcused Radio */}
          <RadioGroup
            value={excuseType}
            onValueChange={(value) => setExcuseType(value as 'excused' | 'unexcused')}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem
                value="unexcused"
                id="unexcused"
                className="peer sr-only"
              />
              <Label
                htmlFor="unexcused"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-background p-4 hover:bg-red-50/50 hover:border-red-200 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50/30 [&:has([data-state=checked])]:border-red-500 [&:has([data-state=checked])]:bg-red-50/30 cursor-pointer transition-colors"
              >
                <span className="text-sm font-medium">Unexcused</span>
                <span className="text-xs text-muted-foreground">No points</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem
                value="excused"
                id="excused"
                className="peer sr-only"
              />
              <Label
                htmlFor="excused"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-background p-4 hover:bg-emerald-50/50 hover:border-emerald-200 peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50/30 [&:has([data-state=checked])]:border-emerald-500 [&:has([data-state=checked])]:bg-emerald-50/30 cursor-pointer transition-colors"
              >
                <span className="text-sm font-medium">Excused</span>
                <span className="text-xs text-muted-foreground">With documentation</span>
              </Label>
            </div>
          </RadioGroup>

          {/* Reason dropdown (shown when Excused with slide animation) */}
          <div
            className={cn(
              'grid transition-all duration-500 ease-in-out',
              excuseType === 'excused'
                ? 'grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select
                  value={reason}
                  onValueChange={(value) => setReason(value as ExcuseReason)}
                >
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXCUSE_REASON_ORDER.map((key) => (
                      <SelectItem key={key} value={key}>
                        {EXCUSE_REASON_LABELS[key]}
                        {POINTS_ELIGIBLE_REASONS.includes(key) && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Points
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Parent call counter */}
              {isParentCall && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-muted">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span>
                    Parent Call {parentCallCount + 1} of 6 this semester
                    {parentCallsRemaining <= 2 && parentCallsRemaining > 0 && (
                      <span className="text-amber-600 font-medium ml-1">
                        ({parentCallsRemaining} remaining)
                      </span>
                    )}
                    {parentCallsRemaining === 0 && (
                      <span className="text-destructive font-medium ml-1">
                        (limit reached - will be unexcused)
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Counts toward points checkbox */}
              <div className="flex items-start space-x-3 p-3 rounded-md border">
                <Checkbox
                  id="counts-toward-points"
                  checked={countsTowardPoints}
                  onCheckedChange={(checked) => setCountsTowardPoints(checked as boolean)}
                  disabled={isGovtReason}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="counts-toward-points"
                    className="font-medium cursor-pointer"
                  >
                    Counts toward points & days served
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isGovtReason
                      ? 'Government obligations automatically count toward DAEP progress'
                      : 'Check if this absence should count toward the student\'s DAEP days'}
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details..."
                  rows={2}
                />
              </div>

              {/* Document upload placeholder (backlog) */}
              <div className="flex items-center gap-2 text-sm p-3 rounded-md border border-dashed text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Document upload coming soon</span>
              </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
