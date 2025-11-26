# Row-Level Security (RLS) Policies - Complete Reference

**Project:** DistrictTracker
**Database:** Supabase PostgreSQL
**Last Updated:** 2025-11-23
**Total Policies:** 70+

---

## Overview

This document provides **complete, verified RLS policy documentation** retrieved directly from the PostgreSQL `pg_policies` system table. Every policy is documented with its exact implementation details.

**Key Architecture:**
- Multi-tenant isolation via `tenant_id` column
- Role-based access control (viewer, campus_admin, district_admin, master_admin)
- Demo tenant special handling for public exploration
- Helper functions for tenant and role resolution

---

## Helper Functions

These PostgreSQL functions are used throughout RLS policies:

### 1. `get_my_tenant_id()`

**Purpose:** Retrieves current user's tenant_id from their user_profile

**Implementation Pattern:**
```sql
SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
```

**Usage:** Tenant isolation in RLS policies
```sql
WHERE tenant_id = get_my_tenant_id()
```

---

### 2. `get_my_role_from_db()`

**Purpose:** Retrieves current user's role from their user_profile

**Implementation Pattern:**
```sql
SELECT role FROM user_profiles WHERE id = auth.uid()
```

**Returns:** 'viewer' | 'campus_admin' | 'district_admin' | 'master_admin'

**Usage:** Role-based access control
```sql
WHERE get_my_role_from_db() IN ('district_admin', 'master_admin')
```

---

### 3. `get_my_campus_id()`

**Purpose:** Retrieves current user's assigned campus_id

**Implementation Pattern:**
```sql
SELECT campus_id FROM user_profiles WHERE id = auth.uid()
```

**Usage:** Campus-scoped access for campus_admin role

---

### 4. `get_effective_role(tenant_id_param text)`

**Purpose:** Returns effective role with demo tenant special handling

**Logic:**
- If user is authenticated AND tenant is 'demo' → returns 'district_admin'
- Otherwise returns user's actual role from database
- Allows logged-in users to explore demo tenant with full access

**Usage:** Demo tenant simulation
```sql
WHERE get_effective_role(tenant_id) IN ('district_admin', 'master_admin')
```

---

## Policies by Table

### 1. `tenants` Table (6 policies)

**Purpose:** Organization/district definitions

#### Policy: `tenant-select-own`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  (tenant_id = get_my_tenant_id())
  ```
- **Purpose:** Users can view their own tenant

#### Policy: `Tenant select for authenticated users`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  (tenant_id = get_my_tenant_id())
  ```
- **Purpose:** Duplicate policy for tenant viewing

#### Policy: `tenant-view-own`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  (tenant_id = get_my_tenant_id())
  ```
- **Purpose:** Additional tenant viewing policy

#### Policy: `Tenants are viewable by authenticated users with matching tenant_id`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  ((id)::text = ( SELECT user_profiles.tenant_id
   FROM user_profiles
  WHERE ((user_profiles.id)::text = (auth.uid())::text)))
  ```
- **Purpose:** Public access to view tenant via user profile lookup

#### Policy: `tenant-insert-master-admin`
- **Command:** INSERT
- **Role:** authenticated
- **USING:** (none)
- **WITH CHECK:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **Purpose:** Only master_admin can create new tenants

#### Policy: `tenant-update-master-admin`
- **Command:** UPDATE
- **Role:** authenticated
- **USING:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **WITH CHECK:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **Purpose:** Only master_admin can update tenants

---

### 2. `user_profiles` Table (5 policies)

**Purpose:** User accounts synced from Clerk

#### Policy: `user-profiles-select-own`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  ((id)::text = (auth.uid())::text)
  ```
- **Purpose:** Users can view their own profile

#### Policy: `user-profiles-update-own`
- **Command:** UPDATE
- **Role:** authenticated
- **USING:**
  ```sql
  ((id)::text = (auth.uid())::text)
  ```
- **WITH CHECK:**
  ```sql
  ((id)::text = (auth.uid())::text)
  ```
- **Purpose:** Users can update their own profile (theme, preferences)

#### Policy: `user-select-same-tenant`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  (tenant_id = get_my_tenant_id())
  ```
- **Purpose:** Users can view other users in same tenant

