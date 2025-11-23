# DAEP Management System - Implementation Plan

## TECHNICAL ARCHITECTURE DOCUMENT

### System Overview
School district alternative education program (DAEP) data management system with real-time point tracking, attendance management, and comprehensive reporting for FERPA-compliant multi-campus operations.

### Technology Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Shadcn/ui, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Authentication:** Supabase Auth with magic links
- **Real-time:** Supabase real-time subscriptions
- **State Management:** Zustand + TanStack Query
- **File Handling:** Supabase Storage
- **Deployment:** Vercel (MVP) → AWS/GCP (scale)

### Database Architecture

#### Core Tables
```sql
-- User Management
users (id, email, role, campus_id, approved_teacher, created_at)
campuses (id, name, district_id, home_campus_flag)

-- Student Data
students (id, student_id, first_name, last_name, home_campus_id, current_room_id, ...)
placements (id, student_id, placement_date, incident_number, start_date, days_assigned, discipline_code_id, ...)
daily_points (id, student_id, placement_id, date, period, points_earned, approved_by)
attendance (id, student_id, placement_id, date, period, status, tardy_time, early_dismiss_time)

-- Configuration
rooms (id, name, campus_id)
discipline_codes (id, code, label, mandatory_flag, behavior_location)
bell_schedule (id, campus_id, period_name, start_time, sequence_index)
```

#### Security Model
- Row Level Security (RLS) for campus-based data isolation
- Role-based permissions with audit logging
- FERPA-compliant data encryption and access controls

### Real-time Features
- Live point updates across all connected devices
- Notification system for approvals and milestones
- Optimistic UI with offline capability and sync indicators

---

## COMPLETE FILE STRUCTURE

```
daep-management/
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── kpi-cards.tsx
│   │   │       ├── charts/
│   │   │       │   ├── attendance-momentum.tsx
│   │   │       │   ├── actions-by-campus.tsx
│   │   │       │   └── incidents-heatmap.tsx
│   │   │       └── quick-links.tsx
│   │   ├── rooms/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── room-selector.tsx
│   │   │       ├── period-selector.tsx
│   │   │       ├── roster-grid.tsx
│   │   │       ├── points-editor.tsx
│   │   │       └── notes-section.tsx
│   │   ├── students/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── components/
│   │   │       ├── student-list.tsx
│   │   │       ├── student-profile/
│   │   │       │   ├── header-card.tsx
│   │   │       │   ├── current-placement.tsx
│   │   │       │   ├── daily-activity.tsx
│   │   │       │   └── placement-history.tsx
│   │   │       └── filters.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── report-tiles.tsx
│   │   │       ├── parameter-modal.tsx
│   │   │       └── placement-explorer.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── users-roles.tsx
│   │   │       ├── rooms-management.tsx
│   │   │       ├── calendars.tsx
│   │   │       ├── bell-schedule.tsx
│   │   │       ├── code-dictionaries.tsx
│   │   │       ├── bonus-rules.tsx
│   │   │       ├── email-templates.tsx
│   │   │       ├── distribution-lists.tsx
│   │   │       ├── notifications.tsx
│   │   │       ├── imports.tsx
│   │   │       ├── audit-history.tsx
│   │   │       └── security.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── students/
│   │   │   ├── placements/
│   │   │   ├── attendance/
│   │   │   ├── points/
│   │   │   ├── reports/
│   │   │   └── notifications/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── notification-bell.tsx
│   │   ├── forms/
│   │   │   ├── point-entry-form.tsx
│   │   │   ├── attendance-form.tsx
│   │   │   ├── student-form.tsx
│   │   │   └── placement-form.tsx
│   │   └── shared/
│   │       ├── data-table.tsx
│   │       ├── date-picker.tsx
│   │       ├── role-guard.tsx
│   │       └── offline-indicator.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── types.ts
│   │   ├── stores/
│   │   │   ├── auth-store.ts
│   │   │   ├── notifications-store.ts
│   │   │   └── offline-store.ts
│   │   ├── hooks/
│   │   │   ├── use-realtime.ts
│   │   │   ├── use-offline.ts
│   │   │   └── use-permissions.ts
│   │   ├── utils/
│   │   │   ├── permissions.ts
│   │   │   ├── points-calculator.ts
│   │   │   ├── date-helpers.ts
│   │   │   └── validators.ts
│   │   └── types/
│   │       ├── database.ts
│   │       ├── user.ts
│   │       └── student.ts
│   ├── middleware.ts
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── next.config.js
├── backend/
│   ├── supabase/
│   │   ├── migrations/
│   │   │   ├── 001_initial_schema.sql
│   │   │   ├── 002_user_roles.sql
│   │   │   ├── 003_students_placements.sql
│   │   │   ├── 004_attendance_points.sql
│   │   │   ├── 005_configuration.sql
│   │   │   └── 006_rls_policies.sql
│   │   ├── functions/
│   │   │   ├── calculate-points/
│   │   │   │   └── index.ts
│   │   │   ├── generate-reports/
│   │   │   │   └── index.ts
│   │   │   ├── send-notifications/
│   │   │   │   └── index.ts
│   │   │   ├── import-csv/
│   │   │   │   └── index.ts
│   │   │   └── audit-logger/
│   │   │       └── index.ts
│   │   ├── config.toml
│   │   └── seed.sql
│   └── scripts/
│       ├── setup-database.ts
│       ├── import-sample-data.ts
│       └── backup-restore.ts
└── docs/
    ├── api-documentation.md
    ├── user-manual.md
    ├── deployment-guide.md
    └── compliance-checklist.md
```

