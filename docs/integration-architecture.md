# Integration Architecture

**Project:** DistrictTracker (Modular Monolith)
**Modules:** TrespassTracker (operational), DAEPManagement (in development)
**Last Updated:** 2025-11-23

---

## Overview

DistrictTracker uses a **modular monolith architecture** where multiple feature modules coexist in a single Next.js application while sharing common infrastructure. This document describes how the modules integrate and communicate.

---

## Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│                   DistrictTracker App                    │
│                    (Next.js 15 Monolith)                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │  TrespassTracker │         │ DAEPManagement   │     │
│  │     Module       │◄────────►│     Module      │     │
│  │  (Operational)   │  Link    │ (In Development) │     │
│  └────────┬─────────┘         └────────┬─────────┘     │
│           │                              │               │
│           └──────────┬───────────────────┘               │
│                      │                                   │
│         ┌────────────▼────────────┐                     │
│         │   Shared Infrastructure │                     │
│         ├─────────────────────────┤                     │
│         │ • Authentication (Clerk) │                     │
│         │ • Database (Supabase)    │                     │
│         │ • Multi-tenancy (RLS)    │                     │
│         │ • UI Components          │                     │
│         │ • Utilities (lib/)       │                     │
│         └─────────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## Shared Infrastructure

### 1. Authentication Layer

**Provider:** Clerk
**Implementation:** Global middleware + React Context

**How Modules Use It:**
```typescript
// TrespassTracker module
import { auth } from '@clerk/nextjs/server';

export async function createRecord(data) {
  const { userId } = await auth(); // Shared auth check
  // Module-specific logic
}

// DAEPManagement module (same pattern)
import { auth } from '@clerk/nextjs/server';

export async function createPlacement(data) {
  const { userId } = await auth(); // Same shared auth
  // Module-specific logic
}
```

**Benefits:**
- Single authentication system
- Consistent user sessions
- Shared user profiles table

---

### 2. Database Layer

**Provider:** Supabase PostgreSQL
**Implementation:** Shared Supabase client factories

**Client Factories:**
- `lib/supabase/server.ts` - Server-side authenticated client
- `lib/supabase/client.ts` - Client-side authenticated client

**Multi-Tenant Isolation:**
- All tables include `tenant_id` column
- RLS policies enforce tenant boundaries
- Middleware injects tenant context from subdomain

**Shared Tables:**
```
tenants              # Organization definitions
├─ campuses          # School campuses
├─ user_profiles     # User accounts (synced from Clerk)
└─ (module-specific tables)
```

**Module-Specific Tables:**
- **TrespassTracker:** `trespass_records`, `record_photos`, `record_documents`
- **DAEPManagement:** `daep_placements`, `daep_programs`, `daep_attendance` (planned)

---

### 3. Multi-Tenancy System

**Pattern:** Subdomain-based tenant routing

**Flow:**
```
User Request: https://birdville.districttracker.com/dashboard
                              ↓
                      middleware.ts extracts "birdville"
                              ↓
                  Looks up tenant_id in tenants table
                              ↓
                    Sets tenant context in session
                              ↓
                 All queries filtered by tenant_id via RLS
```

**Implementation:**
- `middleware.ts` - Extracts subdomain
- `lib/subdomain.ts` - Server-side tenant resolution
- `contexts/SubdomainTenantContext.tsx` - Client-side tenant context

**Both modules automatically inherit tenant isolation:**
- No manual tenant ID passing required
- RLS policies enforce isolation
- Queries scoped to tenant via authenticated Supabase client

---

### 4. UI Component Library

**Shared Components:**

| Location | Purpose | Used By |
|----------|---------|---------|
| `components/ui/` | shadcn/ui primitives (buttons, forms, dialogs) | Both modules |
| `components/shared/` | Cross-module reusable components | Both modules |
| `components/trespass/` | TrespassTracker-specific components | TrespassTracker only |
| `components/daep/` | DAEP-specific components | DAEPManagement only |

