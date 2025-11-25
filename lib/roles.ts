/**
 * Role Hierarchy and Permission Utilities
 * Story 1.3: Add New DAEP Roles
 *
 * This module defines the complete role hierarchy for the DistrictTracker system,
 * including both TrespassTracker and DAEP module roles.
 *
 * Role Categories:
 * - TrespassTracker: viewer, campus_admin, district_admin, master_admin
 * - DAEP: daep_admin_l1, daep_admin_l2, daep_staff
 * - Special: parent, student, counselor
 */

/**
 * All valid roles in the system
 */
export type UserRole =
  // TrespassTracker roles (original)
  | 'viewer'           // Basic read access to tenant data
  | 'campus_admin'     // Manage records for assigned campus
  | 'district_admin'   // Full access to tenant data, user management
  | 'master_admin'     // System-wide access, cross-tenant capabilities
  // DAEP roles (Story 1.3)
  | 'daep_admin_l1'    // Full DAEP operations, point approval, staff management
  | 'daep_admin_l2'    // Daily operations, point entry, limited reports
  | 'daep_staff'       // Point entry, attendance, behavior notes (assigned rooms)
  // Special roles
  | 'parent'           // Read-only access to own child's progress
  | 'student'          // Read-only access to own progress
  | 'counselor';       // View profiles, placement history (assigned students)

/**
 * Role hierarchy with numeric permission levels.
 * Higher numbers = more permissions.
 * Used for permission checks: user can perform action if their level >= required level.
 *
 * Hierarchy:
 *   master_admin (100) - System owner, cross-tenant access
 *   district_admin (90) - Tenant admin, full tenant access
 *   daep_admin_l1 (80) - DAEP lead admin, full DAEP operations
 *   campus_admin (70) - Campus-level TrespassTracker admin
 *   daep_admin_l2 (60) - DAEP daily operations admin
 *   daep_staff (50) - DAEP classroom staff
 *   counselor (40) - Student support role
 *   viewer (30) - Read-only tenant access
 *   parent (20) - Read-only own child access
 *   student (10) - Read-only self access
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  master_admin: 100,
  district_admin: 90,
  daep_admin_l1: 80,
  campus_admin: 70,
  daep_admin_l2: 60,
  daep_staff: 50,
  counselor: 40,
  viewer: 30,
  parent: 20,
  student: 10,
};

/**
 * TrespassTracker module roles
 * These roles have access to TrespassTracker features
 */
export const TRESPASS_ROLES: UserRole[] = [
  'viewer',
  'campus_admin',
  'district_admin',
  'master_admin',
];

/**
 * DAEP module roles
 * These roles are specific to DAEP operations
 */
export const DAEP_ROLES: UserRole[] = [
  'daep_admin_l1',
  'daep_admin_l2',
  'daep_staff',
];

/**
 * Special roles with limited scope
 * Parent/Student: read-only access to own data
 * Counselor: view access to assigned students
 */
export const SPECIAL_ROLES: UserRole[] = [
  'parent',
  'student',
  'counselor',
];

/**
 * Read-only roles that cannot modify data
 */
export const READONLY_ROLES: UserRole[] = [
  'viewer',
  'parent',
  'student',
];

/**
 * All roles in the system
 */
export const ALL_ROLES: UserRole[] = [
  ...TRESPASS_ROLES,
  ...DAEP_ROLES,
  ...SPECIAL_ROLES,
];

/**
 * Role display information for UI
 */
export const ROLE_INFO: Record<UserRole, { label: string; description: string; category: 'trespass' | 'daep' | 'special' }> = {
  // TrespassTracker roles
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to district records',
    category: 'trespass',
  },
  campus_admin: {
    label: 'Campus Admin',
    description: 'Manage records for assigned campus',
    category: 'trespass',
  },
  district_admin: {
    label: 'District Admin',
    description: 'Full district access, user management',
    category: 'trespass',
  },
  master_admin: {
    label: 'Master Admin',
    description: 'System-wide access across all tenants',
    category: 'trespass',
  },
  // DAEP roles
  daep_admin_l1: {
    label: 'DAEP Admin L1',
    description: 'Full DAEP operations, point approval, staff management',
    category: 'daep',
  },
  daep_admin_l2: {
    label: 'DAEP Admin L2',
    description: 'Daily operations, point entry, limited reports',
    category: 'daep',
  },
  daep_staff: {
    label: 'DAEP Staff',
    description: 'Point entry, attendance, behavior notes for assigned rooms',
    category: 'daep',
  },
  // Special roles
  parent: {
    label: 'Parent',
    description: 'Read-only access to own child\'s progress',
    category: 'special',
  },
  student: {
    label: 'Student',
    description: 'Read-only access to own progress',
    category: 'special',
  },
  counselor: {
    label: 'Counselor',
    description: 'View profiles and placement history for assigned students',
    category: 'special',
  },
};

