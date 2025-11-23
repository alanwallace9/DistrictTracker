'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { inviteUser } from '@/app/actions/invitations';

type AddUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded?: () => void;
};

export function AddUserDialog({ open, onOpenChange, onUserAdded }: AddUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    role: 'viewer' as 'viewer' | 'campus_admin' | 'district_admin' | 'master_admin',
    campus_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.role) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Validate campus_id for campus_admin
    if (formData.role === 'campus_admin' && !formData.campus_id) {
      toast({
        title: 'Error',
        description: 'Campus ID is required for Campus Admin role',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await inviteUser({
        email: formData.email,
        role: formData.role,
        campus_id: formData.campus_id || null,
      });

      toast({
        title: 'Success',
        description: `Invitation sent to ${formData.email}. They will receive an email to create their account.`,
      });

      setFormData({ email: '', role: 'viewer', campus_id: '' });
      onOpenChange(false);
      if (onUserAdded) onUserAdded();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>Send an email invitation to add a new user to the system</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@bisd.us"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                <SelectItem value="campus_admin">Campus Admin (Create & Update)</SelectItem>
                <SelectItem value="district_admin">District Admin (Full Access)</SelectItem>
                <SelectItem value="master_admin">Master Admin (System Admin)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.role === 'campus_admin' && (
            <div className="space-y-2">
              <Label htmlFor="campus_id">Campus ID *</Label>
              <Input
                id="campus_id"
                type="text"
                value={formData.campus_id}
                onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })}
                placeholder="e.g., campus_123"
                required
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Required for campus administrators. Enter the campus identifier.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="border-border hover:bg-red-600 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} variant="outline" className="border-border text-foreground hover:bg-muted">
              {loading ? 'Inviting...' : 'Invite User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
