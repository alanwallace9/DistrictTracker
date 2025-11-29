# Bug: Failed to Create Student Record (DM-00101)

**Status:** FIXED (pending verification)
**Identified:** 2025-11-29
**Error Code:** DM-00101
**Resolution Date:** 2025-11-29

---

## Symptoms

When creating a new student via the "Create New Student Record" modal on `/daep/placements/new`:
- Error toast: "Failed to create student record. If this persists, contact support with code DM-00101."
- Student record is not created in `trespass_records` table

---

## Root Cause Analysis

### Original Issues (FIXED)

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| Missing `user_id` in insert | FIXED | Added `user_id: user.id` |
| Wrong column name `is_student` | FIXED | Changed to `is_current_student` |
| Missing `created_via` column | FIXED | Added column via migration |
| Generic error message | FIXED | Now shows error code DM-00101 |
| Modal not themed | FIXED | Added `daep-theme` class |

### Final Issue (FIXED)

**Missing RLS Policy for Staging Tenant**

The actual cause:
- `get_my_tenant_id()` DB function DOES read from `user_profiles.active_tenant_id` (good!)
- But there was **no RLS policy** allowing access to staging tenant data
- Demo tenant had a special policy, staging did not

**Fix Applied:**
```sql
CREATE POLICY "Staging tenant allows authorized users"
ON trespass_records FOR ALL
USING/WITH CHECK (
  tenant_id = 'staging' AND user is in tenants.restricted_to_user_ids
);
```

Also synced both user profiles to have `active_tenant_id = 'staging'`.

---

## What Was Done This Session

### Database Migrations

1. **`create_staging_tenant`** - Created staging tenant for dev/testing
2. **`create_error_codes_table`** - Error codes lookup table with initial codes
3. **`add_created_via_audit_column`** - Audit trail for record creation source
4. **`add_restricted_to_user_ids_column`** - Tenant access restrictions
5. **`add_staging_tenant_rls_policy`** - RLS policy for staging tenant access

### Code Changes

| File | Change |
|------|--------|
| `middleware.ts` | localhost → staging routing, restricted tenant checks, auto-switch |
| `lib/tenant.ts` | Centralized tenant resolution (reads profile) |
| `lib/subdomain-client.ts` | localhost returns 'staging' |
| `app/actions/daep/placements.ts` | Fixed `createQuickStudent` - user_id, is_current_student, error codes |
| `components/daep/DAEPDialog.tsx` | NEW - Theme-aware dialog wrapper |
| `components/daep/RoomAssignmentDialog.tsx` | Uses DAEPDialogContent |
| `components/daep/AddSeparationDialog.tsx` | Uses DAEPDialogContent |
| `app/daep/(main)/placements/new/page.tsx` | Modal uses daep-theme class |

### Database Updates

- Staging tenant: `restricted_to_user_ids` set to owner's Clerk user IDs

---

## What Still Needs to Be Done

### HIGH PRIORITY - Fix RLS/JWT Mismatch

**Option A: Update `get_my_tenant_id()` DB function**
```sql
-- Make it read active_tenant_id from user_profiles instead of JWT
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS TEXT AS $$
  SELECT COALESCE(active_tenant_id, tenant_id)
  FROM user_profiles
  WHERE id = auth.uid()::text
$$ LANGUAGE sql SECURITY DEFINER;
```

**Option B: Add staging-specific RLS policy**
```sql
-- Similar to demo tenant policy
CREATE POLICY "Staging tenant allows authorized users"
ON trespass_records FOR ALL
USING (
  tenant_id = 'staging'
  AND EXISTS (
    SELECT 1 FROM tenants
    WHERE id = 'staging'
    AND auth.uid()::text = ANY(restricted_to_user_ids)
  )
);
```

**Option C: Re-authenticate after tenant switch**
- Force re-login when switching tenants to get new JWT with correct tenant_id
- More disruptive UX but cleanest from security standpoint

### MEDIUM PRIORITY - Complete Dialog Theme Fixes

Remaining dialogs need `DAEPDialogContent`:
- `app/daep/settings/rooms/EditRoomDialog.tsx`
- `app/daep/settings/rooms/AddRoomDialog.tsx`
- `app/daep/settings/behaviors/AddCategoryDialog.tsx`
- `app/daep/settings/behaviors/EditCategoryDialog.tsx`
- `app/daep/settings/calendar/DayEditorDialog.tsx`
- `app/daep/settings/calendar/CSVUploadDialog.tsx`
- `app/daep/settings/calendar/GenerateCalendarDialog.tsx`
- `app/daep/settings/schedules/AddScheduleDialog.tsx`
- `app/daep/settings/schedules/EditScheduleDialog.tsx`
- `app/daep/settings/codes/AddCodeDialog.tsx`
- `app/daep/settings/codes/EditCodeDialog.tsx`

### LOW PRIORITY - Migrate getTenantId

Files still using local `getTenantId()`:
- `app/actions/daep/rooms.ts`
- `app/actions/daep/students.ts`
- `app/actions/daep/behavior-categories.ts`
- `app/actions/daep/school-calendar.ts`
- `app/actions/daep/discipline-codes.ts`
- `app/actions/daep/schedules.ts`
- `app/actions/daep/settings.ts`
- `app/actions/invite-user.ts`

---

## Investigation Needed

1. **Check `get_my_tenant_id()` DB function** - What does it return? JWT or profile?
2. **Check RLS policies** - Do they use JWT tenant_id or profile active_tenant_id?
3. **Verify staging RLS policy exists** - Demo has special policy, staging may need one too

### Debug Steps

```sql
-- Check what get_my_tenant_id returns for current user
SELECT get_my_tenant_id();

-- Check user's profile tenant vs active tenant
SELECT tenant_id, active_tenant_id FROM user_profiles WHERE id = 'YOUR_CLERK_ID';

-- Check RLS policies on trespass_records
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'trespass_records';
```

---

## Temporary Workaround

Until RLS is fixed, test student creation on:
- `birdville.districttracker.com` (your assigned tenant)
- `demo.districttracker.com` (has special RLS policy)

---

## Related Files

- Error codes: `error_codes` table (DM-00101 = create failed)
- Future backlog: `docs/sprint-artifacts/future-backlog.md`
- Middleware: `middleware.ts`
- Tenant resolution: `lib/tenant.ts`
