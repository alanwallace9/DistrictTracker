'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSubdomainFromHostname } from '@/lib/subdomain-client';
import { supabase, type Tenant } from '@/lib/supabase';

type SubdomainTenantContextType = {
  activeTenant: Tenant | null;
  loading: boolean;
  error: string | null;
};

const SubdomainTenantContext = createContext<SubdomainTenantContextType | undefined>(undefined);

export function SubdomainTenantProvider({ children }: { children: React.ReactNode }) {
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTenantFromSubdomain() {
      try {
        setLoading(true);
        setError(null);

        // Extract subdomain from current hostname
        const hostname = window.location.hostname;
        const subdomain = getSubdomainFromHostname(hostname);

        if (!subdomain) {
          setActiveTenant(null);
          setLoading(false);
          return;
        }

        // Fetch tenant from database
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('subdomain', subdomain)
          .eq('status', 'active')
          .single();

        if (tenantError) {
          console.error('Error loading tenant:', tenantError);
          setError('Failed to load tenant');
          setActiveTenant(null);
        } else {
          setActiveTenant(tenant);
        }
      } catch (err: any) {
        console.error('Error in loadTenantFromSubdomain:', err);
        setError(err.message || 'Unknown error');
        setActiveTenant(null);
      } finally {
        setLoading(false);
      }
    }

    loadTenantFromSubdomain();
  }, []);

  return (
    <SubdomainTenantContext.Provider value={{ activeTenant, loading, error }}>
      {children}
    </SubdomainTenantContext.Provider>
  );
}

export function useSubdomainTenant() {
  const context = useContext(SubdomainTenantContext);
  if (context === undefined) {
    throw new Error('useSubdomainTenant must be used within a SubdomainTenantProvider');
  }
  return context;
}
