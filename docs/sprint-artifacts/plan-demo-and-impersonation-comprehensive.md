# Demo Mode & Role Impersonation - Comprehensive Plan

**Status:** Draft - Pending Party Mode Review
**Created:** 2025-11-26
**Purpose:** Fix demo mode persistence bug + add production impersonation for super_admin

---

## Executive Summary

Three interconnected issues to address:
1. **Bug:** Demo role doesn't persist when navigating to admin panel
2. **Enhancement:** Add role switcher to admin/DAEP layouts
3. **New Feature:** Production impersonation for super_admin (UI-only testing)

Plus backlogged architectural decisions about admin panel consolidation.

---

## Current State

### Demo Subdomain (demo.districttracker.com)

**What works:**
- Role switcher in trespass dashboard header
- Roles: Viewer, Campus Admin, District Admin
- Yellow banner: "Demo environment resets at least every 6 hours"
- `demo_role` stored in `user_profiles` table
- Daily cron job resets demo data

**What's broken:**
- Switch to District Admin → Click "Admin Panel" → Redirected back to dashboard
- Role doesn't persist across navigation to admin panel
- Admin panel reads actual role instead of `demo_role`

**What's missing:**
- DAEP-specific demo roles (student, parent, counselor, daep_admin_l1, etc.)
- Role switcher on admin panel and DAEP settings pages
- "DEMO" branding on admin panel
- Tenant name in admin panel header

### Production Subdomains (birdville.districttracker.com, etc.)

**Current:** No role switching available (except broken DevRoleSwitcher that changes actual DB role)

**Needed:** Super_admin-only impersonation for UI testing

---

## Detailed Requirements

### 1. Demo Subdomain Behavior

#### Who Can Use Demo
- Anyone with an account (including users without a tenant)
- Users switch `active_tenant_id` to 'demo' to enter demo mode

#### Available Roles by Module

| Module | Available Demo Roles |
|--------|---------------------|
| Trespass Tracker | Viewer, Campus Admin, District Admin |
| DAEP Management | Student, Parent, Counselor, DAEP Staff, DAEP Admin L1, DAEP Admin L2, Campus Admin, District Admin |
| Admin Panel | Campus Admin, District Admin |

**Note:** `super_admin` is NEVER available in demo role switcher. Max = `district_admin`.

#### Role Switcher Visibility

The role switcher should appear when:
- User is on demo subdomain (`active_tenant_id = 'demo'`)
- Regardless of their actual role

Should show on:
- Trespass dashboard (existing)
- DAEP dashboard/pages (new)
- Admin panel (new)

#### Persistence Requirements

When user switches to District Admin on demo:
1. `demo_role` updates in database
2. Role persists across ALL navigation (including to admin panel)
3. Admin panel should read `demo_role` and allow access if District Admin
4. Only reverts when:
   - User leaves demo mode (switches to production tenant)
   - Daily reset cron job runs

#### Demo Data Reset

What resets daily:
- All trespass records
- All DAEP placements, assignments, logs
- All admin settings (users invited, campuses edited, etc.)
- NOT user_profiles for existing accounts

Reset mechanism:
- Vercel cron job
- Restores from Supabase backup/seed data
- Need to create/maintain seed data set

### 2. Production Subdomain Behavior

#### Who Can Use Impersonation
- ONLY users with actual role = `super_admin`
- Verified from Supabase `user_profiles.role`

#### How It Works

| Aspect | Behavior |
|--------|----------|
| Storage | Browser `sessionStorage` (not database) |
| Scope | Current tab only |
| Persistence | Cleared on tab close |
| Server actions | Still check ACTUAL role (UI-only impersonation) |
| Purpose | Test UI appearance across roles |

#### UI Indicator

Same badge style as demo mode, but:
- Visible in admin panel header
- Visible in DAEP settings header
- Shows "Viewing as: [Role]" or just the role badge

#### Available Roles for Impersonation

