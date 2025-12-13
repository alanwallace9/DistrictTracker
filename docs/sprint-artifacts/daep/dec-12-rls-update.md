# RLS Policy Audit - December 12, 2025

**Purpose:** Document inconsistencies in Row-Level Security policies for Clerk + Supabase integration

---

## Architecture Overview

The codebase uses Clerk for authentication and Supabase RLS for authorization. The correct pattern uses these helper functions:

| Function | Purpose | Implementation |
|----------|---------|----------------|
| `get_my_clerk_id()` | Extract user ID from JWT | `auth.jwt() ->> 'sub'` |
| `get_my_tenant_id()` | Get user's effective tenant | Looks up `user_profiles` via `get_my_clerk_id()` |
| `get_my_role_from_db()` | Get user's role | Looks up `user_profiles` via JWT sub claim |
| `get_effective_role()` | Demo tenant role simulation | Uses `get_my_clerk_id()` |

**Most DAEP tables correctly use these helpers.**

---

## Policies Requiring Updates

### Critical - Will Fail with Clerk Auth

These policies use `auth.uid()` which expects Supabase Auth UUID format, but Clerk user IDs are strings like `user_xxx`:

| Table | Policy Name | Current Code | Fix |
|-------|-------------|--------------|-----|
| `feedback_images` | Users can delete their own images | `(auth.uid())::text = uploaded_by` | Use `get_my_clerk_id() = uploaded_by` |
| `pending_invitations` | District admins can view their tenant invitations | `user_profiles.id = (auth.uid())::text` | Use `get_my_clerk_id()` |

### Legacy - Uses Deprecated Session Variable

These policies use `get_current_tenant_id()` which relies on PostgreSQL session variables that are never set:

| Table | Policy Name | Current Code | Fix |
|-------|-------------|--------------|-----|
| `daep_notifications` | daep_notifications_tenant_isolation | `tenant_id = get_current_tenant_id()` | Use `get_my_tenant_id()` |
| `daep_reconciliation_audit` | daep_reconciliation_audit_tenant_isolation | `get_current_tenant_id()` in subquery | Use `get_my_tenant_id()` |

### Inconsistent - Works but Should Use Helpers

These policies work but bypass the helper functions for consistency:

| Table | Policy Name | Current Code | Recommendation |
|-------|-------------|--------------|----------------|
| `record_photos` | Users can update their own photos | `auth.jwt() ->> 'sub'` directly | Consider `get_my_clerk_id()` |
| `record_photos` | Users can delete their own photos | `auth.jwt() ->> 'sub'` directly | Consider `get_my_clerk_id()` |
| `trespass_records` | Users can view records in their tenant | `auth.jwt() ->> 'tenant_id'` | Note: Uses tenant_id claim, not lookup |
| `daep_reconciliation_discrepancies` | tenant_isolation | `auth.jwt() ->> 'sub'` directly | Already functional (fixed Dec 12) |

---

## Demo Tenant Policies

Several tables have "Demo tenant public access" policies using `auth.uid() IS NOT NULL`. These check authentication presence only (not user identity), so they may still work but should be reviewed for consistency:

- `campuses` (3 policies)
- `record_documents` (2 policies)
- `record_photos` (2 policies)

---

## Policies Correctly Implemented

The following tables use the proper helper functions and serve as reference implementations:

- `daep_placements`
- `daep_attendance`
- `daep_daily_points`
- `daep_rooms`
- `daep_room_groups`
- `daep_student_separations`
- `daep_reconciliation_sessions`
- `daep_csv_field_mappings`
- `admin_audit_log`
- `campuses` (non-demo policies)
- `user_profiles`
- `tenants`

---

## Migration Template

To fix the broken policies, create a migration like:

```sql
-- Fix RLS policies for Clerk authentication compatibility

-- 1. Fix feedback_images
DROP POLICY IF EXISTS "Users can delete their own images" ON feedback_images;
CREATE POLICY "Users can delete their own images"
ON feedback_images FOR DELETE
USING (get_my_clerk_id() = uploaded_by);

-- 2. Fix pending_invitations
DROP POLICY IF EXISTS "District admins can view their tenant invitations" ON pending_invitations;
CREATE POLICY "District admins can view their tenant invitations"
ON pending_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = get_my_clerk_id()
    AND user_profiles.role = ANY (ARRAY['district_admin', 'campus_admin'])
    AND user_profiles.tenant_id = pending_invitations.tenant_id
  )
);

-- 3. Fix daep_notifications
DROP POLICY IF EXISTS "daep_notifications_tenant_isolation" ON daep_notifications;
CREATE POLICY "daep_notifications_tenant_isolation"
ON daep_notifications FOR ALL
USING (tenant_id = get_my_tenant_id());

-- 4. Fix daep_reconciliation_audit
DROP POLICY IF EXISTS "daep_reconciliation_audit_tenant_isolation" ON daep_reconciliation_audit;
CREATE POLICY "daep_reconciliation_audit_tenant_isolation"
ON daep_reconciliation_audit FOR ALL
USING (
  session_id IN (
    SELECT id FROM daep_reconciliation_sessions
    WHERE tenant_id = get_my_tenant_id()
  )
);
```

---

## Related Fix Applied

**December 12, 2025:** Fixed `daep_reconciliation_discrepancies` RLS policy during Story 5-4 implementation. Changed from `auth.uid()::text` to `auth.jwt() ->> 'sub'` to work with Clerk JWT tokens.

---

## Action Items

1. [ ] Create migration to fix critical policies (feedback_images, pending_invitations)
2. [ ] Create migration to fix legacy policies (daep_notifications, daep_reconciliation_audit)
3. [ ] Review demo tenant policies for consistency
4. [ ] Add RLS policy testing to CI/CD pipeline