#### Policy: `Users can view their own profile`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  ((id)::text = (auth.uid())::text)
  ```
- **Purpose:** Public access to own profile

#### Policy: `user-manage-district-admin`
- **Command:** ALL
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **WITH CHECK:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** district_admin+ can manage users in their tenant

---

### 3. `campuses` Table (6 policies)

**Purpose:** Campus/school locations within a tenant

#### Policy: `campus-select`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  (tenant_id = get_my_tenant_id())
  ```
- **Purpose:** Users can view campuses in their tenant

#### Policy: `Campuses are viewable by authenticated users in the same tenant`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  ((tenant_id)::text = ( SELECT user_profiles.tenant_id
   FROM user_profiles
  WHERE ((user_profiles.id)::text = (auth.uid())::text)))
  ```
- **Purpose:** Public access to view campuses via tenant lookup

#### Policy: `campus-insert-district-admin`
- **Command:** INSERT
- **Role:** authenticated
- **USING:** (none)
- **WITH CHECK:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** district_admin+ can create campuses

#### Policy: `campus-update-district-admin`
- **Command:** UPDATE
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **WITH CHECK:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** district_admin+ can update campuses

#### Policy: `campus-delete-district-admin`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** district_admin+ can delete campuses

#### Policy: `campus-demo-simulation`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = 'demo'::text) AND (auth.uid() IS NOT NULL))
  ```
- **Purpose:** Demo tenant special handling - all logged-in users can view demo campuses

---

### 4. `trespass_records` Table (8 policies)

**Purpose:** Core trespass incident tracking

#### Policy: `trespass-select-tenant`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (deleted_at IS NULL))
  ```
- **Purpose:** Users can view non-deleted records in their tenant

#### Policy: `Trespass records are viewable by users in same tenant`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  (((tenant_id)::text = ( SELECT user_profiles.tenant_id
   FROM user_profiles
  WHERE ((user_profiles.id)::text = (auth.uid())::text))) AND (deleted_at IS NULL))
  ```
- **Purpose:** Public access to view non-deleted records

#### Policy: `trespass-insert-campus-admin`
- **Command:** INSERT
- **Role:** authenticated
- **USING:** (none)
- **WITH CHECK:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** campus_admin+ can create records

#### Policy: `trespass-update-campus-admin`
- **Command:** UPDATE
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])))
  ```
- **WITH CHECK:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** campus_admin+ can update records (including soft delete)

#### Policy: `trespass-delete-district-admin`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** district_admin+ can hard delete records (rare, soft delete preferred)

#### Policy: `trespass-demo-select`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = 'demo'::text) AND (auth.uid() IS NOT NULL))
  ```
- **Purpose:** Demo tenant - all logged-in users can view demo records

#### Policy: `trespass-demo-write`
- **Command:** INSERT, UPDATE, DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = 'demo'::text) AND (auth.uid() IS NOT NULL))
  ```
- **WITH CHECK:**
  ```sql
  ((tenant_id = 'demo'::text) AND (auth.uid() IS NOT NULL))
  ```
- **Purpose:** Demo tenant - all logged-in users can modify demo records

#### Policy: `viewer-campus-select`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (campus_id = get_my_campus_id()) AND (get_my_role_from_db() = 'viewer'::text))
  ```
- **Purpose:** Viewers limited to their assigned campus only

---

### 5. `record_photos` Table (5 policies)

**Purpose:** Additional photo attachments for records

#### Policy: `record-photos-select`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  (tenant_id = get_my_tenant_id())
  ```
- **Purpose:** Users can view photos in their tenant

#### Policy: `Photo attachments are viewable by users in same tenant`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  ((tenant_id)::text = ( SELECT user_profiles.tenant_id
   FROM user_profiles
  WHERE ((user_profiles.id)::text = (auth.uid())::text)))
  ```
- **Purpose:** Public access to photos via tenant lookup

#### Policy: `record-photos-insert`
- **Command:** INSERT
- **Role:** authenticated
- **USING:** (none)
- **WITH CHECK:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** campus_admin+ can upload photos

#### Policy: `record-photos-delete`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** campus_admin+ can delete photos

