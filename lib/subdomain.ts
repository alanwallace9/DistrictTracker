/**
 * Server-Side Subdomain Utilities
 *
 * Extracts and validates tenant subdomain from hostname for multi-tenant routing
 *
 * NOTE: This file uses server-only imports (next/headers).
 * For client components, use @/lib/subdomain-client instead.
 */

import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getSubdomainFromHostname } from './subdomain-client';

// Re-export for convenience
export { getSubdomainFromHostname };

/**
 * Get tenant ID from request headers
 * This is set by middleware after validating the subdomain
 */
export function getTenantFromHeaders(headers: Headers): string | null {
  return headers.get('x-tenant-id');
}

/**
 * Get active tenant ID based on current subdomain
 * Server-side only - reads from headers
 *
 * @returns tenant_id or null if no valid tenant
 */
export async function getActiveTenantId(): Promise<string | null> {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  const subdomain = getSubdomainFromHostname(hostname);

  if (!subdomain) {
    return null;
  }

  // Create Supabase client to validate tenant
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', subdomain)
    .eq('status', 'active')
    .single();

  return tenant?.id || null;
}