All roles (since it's UI-only, no security risk):
- Viewer
- Campus Admin
- District Admin
- DAEP Staff
- DAEP Admin L1
- DAEP Admin L2
- Counselor
- Student (for DAEP)
- Parent (for DAEP)

### 3. Leaving Demo Mode

When user leaves demo subdomain:
- `active_tenant_id` clears or reverts to their assigned tenant
- `demo_role` is ignored
- Their actual `role` applies
- If they have no tenant → can only access marketing/feedback pages

---

## Technical Implementation

### Unified Context: `ImpersonationContext`

Rename and extend existing `DemoRoleContext`:

```typescript
type ImpersonationContextType = {
  // Mode detection
  isDemoMode: boolean;           // active_tenant_id === 'demo'
  canImpersonate: boolean;       // isDemoMode || actualRole === 'super_admin'

  // Roles
  actualRole: string;            // From user_profiles.role (never changes)
  demoRole: string | null;       // From user_profiles.demo_role (demo only)
  viewingAsRole: string | null;  // From sessionStorage (production only)
  effectiveRole: string;         // What to use for UI rendering

  // Actions
  setDemoRole: (role) => void;   // Updates database (demo mode)
  setViewingAs: (role) => void;  // Updates sessionStorage (production)
  clearViewingAs: () => void;    // Exit production impersonation

  // Module awareness
  currentModule: 'trespass' | 'daep' | 'admin';
  availableRoles: Role[];        // Filtered by module + mode
};
```

### Effective Role Logic

```typescript
const effectiveRole = useMemo(() => {
  if (isDemoMode && demoRole) {
    return demoRole;  // Demo: use demo_role from DB
  }
  if (!isDemoMode && viewingAsRole && actualRole === 'super_admin') {
    return viewingAsRole;  // Production: use sessionStorage
  }
  return actualRole;  // Default
}, [isDemoMode, demoRole, viewingAsRole, actualRole]);
```

### Files to Modify

| File | Change |
|------|--------|
| `contexts/DemoRoleContext.tsx` | Rename to `ImpersonationContext.tsx`, add production mode |
| `app/admin/layout.tsx` | Use `effectiveRole`, add role badge, allow demo district_admin |
| `app/daep/settings/layout.tsx` | Use `effectiveRole`, add role badge |
| `components/trespass/DashboardLayout.tsx` | Use new context (already uses DemoRoleContext) |
| `app/actions/tenant-switching.ts` | Add DAEP roles to allowed demo roles |

### Files to Delete

| File | Reason |
|------|--------|
| `components/dev/DevRoleSwitcher.tsx` | Replaced by impersonation |
| `app/actions/dev-role-switch.ts` | Replaced by impersonation |

---

## UI/UX Details

### Role Badge Appearance

Current demo badge style:
```
┌─────────────────┐
│ District Admin ▼│  (blue/purple background, dropdown)
└─────────────────┘
```

Use same style for:
- Demo mode (any user)
- Production impersonation (super_admin only)

### Admin Panel Header Updates

Current:
```
[Logo] District Tracker        [Back to Dashboard]
       Admin Panel
```

Proposed:
```
[Logo] District Tracker | Birdville ISD    [District Admin ▼]  [Back to Dashboard]
       Admin Panel

(if demo subdomain, add yellow banner)
```

Changes:
- Add tenant name after "District Tracker"
- Add role badge (when canImpersonate)
- Show demo banner if on demo subdomain

---

## Edge Cases

### 1. User with no tenant visits demo, then leaves
- On demo: can use all demo features
- Leave demo: can only access marketing/feedback pages
- No tenant to "go back to"

### 2. Super_admin impersonating on production, then visits demo
- Production impersonation (sessionStorage) clears
- Demo mode takes over with demo_role from database

### 3. Demo user tries to access super_admin features
- `super_admin` not in demo role list
- Even if they somehow set demo_role to super_admin, server actions would need to validate

### 4. Multiple tabs
- Demo mode: same demo_role (from database) across all tabs
- Production impersonation: per-tab (sessionStorage is per-tab? Actually per-origin...)

**Note:** sessionStorage is actually per-tab for same origin. Need to verify this behavior.

---

## Questions for Party Mode Review

1. **Module-specific roles in demo:** Should role switcher show different roles based on current module (DAEP vs Trespass)?

2. **Admin panel access in demo:** Should demo users with District Admin role be able to:
   - View all admin pages?
   - Make changes (that reset daily)?
   - Or just view-only?

3. **Settings consolidation:** (Backlogged but related) Should DAEP settings merge into main admin panel? Affects where role switcher appears.

4. **Demo data seed:** What should be in the demo seed data? How many records, which campuses, etc.?

5. **"Back to" navigation:** When on admin panel, should "Back to Dashboard" be context-aware (back to DAEP if came from DAEP)?

6. **Tenant name in header:** Good idea? Always show, or only for super_admin viewing multiple tenants?

---

## Implementation Order

**Phase 1: Fix Demo Bug (Blocker)**
1. Update admin/layout.tsx to read demo_role when on demo subdomain
2. Update DAEP settings layout same way
3. Test: switch to District Admin, navigate to admin panel, should stay District Admin

**Phase 2: Unify Context**
4. Rename DemoRoleContext → ImpersonationContext
5. Add production impersonation logic (sessionStorage)
6. Add effectiveRole computed value
7. Update all layouts to use unified context

**Phase 3: Expand Role Options**
8. Add DAEP roles to demo role switcher
9. Module-aware role filtering

**Phase 4: UI Polish**
10. Add tenant name to admin panel header
11. Add demo banner to admin panel when on demo subdomain
12. Delete old DevRoleSwitcher files

---

## Blockers for Epic 2

This work should be completed before continuing Epic 2 because:
- Role-based UI testing is needed for DAEP development
- Demo mode needs to work for DAEP module demonstrations
- Settings pages need consistent behavior

---

## Related Backlog Items

- Admin Panel & Settings Consolidation (HIGH)
- Profile Dropdown Consistency (MEDIUM)
- Testing Report Accuracy & Audit Log Completeness (HIGH)

---

## Appendix: Current Demo UI Screenshots

(Reference screenshots shared in conversation)

1. Trespass dashboard with "Campus Admin" badge
2. Trespass dashboard with "District Admin" badge
3. Role switcher dropdown in header
4. Yellow demo reset banner
