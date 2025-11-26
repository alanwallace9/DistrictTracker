# DistrictTracker Project Documentation

**Version:** 1.0.0
**Last Updated:** 2025-11-23
**Project Type:** Modular Monolith (Next.js 15 + React 19 + TypeScript)
**Status:** TrespassTracker (Operational), DAEPManagement (In Development)

---

## 📋 Quick Reference

| Category | Detail |
|----------|--------|
| **Framework** | Next.js 15.5.4 with App Router |
| **Language** | TypeScript 5.9.3 (Strict Mode) |
| **Frontend** | React 19.2.0 + Radix UI + Tailwind CSS |
| **Backend** | Next.js Server Actions + API Routes |
| **Database** | Supabase PostgreSQL with Row-Level Security |
| **Auth** | Clerk (Invite-based, SSO planned) |
| **Architecture** | Multi-tenant SaaS with subdomain routing |
| **Deployment** | Vercel (Production) |
| **Repository Type** | Modular Monolith |

---

## 🎯 Project Overview

**DistrictTracker** is a multi-tenant SaaS application for school districts, built as a modular monolith with two primary modules:

### Modules

**1. TrespassTracker** (Operational)
- Trespass incident tracking and management
- Multi-campus support within districts
- Photo and document attachments
- Role-based access control (viewer, campus_admin, district_admin, master_admin)
- FERPA-compliant audit logging
- PDF and Excel export functionality
- Public feedback system

**2. DAEPManagement** (In Development)
- Disciplinary Alternative Education Program (DAEP) management
- Student placement tracking
- Integration with TrespassTracker for shared student records
- Attendance and progress reporting

### Shared Infrastructure
- **Authentication:** Clerk invite system (users select own passwords)
- **Database:** Supabase PostgreSQL with RLS for multi-tenant isolation
- **Multi-Tenancy:** Subdomain-based routing (e.g., birdville.districttracker.com)
- **UI:** Radix UI primitives + Tailwind CSS + shadcn/ui components
- **Security:** Comprehensive CSP headers, rate limiting, CSRF protection

---

## 📚 Documentation Index

### Core Documentation (Generated)

1. **[Technology Stack](./technology-stack.md)** - Comprehensive tech stack analysis
   *Frameworks, libraries, dependencies, architecture patterns*

2. **[API Contracts](./api-contracts.md)** - REST API routes + Server Actions
   *6 REST endpoints, 24+ server actions, authentication, validation*

3. **[Data Models](./data-models.md)** - Database schema and relationships
   *14 tables, RLS policies, TypeScript types, migration history*

4. **[RLS Policies - Detailed](./rls-policies-detailed.md)** - Complete Row-Level Security reference
   *70+ verified policies, helper functions, role-based access, demo tenant handling*

5. **[Source Tree Analysis](./source-tree-analysis.md)** - Project structure with annotations
   *Directory organization, entry points, module boundaries*

6. **[Development Guide](./development-guide.md)** - Setup and development workflow
   *Prerequisites, scripts, common tasks, troubleshooting*

7. **[Integration Architecture](./integration-architecture.md)** - How modules communicate
   *Shared infrastructure, cross-module data flow, integration points*

### Module-Specific Documentation

#### TrespassTracker Module

**Location:** `modules/TrespassTracker/docs/`

**Planning Documentation (9 files):**
- [DATABASE_SCHEMA.md](../modules/TrespassTracker/docs/planning/DATABASE_SCHEMA.md) - Detailed schema reference
- [AUTH_SETUP.md](../modules/TrespassTracker/docs/planning/AUTH_SETUP.md) - Authentication configuration
- [MULTI_INCIDENT_ARCHITECTURE.md](../modules/TrespassTracker/docs/planning/MULTI_INCIDENT_ARCHITECTURE.md) - Architecture decisions
- [MIGRATION_PLAN.md](../modules/TrespassTracker/docs/planning/MIGRATION_PLAN.md) - Data migration strategy
- [RECORDS_MANAGEMENT_PLAN.md](../modules/TrespassTracker/docs/planning/RECORDS_MANAGEMENT_PLAN.md) - Record management flows
- [FIELD_MAPPING.md](../modules/TrespassTracker/docs/planning/FIELD_MAPPING.md) - CSV field mappings
- [CODE_CLEANUP_AND_STANDARDS_PLAN.md](../modules/TrespassTracker/docs/planning/CODE_CLEANUP_AND_STANDARDS_PLAN.md) - Code quality plan
- [CURRENT_STATE_ANALYSIS.md](../modules/TrespassTracker/docs/planning/CURRENT_STATE_ANALYSIS.md) - System analysis
- [DEMO_SETUP.md](../modules/TrespassTracker/docs/planning/DEMO_SETUP.md) - Demo environment configuration

