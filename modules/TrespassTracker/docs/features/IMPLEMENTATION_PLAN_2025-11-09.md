# Implementation Plan - Pre-Demo Upgrades
**Date**: 2025-11-09
**Branch**: staging
**Status**: Ready to implement

---

## 🎯 **OBJECTIVE**
Prepare TrespassTracker for demo environment and pilot tenant onboarding with secure multi-tenant architecture.

---

## ✅ **CONFIRMED WORKING (NO CHANGES NEEDED)**

### **Onboarding Workflow**
Current Clerk → Supabase integration is **perfect**:
1. Invite user via Clerk (set `tenant_id`, `role`, `campus_id` in metadata)
2. Webhook validates and creates `user_profiles` record
3. RLS uses `get_my_clerk_id()` to extract JWT `sub` claim
4. RLS reads `tenant_id` from `user_profiles` table
5. All queries auto-filtered by `WHERE tenant_id = get_my_tenant_id()`

**Security**: ✅ JWT only used for user ID, tenant from database (secure)

---

## 📋 **IMPLEMENTATION PHASES**

### **Phase 1: Secure Tenant Switching** ✅ COMPLETED (2025-11-09)
**Priority**: CRITICAL - Must complete first
**Commit**: d0ce87b - feat: implement secure database-backed tenant switching

#### **1.1 Database Migration**
```sql
-- Add active_tenant_id column
ALTER TABLE user_profiles
ADD COLUMN active_tenant_id TEXT REFERENCES tenants(id);

-- Default to assigned tenant
UPDATE user_profiles
SET active_tenant_id = tenant_id;

-- Add index
CREATE INDEX idx_user_profiles_active_tenant
ON user_profiles(active_tenant_id);
```

#### **1.2 Update RLS Function**
```sql
-- Modify get_my_tenant_id() to check active_tenant_id
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    active_tenant_id,  -- Use active if set (master admin)
    tenant_id          -- Fallback to assigned tenant
  )
  FROM user_profiles
  WHERE id = get_my_clerk_id();
$$ LANGUAGE SQL SECURITY DEFINER;
```

#### **1.3 Server Action**
File: `app/actions/admin/switch-tenant.ts`
- `switchActiveTenant(tenantId: string)`
- Validates master_admin only
- Updates `user_profiles.active_tenant_id`
- Logs to audit_log (FERPA compliance)

#### **1.4 Update Context**
File: `contexts/AdminTenantContext.tsx`
- Replace localStorage with server action call
- Remove client-side persistence
- Database is source of truth

---

### **Phase 2: Tenants Management Page** ✅ COMPLETED (2025-11-09) 🏢
**Commit**: 38c935f - feat: implement comprehensive tenants management system (Phase 2)

#### **2.1 Server Actions**
File: `app/actions/admin/tenants.ts`
- `createTenant(data)` - Create new tenant
- `updateTenant(id, data)` - Edit tenant
- `deactivateTenant(id)` - Soft delete
- `getTenantBySubdomain(subdomain)` - Lookup helper

#### **2.2 UI Page**
File: `app/admin/tenants/page.tsx`
- Table: Display name, subdomain, status, created date
- Create dialog: name, display_name, subdomain, is_active
- Edit dialog
- Delete confirmation
- Master admin only

#### **2.3 Navigation**
- Add "Tenants" to admin sidebar
- Icon: Building
- Position: After Campuses
- Visible: master_admin only

---

### **Phase 3: Demo Environment** ✅ COMPLETED (2025-11-09) 🎮
**Commit**: TBD - will be added after commit

#### **3.1 Demo RLS Policies**
```sql
-- All authenticated users (except district_admin) can access demo
CREATE POLICY "Demo tenant public access"
ON trespass_records FOR SELECT
USING (
  tenant_id = 'demo'
  AND auth.uid() IS NOT NULL
  AND (SELECT role FROM user_profiles WHERE id = auth.uid()) NOT IN ('district_admin')
);

-- Similar policies for INSERT, UPDATE
```

Apply to:
- trespass_records
- campuses
- record_photos
- record_documents

#### **3.2 Demo Role Switcher**
File: `contexts/DemoRoleContext.tsx`
- Detects `demo.districttracker.com`
- Provides role override (viewer, campus_admin, district_admin)
- Full CRUD permissions
- Client-side only (demo data is public anyway)

File: `components/DemoBanner.tsx`
- Shows at top of demo pages
- Role dropdown
- "Data resets daily" notice
- Link to demo guide

#### **3.3 Demo How-To Page**
File: `app/(demo)/demo-guide/page.tsx`
- Video tutorials for each role
- Only accessible on demo subdomain
- Quick 2-3 minute guides

#### **3.4 Enhanced Demo Reset Cron**
File: `app/api/cron/reset-demo/route.ts`

**DELETE:**
- Demo trespass_records
- Demo campuses

**PRESERVE:**
- user_profiles (so users can log back in)
- feedback_submissions (global, not tenant-specific)

**RECREATE:**
- Fresh seed campuses
- Fresh seed records

---

### **Phase 4: Feedback UX** ✅ COMPLETED (2025-11-09) 💬

#### **4.1 Toast Library** ✅
```bash
npm install sonner
```
- Installed sonner v1.7.1
- Added Toaster component to `app/layout.tsx`

#### **4.2 Upvote Toast** ✅
File: `components/feedback/UpvoteButton.tsx`
```tsx
if (!user) {
  toast('We value your input! 💙', {
    description: 'Please sign in to vote on features.',
    action: {
      label: 'Sign In',
      onClick: () => router.push('/login?redirect=/feedback'),
    },
    duration: 5000,
  });
  return;
}
```

