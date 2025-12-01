'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Play, CheckCircle, Loader2, Clock } from 'lucide-react';
import type { PlacementStatus } from '@/lib/validation/schemas';
import { getValidTransitions } from '@/lib/daep/placement-state-machine';
import { transitionPlacement } from '@/app/actions/daep/placements';

import { InitiateTransitionDialog } from './InitiateTransitionDialog';
import { CompleteTransitionDialog } from './CompleteTransitionDialog';
import { NoShowDialog } from './NoShowDialog';

interface StatusTransitionActionsProps {
  placementId: string;
  currentStatus: PlacementStatus;
  daysRemaining: number;
  daysAssigned?: number;
  daysServed?: number;
  studentName?: string;
  transitionMeetingDate?: string | null;
  onTransitionComplete?: () => void;
}

interface TransitionConfig {
  toStatus: PlacementStatus;
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresFields: ('notes')[];
  variant: 'default' | 'secondary' | 'outline';
}

/**
 * Status Transition Actions Component
 * Displays valid transition buttons and handles confirmation dialog
 *
 * Story 2-6: AC 2.6.3, AC 2.6.4, AC 2.6.5, AC 2.6.6
 * Story 2-9: AC 2.9.1 (Initiate/Complete Transition workflow)
 */
export function StatusTransitionActions({
  placementId,
  currentStatus,
  daysRemaining,
  daysAssigned = 0,
  daysServed = 0,
  studentName = 'Student',
  transitionMeetingDate,
  onTransitionComplete,
}: StatusTransitionActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState<TransitionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [notes, setNotes] = useState('');

  const validTransitions = getValidTransitions(currentStatus);

  // Define transition configurations for non-met transitions
  const transitionConfigs: Record<string, TransitionConfig> = {
    active: {
      toStatus: 'active',
      label: 'Activate Placement',
      icon: <Play className="w-4 h-4 mr-2" />,
      description: 'Mark this student as actively attending DAEP. This typically happens automatically when first attendance is recorded.',
      requiresFields: [],
      variant: 'default',
    },
    met: {
      toStatus: 'met',
      label: 'Mark Requirements Met',
      icon: <CheckCircle className="w-4 h-4 mr-2" />,
      description: `Student has completed their assigned days. ${daysRemaining > 0 ? `Warning: ${daysRemaining} days still remaining.` : 'All days have been served.'}`,
      requiresFields: ['notes'],
      variant: 'secondary',
    },
  };

  const handleOpenDialog = (toStatus: PlacementStatus) => {
    const config = transitionConfigs[toStatus];
    if (config) {
      setSelectedTransition(config);
      setIsDialogOpen(true);
      // Reset form
      setNotes('');
    }
  };

  const handleConfirmTransition = async () => {
    if (!selectedTransition) return;

    setIsLoading(true);

    try {
      const result = await transitionPlacement({
        placement_id: placementId,
        to_status: selectedTransition.toStatus,
        transition_reason: `Manual transition via UI`,
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success(`Placement transitioned to ${selectedTransition.label.replace('Mark ', '').replace('Activate ', '')}`);
        setIsDialogOpen(false);
        onTransitionComplete?.();
      } else {
        toast.error(result.error || 'Failed to transition placement');
      }
    } catch (error) {
      console.error('Transition error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Render based on current status
  // Story 2-9: For 'met' status, use the two-phase workflow
  if (currentStatus === 'met') {
    const hasMeetingScheduled = !!transitionMeetingDate;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {hasMeetingScheduled ? (
          // Meeting scheduled: Show Complete Transition dialog
          <>
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Meeting: {new Date(transitionMeetingDate!).toLocaleDateString()}
            </Badge>
            <CompleteTransitionDialog
              placementId={placementId}
              meetingDate={transitionMeetingDate}
              onSuccess={onTransitionComplete}
            />
          </>
        ) : (
          // No meeting scheduled: Show Initiate Transition dialog
          <InitiateTransitionDialog
            placementId={placementId}
            daysRemaining={daysRemaining}
            onSuccess={onTransitionComplete}
          />
        )}
      </div>
    );
  }

  // For 'complete' status, show completed badge only
  if (currentStatus === 'complete') {
    return (
      <Badge variant="secondary">
        <CheckCircle className="w-3 h-3 mr-1" />
        Completed
      </Badge>
    );
  }

  // No valid transitions available (shouldn't happen for pending/active)
  if (validTransitions.length === 0) {
    return null;
  }

  // Standard transitions for pending/active status
  // Story 2-12: Add No-Show option for pending/active placements
  const showNoShow = currentStatus === 'pending' || currentStatus === 'active';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {validTransitions.map((toStatus) => {
          // Skip 'complete' - handled by two-phase workflow
          if (toStatus === 'complete') return null;

          const config = transitionConfigs[toStatus];
          if (!config) return null;

          // Disable "met" button if days remaining
          const isMetDisabled = toStatus === 'met' && daysRemaining > 0;

          return (
            <Button
              key={toStatus}
              variant={config.variant}
              size="sm"
              onClick={() => handleOpenDialog(toStatus)}
              disabled={isMetDisabled}
              title={isMetDisabled ? `Cannot mark as met until ${daysRemaining} more days are served` : undefined}
            >
              {config.icon}
              {config.label}
            </Button>
          );
        })}

        {/* Story 2-12: No-Show button for pending/active placements (AC 2.12.1) */}
        {showNoShow && (
          <NoShowDialog
            placementId={placementId}
            studentName={studentName}
            daysAssigned={daysAssigned}
            onSuccess={onTransitionComplete}
          />
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedTransition?.label}</DialogTitle>
            <DialogDescription>
              {selectedTransition?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {selectedTransition?.requiresFields.includes('notes') && (
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any relevant notes about this transition..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmTransition}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Transition'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