**Feature Documentation (10 files):**
- [FEEDBACK_SYSTEM_FEATURE.md](../modules/TrespassTracker/docs/features/FEEDBACK_SYSTEM_FEATURE.md) - Public feedback system
- [CUSTOMER_FACING_FEATURES.md](../modules/TrespassTracker/docs/features/CUSTOMER_FACING_FEATURES.md) - User-facing features
- [FEEDBACK_MERGE_FEATURE_PLAN.md](../modules/TrespassTracker/docs/features/FEEDBACK_MERGE_FEATURE_PLAN.md) - Feedback merge strategy
- [IMPLEMENTATION_PLAN_2025-11-09.md](../modules/TrespassTracker/docs/features/IMPLEMENTATION_PLAN_2025-11-09.md) - Implementation plan
- [IMPLEMENTATION_PLAN_DEMO_ISOLATION.md](../modules/TrespassTracker/docs/features/IMPLEMENTATION_PLAN_DEMO_ISOLATION.md) - Demo isolation
- Additional implementation plans and features

**Security Documentation (5 files):**
- [SECURITY_AUDIT_2025-11-16.md](../modules/TrespassTracker/docs/security/SECURITY_AUDIT_2025-11-16.md) - Latest security audit
- [SECURITY_AUDIT_2025-11-09.md](../modules/TrespassTracker/docs/security/SECURITY_AUDIT_2025-11-09.md) - Previous security audit
- [SECURITY_FIXES_2025-11-09.md](../modules/TrespassTracker/docs/security/SECURITY_FIXES_2025-11-09.md) - Security remediation
- [SECURITY_REMEDIATION_SUMMARY.md](../modules/TrespassTracker/docs/security/SECURITY_REMEDIATION_SUMMARY.md) - Summary
- [NEXT_SESSION_SECURITY_FIXES.md](../modules/TrespassTracker/docs/security/NEXT_SESSION_SECURITY_FIXES.md) - Planned fixes

**Session Summaries (3 files):**
- [SESSION_SUMMARY_2025-11-09.md](../modules/TrespassTracker/docs/sessions/SESSION_SUMMARY_2025-11-09.md)
- [SESSION_SUMMARY.md](../modules/TrespassTracker/docs/sessions/SESSION_SUMMARY.md)
- [TESTING_TODO.md](../modules/TrespassTracker/docs/sessions/TESTING_TODO.md)

**Root Files:**
- [README.md](../modules/TrespassTracker/README.md) - Module overview
- [CHANGELOG.md](../modules/TrespassTracker/CHANGELOG.md) - Version history
- [TODO.md](../modules/TrespassTracker/TODO.md) - Active task list

#### DAEPManagement Module

**Location:** `modules/DAEPManagement/`

- [daep_implementation_plan.md](../modules/DAEPManagement/daep_implementation_plan.md) - Implementation roadmap
- `docs/sprint-artifacts/` - Sprint documentation (empty, planned)

**DAEP Design & Planning Documentation:**

- **[DAEP UI Mockup Analysis](./daep-ui-mockup-analysis.md)** - Comprehensive analysis of bolt.new UI mockup
  *Complete screen-by-screen breakdown, component library mapping, integration requirements with TrespassTracker, data model specifications, incident tracking integration, recidivism calculation algorithms*

- **[Brainstorming Session Results (2025-11-23)](./brainstorming-session-results-2025-11-23.md)** - BMAD brainstorming session
  *100+ features across 4 techniques (Mind Mapping, Five Whys, What If Scenarios, SCAMPER), 8 workflow branches, edge case analysis, critical realizations*

- **[Product Brief: DAEP Module (2025-11-24)](./product-brief-DAEPManagement-2025-11-24.md)** - Strategic product vision and MVP scope
  *Problem statement, target users, success metrics, MVP scope (17 features in 3 tiers), technical architecture preferences, multi-tenant configuration, risks and assumptions*

- **[Product Brief Party Mode Findings (2025-11-24)](./product-brief-party-mode-findings-2025-11-24.md)** - Multi-agent review session findings
  *Schema design requirements, edge case documentation, granular permissions system, performance indexes, pilot testing strategy, complete SQL schemas*

