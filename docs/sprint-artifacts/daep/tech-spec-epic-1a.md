# Epic Technical Specification: Core Schema & Security

Date: 2025-11-24
Author: Alan
Epic ID: 1a
Status: Draft

---

## Overview

Epic 1a establishes the foundational database schema and security infrastructure required for the DAEPManagement module. This epic is a critical prerequisite for all subsequent development - no feature work can proceed without the database tables, role-based access control, and module access restrictions it provides.

The scope includes updating the existing TrespassTracker schema to support incident-based linking (enabling CSV reconciliation in Epic 5), creating 21 new DAEP-specific database tables with proper RLS policies, implementing module-level access control (TrespassTracker only, DAEP only, or Both), adding new DAEP-specific roles to the permission system, and implementing the "approved teacher" flag for streamlined point entry workflows.

This epic directly addresses the PRD's core requirement of data trust through proper data isolation (tenant_id, campus scoping) and establishes the security foundation required for FERPA compliance.

## Objectives and Scope

### In-Scope

- **TrespassTracker Integration Fields:** Add `incident_number` and `incident_date` columns to `trespass_records` table for DAEP placement linking
- **DAEP Schema Creation:** Create 21 new database tables for DAEP module functionality
- **RLS Policies:** Implement Row-Level Security policies on all new tables, filtering by `tenant_id`
- **Module Access Control:** Add `module_access` field to `user_profiles` with middleware enforcement
- **New Roles:** Add DAEP-specific roles (`daep_admin_l1`, `daep_admin_l2`, `daep_staff`, `parent`, `student`, `counselor`)
- **Approved Teacher Flag:** Add `approved_teacher` boolean to `user_profiles` for point approval bypass
- **Audit Trail Extension:** Add `module` column to `admin_audit_log` for module-specific filtering

### Out-of-Scope

- UI for DAEP features (Epic 1b and later)
- Data migration from external systems (Epic 5)
- Bell schedule logic (Epic 1b)
- Point entry workflows (Epic 3)
- CSV reconciliation engine (Epic 5)
- Reporting and dashboards (Epic 6)
- Email notifications (Epic 7)

## System Architecture Alignment

This epic aligns with the modular monolith architecture documented in `architecture.md` and `integration-architecture.md`:

**Shared Infrastructure Utilized:**
- Supabase PostgreSQL with existing RLS patterns
- Clerk authentication integration (user sync via webhooks)
- Multi-tenancy via `tenant_id` column and subdomain routing
- Existing `admin_audit_log` table pattern

**Key Architecture Constraints:**
- All tables MUST include `tenant_id` with NOT NULL constraint
- RLS policies MUST be enabled on all tables
- New roles MUST integrate with existing role hierarchy (`master_admin > district_admin > campus_admin > viewer`)
- Schema changes MUST NOT break existing TrespassTracker functionality

**Cross-Module Integration:**
- `trespass_records.is_daep` flag links students to DAEP module
- `trespass_records.incident_number` enables CSV reconciliation matching
- Shared `campuses` and `tenants` tables provide organizational hierarchy

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|----------------|----------------|--------|---------|-------|
| **Migration Service** | Execute Supabase migrations for schema changes | SQL migration files | Database schema updates | Story 1.0, 1.1 |
| **Module Access Middleware** | Enforce module-level access control | User session, route path | Allow/deny access | Story 1.2 |
| **Role Management** | Handle DAEP role assignments and validation | User profile updates | Updated permissions | Story 1.3 |
| **Approved Teacher Service** | Manage teacher approval flag | Admin toggle action | Updated user profile | Story 1.4 |
| **Audit Logger** | Record all schema and permission changes | Mutation events | Audit log entries | All stories |

### Data Models and Contracts

#### Story 1.0: TrespassTracker Schema Updates

```sql
-- Add incident tracking fields to trespass_records
ALTER TABLE trespass_records
ADD COLUMN incident_number TEXT,
ADD COLUMN incident_date DATE;

-- Index for fast lookups during CSV reconciliation
CREATE INDEX idx_trespass_records_incident_number
ON trespass_records(incident_number)
WHERE incident_number IS NOT NULL;

-- Composite index for student + incident matching
CREATE INDEX idx_trespass_records_student_incident
ON trespass_records(school_id, incident_number);
```

