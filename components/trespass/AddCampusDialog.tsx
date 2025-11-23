'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createCampus, isCampusNameUnique } from '@/app/actions/admin/campuses';

type AddCampusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function AddCampusDialog({ open, onOpenChange, onSuccess }: AddCampusDialogProps) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    status: 'active',
    abbreviation: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const validateCampusId = (id: string) => {
    const pattern = /^[a-z0-9][a-z0-9-_]{0,49}$/i;
    if (!pattern.test(id)) {
      return 'Campus ID must start with a letter or number and contain only letters, numbers, hyphens, or underscores';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validate campus ID
    const idError = validateCampusId(formData.id);
    if (idError) {
      setErrors({ id: idError });
      setLoading(false);
      return;
    }

    // Check name uniqueness
    try {
      const isUnique = await isCampusNameUnique(formData.name);
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

    try {
      await createCampus(formData);
      toast({
        title: 'Success',
        description: 'Campus created successfully',
      });
      onSuccess?.();
      onOpenChange(false);
      setFormData({ id: '', name: '', status: 'active', abbreviation: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create campus',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Campus</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="id">Campus ID *</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              required
              placeholder="e.g., 101, north-elem"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Letters, numbers, hyphens (e.g., &quot;101&quot;, &quot;north-elem&quot;)
            </p>
            {errors.id && <p className="text-xs text-red-600 mt-1">{errors.id}</p>}
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
              onValueChange={(value) => setFormData({ ...formData, status: value })}
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
              {loading ? 'Creating...' : 'Create Campus'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
