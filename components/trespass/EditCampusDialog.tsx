'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { updateCampus, isCampusNameUnique, canDeactivateCampus } from '@/app/actions/admin/campuses';
import { Campus } from '@/lib/supabase';
import { AlertTriangle } from 'lucide-react';

type EditCampusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campus: Campus | null;
  onSuccess?: () => void;
};

export function EditCampusDialog({ open, onOpenChange, campus, onSuccess }: EditCampusDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    abbreviation: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showDeactivateWarning, setShowDeactivateWarning] = useState(false);
  const [deactivateBlockers, setDeactivateBlockers] = useState<{
    canDeactivate: boolean;
    userCount: number;
    recordCount: number;
    blockers: string[];
  } | null>(null);
  const { toast } = useToast();

  // Pre-populate form when campus prop changes
  useEffect(() => {
    if (campus) {
      setFormData({
        name: campus.name,
        status: campus.status,
        abbreviation: campus.abbreviation || '',
      });
      setShowDeactivateWarning(false);
      setDeactivateBlockers(null);
    }
  }, [campus]);

  const handleStatusChange = async (newStatus: string) => {
    if (!campus) return;

    // If changing from active to inactive, check for blockers
    if (campus.status === 'active' && newStatus === 'inactive') {
      try {
        const result = await canDeactivateCampus(campus.id);
        setDeactivateBlockers(result);

        if (!result.canDeactivate) {
          // Prevent status change and show error
          toast({
            title: 'Cannot Deactivate Campus',
            description: `This campus has ${result.userCount} users and ${result.recordCount} records assigned. Reassign them first.`,
            variant: 'destructive',
          });
          // Reset status to active
          setFormData({ ...formData, status: 'active' });
          return;
        } else {
          // Show warning but allow change
          setShowDeactivateWarning(true);
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to check campus status',
          variant: 'destructive',
        });
        setFormData({ ...formData, status: 'active' });
        return;
      }
    } else {
      setShowDeactivateWarning(false);
      setDeactivateBlockers(null);
    }

    setFormData({ ...formData, status: newStatus });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campus) return;

    setLoading(true);
    setErrors({});

    // Check name uniqueness (excluding current campus)
    if (formData.name !== campus.name) {
      try {
        const isUnique = await isCampusNameUnique(formData.name, campus.id);
        if (!isUnique) {
          setErrors({ name: 'A campus with this name already exists' });
          setLoading(false);
          return;
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to validate campus name',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
    }

    try {
      await updateCampus(campus.id, {
        name: formData.name,
        status: formData.status,
        abbreviation: formData.abbreviation || undefined,
      });
      toast({
        title: 'Success',
        description: 'Campus updated successfully',
      });
      onSuccess?.();
      onOpenChange(false);
      setShowDeactivateWarning(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update campus',
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
          <DialogTitle>Edit Campus: {campus.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="id">Campus ID</Label>
            <Input
              id="id"
              value={campus.id}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cannot change campus ID
            </p>
          </div>

          <div>
            <Label htmlFor="name">Campus Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., North Elementary School"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showDeactivateWarning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Deactivating Campus</AlertTitle>
              <AlertDescription>
                Setting this campus to inactive will:
                <ul className="list-disc list-inside mt-2">
                  <li>Hide it from most dropdowns</li>
                  <li>Prevent new assignments</li>
                  <li>Can be reactivated anytime</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="abbreviation">Abbreviation (Optional)</Label>
            <Input
              id="abbreviation"
              value={formData.abbreviation}
              onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
              placeholder="e.g., NES"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
