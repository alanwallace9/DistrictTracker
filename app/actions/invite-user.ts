'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/audit-logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get tenant_id from subdomain
 * Examples:
 * - birdville.districttracker.com → birdville
 * - localhost:3000 → birdville (default for local dev)
 */
async function getTenantIdFromSubdomain(): Promise<string> {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';

    logger.info('[getTenantIdFromSubdomain] Extracting tenant from host', { host });

    // For local development, default to 'birdville'
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      logger.info('[getTenantIdFromSubdomain] Using default tenant for localhost');
      return 'birdville';
    }

    // Extract subdomain from host
    // birdville.districttracker.com → birdville
    const subdomain = host.split('.')[0];

    logger.info('[getTenantIdFromSubdomain] Extracted subdomain', { subdomain });

    if (!subdomain) {
      throw new Error('Could not determine tenant from subdomain');
    }

    // Verify tenant exists in database
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (error) {
      console.error('[getTenantIdFromSubdomain] Database error looking up tenant:', error);
      throw new Error('Failed to determine your organization. Please try again.');
    }

    if (!tenant) {
      logger.error('[getTenantIdFromSubdomain] Tenant not found in database', { subdomain });
      throw new Error(`Invalid tenant: ${subdomain}`);
    }

    logger.info('[getTenantIdFromSubdomain] Found tenant', { tenantId: tenant.id, subdomain });
    return tenant.id;
  } catch (error: any) {
    logger.error('[getTenantIdFromSubdomain] Fatal error', { error: error.message, stack: error.stack });
    throw error;
  }
}

type InviteUserParams = {
  email: string;
  role: 'viewer' | 'campus_admin' | 'district_admin';
  campusId?: string | null;
  tenantId?: string | null; // Optional: master_admin can specify tenant, others use subdomain
};

/**
 * Invite a new user by creating them in Clerk with proper metadata
 * The user will receive an email to set their password
 *
 * Security:
 * - For district_admin/campus_admin: tenant_id is derived from subdomain (strict isolation)
 * - For master_admin: can optionally specify tenantId to invite to any tenant they manage
 */
export async function inviteUser({ email, role, campusId, tenantId }: InviteUserParams) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    logger.info('[inviteUser] Starting invitation process', { email, role, campusId, tenantId, userId });

    // Get current user's profile to verify permissions
    const { data: adminProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, role, email')
      .eq('id', userId)
      .single();

    if (!adminProfile) {
      throw new Error('Admin profile not found');
    }

    // Validate permissions
    if (!['district_admin', 'master_admin'].includes(adminProfile.role)) {
      throw new Error('Only district and master admins can invite users');
    }

    // Determine target tenant based on role
    let targetTenantId: string;

    if (adminProfile.role === 'master_admin' && tenantId) {
      // Master admin can invite to specified tenant
      // Validate that the tenant exists
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenant) {
        throw new Error('Invalid tenant specified');
      }

      targetTenantId = tenantId;
      logger.info('[inviteUser] Master admin inviting to specified tenant', { targetTenantId });
    } else {
      // District/campus admin: use subdomain (strict isolation)
      // Master admin without tenantId: also use subdomain
      try {
        targetTenantId = await getTenantIdFromSubdomain();
        logger.info('[inviteUser] Using tenant from subdomain', { targetTenantId });
      } catch (error: any) {
        logger.error('[inviteUser] Failed to get tenant from subdomain', { error: error.message });
        throw new Error(`Failed to determine your organization: ${error.message}`);
      }

      // SECURITY: For non-master-admin, verify their tenant matches subdomain
      if (adminProfile.role !== 'master_admin' && adminProfile.tenant_id !== targetTenantId) {
        logger.error('Tenant mismatch during user invitation', {
          adminTenant: adminProfile.tenant_id,
          subdomainTenant: targetTenantId,
          adminId: userId,
        });
        throw new Error('You can only invite users to your own organization');
      }
    }

    // Validate campus_id for campus_admin role
    if (role === 'campus_admin' && !campusId) {
      throw new Error('Campus admin users must have a campus assigned');
    }

    // Prepare metadata using target tenant_id
    const metadata: {
      role: string;
      tenant_id: string;
      campus_id?: string;
    } = {
      role,
      tenant_id: targetTenantId,
    };

  if (campusId) {
    metadata.campus_id = campusId;
  }

    // Get tenant subdomain to build correct redirect URL
    const { data: targetTenant } = await supabaseAdmin
      .from('tenants')
      .select('subdomain')
      .eq('id', targetTenantId)
      .single();

    // Build the redirect URL with the correct tenant subdomain
    // In production: https://[subdomain].districttracker.com/login
    // In development: http://localhost:3000/login (subdomain doesn't matter in dev)
    const isProduction = process.env.NODE_ENV === 'production';
    const redirectUrl = isProduction
      ? `https://${targetTenant?.subdomain}.districttracker.com/login`
      : 'http://localhost:3000/login';

    // Send invitation via Clerk (this creates the user and sends email)
    const client = await clerkClient();

    logger.info('[inviteUser] Sending invitation via Clerk', { email, metadata, redirectUrl, targetTenantId, subdomain: targetTenant?.subdomain });

    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: metadata,
      redirectUrl: `${redirectUrl}/login`,
      expiresInDays: 7, // Standard security practice: 7 day expiration
    });

    logger.info('[inviteUser] Invitation created successfully', {
      invitationId: invitation.id,
      email: invitation.emailAddress,
      invitedBy: userId
    });

    // Track invitation in Supabase pending_invitations table
    const { error: invitationError } = await supabaseAdmin
      .from('pending_invitations')
      .insert({
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        role,
        tenant_id: targetTenantId,
        campus_id: campusId || null,
        invited_by: userId,
        invited_by_email: adminProfile.email || email,
        status: 'pending',
        clerk_invitation_id: invitation.id,
        expires_at: (invitation as any).expiresAt ? new Date((invitation as any).expiresAt).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (invitationError) {
      logger.error('[inviteUser] Failed to track invitation in Supabase', invitationError);
      // Don't fail the whole operation, just log the error
    }

    // Log to admin audit log
    await logAuditEvent({
      eventType: 'user.invited',
      actorId: userId,
      actorRole: adminProfile.role,
      targetId: invitation.id,
      action: `Invited user as ${role}`,
      details: {
        email,
        role,
        campusId,
        tenantId: targetTenantId,
      },
    });

    return {
      success: true,
      userId: invitation.id,
      message: `Invitation sent to ${email}`,
    };
  } catch (error: any) {
    console.error('[inviteUser] Error during invitation:', {
      error: error.message,
      stack: error.stack,
      clerkErrors: error.errors,
      clerkErrorDetails: JSON.stringify(error.errors, null, 2),
      email,
      role,
    });

    // Handle specific Clerk errors
    if (error.errors?.[0]?.code === 'form_identifier_exists') {
      throw new Error('A user with this email already exists');
    }

    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('not authenticated') ||
      error.message.includes('not found') ||
      error.message.includes('Invalid tenant') ||
      error.message.includes('Only district and master admins') ||
      error.message.includes('must have a campus') ||
      error.message.includes('can only invite users to your own organization') ||
      error.message.includes('Failed to determine your organization')
    )) {
      throw error;
    }

    // Generic error for database/Clerk issues
    throw new Error('Failed to invite user. Please try again.');
  }
}