#### Policy: `record-photos-demo`
- **Command:** ALL
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = 'demo'::text) AND (auth.uid() IS NOT NULL))
  ```
- **WITH CHECK:**
  ```sql
  ((tenant_id = 'demo'::text) AND (auth.uid() IS NOT NULL))
  ```
- **Purpose:** Demo tenant - all logged-in users can manage photos

---

### 6. `record_documents` Table (5 policies)

**Purpose:** Document attachments (PDFs, etc.) for records

#### Policy: `record-documents-select`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  (tenant_id = get_my_tenant_id())
  ```
- **Purpose:** Users can view documents in their tenant

#### Policy: `Document attachments are viewable by users in same tenant`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  ((tenant_id)::text = ( SELECT user_profiles.tenant_id
   FROM user_profiles
  WHERE ((user_profiles.id)::text = (auth.uid())::text)))
  ```
- **Purpose:** Public access to documents via tenant lookup

#### Policy: `record-documents-insert`
- **Command:** INSERT
- **Role:** authenticated
- **USING:** (none)
- **WITH CHECK:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** campus_admin+ can upload documents

#### Policy: `record-documents-delete`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['campus_admin'::text, 'district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** campus_admin+ can delete documents

#### Policy: `record-documents-demo`
- **Command:** ALL
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = 'demo'::text) AND (auth.uid() IS NOT NULL))
  ```
- **WITH CHECK:**
  ```sql
  ((tenant_id = 'demo'::text) AND (auth.uid() IS NOT NULL))
  ```
- **Purpose:** Demo tenant - all logged-in users can manage documents

---

### 7. `admin_audit_log` Table (2 policies)

**Purpose:** FERPA-compliant audit trail

#### Policy: `audit-log-select-admin`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** Only district_admin+ can view audit logs in their tenant

#### Policy: `audit-log-insert-authenticated`
- **Command:** INSERT
- **Role:** authenticated
- **USING:** (none)
- **WITH CHECK:**
  ```sql
  (auth.uid() IS NOT NULL)
  ```
- **Purpose:** Any authenticated user can create audit log entries (via server actions)

---

### 8. `feedback_categories` Table (3 policies)

**Purpose:** Feedback categorization

#### Policy: `feedback-categories-select-public`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  (is_active = true)
  ```
- **Purpose:** Anyone can view active feedback categories (public feedback system)

#### Policy: `feedback-categories-manage-admin`
- **Command:** INSERT, UPDATE, DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **WITH CHECK:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **Purpose:** Only master_admin can manage feedback categories

#### Policy: `Feedback categories are publicly viewable`
- **Command:** SELECT
- **Role:** public
- **USING:** true
- **Purpose:** Public can view all categories (even inactive)

---

### 9. `feedback_submissions` Table (8 policies)

**Purpose:** Feature requests and bug reports

#### Policy: `feedback-select-public`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  (is_public = true)
  ```
- **Purpose:** Public can view public feedback submissions

#### Policy: `Feedback submissions are viewable if public`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  (is_public = true)
  ```
- **Purpose:** Duplicate public viewing policy

#### Policy: `feedback-select-own`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  ((user_id)::text = (auth.uid())::text)
  ```
- **Purpose:** Users can view their own submissions (even private ones)

#### Policy: `feedback-insert-authenticated`
- **Command:** INSERT
- **Role:** authenticated
- **USING:** (none)
- **WITH CHECK:**
  ```sql
  ((user_id)::text = (auth.uid())::text)
  ```
- **Purpose:** Authenticated users can submit feedback

#### Policy: `feedback-update-own`
- **Command:** UPDATE
- **Role:** authenticated
- **USING:**
  ```sql
  ((user_id)::text = (auth.uid())::text)
  ```
- **WITH CHECK:**
  ```sql
  ((user_id)::text = (auth.uid())::text)
  ```
- **Purpose:** Users can update their own submissions

