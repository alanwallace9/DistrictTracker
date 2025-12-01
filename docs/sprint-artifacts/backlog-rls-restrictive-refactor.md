# Backlog Item: Refactor RLS to RESTRICTIVE Base Layer Pattern

**Type:** Security / Technical Debt
**Priority:** MEDIUM
**Date Added:** 2025-11-30
**Source:** Tenant isolation bug investigation (super_admin seeing all tenants)

---

## Problem Statement

Current RLS policies use only PERMISSIVE policies, requiring each policy to independently enforce tenant isolation via `tenant_id = get_my_tenant_id()`. This is error-prone:

- **Bug Found:** "Super admins can view deleted records" policy had NO tenant filter, causing super_admins to see ALL records from ALL tenants.
- **Root Cause:** PERMISSIVE policies use OR logic — if ANY policy returns true, the row is visible.
- **Quick Fix Applied:** Added tenant filter to the broken policy (2025-11-30).

## Proposed Solution

Refactor to use PostgreSQL's **RESTRICTIVE** policy as a base layer:

```sql
-- RESTRICTIVE policy enforces tenant boundary (cannot be bypassed)
CREATE POLICY "tenant_isolation" ON table_name
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

-- PERMISSIVE policies handle role-based access WITHIN tenant
-- No need to repeat tenant filter in each policy
```

### How It Works

```
RESTRICTIVE policies: Must ALL pass (AND logic)
PERMISSIVE policies:  Any one can pass (OR logic)

Final access = (ALL restrictive pass) AND (ANY permissive passes)
```

## Benefits

| Current Approach | RESTRICTIVE Base Layer |
|------------------|----------------------|
| Every policy must include tenant filter | Tenant filter in ONE place |
| Miss one = data leak | Cannot accidentally leak |
| Hard to audit | Easy to audit |
| 8 policies on trespass_records | 1 restrictive + simpler permissives |

## Scope

Tables requiring refactor (multi-tenant with RLS):
- [ ] `trespass_records`
- [ ] `user_profiles`
- [ ] `campuses`
- [ ] `daep_students`
- [ ] `daep_placements`
- [ ] `daep_rooms`
- [ ] `daep_bell_schedules`
- [ ] `daep_behavior_categories`
- [ ] `daep_discipline_codes`
- [ ] `daep_student_separations`
- [ ] Other tenant-scoped tables...

## Implementation Steps

1. **Audit current policies** - Document all existing RLS policies per table
2. **Create migration** - For each table:
   - Add RESTRICTIVE `tenant_isolation` policy
   - Simplify PERMISSIVE policies (remove redundant tenant checks)
   - Handle special cases (demo tenant, staging tenant)
3. **Test thoroughly** - Verify:
   - Normal users see only their tenant
   - Super_admin with tenant switcher sees correct tenant
   - Demo/staging special access still works
4. **Document pattern** - Update architecture docs with RLS best practices

## Special Considerations

### Demo Tenant
Demo tenant allows any authenticated user. The RESTRICTIVE policy uses `get_my_tenant_id()` which returns the user's `active_tenant_id` — this is set to `demo` by middleware when accessing demo subdomain, so it should work.

### Staging Tenant
Staging uses `restricted_to_user_ids` check. Middleware sets `active_tenant_id = 'staging'` for authorized users, so RESTRICTIVE policy should work.

### Tenant Switcher
`get_my_tenant_id()` already respects `active_tenant_id || tenant_id`, so the RESTRICTIVE pattern is compatible with the super_admin tenant switcher.

## Acceptance Criteria

- [ ] All tenant-scoped tables have RESTRICTIVE `tenant_isolation` policy
- [ ] PERMISSIVE policies simplified (no redundant tenant checks)
- [ ] Super_admin with tenant switcher works correctly
- [ ] Demo tenant access works
- [ ] Staging tenant access works (restricted users only)
- [ ] No cross-tenant data leakage under any role/scenario
- [ ] Architecture docs updated with RLS pattern

## Related

- Quick fix commit (2025-11-30): Fixed "Super admins can view deleted records" policy
- `lib/tenant.ts` - `getTenantId()` function
- `middleware.ts` - Tenant auto-switching logic
- `get_my_tenant_id()` SQL function

---

## Notes

This is foundational security infrastructure. Should be prioritized before adding more tables/policies to prevent similar bugs. The pattern makes future policy additions safer and easier to audit.