---

## FEATURE IMPLEMENTATION TEMPLATES

### Feature 1: Authentication & Role Management

**User Story:** As a district administrator, I want to securely authenticate users and manage their roles so that staff can access appropriate data based on their responsibilities.

**Acceptance Criteria:**
- Magic link authentication with password creation
- Role-based access control (District Admin, DAEP Admin1/2, Campus Admin, DAEP Staff, Parent, Student)
- Campus-scoped data access for non-district roles
- Session management with automatic logout
- Approved teacher flag for immediate point posting

**Technical Breakdown:**
- **Frontend Files:** `app/(auth)/`, `components/layout/header.tsx`, `lib/stores/auth-store.ts`
- **Backend Files:** `migrations/002_user_roles.sql`, `functions/audit-logger/`
- **APIs:** `/api/auth/login`, `/api/auth/callback`, `/api/users/roles`
- **Database Changes:** Users table with role and campus relationships

**Session Plan:**
1. **Session 1** (2h): Setup Supabase auth, create user table, basic login flow
2. **Session 2** (1.5h): Implement role-based routing and permission guards
3. **Session 3** (1h): Add approved teacher flag and session management

### Feature 2: Dashboard with KPI Cards

**User Story:** As a DAEP administrator, I want to see key metrics at a glance so that I can quickly assess program performance and identify students needing attention.

**Acceptance Criteria:**
- Role-specific dashboard layouts
- Clickable KPI cards that drill down to student lists
- Real-time data updates
- Date picker for historical comparisons
- Export capabilities (PDF/XLSX)

**Technical Breakdown:**
- **Frontend Files:** `app/dashboard/`, `components/charts/`, `components/ui/data-table.tsx`
- **Backend Files:** `functions/calculate-points/`, dashboard queries in RLS policies
- **APIs:** `/api/dashboard/kpis`, `/api/dashboard/charts`, `/api/reports/export`
- **Database Changes:** Optimized views for dashboard queries

**Session Plan:**
1. **Session 1** (2h): Create dashboard layout and KPI card components
2. **Session 2** (2h): Implement chart components with real-time data
3. **Session 3** (1.5h): Add drill-down functionality and export features
4. **Session 4** (1h): Role-specific dashboard customization

### Feature 3: Rooms Page with Point Entry

**User Story:** As a DAEP teacher, I want to quickly record attendance and award points by period so that I can efficiently manage my classroom and track student progress.

