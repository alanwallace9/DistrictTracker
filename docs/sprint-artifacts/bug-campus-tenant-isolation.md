# Bug: Campus Actions Not Respecting active_tenant_id

**Date:** 2025-11-25
**Status:** RESOLVED
**Resolution Date:** 2025-11-26
**Related:** bug-daep-settings-tenant.md

## Problem

When master_admin switches tenants using the tenant dropdown, campus actions (create, update, uniqueness check) still operated on the wrong tenant.

### Symptoms
1. User is on `demo.districttracker.com` with Demo District selected
2. User tries to create campus named "DAEP"
3. Error: "A campus with this name already exists"
4. But Demo tenant has ZERO campuses - DAEP only exists in birdville tenant

## Root Causes (Two Issues)

### Issue 1: Missing active_tenant_id Support
The `app/actions/admin/campuses.ts` file was NOT using `active_tenant_id` when determining which tenant to operate on.

**Fix:** Updated all 11 functions to use `COALESCE(active_tenant_id, tenant_id)` pattern.

### Issue 2: Primary Key Constraint (Main Blocker)
Even after fixing Issue 1, campus creation failed with:
```
duplicate key value violates unique constraint "campuses_pkey"
```

**Root Cause:** The `campuses` table had `id text PRIMARY KEY` which must be globally unique. But campus IDs are PEIMS codes (like "001", "002") assigned by the state - they should only be unique *within* a tenant, not globally.

**Fix:** Changed to composite primary key `(tenant_id, id)` via migration `20251126_campuses_composite_primary_key.sql`.

## Migration Applied

```sql
-- Change campuses PK to composite
ALTER TABLE campuses DROP CONSTRAINT campuses_pkey;
ALTER TABLE campuses ADD PRIMARY KEY (tenant_id, id);

-- Update all FK constraints to composite pattern
ALTER TABLE trespass_records
  ADD CONSTRAINT fk_trespass_records_campus
  FOREIGN KEY (tenant_id, campus_id)
  REFERENCES campuses(tenant_id, id);
-- ... (all other FKs updated similarly)
```

## Key Learning: Composite Primary Keys for Multi-Tenant

When a business identifier (like PEIMS campus code) should be unique per tenant but not globally:

1. **Use composite PK:** `PRIMARY KEY (tenant_id, id)` instead of `PRIMARY KEY (id)`
2. **Update all FKs:** Foreign keys must also be composite `(tenant_id, campus_id)`
3. **Benefits:**
   - `(demo, 001)` and `(birdville, 001)` can coexist
   - No need for surrogate UUIDs
   - Natural key is preserved for reporting/PEIMS

## Files Modified

- `app/actions/admin/campuses.ts` - Added active_tenant_id support, numbers-only validation
- `components/trespass/AddCampusDialog.tsx` - Updated validation message
- `supabase/migrations/20251126_campuses_composite_primary_key.sql` - Composite PK migration

## Verification

After fix, successfully created campus "DAEP" (id: 001) in Demo tenant while Birdville already had campus 001.