#### **4.3 Clean Comment Section** ✅
File: `components/feedback/CommentsSection.tsx`

**Implemented:**
- Clean FeedBear-inspired design with rounded containers
- Disabled textarea for non-authenticated users with sign-in prompt
- Improved visual hierarchy with gradient avatars
- Better typography and spacing
- Enhanced empty state with centered icon
- Removed unused imports (Label, Paperclip)

---

### **Phase 5: Admin Panel Polish** ✅ COMPLETED (2025-11-09) ✨

#### **5.1 Logo Update** ✅
File: `app/admin/layout.tsx`
- Replaced Shield icon with `/assets/logo1.svg`
- Text: "District Tracker"
- Subtitle: "Master Admin Panel" for master_admin, "Admin Panel" for district_admin

#### **5.2 District Admin Access** ✅
Allowed `district_admin` into admin panel:
- No tenant dropdown (locked to their tenant)
- Feedback and Tenants nav items hidden (master_admin only)
- Show: Overview, Users, Campuses, Audit Logs, Reports
- Cannot access demo tenant (RLS enforced)

#### **5.3 Role-Based Navigation** ✅
```tsx
// Already implemented in Phase 2
const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/campuses', label: 'Campuses', icon: Building2 },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: History },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquare, masterAdminOnly: true },
  { href: '/admin/tenants', label: 'Tenants', icon: Building, masterAdminOnly: true },
];

// Filtering applied:
{navItems
  .filter((item) => !item.masterAdminOnly || userRole === 'master_admin')
  .map((item) => { /* render */ })}
```

---

## 🚀 **PILOT TENANT ONBOARDING WORKFLOW**

### **Complete Process:**

1. **Create Tenant** (In-App)
   - Admin Panel → Tenants → Create Tenant
   - Fields: name, display_name, subdomain
   - Example: "Greenville ISD", subdomain: "greenville"

2. **Configure DNS** (Manual - Cloudflare)
   - Add CNAME: greenville → cname.vercel-dns.com
   - Proxy enabled (orange cloud)

3. **Configure Vercel** (Manual or CLI)
   - Add domain: `greenville.districttracker.com`
   - Auto-configured by Vercel

4. **Switch to Tenant** (In-App)
   - Admin Panel → Tenant dropdown → Select "Greenville"
   - Updates `active_tenant_id` in database
   - All operations now target Greenville

5. **Bulk Upload Campuses** (In-App)
   - Admin Panel → Campuses → Import CSV
   - Auto-assigned to active tenant

6. **Bulk Upload Records** (In-App)
   - Dashboard → Records → Import CSV
   - Auto-assigned to active tenant

7. **Invite District Admin** (In-App)
   - Admin Panel → Users → Invite User
   - Email, role: district_admin, tenant auto-selected

8. **Test Subdomain**
   - Visit: `greenville.districttracker.com`
   - Verify tenant isolation

**Time per tenant**: ~15 minutes

---

## 🔒 **SECURITY DECISIONS**

### **✅ APPROVED:**
- Option A: Database-backed tenant switching (secure, auditable)
- Keep feedback global (no tenant isolation)
- Admin panel-only tenant switching (no subdomain override)
- Persist active_tenant_id across sessions

### **❌ REJECTED:**
- Option B: Pass tenant to server actions (less secure)
- Subdomain-based tenant override (audit trail gaps, complexity)

---

## 📊 **USER PROFILES SCHEMA**

Current columns (confirmed via Supabase):
- `id` (text, PK)
- `email` (text)
- `display_name` (text) - User's chosen display name
- `first_name` (text)
- `last_name` (text)
- `role` (text) - viewer, campus_admin, district_admin, master_admin
- `tenant_id` (text, FK) - Assigned tenant
- `campus_id` (text, FK, nullable)
- `theme` (text) - light/dark/system
- `notifications_enabled` (boolean)
- `status` (text) - active/inactive
- `user_type` (text) - tenant_user
- `display_organization` (text)
- `show_organization` (boolean)
- `created_at`, `updated_at`, `deleted_at`

**TO ADD:**
- `active_tenant_id` (text, FK) - For master admin tenant switching

---

## 📝 **FILES TO CREATE**

1. Migration: `supabase/migrations/YYYYMMDD_add_active_tenant_id.sql`
2. Server action: `app/actions/admin/switch-tenant.ts`
3. Server actions: `app/actions/admin/tenants.ts`
4. Admin page: `app/admin/tenants/page.tsx`
5. Context: `contexts/DemoRoleContext.tsx`
6. Component: `components/DemoBanner.tsx`
7. Page: `app/(demo)/demo-guide/page.tsx`

---

## 📝 **FILES TO MODIFY**

1. `contexts/AdminTenantContext.tsx` - Use server action
2. `components/feedback/UpvoteButton.tsx` - Add toast
3. `components/feedback/CommentsSection.tsx` - Clean design
4. `app/admin/layout.tsx` - Logo, district_admin access, nav
5. `app/api/cron/reset-demo/route.ts` - Enhanced reset
6. `TODO.md` - Add Resend integration task

---

## ⏱️ **ESTIMATED TIME**

- Phase 1: 30-45 min
- Phase 2: 45-60 min
- Phase 3: 60-90 min
- Phase 4: 20-30 min
- Phase 5: 30-45 min

**Total: 3-4 hours**

---

## 🎯 **NEXT STEPS**

1. Begin Phase 1: Secure tenant switching
2. Test thoroughly before proceeding
3. Continue through phases sequentially
4. Deploy to staging for testing
5. Merge to main after verification

---

**Ready to implement!** 🚀
