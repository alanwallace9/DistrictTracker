# Data Models & Database Schema

**Project:** DistrictTracker
**Database:** Supabase PostgreSQL
**Last Updated:** 2025-11-23
**Total Migrations:** 29

---

## Overview

DistrictTracker uses a **multi-tenant PostgreSQL database** hosted on Supabase with Row-Level Security (RLS) enabled on all tables. The schema supports two primary modules: **TrespassTracker** and **DAEPManagement** (in development).

**Key Architecture Patterns:**
- Multi-tenant isolation via `tenant_id` column + RLS policies
- Soft deletes (`deleted_at` timestamps) for audit compliance
- Comprehensive audit logging (`admin_audit_log` table)
- Role-based access control (viewer, campus_admin, district_admin, super_admin, daep_admin_l1, daep_admin_l2, daep_staff, counselor, parent, student)
- Foreign key constraints for data integrity

**Reference:** Detailed schema documentation in `modules/TrespassTracker/docs/planning/DATABASE_SCHEMA.md`

---

## Core Tables

### 1. `tenants`

**Purpose:** Organization/district definitions for multi-tenant architecture

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | text | No | Primary key (e.g., 'birdville', 'demo') |
| `subdomain` | text | No | Subdomain for routing (unique) |
| `display_name` | text | No | Human-readable name (e.g., 'Birdville ISD') |
| `status` | text | No | 'active', 'suspended', or 'trial' |
| `created_at` | timestamptz | No | Record creation timestamp |
| `updated_at` | timestamptz | No | Record update timestamp |

**RLS:** Enabled
**Current Records:** 2 (birdville, demo)

**Indexes:**
- Primary key on `id`
- Unique index on `subdomain`

---

### 2. `campuses`

**Purpose:** Campus/school locations within a tenant (district)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key (auto-generated) |
| `tenant_id` | text | No | Foreign key to `tenants.id` |
| `name` | text | No | Campus name |
| `address` | text | Yes | Physical address |
| `created_at` | timestamptz | No | Record creation timestamp |
| `updated_at` | timestamptz | No | Record update timestamp |

**RLS:** Enabled (filtered by `tenant_id`)

**Relationships:**
- `tenant_id` → `tenants.id` (CASCADE on delete)
- Referenced by `user_profiles.campus_id`
- Referenced by `trespass_records.campus_id`

---

### 3. `user_profiles`

**Purpose:** User accounts synced from Clerk with role and tenant assignments

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | text | No | Primary key (Clerk user ID) |
| `email` | text | No | User email address |
| `role` | text | No | 'viewer', 'campus_admin', 'district_admin', 'super_admin', 'daep_admin_l1', 'daep_admin_l2', 'daep_staff', 'counselor', 'parent', 'student' |
| `tenant_id` | text | No | Foreign key to `tenants.id` |
| `campus_id` | uuid | Yes | Foreign key to `campuses.id` (required for campus_admin) |
| `display_name` | text | Yes | User's display name |
| `theme` | text | Yes | UI theme preference ('light', 'dark', 'system') |
| `notification_preferences` | jsonb | Yes | Email/push notification settings |
| `display_organization` | text | Yes | Organization name for feedback display |
| `show_organization` | boolean | Yes | Whether to show organization in public areas |
| `created_at` | timestamptz | No | Record creation timestamp |
| `updated_at` | timestamptz | No | Record update timestamp |

**RLS:** Enabled (filtered by `tenant_id` and user permissions)

**Relationships:**
- `tenant_id` → `tenants.id`
- `campus_id` → `campuses.id` (SET NULL on delete)

**Sync Source:** Clerk webhooks (`/api/webhooks/clerk`)

---

### 4. `trespass_records` (TrespassTracker Module)

**Purpose:** Core table for tracking trespass incidents and banned individuals

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key (auto-generated) |
| `tenant_id` | text | No | Foreign key to `tenants.id` |
| `campus_id` | uuid | Yes | Foreign key to `campuses.id` |
| `first_name` | text | No | Individual's first name |
| `last_name` | text | No | Individual's last name |
| `date_of_birth` | date | Yes | Date of birth |
| `school_id` | text | Yes | Student/staff ID number |
| `is_current_student` | boolean | Yes | Whether individual is currently a student |
| `trespassed_from` | text | No | Location/campus individual is banned from |
| `incident_date` | date | No | Date of incident |
| `incident_time` | time | Yes | Time of incident |
| `incident_description` | text | No | Description of incident |
| `incident_location` | text | Yes | Specific location of incident |
| `police_notified` | boolean | No | Whether police were notified |
| `police_report_number` | text | Yes | Police report number if applicable |
| `affiliation` | text | Yes | Known affiliations or associates |
| `school_contact` | text | Yes | School contact information |
| `photo` | text | Yes | Photo URL (data URL or Supabase Storage URL) |
| `notes` | text | Yes | Additional notes |
| `is_daep` | boolean | Yes | DAEP placement flag (DAEPManagement integration) |
| `daep_expiration_date` | date | Yes | DAEP placement expiration |
| `created_at` | timestamptz | No | Record creation timestamp |
| `updated_at` | timestamptz | No | Record update timestamp |
| `deleted_at` | timestamptz | Yes | Soft delete timestamp (for FERPA compliance) |
| `version` | integer | No | Version number for optimistic locking |

