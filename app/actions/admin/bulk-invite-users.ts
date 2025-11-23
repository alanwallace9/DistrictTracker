'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { inviteUser } from '@/app/actions/invite-user';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/audit-logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type BulkUserRow = {
  email: string;
  role: 'viewer' | 'campus_admin' | 'district_admin';
  campus_id?: string;
  tenant_id?: string; // Optional: for master_admin to invite to specific tenant
};

export type BulkInviteResult = {
  email: string;
  success: boolean;
  error?: string;
  userId?: string;
};

type BulkInviteResponse = {
  success: boolean;
  results: BulkInviteResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
};

/**
 * Validate a single user row before processing
 */
async function validateUserRow(
  row: BulkUserRow,
  validCampusIds: Set<string>,
  validTenantIds: Set<string>,
  isMasterAdmin: boolean
): Promise<string | null> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(row.email)) {
    return 'Invalid email format';
  }

  // Validate role
  const validRoles = ['viewer', 'campus_admin', 'district_admin'];
  if (!validRoles.includes(row.role)) {
    return `Invalid role. Must be one of: ${validRoles.join(', ')}`;
  }

  // Validate campus_id for campus_admin
  if (row.role === 'campus_admin') {
    if (!row.campus_id) {
      return 'Campus ID is required for campus_admin role';
    }
    if (!validCampusIds.has(row.campus_id)) {
      return `Invalid campus_id: ${row.campus_id}`;
    }
  }

  // Validate tenant_id if provided (only master_admin should use this)
  if (row.tenant_id) {
    if (!isMasterAdmin) {
      return 'Only master_admin can specify tenant_id';
    }
    if (!validTenantIds.has(row.tenant_id)) {
      return `Invalid tenant_id: ${row.tenant_id}`;
    }
  }

  return null; // No validation errors
}

/**
 * Bulk invite multiple users from CSV data
 *
 * This function:
 * 1. Validates all rows before processing
 * 2. Processes each valid row using the existing inviteUser() function
 * 3. Tracks success/failure for each user
 * 4. Logs audit event for the bulk operation
 *
 * @param users - Array of user rows from CSV
 * @returns Results summary with per-user status
 */
export async function bulkInviteUsers(users: BulkUserRow[]): Promise<BulkInviteResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error('Not authenticated');
    }

    logger.info('[bulkInviteUsers] Starting bulk invitation', { count: users.length, userId });

    // Get admin profile to verify permissions
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
      throw new Error('Only district and master admins can bulk invite users');
    }

    const isMasterAdmin = adminProfile.role === 'master_admin';

    // Fetch valid campus IDs for validation
    const { data: campuses } = await supabaseAdmin
      .from('campuses')
      .select('id')
      .eq('tenant_id', adminProfile.tenant_id)
      .eq('status', 'active')
      .is('deleted_at', null);

    const validCampusIds = new Set(campuses?.map(c => c.id) || []);

    logger.info('[bulkInviteUsers] Valid campuses loaded', { count: validCampusIds.size });

    // Fetch valid tenant IDs if master_admin
    let validTenantIds = new Set<string>();
    if (isMasterAdmin) {
      const { data: tenants } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('status', 'active');

      validTenantIds = new Set(tenants?.map(t => t.id) || []);
      logger.info('[bulkInviteUsers] Valid tenants loaded', { count: validTenantIds.size });
    }

    // Validate all rows first
    const validationErrors: Map<string, string> = new Map();
    for (const user of users) {
      const error = await validateUserRow(user, validCampusIds, validTenantIds, isMasterAdmin);
      if (error) {
        validationErrors.set(user.email, error);
      }
    }

    // Process each user
    const results: BulkInviteResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const user of users) {
      // Check if this row had validation errors
      if (validationErrors.has(user.email)) {
        results.push({
          email: user.email,
          success: false,
          error: validationErrors.get(user.email),
        });
        failed++;
        continue;
      }

      // Attempt to invite the user
      try {
        const result = await inviteUser({
          email: user.email,
          role: user.role,
          campusId: user.campus_id || null,
          tenantId: user.tenant_id || null, // Master admin can specify tenant
        });

        results.push({
          email: user.email,
          success: true,
          userId: result.userId,
        });
        succeeded++;

        logger.info('[bulkInviteUsers] User invited', { email: user.email });
      } catch (error: any) {
        results.push({
          email: user.email,
          success: false,
          error: error.message,
        });
        failed++;

        logger.error('[bulkInviteUsers] Failed to invite user', {
          email: user.email,
          error: error.message,
        });
      }
    }

    // Log bulk invitation to audit log
    await logAuditEvent({
      eventType: 'user.bulk_invited',
      actorId: userId,
      actorRole: adminProfile.role,
      targetId: undefined,
      action: `Bulk invited ${succeeded} users (${failed} failed)`,
      details: {
        total: users.length,
        succeeded,
        failed,
        tenantId: adminProfile.tenant_id,
        actorEmail: adminProfile.email,
      },
    });

    logger.info('[bulkInviteUsers] Bulk invitation completed', {
      total: users.length,
      succeeded,
      failed,
    });

    return {
      success: true,
      results,
      summary: {
        total: users.length,
        succeeded,
        failed,
      },
    };
  } catch (error: any) {
    console.error('[bulkInviteUsers] Fatal error during bulk invitation:', {
      error: error.message,
      stack: error.stack,
    });

    // Re-throw if it's a validation error (these are safe)
    if (error.message && (
      error.message.includes('not authenticated') ||
      error.message.includes('not found') ||
      error.message.includes('Only district and master admins')
    )) {
      throw error;
    }
    throw new Error('Failed to process bulk invitation. Please try again.');
  }
}
