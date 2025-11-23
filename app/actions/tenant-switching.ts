'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Switch user to demo workspace
 */
export async function switchToDemoWorkspace() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Update user's active tenant to demo and set default demo role
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      active_tenant_id: 'demo',
      demo_role: 'campus_admin'  // Default to campus_admin
    })
    .eq('id', userId);

  if (error) {
    console.error('Error switching to demo:', error);
    throw new Error('Failed to switch to demo workspace');
  }

  revalidatePath('/');
  return { success: true };
}

/**
 * Switch user back to their assigned tenant (production)
 */
export async function switchToProductionWorkspace() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Clear active tenant and demo role (reverts to assigned tenant)
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      active_tenant_id: null,
      demo_role: null
    })
    .eq('id', userId);

  if (error) {
    console.error('Error switching to production:', error);
    throw new Error('Failed to switch to production workspace');
  }

  revalidatePath('/');
  return { success: true };
}

/**
 * Update demo role (only works when in demo workspace)
 */
export async function updateDemoRole(role: 'viewer' | 'campus_admin' | 'district_admin') {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Verify user is currently in demo workspace
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('active_tenant_id')
    .eq('id', userId)
    .single();

  if (profile?.active_tenant_id !== 'demo') {
    throw new Error('Can only change demo role when in demo workspace');
  }

  // Update demo role
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ demo_role: role })
    .eq('id', userId);

  if (error) {
    console.error('Error updating demo role:', error);
    throw new Error('Failed to update demo role');
  }

  revalidatePath('/');
  return { success: true };
}

/**
 * Get user's current workspace status
 */
export async function getCurrentWorkspace() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('tenant_id, active_tenant_id, demo_role, role')
    .eq('id', userId)
    .single();

  if (!profile) {
    return null;
  }

  const activeTenant = profile.active_tenant_id || profile.tenant_id;

  return {
    assignedTenant: profile.tenant_id || null,
    activeTenant: activeTenant || null,
    isDemo: activeTenant === 'demo',
    demoRole: profile.demo_role || 'campus_admin',
    realRole: profile.role
  };
}
