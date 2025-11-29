# Impersonation Mode - Updated Plan

## Overview

Unified role switching system that handles:
1. **Demo subdomain** - Any user can impersonate any role with full permissions (existing behavior)
2. **Production subdomains** - Only super_admin can impersonate for UI testing (view-only)

---

## Known Bug to Fix

**Demo role doesn't persist across navigation**

When user switches to District Admin on demo subdomain, then navigates to admin panel, the role reverts to their actual role instead of staying as the demo role.

**Root cause:** Admin panel layout likely reads role from wrong source (actual role instead of demo_role).

**Fix:** All layouts must check `effectiveRole` from unified context, which respects `demo_role` when on demo subdomain.

---

## Current State (Demo Mode)

Already working well:

| Component | Purpose |
|-----------|---------|
| `DemoRoleContext` | Manages demo role state |
| `demo_role` column | Stored in `user_profiles`, used by server actions |
| `updateDemoRole()` | Server action to change demo role |
| Daily cron job | Resets demo data on Vercel |

**Key:** Demo mode uses DB column `demo_role`, so server actions respect it. This is correct.

---

## Two Modes of Impersonation

| Aspect | Demo Subdomain | Production Subdomain |
|--------|----------------|---------------------|
| **Who can impersonate** | Any user | Only `super_admin` |
| **Storage** | `user_profiles.demo_role` (DB) | `sessionStorage` (browser) |
| **Server actions** | Use `demo_role` (full permissions) | Use `actual role` (UI-only) |
| **Purpose** | Let prospects try the product | Let admin test UI across roles |
| **Resets** | Daily cron job | On tab close |

---

## Unified Context: `ImpersonationContext`

Extend existing `DemoRoleContext` to handle both modes:

```typescript
type ImpersonationContextType = {
  // Mode detection
  isDemoMode: boolean;              // true if on demo subdomain
  isDevMode: boolean;               // true if super_admin on production

  // Role state
  actualRole: string;               // Real role from user_profiles.role
  effectiveRole: string;            // What role to render UI as

  // For demo subdomain (any user)
  demoRole: string;                 // From user_profiles.demo_role
  setDemoRole: (role) => void;      // Updates DB

  // For production (super_admin only)
  viewingAsRole: string | null;     // From sessionStorage
  setViewingAs: (role) => void;     // Updates sessionStorage
  clearViewingAs: () => void;       // Exit impersonation

  // Computed
  canImpersonate: boolean;          // isDemoMode || actualRole === 'super_admin'
  isImpersonating: boolean;         // Has active impersonation
  availableRoles: Role[];           // Roles user can switch to
};
```

**Effective Role Logic:**
```typescript
const effectiveRole = useMemo(() => {
  if (isDemoMode) {
    return demoRole;  // Demo: use demo_role from DB
  }
  if (viewingAsRole && actualRole === 'super_admin') {
    return viewingAsRole;  // Dev: use sessionStorage role
  }
  return actualRole;  // Default: actual DB role
}, [isDemoMode, demoRole, viewingAsRole, actualRole]);
```

---

## Available Roles

Expand role list to include DAEP roles:

```typescript
const ALL_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'district_admin', label: 'District Admin' },
  { value: 'campus_admin', label: 'Campus Admin' },
  { value: 'daep_admin_l1', label: 'DAEP Admin L1' },
  { value: 'daep_admin_l2', label: 'DAEP Admin L2' },
  { value: 'daep_staff', label: 'DAEP Staff' },
  { value: 'counselor', label: 'Counselor' },
  { value: 'viewer', label: 'Viewer' },
];
```

---

## UI: Role Badge/Switcher

**Mimic existing demo badge style:**

Current demo badge location: Header, shows current role with dropdown to switch.

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] District Tracker    [Campus Admin ▼]  [Back to ...]   │
└──────────────────────────────────────────────────────────────┘
                                    ↑
                              Role badge with dropdown
```

**Badge appearance:**
- Light background (amber/yellow for dev, blue for demo - or same color)
- Shows current effective role
- Dropdown to select different role
- Only visible when `canImpersonate` is true

---

## Server Action Behavior

### Demo Subdomain
Server actions check `demo_role`:

```typescript
export async function someAction() {
  const workspace = await getCurrentWorkspace();
  const effectiveRole = workspace.isDemo
    ? workspace.demoRole
    : workspace.realRole;

  // Use effectiveRole for permission checks
}
```

### Production Subdomain
Server actions check `actual role` only:

```typescript
export async function someAction() {
  const profile = await getUserProfile(userId);
  // Use profile.role - ignores sessionStorage viewingAs
  // This is intentional - dev impersonation is UI-only
}
```

---

## File Changes

### Modify (not replace)
- `contexts/DemoRoleContext.tsx` → Rename to `ImpersonationContext.tsx`, extend functionality

### Update
- `app/admin/layout.tsx` - Use `effectiveRole`, add role badge for super_admin
- `app/daep/settings/layout.tsx` - Same
- `components/trespass/DashboardLayout.tsx` - Already uses DemoRoleContext, will get new features

### Delete
- `components/dev/DevRoleSwitcher.tsx` - No longer needed
- `app/actions/dev-role-switch.ts` - No longer needed

---

## Implementation Steps

1. **Rename & extend context**
   - `DemoRoleContext.tsx` → `ImpersonationContext.tsx`
   - Add `viewingAsRole` state (sessionStorage)
   - Add `isDevMode` detection
   - Add `effectiveRole` computed value
   - Expand available roles list

2. **Update role badge component**
   - Show for both demo mode AND super_admin on production
   - Same visual style
   - Dropdown with all roles

3. **Add badge to layouts**
   - `admin/layout.tsx` - header
   - `daep/settings/layout.tsx` - header
   - (DashboardLayout already has it)

4. **Remove old dev switcher**
   - Delete `DevRoleSwitcher.tsx`
   - Delete `dev-role-switch.ts`

5. **Test**
   - Demo subdomain: any user can switch, full permissions work
   - Production: only super_admin sees switcher, UI-only

---

## Backlog Items (Not This PR)

- **Profile dropdown consistency** - Add full profile dropdown to admin/DAEP layouts (Medium priority)
- **Move profile to left nav** - Future UI consideration

---

## No Audit Logging

Impersonation start/stop is NOT logged. Audit logging is for actual record operations only.

---

## Summary

| Where | Who | How | Permissions |
|-------|-----|-----|-------------|
| Demo subdomain | Any user | `demo_role` in DB | Full (server respects) |
| Production subdomain | Super admin only | `sessionStorage` | UI-only (server ignores) |

Same badge UI style for both. Unified context handles the logic.
