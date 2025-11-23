'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/audit-logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Manually sync current user from Clerk to Supabase
 * Use this for development/testing without webhooks
 */
export async function syncCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);

  const primaryEmail = clerkUser.emailAddresses.find(
    (email) => email.id === clerkUser.primaryEmailAddressId
  )?.emailAddress;

  const role = (clerkUser.publicMetadata.role as string) || 'viewer';
  const campusId = clerkUser.publicMetadata.campus_id as string | null;
  const tenantId = clerkUser.publicMetadata.tenant_id as string | null;

  // Log to server (no PII in console)
  logger.info('Syncing user', { userId, role });

  // Upsert user profile
  const { error } = await supabaseAdmin.from('user_profiles').upsert({
    id: userId,
    email: primaryEmail,
    role: role,
    campus_id: campusId || null,
    tenant_id: tenantId || null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    logger.error('Error syncing user', error);
    throw new Error('Unable to sync user profile');
  }

  // Log to admin audit log (viewable by admins with PII)
  await logAuditEvent({
    eventType: 'user.updated',
    actorId: userId,
    actorEmail: primaryEmail,
    actorRole: role,
    targetId: userId,
    action: 'User profile synced manually',
    details: {
      role,
      campusId,
      tenantId,
    },
  });

  logger.info('User synced successfully');
  return { success: true };
}
