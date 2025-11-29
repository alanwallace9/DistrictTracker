# API Contracts & Endpoints

**Project:** DistrictTracker
**Last Updated:** 2025-11-23
**Architecture:** Next.js App Router with Server Actions + REST API Routes

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [REST API Routes](#rest-api-routes)
4. [Server Actions](#server-actions)
5. [Webhooks](#webhooks)
6. [Rate Limiting](#rate-limiting)
7. [Error Handling](#error-handling)
8. [Data Validation](#data-validation)

---

## Overview

DistrictTracker uses a **hybrid API architecture**:
- **Server Actions** (`app/actions/`) - Primary method for mutations and data operations
- **REST API Routes** (`app/api/`) - Webhooks, cron jobs, and external integrations
- **Server Components** - Direct data fetching from Supabase in RSC

**Authentication:** Clerk (user) + Supabase RLS (data)
**Rate Limiting:** Upstash Redis-backed rate limiting on all endpoints
**Validation:** Zod schemas for input validation

---

## Authentication

### Authentication Flow

All API endpoints and server actions require authentication via Clerk:

```typescript
import { auth } from '@clerk/nextjs/server';

const { userId } = await auth();
if (!userId) {
  throw new Error('Unauthorized');
}
```

**Tenant Isolation:**
- Middleware extracts tenant from subdomain
- All queries filtered by `tenant_id` via Supabase RLS
- User's `tenant_id` in `user_profiles` table enforces isolation

**Role-Based Access:**
- `viewer` - Read-only access to assigned campus data
- `campus_admin` - Manage records for assigned campus
- `district_admin` - Manage all campuses in tenant
- `super_admin` - Full tenant administration + cross-tenant (demo switching)
- `daep_admin_l1` - DAEP program director, full DAEP module access
- `daep_admin_l2` - DAEP assistant admin/registrar
- `daep_staff` - DAEP teachers/aides, daily operations
- `counselor` - Cross-module student access
- `parent` - DAEP module, own child records
- `student` - DAEP module, own records

---

## REST API Routes

### Authentication & User Management

#### GET /api/auth/user-tenant

Get authenticated user's tenant information.

**Auth Required:** Yes (Clerk)

**Response:**
```json
{
  "tenantId": "birdville",
  "role": "district_admin",
  "campusId": "campus-123"
}
```

---

### Webhooks

#### POST /api/webhooks/clerk

Clerk user lifecycle webhook for syncing users to Supabase.

**Auth Required:** Svix webhook signature verification

**Events Handled:**
- `user.created` - Create user_profiles record
- `user.updated` - Update user_profiles record
- `user.deleted` - Delete user_profiles record

**Payload Example:**
```json
{
  "type": "user.created",
  "data": {
    "id": "user_abc123",
    "email_addresses": [...],
    "public_metadata": {
      "role": "campus_admin",
      "tenant_id": "birdville",
      "campus_id": "campus-123"
    }
  }
}
```

**Validation:**
- Role must be one of: `viewer`, `campus_admin`, `district_admin`, `super_admin`, `daep_admin_l1`, `daep_admin_l2`, `daep_staff`, `counselor`, `parent`, `student`
- `tenant_id` is required and must exist in `tenants` table
- `campus_id` required for `campus_admin` role
- Campus must belong to specified tenant

**Side Effects:**
- Creates/updates `user_profiles` record
- Logs to `admin_audit_log`
- Updates `pending_invitations` status
- Rate limited: 50 requests per 10 minutes per IP

**Response:**
- `200` - Webhook processed successfully
- `400` - Invalid signature, missing metadata, or validation failure
- `500` - Database error

---

### Admin Operations

#### GET /api/admin/get-demo-snapshot

Get current demo tenant snapshot metadata.

**Auth Required:** Yes (super_admin only)

**Response:**
```json
{
  "snapshotId": "snapshot-123",
  "createdAt": "2025-11-23T08:00:00Z",
  "recordCount": 234,
  "userCount": 12
}
```

---

#### POST /api/admin/reset-demo-now

Manually trigger demo tenant reset to snapshot state.

**Auth Required:** Yes (super_admin only)

**Response:**
- `200` - Reset initiated successfully
- `403` - Insufficient permissions

---

#### POST /api/admin/update-demo-snapshot

Create new snapshot of demo tenant for future resets.

**Auth Required:** Yes (super_admin only)

**Response:**
- `200` - Snapshot created successfully
- `403` - Insufficient permissions

---

### Cron Jobs

#### GET /api/cron/reset-demo

Scheduled job to reset demo tenant (runs daily at midnight).

**Auth Required:** Vercel Cron Secret header

**Rate Limited:** No (internal cron job)

**Response:**
- `200` - Demo reset successfully
- `401` - Invalid cron secret

---

## Server Actions

Server actions are the primary API for client-server communication in DistrictTracker. All actions use `'use server'` directive and are located in `app/actions/`.

### TrespassTracker Records

#### `createRecord(data)`

Create new trespass record.

**File:** `app/actions/records.ts`

**Auth Required:** Yes

**Validation:** `CreateRecordSchema` (Zod)

**Parameters:**
```typescript
{
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  school_id?: string;
  trespassed_from: string;
  incident_date: string;
  incident_time?: string;
  incident_description: string;
  police_notified: boolean;
  police_report_number?: string;
  photo_url?: string; // Auto-processed via image-storage.ts
  tenant_id: string; // Auto-injected from user context
  campus_id?: string;
}
```

**Response:** `TrespassRecord` object

**Side Effects:**
- Processes and stores photo URL if provided
- Logs to `admin_audit_log`
- Revalidates `/dashboard` path

**Rate Limited:** No (internal)

---

#### `updateRecord(id, data)`

Update existing trespass record.

**File:** `app/actions/records.ts`

**Auth Required:** Yes

**Validation:** `UpdateRecordSchema` (Zod)

**Parameters:** Partial `TrespassRecord` object

**Response:** Updated `TrespassRecord`

**Side Effects:**
- Updates record in `trespass_records` table
- Logs to `admin_audit_log`
- Revalidates `/dashboard` path

---

#### `deleteRecord(id)`

Soft delete trespass record (sets `deleted_at` timestamp).

**File:** `app/actions/records.ts`

**Auth Required:** Yes (campus_admin or higher)

**Response:** Success boolean

**Side Effects:**
- Sets `deleted_at` timestamp
- Logs to `admin_audit_log`
- Revalidates `/dashboard` path

---

#### `restoreRecord(id)`

Restore soft-deleted record.

**File:** `app/actions/admin/deleted-records.ts`

**Auth Required:** Yes (district_admin or higher)

**Response:** Restored `TrespassRecord`

**Side Effects:**
- Clears `deleted_at` timestamp
- Logs to `admin_audit_log`

---

### Feedback System

#### `submitFeedback(data)`

Submit new feature request or bug report.

**File:** `app/actions/feedback.ts`

**Auth Required:** Optional (authenticated users can edit/delete later)

**Validation:** `CreateFeedbackSchema` (Zod)

**Parameters:**
```typescript
{
  title: string; // 5-100 characters
  description: string; // 10-2000 characters
  category_id: string; // UUID of feedback_categories
  attachments?: string[]; // URLs
}
```

**Response:** `FeedbackSubmission` object

**Rate Limited:** Yes (5 submissions per 15 minutes per user/IP)

**Side Effects:**
- Creates `feedback_submissions` record
- Sends email notification to admins (if configured)
- Revalidates feedback pages

---

#### `upvoteFeedback(feedbackId)`

Upvote a feedback submission.

**File:** `app/actions/feedback.ts`

**Auth Required:** Optional (tracks by user ID or IP)

**Response:** Updated upvote count

**Rate Limited:** Yes (30 upvotes per hour per user/IP)

**Side Effects:**
- Creates/removes `feedback_upvotes` record
- Updates `upvote_count` on `feedback_submissions`
- Revalidates feedback pages

---

#### `addComment(feedbackId, content)`

Add comment to feedback submission.

**File:** `app/actions/feedback.ts`

**Auth Required:** Yes

**Validation:** `CreateCommentSchema` (Zod)

**Parameters:**
```typescript
{
  feedbackId: string;
  content: string; // 1-1000 characters
}
```

**Response:** `FeedbackComment` object

**Rate Limited:** Yes (10 comments per 10 minutes per user)

---

### User Management

#### `inviteUser(email, role, campusId?)`

Send user invitation via Clerk.

**File:** `app/actions/invite-user.ts`

**Auth Required:** Yes (district_admin or higher)

**Parameters:**
```typescript
{
  email: string;
  role: 'viewer' | 'campus_admin' | 'district_admin';
  campusId?: string; // Required for campus_admin
}
```

**Response:** Clerk invitation object

**Side Effects:**
- Creates Clerk invitation with metadata
- Records in `pending_invitations` table
- Logs to `admin_audit_log`

---

#### `bulkInviteUsers(invitations[])`

Bulk invite multiple users (CSV upload).

**File:** `app/actions/admin/bulk-invite-users.ts`

**Auth Required:** Yes (district_admin or higher)

**Parameters:** Array of invitation objects

**Response:**
```typescript
{
  successful: number;
  failed: number;
  errors: string[];
}
```

**Side Effects:**
- Processes CSV data
- Creates multiple Clerk invitations
- Logs to `admin_audit_log`

---

#### `updateUserRole(userId, role, campusId?)`

Update user's role and campus assignment.

**File:** `app/actions/admin/users.ts`

**Auth Required:** Yes (district_admin or higher)

**Response:** Updated `UserProfile`

**Side Effects:**
- Updates Clerk user metadata
- Updates `user_profiles` record (via webhook)
- Logs to `admin_audit_log`

---

### Campus Management

#### `createCampus(data)`

Create new campus within tenant.

**File:** `app/actions/campuses.ts`

**Auth Required:** Yes (district_admin or higher)

**Parameters:**
```typescript
{
  name: string;
  address?: string;
  tenant_id: string; // Auto-injected
}
```

**Response:** `Campus` object

**Side Effects:**
- Creates `campuses` record
- Logs to `admin_audit_log`

---

#### `updateCampus(id, data)`

Update campus information.

**File:** `app/actions/campuses.ts`

**Auth Required:** Yes (district_admin or higher)

**Response:** Updated `Campus`

---

#### `deleteCampus(id)`

Delete campus (only if no associated records).

**File:** `app/actions/campuses.ts`

**Auth Required:** Yes (district_admin or higher)

**Response:** Success boolean

**Side Effects:**
- Deletes `campuses` record (if no FK constraints)
- Logs to `admin_audit_log`

---

### File Operations

#### `uploadRecords(file)`

Bulk upload trespass records via CSV.

**File:** `app/actions/upload-records-enhanced.ts`

**Auth Required:** Yes (campus_admin or higher)

**Parameters:** CSV file (FormData)

**Response:**
```typescript
{
  imported: number;
  skipped: number;
  errors: string[];
}
```

**Side Effects:**
- Parses CSV with PapaParse
- Validates each row
- Creates multiple `trespass_records`
- Logs to `admin_audit_log`

---

#### `copyPhotosToSupabase()`

Migrate external photo URLs to Supabase Storage.

**File:** `app/actions/copy-photos.ts`

**Auth Required:** Yes (district_admin or higher)

**Response:** Migration status

**Side Effects:**
- Downloads external images
- Uploads to Supabase Storage
- Updates `photo_url` in `trespass_records`

---

### Admin Operations

#### `getTenantOverview()`

Get tenant statistics and overview.

**File:** `app/actions/admin/overview.ts`

**Auth Required:** Yes (district_admin or higher)

**Response:**
```typescript
{
  totalRecords: number;
  activeRecords: number;
  deletedRecords: number;
  totalCampuses: number;
  totalUsers: number;
  recordsByMonth: Array<{month: string, count: number}>;
}
```

---

#### `searchRecords(query, filters)`

Advanced search across trespass records.

**File:** `app/actions/admin/search-records.ts`

**Auth Required:** Yes

**Parameters:**
```typescript
{
  query: string;
  filters?: {
    campus_id?: string;
    start_date?: string;
    end_date?: string;
    status?: 'active' | 'former';
  }
}
```

**Response:** Array of `TrespassRecord` objects

---

#### `getAuditLogs(filters)`

Retrieve audit log entries.

**File:** `app/actions/admin/audit-logs.ts`

**Auth Required:** Yes (district_admin or higher)

**Parameters:**
```typescript
{
  startDate?: string;
  endDate?: string;
  eventType?: string;
  actorId?: string;
  limit?: number;
}
```

**Response:** Array of `AuditLogEntry` objects

---

### Tenant Management (Super Admin)

#### `switchTenant(tenantId)`

Switch super_admin context to different tenant.

**File:** `app/actions/admin/switch-tenant.ts`

**Auth Required:** Yes (super_admin only)

**Response:** Success boolean

**Side Effects:**
- Updates session context
- Logs to `admin_audit_log`

---

## Rate Limiting

All public-facing endpoints use Upstash Redis-based rate limiting.

**Configuration** (`lib/rate-limit.ts`):

```typescript
// Feedback actions
feedbackRateLimit: 5 requests per 15 minutes
upvoteRateLimit: 30 requests per 60 minutes
commentRateLimit: 10 requests per 10 minutes

// Webhooks
webhookRateLimit: 50 requests per 10 minutes

// General API
defaultRateLimit: 60 requests per 60 minutes
```

**Rate Limit Response:**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 120 // seconds
}
```
HTTP Status: `429 Too Many Requests`

---

## Error Handling

### Standard Error Response

```typescript
{
  error: string; // Human-readable error message
  code?: string; // Machine-readable error code
  details?: any; // Additional context
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Input validation failed |
| 401 | `UNAUTHORIZED` | No valid authentication |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict (e.g., duplicate) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

### Example Error Handling

```typescript
try {
  const record = await createRecord(data);
} catch (error) {
  if (error.message.includes('Validation failed')) {
    // Handle validation error
  } else if (error.message.includes('Unauthorized')) {
    // Handle auth error
  } else {
    // Handle generic error
  }
}
```

---

## Data Validation

All server actions use Zod schemas for input validation.

**Schema Location:** `lib/validation/schemas.ts`

### Example Schemas

```typescript
// Create Trespass Record
CreateRecordSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  date_of_birth: z.string().optional(),
  school_id: z.string().optional(),
  trespassed_from: z.string().min(1),
  incident_date: z.string(),
  incident_description: z.string().min(10),
  police_notified: z.boolean(),
  // ... more fields
});

// Update Record (partial)
UpdateRecordSchema = CreateRecordSchema.partial();

// Create Feedback
CreateFeedbackSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(2000),
  category_id: z.string().uuid(),
  attachments: z.array(z.string().url()).optional(),
});
```

### Validation Helper

```typescript
import { validateData } from '@/lib/validation/schemas';

const validation = validateData(CreateRecordSchema, data);
if (!validation.success) {
  throw new Error(`Validation failed: ${validation.error}`);
}
```

---

## Security Considerations

### Authentication
- All mutations require Clerk authentication
- Webhook endpoints verify Svix signatures
- Cron jobs verify Vercel secret headers

### Authorization
- Role-based access control enforced at action level
- RLS policies in Supabase provide defense-in-depth
- Campus-scoped admins can only access their campus data

### Data Validation
- Zod schemas validate all inputs
- SQL injection prevented via Supabase client
- XSS prevented via React's built-in escaping

### Rate Limiting
- All public endpoints rate-limited
- Prevents abuse and DoS attacks
- Uses Upstash Redis for distributed rate limiting

### Audit Logging
- All mutations logged to `admin_audit_log`
- FERPA-compliant logging with PII protection
- Logs include: actor, action, timestamp, details

### CSRF Protection
- Server Actions use built-in Next.js CSRF tokens
- Custom middleware enforces CSRF for API routes

---

## API Testing

**Current State:** No automated API tests

**Recommended Testing Strategy:**
1. Unit tests for server actions (Vitest)
2. Integration tests for critical flows (Playwright)
3. E2E tests for user journeys (Cypress)
4. Load testing for rate limits (k6)

---

## Summary

DistrictTracker's API layer is built on Next.js 15 Server Actions with REST endpoints for webhooks and cron jobs. The architecture prioritizes type safety (TypeScript + Zod), security (Clerk + RLS + rate limiting), and developer experience (collocated actions with pages).

**Key Patterns:**
- Server Actions for mutations
- Server Components for queries
- REST API for external integrations
- Comprehensive validation and error handling
- Multi-tenant isolation via RLS
- Audit logging for compliance
