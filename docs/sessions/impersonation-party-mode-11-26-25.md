# Impersonation & Demo Mode - Party Mode Session
**Date:** 2025-11-26
**Status:** In Progress - Session 1 (context limit reached, continue in Session 2)

---

## Session Participants
- 🧙 BMad Master
- 📊 Mary (Business Analyst)
- 🏗️ Winston (Architect)
- 💻 Amelia (Developer)
- 📋 John (Product Manager)
- 🏃 Bob (Scrum Master)
- 🧪 Murat (Test Architect)
- 📚 Paige (Technical Writer)
- 🎨 Sally (UX Designer)
- **Alan** (Product Owner)

---

## Problem Statement

Users on the demo subdomain can switch roles (e.g., to District Admin), but when they navigate to the admin panel, they get redirected back to the dashboard. The demo role doesn't persist across navigation.

---

## Key Decisions Made

### 1. Two Distinct Impersonation Modes

| Aspect | Demo Subdomain | Production Subdomain |
|--------|----------------|---------------------|
| **Who can impersonate** | Any user | Only super_admin |
| **Storage** | `user_profiles.demo_role` (DB) | `sessionStorage` (browser) |
| **Purpose** | Let prospects try the product | Let admin test UI appearance |
| **Resets** | Daily cron job | On tab close |

### 2. Module-Specific Roles

**Confirmed: YES** - Show only relevant roles per module.

| Module | Available Roles in Switcher |
|--------|---------------------------|
| Trespass Tracker | Viewer, Campus Admin, District Admin |
| DAEP Management | Student, Parent, Counselor, DAEP Staff, DAEP Admin L1, DAEP Admin L2, Campus Admin, District Admin |
| Admin Panel | DAEP Admin L1, DAEP Admin L2, District Admin (+ super_admin for Alan's reset button only) |

### 3. Role Persistence Across Modules

**Confirmed: YES** - Role persists when navigating between modules.

If user's current role doesn't have access to the target module/component:
- Show friendly "no access" message
- Provide quick-switch role buttons
- Provide "Return to [module]" button

### 4. Demo District Admin Permissions

**Confirmed: Full CRUD** on demo data:
- View everything a real district_admin sees
- Create/edit users, records, settings
- Delete with confirmation dialog
- All resets daily anyway

### 5. Demo Banner

**Confirmed: Show on ALL demo subdomain pages** including:
- Trespass dashboard
- DAEP dashboard/pages
- Admin panel
- Settings pages

### 6. Back/Return Navigation

**For Demo subdomain:** Show ALL modules (with no-access UX if role doesn't have permission)
**For Production:** Show only modules user has access to (Option A)

Implementation: Dropdown "Return to [module]" instead of multiple back buttons.

### 7. Mobile Responsive

**Critical requirement** - Most users will be on phones/tablets in hallways.

---

## NEEDS CLARIFICATION - Production Impersonation Scope

**Alan's intent (as stated):**
> "I just want to be able to view the UI. I just want to be able to see what they can see but not actually do what they can do."

**The confusion:**
- If server actions check `actualRole` (super_admin) → Alan CAN edit anything
- If server actions check `effectiveRole` (impersonated viewer) → Alan CANNOT edit

**Alan's clarification:**
- He does NOT want to be able to edit while impersonating
- He wants to SEE the UI as that role sees it
- He wants to be PROTECTED from accidentally making changes

**Possible interpretation:**
Production impersonation = Server actions RESPECT impersonated role (same as demo), which means:
- Impersonate as Viewer → Cannot edit (protected from accidents)
- Impersonate as Campus Admin → Can only do campus admin things

**HOWEVER** - Alan also flagged FERPA concern:
> "If I'm actually able to go in as super admin on a different tenant, a different district's website, and edit their records without them needing me to or from a support standpoint, that breaks all kinds of FERPA regulations"

This is about cross-tenant access, which is a SEPARATE concern from impersonation.

**ACTION FOR SESSION 2:** Clarify exactly what production impersonation should do:
- A) UI-only (server ignores, you can still do super_admin things)
- B) Full (server respects impersonated role, you're restricted)
- C) Something else?

---

## UX Proposals Approved

### Friendly "No Access" Page (Sally + Paige)

