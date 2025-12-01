'use client';

/**
 * Approval Queue View Component
 * Story 2-11: AC 2.11.13 - Approval queue for rollover placements
 */

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react';
import {
  approveRolloverPlacement,
  type PendingRolloverPlacement,
} from '@/app/actions/daep/rollover';

interface ApprovalQueueViewProps {
  pendingApprovals: PendingRolloverPlacement[];
  loading: boolean;
  onApprovalComplete: () => void;
}

export function ApprovalQueueView({
  pendingApprovals,
  loading,
  onApprovalComplete,
}: ApprovalQueueViewProps) {
  const { toast } = useToast();

  // Dialog state
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<PendingRolloverPlacement | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleApprove = async () => {
    if (!selectedPlacement) return;

    setProcessing(true);
    try {
      const result = await approveRolloverPlacement({
        placement_id: selectedPlacement.placement_id,
        approved: true,
      });

      if (result.success) {
        toast({
          title: 'Approved',
          description: `Rollover placement approved for ${selectedPlacement.student_name}`,
        });
        setShowApproveDialog(false);
        setSelectedPlacement(null);
        onApprovalComplete();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to approve placement',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPlacement) return;

    setProcessing(true);
    try {
      const result = await approveRolloverPlacement({
        placement_id: selectedPlacement.placement_id,
        approved: false,
        rejection_reason: rejectionReason.trim() || null,
      });

      if (result.success) {
        toast({
          title: 'Rejected',
          description: `Rollover placement rejected for ${selectedPlacement.student_name}`,
        });
        setShowRejectDialog(false);
        setSelectedPlacement(null);
        setRejectionReason('');
        onApprovalComplete();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reject placement',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const openApproveDialog = (placement: PendingRolloverPlacement) => {
    setSelectedPlacement(placement);
    setShowApproveDialog(true);
  };

  const openRejectDialog = (placement: PendingRolloverPlacement) => {
    setSelectedPlacement(placement);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Loading pending approvals...</p>
      </div>
    );
  }

  // Empty state
  if (pendingApprovals.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg bg-muted/50">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-[rgb(var(--daep-success))]/50" />
        <p className="text-muted-foreground">No pending approvals</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          All rollover placements have been processed
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Student</TableHead>
              <TableHead>Home Campus</TableHead>
              <TableHead>Original Incident</TableHead>
              <TableHead className="text-center">Days Remaining</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingApprovals.map((placement) => (
              <TableRow key={placement.placement_id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{placement.student_name}</p>
                    <p className="text-xs text-muted-foreground">{placement.student_id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{placement.home_campus_name}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {placement.original_incident_number}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-mono font-bold">{placement.days_remaining}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(placement.created_at)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[rgb(var(--daep-success))] hover:text-[rgb(var(--daep-success))] hover:bg-[rgb(var(--daep-success))]/10"
                      onClick={() => openApproveDialog(placement)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[rgb(var(--daep-danger))] hover:text-[rgb(var(--daep-danger))] hover:bg-[rgb(var(--daep-danger))]/10"
                      onClick={() => openRejectDialog(placement)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Rollover Placement</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve the rollover placement for <strong>{selectedPlacement?.student_name}</strong> with{' '}
              <strong>{selectedPlacement?.days_remaining}</strong> days remaining.
              The placement will be ready to activate when the new school year begins.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={processing}
              className="bg-[rgb(var(--daep-success))] hover:bg-[rgb(var(--daep-success))]/90"
            >
              {processing ? 'Processing...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Rollover Placement</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the rollover placement for <strong>{selectedPlacement?.student_name}</strong>.
              The placement will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Reason (optional)</Label>
            <Input
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={processing}
              className="bg-[rgb(var(--daep-danger))] hover:bg-[rgb(var(--daep-danger))]/90"
            >
              {processing ? 'Processing...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
