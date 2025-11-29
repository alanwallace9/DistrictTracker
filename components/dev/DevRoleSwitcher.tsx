'use client';

import { useState, useEffect, useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isDevUser, switchDevRole, getCurrentRole } from '@/app/actions/dev-role-switch';
import { Bug } from 'lucide-react';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'district_admin', label: 'District Admin' },
  { value: 'campus_admin', label: 'Campus Admin' },
  { value: 'daep_admin_l1', label: 'DAEP Admin L1' },
  { value: 'daep_admin_l2', label: 'DAEP Admin L2' },
  { value: 'daep_staff', label: 'DAEP Staff' },
  { value: 'counselor', label: 'Counselor' },
  { value: 'viewer', label: 'Viewer' },
];

interface DevRoleSwitcherProps {
  onRoleChange?: (newRole: string) => void;
}

export function DevRoleSwitcher({ onRoleChange }: DevRoleSwitcherProps) {
  const [isAllowed, setIsAllowed] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      try {
        const [devCheck, role] = await Promise.all([
          isDevUser(),
          getCurrentRole(),
        ]);
        setIsAllowed(devCheck.allowed);
        setCurrentRole(role);
      } catch (error) {
        console.error('[DevRoleSwitcher] Error checking access:', error);
      } finally {
        setLoading(false);
      }
    }
    checkAccess();
  }, []);

  const handleRoleChange = (newRole: string) => {
    startTransition(async () => {
      const result = await switchDevRole(newRole);
      if (result.success) {
        setCurrentRole(newRole);
        onRoleChange?.(newRole);
        // Reload page to apply new role
        window.location.reload();
      } else {
        console.error('[DevRoleSwitcher] Error:', result.error);
      }
    });
  };

  // Don't render if not allowed or still loading
  if (loading || !isAllowed) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">
      <Bug className="w-4 h-4 text-amber-600" />
      <span className="text-xs font-medium text-amber-700">DEV</span>
      <Select
        value={currentRole || undefined}
        onValueChange={handleRoleChange}
        disabled={isPending}
      >
        <SelectTrigger className="h-7 w-[130px] text-xs bg-white border-amber-300">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((role) => (
            <SelectItem key={role.value} value={role.value} className="text-xs">
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
