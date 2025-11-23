import { auth, clerkClient } from '@clerk/nextjs/server';

export const ROLE_PERMISSIONS = {
  master_admin: [
    'invite_users',
    'revoke_invitations',
    'delete_records',
    'view_all_profiles',
    'manage_all_orgs',
  ],
  district_admin: [
    'invite_users',
    'revoke_invitations',
    'delete_records',
    'view_org_profiles',
    'manage_org',
  ],
  campus_admin: [
    'create_records',
    'update_records',
    'view_campus_profiles',
  ],
  viewer: ['view_records'],
} as const;

export type Permission = (typeof ROLE_PERMISSIONS)[keyof typeof ROLE_PERMISSIONS][number];

interface AuthenticatedUser {
  userId: string;
  role: keyof typeof ROLE_PERMISSIONS;
  tenantId: string | null;
  campusId: string | null;
}

/**
 * Get authenticated user with metadata
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  return {
    userId,
    role: (user.publicMetadata.role as keyof typeof ROLE_PERMISSIONS) || 'viewer',
    tenantId: (user.publicMetadata.tenant_id as string) || null,
    campusId: (user.publicMetadata.campus_id as string) || null,
  };
}

/**
 * Check if user has required permission
 */
export async function requirePermission(permission: Permission): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();

  const rolePermissions = ROLE_PERMISSIONS[user.role] as readonly Permission[];
  if (!rolePermissions?.includes(permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }

  return user;
}

/**
 * Check if user can access resource in specific tenant
 */
export async function requireTenantPermission(
  permission: Permission,
  targetTenantId: string
): Promise<AuthenticatedUser> {
  const user = await requirePermission(permission);

  // Master admin can access any tenant
  if (user.role === 'master_admin') {
    return user;
  }

  // Other roles must match tenant_id
  if (user.tenantId !== targetTenantId) {
    throw new Error('Access denied: Tenant mismatch');
  }

  return user;
}
