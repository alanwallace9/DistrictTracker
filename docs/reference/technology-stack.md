# Technology Stack Analysis

**Project:** DistrictTracker (Modular Monolith)
**Last Updated:** 2025-11-23
**Scan Level:** Exhaustive

---

## Executive Summary

DistrictTracker is a Next.js 15 application built with TypeScript, featuring a modular architecture with two primary modules: **TrespassTracker** (operational) and **DAEPManagement** (in development). The application uses a multi-tenant architecture with subdomain-based routing, Clerk authentication, and Supabase PostgreSQL with Row-Level Security.

**Architecture Pattern:** Modular Monolith with Feature-Based Organization
**Deployment:** Vercel (Production)
**Primary Stack:** Next.js 15 + React 19 + TypeScript + Supabase + Clerk

---

## Technology Stack by Category

### Frontend Framework

| Technology | Version | Justification |
|------------|---------|---------------|
| **Next.js** | 15.5.4 | Modern React framework with App Router, Server Components, and Server Actions. Provides built-in routing, API routes, and optimized builds. |
| **React** | 19.2.0 | Latest React with improved concurrent features and server component support. |
| **TypeScript** | 5.9.3 | Strict mode enabled for type safety across the codebase. Path aliases configured (@/*). |

**Configuration Highlights:**
- App Router architecture (app/ directory)
- Server Actions enabled (5MB body size limit for image uploads)
- Image optimization disabled (images.unoptimized: true)
- Strict TypeScript with incremental builds

---

### Authentication & Authorization

| Technology | Version | Justification |
|------------|---------|---------------|
| **Clerk** | 6.33.1 | Primary authentication provider with invite-based user management. Users select their own passwords after invite. |
| **@clerk/themes** | 2.4.24 | UI theming for Clerk components |
| **Supabase Auth** | (integrated) | Secondary auth layer for RLS policies and database-level security |

**Authentication Flow:**
1. Clerk handles user invites and password management
2. Clerk webhooks sync user data to Supabase `user_profiles` table
3. Middleware enforces tenant-based routing via subdomains
4. Supabase RLS policies enforce multi-tenant data isolation

**Future Roadmap:**
- SSO integration planned

---

### Database & Backend

| Technology | Version | Justification |
|------------|---------|---------------|
| **Supabase** | @supabase/supabase-js 2.58.0 | PostgreSQL database with real-time capabilities, RLS, and REST API. |
| **@supabase/ssr** | 0.7.0 | Server-side rendering support for Supabase in Next.js |
| **PostgreSQL** | (Supabase hosted) | Primary data store with multi-tenant architecture using RLS |

**Database Architecture:**
- **Multi-Tenancy:** Tenant ID-based isolation with RLS policies
- **Tables:** 7 core tables (tenants, campuses, user_profiles, trespass_records, record_photos, record_documents, admin_audit_log)
- **Security:** Row-Level Security enabled on all tables
- **Migrations:** Managed via supabase/migrations/ directory (29 migration files)
- **Soft Deletes:** deleted_at timestamps for audit compliance

**Key Tables:**
- `tenants` - Organization/district definitions
- `campuses` - Campus-level organization within tenants
- `user_profiles` - User accounts synced from Clerk
- `trespass_records` - Core trespass incident tracking (TrespassTracker module)
- `admin_audit_log` - FERPA-compliant audit logging

---

### UI Components & Design System

| Technology | Version | Justification |
|------------|---------|---------------|
| **Radix UI** | Multiple packages | Unstyled, accessible component primitives (28 Radix packages installed) |
| **Tailwind CSS** | 3.3.3 | Utility-first CSS framework with custom design system |
| **tailwindcss-animate** | 1.0.7 | Animation utilities for Radix components |
| **shadcn/ui** | (via components.json) | Pre-built accessible components using Radix + Tailwind |
| **Lucide React** | 0.446.0 | Icon library (2,000+ icons) |
| **next-themes** | 0.3.0 | Dark/light theme management |

**Design System:**
- **Color System:** OKLCH-based custom palette
- **Brand Colors:** Birdville ISD branded colors (gold, blue, green, red, yellow)
- **Custom Breakpoints:**
  - `nav: 1085px` - Navigation menu breakpoint
  - `demo-btn: 635px` - Demo button text wrapping
- **Component Library:** `components/ui/` (shadcn/ui components)
- **Shared Components:** `components/shared/` (cross-module components)
- **Module-Specific:** `components/trespass/`, `components/daep/`

---

### State Management & Data Fetching

| Technology | Version | Justification |
|------------|---------|---------------|
| **React Server Components** | (Next.js 15) | Primary data fetching via server components and server actions |
| **React Context** | (built-in) | Used for tenant context, auth context, demo role context |
| **React Hook Form** | 7.53.0 | Form state management with validation |
| **Zod** | 3.25.76 | Schema validation for forms and API payloads |
| **@hookform/resolvers** | 3.9.0 | Zod resolver for React Hook Form integration |

**Context Providers:**
- `AdminTenantContext.tsx` - Admin tenant selection
- `AuthContext.tsx` - Authentication state
- `DemoRoleContext.tsx` - Demo environment role management
- `SubdomainTenantContext.tsx` - Subdomain-based tenant detection

**Custom Hooks:**
- `use-toast.ts` - Toast notifications
- `useDebounce.ts` - Debounced input handling
- `useExpiringWarnings.ts` - Time-based warning notifications

---

### Security & Middleware

| Technology | Version | Justification |
|------------|---------|---------------|
| **@upstash/ratelimit** | 2.0.7 | Rate limiting for API endpoints |
| **@upstash/redis** | 1.35.6 | Redis for rate limiting storage |
| **Custom Middleware** | - | Tenant routing, auth enforcement, CSRF protection |

**Security Features:**
- **Content Security Policy (CSP):** Comprehensive headers in next.config.js
- **Security Headers:** X-Frame-Options (DENY), X-Content-Type-Options (nosniff), X-XSS-Protection
- **CSRF Protection:** lib/csrf.ts
- **Rate Limiting:** API endpoint protection via Upstash Redis
- **Audit Logging:** All admin actions logged to admin_audit_log table
- **Subdomain Isolation:** Tenant routing via middleware (lib/subdomain.ts)

**Middleware Functions:**
- `middleware.ts` - Clerk auth + tenant routing + rate limiting
- `lib/auth-utils.ts` - Authentication utilities
- `lib/admin-auth.ts` - Admin-specific auth checks
- `lib/rate-limit.ts` - Rate limiting configuration
- `lib/validation/` - Input validation schemas

---

### File Handling & Media

| Technology | Version | Justification |
|------------|---------|---------------|
| **Sharp** | 0.34.4 | Image optimization (dev dependency for scripts) |
| **jspdf** | 3.0.3 | PDF generation for reports |
| **jspdf-autotable** | 5.0.2 | Table formatting in PDF exports |
| **xlsx** | 0.18.5 | Excel file generation for data exports |
| **papaparse** | 5.5.3 | CSV parsing for data imports |

**File Storage:**
- Supabase Storage for uploaded images/documents
- `lib/file-upload.ts` - File upload utilities
- `lib/image-storage.ts` - Image handling and storage
- Tables: `record_photos`, `record_documents`

---

### Data Visualization & UI Enhancements

| Technology | Version | Justification |
|------------|---------|---------------|
| **Recharts** | 2.12.7 | Chart and data visualization library |
| **embla-carousel-react** | 8.3.0 | Carousel/slider components |
| **react-resizable-panels** | 2.1.3 | Resizable panel layouts |
| **cmdk** | 1.0.4 | Command palette/search UI |
| **vaul** | 0.9.9 | Drawer/modal components |
| **sonner** | 1.7.4 | Toast notification system |
| **input-otp** | 1.2.4 | OTP input component |

---

### Date & Time

| Technology | Version | Justification |
|------------|---------|---------------|
| **date-fns** | 3.6.0 | Date manipulation and formatting |
| **react-day-picker** | 8.10.1 | Calendar/date picker component |

---

### Utilities & Helpers

| Technology | Version | Justification |
|------------|---------|---------------|
| **clsx** | 2.1.1 | Conditional className utility |
| **tailwind-merge** | 2.5.2 | Tailwind class merging/deduplication |
| **class-variance-authority** | 0.7.0 | Component variant management |

**Shared Utilities:**
- `lib/utils.ts` - General utility functions
- `lib/logger.ts` - Logging utilities
- `lib/subdomain-client.ts` - Client-side subdomain handling
- `lib/tenant-events.ts` - Tenant event management

---

### Development Tools

| Technology | Version | Justification |
|------------|---------|---------------|
| **ESLint** | 8.49.0 | Code linting (ignored during builds) |
| **ts-node** | 10.9.2 | TypeScript execution for scripts |
| **dotenv** | 17.2.3 | Environment variable management |

**Scripts:**
- `scripts/seed-demo-data.ts` - Demo data seeding
- `scripts/optimize-images.js` - Image optimization
- `scripts/README.md` - Scripts documentation

---

### Deployment & Infrastructure

| Platform | Configuration | Details |
|----------|--------------|---------|
| **Vercel** | vercel.json | Production deployment platform |
| **Supabase** | - | Database and auth hosting |
| **Upstash Redis** | - | Rate limiting storage |
| **Clerk** | - | Authentication service |

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public Supabase key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin Supabase key
- `CLERK_SECRET_KEY` - Clerk API secret
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Public Clerk key
- `UPSTASH_REDIS_REST_URL` - Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis token

**Subdomain Routing:**
- Production: `{tenant}.districttracker.com` (e.g., birdville.districttracker.com)
- Demo: `demo.districttracker.com`
- Middleware extracts tenant from subdomain

---

## Module-Specific Technology Patterns

### TrespassTracker Module (Operational)

**Primary Features:**
- Trespass incident tracking and management
- Multi-campus support within districts
- Photo and document attachments
- Audit logging (FERPA compliance)
- Role-based access (viewer, campus_admin, district_admin, master_admin)
- PDF and Excel export functionality
- Admin feedback system

**Key Files:**
- `app/trespass/page.tsx` - Main module entry
- `components/trespass/` - Module-specific components
- `modules/TrespassTracker/` - Module definition and docs

**Database Tables:**
- trespass_records (primary)
- record_photos
- record_documents
- admin_audit_log

---

### DAEPManagement Module (In Development)

**Primary Features:**
- DAEP (Disciplinary Alternative Education Program) management
- Student placement tracking
- Integration with TrespassTracker for shared student records

**Key Files:**
- `app/daep/page.tsx` - Main module entry
- `components/daep/` - Module-specific components
- `modules/DAEPManagement/` - Module definition and docs
- `modules/DAEPManagement/daep_implementation_plan.md` - Implementation plan

**Status:** Under active development

---

## Shared Infrastructure

### Multi-Tenancy Architecture

**Pattern:** Subdomain-based tenant routing with RLS
**Components:**
- `middleware.ts` - Tenant extraction and routing
- `lib/subdomain.ts` - Subdomain utilities (server-side)
- `lib/subdomain-client.ts` - Subdomain utilities (client-side)
- `contexts/SubdomainTenantContext.tsx` - Tenant context provider

**Tenant Hierarchy:**
```
Tenant (e.g., "Birdville ISD")
  ├── Campuses (e.g., "Birdville High School")
  ├── Users (assigned to tenant + optional campus)
  └── Records (tenant + optional campus scoped)
```

### Authentication Flow

**Sequence:**
1. User invited via Clerk admin panel
2. User receives invite email with magic link
3. User clicks link and sets password
4. Clerk webhook fires → syncs to Supabase user_profiles
5. User authenticated via Clerk session
6. Middleware extracts tenant from subdomain
7. Supabase RLS policies enforce tenant isolation

### Component Organization

**Shared Components:** `components/shared/`
- Cross-module reusable components
- Layout components
- Navigation components

**UI Components:** `components/ui/`
- shadcn/ui component library
- Fully typed with TypeScript
- Accessible (Radix UI primitives)

**Module Components:**
- `components/trespass/` - TrespassTracker-specific
- `components/daep/` - DAEPManagement-specific

---

## Testing & Quality

**Current State:**
- Test files pattern: `*.test.ts`, `*.spec.ts`, `*.test.tsx`, `*.spec.tsx`
- `modules/TrespassTracker/docs/sessions/TESTING_TODO.md` - Testing roadmap
- No test framework currently configured in package.json

**Recommended:**
- Jest or Vitest for unit testing
- React Testing Library for component tests
- Playwright or Cypress for E2E tests

---

## Performance Optimizations

**Implemented:**
- React Server Components for reduced client bundle
- Server Actions for form handling
- Image optimization disabled (needs review)
- Incremental TypeScript builds
- Next.js automatic code splitting

**Opportunities:**
- Re-enable Next.js image optimization
- Implement ISR (Incremental Static Regeneration) for static content
- Add React Query for client-side caching
- Optimize Supabase queries with proper indexes

---

## Security Posture

**Strengths:**
- Comprehensive CSP headers
- RLS policies on all tables
- Clerk-managed authentication
- Rate limiting on API endpoints
- CSRF protection
- Audit logging for compliance
- Soft deletes for data retention

**Areas for Improvement:**
- Add comprehensive input validation tests
- Implement API request signing
- Add security scanning in CI/CD pipeline
- Document threat model and security architecture

---

## Architecture Pattern: Modular Monolith

**Pattern Description:**
- Single Next.js application with feature-based modules
- Modules share infrastructure but maintain logical boundaries
- Each module has dedicated routes, components, and documentation
- Shared code in `components/shared/`, `lib/`, `hooks/`, `contexts/`

**Benefits:**
- Simplified deployment (single app)
- Shared authentication and database
- Code reuse across modules
- Easier development and debugging

**Trade-offs:**
- Modules coupled via shared dependencies
- Cannot scale modules independently
- Single deployment unit (all-or-nothing deploys)

**Migration Path to Microservices (if needed):**
1. Extract shared code to npm packages
2. Split modules into separate Next.js apps
3. Implement API gateway for routing
4. Separate databases with eventual consistency

---

## Summary

DistrictTracker is a well-architected Next.js 15 application with a solid foundation for multi-tenant SaaS. The modular monolith pattern provides flexibility for the current development phase while allowing future extraction into microservices if needed. The stack choices (Next.js 15, React 19, Supabase, Clerk) are modern and production-ready, with a strong emphasis on security, type safety, and developer experience.