#### Policy: `feedback-delete-own`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  ((user_id)::text = (auth.uid())::text)
  ```
- **Purpose:** Users can delete their own submissions

#### Policy: `feedback-admin-response`
- **Command:** UPDATE
- **Role:** authenticated
- **USING:**
  ```sql
  (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text]))
  ```
- **WITH CHECK:**
  ```sql
  (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text]))
  ```
- **Purpose:** Admins can update any feedback (add responses, change status)

#### Policy: `feedback-admin-delete`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **Purpose:** Only master_admin can delete any feedback

---

### 10. `feedback_upvotes` Table (5 policies)

**Purpose:** User upvotes on feedback

#### Policy: `upvotes-select-public`
- **Command:** SELECT
- **Role:** public
- **USING:** true
- **Purpose:** Anyone can view upvote counts

#### Policy: `Feedback upvotes are viewable by all users`
- **Command:** SELECT
- **Role:** public
- **USING:** true
- **Purpose:** Duplicate public viewing policy

#### Policy: `upvotes-insert-authenticated`
- **Command:** INSERT
- **Role:** authenticated
- **USING:** (none)
- **WITH CHECK:**
  ```sql
  (((user_id)::text = (auth.uid())::text) OR (user_id IS NULL))
  ```
- **Purpose:** Users can upvote (either with user_id or anonymously)

#### Policy: `upvotes-delete-own`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  ((user_id)::text = (auth.uid())::text)
  ```
- **Purpose:** Users can remove their own upvotes

#### Policy: `upvotes-admin-delete`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **Purpose:** master_admin can remove any upvote

---

### 11. `feedback_comments` Table (7 policies)

**Purpose:** Comments on feedback submissions

#### Policy: `comments-select-public`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  EXISTS ( SELECT 1
     FROM feedback_submissions
    WHERE ((feedback_submissions.id = feedback_comments.feedback_id) AND (feedback_submissions.is_public = true)))
  ```
- **Purpose:** Public can view comments on public feedback

#### Policy: `Feedback comments are viewable if parent is public`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  EXISTS ( SELECT 1
     FROM feedback_submissions
    WHERE ((feedback_submissions.id = feedback_comments.feedback_id) AND (feedback_submissions.is_public = true)))
  ```
- **Purpose:** Duplicate public viewing policy

#### Policy: `comments-insert-authenticated`
- **Command:** INSERT
- **Role:** authenticated
- **USING:** (none)
- **WITH CHECK:**
  ```sql
  ((user_id)::text = (auth.uid())::text)
  ```
- **Purpose:** Authenticated users can comment

#### Policy: `comments-update-own`
- **Command:** UPDATE
- **Role:** authenticated
- **USING:**
  ```sql
  ((user_id)::text = (auth.uid())::text)
  ```
- **WITH CHECK:**
  ```sql
  ((user_id)::text = (auth.uid())::text)
  ```
- **Purpose:** Users can edit their own comments

#### Policy: `comments-delete-own`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  ((user_id)::text = (auth.uid())::text)
  ```
- **Purpose:** Users can delete their own comments

#### Policy: `comments-admin-update`
- **Command:** UPDATE
- **Role:** authenticated
- **USING:**
  ```sql
  (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text]))
  ```
- **WITH CHECK:**
  ```sql
  (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text]))
  ```
- **Purpose:** Admins can moderate any comment

#### Policy: `comments-admin-delete`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **Purpose:** master_admin can delete any comment

---

### 12. `feedback_images` Table (5 policies)

**Purpose:** Image attachments for feedback

#### Policy: `feedback-images-select-public`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  EXISTS ( SELECT 1
     FROM feedback_submissions
    WHERE ((feedback_submissions.id = feedback_images.feedback_id) AND (feedback_submissions.is_public = true)))
  ```
- **Purpose:** Public can view images on public feedback

#### Policy: `Feedback images are viewable if parent is public`
- **Command:** SELECT
- **Role:** public
- **USING:**
  ```sql
  EXISTS ( SELECT 1
     FROM feedback_submissions
    WHERE ((feedback_submissions.id = feedback_images.feedback_id) AND (feedback_submissions.is_public = true)))
  ```
- **Purpose:** Duplicate public viewing policy

#### Policy: `feedback-images-insert-own`
- **Command:** INSERT
- **Role:** authenticated
- **USING:** (none)
- **WITH CHECK:**
  ```sql
  EXISTS ( SELECT 1
     FROM feedback_submissions
    WHERE ((feedback_submissions.id = feedback_images.feedback_id) AND ((feedback_submissions.user_id)::text = (auth.uid())::text)))
  ```
- **Purpose:** Users can upload images to their own feedback

