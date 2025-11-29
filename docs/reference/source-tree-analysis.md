# Source Tree Analysis

**Project:** DistrictTracker
**Architecture:** Next.js 15 App Router (Modular Monolith)
**Last Updated:** 2025-11-23

---

## Overview

DistrictTracker follows a **modular monolith architecture** with feature-based organization. The codebase is structured to support multiple modules (TrespassTracker, DAEPManagement) while sharing common infrastructure.

**Key Organization Principles:**
- Feature-based routing (`app/` directory)
- Module-specific components (`components/{module}/`)
- Shared utilities and infrastructure (`lib/`, `contexts/`, `hooks/`)
- Server Actions collocated with features (`app/actions/`)

---

## Root Directory Structure

```
DistrictTracker/
├── app/                    # Next.js App Router (pages, layouts, API routes)
├── components/             # React components (UI + feature components)
├── contexts/               # React Context providers
├── hooks/                  # Custom React hooks
├── lib/                    # Shared utilities and configurations
├── modules/                # Module-specific documentation and metadata
├── public/                 # Static assets (images, fonts)
├── styles/                 # Global styles and themes
├── supabase/               # Database migrations and configuration
├── docs/                   # Generated project documentation (this folder)
├── .bmad/                  # BMAD methodology configuration
├── .claude/                # Claude Code slash commands
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── next.config.js          # Next.js configuration
└── middleware.ts           # Global middleware (auth + tenant routing)
```

---

## App Directory (`app/`) - Next.js App Router

### Core Entry Points

```
app/
├── layout.tsx              # Root layout (Clerk provider, theme provider)
├── page.tsx                # Landing page (/)
├── globals.css             # Global styles (Tailwind + CSS variables)
└── middleware.ts           # Auth + tenant routing middleware (see root)
```

**Entry Point:** `app/layout.tsx`
- Initializes Clerk authentication
- Sets up theme provider (light/dark/system)
- Configures global metadata and fonts

---

### Module Routes

#### TrespassTracker Module

```
app/
├── trespass/
│   └── page.tsx            # TrespassTracker main UI → redirects to /dashboard
├── dashboard/
│   └── page.tsx            # Primary dashboard for trespass records management
└── boards/
    └── [type]/
        └── page.tsx        # Board views (active, former, all records)
```

**Primary Flow:**
1. User logs in via Clerk
2. Middleware extracts tenant from subdomain
3. User navigates to `/dashboard`
4. Dashboard loads tenant-scoped trespass records
5. User can switch between board views (active/former/all)

---

#### DAEPManagement Module (In Development)

```
app/
└── daep/
    └── page.tsx            # DAEP module main UI (placeholder)
```

**Status:** Basic route structure in place, awaiting full implementation

---

### Authentication & User Management

```
app/
├── login/
│   └── [[...login]]/       # Clerk login flow (catch-all route)
│       └── page.tsx
├── sign-up/
│   └── [[...sign-up]]/     # Clerk sign-up flow (catch-all route)
│       └── page.tsx
└── demo-login/
    └── page.tsx            # Demo environment login (special handling)
```

**Authentication Flow:**
- Clerk handles all user authentication
- Middleware (`middleware.ts`) enforces auth on protected routes
- Demo tenant has simplified login for public testing

---

### Admin Panel

```
app/
└── admin/
    ├── layout.tsx          # Admin layout (master_admin + district_admin only)
    ├── page.tsx            # Admin dashboard (overview stats)
    ├── users/              # User management (invites, roles, campuses)
    ├── campuses/           # Campus CRUD operations
    ├── records/            # Advanced record search and bulk operations
    ├── audit-logs/         # View audit trail (FERPA compliance)
    ├── reports/            # Generate PDF/Excel reports
    ├── tenants/            # Tenant management (master_admin only)
    ├── waitlist/           # Waitlist management
    └── feedback/
        └── AdminFeedbackPanel.tsx  # Admin feedback dashboard
```

**Access Control:**
- `district_admin` - Access to tenant-specific admin functions
- `master_admin` - Full access including cross-tenant operations

---

### Feedback System

```
app/
└── feedback/
    ├── page.tsx            # Feedback landing (redirects to /features)
    ├── FeedbackBoard.tsx   # Shared board component
    ├── features/           # Feature requests
    ├── bugs/               # Bug reports
    ├── roadmap/            # Public roadmap
    ├── changelog/          # Release changelog
    ├── [slug]/             # Individual feedback detail
    │   └── page.tsx
    └── search/             # Feedback search
        └── page.tsx
```