#### Story 1.1: DAEP Core Tables

```sql
-- Primary DAEP tables (21 total)

-- 1. Placements (core entity)
CREATE TABLE daep_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  student_record_id UUID NOT NULL REFERENCES trespass_records(id),
  incident_number TEXT NOT NULL,
  incident_date DATE,
  discipline_code_id UUID REFERENCES daep_discipline_codes(id),
  home_campus_id UUID NOT NULL REFERENCES campuses(id),
  daep_campus_id UUID REFERENCES campuses(id),
  room_id UUID REFERENCES daep_rooms(id),
  start_date DATE NOT NULL,
  days_assigned INT NOT NULL CHECK (days_assigned > 0),
  days_served INT DEFAULT 0,
  days_remaining INT GENERATED ALWAYS AS (days_assigned - days_served) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'transition', 'complete')),
  placement_reason TEXT,
  math_assessment_score NUMERIC(5,2),
  reading_assessment_score NUMERIC(5,2),
  assessment_90day_required BOOLEAN DEFAULT false,
  assessment_90day_completed_at TIMESTAMPTZ,
  transition_date DATE,
  completion_date DATE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daily Points
CREATE TABLE daep_daily_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  student_record_id UUID NOT NULL REFERENCES trespass_records(id),
  date DATE NOT NULL,
  period INT NOT NULL CHECK (period >= 1 AND period <= 10),
  points INT NOT NULL CHECK (points >= 0 AND points <= 10),
  notes TEXT,
  entered_by TEXT NOT NULL,
  approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(placement_id, date, period)
);

-- 3. Attendance
CREATE TABLE daep_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  student_record_id UUID NOT NULL REFERENCES trespass_records(id),
  date DATE NOT NULL,
  period INT NOT NULL CHECK (period >= 1 AND period <= 10),
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'tardy', 'early_dismissal')),
  tardy_time TIME,
  early_dismiss_time TIME,
  excused BOOLEAN DEFAULT false,
  reason TEXT,
  entered_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(placement_id, date, period)
);

-- 4. Behavior Notes
CREATE TABLE daep_behavior_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID REFERENCES daep_placements(id) ON DELETE SET NULL,
  student_record_id UUID NOT NULL REFERENCES trespass_records(id),
  category_id UUID REFERENCES daep_behavior_categories(id),
  note_date DATE NOT NULL,
  note_time TIME NOT NULL,
  description TEXT NOT NULL,
  is_positive BOOLEAN DEFAULT false,
  entered_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Rooms
CREATE TABLE daep_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  campus_id UUID NOT NULL REFERENCES campuses(id),
  room_number TEXT NOT NULL,
  room_name TEXT,
  building TEXT,
  max_capacity INT DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, campus_id, room_number)
);

-- 6. Room Staff Assignments
CREATE TABLE daep_room_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  room_id UUID NOT NULL REFERENCES daep_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Bell Schedules
CREATE TABLE daep_bell_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  campus_id UUID NOT NULL REFERENCES campuses(id),
  schedule_name TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('regular', 'early_release', 'half_day', 'custom')),
  periods JSONB NOT NULL,
  -- Example: [{"period": 1, "start": "08:00", "end": "08:50"}, ...]
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. School Calendar
CREATE TABLE daep_school_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  calendar_date DATE NOT NULL,
  is_school_day BOOLEAN DEFAULT true,
  day_type TEXT DEFAULT 'regular' CHECK (day_type IN ('regular', 'early_release', 'half_day', 'holiday', 'weather')),
  schedule_id UUID REFERENCES daep_bell_schedules(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, calendar_date)
);

-- 9. Discipline Codes (PEIMS)
CREATE TABLE daep_discipline_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  is_mandatory BOOLEAN DEFAULT false,
  behavior_location TEXT CHECK (behavior_location IN ('on_campus', 'off_campus', 'both')),
  peims_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

-- 10. Behavior Categories
CREATE TABLE daep_behavior_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_positive BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Point Bonus Rules
CREATE TABLE daep_point_bonus_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('streak', 'milestone', 'attendance')),
  threshold INT NOT NULL,
  bonus_points INT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Student Separations
CREATE TABLE daep_student_separations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  student_a_id UUID NOT NULL REFERENCES trespass_records(id),
  student_b_id UUID NOT NULL REFERENCES trespass_records(id),
  separation_type TEXT DEFAULT 'building_half' CHECK (separation_type IN ('building_half', 'different_room', 'no_contact')),
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (student_a_id < student_b_id)
);

-- 13. Notifications
CREATE TABLE daep_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14-17. Reconciliation Tables (from architecture.md)
CREATE TABLE daep_csv_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  sis_name TEXT NOT NULL,
  field_mappings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daep_reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  total_records INT NOT NULL,
  matched_count INT DEFAULT 0,
  discrepancy_count INT DEFAULT 0,
  new_in_sis_count INT DEFAULT 0,
  missing_from_sis_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daep_reconciliation_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES daep_reconciliation_sessions(id) ON DELETE CASCADE,
  student_id TEXT,
  discrepancy_type TEXT NOT NULL CHECK (discrepancy_type IN ('field_conflict', 'new_in_sis', 'missing_from_sis')),
  sis_data JSONB NOT NULL,
  daep_data JSONB,
  conflicts JSONB,
  resolution TEXT CHECK (resolution IN ('accept_sis', 'keep_daep', 'pending')),
  resolution_note TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daep_reconciliation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES daep_reconciliation_sessions(id),
  discrepancy_id UUID REFERENCES daep_reconciliation_discrepancies(id),
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add DAEP fields to trespass_records
ALTER TABLE trespass_records
ADD COLUMN IF NOT EXISTS grade_level TEXT,
ADD COLUMN IF NOT EXISTS parent_email TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS special_education BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS plan_504 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ell_status BOOLEAN DEFAULT false;

-- Add module column to audit log
ALTER TABLE admin_audit_log
ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'trespass_tracker';
```

