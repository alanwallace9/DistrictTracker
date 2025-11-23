# TrespassTracker Database Schema Reference

**Project:** TrespassTracker
**Database:** Supabase PostgreSQL
**Last Updated:** 2025-11-02
**Total Tables:** 7
**Total Records:** 234 (across all tables)

---

## Table of Contents

1. [Overview](#overview)
2. [Multi-Tenancy Architecture](#multi-tenancy-architecture)
3. [Tables](#tables)
   - [tenants](#tenants)
   - [campuses](#campuses)
   - [user_profiles](#user_profiles)
   - [trespass_records](#trespass_records)
   - [record_photos](#record_photos)
   - [record_documents](#record_documents)
   - [admin_audit_log](#admin_audit_log)
4. [Relationships](#relationships)
5. [Data Types Reference](#data-types-reference)
6. [TypeScript Type Definitions](#typescript-type-definitions)

---

## Overview

The TrespassTracker database uses a multi-tenant architecture with Row Level Security (RLS) enabled on all tables. The schema is designed to track trespass incidents across multiple school districts, with support for campus-level organization, user management, and FERPA-compliant audit logging.

**Key Features:**
- Multi-tenant isolation (tenant-scoped data)
- Soft deletes (deleted_at timestamps)
- Role-based access control (viewer, campus_admin, district_admin, master_admin)
- Foreign key constraints for data integrity
- Comprehensive audit logging
- File attachments (photos and documents)

---

## Multi-Tenancy Architecture

**Tenant Hierarchy:**
```
Tenant (e.g., "Birdville ISD")
  ├── Campuses (e.g., "Birdville High School", "North Elementary")
  ├── Users (assigned to tenant and optionally to campus)
  └── Trespass Records (assigned to tenant and optionally to campus)
```

**Isolation:**
- All queries filtered by `tenant_id`
- RLS policies enforce tenant boundaries
- Foreign key constraints prevent cross-tenant references

---

## Tables

### tenants

**Purpose:** Organization/district definitions for multi-tenant support

**Row Level Security:** ✅ Enabled

**Current Records:** 2

**Columns:**

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | text | ❌ | - | PRIMARY KEY | Tenant identifier (e.g., 'birdville', 'demo') |
| `subdomain` | text | ❌ | - | UNIQUE | Subdomain for routing (e.g., 'birdville') |
| `display_name` | text | ❌ | - | - | Human-readable name (e.g., 'Birdville ISD') |
| `status` | text | ❌ | 'active' | CHECK: active \| suspended \| trial | Tenant account status |
| `created_at` | timestamptz | ❌ | now() | - | Record creation timestamp |
| `updated_at` | timestamptz | ❌ | now() | - | Record update timestamp |

**Primary Key:** `id`

**Unique Constraints:**
- `subdomain` (UNIQUE)

**Check Constraints:**
- `status IN ('active', 'suspended', 'trial')`

**Foreign Keys (Referenced By):**
- `campuses.tenant_id` → `tenants.id`
- `user_profiles.tenant_id` → `tenants.id`
- `trespass_records.tenant_id` → `tenants.id`

**Example Data:**
```json
{
  "id": "birdville",
  "subdomain": "birdville",
  "display_name": "Birdville ISD",
  "status": "active",
  "created_at": "2025-10-01T00:00:00Z",
  "updated_at": "2025-10-01T00:00:00Z"
}
```

**RLS Policies:**
- All authenticated users can view tenants (SELECT)
- Only master_admin can modify tenants (INSERT, UPDATE, DELETE)

---

### campuses

**Purpose:** School campus definitions within a district

**Row Level Security:** ✅ Enabled

**Current Records:** 33

**Columns:**

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | text | ❌ | - | PRIMARY KEY | Campus identifier (e.g., '101', '116', 'bhs') |
| `tenant_id` | text | ❌ | - | FOREIGN KEY → tenants.id | Parent tenant/district |
| `name` | text | ❌ | - | - | Human-readable campus name |
| `abbreviation` | text | ✅ | null | - | Short name or code (e.g., 'BHS', 'NES') |
| `status` | text | ❌ | 'active' | CHECK: active \| inactive | Campus operational status |
| `created_at` | timestamptz | ❌ | now() | - | Record creation timestamp |
| `updated_at` | timestamptz | ❌ | now() | - | Record update timestamp |
| `deleted_at` | timestamptz | ✅ | null | - | Soft delete timestamp (NULL = active) |

**Primary Key:** `id`

**Foreign Keys:**
- `tenant_id` → `tenants.id` (fk_campuses_tenant)

**Foreign Keys (Referenced By):**
- `user_profiles.campus_id` → `campuses.id`
- `trespass_records.campus_id` → `campuses.id` (ON DELETE RESTRICT)

**Check Constraints:**
- `status IN ('active', 'inactive')`

**Indexes:**
- `idx_campuses_tenant_id` on `tenant_id`
- `idx_campuses_status` on `status`
- `idx_campuses_deleted_at` on `deleted_at`

**Example Data:**
```json
{
  "id": "116",
  "tenant_id": "birdville",
  "name": "ACFT ES",
  "abbreviation": "ACFT",
  "status": "active",
  "created_at": "2025-10-27T00:00:00Z",
  "updated_at": "2025-10-27T00:00:00Z",
  "deleted_at": null
}
```

**RLS Policies:**
- Users can view campuses from their tenant (SELECT)
- district_admin and master_admin can create campuses for their tenant (INSERT)
- district_admin and master_admin can update campuses from their tenant (UPDATE)
- master_admin can delete campuses from their tenant (DELETE)

**Soft Delete:**
- Records are soft-deleted by setting `deleted_at` timestamp
- Queries filter with `WHERE deleted_at IS NULL`
- Can be restored by setting `deleted_at = NULL`

---

### user_profiles

**Purpose:** User account information with roles and campus assignments

**Row Level Security:** ✅ Enabled

**Current Records:** 2

**Columns:**

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | text | ❌ | - | PRIMARY KEY | Clerk user ID (e.g., 'user_2abc...') |
| `tenant_id` | text | ❌ | - | FOREIGN KEY → tenants.id | Organization identifier |
| `email` | text | ✅ | null | - | User email from Clerk |
| `first_name` | text | ✅ | null | - | User first name |
| `last_name` | text | ✅ | null | - | User last name |
| `display_name` | text | ✅ | null | - | Display name override |
| `role` | text | ❌ | 'viewer' | CHECK: viewer \| campus_admin \| district_admin \| master_admin | User permission level |
| `campus_id` | text | ✅ | null | FOREIGN KEY → campuses.id | Campus assignment (for campus_admin) |
| `theme` | text | ❌ | 'light' | CHECK: light \| dark \| system | UI theme preference |
| `status` | text | ✅ | 'active' | CHECK: active \| inactive \| invited | Account status |
| `notifications_enabled` | boolean | ✅ | true | - | Whether user receives expiration notifications |
| `deleted_at` | timestamptz | ✅ | null | - | Soft delete timestamp (NULL = active) |
| `created_at` | timestamptz | ✅ | now() | - | Record creation timestamp |
| `updated_at` | timestamptz | ✅ | now() | - | Record update timestamp |

**Primary Key:** `id`

**Foreign Keys:**
- `tenant_id` → `tenants.id` (fk_user_profiles_tenant)
- `campus_id` → `campuses.id` (optional, for campus_admin users)

**Check Constraints:**
- `role IN ('viewer', 'campus_admin', 'district_admin', 'master_admin')`
- `theme IN ('light', 'dark', 'system')`
- `status IN ('active', 'inactive', 'invited')`

**Indexes:**
- `idx_user_profiles_tenant_id` on `tenant_id`
- `idx_user_profiles_campus_id` on `campus_id`
- `idx_user_profiles_deleted_at` on `deleted_at`

**Example Data:**
```json
{
  "id": "user_2abc123def456",
  "tenant_id": "birdville",
  "email": "john.smith@birdvilleschools.net",
  "first_name": "John",
  "last_name": "Smith",
  "display_name": "John S.",
  "role": "district_admin",
  "campus_id": null,
  "theme": "light",
  "status": "active",
  "notifications_enabled": true,
  "deleted_at": null,
  "created_at": "2025-10-01T00:00:00Z",
  "updated_at": "2025-10-01T00:00:00Z"
}
```

**Role Descriptions:**
- **viewer:** Read-only access to records
- **campus_admin:** Can manage records for their assigned campus only
- **district_admin:** Can manage all records and users within their tenant
- **master_admin:** Full access across all tenants (system administrator)

**RLS Policies:**
- Users can view their own profile (SELECT)
- master_admin can view all profiles in any tenant (SELECT)
- district_admin and master_admin can create/update user profiles (INSERT, UPDATE)
- master_admin can delete user profiles (DELETE)

---

### trespass_records

**Purpose:** Trespass incident records for individuals

**Row Level Security:** ✅ Enabled

**Current Records:** 136

**Columns:**

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | uuid | ❌ | gen_random_uuid() | PRIMARY KEY | Unique record identifier |
| `tenant_id` | text | ❌ | - | FOREIGN KEY → tenants.id | Tenant identifier (required) |
| `campus_id` | text | ✅ | null | FOREIGN KEY → campuses.id | Campus assignment (optional) |
| `user_id` | text | ❌ | - | - | Clerk user ID of record creator |
| `school_id` | text | ❌ | - | - | Student ID number |
| `first_name` | text | ❌ | - | - | Subject first name |
| `last_name` | text | ❌ | - | - | Subject last name |
| `aka` | text | ✅ | null | - | Also known as / aliases |
| `date_of_birth` | date | ✅ | null | - | Subject date of birth |
| `is_former_student` | boolean | ✅ | false | - | Whether subject was a student |
| `incident_date` | date | ✅ | null | - | When incident occurred |
| `expiration_date` | date | ❌ | - | - | When trespass order expires |
| `location` | text | ✅ | null | - | Incident location (free text) |
| `trespassed_from` | text | ❌ | 'All District Properties' | - | Specific locations banned from |
| `description` | text | ✅ | null | - | Incident description |
| `notes` | text | ✅ | null | - | Additional notes |
| `known_associates` | text | ✅ | null | - | Known associates |
| `current_school` | text | ✅ | null | - | Current school (if applicable) |
| `guardian_first_name` | text | ✅ | null | - | Guardian first name |
| `guardian_last_name` | text | ✅ | null | - | Guardian last name |
| `guardian_phone` | text | ✅ | null | - | Guardian phone number |
| `contact_info` | text | ✅ | null | - | Additional contact info |
| `photo_url` | text | ✅ | null | - | Legacy photo URL (deprecated) |
| `original_image_url` | text | ✅ | null | - | Original uploaded image URL |
| `cached_image_url` | text | ✅ | null | - | Cached/optimized image URL |
| `status` | text | ❌ | 'active' | - | Record status: active \| inactive |
| `created_at` | timestamptz | ✅ | now() | - | Record creation timestamp |
| `updated_at` | timestamptz | ✅ | now() | - | Record update timestamp |

**Primary Key:** `id`

**Foreign Keys:**
- `tenant_id` → `tenants.id` (fk_trespass_records_tenant)
- `campus_id` → `campuses.id` (fk_trespass_records_campus, ON DELETE RESTRICT)

**Foreign Keys (Referenced By):**
- `record_photos.record_id` → `trespass_records.id`
- `record_documents.record_id` → `trespass_records.id`

**Indexes:**
- `idx_trespass_records_tenant_id` on `tenant_id`
- `idx_trespass_records_campus_id` on `campus_id`
- `idx_trespass_records_tenant_campus_status` on `(tenant_id, campus_id, status)`
- `idx_trespass_records_user_id` on `user_id`
- `idx_trespass_records_incident_date` on `incident_date DESC`
- `idx_trespass_records_status` on `status`

**Example Data:**
```json
{
  "id": "ca549114-00d3-4523-81a5-7c33382d48a0",
  "tenant_id": "birdville",
  "campus_id": "116",
  "user_id": "user_2abc123",
  "school_id": "557907",
  "first_name": "Dean",
  "last_name": "Barnard",
  "aka": null,
  "date_of_birth": "2005-03-15",
  "is_former_student": true,
  "incident_date": "2025-10-15",
  "expiration_date": "2026-10-15",
  "location": null,
  "trespassed_from": "All district properties",
  "description": "Incident description here...",
  "notes": "Additional notes...",
  "known_associates": null,
  "current_school": null,
  "guardian_first_name": "Jane",
  "guardian_last_name": "Barnard",
  "guardian_phone": "(555) 123-4567",
  "contact_info": null,
  "photo_url": null,
  "original_image_url": null,
  "cached_image_url": null,
  "status": "active",
  "created_at": "2025-10-27T02:36:53Z",
  "updated_at": "2025-10-27T02:36:53Z"
}
```

**RLS Policies:**
- Users can view records from their tenant (SELECT)
- campus_admin, district_admin, master_admin can create records for their tenant (INSERT)
- campus_admin, district_admin, master_admin can update records from their tenant (UPDATE)
- district_admin and master_admin can delete records from their tenant (DELETE)

**FERPA Compliance:**
- All record views logged to admin_audit_log
- PII fields include: first_name, last_name, date_of_birth, school_id
- Export functionality logs access to audit trail

---

### record_photos

**Purpose:** Photo attachments for trespass records

**Row Level Security:** ✅ Enabled

**Current Records:** 0

**Columns:**

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | uuid | ❌ | gen_random_uuid() | PRIMARY KEY | Unique photo identifier |
| `record_id` | uuid | ❌ | - | FOREIGN KEY → trespass_records.id | Parent record |
| `storage_path` | text | ❌ | - | - | Path in Supabase Storage |
| `file_name` | text | ❌ | - | - | Original filename |
| `file_size` | integer | ❌ | - | - | File size in bytes (max 2MB) |
| `mime_type` | text | ❌ | - | - | MIME type (image/jpeg, image/png, image/webp) |
| `display_order` | integer | ✅ | 0 | - | Display order (0 = primary photo) |
| `uploaded_by` | text | ❌ | - | - | Clerk user ID of uploader |
| `created_at` | timestamptz | ✅ | now() | - | Upload timestamp |
| `updated_at` | timestamptz | ✅ | now() | - | Update timestamp |

**Primary Key:** `id`

**Foreign Keys:**
- `record_id` → `trespass_records.id` (record_photos_record_id_fkey)

**Storage Location:**
- Bucket: `record-photos`
- Path format: `record-photos/{record_id}/{filename}`

**File Constraints:**
- Max size: 2MB (2,097,152 bytes)
- Allowed types: image/jpeg, image/png, image/webp

**Example Data:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "record_id": "ca549114-00d3-4523-81a5-7c33382d48a0",
  "storage_path": "record-photos/ca549114-00d3-4523-81a5-7c33382d48a0/photo1.jpg",
  "file_name": "photo1.jpg",
  "file_size": 524288,
  "mime_type": "image/jpeg",
  "display_order": 0,
  "uploaded_by": "user_2abc123",
  "created_at": "2025-10-27T10:00:00Z",
  "updated_at": "2025-10-27T10:00:00Z"
}
```

**RLS Policies:**
- Users can view photos for records they can access (SELECT)
- Admins can upload photos to records (INSERT)
- Admins can update photo metadata (UPDATE)
- Admins can delete photos (DELETE)

---

### record_documents

**Purpose:** Administrative document attachments for trespass records

**Row Level Security:** ✅ Enabled

**Current Records:** 0

**Columns:**

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | uuid | ❌ | gen_random_uuid() | PRIMARY KEY | Unique document identifier |
| `record_id` | uuid | ❌ | - | FOREIGN KEY → trespass_records.id | Parent record |
| `storage_path` | text | ❌ | - | - | Path in Supabase Storage |
| `file_name` | text | ❌ | - | - | Original filename |
| `file_size` | integer | ❌ | - | - | File size in bytes (max 5MB) |
| `mime_type` | text | ❌ | - | - | MIME type (application/pdf, etc.) |
| `document_type` | text | ❌ | 'trespass_warning' | - | Document category |
| `uploaded_by` | text | ❌ | - | - | Clerk user ID of uploader (admin) |
| `created_at` | timestamptz | ✅ | now() | - | Upload timestamp |
| `updated_at` | timestamptz | ✅ | now() | - | Update timestamp |

**Primary Key:** `id`

**Foreign Keys:**
- `record_id` → `trespass_records.id` (record_documents_record_id_fkey)

**Storage Location:**
- Bucket: `record-documents`
- Path format: `record-documents/{record_id}/{filename}`

**File Constraints:**
- Max size: 5MB (5,242,880 bytes)
- Allowed types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

**Document Types:**
- `trespass_warning` - Official trespass warning letter
- `court_order` - Court-issued order
- `police_report` - Police incident report
- `other` - Other administrative documents

**Example Data:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "record_id": "ca549114-00d3-4523-81a5-7c33382d48a0",
  "storage_path": "record-documents/ca549114-00d3-4523-81a5-7c33382d48a0/warning.pdf",
  "file_name": "trespass_warning_2025.pdf",
  "file_size": 1048576,
  "mime_type": "application/pdf",
  "document_type": "trespass_warning",
  "uploaded_by": "user_2abc123",
  "created_at": "2025-10-27T11:00:00Z",
  "updated_at": "2025-10-27T11:00:00Z"
}
```

**RLS Policies:**
- Admins can view documents for records they can access (SELECT)
- Admins can upload documents to records (INSERT)
- Admins can update document metadata (UPDATE)
- Admins can delete documents (DELETE)

---

### admin_audit_log

**Purpose:** FERPA-compliant audit trail for administrative actions

**Row Level Security:** ✅ Enabled

**Current Records:** 61

**Columns:**

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| `id` | uuid | ❌ | gen_random_uuid() | PRIMARY KEY | Unique log entry identifier |
| `tenant_id` | text | ✅ | null | - | Tenant ID for multi-tenancy filtering |
| `event_type` | text | ❌ | - | - | Event type (e.g., 'record.viewed', 'user.created') |
| `actor_id` | text | ❌ | - | - | ID of user who performed action |
| `actor_email` | text | ✅ | null | - | Email of user (for admin reference) |
| `actor_role` | text | ✅ | null | - | Role of user who performed action |
| `target_id` | text | ✅ | null | - | ID of affected resource |
| `action` | text | ❌ | - | - | Human-readable action description |
| `details` | jsonb | ✅ | null | - | Additional details (JSON) |
| `record_school_id` | text | ✅ | null | - | Student ID (for record actions) |
| `record_subject_name` | text | ✅ | null | - | Student name (for FERPA searches) |
| `ip_address` | inet | ✅ | null | - | Request IP address |
| `user_agent` | text | ✅ | null | - | Browser user agent |
| `created_at` | timestamptz | ✅ | now() | - | Log entry timestamp |

**Primary Key:** `id`

**Indexes:**
- `idx_audit_log_tenant_id` on `tenant_id`
- `idx_audit_log_event_type` on `event_type`
- `idx_audit_log_actor_id` on `actor_id`
- `idx_audit_log_created_at` on `created_at DESC`
- Full-text search index on `record_subject_name` (GIN + pg_trgm)

**Event Types:**

**Record Events:**
- `record.viewed` - Record was viewed/opened
- `record.created` - New record created
- `record.updated` - Record modified
- `record.deleted` - Record deleted

**User Events:**
- `user.created` - User account created
- `user.updated` - User profile updated
- `user.deleted` - User account deleted
- `user.invited` - User invitation sent
- `user.bulk_invited` - Bulk user invitations

**Campus Events:**
- `campus.created` - Campus created
- `campus.updated` - Campus modified
- `campus.activated` - Campus activated
- `campus.deactivated` - Campus deactivated
- `campus.users_exported` - User list exported
- `campus.records_exported` - Record list exported

**Example Data:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "birdville",
  "event_type": "record.viewed",
  "actor_id": "user_2abc123",
  "actor_email": "john.smith@birdvilleschools.net",
  "actor_role": "district_admin",
  "target_id": "ca549114-00d3-4523-81a5-7c33382d48a0",
  "action": "Viewed trespass record for Dean Barnard",
  "details": {
    "record_id": "ca549114-00d3-4523-81a5-7c33382d48a0",
    "school_id": "557907",
    "access_method": "detail_modal"
  },
  "record_school_id": "557907",
  "record_subject_name": "Dean Barnard",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-10-27T14:30:00Z"
}
```

**RLS Policies:**
- master_admin can view all audit logs (SELECT)
- district_admin can view logs from their tenant (SELECT)
- No INSERT/UPDATE/DELETE allowed (logs are immutable)

**FERPA Compliance:**
- All record access logged automatically
- Full-text search for student names
- Export capabilities for compliance reporting
- Immutable logs (no edits/deletes)

---

## Relationships

### Entity Relationship Diagram

```
tenants (1) ──┬── (N) campuses
              ├── (N) user_profiles
              └── (N) trespass_records

campuses (1) ─┬── (N) user_profiles (campus_admin only)
              └── (N) trespass_records

trespass_records (1) ─┬── (N) record_photos
                      └── (N) record_documents
```

### Foreign Key Constraints

**ON DELETE Behavior:**

| Source Table | Source Column | Target Table | Target Column | ON DELETE |
|--------------|---------------|--------------|---------------|-----------|
| campuses | tenant_id | tenants | id | CASCADE |
| user_profiles | tenant_id | tenants | id | CASCADE |
| user_profiles | campus_id | campuses | id | SET NULL |
| trespass_records | tenant_id | tenants | id | CASCADE |
| trespass_records | campus_id | campuses | id | **RESTRICT** |
| record_photos | record_id | trespass_records | id | CASCADE |
| record_documents | record_id | trespass_records | id | CASCADE |

**Important:** `trespass_records.campus_id` uses `ON DELETE RESTRICT`, preventing campus deletion if records exist.

---

## Data Types Reference

### PostgreSQL Types Used

| Type | PostgreSQL Type | Description | Example |
|------|-----------------|-------------|---------|
| text | text | Variable-length string | "John Doe" |
| uuid | uuid | Universal unique identifier | "550e8400-e29b-41d4-a716-..." |
| integer | int4 | 4-byte integer | 524288 |
| boolean | bool | True/false value | true |
| date | date | Calendar date | "2025-10-27" |
| timestamptz | timestamp with time zone | Timestamp with timezone | "2025-10-27T14:30:00Z" |
| jsonb | jsonb | Binary JSON | {"key": "value"} |
| inet | inet | IPv4 or IPv6 address | "192.168.1.100" |

### Enum Values (CHECK Constraints)

**tenant.status:**
- `active` - Tenant is operational
- `suspended` - Tenant access suspended
- `trial` - Tenant in trial period

**campuses.status:**
- `active` - Campus is operational
- `inactive` - Campus is deactivated

**user_profiles.role:**
- `viewer` - Read-only access
- `campus_admin` - Campus-level admin
- `district_admin` - District-level admin
- `master_admin` - System administrator

**user_profiles.theme:**
- `light` - Light mode
- `dark` - Dark mode
- `system` - Follow system preference

**user_profiles.status:**
- `active` - Account is active
- `inactive` - Account is disabled
- `invited` - Invitation sent, not yet accepted

**trespass_records.status:**
- `active` - Trespass order is active
- `inactive` - Trespass order is inactive/expired

**record_documents.document_type:**
- `trespass_warning` - Official warning letter
- `court_order` - Court order
- `police_report` - Police report
- `other` - Other documents

---

## TypeScript Type Definitions

### Complete Type Definitions

```typescript
// lib/supabase-types.ts

export type Tenant = {
  id: string;
  subdomain: string;
  display_name: string;
  status: 'active' | 'suspended' | 'trial';
  created_at: string;
  updated_at: string;
};

export type Campus = {
  id: string;
  tenant_id: string;
  name: string;
  abbreviation: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type UserProfile = {
  id: string;
  tenant_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: 'viewer' | 'campus_admin' | 'district_admin' | 'master_admin';
  campus_id: string | null;
  theme: 'light' | 'dark' | 'system';
  status: 'active' | 'inactive' | 'invited';
  notifications_enabled: boolean | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TrespassRecord = {
  id: string;
  tenant_id: string;
  campus_id: string | null;
  user_id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  aka: string | null;
  date_of_birth: string | null;
  is_former_student: boolean | null;
  incident_date: string | null;
  expiration_date: string;
  location: string | null;
  trespassed_from: string;
  description: string | null;
  notes: string | null;
  known_associates: string | null;
  current_school: string | null;
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  contact_info: string | null;
  photo_url: string | null;
  original_image_url: string | null;
  cached_image_url: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type RecordPhoto = {
  id: string;
  record_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  display_order: number | null;
  uploaded_by: string;
  created_at: string | null;
  updated_at: string | null;
};

export type RecordDocument = {
  id: string;
  record_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  document_type: 'trespass_warning' | 'court_order' | 'police_report' | 'other';
  uploaded_by: string;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminAuditLog = {
  id: string;
  tenant_id: string | null;
  event_type: string;
  actor_id: string;
  actor_email: string | null;
  actor_role: string | null;
  target_id: string | null;
  action: string;
  details: Record<string, any> | null;
  record_school_id: string | null;
  record_subject_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
};

// Extended types with relationships

export type CampusWithCounts = Campus & {
  user_count: number;
  record_count: number;
};

export type TrespassRecordWithRelations = TrespassRecord & {
  campus?: Campus;
  photos?: RecordPhoto[];
  documents?: RecordDocument[];
};

export type UserProfileWithCampus = UserProfile & {
  campus?: Campus;
};
```

---

## Query Examples

### Common Queries

**Get all active records for a tenant:**
```sql
SELECT * FROM trespass_records
WHERE tenant_id = 'birdville'
  AND status = 'active'
ORDER BY created_at DESC;
```

**Get campus with user and record counts:**
```sql
SELECT
  c.*,
  COUNT(DISTINCT u.id) FILTER (WHERE u.deleted_at IS NULL) as user_count,
  COUNT(DISTINCT r.id) as record_count
FROM campuses c
LEFT JOIN user_profiles u ON c.id = u.campus_id AND u.deleted_at IS NULL
LEFT JOIN trespass_records r ON c.id = r.campus_id
WHERE c.deleted_at IS NULL AND c.tenant_id = 'birdville'
GROUP BY c.id
ORDER BY c.name;
```

**Get all records expiring in next 7 days:**
```sql
SELECT * FROM trespass_records
WHERE tenant_id = 'birdville'
  AND status = 'active'
  AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY expiration_date ASC;
```

**Audit log: Get all record views by a user:**
```sql
SELECT * FROM admin_audit_log
WHERE tenant_id = 'birdville'
  AND event_type = 'record.viewed'
  AND actor_id = 'user_2abc123'
ORDER BY created_at DESC;
```

**Search records by student name (FERPA-compliant):**
```sql
SELECT * FROM trespass_records
WHERE tenant_id = 'birdville'
  AND (
    first_name ILIKE '%John%'
    OR last_name ILIKE '%Doe%'
  )
ORDER BY last_name, first_name;
```

---

## Indexes

### Performance Indexes

**trespass_records:**
- `idx_trespass_records_tenant_id` - Fast tenant filtering
- `idx_trespass_records_campus_id` - Fast campus filtering
- `idx_trespass_records_tenant_campus_status` - Composite for common queries
- `idx_trespass_records_status` - Status filtering
- `idx_trespass_records_incident_date` - Date sorting

**campuses:**
- `idx_campuses_tenant_id` - Tenant filtering
- `idx_campuses_status` - Status filtering
- `idx_campuses_deleted_at` - Soft delete queries

**user_profiles:**
- `idx_user_profiles_tenant_id` - Tenant filtering
- `idx_user_profiles_campus_id` - Campus filtering
- `idx_user_profiles_deleted_at` - Soft delete queries

**admin_audit_log:**
- `idx_audit_log_tenant_id` - Tenant filtering
- `idx_audit_log_event_type` - Event type filtering
- `idx_audit_log_actor_id` - User activity queries
- `idx_audit_log_created_at` - Chronological sorting
- Full-text search on `record_subject_name` (pg_trgm)

---

## Database Statistics

**Current State (2025-11-02):**

| Table | Record Count | RLS Enabled | Soft Delete |
|-------|--------------|-------------|-------------|
| tenants | 2 | ✅ | ❌ |
| campuses | 33 | ✅ | ✅ |
| user_profiles | 2 | ✅ | ✅ |
| trespass_records | 136 | ✅ | ❌ |
| record_photos | 0 | ✅ | ❌ |
| record_documents | 0 | ✅ | ❌ |
| admin_audit_log | 61 | ✅ | ❌ |
| **TOTAL** | **234** | - | - |

---

## Notes

**Multi-Tenancy:**
- All queries must filter by `tenant_id`
- RLS policies enforce tenant boundaries
- Service role bypasses RLS (use carefully in server actions)

**Soft Deletes:**
- `campuses` and `user_profiles` support soft delete
- Filter with `WHERE deleted_at IS NULL`
- Can be restored by setting `deleted_at = NULL`

**FERPA Compliance:**
- All record views logged to audit_log
- PII fields tracked in audit trail
- Export actions logged
- Full audit history maintained

**Foreign Key Constraints:**
- `trespass_records.campus_id` uses `ON DELETE RESTRICT`
- Cannot delete campus if records exist
- Must reassign records before campus deletion

**Clerk Integration:**
- User IDs from Clerk (format: `user_*`)
- Email and name synced from Clerk
- Metadata stored in `user_profiles`

---

**Document Version:** 1.0
**Last Updated:** 2025-11-02
**Database:** Supabase PostgreSQL (TrespassTracker)
**Project ID:** gnbxdjiibwjaurybohak
