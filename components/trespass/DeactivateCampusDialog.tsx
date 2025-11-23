'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { canDeactivateCampus, deactivateCampus } from '@/app/actions/admin/campuses';
import { Campus } from '@/lib/supabase';
import { AlertTriangle } from 'lucide-react';

type DeactivateCampusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campus: Campus | null;
  onSuccess?: () => void;
  onViewUsers?: () => void;
  onViewRecords?: () => void;
};

export function DeactivateCampusDialog({
  open,
  onOpenChange,
  campus,
  onSuccess,
  onViewUsers,
  onViewRecords,
}: DeactivateCampusDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [canDeactivateData, setCanDeactivateData] = useState<{
    canDeactivate: boolean;
    userCount: number;
    recordCount: number;
    blockers: string[];
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && campus) {
      checkIfCanDeactivate();
    }
  }, [open, campus]);

  const checkIfCanDeactivate = async () => {
    if (!campus) return;

    setCheckLoading(true);
    try {
      const result = await canDeactivateCampus(campus.id);
      setCanDeactivateData(result);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check deactivation status',
        variant: 'destructive',
      });
    } finally {
      setCheckLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!campus) return;

    setLoading(true);
    try {
      await deactivateCampus(campus.id);
      toast({
        title: 'Success',
        description: 'Campus deactivated successfully',
      });
      onSuccess?.();
      onOpenChange(false);
      setConfirmText('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to deactivate campus',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!campus) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            {canDeactivateData?.canDeactivate ? 'Deactivate Campus' : 'Cannot Deactivate Campus'}
          </DialogTitle>
        </DialogHeader>

        {checkLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-4">Checking campus status...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="font-semibold">
                Campus: {campus.name} (ID: {campus.id})
              </p>
            </div>

            {!canDeactivateData?.canDeactivate ? (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>This campus has:</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      <li>{canDeactivateData?.userCount} assigned users</li>
                      <li>{canDeactivateData?.recordCount} trespass records</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-muted-foreground">
                  You must reassign all users and records to another campus before deactivating.
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onViewUsers?.();
                      onOpenChange(false);
                    }}
                  >
                    View Users
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onViewRecords?.();
                      onOpenChange(false);
                    }}
                  >
                    View Records
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => onOpenChange(false)}>Close</Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-green-600">✓ No users assigned</p>
                  <p className="text-sm text-green-600">✓ No records assigned</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Deactivating this campus will:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Set status to &quot;Inactive&quot;</li>
                    <li>Hide from most dropdowns</li>
                    <li>Can be reactivated anytime</li>
                  </ul>
                </div>

                <div>
                  <Label htmlFor="confirm" className="text-sm font-bold text-red-600">
                    Type DELETE to confirm:
                  </Label>
                  <Input
                    id="confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE in all caps"
                    className="border-red-300 focus:border-red-500 mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Type &quot;DELETE&quot; in capital letters above
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={confirmText !== 'DELETE' || loading}
                    onClick={handleDeactivate}
                  >
                    {loading ? 'Deactivating...' : 'Deactivate Campus'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