#### Story 1.2: Module Access Control

```sql
-- Add module_access to user_profiles
ALTER TABLE user_profiles
ADD COLUMN module_access TEXT DEFAULT 'both'
CHECK (module_access IN ('trespass_only', 'daep_only', 'both'));

-- Update existing users to have 'both' access
UPDATE user_profiles SET module_access = 'both' WHERE module_access IS NULL;
```

#### Story 1.3: New DAEP Roles

```sql
-- Extend role enum (if using enum type, or add check constraint)
-- Assuming role is TEXT with check constraint:
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_role_check
CHECK (role IN (
  'viewer', 'campus_admin', 'district_admin', 'master_admin',
  'daep_admin_l1', 'daep_admin_l2', 'daep_staff',
  'parent', 'student', 'counselor'
));
```

#### Story 1.4: Approved Teacher Flag

```sql
-- Add approved_teacher flag
ALTER TABLE user_profiles
ADD COLUMN approved_teacher BOOLEAN DEFAULT false;
```

#### RLS Policies (All Tables)

```sql
-- Example RLS policy pattern (apply to all 21 tables)
ALTER TABLE daep_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON daep_placements
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM user_profiles WHERE clerk_user_id = auth.uid())
);

-- Repeat for all DAEP tables...
```

### APIs and Interfaces

This epic is primarily database schema work. Server actions will be implemented in subsequent epics, but the foundation enables:

| Future Server Action | Tables Used | Epic |
|---------------------|-------------|------|
| `createPlacement()` | `daep_placements`, `trespass_records` | Epic 2 |
| `enterPoints()` | `daep_daily_points` | Epic 3 |
| `recordAttendance()` | `daep_attendance` | Epic 3 |
| `createBehaviorNote()` | `daep_behavior_notes` | Epic 4 |
| `startReconciliation()` | `daep_reconciliation_*` | Epic 5 |

**Module Access Middleware Interface:**