**Public Access:** Feedback pages are publicly accessible (no auth required for viewing)

---

### Server Actions (`app/actions/`)

Server Actions are the primary API for mutations and data operations.

```
app/
└── actions/
    ├── records.ts          # Trespass record CRUD
    ├── campuses.ts         # Campus management
    ├── users.ts            # User operations
    ├── invite-user.ts      # Send Clerk invitations
    ├── feedback.ts         # Feedback system operations
    ├── audit-logs.ts       # Query audit logs
    ├── upload-records.ts   # CSV bulk upload
    ├── copy-photos.ts      # Photo migration utility
    ├── diagnostics.ts      # System diagnostics
    ├── waitlist.ts         # Waitlist operations
    └── admin/              # Admin-specific actions
        ├── users.ts
        ├── campuses.ts
        ├── records.ts
        ├── audit-logs.ts
        ├── tenants.ts
        ├── overview.ts
        ├── search-records.ts
        ├── bulk-invite-users.ts
        ├── deleted-records.ts
        ├── daep-records.ts
        └── switch-tenant.ts
```

**Pattern:** All actions use `'use server'` directive and require authentication

---

### API Routes (`app/api/`)

REST API endpoints for webhooks, cron jobs, and external integrations.

```
app/
└── api/
    ├── webhooks/
    │   └── clerk/
    │       └── route.ts    # Clerk user lifecycle webhook (user.created, user.updated, user.deleted)
    ├── auth/
    │   └── user-tenant/
    │       └── route.ts    # Get user tenant info
    ├── admin/
    │   ├── get-demo-snapshot/
    │   │   └── route.ts    # Get demo snapshot metadata
    │   ├── update-demo-snapshot/
    │   │   └── route.ts    # Create new demo snapshot
    │   └── reset-demo-now/
    │       └── route.ts    # Manual demo reset trigger
    └── cron/
        └── reset-demo/
            └── route.ts    # Scheduled demo reset (daily at midnight)
```

**Authentication:**
- Webhooks: Svix signature verification
- Admin endpoints: Clerk auth + role check
- Cron jobs: Vercel cron secret header

---

## Components Directory (`components/`)

### Module-Specific Components

#### TrespassTracker Components

```
components/
└── trespass/
    ├── DashboardClient.tsx         # Main dashboard orchestrator
    ├── DashboardLayout.tsx         # Dashboard layout wrapper
    ├── RecordsTable.tsx            # Data table for records
    ├── RecordCard.tsx              # Card view for individual record
    ├── RecordDetailDialog.tsx      # Full record detail modal
    ├── AddRecordDialog.tsx         # Create new record form
    ├── EditRecordDialog.tsx        # Edit existing record form
    ├── AddCampusDialog.tsx         # Create campus form
    ├── EditCampusDialog.tsx        # Edit campus form
    ├── DeactivateCampusDialog.tsx  # Campus deactivation confirmation
    ├── AddUserDialog.tsx           # Invite user form (deprecated, use InviteUserDialog)
    ├── InviteUserDialog.tsx        # Invite user form (current)
    ├── CSVUploadDialog.tsx         # Bulk CSV upload
    ├── FieldMappingDialog.tsx      # Map CSV fields to database columns
    ├── PhotoGallery.tsx            # Photo viewing and management
    ├── DocumentUpload.tsx          # Document attachment upload
    ├── DocumentViewer.tsx          # View attached documents
    ├── AdminAuditLog.tsx           # Audit log viewer
    ├── StatsDropdown.tsx           # Statistics summary dropdown
    ├── DemoBanner.tsx              # Banner for demo environment
    ├── ThemeProvider.tsx           # Dark/light theme provider
    ├── SettingsDialog.tsx          # User settings modal
    └── admin/
        └── (admin-specific components)
```

**Pattern:** Feature-specific components with clear responsibilities

---

#### DAEP Components (Planned)

```
components/
└── daep/
    └── (DAEP-specific components - to be implemented)
```

---

### Shared Components

```
components/
└── shared/
    └── feedback/
        ├── FeedbackSubmissionForm.tsx
        ├── FeedbackCard.tsx
        ├── FeedbackComments.tsx
        └── UpvoteButton.tsx
```

**Purpose:** Components reusable across modules

---

### UI Components (shadcn/ui)

