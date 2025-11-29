# Bug: DAEP Room Creation Failed - RLS Policy Role Mismatch

**Date:** 2025-11-29
**Status:** RESOLVED
**Severity:** High (blocked core functionality)
**Commit:** `a8391b5`

---

## Problem

DAEP room creation failed with 500 error. Campus dropdown in "Add New Room" dialog was empty on staging environment.

### Symptoms

1. Navigate to `/daep/settings/rooms`
2. Click "Add Room"
3. Campus dropdown shows "Select a campus" but no options populate
4. If manually attempting to create room, 500 error returned
5. Rise Academy was correctly marked as DAEP campus in Admin > Campuses

### Environment

- User role: `super_admin`
- Tenant: `staging` (via `active_tenant_id`)
- Campus: Rise Academy (006) with `is_daep = true`

---

## Root Causes

### Cause 1: RLS Policy Role Mismatch

The `daep_rooms` INSERT policy checked for roles that didn't include `super_admin`:

```sql
-- OLD (broken)
get_my_role_from_db() = ANY (ARRAY['daep_admin_l1', 'district_admin', 'master_admin'])
```

The `master_admin` role was renamed to `super_admin` in migration `20251126200000`, but RLS policies were not updated. User had `super_admin` role, which didn't match the policy.

**Affected:** 57 RLS policies across 18 tables still referenced `master_admin`.

### Cause 2: Wrong Import in AddRoomDialog

The `AddRoomDialog.tsx` component imported the wrong function:

```typescript
// WRONG - returns ALL campuses (TrespassTracker function)
import { getCampuses } from '@/app/actions/campuses';

// CORRECT - returns only DAEP campuses (is_daep = true)
import { getDAEPCampuses } from '@/app/actions/daep/settings';
```

The `getCampuses` function returns campuses for TrespassTracker, which uses different filtering. The `getDAEPCampuses` function properly filters by `is_daep = true`.

---

## Fix Applied

### 1. RLS Migration

Created `20251129180000_update_rls_master_admin_to_super_admin.sql`:

- Replaced all `master_admin` references with `super_admin`
- Removed `OR tenant_id IS NULL` pattern (not using global records)
- Updated 57 policies across: `admin_audit_log`, `campuses`, `trespass_records`, `daep_rooms`, `daep_bell_schedules`, `daep_behavior_categories`, `daep_room_staff`, `daep_school_calendar`, `daep_placements`, `record_photos`, `record_documents`, `tenants`, `user_profiles`, `pending_invitations`, `storage.objects`, `feedback_*`, `waitlist`

### 2. Code Fix

Updated imports in both dialog components:

**`app/daep/settings/rooms/AddRoomDialog.tsx`:**
```typescript
// Changed from:
import { getCampuses } from '@/app/actions/campuses';
// To:
import { getDAEPCampuses } from '@/app/actions/daep/settings';
```

**`app/daep/settings/rooms/EditRoomDialog.tsx`:**
Same import fix applied.

### 3. Documentation

Updated `docs/reference/data-models.md` and `docs/reference/api-contracts.md` with complete role list:
- `viewer`, `campus_admin`, `district_admin`, `super_admin`
- `daep_admin_l1`, `daep_admin_l2`, `daep_staff`
- `counselor`, `parent`, `student`

---

## Key Learnings

1. **Role renames require RLS policy audit** - When renaming roles in `user_profiles`, all RLS policies must be checked and updated.

2. **Migration tracking gap** - The initial role rename migration updated the table constraint and user records but missed RLS policies. Future role changes should include a checklist:
   - [ ] Update `user_profiles` CHECK constraint
   - [ ] Update existing user records
   - [ ] Update ALL RLS policies (query `pg_policies` table)
   - [ ] Update documentation
   - [ ] Update any hardcoded role checks in application code

3. **Module-specific functions exist for a reason** - DAEP and TrespassTracker have separate action files. Always verify imports match the module context.

4. **Use MCP to verify actual database state** - The migration SQL files showed one thing, but the actual database had different policies. Always query `pg_policies` to see real state.

---

## Verification

After fix:
```sql
-- Should return 0 rows (no master_admin references)
SELECT tablename, policyname
FROM pg_policies
WHERE (qual LIKE '%master_admin%' OR with_check LIKE '%master_admin%')
  AND policyname NOT LIKE '%Demo%';
```

Manual verification:
1. Navigate to `/daep/settings/rooms`
2. Click "Add Room"
3. Campus dropdown shows "Rise Academy"
4. Fill form and click "Create Room"
5. Room appears in list

---

## Files Modified

- `app/daep/settings/rooms/AddRoomDialog.tsx` - Import fix
- `app/daep/settings/rooms/EditRoomDialog.tsx` - Import fix
- `supabase/migrations/20251129180000_update_rls_master_admin_to_super_admin.sql` - RLS policy update
- `docs/reference/data-models.md` - Role documentation
- `docs/reference/api-contracts.md` - Role documentation

---

## Related

- `bug-campus-tenant-isolation.md` - Composite PK pattern for multi-tenant
- `20251126200000_rename_master_admin_to_super_admin.sql` - Original role rename (incomplete)

---

*Resolved by: Claude Code*
*Date: 2025-11-29*