**Benefits:**
- Consistent UI/UX across modules
- Shared design system (Tailwind + custom theme)
- Reusable form components and layouts

---

### 5. Utility Libraries

**Shared Utilities:**

| File | Purpose | Usage |
|------|---------|-------|
| `lib/utils.ts` | General utilities (cn, formatters) | Both modules |
| `lib/validation/schemas.ts` | Zod validation schemas | Both modules |
| `lib/audit-logger.ts` | Audit logging (FERPA compliance) | Both modules |
| `lib/rate-limit.ts` | API rate limiting | Both modules |
| `lib/file-upload.ts` | File upload helpers | Both modules |

---

## Inter-Module Communication

### Direct Database Links

**TrespassTracker → DAEPManagement:**

The `trespass_records` table includes fields that link to DAEP module:

```sql
-- trespass_records table (TrespassTracker)
CREATE TABLE trespass_records (
  ...
  is_daep boolean,                    -- DAEP placement flag
  daep_expiration_date date,          -- DAEP end date
  ...
);
```

**Usage Pattern:**
1. User flagged in TrespassTracker as DAEP student (`is_daep = true`)
2. DAEPManagement module queries `trespass_records` to get student background
3. DAEP placement record created with reference to trespass record

**Example Query (DAEPManagement):**
```typescript
// Get students flagged for DAEP
const { data: daepStudents } = await supabase
  .from('trespass_records')
  .select('*')
  .eq('is_daep', true)
  .eq('tenant_id', tenantId); // RLS enforces this

// Create DAEP placement
const { data: placement } = await supabase
  .from('daep_placements')
  .insert({
    student_record_id: daepStudent.id, // Link to trespass_record
    ...
  });
```

---

### Shared Campus Hierarchy

Both modules use the same organizational structure:

```
Tenant (e.g., "Birdville ISD")
  └─ Campuses (e.g., "Birdville High School")
      ├─ Trespass Records (TrespassTracker)
      └─ DAEP Placements (DAEPManagement)
```

**Benefits:**
- Consistent data model
- Shared campus management UI
- Cross-module reporting possible

---

### Shared User Roles

Both modules respect the same role hierarchy:

| Role | TrespassTracker Access | DAEPManagement Access |
|------|----------------------|---------------------|
| `viewer` | Read-only (assigned campus) | Read-only (assigned campus) |
| `campus_admin` | Full CRUD (assigned campus) | Full CRUD (assigned campus) |
| `district_admin` | Full CRUD (all campuses) | Full CRUD (all campuses) |
| `master_admin` | Full access + cross-tenant | Full access + cross-tenant |

**Implementation:**
- Roles stored in `user_profiles.role`
- Checked via `lib/admin-auth.ts` utilities
- RLS policies enforce role-based access

---

## Data Flow Diagrams

### User Authentication Flow

```
User Login
    ↓
Clerk Authentication
    ↓
Webhook fires → Syncs to user_profiles
    ↓
User Profile Created with:
  • tenant_id (from invite metadata)
  • campus_id (from invite metadata)
  • role (from invite metadata)
    ↓
Middleware validates tenant on each request
    ↓
RLS policies filter data by tenant_id + role
    ↓
Both modules see same authenticated user
```

---

### Cross-Module Data Access

```
TrespassTracker Module
    ↓
User creates trespass record
    ↓
Sets is_daep = true (flagged for DAEP)
    ↓
Record stored in trespass_records table
    ↓
DAEPManagement Module
    ↓
Queries trespass_records WHERE is_daep = true
    ↓
Displays DAEP-flagged students
    ↓
Creates DAEP placement record
    ↓
Links back to trespass_record (student_record_id)
```

---

## Module Independence

### What Modules DO Share

✅ **Infrastructure:**
- Authentication (Clerk)
- Database (Supabase)
- Multi-tenancy system
- UI component library
- Utilities and helpers

✅ **Data References:**
- Tenant hierarchy (`tenants`, `campuses`)
- User profiles (`user_profiles`)
- Cross-module links (e.g., `trespass_records.is_daep`)

