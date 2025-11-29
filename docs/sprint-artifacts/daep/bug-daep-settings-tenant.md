# Bug: DAEP Settings Page Not Finding DAEP Campuses

**Date:** 2025-11-25
**Status:** RESOLVED
**Resolution Date:** 2025-11-26
**Related:** bug-campus-tenant-isolation.md

## Problem

After creating a DAEP campus in the Demo tenant, the DAEP Settings page (`/daep/settings`) showed an error instead of the settings form.

### Symptoms
1. Campus created successfully and visible in Admin > Campuses
2. Campus marked as DAEP (`is_daep = true`)
3. DAEP Settings page throws "An error occurred in the Server Components render"
4. Server logs show: `column tenants.name does not exist`

## Root Cause

The `getDistrictDAEPSettings()` function in `app/actions/daep/settings.ts` queried a non-existent column:

```typescript
// BROKEN - 'name' column doesn't exist
const { data, error } = await supabase
  .from('tenants')
  .select('id, name, daep_settings')  // <-- 'name' doesn't exist!
  .eq('id', tenantId)
  .single();
```

The `tenants` table schema has `display_name`, not `name`:
- `id` (text, PK)
- `subdomain` (text)
- `display_name` (text) <-- Correct column
- `status` (text)
- `daep_settings` (jsonb)

## Fix Applied

Changed query and return statement to use `display_name`:

```typescript
// FIXED
const { data, error } = await supabase
  .from('tenants')
  .select('id, display_name, daep_settings')
  .eq('id', tenantId)
  .single();

return {
  settings,
  tenant_id: data.id,
  tenant_name: data.display_name,  // Changed from data.name
};
```

## Key Learning: Verify Column Names

Before querying a table, verify actual column names against the schema. Column naming conventions can vary:
- `name` vs `display_name` vs `short_name`
- `tenant_id` vs `organization_id`

Use Supabase MCP tools or check migrations to confirm schema.

## Files Modified

- `app/actions/daep/settings.ts` - Lines 122, 141: `name` → `display_name`

## Commits

- `1bcc13b` - fix(daep): Fix tenant column name in getDistrictDAEPSettings
- `58d3a18` - chore: Remove debug logging from getDAEPCampuses

## Verification

After fix, DAEP Settings page loads correctly and shows district settings form.