**RLS:** Enabled (tenant + role-based access)

**Relationships:**
- `tenant_id` → `tenants.id` (CASCADE on delete)
- `campus_id` → `campuses.id` (SET NULL on delete)
- Referenced by `record_photos.record_id`
- Referenced by `record_documents.record_id`

**Indexes:**
- Primary key on `id`
- Index on `tenant_id`
- Index on `campus_id`
- Index on `deleted_at` (for filtering soft-deleted records)
- Full-text search index on name fields

---

### 5. `record_photos`

**Purpose:** Additional photo attachments for trespass records

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key (auto-generated) |
| `record_id` | uuid | No | Foreign key to `trespass_records.id` |
| `tenant_id` | text | No | Foreign key to `tenants.id` |
| `photo_url` | text | No | Supabase Storage URL |
| `caption` | text | Yes | Photo caption/description |
| `uploaded_by` | text | Yes | User ID who uploaded |
| `created_at` | timestamptz | No | Upload timestamp |

**RLS:** Enabled (filtered by `tenant_id`)

**Relationships:**
- `record_id` → `trespass_records.id` (CASCADE on delete)
- `tenant_id` → `tenants.id` (CASCADE on delete)

---

### 6. `record_documents`

**Purpose:** Document attachments (PDFs, Word docs, etc.) for trespass records

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key (auto-generated) |
| `record_id` | uuid | No | Foreign key to `trespass_records.id` |
| `tenant_id` | text | No | Foreign key to `tenants.id` |
| `document_url` | text | No | Supabase Storage URL |
| `filename` | text | No | Original filename |
| `file_type` | text | Yes | MIME type |
| `file_size` | integer | Yes | File size in bytes |
| `uploaded_by` | text | Yes | User ID who uploaded |
| `created_at` | timestamptz | No | Upload timestamp |

**RLS:** Enabled (filtered by `tenant_id`)

**Relationships:**
- `record_id` → `trespass_records.id` (CASCADE on delete)
- `tenant_id` → `tenants.id` (CASCADE on delete)

---

### 7. `admin_audit_log`

**Purpose:** Comprehensive audit trail for FERPA compliance and security

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key (auto-generated) |
| `tenant_id` | text | Yes | Foreign key to `tenants.id` (null for system events) |
| `event_type` | text | No | Event category (e.g., 'record.created', 'user.updated') |
| `actor_id` | text | Yes | User ID performing action |
| `actor_email` | text | Yes | Actor's email (for PII tracking) |
| `actor_role` | text | Yes | Actor's role at time of action |
| `target_id` | text | Yes | ID of affected resource |
| `action` | text | No | Human-readable action description |
| `record_subject_name` | text | Yes | Subject name for record-related events (PII) |
| `record_school_id` | text | Yes | School ID for record-related events (PII) |
| `details` | jsonb | Yes | Additional event details |
| `ip_address` | text | Yes | Actor's IP address |
| `user_agent` | text | Yes | Actor's user agent |
| `created_at` | timestamptz | No | Event timestamp |

**RLS:** Enabled (district_admin+ only, filtered by `tenant_id`)

**Purpose:** FERPA-compliant audit logging with PII protection

**Event Types:**
- `record.created`, `record.updated`, `record.deleted`, `record.restored`
- `user.created`, `user.updated`, `user.deleted`
- `campus.created`, `campus.updated`, `campus.deleted`
- `feedback.created`, `feedback.upvoted`, `feedback.commented`
- `admin.tenant_switched`, `admin.demo_reset`

---

## Feedback System Tables

### 8. `feedback_categories`

**Purpose:** Categorization for feedback submissions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key |
| `name` | text | No | Category name (e.g., 'Feature Request', 'Bug Report') |
| `slug` | text | No | URL-friendly slug |
| `icon` | text | Yes | Icon identifier |
| `display_order` | integer | No | Sort order |
| `is_active` | boolean | No | Whether category is active |

