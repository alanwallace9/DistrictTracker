# Current State Analysis - Multi-Tenant & Demo Access

**Date**: 2025-11-16
**Status**: Mixed state after attempted subdomain-based tenant isolation

---

## 🔍 CURRENT DATABASE STATE

### RLS Policies (✅ RESTORED - Secure)

All original RLS policies are back in place:

```sql
-- SELECT: Users can view their tenant + demo
WHERE (tenant_id = get_my_tenant_id()) OR (tenant_id = 'demo') OR (tenant_id IS NULL)

-- INSERT: Admins can create for their tenant + demo
WITH CHECK (
  (role = admin AND tenant_id = get_my_tenant_id())
  OR tenant_id = 'demo'
  OR tenant_id IS NULL
)

-- UPDATE: Admins can update their tenant + demo
WHERE (role = admin AND tenant_id = get_my_tenant_id()) OR tenant_id = 'demo'

-- DELETE: District/Master admins can delete from their tenant + demo
WHERE (role = district_admin/master_admin AND tenant_id = get_my_tenant_id()) OR tenant_id = 'demo'
```

### Key Database Functions

#### `get_my_tenant_id()` - Critical Function
```sql
SELECT COALESCE(
  active_tenant_id,  -- Use active tenant if set (for tenant switching)
  tenant_id          -- Fallback to assigned tenant
)
FROM user_profiles
WHERE id = get_my_clerk_id();
```

**This function ALREADY supports virtual tenant switching!**

#### `get_my_clerk_id()`
```sql
SELECT COALESCE(auth.jwt() ->> 'sub', '');
```

Gets Clerk user ID from JWT token.

---

## 📊 USER PROFILES STRUCTURE

Each user has:
- `tenant_id` (nullable) - **Assigned tenant** (e.g., 'birdville')
- `active_tenant_id` (nullable) - **Active tenant override** (for switching)
- `role` - User's permission level
- `campus_id` (nullable) - Campus assignment

**Example User States:**

| Scenario | tenant_id | active_tenant_id | RLS Returns |
|----------|-----------|------------------|-------------|
| Birdville user, normal use | 'birdville' | null | 'birdville' |
| Birdville user, switched to demo | 'birdville' | 'demo' | 'demo' |
| Master admin, switched tenant | 'birdville' | 'somedistrict' | 'somedistrict' |

---

## 🎭 DEMO ROLE CONTEXT (Client-Side Only)

**File**: `contexts/DemoRoleContext.tsx`

**What it does:**
- Detects if hostname is 'demo.districttracker.com' or 'localhost'
- Sets `isDemoMode = true` (client-side state only)
- Stores a role preference in `sessionStorage`
- Used for UI elements (showing/hiding buttons based on simulated role)

**What it DOES NOT do:**
- ❌ Does NOT affect RLS policies
- ❌ Does NOT change database queries
- ❌ Does NOT provide actual security
- ✅ Only controls UI visibility for testing

**This is a CLIENT-SIDE SIMULATION for testing UX, not actual role enforcement.**

---

## 🔨 APPLICATION-LAYER CHANGES (My Recent Changes)

### Changed Files:

1. **app/trespass/page.tsx** - Added subdomain-based filtering
```typescript
const activeTenantId = await getActiveTenantId(); // Gets tenant from subdomain
const { data: records } = await supabase
  .from('trespass_records')
  .select('*')
  .eq('tenant_id', activeTenantId)  // ← APPLICATION-LAYER FILTER
```

2. **middleware.ts** - Added subdomain validation
- Extracts subdomain from URL
- Validates tenant exists
- Sets `x-tenant-id` header

3. **lib/subdomain.ts** - NEW utility file
- `getSubdomainFromHostname()` - Extracts subdomain
- `getActiveTenantId()` - Gets tenant from subdomain

4. **contexts/SubdomainTenantContext.tsx** - NEW React context
- Client-side tenant awareness based on subdomain

### Other Files (NOT querying records directly):

**Server Actions** (app/actions/records.ts):
- `createRecord()` - Relies on RLS (no app-layer filter)
- `updateRecord()` - Relies on RLS (no app-layer filter)
- `deleteRecord()` - Relies on RLS (no app-layer filter)

These rely ENTIRELY on RLS policies for security.

---

## ⚠️ THE PROBLEM (Why You Saw Merged Records)

### Original Issue on staging.districttracker.com:

**User Profile:**
- `tenant_id = 'birdville'`
- `active_tenant_id = null`

**RLS Policy Returns:**
```sql
WHERE (tenant_id = 'birdville') OR (tenant_id = 'demo')
```

**Result:** User sees Birdville records + Demo records = MERGED DATA

### Why This Happens:

The RLS policy has `OR (tenant_id = 'demo')` which means:
> "Everyone can see demo records in addition to their own tenant"

This was probably added so DemoRoleContext users could test with demo data, but it causes data to merge when NOT using application-layer filtering.

---

## 🏗️ YOUR INFRASTRUCTURE (Already Built)

You have:
- ✅ DNS configured (staging.districttracker.com, demo.districttracker.com)
- ✅ Vercel domains configured
- ✅ Clerk authentication set up
- ✅ `active_tenant_id` field in user_profiles
- ✅ `get_my_tenant_id()` supports tenant switching
- ✅ RLS policies secure and working
- ✅ DemoRoleContext for UI role simulation

---

## 🎯 YOUR GOAL (As I Understand It)

You want:

1. **Production users** (Birdville):
   - Visit `birdville.districttracker.com` → See ONLY Birdville data
   - Normal work, no demo data mixed in

2. **Demo sandbox**:
   - ANY authenticated user can visit `demo.districttracker.com`
   - See ONLY demo records (no Birdville data)
   - Use DemoRoleContext to switch roles (viewer/campus_admin/district_admin)
   - Test features without affecting production

3. **Localhost testing**:
   - `localhost:3000` or `localhost:3002` → Works for testing
   - Preferably defaults to demo mode for easy testing

---

## 🔧 PORT 3002 ISSUE (Fixed)

**Problem**: Process was running on port 3002 (PID 51824)

**Solution**: I killed the process. You can now restart:
```bash
PORT=3002 npm run dev
```

---

## 🚨 SECURITY CONCERNS

### Current Mixed State:

| Layer | Status | Security Level |
|-------|--------|---------------|
| RLS Policies | ✅ Restored | Secure - enforces tenant isolation |
| app/trespass/page.tsx | ⚠️ Has app-layer filter | Filters by subdomain |
| Server Actions | ❌ No app-layer filter | Relies on RLS only |
| Middleware | ⚠️ Validates subdomain | Checks tenant exists |

### The Issue:

**Inconsistent filtering:**
- Page queries filter by subdomain
- Server actions (create/update/delete) don't filter
- This creates a mismatch in behavior

---

## 📋 NEXT STEPS - OPTIONS

I'll present these options in the next message after you've reviewed this analysis.

**Key Questions:**
1. Should we use subdomain-based routing OR virtual tenant switching?
2. Should demo records be visible to production users (current RLS)?
3. How should localhost behave (demo default or assigned tenant)?

---

**End of Analysis**