```
┌─────────────────────────────────────────────────────────────┐
│ [Demo header with role badge stays visible]                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     🔒 Viewing as Security Guard                           │
│                                                             │
│     This role is designed for Trespass Tracker access.     │
│     DAEP Management requires a different role.             │
│                                                             │
│     Switch to explore DAEP, or return to Trespass          │
│     where this role has full access.                        │
│                                                             │
│     [DAEP Staff]  [Campus Admin]  [District Admin]         │
│                                                             │
│     ─── or ───                                             │
│                                                             │
│     [← Return to Trespass Dashboard]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Alan feedback:** Love the button idea. Also applies to wrong component within a module, not just wrong module.

---

## Revised Deliverables (Bob)

### Phase 1 - Bug Fix (Blocker for Epic 2)
1. Admin panel reads `effectiveRole` from context (respects demo_role)
2. DAEP settings reads `effectiveRole` from context
3. ⚠️ **NEEDS CLARIFICATION:** Server actions - what do they check?

### Phase 2 - Unified Context
4. Rename DemoRoleContext → ImpersonationContext
5. Add `viewingAsRole` (sessionStorage) for production impersonation
6. Add `effectiveRole` computed property
7. Super_admin only can impersonate on production

### Phase 3 - Module-Specific Roles
8. Trespass roles: Viewer, Campus Admin, District Admin
9. DAEP roles: Student, Parent, Counselor, DAEP Staff, DAEP Admin L1/L2, Campus Admin, District Admin
10. Admin panel roles: DAEP Admin L1/L2, District Admin (super_admin exists but not in switcher for others)

**Alan clarification on admin panel roles:**
- Unsure why Campus Admin is listed (needs review)
- DAEP Admin L1 and L2 should be there
- District Admin yes
- Super_admin exists for Alan's demo reset, but others can't switch to it

### Phase 4 - UX Polish
11. Friendly "no access" page with role switch buttons ✓ APPROVED
12. "Return to [module]" dropdown instead of multiple back buttons
13. Mobile responsive - tablet/phone testing
14. Demo banner on ALL demo pages including admin panel

### Phase 5 - Cleanup
15. Delete DevRoleSwitcher
16. Delete dev-role-switch.ts

---

## Backlog Items Identified

### High Priority
- Admin Panel & Settings Consolidation (already added)
- Testing Report Accuracy & Audit Log Completeness

### Medium Priority
- Profile Dropdown Consistency
- Demo Guide as PDF (Paige to help)

### Low Priority
- User Impersonation for Support ("Act as User") - separate feature, FERPA considerations
- Changelog customer-facing version (Paige to help)

---

## Technical Architecture (Winston)

### Unified Impersonation Model
```
effectiveRole = demoRole || viewingAsRole || actualRole

