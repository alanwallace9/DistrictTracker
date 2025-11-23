'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoRole } from '@/contexts/DemoRoleContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getUserProfile } from '@/app/actions/users';
import { Shield } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsSaved?: () => void;
}

export function SettingsDialog({ open, onOpenChange, onSettingsSaved }: SettingsDialogProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [notificationDays, setNotificationDays] = useState('7');
  const [userRole, setUserRole] = useState('viewer');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const { user } = useAuth();
  const { isDemoMode, demoRole } = useDemoRole();
  const { toast } = useToast();

  // Determine effective role (use demo role if in demo mode, otherwise use actual user role)
  const effectiveRole = isDemoMode ? demoRole : userRole;

  useEffect(() => {
    if (open && user) {
      fetchProfile();
    }
  }, [open, user]);

  const fetchProfile = async () => {
    if (!user) return;

    setFetching(true);
    try {
      const profile = await getUserProfile(user.id);

      if (profile) {
        setDisplayName(profile.display_name || '');
        setNotificationDays(profile.notification_days?.toString() || '7');
        setUserRole(profile.role || 'viewer');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await updateUserProfile(user.id, {
        display_name: displayName || undefined,
        notification_days: parseInt(notificationDays),
      });

      toast({
        title: 'Settings saved',
        description: 'Your preferences have been updated.',
      });

      // Trigger refresh in parent component
      if (onSettingsSaved) {
        onSettingsSaved();
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Settings</DialogTitle>
          <DialogDescription className="text-slate-600">
            Manage your profile preferences
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-slate-900">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              disabled={fetching || loading}
              className="bg-white border-slate-300"
            />
            {fetching && <p className="text-xs text-slate-500">Loading...</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notificationDays" className="text-slate-900">Notification Days</Label>
            <Select value={notificationDays} onValueChange={setNotificationDays} disabled={fetching || loading}>
              <SelectTrigger id="notificationDays" className="bg-white border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="1">1 day before expiration</SelectItem>
                <SelectItem value="3">3 days before expiration</SelectItem>
                <SelectItem value="5">5 days before expiration</SelectItem>
                <SelectItem value="7">7 days before expiration (default)</SelectItem>
                <SelectItem value="14">14 days before expiration</SelectItem>
                <SelectItem value="30">30 days before expiration</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">How far in advance to show expiration warnings</p>
          </div>

          {/* Admin Panel - Only visible to district_admin and master_admin */}
          {(effectiveRole === 'district_admin' || effectiveRole === 'master_admin') && (
            <div className="pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  router.push('/admin');
                }}
                className="w-full bg-white hover:bg-slate-200 border-slate-300 text-slate-900 hover:text-slate-900"
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-white hover:bg-red-600 hover:text-white border-slate-300 text-slate-900">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
