import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';

export type DaepModule = 'daep' | 'trespass';

const DEFAULT_MODULES: DaepModule[] = ['daep', 'trespass'];

export const getEnabledModules = cache(
  async (tenantId: string): Promise<DaepModule[]> => {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('tenants')
      .select('enabled_modules')
      .eq('id', tenantId)
      .maybeSingle();

    if (error || !data?.enabled_modules) {
      return DEFAULT_MODULES;
    }
    return data.enabled_modules as DaepModule[];
  }
);

export async function tenantHasTrespass(tenantId: string): Promise<boolean> {
  const modules = await getEnabledModules(tenantId);
  return modules.includes('trespass');
}

export async function tenantHasDaep(tenantId: string): Promise<boolean> {
  const modules = await getEnabledModules(tenantId);
  return modules.includes('daep');
}