**RLS:** Public read access

---

### 9. `feedback_submissions`

**Purpose:** Feature requests and bug reports from users

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key |
| `user_id` | text | Yes | Foreign key to `user_profiles.id` (null for anonymous) |
| `category_id` | uuid | No | Foreign key to `feedback_categories.id` |
| `title` | text | No | Feedback title (5-100 chars) |
| `description` | text | No | Detailed description (10-2000 chars) |
| `status` | text | No | 'open', 'in_progress', 'completed', 'declined' |
| `upvote_count` | integer | No | Cached upvote count |
| `is_public` | boolean | No | Whether feedback is public |
| `admin_response` | text | Yes | Admin reply |
| `attachments` | text[] | Yes | Array of attachment URLs |
| `created_at` | timestamptz | No | Submission timestamp |
| `updated_at` | timestamptz | No | Last update timestamp |

**RLS:** Public read (if `is_public`), authenticated write

---

### 10. `feedback_upvotes`

**Purpose:** User upvotes on feedback submissions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key |
| `feedback_id` | uuid | No | Foreign key to `feedback_submissions.id` |
| `user_id` | text | Yes | User ID (null for anonymous) |
| `ip_address` | text | Yes | IP for anonymous upvotes |
| `created_at` | timestamptz | No | Upvote timestamp |

**RLS:** Public read, authenticated write

**Constraints:**
- Unique constraint on `(feedback_id, user_id)` - one upvote per user
- Unique constraint on `(feedback_id, ip_address)` - one upvote per IP (anonymous)

---

### 11. `feedback_comments`

**Purpose:** Comments on feedback submissions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key |
| `feedback_id` | uuid | No | Foreign key to `feedback_submissions.id` |
| `user_id` | text | No | Foreign key to `user_profiles.id` |
| `content` | text | No | Comment content (1-1000 chars) |
| `is_admin` | boolean | No | Whether comment is from admin |
| `created_at` | timestamptz | No | Comment timestamp |
| `updated_at` | timestamptz | No | Last edit timestamp |

**RLS:** Public read, authenticated write

---

## Support Tables

### 12. `pending_invitations`

**Purpose:** Track Clerk invitations before user accepts

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key |
| `tenant_id` | text | No | Foreign key to `tenants.id` |
| `email` | text | No | Invitee email |
| `role` | text | No | Assigned role |
| `campus_id` | uuid | Yes | Assigned campus |
| `invited_by` | text | No | User ID of inviter |
| `status` | text | No | 'pending', 'accepted', 'expired' |
| `accepted_at` | timestamptz | Yes | Acceptance timestamp |
| `created_at` | timestamptz | No | Invitation timestamp |
| `updated_at` | timestamptz | No | Last update timestamp |

**RLS:** Enabled (district_admin+ only, filtered by `tenant_id`)

---

### 13. `demo_seed_snapshots`

**Purpose:** Snapshots of demo tenant data for scheduled resets

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key |
| `snapshot_data` | jsonb | No | Complete demo data snapshot |
| `created_by` | text | Yes | User who created snapshot |
| `created_at` | timestamptz | No | Snapshot timestamp |

**RLS:** Disabled (admin operations only)

---

### 14. `waitlist`

**Purpose:** Public waitlist for new tenant signups

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid | No | Primary key |
| `email` | text | No | Waitlist email (unique) |
| `organization_name` | text | Yes | Organization name |
| `referral_source` | text | Yes | How they heard about us |
| `status` | text | No | 'pending', 'contacted', 'onboarded' |
| `created_at` | timestamptz | No | Signup timestamp |

**RLS:** Public insert, admin read/update

---

## Row-Level Security (RLS) Policies

All tables have RLS enabled with the following access patterns:

### Viewer Role
- **Read:** Records from assigned campus only
- **Write:** None

### Campus Admin Role
- **Read:** Records from assigned campus
- **Write:** Create/update/delete records in assigned campus
- **Audit Log:** Cannot access

### District Admin Role
- **Read:** All records in tenant
- **Write:** Full CRUD within tenant
- **Audit Log:** Read access to tenant audit log

### Master Admin Role
- **Read:** All records across all tenants (via tenant switching)
- **Write:** Full CRUD + tenant management
- **Audit Log:** Full access to all audit logs

**RLS Implementation:**
- Policies filter by `tenant_id` column
- Campus-scoped roles additionally filter by `campus_id`
- Supabase service role key bypasses RLS (used in server actions)

---

## Data Relationships

