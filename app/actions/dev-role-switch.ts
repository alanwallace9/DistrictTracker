'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/audit-logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Allowed roles for dev switching
const DEV_SWITCHABLE_ROLES = [
  'viewer',
  'campus_admin',
  'district_admin',
  'super_admin',
  'daep_admin_l1',
  'daep_admin_l2',
  'daep_staff',
  'counselor',
] as const;

type DevRole = (typeof DEV_SWITCHABLE_ROLES)[number];

/**
 * Check if the current user is allowed to use the dev role switcher
 */
export async function isDevUser(): Promise<{ allowed: boolean; email: string | null }> {
  const { userId } = await auth();
  if (!userId) return { allowed: false, email: null };

  // Get allowed emails from env (comma-separated)
  const allowedEmails = process.env.DEV_USER_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];

  if (allowedEmails.length === 0) {
    return { allowed: false, email: null };
  }

  // Get user's email from Supabase
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('email')
    .eq('id', userId)
    .single();

  const userEmail = profile?.email?.toLowerCase();

  if (!userEmail) return { allowed: false, email: null };

  return {
    allowed: allowedEmails.includes(userEmail),
    email: userEmail,
  };
}

/**
 * Switch the current user's role (dev testing only)
 */
export async function switchDevRole(newRole: string): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user is allowed
  const { allowed, email } = await isDevUser();
  if (!allowed) {
    return { success: false, error: 'Not authorized for dev role switching' };
  }

  // Validate role
  if (!DEV_SWITCHABLE_ROLES.includes(newRole as DevRole)) {
    return { success: false, error: 'Invalid role' };
  }

  // Update role in Supabase
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    logger.error('Error switching dev role', error);
    return { success: false, error: 'Failed to update role' };
  }

  // Log the action
  await logAuditEvent({
    eventType: 'user.updated',
    actorId: userId,
    actorEmail: email || undefined,
    actorRole: newRole,
    targetId: userId,
    action: 'Dev role switch',
    details: { newRole, source: 'dev-role-switcher' },
  });

  logger.info('Dev role switched', { userId, newRole });
  return { success: true };
}

/**
 * Get current user's role from Supabase
 */
export async function getCurrentRole(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return profile?.role || null;
}
