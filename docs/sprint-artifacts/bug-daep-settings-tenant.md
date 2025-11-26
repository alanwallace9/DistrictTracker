# Bug: DAEP Settings Page Not Finding DAEP Campuses

**Date:** 2025-11-25
**Status:** Open - Needs Investigation
**Story:** 1.9 District/Campus DAEP Settings

## Symptoms

1. Edit Campus dialog (Admin → Campuses → Edit) **correctly shows** the "DAEP Campus" checkbox
2. Campus 006 (DAEP) has `is_daep = true` in the database (verified via MCP SQL query)
3. DAEP Settings page (`/daep/settings`) shows "No DAEP campuses configured"
4. The Campus Settings card does not appear

## Verified Working

- `campuses.is_daep` column exists and is `true` for campus 006
- `campuses.daep_settings` JSONB column exists with default values
- `tenants.daep_settings` JSONB column exists with default values
- `get_campuses_with_counts` SQL function returns `is_daep` field
- EditCampusDialog.tsx has the checkbox code (lines 223-235)
- TypeScript compiles without errors

## Suspected Cause: Tenant Mismatch

The `getDAEPCampuses()` function in `app/actions/daep/settings.ts` queries:

```typescript
const { data, error } = await supabase
  .from('campuses')
  .select('id, name, is_daep')
  .eq('tenant_id', tenantId)  // <-- This filter
  .eq('is_daep', true)
  .is('deleted_at', null)
  .order('name');
```

The `tenantId` comes from `currentUser().publicMetadata.tenant_id`.

**Possible issues:**
1. The user's `tenant_id` in Clerk metadata doesn't match the campus's `tenant_id` in Supabase
2. Admin panel uses different auth context than DAEP module
3. The campus 006 belongs to tenant 'birdville' but the logged-in user might have a different tenant_id

## Database State (Verified)

```sql
SELECT id, name, tenant_id, is_daep FROM campuses WHERE name = 'DAEP';
-- Result: id='006', tenant_id='birdville', is_daep=true
```

## Investigation Steps

1. Add console.log in `getDAEPCampuses()` to output:
   - The `tenantId` from `getTenantId()`
   - The query result
   - Any errors

2. Check Clerk user metadata:
   - Verify `publicMetadata.tenant_id` matches 'birdville'

3. Compare auth contexts:
   - Admin panel: Uses `auth()` from Clerk + `supabaseAdmin`
   - DAEP settings: Uses `currentUser()` from Clerk + `createServerClient()`

4. Test query directly:
   ```sql
   SELECT * FROM campuses WHERE tenant_id = 'birdville' AND is_daep = true;
   ```

## Files Involved

- `app/actions/daep/settings.ts` - Server actions for DAEP settings
- `app/daep/settings/page.tsx` - Settings page UI
- `components/trespass/EditCampusDialog.tsx` - Campus edit dialog (working)
- `app/actions/admin/campuses.ts` - Admin campus actions (working)

## Quick Fix to Try

In `app/actions/daep/settings.ts`, temporarily log the tenant:

```typescript
export async function getDAEPCampuses(): Promise<CampusInfo[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  console.log('[getDAEPCampuses] tenantId:', tenantId); // ADD THIS

  // ... rest of function
}
```

Then check server logs after loading the DAEP Settings page.