```
tenants
  ├─ campuses (one-to-many)
  ├─ user_profiles (one-to-many)
  └─ trespass_records (one-to-many)

campuses
  ├─ user_profiles (one-to-many) [campus_admin assignment]
  └─ trespass_records (one-to-many)

trespass_records
  ├─ record_photos (one-to-many)
  └─ record_documents (one-to-many)

feedback_submissions
  ├─ feedback_upvotes (one-to-many)
  └─ feedback_comments (one-to-many)
```

---

## TypeScript Type Definitions

**Location:** `lib/supabase.ts`

```typescript
export type TrespassRecord = {
  id: string;
  tenant_id: string;
  campus_id?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  school_id?: string;
  is_current_student?: boolean;
  trespassed_from: string;
  incident_date: string;
  incident_time?: string;
  incident_description: string;
  incident_location?: string;
  police_notified: boolean;
  police_report_number?: string;
  affiliation?: string;
  school_contact?: string;
  photo?: string;
  notes?: string;
  is_daep?: boolean;
  daep_expiration_date?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  version: number;
};

export type UserProfile = {
  id: string;
  email: string;
  role: 'viewer' | 'campus_admin' | 'district_admin' | 'super_admin' | 'daep_admin_l1' | 'daep_admin_l2' | 'daep_staff' | 'counselor' | 'parent' | 'student';
  tenant_id: string;
  campus_id?: string;
  display_name?: string;
  theme?: 'light' | 'dark' | 'system';
  created_at: string;
  updated_at: string;
};

// ... additional types
```

---

## Migration Strategy

**Total Migrations:** 29 files in `supabase/migrations/`

**Key Migrations:**
- `20251002154545` - Initial schema (user_profiles, roles)
- `20251003` - Campus support
- `20251012` - Record photos and documents
- `20251019` - Multi-tenancy architecture
- `20251026` - Campuses table
- `20251028` - Admin columns
- `20251109` - Version tracking (optimistic locking)
- `20251110` - Field renaming for clarity
- `20251116` - Demo seed snapshots
- `20251122` - Soft delete support

**Migration Management:**
- Migrations applied via Supabase CLI
- All DDL changes tracked in migration files
- No manual schema changes in production

---

## DAEPManagement Module (In Development)

**Planned Tables:**
- `daep_placements` - DAEP student placements
- `daep_programs` - DAEP program definitions
- `daep_attendance` - Daily attendance tracking
- `daep_progress_reports` - Student progress tracking

**Integration with TrespassTracker:**
- Shared `tenant_id` and `campus_id` hierarchy
- `trespass_records.is_daep` flag links records to DAEP placements
- Cross-module queries via shared Supabase client

---

## Data Integrity & Constraints

**Foreign Key Constraints:**
- All `tenant_id` references enforce CASCADE DELETE
- `campus_id` references use SET NULL on delete (preserves historical records)
- Record photos/documents CASCADE DELETE with parent record

**Check Constraints:**
- `tenants.status` IN ('active', 'suspended', 'trial')
- `user_profiles.role` IN (allowed roles)
- Date fields validated at application layer (Zod schemas)

**Unique Constraints:**
- `tenants.subdomain` - Unique subdomains for routing
- `feedback_upvotes.(feedback_id, user_id)` - One upvote per user
- `waitlist.email` - One signup per email

---

## Backup & Recovery

**Supabase Managed Backups:**
- Daily automated backups
- Point-in-time recovery available
- Retention: 7 days (free tier), 30+ days (pro tier)

**Manual Snapshots:**
- `demo_seed_snapshots` table for demo resets
- Admin can create snapshots via `/api/admin/update-demo-snapshot`

---

## Performance Considerations

**Indexes:**
- Primary keys on all `id` columns
- Foreign key indexes on `tenant_id`, `campus_id`
- Full-text search indexes on trespass_records name fields
- Index on `deleted_at` for soft delete filtering

**Query Optimization:**
- RLS policies use indexed columns (`tenant_id`)
- Supabase connection pooling via `@supabase/ssr`
- Server Actions batch related queries

**Recommendations:**
- Add composite indexes on commonly filtered combinations
- Monitor slow queries via Supabase dashboard
- Consider materialized views for complex reports

---

## Summary

DistrictTracker's data model is designed for **multi-tenant SaaS** with strong isolation, audit compliance (FERPA), and modular extensibility. The schema supports the operational TrespassTracker module while providing hooks for the in-development DAEPManagement module through shared tenant/campus hierarchy and cross-reference fields.

**Key Strengths:**
- Multi-tenant architecture with RLS
- FERPA-compliant audit logging
- Soft deletes for data retention
- Type-safe TypeScript definitions
- Comprehensive foreign key constraints