```
components/
└── ui/
    ├── button.tsx
    ├── input.tsx
    ├── dialog.tsx
    ├── form.tsx
    ├── table.tsx
    ├── card.tsx
    ├── badge.tsx
    ├── dropdown-menu.tsx
    ├── select.tsx
    ├── toast.tsx
    ├── calendar.tsx
    ├── (40+ more components)
    └── ...
```

**Source:** shadcn/ui component library (Radix UI primitives + Tailwind styling)

---

## Contexts Directory (`contexts/`)

React Context providers for global state management.

```
contexts/
├── AuthContext.tsx             # Clerk authentication state
├── SubdomainTenantContext.tsx  # Client-side tenant detection from subdomain
├── AdminTenantContext.tsx      # Admin panel tenant selection (master_admin)
└── DemoRoleContext.tsx         # Demo environment role management
```

**Usage Pattern:**
```typescript
import { useTenant } from '@/contexts/SubdomainTenantContext';

const { tenantId, tenantName } = useTenant();
```

---

## Hooks Directory (`hooks/`)

Custom React hooks for reusable logic.

```
hooks/
├── use-toast.ts                # Toast notification hook (sonner)
├── useDebounce.ts              # Debounced value hook
└── useExpiringWarnings.ts      # Time-based warning notifications
```

---

## Lib Directory (`lib/`)

Shared utilities, configurations, and helper functions.

```
lib/
├── supabase/
│   ├── server.ts               # Server-side Supabase client factory
│   └── client.ts               # Client-side Supabase client factory
├── supabase.ts                 # Supabase client + TypeScript types
├── auth-utils.ts               # Authentication helper functions
├── admin-auth.ts               # Admin-specific auth checks
├── subdomain.ts                # Server-side subdomain extraction
├── subdomain-client.ts         # Client-side subdomain detection
├── tenant-events.ts            # Tenant event handling
├── rate-limit.ts               # Rate limiting configuration (Upstash Redis)
├── audit-logger.ts             # Audit log writer
├── logger.ts                   # Application logger
├── csrf.ts                     # CSRF protection utilities
├── file-upload.ts              # File upload helpers
├── image-storage.ts            # Image processing and storage
├── utils.ts                    # General utility functions (cn, etc.)
└── validation/
    └── schemas.ts              # Zod validation schemas
```

**Key Utilities:**
- `supabase/server.ts` - Creates authenticated Supabase client on server
- `subdomain.ts` - Extracts tenant ID from request hostname
- `audit-logger.ts` - Logs all admin actions for FERPA compliance

---

## Modules Directory (`modules/`)

Module-specific documentation and metadata (not runtime code).

```
modules/
├── TrespassTracker/
│   ├── README.md
│   ├── CHANGELOG.md
│   ├── TODO.md
│   ├── docs/
│   │   ├── features/           # Feature documentation (10 files)
│   │   ├── planning/           # Planning docs (9 files)
│   │   ├── security/           # Security audits (5 files)
│   │   └── sessions/           # Session summaries (3 files)
│   └── scripts/
│       └── README.md
└── DAEPManagement/
    ├── daep_implementation_plan.md
    └── docs/
        └── sprint-artifacts/
```

**Purpose:** Non-code artifacts, documentation, and planning materials

---

## Public Directory (`public/`)

Static assets served directly.

```
public/
├── images/
├── fonts/
└── (static files)
```

---

## Supabase Directory (`supabase/`)

Database migrations and Supabase configuration.

```
supabase/
├── migrations/
│   ├── 20251002154545_add_user_profiles_and_roles.sql
│   ├── 20251003_add_campus_id_to_user_profiles.sql
│   ├── 20251012_create_record_photos_and_documents.sql
│   ├── 20251019_add_tenant_id_and_multi_tenancy.sql
│   ├── 20251026_create_campuses_table.sql
│   ├── 20251110_rename_trespass_record_fields.sql
│   ├── 20251122_add_soft_delete_to_records.sql
│   └── (29 total migrations)
└── .temp/                      # Temporary Supabase CLI files
```

**Migration Management:** All DDL changes tracked in versioned SQL files

---

## Configuration Files

### TypeScript Configuration

```
tsconfig.json                   # TypeScript compiler options
├── strict: true                # Strict type checking
├── paths: { "@/*": ["./*"] }   # Path aliases
└── lib: ["dom", "esnext"]      # Target libraries
```

---

### Next.js Configuration