**Acceptance Criteria:**
- Period-based point entry with defaults (10 points)
- Real-time attendance tracking (P/A/T with times)
- Negative point override with approval workflow
- Inline editing with optimistic updates
- Comment system with student/teacher actions

**Technical Breakdown:**
- **Frontend Files:** `app/rooms/`, `components/forms/point-entry-form.tsx`, `lib/hooks/use-realtime.ts`
- **Backend Files:** `migrations/004_attendance_points.sql`, `functions/calculate-points/`
- **APIs:** `/api/points/entry`, `/api/attendance/update`, `/api/notifications/approvals`
- **Database Changes:** Daily_points and attendance tables with real-time triggers

**Session Plan:**
1. **Session 1** (2h): Create room selector and roster grid
2. **Session 2** (2h): Implement period selector and point entry system
3. **Session 3** (1.5h): Add attendance tracking with time stamps
4. **Session 4** (1.5h): Build approval workflow for negative points
5. **Session 5** (1h): Add comment system and real-time updates

### Feature 4: Student Profile with Placement Tracking

**User Story:** As a campus administrator, I want to view detailed student information and placement history so that I can make informed decisions about interventions and placements.

**Acceptance Criteria:**
- Comprehensive student demographics (role-based visibility)
- Current placement details with discipline codes
- Daily activity tracking (attendance, points, comments)
- Placement history with archive access
- Edit capabilities based on user role

**Technical Breakdown:**
- **Frontend Files:** `app/students/[id]/`, `components/student-profile/`
- **Backend Files:** `migrations/003_students_placements.sql`, placement history views
- **APIs:** `/api/students/[id]`, `/api/placements/history`, `/api/students/update`
- **Database Changes:** Students, placements tables with history tracking

**Session Plan:**
1. **Session 1** (2h): Create student profile layout and header card
2. **Session 2** (2h): Implement current placement section with discipline details
3. **Session 3** (1.5h): Build daily activity tracking display
4. **Session 4** (1h): Add placement history with role-based visibility
5. **Session 5** (1h): Implement edit capabilities and validation

### Feature 5: Reports and Data Export

**User Story:** As a district administrator, I want to generate comprehensive reports with filtering options so that I can analyze program effectiveness and meet compliance requirements.

**Acceptance Criteria:**
- Multiple report types (attendance, discipline, recidivism)
- Parameter modals with date ranges and filters
- PDF and Excel export capabilities
- Interactive placement length explorer
- Automated report generation triggers

**Technical Breakdown:**
- **Frontend Files:** `app/reports/`, `components/parameter-modal.tsx`, `components/placement-explorer.tsx`
- **Backend Files:** `functions/generate-reports/`, reporting views and procedures
- **APIs:** `/api/reports/generate`, `/api/reports/export`, `/api/reports/parameters`
- **Database Changes:** Reporting views, export triggers

**Session Plan:**
1. **Session 1** (2h): Create report tiles and parameter modal system
2. **Session 2** (2h): Implement PDF generation with templates
3. **Session 3** (1.5h): Build Excel export functionality
4. **Session 4** (2h): Create placement length explorer with interactive charts
5. **Session 5** (1h): Add automated report triggers

### Feature 6: Settings and Configuration

**User Story:** As a DAEP administrator, I want to configure system settings and manage users so that the system matches our district's specific needs and workflows.

**Acceptance Criteria:**
- User management with role assignment
- Room and campus configuration
- Bell schedule and calendar setup
- Discipline code management
- Email template customization

**Technical Breakdown:**
- **Frontend Files:** `app/settings/`, `components/settings/` modules
- **Backend Files:** `migrations/005_configuration.sql`, admin functions
- **APIs:** `/api/settings/users`, `/api/settings/config`, `/api/settings/import`
- **Database Changes:** Configuration tables, user management procedures

**Session Plan:**
1. **Session 1** (2h): Create settings layout and user management
2. **Session 2** (1.5h): Implement room and campus configuration
3. **Session 3** (1.5h): Build bell schedule and calendar management
4. **Session 4** (1h): Add discipline code dictionary management
5. **Session 5** (1h): Create email template editor

