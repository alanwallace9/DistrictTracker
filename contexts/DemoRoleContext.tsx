'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { updateDemoRole, getCurrentWorkspace } from '@/app/actions/tenant-switching';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { tenantEvents } from '@/lib/tenant-events';

type DemoRole = 'viewer' | 'campus_admin' | 'district_admin';

type DemoRoleContextType = {
  isDemoMode: boolean;
  demoRole: DemoRole;
  setDemoRole: (role: DemoRole) => void;
  availableRoles: { value: DemoRole; label: string; description: string }[];
};

const DemoRoleContext = createContext<DemoRoleContextType | undefined>(undefined);

const DEMO_ROLES = [
  {
    value: 'viewer' as DemoRole,
    label: 'Viewer',
    description: 'Can view records but cannot edit',
  },
  {
    value: 'campus_admin' as DemoRole,
    label: 'Campus Admin',
    description: 'Can create, edit, and manage records for their campus',
  },
  {
    value: 'district_admin' as DemoRole,
    label: 'District Admin',
    description: 'Full access to all records and campuses in the district',
  },
];

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [demoRole, setDemoRoleState] = useState<DemoRole>('campus_admin'); // Default to campus_admin
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Check workspace status from server
  async function checkWorkspace() {
    const workspace = await getCurrentWorkspace();
    if (workspace) {
      setIsDemoMode(workspace.isDemo);
      if (workspace.isDemo) {
        setDemoRoleState(workspace.demoRole || 'campus_admin');
      }
    }
  }

  useEffect(() => {
    // Check once on mount or pathname change
    checkWorkspace();

    // Listen for tenant switch events (from AdminTenantContext)
    const handleTenantChange = (data: { tenantId: string | null; isDemo: boolean }) => {
      setIsDemoMode(data.isDemo);
      if (data.isDemo) {
        checkWorkspace(); // Refresh to get demo_role from server
      }
    };

    tenantEvents.on(handleTenantChange);

    // Cleanup listener on unmount
    return () => {
      tenantEvents.off(handleTenantChange);
    };
  }, [pathname]);

  const setDemoRole = async (role: DemoRole) => {
    try {
      // Update role on server (in database)
      await updateDemoRole(role);
      setDemoRoleState(role);
      toast.success(`Switched to ${DEMO_ROLES.find(r => r.value === role)?.label}`);
      router.refresh(); // Refresh to apply new permissions
    } catch (error: any) {
      toast.error('Failed to update role', {
        description: error.message
      });
    }
  };

  return (
    <DemoRoleContext.Provider
      value={{
        isDemoMode,
        demoRole,
        setDemoRole,
        availableRoles: DEMO_ROLES,
      }}
    >
      {children}
    </DemoRoleContext.Provider>
  );
}

export function useDemoRole() {
  const context = useContext(DemoRoleContext);
  if (context === undefined) {
    throw new Error('useDemoRole must be used within DemoRoleProvider');
  }
  return context;
}

// Optional version that returns null instead of throwing
export function useDemoRoleOptional() {
  const context = useContext(DemoRoleContext);
  return context || null;
}