Demo subdomain:     demoRole (from DB, tenant_id = 'demo')
Production:         viewingAsRole (from sessionStorage)
Neither active:     actualRole (from DB)
```

### Tenant Scoping for Security
- Demo mode: `active_tenant_id = 'demo'` - can only touch demo data
- Production: User stays on their assigned tenant

### Demo Data
- Historical figures (Archimedes, Louis Armstrong, etc.) - no FERPA issues
- Demo reset button for super_admin (manual reset without waiting for cron)
- Seed data stored in Supabase for reset source

---

## Test Cases (Murat)

### Critical Security Tests
1. Demo subdomain + demo_role=district_admin → Server respects district_admin on demo tenant only
2. Production impersonation → TBD based on clarification
3. User cannot switch to super_admin in demo (except Alan)
4. Demo role only affects demo tenant data, not real tenants

---

## Open Questions for Session 2

1. **Production impersonation scope:** UI-only or full server enforcement?
2. **Campus Admin in admin panel:** Should it be there?
3. **Cross-tenant access for super_admin:** Current state and restrictions needed?
4. **effectiveRole in server actions:** Which actions, which modes?

---

## Alan's Key Quotes

On demo purpose:
> "My goal is really for the DAP module is I know nine other DAP admins in the North Texas area. To just send them a link and go ahead and do me a favor and test this out and give them feedback."

On role persistence:
> "I would like the roles to persist. If they're a security guard on the trespass and somehow end up just typing in a URL... they shouldn't see it."

On production impersonation:
> "I just want to be able to view the UI. I just want to be able to see what they can see but not actually do what they can do."

On FERPA concern:
> "If I'm actually able to go in as super admin on a different tenant, a different district's website, and edit their records without them needing me to or from a support standpoint, that breaks all kinds of FERPA regulations"

On UX feedback:
> "I love the button idea; it's awesome for the roll switch."

---

## Files Created/Updated This Session

- `docs/sprint-artifacts/plan-demo-and-impersonation-comprehensive.md` - Full technical plan
- `docs/sprint-artifacts/future-backlog.md` - Added Admin Panel Consolidation, Profile Dropdown
- `docs/feature-requests.md` - Created for customer-facing ideas
- `docs/sessions/impersonation-party-mode-11-26-25.md` - This file

---

## Session 2 Updates (2025-11-27)

### Production Impersonation - CLARIFIED

**Final Decision:** View-only mode with click-intercept

| Aspect | Behavior |
|--------|----------|
| Buttons | Visible, ENABLED (not greyed) - see exactly what role sees |
| On click | Tooltip intercepts: "View-only mode - action disabled" |
| Server action | Never invoked (client-side intercept) |
| Exception | Home tenant (Birdville) = full rights |
| Until | Ghost Mode feature is built |

**Key Insight from Alan:**
> "If role = viewer, they would not see the edit button. Users should not see what they don't have access to."

The view-only intercept only applies to actions the impersonated role WOULD have. Role permissions still govern visibility.

### Test Cases - CORRECTED

```
TC-IMP-01: Production + impersonating + non-home tenant + click edit → Tooltip blocks
TC-IMP-02: Production + impersonating + HOME tenant + click edit → Action proceeds
TC-IMP-03: Staging/Dev + impersonating → Full action (no blocking)
TC-IMP-04: Impersonate Viewer → Edit button NOT visible (role lacks permission)
TC-IMP-05: Impersonate Campus Admin → Edit button visible (role has permission)
TC-IMP-06: Campus Admin + non-home tenant + click edit → Tooltip intercepts
TC-IMP-07: Server action NEVER called during view-only intercept
```

### Backlog Items Added (Session 2)

- Ghost Mode - Support Impersonation (with audit trail)
- Year Picker / School Year Selector (Focus SIS pattern)
- Module-Specific RLS Mapping
- Campus Admin in Admin Panel - Review Needed
- Outlook-Style Granular Permissions (future)
- Demo Guide PDF (missed from Session 1)

### Phase Breakdown - APPROVED

#### Phase 1: Bug Fix (BLOCKER for Epic 2)
- Admin panel reads `effectiveRole` from context
- DAEP settings reads `effectiveRole` from context
- All protected routes respect `effectiveRole`

#### Phase 2: Unified Impersonation Context
- Rename `DemoRoleContext` → `ImpersonationContext`
- Add `viewingAsRole` (sessionStorage) for production
- Add computed `effectiveRole`, `isImpersonating`, `homeTenantId`
- Super_admin gate for production impersonation

#### Phase 3: View-Only Mode (Production)
- Create `ImpersonationGuard` wrapper component
- Wrap all mutation buttons/actions with guard
- Tooltip intercept on click (not greyed out)
- Home tenant exception (Birdville = full rights)
- View-only banner component

#### Phase 4: Module-Specific Role Switcher
- Trespass roles: Viewer, Campus Admin, District Admin
- DAEP roles: Student, Parent, Counselor, DAEP Staff, DAEP Admin L1/L2, Campus Admin, District Admin
- Admin Panel roles: DAEP Admin L1/L2, District Admin
- Hide super_admin from switcher (except for Alan)

#### Phase 5: No-Access UX
- "No Access" page with role explanation
- Quick-switch role buttons
- "Return to [module]" navigation
- Demo banner on ALL demo pages

#### Phase 6: Cleanup
- Delete `DevRoleSwitcher` component
- Delete `dev-role-switch.ts` action

#### Phase 7: Mobile Responsive
- Test all impersonation UI on mobile
- Role switcher works on touch
- Responsive no-access page and banner

### Sequencing
```
Phase 1 → Phase 2 → Phase 3 → Phase 4+5 (parallel) → Phase 6+7 (parallel)
```

---

## Blocker Status - RESOLVED

**Phase 1 is the ONLY blocker for Epic 2.**

| Phase | Status | Relation to Epic 2 |
|-------|--------|-------------------|
| Phase 1 | BLOCKER | Must complete first |
| Phases 2-7 | Parallel/Backlog | Can run alongside or after Epic 2 |

---

## Session Status

**Session 2 COMPLETE** - All decisions finalized.

### Summary of Outcomes
1. Production impersonation = view-only with click-intercept (not greyed buttons)
2. Home tenant (Birdville) exception = full rights
3. Phase breakdown approved (7 phases)
4. Phase 1 = only blocker for Epic 2
5. 6 items added to backlog
6. Test cases corrected (role permissions govern visibility)