```typescript
// lib/middleware/module-access.ts
export async function checkModuleAccess(
  userId: string,
  requiredModule: 'trespass' | 'daep'
): Promise<boolean> {
  const profile = await getUserProfile(userId);

  if (profile.module_access === 'both') return true;
  if (profile.module_access === 'trespass_only' && requiredModule === 'trespass') return true;
  if (profile.module_access === 'daep_only' && requiredModule === 'daep') return true;

  return false;
}
```

**Role Hierarchy Utility:**

```typescript
// lib/roles.ts
export const ROLE_HIERARCHY = {
  master_admin: 100,
  district_admin: 90,
  daep_admin_l1: 80,
  campus_admin: 70,
  daep_admin_l2: 60,
  daep_staff: 50,
  counselor: 40,
  viewer: 30,
  parent: 20,
  student: 10
};

export function hasPermission(userRole: string, requiredRole: string): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
```

### Workflows and Sequencing

**Migration Execution Order:**

```
1. Story 1.0: TrespassTracker schema update
   └── Add incident_number, incident_date to trespass_records
   └── Create indexes

2. Story 1.1: DAEP tables (depends on 1.0)
   └── Create all 21 DAEP tables
   └── Add DAEP fields to trespass_records
   └── Add module column to admin_audit_log
   └── Enable RLS on all tables
   └── Create RLS policies

3. Story 1.2: Module access control (depends on 1.1)
   └── Add module_access to user_profiles
   └── Update middleware.ts
   └── Update sidebar navigation

4. Story 1.3: New roles (depends on 1.2)
   └── Extend role enum
   └── Update RLS policies for new roles
   └── Update admin panel

5. Story 1.4: Approved teacher flag (depends on 1.3)
   └── Add approved_teacher column
   └── Update admin panel user edit form
```

## Non-Functional Requirements

### Performance

| Requirement | Target | Source | Implementation |
|-------------|--------|--------|----------------|
| Migration execution time | < 30 seconds per migration | NFR3 | Use `IF NOT EXISTS` clauses, batch operations |
| RLS policy overhead | < 10ms per query | NFR1 | Optimize tenant lookup with indexed user profile |
| Module access check | < 5ms | NFR1 | Cache user profile in session |
| Index creation | Non-blocking | Best practice | Use `CONCURRENTLY` for production indexes |

**Schema Design Considerations:**
- All foreign keys indexed automatically by Supabase
- Composite indexes on frequently queried columns (`tenant_id`, `date`, `student_record_id`)
- Generated columns (`days_remaining`) computed at write time, not query time
- JSONB columns indexed with GIN for reconciliation queries

### Security

| Requirement | Implementation | Source |
|-------------|----------------|--------|
| **NFR7:** Data encrypted at rest | Supabase default (AES-256) | PRD |
| **NFR12:** Row-level security | RLS policies on all 21 tables | PRD |
| **FR6:** Scoped data access | `tenant_id` filtering via RLS | PRD |
| **FERPA compliance** | Audit logging for all student data access | PRD |
| Module isolation | Middleware blocks unauthorized module access | FR4a, FR4b |
| Role-based access | RLS policies check `user_profiles.role` | FR3, FR4 |

**Security Implementation Details:**

```sql
-- Example: Role-aware RLS policy for daep_placements
CREATE POLICY "role_based_access" ON daep_placements
FOR SELECT USING (
  tenant_id = current_tenant_id() AND (
    -- District admins see all
    current_user_role() IN ('master_admin', 'district_admin') OR
    -- DAEP admins see all DAEP data
    current_user_role() IN ('daep_admin_l1', 'daep_admin_l2') OR
    -- Staff see assigned room students only
    (current_user_role() = 'daep_staff' AND room_id IN (
      SELECT room_id FROM daep_room_staff WHERE user_id = auth.uid()
    )) OR
    -- Parents/students see own record only
    (current_user_role() IN ('parent', 'student') AND student_record_id IN (
      SELECT id FROM trespass_records WHERE ... -- linked to current user
    ))
  )
);
```

