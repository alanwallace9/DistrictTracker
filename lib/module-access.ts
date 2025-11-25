/**
 * Module Access Control Utility (Story 1.2)
 *
 * Provides server-side module access validation for server actions.
 * Use this to check if a user has permission to access a specific module
 * before performing module-specific operations.
 */

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type ModuleType = 'trespass' | 'daep';
export type ModuleAccess = 'trespass_only' | 'daep_only' | 'both';

/**
 * Check if the current user has access to a specific module.
 *
 * @param requiredModule - The module that requires access ('trespass' or 'daep')
 * @returns true if user has access, false otherwise
 * @throws Error if not authenticated
 *
 * @example
 * // In a server action for DAEP operations:
 * const hasAccess = await checkModuleAccess('daep');
 * if (!hasAccess) {
 *   throw new Error('Access denied. You do not have permission to access the DAEP module.');
 * }
 */
export async function checkModuleAccess(requiredModule: ModuleType): Promise<boolean> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('module_access')
    .eq('id', userId)
    .single();

  const moduleAccess: ModuleAccess = profile?.module_access || 'both';

  // 'both' has access to everything
  if (moduleAccess === 'both') return true;

  // Check specific access
  if (moduleAccess === 'trespass_only' && requiredModule === 'trespass') return true;
  if (moduleAccess === 'daep_only' && requiredModule === 'daep') return true;

  return false;
}

/**
 * Require module access - throws an error if user doesn't have access.
 * Use this for cleaner code in server actions.
 *
 * @param requiredModule - The module that requires access ('trespass' or 'daep')
 * @throws Error if not authenticated or lacks module access
 *
 * @example
 * // In a server action for TrespassTracker operations:
 * await requireModuleAccess('trespass');
 * // ... proceed with operation
 */
export async function requireModuleAccess(requiredModule: ModuleType): Promise<void> {
  const hasAccess = await checkModuleAccess(requiredModule);

  if (!hasAccess) {
    const moduleName = requiredModule === 'trespass' ? 'TrespassTracker' : 'DAEP Dashboard';
    throw new Error(`Access denied. You do not have permission to access the ${moduleName} module.`);
  }
}

/**
 * Get the current user's module access level.
 *
 * @returns The user's module_access setting
 * @throws Error if not authenticated
 */
export async function getModuleAccess(): Promise<ModuleAccess> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('module_access')
    .eq('id', userId)
    .single();

  return profile?.module_access || 'both';
}
