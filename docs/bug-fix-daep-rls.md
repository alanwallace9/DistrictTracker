# Bug: DAEP Tables RLS Policy Failure

**Status:** RESOLVED
**Date:** 2025-11-25
**Affected:** All DAEP configuration tables
**Environment:** staging.districttracker.com (maps to `demo` tenant)

## Symptom

Clicking "Load Defaults" on `/daep/settings/behaviors` shows:
> "An error occurred in the Server Components render. The specific message is omitted in production builds..."

Postgres logs show:
```
ERROR: new row violates row-level security policy for table "daep_behavior_categories"
```

## Root Cause Analysis

### Architecture Background

- **Multi-tenancy:** Subdomain-based (`staging.districttracker.com` → `demo` tenant via `subdomain-client.ts:33-34`)
- **Working tables:** `trespass_records` uses `get_my_tenant_id()` and `get_my_role_from_db()` functions
- **Broken tables:** DAEP tables originally used `get_current_tenant_id()` which reads from session variable `app.current_tenant` that is **never set**

### Key Functions (from database)

```sql
-- WORKING: Used by trespass_records
get_my_tenant_id() -- Looks up user_profiles.tenant_id via get_my_clerk_id()
get_my_role_from_db() -- Looks up user_profiles.role via auth.jwt() ->> 'sub'
get_effective_role() -- Handles demo tenant role simulation

-- BROKEN: Used by original DAEP migration
get_current_tenant_id() -- Reads session var 'app.current_tenant' - ALWAYS NULL
```

### trespass_records RLS (Working Pattern)

```sql
-- Has special demo tenant handling:
"Demo tenant allows role simulation" FOR ALL
USING (
  CASE WHEN tenant_id = 'demo' THEN
    CASE get_effective_role()
      WHEN 'viewer' THEN true
      WHEN 'campus_admin' THEN true
      WHEN 'district_admin' THEN true
      ELSE false
    END
  ELSE false END
)
```

## Attempted Fixes

### Attempt 1: Permissive Policies (WRONG - Security Risk)
**Date:** 2025-11-25
**What:** Created `FOR ALL USING (true)` policies
**Result:** Would have worked but violates multi-tenant security requirements
**Reverted:** Yes

### Attempt 2: Column Name Mismatch Fix
**Date:** 2025-11-25
**What:** Migration to rename columns in `daep_behavior_categories`:
- `category_name` → `name`
- `sort_order` → `display_order`
- `active` → `is_active`
- Added `description` and `updated_at` columns

**Result:** Schema aligned, but RLS still failing

### Attempt 3: Proper RLS Policies Using get_my_tenant_id()
**Date:** 2025-11-25
**What:** Dropped all DAEP policies, created new ones matching trespass_records pattern:

```sql
-- SELECT
CREATE POLICY "Users can view behavior categories from their tenant"
ON daep_behavior_categories FOR SELECT
USING (tenant_id = get_my_tenant_id() OR tenant_id IS NULL);

-- INSERT
CREATE POLICY "DAEP admins can create behavior categories"
ON daep_behavior_categories FOR INSERT
WITH CHECK (
  get_my_role_from_db() IN ('daep_admin_l1', 'district_admin', 'master_admin')
  AND (tenant_id = get_my_tenant_id() OR tenant_id IS NULL)
);

-- Demo tenant simulation
CREATE POLICY "Demo tenant allows DAEP role simulation - behavior_categories"
ON daep_behavior_categories FOR ALL
USING (
  CASE WHEN tenant_id = 'demo' THEN
    CASE get_effective_role()
      WHEN 'viewer' THEN true
      WHEN 'campus_admin' THEN true
      WHEN 'district_admin' THEN true
      WHEN 'daep_admin_l1' THEN true
      ELSE false
    END
  ELSE false END
)
WITH CHECK (...)
```

**Result:** Still failing with RLS violation

## Tables Updated with New Policies

1. `daep_behavior_categories`
2. `daep_discipline_codes`
3. `daep_rooms`
4. `daep_room_staff`
5. `daep_bell_schedules`
6. `daep_school_calendar`

## Outstanding Questions

1. **What does `get_my_tenant_id()` return for the current user?**
   - Need to verify it returns `'demo'` for staging subdomain users

2. **What does `get_my_role_from_db()` return?**
   - Need to verify it returns `'master_admin'` for the test user

3. **Is `get_my_clerk_id()` returning the correct Clerk user ID?**
   - This function extracts from `auth.jwt() ->> 'sub'`

4. **Is the Supabase client sending a valid JWT?**
   - `lib/supabase/server.ts` uses `getToken()` from Clerk

## Next Steps to Investigate

1. Query to check what RLS helper functions return:
```sql
SELECT
  get_my_clerk_id() as clerk_id,
  get_my_tenant_id() as tenant_id,
  get_my_role_from_db() as role,
  get_effective_role() as effective_role;
```

2. Check if user exists in `user_profiles` table with correct tenant_id

3. Verify Clerk JWT contains the `sub` claim that `get_my_clerk_id()` expects

## Related Files

- `lib/supabase/server.ts` - Server-side Supabase client
- `lib/subdomain-client.ts:33-34` - staging → demo mapping
- `app/actions/daep/behavior-categories.ts` - Server actions
- `supabase/migrations/20251124221840_create_daep_schema.sql` - Original (broken) RLS

## Resolution (Attempt 4)

**Date:** 2025-11-25
**Root Cause Found:** Tenant ID mismatch between server actions and RLS policies

### The Real Issue

Through database investigation, we discovered:

1. **User profile has `active_tenant_id: 'demo'`** (for tenant switching/testing)
2. **`get_my_tenant_id()` returns `COALESCE(active_tenant_id, tenant_id)`** = `'demo'`
3. **Server actions read from `user.publicMetadata?.tenant_id`** from Clerk = `'birdville'`

When inserting:
- Server action used `tenant_id = 'birdville'` (from Clerk metadata)
- RLS checked `tenant_id = get_my_tenant_id()` = `'demo'`
- `'birdville' != 'demo'` = **RLS VIOLATION**

### The Fix

Updated all DAEP server action files to get tenant_id from the database (matching RLS logic) instead of Clerk metadata:

```typescript
// OLD (broken) - reads from Clerk metadata
const tenantId = user.publicMetadata?.tenant_id as string;

// NEW (fixed) - reads from database like RLS does
const supabase = await createServerClient();
const { data: profile } = await supabase
  .from('user_profiles')
  .select('tenant_id, active_tenant_id')
  .eq('id', user.id)
  .single();
const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
```

### Files Modified

1. `app/actions/daep/behavior-categories.ts`
2. `app/actions/daep/discipline-codes.ts`
3. `app/actions/daep/rooms.ts`
4. `app/actions/daep/schedules.ts`
5. `app/actions/daep/school-calendar.ts`
6. `app/actions/daep/settings.ts`

### Key Insight

The `active_tenant_id` column in `user_profiles` allows master admins to switch tenants for testing. The RLS function `get_my_tenant_id()` already respects this via `COALESCE(active_tenant_id, tenant_id)`. The server actions were bypassing this by reading directly from Clerk metadata which doesn't update when switching tenants.

## Future Task

- [ ] Create dedicated `staging` tenant instead of sharing `demo` tenant data