### Reliability/Availability

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| Migration rollback | All migrations reversible | Include `DOWN` migration scripts |
| Zero downtime | Schema changes non-breaking | Additive changes only (no column drops) |
| Data integrity | Foreign key constraints | `ON DELETE CASCADE` / `SET NULL` as appropriate |
| Constraint validation | Check constraints on enums | Prevent invalid status values |

**Rollback Strategy:**
- Each migration file includes both `UP` and `DOWN` scripts
- Story 1.0 and 1.1 are additive (no existing data modified)
- Story 1.2-1.4 add columns with defaults (backwards compatible)
- Test rollback on staging before production deployment

### Observability

| Signal | Implementation | Purpose |
|--------|----------------|---------|
| Migration logs | Supabase migration output | Track schema changes |
| Audit trail | `admin_audit_log.module = 'daep_management'` | FERPA compliance |
| Permission changes | Audit log entries for role/access changes | Security monitoring |
| RLS policy hits | Supabase query logs | Performance monitoring |

**Audit Event Types for Epic 1a:**
- `user.module_access_changed` - Module access updated
- `user.role_changed` - Role assignment changed
- `user.approved_teacher_changed` - Teacher approval flag toggled
- `schema.migration_applied` - Migration executed

## Dependencies and Integrations

### Existing Infrastructure Dependencies

| Dependency | Version | Purpose | Required By |
|------------|---------|---------|-------------|
| **Supabase PostgreSQL** | Latest | Database hosting, RLS | All stories |
| **Clerk** | ^6.33.1 | Authentication, user sync | Stories 1.2-1.4 |
| **Next.js** | ^15.5.4 | Middleware for module access | Story 1.2 |
| **TypeScript** | ^5.9.3 | Type definitions for new schemas | All stories |
| **Zod** | ^3.25.76 | Validation schemas for new types | Stories 1.2-1.4 |

### New Dependencies Required

None - Epic 1a uses only existing infrastructure.

### Integration Points

| System | Integration Type | Direction | Details |
|--------|------------------|-----------|---------|
| **TrespassTracker Module** | Database link | Bidirectional | `trespass_records` table extended with DAEP fields |
| **Clerk Webhooks** | Event sync | Incoming | User profile sync continues unchanged |
| **Admin Audit Log** | Logging | Outgoing | New `module` column for filtering |
| **Supabase Storage** | File storage | Outgoing | Prepared for Epic 5 CSV uploads |

### Database Relationship Diagram