### Feature 7: Notifications and Approval System

**User Story:** As a DAEP administrator, I want to receive notifications about student milestones and pending approvals so that I can take timely action on important events.

**Acceptance Criteria:**
- Real-time notification bell with badge counts
- Pending approval workflow for negative points
- Automated milestone notifications (500 points, 200 left)
- Role-specific notification types
- Email integration for external notifications

**Technical Breakdown:**
- **Frontend Files:** `components/layout/notification-bell.tsx`, `lib/stores/notifications-store.ts`
- **Backend Files:** `functions/send-notifications/`, notification triggers
- **APIs:** `/api/notifications/pending`, `/api/notifications/approve`, `/api/notifications/dismiss`
- **Database Changes:** Notifications table, approval workflow triggers

**Session Plan:**
1. **Session 1** (1.5h): Create notification bell component and store
2. **Session 2** (2h): Implement pending approval workflow
3. **Session 3** (1.5h): Build automated milestone notifications
4. **Session 4** (1h): Add email integration and templates

---

## IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-2)

**Week 1: Core Infrastructure**
- **Sessions 1-3:** Database setup, authentication, basic routing
- **Sessions 4-5:** User roles, permissions, RLS policies
- **Sessions 6-7:** Basic UI layout, navigation, role guards

**Week 2: Data Models & Real-time**
- **Sessions 1-3:** Student and placement data models
- **Sessions 4-5:** Points and attendance tracking system
- **Sessions 6-7:** Real-time subscriptions, optimistic updates

### Phase 2: Core Features (Weeks 3-4)

**Week 3: Dashboard & Rooms**
- **Sessions 1-3:** Dashboard KPI cards and charts
- **Sessions 4-5:** Rooms page with roster grid
- **Sessions 6-7:** Point entry system with approval workflow

**Week 4: Student Management & Room Assignment**
- **Sessions 1-3:** Student list and profile pages
- **Sessions 4-5:** Placement tracking and history
- **Sessions 6-7:** Room assignment with conflict checking

### Phase 3: Security & Data Management (Weeks 5-6)

**Week 5: Security & Import System**
- **Sessions 1-3:** Trespass management and security lookup system
- **Sessions 4-5:** CSV upload system with validation and manual entry
- **Sessions 6-7:** Mobile security app and access management

**Week 6: Reports & Final Integration**
- **Sessions 1-3:** Report generation and export system
- **Sessions 4-5:** Notification system and behavioral agreements
- **Sessions 6-7:** Testing, optimization, deployment prep

### Session Structure Template

**Each 1-2 Hour Session:**
- **Start Review (5 min):** Review previous session outcomes, check dependencies
- **Implementation (85%):** Focus on specific feature component with clear deliverable
- **Testing (10%):** Unit tests, integration checks, manual testing
- **End Summary (5 min):** Document progress, identify blockers, prepare next session

### Dependencies & Risk Mitigation

### Market Expansion by Version:

**V1.0 Target:** DAEP Coordinators & Alternative Education Directors
- **Market Size:** 900+ Texas districts with DAEP programs
- **Annual Revenue Potential:** $50M+ (Texas only)

**V2.0 Target:** District Safety Directors & Student Services
- **Market Size:** 1,200+ Texas districts (universal need)
- **Annual Revenue Potential:** $120M+ (expanded scope)

**V3.0 Target:** Campus Principals & Operations Directors  
- **Market Size:** 8,000+ Texas campuses
- **Annual Revenue Potential:** $300M+ (campus-level adoption)

### Testing Checkpoints

**Week 2:** Authentication, basic navigation, role permissions
**Week 4:** Point entry, attendance tracking, real-time updates  
**Week 6:** Full workflow testing, performance optimization, security audit

### Success Metrics

**MVP Success Criteria:**
- 100 students and 100 staff can use simultaneously
- Sub-second response times for point entry
- 99.9% uptime during school hours
- FERPA compliance validation complete
- All core workflows functional across devices

This implementation plan provides a structured approach to building your DAEP management system within the 4-6 week timeline while maintaining high quality and compliance standards.