### DAEP Core Design Documents (Split for AI Context)

- **[PRD - DAEPManagement](./PRD.md)** - Product Requirements Document
  *Complete functional requirements, user personas, success metrics*

- **[Architecture - Part 1](./architecture-part1.md)** - Patterns & Decisions
  *Executive summary, implementation patterns, CSV reconciliation architecture, decision records*

- **[Architecture - Part 2](./architecture-part2.md)** - Data & Structure
  *Data architecture, database schema, analytics, project structure*

- **[Epics - Part 1](./epics-part1.md)** - Epics 1a, 1b, 2
  *Overview, FR inventory, Epic 1a (Core Schema), Epic 1b (Config UI), Epic 2 (Placement Management)*

- **[Epics - Part 2](./epics-part2.md)** - Epics 3-7
  *Epic 3 (Daily Ops), Epic 4 (Behavior), Epic 5 (CSV), Epic 6 (Dashboard), Epic 7 (Notifications)*

---

## 🏗️ Architecture Overview

### Technology Stack

**Frontend:**
- Next.js 15 App Router with React Server Components
- React 19 with Suspense and Transitions
- TypeScript (strict mode)
- Radix UI (28 component packages)
- Tailwind CSS 3.3.3 with custom design system
- shadcn/ui component library

**Backend:**
- Next.js Server Actions (primary API)
- REST API routes (webhooks, cron jobs)
- Supabase PostgreSQL with Row-Level Security
- Clerk authentication and user management

**Infrastructure:**
- Vercel deployment
- Supabase (database + auth + storage)
- Clerk (authentication)
- Upstash Redis (rate limiting)

### Multi-Tenant Architecture

**Pattern:** Subdomain-based tenant routing with RLS isolation

```
User Request: https://birdville.districttracker.com/dashboard
                    ↓
            Middleware extracts "birdville"
                    ↓
            Validates tenant in database
                    ↓
        All queries auto-filtered by tenant_id via RLS
```

**Tenant Hierarchy:**
```
Tenant (e.g., "Birdville ISD")
  ├─ Campuses (e.g., "Birdville High School")
  ├─ Users (assigned to tenant + optional campus)
  └─ Records (tenant + optional campus scoped)
```

**Role-Based Access:**
- `viewer` - Read-only access to assigned campus
- `campus_admin` - Full CRUD for assigned campus
- `district_admin` - Full CRUD for all campuses in tenant
- `master_admin` - Cross-tenant access + tenant management

---

## 🗄️ Database Schema

**Provider:** Supabase PostgreSQL
**Migrations:** 29 files in `supabase/migrations/`

### Core Tables (Shared)

| Table | Purpose | Records |
|-------|---------|---------|
| `tenants` | Organization definitions | 2 |
| `campuses` | School campuses within tenants | Variable |
| `user_profiles` | User accounts (synced from Clerk) | Variable |
| `admin_audit_log` | FERPA-compliant audit trail | Variable |

### TrespassTracker Tables

| Table | Purpose |
|-------|---------|
| `trespass_records` | Core trespass incident tracking |
| `record_photos` | Photo attachments for records |
| `record_documents` | Document attachments for records |

### Feedback System Tables

| Table | Purpose |
|-------|---------|
| `feedback_categories` | Feedback categorization |
| `feedback_submissions` | Feature requests and bug reports |
| `feedback_upvotes` | User upvotes on feedback |
| `feedback_comments` | Comments on feedback |

### Support Tables

| Table | Purpose |
|-------|---------|
| `pending_invitations` | Track Clerk invitations |
| `demo_seed_snapshots` | Demo tenant snapshots |
| `waitlist` | Public waitlist signups |

**See:** [Data Models Documentation](./data-models.md) for complete schema

---

## 🔗 API Reference

### Server Actions (Primary API)

**Location:** `app/actions/`

**TrespassTracker Actions:**
- `records.ts` - CRUD operations for trespass records
- `campuses.ts` - Campus management
- `users.ts` - User operations
- `invite-user.ts` - Send Clerk invitations
- `upload-records.ts` - Bulk CSV upload
- `audit-logs.ts` - Query audit logs

**Feedback Actions:**
- `feedback.ts` - Submit, upvote, comment on feedback

**Admin Actions:** (`app/actions/admin/`)
- `overview.ts` - Tenant statistics
- `search-records.ts` - Advanced search
- `bulk-invite-users.ts` - Bulk user invitations
- `switch-tenant.ts` - Master admin tenant switching
- `deleted-records.ts` - Soft delete management