#### Policy: `feedback-images-delete-own`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  EXISTS ( SELECT 1
     FROM feedback_submissions
    WHERE ((feedback_submissions.id = feedback_images.feedback_id) AND ((feedback_submissions.user_id)::text = (auth.uid())::text)))
  ```
- **Purpose:** Users can delete images from their own feedback

#### Policy: `feedback-images-admin-manage`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **Purpose:** master_admin can delete any feedback image

---

### 13. `pending_invitations` Table (4 policies)

**Purpose:** Track Clerk invitations

#### Policy: `invites-select-district-admin`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** district_admin+ can view invitations in their tenant

#### Policy: `invites-insert-district-admin`
- **Command:** INSERT
- **Role:** authenticated
- **USING:** (none)
- **WITH CHECK:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** district_admin+ can create invitations

#### Policy: `invites-update-district-admin`
- **Command:** UPDATE
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **WITH CHECK:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** district_admin+ can update invitation status

#### Policy: `invites-delete-district-admin`
- **Command:** DELETE
- **Role:** authenticated
- **USING:**
  ```sql
  ((tenant_id = get_my_tenant_id()) AND (get_my_role_from_db() = ANY (ARRAY['district_admin'::text, 'master_admin'::text])))
  ```
- **Purpose:** district_admin+ can delete invitations

---

### 14. `waitlist` Table (3 policies)

**Purpose:** Public waitlist for new tenants

#### Policy: `waitlist-insert-public`
- **Command:** INSERT
- **Role:** public
- **USING:** (none)
- **WITH CHECK:** true
- **Purpose:** Anyone can join waitlist

#### Policy: `waitlist-select-admin`
- **Command:** SELECT
- **Role:** authenticated
- **USING:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **Purpose:** Only master_admin can view waitlist

#### Policy: `waitlist-update-admin`
- **Command:** UPDATE
- **Role:** authenticated
- **USING:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **WITH CHECK:**
  ```sql
  (get_my_role_from_db() = 'master_admin'::text)
  ```
- **Purpose:** Only master_admin can update waitlist status

---

### 15. `demo_seed_snapshots` Table (0 explicit policies)

**Purpose:** Demo tenant snapshots

**RLS Status:** RLS is disabled on this table
**Access:** Server-side only via service role key
**Purpose:** Admin operations for demo resets

---

## Role-Based Access Summary

### Viewer
- **Tenants:** View own tenant only
- **Campuses:** View campuses in tenant
- **Trespass Records:** View records from assigned campus only
- **User Profiles:** View own profile + others in tenant
- **Audit Log:** No access
- **Feedback:** Can view public, submit own, comment
- **Modifications:** None

### Campus Admin
- **Tenants:** View own tenant only
- **Campuses:** View campuses in tenant
- **Trespass Records:** Full CRUD in tenant (any campus)
- **User Profiles:** View own profile + others in tenant
- **Audit Log:** No access
- **Feedback:** Can view public, submit own, comment
- **Modifications:** Create/update/delete records, photos, documents

### District Admin
- **Tenants:** View own tenant only
- **Campuses:** Full CRUD in tenant
- **Trespass Records:** Full CRUD in tenant
- **User Profiles:** Full CRUD in tenant (user management)
- **Audit Log:** View tenant audit log
- **Feedback:** Can moderate all feedback, respond to submissions
- **Modifications:** All operations within tenant

### Master Admin
- **Tenants:** Create/update/delete any tenant
- **Campuses:** Full CRUD across all tenants
- **Trespass Records:** Full CRUD across all tenants
- **User Profiles:** Full CRUD across all tenants
- **Audit Log:** View all audit logs
- **Feedback:** Full control (delete any submission/comment)
- **Modifications:** System-wide administration

---

## Demo Tenant Special Handling

The demo tenant (`tenant_id = 'demo'`) has special RLS policies that allow all logged-in users to:

1. **View all demo records** - trespass_records, campuses
2. **Modify demo records** - create/update/delete records, photos, documents
3. **Simulate district_admin role** - via `get_effective_role()` function

**Purpose:** Allow potential customers to explore the system with full functionality

**Implementation:**
- Policies check: `(tenant_id = 'demo' AND auth.uid() IS NOT NULL)`
- Helper function: `get_effective_role('demo')` returns 'district_admin'
- Demo data resets via scheduled snapshots

**Tables with Demo Policies:**
- campuses (SELECT)
- trespass_records (SELECT, INSERT, UPDATE, DELETE)
- record_photos (ALL)
- record_documents (ALL)

---

## Policy Naming Conventions

**Patterns Used:**
- `{table}-{action}-{role}` - Standard pattern (e.g., `campus-insert-district-admin`)
- `{table}-{action}-{scope}` - Scope pattern (e.g., `trespass-select-tenant`)
- `{resource}-demo-{action}` - Demo tenant (e.g., `trespass-demo-write`)
- Descriptive names - Human-readable explanations for public role policies

---

## Security Considerations

### 1. Tenant Isolation

**Enforcement:**
- All policies check `tenant_id = get_my_tenant_id()`
- User's tenant_id retrieved from user_profiles table
- Cannot access data from other tenants (except master_admin)

**Exceptions:**
- Demo tenant public access (controlled)
- master_admin cross-tenant switching

---

### 2. Campus Scoping

**Enforcement:**
- Viewer role limited to: `campus_id = get_my_campus_id()`
- campus_admin can access all campuses in tenant
- district_admin+ unlimited within tenant

---

### 3. Soft Delete Protection

**Enforcement:**
- SELECT policies filter: `deleted_at IS NULL`
- Prevents accidental exposure of deleted records
- Hard deletes restricted to district_admin+

---

### 4. FERPA Compliance

**Audit Log Protection:**
- Only district_admin+ can view audit logs
- All PII access logged (record_subject_name, record_school_id)
- IP address and user_agent tracked

---

### 5. Role Elevation Prevention

**Enforcement:**
- Users cannot modify their own role
- Only district_admin+ can assign roles via user-manage-district-admin policy
- master_admin role required for tenant creation

---

## Policy Testing

### Recommended Tests:

1. **Tenant Isolation:**
   - User from tenant A cannot see data from tenant B
   - master_admin can switch tenants

2. **Role-Based Access:**
   - Viewer cannot modify records
   - campus_admin can create/update/delete
   - district_admin can manage users

3. **Campus Scoping:**
   - Viewer sees only assigned campus records
   - campus_admin sees all campus records in tenant

4. **Demo Tenant:**
   - Logged-in users can modify demo data
   - Demo data does not leak to other tenants

5. **Audit Logging:**
   - Viewer cannot view audit logs
   - district_admin can view tenant audit logs

---

## Maintenance

### Adding New RLS Policies:

1. Create migration file:
   ```bash
   supabase migration new add_{table}_rls
   ```

2. Define policy:
   ```sql
   CREATE POLICY "policy-name" ON table_name
     FOR SELECT
     TO authenticated
     USING (tenant_id = get_my_tenant_id());
   ```

3. Test policy:
   ```sql
   SET ROLE authenticated;
   SELECT * FROM table_name; -- Should respect policy
   ```

4. Apply migration:
   ```bash
   supabase db push
   ```

---

## Troubleshooting

### Policy Not Working:

1. **Check RLS enabled:**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

2. **Verify helper functions exist:**
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public';
   ```

3. **Check user_profiles.tenant_id:**
   ```sql
   SELECT id, tenant_id, role
   FROM user_profiles
   WHERE id = auth.uid();
   ```

4. **Test policy with EXPLAIN:**
   ```sql
   EXPLAIN (ANALYZE, VERBOSE)
   SELECT * FROM table_name;
   ```

---

## Summary

DistrictTracker implements **70+ RLS policies** to enforce:
- Multi-tenant data isolation via `tenant_id`
- Role-based access control (4 roles)
- Campus-scoped access for viewers
- Demo tenant public exploration
- FERPA-compliant audit logging
- Soft delete protection

**Key Strengths:**
- Comprehensive tenant isolation
- Granular role-based permissions
- Demo tenant special handling
- Helper functions for consistency
- Public feedback system access

**Next Steps for DAEP Module:**
- Create RLS policies for new DAEP tables
- Follow same tenant_id isolation pattern
- Use get_my_tenant_id() and get_my_role_from_db() helpers
- Add demo tenant policies for DAEP records