---

### What Modules DON'T Share

❌ **Business Logic:**
- Each module has its own server actions (`app/actions/`)
- Module-specific validation schemas
- Module-specific business rules

❌ **UI Components:**
- TrespassTracker components in `components/trespass/`
- DAEP components in `components/daep/`
- No direct component reuse between modules (use `shared/` instead)

❌ **Routes:**
- `/trespass` and `/dashboard` → TrespassTracker
- `/daep` → DAEPManagement
- Separate navigation menus

---

## Migration to Microservices (If Needed)

If the monolith needs to be split into microservices in the future:

### Phase 1: Extract Shared Code

1. Move `lib/` to npm package (`@districttracker/shared`)
2. Move `components/ui/` to component library
3. Extract Supabase types to shared package

### Phase 2: Separate Databases

1. Create separate Supabase projects for each module
2. Replicate `tenants`, `campuses`, `user_profiles` in each
3. Set up eventual consistency with event bus

### Phase 3: API Gateway

1. Deploy modules as separate Next.js apps
2. Add API gateway (Kong, AWS API Gateway)
3. Route requests by subdomain + path

### Phase 4: Independent Scaling

1. Scale modules independently based on load
2. Deploy to separate infrastructure
3. Implement service discovery

**Current Decision:** Stay with monolith until scale requires separation (10k+ tenants)

---

## Benefits of Current Architecture

**Advantages:**
- ✅ Single deployment unit (simplified CI/CD)
- ✅ Shared authentication and session
- ✅ Single database (consistent data model)
- ✅ Code reuse via shared utilities
- ✅ Easier development and debugging
- ✅ Lower infrastructure cost

**Trade-offs:**
- ❌ Cannot scale modules independently
- ❌ Single point of failure (entire app goes down)
- ❌ Modules coupled via shared database
- ❌ Larger codebase to understand

---

## Integration Points Summary

| Integration Type | Implementation | Modules Using |
|-----------------|----------------|--------------|
| Authentication | Clerk + middleware | Both |
| Database | Supabase + RLS | Both |
| Multi-tenancy | Subdomain routing + RLS | Both |
| UI Components | shadcn/ui + shared/ | Both |
| Utilities | lib/ directory | Both |
| Data Links | Foreign keys in database | Cross-module queries |
| Roles | user_profiles.role | Both |
| Audit Logging | admin_audit_log table | Both |

---

## Future Integration Opportunities

### 1. Shared Reporting

Create cross-module reports:
- Students with trespass records AND DAEP placements
- Campus-wide incident + DAEP statistics
- Trend analysis across both systems

**Implementation:** Supabase views joining tables from both modules

---

### 2. Unified Admin Panel

Extend admin panel to manage both modules:
- Single dashboard for district admins
- Combined statistics and KPIs
- Cross-module user management

**Current:** Admin panel primarily serves TrespassTracker

---

### 3. Event Bus

Implement event bus for loose coupling:
- TrespassTracker emits "StudentFlaggedForDAEP" event
- DAEPManagement subscribes and creates placement
- Decouples modules while maintaining integration

**Tech:** Supabase Realtime or external event bus (RabbitMQ, Kafka)

---

## Summary

DistrictTracker's integration architecture leverages the **modular monolith pattern** to share infrastructure while maintaining module boundaries. The shared authentication, database, and multi-tenancy layers provide a solid foundation for both current modules and future expansion.

**Key Integration Points:**
- Clerk authentication (shared sessions)
- Supabase database (shared schema, isolated data via RLS)
- Subdomain-based multi-tenancy (automatic tenant context)
- UI component library (consistent UX)
- Shared utilities (audit logging, validation, rate limiting)

**Cross-Module Links:**
- `trespass_records.is_daep` flag
- Shared `campus_id` and `tenant_id` hierarchy
- Common user roles and permissions

This architecture provides flexibility to grow the system while maintaining simplicity and avoiding premature microservices complexity.