**Total:** 24+ server actions

### REST API Routes

**Location:** `app/api/`

1. `/api/webhooks/clerk` - Clerk user lifecycle sync
2. `/api/auth/user-tenant` - Get user tenant info
3. `/api/admin/get-demo-snapshot` - Demo snapshot metadata
4. `/api/admin/update-demo-snapshot` - Create demo snapshot
5. `/api/admin/reset-demo-now` - Manual demo reset
6. `/api/cron/reset-demo` - Scheduled demo reset

**See:** [API Contracts Documentation](./api-contracts.md) for complete API reference

---

## 🎨 Component Architecture

### Component Organization

```
components/
├── ui/                 # shadcn/ui components (40+ components)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── table.tsx
│   └── ...
├── shared/             # Cross-module reusable components
│   └── feedback/
├── trespass/           # TrespassTracker-specific components
│   ├── DashboardClient.tsx
│   ├── RecordsTable.tsx
│   ├── RecordDetailDialog.tsx
│   └── ...
└── daep/               # DAEP-specific components (planned)
```

**Design System:**
- OKLCH-based color system
- Birdville ISD brand colors
- Custom breakpoints (nav: 1085px, demo-btn: 635px)
- Dark/light theme support
- Accessible (Radix UI primitives)

---

## 🔐 Security Features

**Authentication:**
- Clerk-managed user authentication
- Invite-based user provisioning
- Role-based access control
- SSO support (planned)

**Data Security:**
- Row-Level Security (RLS) policies on all tables
- Multi-tenant isolation via subdomain + RLS
- Soft deletes for data retention
- FERPA-compliant audit logging

**Application Security:**
- Comprehensive Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- CSRF protection
- Rate limiting (Upstash Redis)
- Input validation (Zod schemas)

**See:** `modules/TrespassTracker/docs/security/` for security audits

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (v20 recommended)
- npm (comes with Node.js)
- Supabase account
- Clerk account
- Upstash Redis account

### Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd DistrictTracker

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Start development server
npm run dev