/**
 * Check if a user role has permission to perform an action requiring a minimum role level.
 *
 * @param userRole - The user's current role
 * @param requiredRole - The minimum role required for the action
 * @returns true if userRole has equal or higher permission level than requiredRole
 *
 * @example
 * hasPermission('district_admin', 'campus_admin') // true
 * hasPermission('viewer', 'campus_admin') // false
 * hasPermission('daep_admin_l1', 'daep_admin_l2') // true
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  if (userLevel === undefined || requiredLevel === undefined) {
    return false;
  }

  return userLevel >= requiredLevel;
}

/**
 * Check if a user role has at least the specified permission level.
 *
 * @param userRole - The user's current role
 * @param requiredLevel - The minimum permission level (numeric)
 * @returns true if userRole has equal or higher permission level
 *
 * @example
 * hasPermissionLevel('district_admin', 70) // true (90 >= 70)
 * hasPermissionLevel('viewer', 50) // false (30 < 50)
 */
export function hasPermissionLevel(userRole: UserRole, requiredLevel: number): boolean {
  const userLevel = ROLE_HIERARCHY[userRole];
  return userLevel !== undefined && userLevel >= requiredLevel;
}

/**
 * Check if a role is a DAEP-specific role.
 *
 * @param role - The role to check
 * @returns true if the role is DAEP-specific (daep_admin_l1, daep_admin_l2, daep_staff)
 */
export function isDaepRole(role: UserRole): boolean {
  return DAEP_ROLES.includes(role);
}

/**
 * Check if a role is a TrespassTracker role.
 *
 * @param role - The role to check
 * @returns true if the role is TrespassTracker-specific
 */
export function isTrespassRole(role: UserRole): boolean {
  return TRESPASS_ROLES.includes(role);
}

/**
 * Check if a role is read-only (cannot modify data).
 *
 * @param role - The role to check
 * @returns true if the role is read-only (viewer, parent, student)
 */
export function isReadOnlyRole(role: UserRole): boolean {
  return READONLY_ROLES.includes(role);
}

/**
 * Check if a role is an admin role (can manage users).
 * Admin roles: master_admin, district_admin, daep_admin_l1
 *
 * @param role - The role to check
 * @returns true if the role can manage users
 */
export function isAdminRole(role: UserRole): boolean {
  return hasPermissionLevel(role, ROLE_HIERARCHY.daep_admin_l1);
}

/**
 * Get the display label for a role.
 *
 * @param role - The role
 * @returns Human-readable label (e.g., "District Admin")
 */
export function getRoleLabel(role: UserRole): string {
  return ROLE_INFO[role]?.label || role.replace(/_/g, ' ');
}

/**
 * Get roles filtered by category.
 *
 * @param category - The category to filter by
 * @returns Array of roles in that category
 */
export function getRolesByCategory(category: 'trespass' | 'daep' | 'special'): UserRole[] {
  return ALL_ROLES.filter(role => ROLE_INFO[role].category === category);
}

/**
 * Get all roles a given role can assign to other users.
 * Users can only assign roles at or below their permission level.
 * master_admin can assign all roles except master_admin to others.
 *
 * @param assignerRole - The role of the user doing the assignment
 * @returns Array of roles that can be assigned
 */
export function getAssignableRoles(assignerRole: UserRole): UserRole[] {
  const assignerLevel = ROLE_HIERARCHY[assignerRole];

  // Special case: only master_admin can assign master_admin
  if (assignerRole === 'master_admin') {
    return ALL_ROLES;
  }

  // Otherwise, can only assign roles at or below your level (excluding master_admin)
  return ALL_ROLES.filter(role => {
    const roleLevel = ROLE_HIERARCHY[role];
    return role !== 'master_admin' && roleLevel <= assignerLevel;
  });
}

/**
 * Roles that can have the approved_teacher flag set.
 * Only DAEP staff who enter points can be designated as "approved teachers"
 * whose entries don't need admin approval.
 */
export const APPROVED_TEACHER_ELIGIBLE_ROLES: UserRole[] = [
  'daep_staff',
  'daep_admin_l2',
];

/**
 * Check if a role can have the approved_teacher flag.
 * Only daep_staff and daep_admin_l2 are eligible since they enter points
 * that may need approval workflow.
 *
 * @param role - The role to check
 * @returns true if the role can have approved_teacher flag set
 *
 * @example
 * canHaveApprovedTeacherFlag('daep_staff') // true
 * canHaveApprovedTeacherFlag('district_admin') // false
 * canHaveApprovedTeacherFlag('parent') // false
 */
export function canHaveApprovedTeacherFlag(role: UserRole): boolean {
  return APPROVED_TEACHER_ELIGIBLE_ROLES.includes(role);
}