```
next.config.js
├── Server Actions enabled (5MB body size limit)
├── Security headers (CSP, X-Frame-Options, etc.)
├── Image optimization disabled
└── ESLint ignored during builds
```

---

### Tailwind Configuration

```
tailwind.config.ts
├── Custom design system (OKLCH colors)
├── Birdville ISD brand colors
├── Custom breakpoints (nav, demo-btn)
└── shadcn/ui integration
```

---

### Package Management

```
package.json
├── Scripts:
│   ├── dev                     # Start development server
│   ├── build                   # Build for production
│   ├── start                   # Start production server
│   ├── lint                    # Run ESLint
│   ├── typecheck               # TypeScript type checking
│   └── seed:demo               # Seed demo data
└── Dependencies: 80+ packages
```

---

## Critical Files

### Middleware

```
middleware.ts                   # Root-level middleware
├── Clerk authentication
├── Subdomain tenant extraction
├── Rate limiting (Upstash Redis)
├── Public route matching
└── Tenant context injection
```

**Execution Order:**
1. Rate limit check
2. Clerk authentication
3. Subdomain extraction
4. Tenant validation
5. Route authorization

---

### Environment Variables

```
.env.production
├── NEXT_PUBLIC_SUPABASE_URL
├── NEXT_PUBLIC_SUPABASE_ANON_KEY
├── SUPABASE_SERVICE_ROLE_KEY
├── CLERK_SECRET_KEY
├── NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
├── UPSTASH_REDIS_REST_URL
└── UPSTASH_REDIS_REST_TOKEN
```

---

## Module Communication & Integration

### Shared Infrastructure

Both modules share:
- **Authentication:** Clerk session
- **Database:** Supabase PostgreSQL with RLS
- **Tenant Context:** Subdomain-based routing
- **UI Components:** `components/ui/` and `components/shared/`
- **Utilities:** `lib/` directory

### Cross-Module References

**TrespassTracker → DAEPManagement:**
- `trespass_records.is_daep` flag
- `trespass_records.daep_expiration_date` field

**DAEPManagement → TrespassTracker:**
- Will reference `trespass_records` for student history
- Shares `tenant_id` and `campus_id` hierarchy

---

## Entry Points Summary

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `app/page.tsx` | Landing page |
| `/login` | Clerk catch-all | User login |
| `/dashboard` | `app/dashboard/page.tsx` | Main dashboard (TrespassTracker) |
| `/trespass` | `app/trespass/page.tsx` | TrespassTracker entry (redirects) |
| `/daep` | `app/daep/page.tsx` | DAEP module entry |
| `/admin` | `app/admin/page.tsx` | Admin panel |
| `/feedback` | `app/feedback/page.tsx` | Public feedback system |
| `/boards/[type]` | `app/boards/[type]/page.tsx` | Board views |

---

## Development Workflow

### Local Development

```bash
npm run dev                     # Start dev server (localhost:3000)
npm run typecheck               # Type check without building
npm run lint                    # Run ESLint
```

### Building for Production

```bash
npm run build                   # Next.js production build
npm run start                   # Start production server
```

### Database Migrations

```bash
supabase migration new <name>   # Create new migration
supabase db push                # Apply migrations to remote
```

---

## Security Considerations

**Critical Security Files:**
- `middleware.ts` - Authentication and tenant isolation
- `lib/rate-limit.ts` - DoS protection
- `lib/csrf.ts` - CSRF token validation
- `lib/audit-logger.ts` - Compliance logging
- `lib/validation/schemas.ts` - Input validation

**Security Patterns:**
- RLS policies enforce tenant isolation
- Clerk handles authentication
- Rate limiting on all public endpoints
- Comprehensive audit logging
- Input validation via Zod schemas

---

## Performance Optimization

**Optimization Strategies:**
- Server Components for initial renders
- Server Actions for mutations
- Next.js automatic code splitting
- React Suspense for loading states
- Incremental TypeScript builds

**Areas for Improvement:**
- Re-enable Next.js image optimization
- Add React Query for client-side caching
- Implement ISR for static content

---

## Summary

DistrictTracker's source tree follows Next.js 15 App Router best practices with a modular architecture. The codebase is well-organized with clear separation of concerns: routes in `app/`, components in `components/`, shared utilities in `lib/`, and module-specific documentation in `modules/`.

**Key Architectural Strengths:**
- Feature-based organization
- Type-safe with TypeScript
- Modular and extensible
- Comprehensive security layers
- Clear separation between modules
