'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { requirePermission, requireTenantPermission } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/audit-logger';

export type InviteUserData = {
  email: string;
  role: 'viewer' | 'campus_admin' | 'district_admin' | 'master_admin';
  campus_id?: string | null; // Required for campus_admin role
  tenant_id?: string | null; // Tenant ID for multi-tenant support
};

/**
 * Invite a new user via email
 * district_admin and master_admin can invite users
 */
export async function inviteUser(data: InviteUserData) {
  // Check if user has permission to invite users
  const user = await requirePermission('invite_users');

  // If user has tenant_id, verify they can invite to this tenant
  if (user.role !== 'master_admin' && data.tenant_id) {
    await requireTenantPermission('invite_users', data.tenant_id);
  }

  // Validate campus_id for campus_admin role
  if (data.role === 'campus_admin' && !data.campus_id) {
    throw new Error('Campus ID is required when inviting a campus admin');
  }

  try {
    // Create invitation with role, campus_id, and tenant_id in publicMetadata
    const metadata: Record<string, any> = {
      role: data.role,
    };

    if (data.campus_id) {
      metadata.campus_id = data.campus_id;
    }

    if (data.tenant_id) {
      metadata.tenant_id = data.tenant_id;
    }

    // Log to server (no PII in console)
    logger.info('Creating invitation', { role: data.role, tenantId: data.tenant_id });

    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: data.email,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/sign-up`,
      publicMetadata: metadata,
    });

    // Log to admin audit log (viewable by admins with PII)
    await logAuditEvent({
      eventType: 'user.invited',
      actorId: user.userId,
      actorRole: user.role,
      targetId: invitation.id,
      action: 'User invitation created',
      details: {
        email: data.email,
        role: data.role,
        campusId: data.campus_id,
        tenantId: data.tenant_id,
      },
    });

    logger.info('Invitation created successfully', { invitationId: invitation.id });
    return { success: true, invitation };
  } catch (error: any) {
    logger.error('Error inviting user', error);

    // Return generic error message
    const errorMessage = error.errors?.[0]?.message || 'Failed to invite user';
    throw new Error(errorMessage);
  }
}

/**
 * Get all pending invitations
 */
export async function getPendingInvitations() {
  // Check if user has permission to view invitations
  await requirePermission('invite_users');

  const client = await clerkClient();
  const invitations = await client.invitations.getInvitationList({
    status: 'pending',
  });

  return invitations;
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string) {
  // Check if user has permission to revoke invitations
  await requirePermission('revoke_invitations');

  const client = await clerkClient();
  await client.invitations.revokeInvitation(invitationId);
  return { success: true };
}
