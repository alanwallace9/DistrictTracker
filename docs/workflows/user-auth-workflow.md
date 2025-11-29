# User Authentication & Authorization Workflow

## Overview

This document describes how user authentication and authorization flows between the app, Supabase, and Clerk.

### Source of Truth

| System | Responsibility |
|--------|---------------|
| **Clerk** | Authentication only: email, password, password reset, login |
| **Supabase** | Authorization & all user data: role, tenant, campus, module access, display name, notifications, status |

**Key Principle:** Supabase is the source of truth. Clerk only stores what it needs for authentication. When data changes in Supabase, relevant fields (role) are pushed TO Clerk. Clerk never overwrites Supabase.

---

## Data Ownership

| Field | Stored In | Notes |
|-------|-----------|-------|
| Email | Both | Set once at invite, immutable |
| Password | Clerk only | User manages via Clerk |
| Role | Both | Supabase is source of truth; pushed to Clerk for login visibility |
| Tenant ID | Supabase | Determines which district/org user belongs to |
| Campus ID | Supabase | For campus_admin role assignment |
| Display Name | Supabase | User can customize (e.g., "Dr. Wilson") |
| Module Access | Supabase | `trespass_only`, `daep_only`, or `both` |
| Notification Settings | Supabase | Future: notification preferences |
| Status | Supabase | `invited`, `active`, `inactive`, `expired`, `revoked` |

---

## User Status Values

| Status | Description | Can Login? |
|--------|-------------|------------|
| `invited` | Invitation sent, waiting for user to set password | No |
| `active` | User completed signup, account is active | Yes |
| `inactive` | Account deactivated (keep for audit trail) | No |
| `expired` | Invitation link expired | No |
| `revoked` | Admin cancelled invitation before acceptance | No |

**Important:** Never delete users from Supabase. Mark as `inactive` instead for audit compliance.

---

## Workflows

### 1. User Invitation (Single User)

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin Panel: Invite User Form                                   │
│ Fields: email, role, campus (if needed), module_access          │
│ Tenant: auto-set for district_admin, selectable for super_admin │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Save to Supabase                                        │
│ - Create pending_invitations record (status: 'invited')         │
│ - Store: email, role, tenant_id, campus_id, module_access       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Call Clerk API                                          │
│ - Create invitation with publicMetadata:                        │
│   { role, tenant_id, campus_id }                                │
│ - Clerk sends email to user                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: User receives email, clicks link, sets password         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Clerk fires user.created webhook                        │
│ Webhook handler:                                                │
│ - Creates user_profiles row (role from Clerk metadata)          │
│ - Updates pending_invitations: status → 'accepted'              │
│ - User can now log in                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Bulk User Invitation (CSV Upload)

Same flow as single user, but:
- Admin uploads CSV with: email, role, campus_id (optional), module_access (optional)
- Tenant is set from dropdown (super_admin) or auto-set (district_admin)
- App loops through CSV and creates invitations for each user
- Each user receives individual email from Clerk

### 3. User Update (Admin Changes User)

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin Panel: Edit User                                          │
│ Can change: role, campus, module_access, display_name, status   │
│ Cannot change: email, tenant                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Write ALL changes to Supabase user_profiles             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: IF role changed → Push role to Clerk immediately        │
│ - Call Clerk API to update publicMetadata.role                  │
│ - User's login access reflects new role instantly               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: Clerk fires user.updated webhook                        │
│ Webhook handler: IGNORES role (do not echo back to Supabase)    │
└─────────────────────────────────────────────────────────────────┘
```

### 4. User Deactivation

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin marks user as inactive in Supabase                        │
│ - Set status = 'inactive'                                       │
│ - Push to Clerk: revoke sessions / disable user                 │
│ - User can no longer log in                                     │
│ - User record preserved for audit trail                         │
└─────────────────────────────────────────────────────────────────┘
```

### 5. User Deletion (Clerk-initiated)

If a user is deleted from Clerk dashboard:
```
┌─────────────────────────────────────────────────────────────────┐
│ Clerk fires user.deleted webhook                                │
│ Webhook handler:                                                │
│ - Mark user_profiles.status = 'inactive'                        │
│ - Do NOT delete from Supabase (audit compliance)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Webhook Behavior Summary

| Clerk Event | Supabase Action |
|-------------|-----------------|
| `user.created` | Create user_profiles row, mark invitation accepted |
| `user.updated` | **Do NOT update role.** Only sync email if somehow changed (shouldn't happen). |
| `user.deleted` | Mark user as `inactive`. Do NOT delete. |

---

## Role-Based Access

### Tenant Selection in Invite Form

| Inviter Role | Tenant Selection |
|--------------|------------------|
| `super_admin` | Dropdown to select any tenant |
| `district_admin` | Locked to their own tenant |
| `campus_admin` | Locked to their own tenant |

### Admin Panel Access

| Role | Can Access Admin Panel? | Pages Available |
|------|------------------------|-----------------|
| `super_admin` | Yes | All pages including Tenants, Waitlist, Feedback |
| `district_admin` | Yes | All except Tenants, Waitlist, Feedback |
| `campus_admin` | No | N/A |
| `viewer` | No | N/A |

### Module Access

| Role | Default Module Access | Can Change? |
|------|----------------------|-------------|
| `super_admin` | Both | Yes |
| `district_admin` | Both | Yes |
| `campus_admin` | Both | Yes |
| `viewer` | Both | Yes |
| `daep_admin_l1` | DAEP Only | No |
| `daep_admin_l2` | DAEP Only | No |
| `daep_staff` | DAEP Only | No |
| `counselor` | Both | Yes |
| `student` | DAEP Only | No |
| `parent` | DAEP Only | No |

---

## Demo Mode Handling

When user is on demo subdomain with demo role switcher:

1. **Effective Role** = demo role (for UI/navigation)
2. **Super Admin Pages** (Tenants, Waitlist, Feedback) = check **actual** DB role, not demo role
3. **Header Badge** = shows effective role for awareness
4. **Tenant in Header** = shows "Demo District" or actual tenant name

---

## Authorization Check Pattern

All authorization checks should read from **Supabase**, not Clerk:

```typescript
// CORRECT: Read from Supabase
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('id', userId)
  .single();

const userRole = profile?.role;

// INCORRECT: Read from Clerk (don't do this for authorization)
// const role = user.publicMetadata?.role;
```

### Server-Side Authorization (Preferred)

For security and FERPA compliance, authorization checks should happen server-side:

```typescript
// In server component or server action
export async function getProtectedData() {
  const { userId } = await auth();

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', userId)
    .single();

  if (profile?.role !== 'district_admin' && profile?.role !== 'super_admin') {
    throw new Error('Unauthorized');
  }

  // Proceed with data fetch...
}
```

---

## Files Involved

| File | Purpose |
|------|---------|
| `app/actions/sync-user.ts` | Manual sync (dev/testing) - preserves existing role |
| `app/api/webhooks/clerk/route.ts` | Handles Clerk webhooks |
| `app/admin/layout.tsx` | Admin panel authorization |
| `app/daep/settings/layout.tsx` | DAEP settings authorization |
| `app/actions/admin/users.ts` | User management actions |
| `contexts/DemoRoleContext.tsx` | Demo mode role switching |

---

## Change Log

- **2025-11-26**: Initial documentation created
- Established Supabase as source of truth for authorization
- Documented webhook behavior (Clerk → Supabase for user.created only)
- Documented role push pattern (Supabase → Clerk on admin updates)