# 5. Access application
# Open http://localhost:3000
```

**See:** [Development Guide](./development-guide.md) for detailed setup instructions

---

## 📦 Project Structure

```
DistrictTracker/
├── app/                    # Next.js App Router
│   ├── actions/            # Server Actions (API layer)
│   ├── api/                # REST API routes
│   ├── trespass/           # TrespassTracker routes
│   ├── daep/               # DAEP routes
│   ├── admin/              # Admin panel routes
│   ├── feedback/           # Feedback system routes
│   ├── dashboard/          # Main dashboard
│   └── (auth routes)
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── shared/             # Cross-module components
│   ├── trespass/           # TrespassTracker components
│   └── daep/               # DAEP components
├── contexts/               # React Context providers
├── hooks/                  # Custom React hooks
├── lib/                    # Shared utilities
│   ├── supabase/           # Supabase client factories
│   ├── validation/         # Zod schemas
│   └── (utilities)
├── modules/                # Module documentation
│   ├── TrespassTracker/
│   └── DAEPManagement/
├── public/                 # Static assets
├── supabase/               # Database migrations
│   └── migrations/
├── docs/                   # Generated documentation (this folder)
├── middleware.ts           # Global middleware
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.ts      # Tailwind config
└── next.config.js          # Next.js config
```

**See:** [Source Tree Analysis](./source-tree-analysis.md) for detailed structure

---

## 🔄 Development Workflow

### Common Tasks

**Start Development:**
```bash
npm run dev
```

**Type Check:**
```bash
npm run typecheck
```

**Build for Production:**
```bash
npm run build
npm run start
```

**Database Migrations:**
```bash
supabase migration new <name>
supabase db push
```

**Seed Demo Data:**
```bash
npm run seed:demo
```

**See:** [Development Guide](./development-guide.md) for complete workflow

---

## 🧪 Testing

**Current State:** No automated tests configured

**Recommended Setup:**
- **Unit Tests:** Vitest + React Testing Library
- **Integration Tests:** Vitest
- **E2E Tests:** Playwright or Cypress
- **Load Tests:** k6

**Test Structure:**
```
__tests__/
├── unit/
├── integration/
└── e2e/
```

---

## 📈 Performance Considerations

**Optimizations:**
- React Server Components (reduced client bundle)
- Server Actions (no API routes needed)
- Next.js automatic code splitting
- Incremental TypeScript builds

**Opportunities:**
- Re-enable Next.js image optimization
- Implement ISR for static content
- Add React Query for client-side caching
- Optimize Supabase queries with indexes

---

## 🔗 Integration Points

### Module Communication

**Shared Infrastructure:**
- Clerk authentication (single session)
- Supabase database (shared schema, RLS isolation)
- Subdomain-based multi-tenancy
- UI component library
- Shared utilities (audit logging, validation)

**Cross-Module Data Links:**
- `trespass_records.is_daep` flag links to DAEP module
- `trespass_records.daep_expiration_date` field
- Shared `campus_id` and `tenant_id` hierarchy
- Common user roles and permissions

**See:** [Integration Architecture](./integration-architecture.md) for details

---

## 📋 Known Issues & TODOs

**See Module-Specific TODOs:**
- [TrespassTracker TODO](../modules/TrespassTracker/TODO.md) - Active task list
- [Testing TODO](../modules/TrespassTracker/docs/sessions/TESTING_TODO.md) - Testing roadmap

---

## 📚 Additional Resources

**Framework Documentation:**
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

**Infrastructure Documentation:**
- [Supabase Documentation](https://supabase.com/docs)
- [Clerk Documentation](https://clerk.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

**UI/Design:**
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

---

## 🎯 User Workflows (Documentation Needed)

**Current Gap:** User workflows need better documentation per user request.

**Recommended Documentation:**
1. Admin workflow: Inviting users
2. Admin workflow: Managing campuses
3. Admin workflow: Viewing audit logs
4. User workflow: Creating trespass records
5. User workflow: Bulk CSV upload
6. User workflow: Searching records
7. Admin workflow: Generating reports
8. Public workflow: Submitting feedback
9. Cross-module workflow: Flagging DAEP students
10. Master admin workflow: Tenant switching

**Action Item:** Create user workflow documentation in future iteration

---

## 📊 Project Statistics

**Codebase:**
- TypeScript files: 200+
- React components: 100+
- Server Actions: 24+
- API routes: 6
- Database tables: 14
- Migrations: 29
- Documentation files: 35+ (TrespassTracker)
- Generated docs: 6 (this scan)

**Dependencies:**
- npm packages: 80+
- Radix UI packages: 28
- shadcn/ui components: 40+

**Lines of Code:** ~20,000+ (estimated)

---

## 🎓 For AI-Assisted Development

**When working on this project, always reference:**

1. **[Technology Stack](./technology-stack.md)** - Understand the full tech stack
2. **[Data Models](./data-models.md)** - Database schema and relationships
3. **[API Contracts](./api-contracts.md)** - Available APIs and their usage
4. **[Source Tree](./source-tree-analysis.md)** - Navigate the codebase
5. **[Integration Architecture](./integration-architecture.md)** - Module boundaries

**Module-Specific Work:**
- TrespassTracker: See `modules/TrespassTracker/docs/`
- DAEPManagement: See `modules/DAEPManagement/daep_implementation_plan.md`

**Authentication Context:**
- All mutations require Clerk authentication
- Tenant context automatically injected via middleware
- RLS policies enforce data isolation

**Development Patterns:**
- Prefer Server Components over Client Components
- Use Server Actions for mutations
- Validate inputs with Zod schemas
- Log admin actions to audit trail
- Follow existing component patterns

---

## 📝 Documentation Maintenance

**Generated:** 2025-11-23 via BMAD document-project workflow
**Scan Level:** Exhaustive
**Next Review:** Update when adding new modules or major features

**To Regenerate Documentation:**
```bash
# Load BMAD analyst agent
# Run: /bmad:bmm:workflows:document-project
```

---

## 🤝 Contributing

**Code Standards:**
- TypeScript strict mode
- ESLint for code quality
- Prettier for formatting (if configured)
- Commit message convention: Descriptive, present tense

**Pull Request Process:**
1. Create feature branch
2. Implement changes
3. Run type check and lint
4. Test thoroughly
5. Update documentation if needed
6. Submit PR with description

---

## 📞 Support & Contact

**Issues:** Check module-specific TODO files and documentation
**Security:** See security audit documents in `modules/TrespassTracker/docs/security/`
**Questions:** Reference this documentation index and linked documents

---

**End of Documentation Index**

This index serves as the primary entry point for understanding the DistrictTracker project. All linked documents provide detailed information on specific aspects of the system. For AI-assisted development, start here and navigate to specific documents as needed.