```
┌─────────────────┐     ┌──────────────────┐
│    tenants      │────<│    campuses      │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         │    ┌──────────────────┼──────────────────┐
         │    │                  │                  │
         ▼    ▼                  ▼                  ▼
┌─────────────────┐     ┌──────────────────┐  ┌──────────────────┐
│ trespass_records│────<│ daep_placements  │  │   daep_rooms     │
│ (extended)      │     │                  │  │                  │
│ +incident_number│     │ +student_record_id│ └────────┬─────────┘
│ +incident_date  │     │ +room_id         │          │
│ +grade_level    │     │ +home_campus_id  │          │
│ +parent_email   │     │ +discipline_code │          ▼
│ +special_ed     │     └────────┬─────────┘  ┌──────────────────┐
└─────────────────┘              │            │ daep_room_staff  │
                                 │            └──────────────────┘
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│daep_daily_points│     │ daep_attendance  │     │daep_behavior_notes│
└─────────────────┘     └──────────────────┘     └──────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ user_profiles   │     │daep_bell_schedules│    │daep_school_calendar│
│ (extended)      │     └──────────────────┘     └──────────────────┘
│ +module_access  │
│ +approved_teacher│    ┌──────────────────┐     ┌──────────────────┐
│ +new DAEP roles │     │daep_discipline_codes│  │daep_behavior_categories│
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

## Acceptance Criteria (Authoritative)

### Story 1.0: TrespassTracker Schema Update

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 1.0.1 | Migration adds `incident_number` (TEXT, nullable) to `trespass_records` | `SELECT incident_number FROM trespass_records LIMIT 1` succeeds |
| 1.0.2 | Migration adds `incident_date` (DATE, nullable) to `trespass_records` | `SELECT incident_date FROM trespass_records LIMIT 1` succeeds |
| 1.0.3 | Index created on `incident_number` for fast lookups | Index `idx_trespass_records_incident_number` exists in `pg_indexes` |
| 1.0.4 | Existing TrespassTracker functionality unchanged | All existing TT tests pass after migration |
| 1.0.5 | Migration runs successfully on local and staging | Migration completes without errors on both environments |

### Story 1.1: DAEP Database Schema Migration

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 1.1.1 | All 21 DAEP tables created | `SELECT count(*) FROM information_schema.tables WHERE table_name LIKE 'daep_%'` = 17 (core tables) + reconciliation tables |
| 1.1.2 | All tables have `tenant_id` with NOT NULL | `SELECT * FROM daep_placements WHERE tenant_id IS NULL` returns 0 rows (constraint enforced) |
| 1.1.3 | RLS enabled on all DAEP tables | `SELECT relrowsecurity FROM pg_class WHERE relname = 'daep_placements'` = true |
| 1.1.4 | RLS policies filter by tenant_id | Query from User A cannot see User B's tenant data |
| 1.1.5 | Indexes created on key columns | Indexes exist on `tenant_id`, `student_record_id`, `date` columns |
| 1.1.6 | `updated_at` triggers work | Insert row, update row, verify `updated_at` changed |
| 1.1.7 | No breaking changes to TrespassTracker | Existing TT queries and UI continue to function |
| 1.1.8 | DAEP fields added to `trespass_records` | Columns `grade_level`, `parent_email`, `special_education`, etc. exist |
| 1.1.9 | `module` column added to `admin_audit_log` | `SELECT module FROM admin_audit_log LIMIT 1` succeeds |

### Story 1.2: Module Access Control

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 1.2.1 | `module_access` column exists on `user_profiles` | Column exists with CHECK constraint for valid values |
| 1.2.2 | Default value is 'both' for existing users | `SELECT count(*) FROM user_profiles WHERE module_access != 'both'` = 0 initially |
| 1.2.3 | Admin panel shows module access dropdown | UI displays dropdown with 3 options when editing user |
| 1.2.4 | Sidebar only shows authorized modules | User with 'daep_only' sees DAEP nav items, not TT items |
| 1.2.5 | Middleware blocks `/daep/*` for 'trespass_only' users | HTTP 403 returned when accessing DAEP routes |
| 1.2.6 | Middleware blocks `/trespass/*` for 'daep_only' users | HTTP 403 returned when accessing TT routes |
| 1.2.7 | Server actions check module access | Server action throws error if module access denied |
| 1.2.8 | Audit log records module access changes | `admin_audit_log` entry created when `module_access` changed |

### Story 1.3: New DAEP Roles

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 1.3.1 | New roles added to role enum | INSERT with role='daep_admin_l1' succeeds |
| 1.3.2 | All 6 new roles documented | Code comments describe each role's permissions |
| 1.3.3 | Admin panel includes new roles in dropdown | Dropdown shows all 10 roles (4 existing + 6 new) |
| 1.3.4 | RLS policies handle new roles | User with 'daep_staff' role sees only assigned room data |
| 1.3.5 | Role hierarchy enforced | `daep_admin_l1` has more permissions than `daep_admin_l2` |
| 1.3.6 | Parent/Student roles are read-only | Users with these roles cannot INSERT/UPDATE/DELETE |
| 1.3.7 | Existing roles unchanged | Users with 'viewer', 'campus_admin', etc. have same access |

### Story 1.4: Approved Teacher Flag

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 1.4.1 | `approved_teacher` column exists | Column exists with BOOLEAN type, default false |
| 1.4.2 | Admin panel shows toggle on user edit | Toggle visible for `daep_staff` and `daep_admin_l2` users |
| 1.4.3 | Toggle only visible for appropriate roles | Toggle hidden for district_admin, parent, student roles |
| 1.4.4 | Flag can be changed without affecting other properties | Update only `approved_teacher`, other fields unchanged |
| 1.4.5 | Audit log records flag changes | `admin_audit_log` entry created when flag toggled |

## Traceability Mapping

| AC | Spec Section | Component/Table | Test Approach |
|----|--------------|-----------------|---------------|
| **1.0.1-1.0.2** | Data Models - Story 1.0 | `trespass_records` | Migration test |
| **1.0.3** | Data Models - Story 1.0 | `pg_indexes` | Schema inspection |
| **1.0.4-1.0.5** | Workflows | Migration scripts | Integration test |
| **1.1.1** | Data Models - Story 1.1 | All `daep_*` tables | Schema count query |
| **1.1.2** | Data Models - Story 1.1 | All tables | Constraint test |
| **1.1.3-1.1.4** | Security - RLS | RLS policies | Multi-tenant test |
| **1.1.5** | Performance | Indexes | Schema inspection |
| **1.1.6** | Data Models | `updated_at` triggers | Insert/update test |
| **1.1.7** | Reliability | TrespassTracker | Regression test |
| **1.1.8-1.1.9** | Data Models | `trespass_records`, `admin_audit_log` | Schema inspection |
| **1.2.1-1.2.2** | Data Models - Story 1.2 | `user_profiles` | Schema + data test |
| **1.2.3** | APIs - Module Access | Admin panel UI | Manual/E2E test |
| **1.2.4** | APIs - Module Access | Sidebar component | Component test |
| **1.2.5-1.2.6** | APIs - Middleware | `middleware.ts` | Integration test |
| **1.2.7** | APIs - Module Access | Server actions | Unit test |
| **1.2.8** | Observability | `admin_audit_log` | Audit query test |
| **1.3.1** | Data Models - Story 1.3 | `user_profiles.role` | Constraint test |
| **1.3.2** | Documentation | Code comments | Code review |
| **1.3.3** | APIs | Admin panel UI | Manual/E2E test |
| **1.3.4-1.3.5** | Security - RLS | RLS policies | Role-based access test |
| **1.3.6** | Security | RLS policies | Permission denial test |
| **1.3.7** | Reliability | Existing roles | Regression test |
| **1.4.1** | Data Models - Story 1.4 | `user_profiles` | Schema inspection |
| **1.4.2-1.4.3** | APIs | Admin panel UI | Conditional render test |
| **1.4.4** | APIs | Update mutation | Isolation test |
| **1.4.5** | Observability | `admin_audit_log` | Audit query test |

### FR Coverage Summary

| FR | Description | Covered By |
|----|-------------|------------|
| **FR3** | Admin user management | Story 1.3 (new roles) |
| **FR4** | Role assignment | Story 1.3 (role enum extension) |
| **FR4a** | Module access assignment | Story 1.2 (module_access field) |
| **FR4b** | Module access enforcement | Story 1.2 (middleware + RLS) |
| **FR5** | Approved teacher flag | Story 1.4 (approved_teacher column) |
| **FR6** | Scoped data access | Story 1.1 (RLS policies) |
| **Schema** | DAEP data foundation | Story 1.0, 1.1 (all tables) |

## Risks, Assumptions, Open Questions

### Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| **R1** | Migration breaks existing TrespassTracker functionality | Low | High | Run full TT regression suite after each migration; use `IF NOT EXISTS` clauses |
| **R2** | RLS policies too restrictive, blocking legitimate access | Medium | Medium | Test all role combinations in staging; implement emergency bypass for master_admin |
| **R3** | Performance degradation from RLS overhead on 21 new tables | Low | Medium | Optimize tenant lookup query; add indexes; benchmark before/after |
| **R4** | Role hierarchy conflicts with existing TT permissions | Medium | Medium | Document role mapping; test cross-module access scenarios |
| **R5** | Module access middleware adds latency to all requests | Low | Low | Cache user profile in session; lazy-load module access check |
| **R6** | Schema changes cause Supabase type generation to fail | Low | Medium | Regenerate types after each migration; update TypeScript interfaces |

### Assumptions

| ID | Assumption | Validation Approach |
|----|------------|---------------------|
| **A1** | Existing `trespass_records` table can be extended without migration issues | Test migration on staging with production data snapshot |
| **A2** | Clerk webhook sync continues to work with new `user_profiles` columns | Verify webhook payload handling ignores unknown columns |
| **A3** | Supabase RLS supports the complex role-based policies required | Prototype RLS policy for `daep_placements` early |
| **A4** | `tenant_id` is available in all query contexts via authenticated Supabase client | Verify existing pattern from TrespassTracker |
| **A5** | Admin panel user edit form can be extended without major refactoring | Review existing form component structure |
| **A6** | Existing sidebar navigation component supports conditional rendering | Inspect current implementation |

### Open Questions (RESOLVED)

| ID | Question | Decision | Date |
|----|----------|----------|------|
| **Q1** | Should `parent` and `student` roles have separate authentication flow? | **Same Clerk instance** - Parents/students use same magic link flow as staff. Single user table, simpler implementation. | 2025-11-24 |
| **Q2** | What is the default `module_access` for new users? | **Default = 'both'** - New users get access to both modules by default. Admin can restrict later. | 2025-11-24 |
| **Q3** | Should `counselor` role have cross-campus access? | **Single campus** - Counselors see only students from their assigned campus, like `daep_staff`. | 2025-11-24 |
| **Q4** | How should RLS handle users with multiple roles? | **Deferred** - Future consideration if multi-role support is needed. | - |

## Test Strategy Summary

### Test Levels

| Level | Scope | Tools | Coverage |
|-------|-------|-------|----------|
| **Unit Tests** | Role utilities, permission checks | Vitest | `lib/roles.ts`, `lib/middleware/module-access.ts` |
| **Integration Tests** | Migration execution, RLS policies | Supabase test client | All 21 tables, all RLS policies |
| **E2E Tests** | Admin panel flows, navigation | Playwright | Module access UI, role dropdown |
| **Regression Tests** | TrespassTracker functionality | Existing test suite | All TT features still work |

### Test Scenarios by Story

**Story 1.0:**
- [ ] Migration adds columns without data loss
- [ ] Indexes created successfully
- [ ] Existing TT queries unaffected
- [ ] Rollback works cleanly

**Story 1.1:**
- [ ] All 21 tables created with correct schema
- [ ] RLS enabled on all tables
- [ ] Tenant isolation enforced (User A can't see User B's data)
- [ ] Foreign key constraints work
- [ ] `updated_at` triggers fire correctly
- [ ] No TT regression

**Story 1.2:**
- [ ] Module access column exists with correct default
- [ ] Admin can change module access via UI
- [ ] Sidebar shows correct modules based on access
- [ ] Middleware blocks unauthorized routes
- [ ] Server actions reject unauthorized requests
- [ ] Audit log captures changes

**Story 1.3:**
- [ ] All 6 new roles can be assigned
- [ ] Role hierarchy permissions work correctly
- [ ] RLS policies respect new roles
- [ ] Parent/student roles are read-only
- [ ] Existing roles unchanged

**Story 1.4:**
- [ ] Approved teacher flag exists with default false
- [ ] Admin can toggle flag via UI
- [ ] Toggle only visible for appropriate roles
- [ ] Audit log captures changes

### Critical Path Tests

These tests MUST pass before Epic 1a is considered complete:

1. **Multi-tenant isolation:** Create data in Tenant A, verify Tenant B cannot access
2. **Role-based access:** Verify `daep_staff` sees only assigned room data
3. **Module access enforcement:** Verify middleware blocks unauthorized module access
4. **TT regression:** All existing TrespassTracker features work unchanged
5. **Migration rollback:** Verify all migrations can be rolled back cleanly

### Edge Cases

- User with `both` module access switching to `daep_only` mid-session
- User role changed while they have active session
- Multiple admins editing same user simultaneously
- Migration run on database with existing DAEP-named tables (naming conflict)
- User with no campus assignment accessing campus-scoped data

---

*Tech Spec generated by Epic Tech Context workflow*
*Last updated: 2025-11-24*

