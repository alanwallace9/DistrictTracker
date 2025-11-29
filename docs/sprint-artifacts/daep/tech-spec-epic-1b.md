# Epic Technical Specification: Configuration UI

Date: 2025-11-24
Author: Alan
Epic ID: 1b
Status: Draft

---

## Overview

Epic 1b builds the administrative configuration UI for the DAEPManagement module, enabling district administrators to set up the foundational settings required before any operational workflows can function. This epic must be completed after Epic 1a (Core Schema & Security) because it depends on the database tables created there, and before Epic 2 (Placement Management) because placements require configured rooms, bell schedules, and discipline codes.

The Configuration UI provides a centralized settings interface at `/daep/settings` with tabbed navigation for six configuration areas: Rooms, Bell Schedules, Discipline Codes, School Calendar, General Settings, and Behavior Categories. Each configuration screen follows the established TrespassTracker admin panel patterns for consistency, using shadcn/ui DataTable components with CRUD operations exposed through server actions.

This epic directly addresses the PRD's operational foundation requirements - teachers cannot enter points without knowing the current period (bell schedules), placements cannot be created without discipline codes (PEIMS compliance), and days-remaining calculations require a school calendar. By completing this epic first, the system is "ready for business" when feature development begins.

## Objectives and Scope

### In-Scope

- **Room Management (Story 1.5):** CRUD operations for DAEP rooms with capacity limits, building sections for separation logic, and staff assignment (primary/rotational)
- **Bell Schedule Configuration (Story 1.6):** Create multiple bell schedule types (Regular, Early Release, Half Day, Custom) with period definitions; set default schedule; real-time period calculation utility
- **Discipline Code Management (Story 1.7):** Configure Texas PEIMS discipline codes with labels, mandatory/discretionary flags, and behavior location classification; validation on placement entry
- **School Calendar Configuration (Story 1.8):** CSV upload of school year calendar, manual day-type assignment, weather day adjustments; school day calculation for days-remaining
- **District/Campus Settings (Story 1.9):** District-level settings (timezone, default points, thresholds) and campus-level DAEP configuration
- **Behavior Categories (Story 1.10):** Configurable positive/negative/neutral behavior categories for point entries and behavior notes

### Out-of-Scope

- Student management UI (Epic 2)
- Point entry and approval workflows (Epic 3)
- Attendance tracking (Epic 3)
- Behavior note creation (Epic 4)
- CSV reconciliation (Epic 5)
- Dashboard and reporting (Epic 6)
- Email notification configuration (Epic 7)
- Parent/student portal views (Growth feature)

## System Architecture Alignment

This epic aligns with the modular monolith architecture documented in `architecture.md` and `integration-architecture.md`:

**Shared Infrastructure Utilized:**
- Supabase PostgreSQL with existing RLS patterns for tenant isolation
- Clerk authentication for admin role verification
- shadcn/ui component library (DataTable, Form, Dialog, Tabs)
- React Hook Form + Zod validation pattern from TrespassTracker
- Server Actions pattern (`'use server'` + revalidatePath)
- Admin audit logging (`admin_audit_log` table with `module = 'daep_management'`)

**Key Architecture Constraints:**
- All configuration tables already created in Epic 1a with `tenant_id` and RLS policies
- Settings UI follows existing admin panel patterns from TrespassTracker (`/admin/*` → `/daep/settings/*`)
- Only users with `district_admin`, `daep_admin_l1`, or `master_admin` roles can access settings pages
- All mutations logged to audit trail for compliance

**Route Structure:**
```
app/daep/settings/
├── page.tsx              # General settings (FR99, FR100)
├── rooms/page.tsx        # Room management (FR63, FR64)
├── schedules/page.tsx    # Bell schedules (FR65, FR66)
├── codes/page.tsx        # Discipline codes (FR69-FR72)
├── calendar/page.tsx     # School calendar (FR104)
└── behaviors/page.tsx    # Behavior categories (FR47, FR101)
```

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Story |
|----------------|----------------|--------|---------|-------|
| **Room Management Service** | CRUD for DAEP rooms, staff assignments | Room data, staff IDs | Room records, assignment records | 1.5 |
| **Bell Schedule Service** | CRUD for schedules, period calculations | Schedule definitions, current time | Schedule records, current period | 1.6 |
| **Discipline Code Service** | CRUD for PEIMS codes, validation | Code definitions | Code records, validation results | 1.7 |
| **School Calendar Service** | CSV import, day management, school day calculations | CSV file, date range | Calendar entries, school day counts | 1.8 |
| **Settings Service** | District/campus configuration management | Settings values | Tenant configuration | 1.9 |
| **Behavior Category Service** | CRUD for behavior categories | Category definitions | Category records | 1.10 |
| **Current Period Utility** | Real-time period determination | Current time, campus ID | Current period info | 1.6 |

### Data Models and Contracts

**Note:** All tables were created in Epic 1a. This section documents the expected schema and Zod validation schemas for the UI.

#### Story 1.5: Room Management

```typescript
// lib/validation/daep-schemas.ts

export const RoomSchema = z.object({
  room_number: z.string().min(1, 'Room number required').max(20),
  room_name: z.string().max(100).optional(),
  campus_id: z.string().uuid('Invalid campus'),
  capacity: z.number().int().min(1).max(30).default(15),
  building_section: z.string().max(50).optional(), // "501-505" or "506-509"
  is_active: z.boolean().default(true)
});

export const RoomStaffSchema = z.object({
  room_id: z.string().uuid(),
  user_id: z.string().min(1, 'Staff member required'),
  is_primary: z.boolean().default(false)
});

export type CreateRoomInput = z.infer<typeof RoomSchema>;
export type CreateRoomStaffInput = z.infer<typeof RoomStaffSchema>;
```

#### Story 1.6: Bell Schedule Configuration

```typescript
export const PeriodDefinitionSchema = z.object({
  period: z.string().min(1), // "1st", "2nd", "Lunch", etc.
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format')
});

export const BellScheduleSchema = z.object({
  schedule_name: z.string().min(1, 'Schedule name required').max(50),
  schedule_type: z.enum(['regular', 'early_release', 'half_day', 'custom']),
  campus_id: z.string().uuid('Invalid campus'),
  periods: z.array(PeriodDefinitionSchema).min(1, 'At least one period required'),
  is_default: z.boolean().default(false)
});

export type CreateBellScheduleInput = z.infer<typeof BellScheduleSchema>;
```

#### Story 1.7: Discipline Code Management

```typescript
export const DisciplineCodeSchema = z.object({
  code: z.string().min(1, 'PEIMS code required').max(20),
  description: z.string().min(1, 'Description required').max(200),
  category: z.string().max(100).optional(),
  is_mandatory: z.boolean().default(false),
  behavior_location: z.enum(['on_campus', 'off_campus', 'both']).default('both'),
  peims_code: z.string().max(20).optional(),
  is_active: z.boolean().default(true)
});

export type CreateDisciplineCodeInput = z.infer<typeof DisciplineCodeSchema>;
```

#### Story 1.8: School Calendar Configuration

```typescript
export const CalendarEntrySchema = z.object({
  calendar_date: z.string().date(),
  is_school_day: z.boolean().default(true),
  day_type: z.enum(['regular', 'early_release', 'half_day', 'holiday', 'weather']).default('regular'),
  schedule_id: z.string().uuid().optional(),
  notes: z.string().max(500).optional()
});

export const CalendarCSVRowSchema = z.object({
  date: z.string(), // Will be parsed to Date
  is_school_day: z.string().transform(v => v.toLowerCase() === 'true' || v === '1'),
  day_type: z.string().optional(),
  notes: z.string().optional()
});

export type CreateCalendarEntryInput = z.infer<typeof CalendarEntrySchema>;
```

#### Story 1.9: District/Campus Settings

```typescript
export const DistrictSettingsSchema = z.object({
  timezone: z.string().default('America/Chicago'),
  default_points_per_period: z.number().int().min(0).max(10).default(10),
  attendance_threshold: z.number().min(0).max(100).default(85),
  point_threshold_warning: z.number().min(0).max(10).default(7),
  school_year: z.string().regex(/^\d{4}-\d{4}$/, 'Format: 2024-2025')
});

export const CampusSettingsSchema = z.object({
  daep_campus_name: z.string().min(1).max(100),
  daep_campus_address: z.string().max(200).optional(),
  daep_campus_phone: z.string().max(20).optional(),
  max_room_capacity: z.number().int().min(1).max(50).default(15)
});

export type DistrictSettingsInput = z.infer<typeof DistrictSettingsSchema>;
export type CampusSettingsInput = z.infer<typeof CampusSettingsSchema>;
```

#### Story 1.10: Behavior Categories

```typescript
export const BehaviorCategorySchema = z.object({
  name: z.string().min(1, 'Category name required').max(50),
  description: z.string().max(200).optional(),
  is_positive: z.boolean().default(false),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true)
});

export type CreateBehaviorCategoryInput = z.infer<typeof BehaviorCategorySchema>;
```

### APIs and Interfaces

#### Server Actions (app/actions/daep/settings.ts)

```typescript
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { logAuditEvent } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';

// ========== ROOM MANAGEMENT ==========

export async function getRooms(): Promise<DAEPRoom[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('daep_rooms')
    .select(`
      *,
      campus:campuses(id, name),
      staff:daep_room_staff(id, user_id, is_primary)
    `)
    .order('room_number');

  if (error) throw new Error(error.message);
  return data;
}

export async function createRoom(data: CreateRoomInput): Promise<DAEPRoom> {
  const supabase = await createServerClient();
  const { userId } = await auth();

  if (!userId) throw new Error('Unauthorized');

  const validation = RoomSchema.safeParse(data);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.message}`);
  }

  const { data: room, error } = await supabase
    .from('daep_rooms')
    .insert(validation.data)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAuditEvent({
    eventType: 'room.created',
    module: 'daep_management',
    actorId: userId,
    targetId: room.id,
    action: `Created DAEP room ${data.room_number}`,
    tenantId: room.tenant_id,
    details: { room_number: data.room_number, capacity: data.capacity }
  });

  revalidatePath('/daep/settings/rooms');
  return room;
}

export async function updateRoom(id: string, data: Partial<CreateRoomInput>): Promise<DAEPRoom>;
export async function deleteRoom(id: string): Promise<void>;
export async function assignStaffToRoom(data: CreateRoomStaffInput): Promise<void>;
export async function removeStaffFromRoom(assignmentId: string): Promise<void>;

// ========== BELL SCHEDULES ==========

export async function getBellSchedules(): Promise<DAEPBellSchedule[]>;
export async function createBellSchedule(data: CreateBellScheduleInput): Promise<DAEPBellSchedule>;
export async function updateBellSchedule(id: string, data: Partial<CreateBellScheduleInput>): Promise<DAEPBellSchedule>;
export async function deleteBellSchedule(id: string): Promise<void>;
export async function setDefaultSchedule(id: string): Promise<void>;

// ========== DISCIPLINE CODES ==========

export async function getDisciplineCodes(): Promise<DAEPDisciplineCode[]>;
export async function createDisciplineCode(data: CreateDisciplineCodeInput): Promise<DAEPDisciplineCode>;
export async function updateDisciplineCode(id: string, data: Partial<CreateDisciplineCodeInput>): Promise<DAEPDisciplineCode>;
export async function deactivateDisciplineCode(id: string): Promise<void>;

// ========== SCHOOL CALENDAR ==========

export async function getSchoolCalendar(schoolYear: string): Promise<DAEPCalendarEntry[]>;
export async function uploadSchoolCalendarCSV(file: File): Promise<{ imported: number; errors: string[] }>;
export async function updateCalendarEntry(id: string, data: Partial<CreateCalendarEntryInput>): Promise<void>;
export async function markWeatherDay(date: string, notes?: string): Promise<void>;

// ========== SETTINGS ==========

export async function getDistrictSettings(): Promise<DistrictSettings>;
export async function updateDistrictSettings(data: DistrictSettingsInput): Promise<void>;
export async function getCampusSettings(campusId: string): Promise<CampusSettings>;
export async function updateCampusSettings(campusId: string, data: CampusSettingsInput): Promise<void>;

// ========== BEHAVIOR CATEGORIES ==========

export async function getBehaviorCategories(): Promise<DAEPBehaviorCategory[]>;
export async function createBehaviorCategory(data: CreateBehaviorCategoryInput): Promise<DAEPBehaviorCategory>;
export async function updateBehaviorCategory(id: string, data: Partial<CreateBehaviorCategoryInput>): Promise<void>;
export async function reorderBehaviorCategories(orderedIds: string[]): Promise<void>;
```

#### Current Period Utility (lib/daep/current-period.ts)

```typescript
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export interface CurrentPeriodInfo {
  period: string | null;        // "1st", "2nd", etc. or null if outside school hours
  startTime: string;
  endTime: string;
  isSchoolHours: boolean;
  nextPeriod: string | null;
  minutesUntilEnd: number;
}

export async function getCurrentPeriod(
  campusId: string,
  timezone: string = 'America/Chicago'
): Promise<CurrentPeriodInfo> {
  const supabase = await createServerClient();
  const now = toZonedTime(new Date(), timezone);
  const today = format(now, 'yyyy-MM-dd');
  const currentTime = format(now, 'HH:mm');

  // 1. Check if today is a school day
  const { data: calendarEntry } = await supabase
    .from('daep_school_calendar')
    .select('*, schedule:daep_bell_schedules(*)')
    .eq('calendar_date', today)
    .single();

  if (!calendarEntry?.is_school_day) {
    return { period: null, isSchoolHours: false, ... };
  }

  // 2. Get applicable schedule (from calendar or default)
  const schedule = calendarEntry.schedule || await getDefaultSchedule(campusId);

  // 3. Find current period
  const periods = schedule.periods as PeriodDefinition[];
  for (const p of periods) {
    if (currentTime >= p.start_time && currentTime < p.end_time) {
      return {
        period: p.period,
        startTime: p.start_time,
        endTime: p.end_time,
        isSchoolHours: true,
        nextPeriod: getNextPeriod(periods, p.period),
        minutesUntilEnd: calculateMinutesUntil(currentTime, p.end_time)
      };
    }
  }

  return { period: null, isSchoolHours: false, ... };
}

export async function getSchoolDayCount(
  startDate: Date,
  endDate: Date,
  tenantId: string
): Promise<number> {
  const supabase = await createServerClient();

  const { count } = await supabase
    .from('daep_school_calendar')
    .select('*', { count: 'exact', head: true })
    .eq('is_school_day', true)
    .gte('calendar_date', format(startDate, 'yyyy-MM-dd'))
    .lte('calendar_date', format(endDate, 'yyyy-MM-dd'));

  return count || 0;
}
```

### Workflows and Sequencing

**Story Dependency Order:**

```
Epic 1a (Complete) ─────────────────────────────────────────────────────────┐
                                                                             │
Story 1.9: District/Campus Settings ──────────────────────────────────────────┤
   └── First: Establishes timezone and base configuration                    │
                                                                             │
Story 1.5: Room Management ────────────────────────────────────────────────────┤
   └── Depends on: Campuses exist (from TT)                                  │
   └── Creates rooms for staff assignment and placement                      │
                                                                             │
Story 1.6: Bell Schedules ─────────────────────────────────────────────────────┤
   └── Depends on: Campuses exist                                            │
   └── Can run parallel with 1.5, 1.7                                        │
                                                                             │
Story 1.7: Discipline Codes ───────────────────────────────────────────────────┤
   └── No dependencies within epic                                           │
   └── Can run parallel with 1.5, 1.6                                        │
                                                                             │
Story 1.8: School Calendar ────────────────────────────────────────────────────┤
   └── Depends on: Bell Schedules (1.6) for schedule assignment              │
   └── Required for days-remaining calculations                              │
                                                                             │
Story 1.10: Behavior Categories ───────────────────────────────────────────────┘
   └── No dependencies within epic
   └── Can run parallel with others

Recommended Order: 1.9 → (1.5 || 1.6 || 1.7) → 1.8 → 1.10
```

**UI Navigation Flow:**

```
DAEP Settings (/daep/settings)
    │
    ├── General Tab (default)
    │   └── District Settings Form
    │   └── Campus Settings Form
    │
    ├── Rooms Tab
    │   └── Room DataTable
    │   └── Add Room Dialog
    │   └── Edit Room Dialog
    │   └── Staff Assignment Sheet
    │
    ├── Schedules Tab
    │   └── Schedule DataTable
    │   └── Add Schedule Dialog (with period builder)
    │   └── Set Default Button
    │
    ├── Codes Tab
    │   └── Discipline Code DataTable
    │   └── Add Code Dialog
    │   └── Import PEIMS Codes Button (future)
    │
    ├── Calendar Tab
    │   └── Calendar Grid View (month)
    │   └── CSV Upload Dropzone
    │   └── Day Type Editor Dialog
    │   └── Mark Weather Day Button
    │
    └── Behaviors Tab
        └── Category List (drag-to-reorder)
        └── Add Category Dialog
        └── Edit Category Dialog
```

## Non-Functional Requirements

### Performance

| Requirement | Target | Source | Implementation |
|-------------|--------|--------|----------------|
| Settings page load | < 2 seconds | NFR1 | Server-side data fetching, no waterfall queries |
| DataTable rendering | < 500ms for 100 rows | NFR2 | Virtualized lists if >50 items |
| Calendar CSV import | < 10 seconds for 365 days | NFR3 | Batch upsert, progress indicator |
| Current period calculation | < 100ms | NFR1 | Single query with join, cache schedule |
| Form submission | < 1 second | NFR1 | Optimistic updates with toast feedback |

**Implementation Notes:**
- Settings data is small (<100 records per table) - no pagination needed initially
- Calendar queries filtered by school_year to limit result set
- Bell schedule periods stored as JSONB to avoid N+1 queries
- Use React Server Components for initial data load, Server Actions for mutations

### Security

| Requirement | Implementation | Source |
|-------------|----------------|--------|
| **Admin-only access** | Middleware checks `role IN ('district_admin', 'daep_admin_l1', 'master_admin')` | FR3, FR4 |
| **Tenant isolation** | RLS policies filter all queries by `tenant_id` | NFR12 |
| **Audit logging** | All CREATE/UPDATE/DELETE operations logged with actor, timestamp, before/after | FR105-FR107 |
| **Input validation** | Zod schemas validate all user input server-side | NFR11 |
| **CSRF protection** | Next.js Server Actions include CSRF tokens automatically | Best practice |
| **XSS prevention** | React escapes all rendered content by default | Best practice |

**Role-Based Access for Settings:**

```typescript
// middleware.ts (extend existing)
const SETTINGS_ALLOWED_ROLES = ['master_admin', 'district_admin', 'daep_admin_l1'];

if (pathname.startsWith('/daep/settings')) {
  const userRole = await getUserRole(userId);
  if (!SETTINGS_ALLOWED_ROLES.includes(userRole)) {
    return NextResponse.redirect(new URL('/daep/unauthorized', request.url));
  }
}
```

### Reliability/Availability

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| Form validation | Prevent invalid data entry | Client-side preview + server-side enforcement |
| Unique constraints | Prevent duplicate rooms, codes | Database constraints + friendly error messages |
| Soft deletes | Preserve historical data | `is_active` flag instead of DELETE for codes, categories |
| Calendar integrity | Prevent gaps | Validate full school year coverage on import |
| Schedule conflicts | Detect overlapping periods | Validation in PeriodDefinitionSchema |

**Error Recovery:**
- Invalid CSV rows: Skip and report errors, import valid rows
- Duplicate entries: Show existing record, offer to update
- Network failures: Retry with exponential backoff, preserve form state

### Observability

| Signal | Implementation | Purpose |
|--------|----------------|---------|
| Audit events | `admin_audit_log.module = 'daep_management'` | Compliance, troubleshooting |
| Console logs | `[DAEP Settings]` prefix | Development debugging |
| Error tracking | Structured error with context | Production monitoring |
| Settings changes | Detailed before/after in audit | Configuration troubleshooting |

**Audit Event Types for Epic 1b:**
- `room.created`, `room.updated`, `room.deleted`
- `room_staff.assigned`, `room_staff.removed`
- `bell_schedule.created`, `bell_schedule.updated`, `bell_schedule.deleted`, `bell_schedule.set_default`
- `discipline_code.created`, `discipline_code.updated`, `discipline_code.deactivated`
- `calendar.imported`, `calendar.entry_updated`, `calendar.weather_day_marked`
- `settings.district_updated`, `settings.campus_updated`
- `behavior_category.created`, `behavior_category.updated`, `behavior_category.reordered`

## Dependencies and Integrations

### Existing Infrastructure Dependencies

| Dependency | Version | Purpose | Required By |
|------------|---------|---------|-------------|
| **Next.js** | ^15.5.4 | App Router, Server Components, Server Actions | All stories |
| **Supabase** | ^2.58.0 | Database, RLS policies | All stories |
| **Clerk** | ^6.33.1 | Authentication, role checking | All stories |
| **shadcn/ui** | Latest | DataTable, Dialog, Form, Tabs, Toast | All stories |
| **React Hook Form** | ^7.53.0 | Form state management | All stories |
| **Zod** | ^3.25.76 | Schema validation | All stories |
| **date-fns** | ^3.6.0 | Date formatting, timezone handling | 1.6, 1.8 |
| **PapaParse** | ^5.5.3 | CSV parsing for calendar import | 1.8 |
| **Lucide React** | ^0.446.0 | Icons | All stories |

### New Dependencies Required

None - Epic 1b uses only existing infrastructure from package.json.

### Epic Dependencies

| Dependency | Type | Direction | Details |
|------------|------|-----------|---------|
| **Epic 1a** | Schema | Prerequisite | Tables `daep_rooms`, `daep_bell_schedules`, `daep_discipline_codes`, `daep_school_calendar`, `daep_behavior_categories`, `daep_room_staff`, `daep_point_bonus_rules` must exist |
| **Epic 1a** | RLS | Prerequisite | RLS policies must be enabled on all config tables |
| **Epic 1a** | Roles | Prerequisite | `daep_admin_l1`, `daep_admin_l2` roles must exist in `user_profiles.role` |
| **TrespassTracker** | Campuses | Runtime | `campuses` table provides campus dropdown options |
| **TrespassTracker** | Users | Runtime | `user_profiles` table provides staff dropdown options for room assignment |
| **Epic 2** | Consumer | Downstream | Placement creation requires configured rooms and discipline codes |
| **Epic 3** | Consumer | Downstream | Point entry requires bell schedules for current period |
| **Epic 3** | Consumer | Downstream | Attendance requires school calendar for day validation |

### Integration Points

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Epic 1b: Configuration UI                     │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Rooms     │  │  Schedules  │  │    Codes    │  │  Calendar   │ │
│  │   (1.5)     │  │   (1.6)     │  │   (1.7)     │  │   (1.8)     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
└─────────┼────────────────┼────────────────┼────────────────┼────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Shared Database (Supabase)                        │
│                                                                      │
│  daep_rooms ───────┐                                                │
│  daep_room_staff ──┼─► Placement creation (Epic 2)                  │
│                    │                                                │
│  daep_bell_schedules ─► Current period util (Epic 3)                │
│                                                                      │
│  daep_discipline_codes ─► Placement validation (Epic 2)             │
│                                                                      │
│  daep_school_calendar ──► Days-remaining calculation (Epic 2)       │
│                                                                      │
│  daep_behavior_categories ─► Point entry dropdown (Epic 3)          │
│                                                                      │
│  campuses (TT) ◄───── Room/Schedule campus selector                 │
│  user_profiles (TT) ◄─ Staff assignment dropdown                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Settings Storage Strategy

**District Settings:** Stored in `tenants` table (extend with DAEP columns) or dedicated `daep_district_settings` table with single row per tenant.

**Campus Settings:** Stored in `campuses` table (extend with DAEP columns) or dedicated `daep_campus_settings` table.

**Recommended:** Extend existing tables to avoid additional joins:

```sql
-- Add DAEP settings to existing tenants table
ALTER TABLE tenants
ADD COLUMN daep_settings JSONB DEFAULT '{
  "timezone": "America/Chicago",
  "default_points_per_period": 10,
  "attendance_threshold": 85,
  "point_threshold_warning": 7,
  "school_year": null
}'::jsonb;

-- Add DAEP settings to existing campuses table
ALTER TABLE campuses
ADD COLUMN daep_settings JSONB DEFAULT '{
  "daep_campus_name": null,
  "daep_campus_address": null,
  "daep_campus_phone": null,
  "max_room_capacity": 15
}'::jsonb;
```

## Acceptance Criteria (Authoritative)

### Story 1.5: Room Management

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 1.5.1 | Settings page has "Rooms" tab at `/daep/settings/rooms` | Tab visible and navigable for admin users |
| 1.5.2 | Room DataTable displays all rooms with columns: Room #, Name, Campus, Capacity, Staff, Status | All columns render with correct data |
| 1.5.3 | "Add Room" button opens dialog with form fields: room_number, room_name, campus (dropdown), capacity, building_section | Dialog opens, form validates |
| 1.5.4 | Room number is unique per campus | Duplicate room number in same campus shows error |
| 1.5.5 | Can assign staff to room (primary or rotational) via sheet panel | Staff assignment saved, displays in room row |
| 1.5.6 | Can edit existing room details | Edit dialog pre-fills, save updates record |
| 1.5.7 | Can deactivate room (soft delete) | Room marked inactive, hidden from placement dropdowns |
| 1.5.8 | Only users with admin roles can access | Non-admin redirected to /daep/unauthorized |
| 1.5.9 | All operations logged to audit trail | Audit log entries created for CRUD operations |

### Story 1.6: Bell Schedule Configuration

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 1.6.1 | Settings page has "Schedules" tab at `/daep/settings/schedules` | Tab visible and navigable |
| 1.6.2 | Schedule DataTable displays: Name, Type, Campus, Periods, Default flag | All columns render correctly |
| 1.6.3 | "Add Schedule" dialog has period builder to add/remove/reorder periods | Periods can be added, each has name, start, end time |
| 1.6.4 | Period times validated (start < end, no overlaps) | Invalid times show validation error |
| 1.6.5 | Can set one schedule as default per campus | Only one default per campus, others unset |
| 1.6.6 | Schedule types supported: regular, early_release, half_day, custom | Dropdown shows all types |
| 1.6.7 | getCurrentPeriod utility returns correct period based on time | Unit test passes for various times |
| 1.6.8 | Changes logged to audit trail | Audit entries for create/update/delete/set_default |

### Story 1.7: Discipline Code Management

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 1.7.1 | Settings page has "Codes" tab at `/daep/settings/codes` | Tab visible and navigable |
| 1.7.2 | Code DataTable displays: Code, Description, Category, Mandatory, Location, Status | All columns render |
| 1.7.3 | "Add Code" dialog has fields: code, description, category, is_mandatory, behavior_location, peims_code | Form validates required fields |
| 1.7.4 | Code is unique per tenant | Duplicate code shows error message |
| 1.7.5 | Can mark code as mandatory or discretionary | Toggle saves, displays correctly |
| 1.7.6 | Behavior location options: on_campus, off_campus, both | Dropdown shows all options |
| 1.7.7 | Codes soft-deleted (deactivated) to preserve history | Deactivate button, code hidden from dropdowns |
| 1.7.8 | Active codes appear in placement form dropdown | Only active codes shown in Epic 2 |
| 1.7.9 | Changes logged to audit trail | Audit entries for CRUD operations |

### Story 1.8: School Calendar Configuration

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 1.8.1 | Settings page has "Calendar" tab at `/daep/settings/calendar` | Tab visible and navigable |
| 1.8.2 | Calendar displays month grid with day types color-coded | Visual grid shows school days vs holidays |
| 1.8.3 | CSV upload supports columns: date, is_school_day, day_type, notes | Upload parses and imports |
| 1.8.4 | Import validates date format and shows errors for invalid rows | Error report for bad rows |
| 1.8.5 | Can click day to edit: day_type, schedule assignment, notes | Edit dialog saves changes |
| 1.8.6 | "Mark Weather Day" converts school day to non-school day with notes | Weather day button works |
| 1.8.7 | getSchoolDayCount utility returns correct count for date range | Unit test passes |
| 1.8.8 | Calendar filtered by school year | Year selector filters display |
| 1.8.9 | Changes logged to audit trail | Audit entries for import and edits |

### Story 1.9: District/Campus Settings

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 1.9.1 | Settings page has "General" tab as default at `/daep/settings` | Tab visible, loads by default |
| 1.9.2 | District settings form shows: timezone, default_points, attendance_threshold, point_threshold, school_year | Form displays with current values |
| 1.9.3 | Campus settings section shows DAEP campus details | Campus name, address, phone fields |
| 1.9.4 | Timezone dropdown shows US timezone options | Central, Eastern, Pacific, Mountain available |
| 1.9.5 | School year format validated (YYYY-YYYY) | Invalid format shows error |
| 1.9.6 | Settings save immediately with toast confirmation | Save button, toast "Settings saved" |
| 1.9.7 | Settings scoped to tenant | Different tenants have independent settings |
| 1.9.8 | Changes logged to audit trail | Audit entries for settings updates |

### Story 1.10: Behavior Categories Configuration

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 1.10.1 | Settings page has "Behaviors" tab at `/daep/settings/behaviors` | Tab visible and navigable |
| 1.10.2 | Category list shows: Name, Type (positive/negative/neutral), Order, Status | All columns render |
| 1.10.3 | "Add Category" dialog has: name, description, is_positive, display_order | Form validates name required |
| 1.10.4 | Categories can be reordered via drag-and-drop or arrows | Reorder persists after refresh |
| 1.10.5 | Category type options: positive, negative, neutral | Dropdown/radio shows all types |
| 1.10.6 | Can deactivate category (soft delete) | Category hidden from point entry |
| 1.10.7 | Active categories appear in point entry dropdown | Epic 3 shows only active categories |
| 1.10.8 | Changes logged to audit trail | Audit entries for CRUD and reorder

## Traceability Mapping

| AC | Spec Section | Component/API | Test Approach |
|----|--------------|---------------|---------------|
| **1.5.1-1.5.3** | APIs - Room Management | `getRooms()`, `createRoom()` | E2E: Navigate, create room |
| **1.5.4** | Data Models - RoomSchema | Database constraint | Integration: Insert duplicate |
| **1.5.5** | APIs - Room Management | `assignStaffToRoom()` | E2E: Assign staff, verify |
| **1.5.6-1.5.7** | APIs - Room Management | `updateRoom()`, `deleteRoom()` | E2E: Edit, deactivate |
| **1.5.8** | Security - Role Access | Middleware | Integration: Access as non-admin |
| **1.5.9** | Observability | `admin_audit_log` | Query audit after operations |
| **1.6.1-1.6.2** | Workflows - UI Flow | Settings page | E2E: Navigate, verify columns |
| **1.6.3-1.6.4** | Data Models - BellScheduleSchema | Form validation | Unit: Zod schema tests |
| **1.6.5** | APIs - Bell Schedules | `setDefaultSchedule()` | Integration: Set default, verify others unset |
| **1.6.6** | Data Models | ENUM values | Unit: Schema accepts all types |
| **1.6.7** | APIs - Current Period Utility | `getCurrentPeriod()` | Unit: Multiple time scenarios |
| **1.6.8** | Observability | `admin_audit_log` | Query audit after operations |
| **1.7.1-1.7.3** | APIs - Discipline Codes | `getDisciplineCodes()`, `createDisciplineCode()` | E2E: Navigate, create code |
| **1.7.4** | Data Models | Database constraint | Integration: Insert duplicate |
| **1.7.5-1.7.6** | Data Models - DisciplineCodeSchema | Form fields | E2E: Toggle mandatory, select location |
| **1.7.7-1.7.8** | APIs - Discipline Codes | `deactivateDisciplineCode()` | Integration: Deactivate, verify dropdown |
| **1.7.9** | Observability | `admin_audit_log` | Query audit after operations |
| **1.8.1-1.8.2** | Workflows - UI Flow | Calendar component | E2E: Navigate, verify grid |
| **1.8.3-1.8.4** | APIs - Calendar | `uploadSchoolCalendarCSV()` | Integration: Upload valid/invalid CSV |
| **1.8.5-1.8.6** | APIs - Calendar | `updateCalendarEntry()`, `markWeatherDay()` | E2E: Edit day, mark weather |
| **1.8.7** | APIs - Calendar | `getSchoolDayCount()` | Unit: Date range calculations |
| **1.8.8** | Workflows - UI Flow | Year selector | E2E: Change year, verify filter |
| **1.8.9** | Observability | `admin_audit_log` | Query audit after operations |
| **1.9.1-1.9.3** | Workflows - UI Flow | Settings forms | E2E: Navigate, verify fields |
| **1.9.4-1.9.5** | Data Models - SettingsSchema | Form validation | Unit: Zod schema tests |
| **1.9.6-1.9.7** | APIs - Settings | `updateDistrictSettings()` | E2E: Save, verify toast, check tenant isolation |
| **1.9.8** | Observability | `admin_audit_log` | Query audit after operations |
| **1.10.1-1.10.3** | APIs - Behavior Categories | `getBehaviorCategories()`, `createBehaviorCategory()` | E2E: Navigate, create category |
| **1.10.4** | APIs - Behavior Categories | `reorderBehaviorCategories()` | E2E: Reorder, verify persistence |
| **1.10.5-1.10.6** | Data Models | Form fields, soft delete | E2E: Toggle type, deactivate |
| **1.10.7** | Integration | Epic 3 point entry | Integration: Verify dropdown contents |
| **1.10.8** | Observability | `admin_audit_log` | Query audit after operations |

### FR Coverage Summary

| FR | Description | Covered By |
|----|-------------|------------|
| **FR47** | System supports predefined behavior categories | Story 1.10 |
| **FR63** | Administrators can create and configure DAEP rooms | Story 1.5 (AC 1.5.1-1.5.7) |
| **FR64** | Administrators can assign staff to rooms | Story 1.5 (AC 1.5.5) |
| **FR65** | Administrators can configure bell schedules per campus | Story 1.6 (AC 1.6.1-1.6.5) |
| **FR66** | System supports multiple bell schedule variations | Story 1.6 (AC 1.6.6) |
| **FR67** | Staff can view roster of students assigned to their room | Story 1.5 (room data enables) |
| **FR68** | System displays current period based on bell schedule | Story 1.6 (AC 1.6.7) |
| **FR69** | Administrators can configure discipline codes | Story 1.7 (AC 1.7.1-1.7.3) |
| **FR70** | System supports mandatory vs. discretionary placement flags | Story 1.7 (AC 1.7.5) |
| **FR71** | Discipline codes include behavior location classification | Story 1.7 (AC 1.7.6) |
| **FR72** | System validates placement entries against configured codes | Story 1.7 (enables Epic 2 validation) |
| **FR99** | Administrators can configure district-wide settings | Story 1.9 (AC 1.9.1-1.9.2) |
| **FR100** | Administrators can configure campus-specific settings | Story 1.9 (AC 1.9.3) |
| **FR101** | Administrators can configure point bonus rules | Story 1.10 (partial - categories) |
| **FR104** | System supports district calendar configuration | Story 1.8 (AC 1.8.1-1.8.8)

## Risks, Assumptions, Open Questions

### Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| **R1** | Bell schedule period overlap validation is complex | Medium | Low | Use time comparison in Zod refinement; write comprehensive unit tests |
| **R2** | Calendar CSV format varies between districts | Medium | Medium | Support multiple date formats; provide sample CSV template; show clear error messages |
| **R3** | Large calendar imports (365+ days) slow | Low | Low | Use batch upsert; show progress indicator; test with large datasets |
| **R4** | Admin forgets to upload calendar before placements | Medium | High | Show warning if no calendar entries for current year; validation in placement creation |
| **R5** | Timezone complexity causes period calculation errors | Medium | Medium | Hard-code to Central Time for MVP; add timezone setting in future |
| **R6** | Staff assignment complexity (primary vs rotational) | Low | Low | Keep initial UI simple; single primary per room, multiple rotational |

### Assumptions

| ID | Assumption | Validation Approach |
|----|------------|---------------------|
| **A1** | Epic 1a schema is complete and tested | Verify tables exist before starting UI work |
| **A2** | Existing TrespassTracker campuses table can be reused | Test campus dropdown population |
| **A3** | shadcn/ui DataTable handles 100 rows efficiently | Performance test with realistic data |
| **A4** | PapaParse handles various CSV encodings | Test with UTF-8 and Windows-1252 files |
| **A5** | JSONB columns (periods, settings) work well with TypeScript | Test serialization/deserialization |
| **A6** | One school year of calendar data is sufficient | Confirm with user; add year selector if needed |

### Open Questions (RESOLVED)

| ID | Question | Decision | Date |
|----|----------|----------|------|
| **Q1** | Should we support multiple DAEP campuses per district? | **Single DAEP campus for MVP** - Most districts have one DAEP. Multi-campus support in future. | 2025-11-24 |
| **Q2** | How to handle mid-year calendar changes (weather days)? | **Manual edit** - Admin clicks day, marks as weather day with notes. No bulk update needed. | 2025-11-24 |
| **Q3** | Should bell schedules be per-room or per-campus? | **Per-campus** - All rooms follow same bell schedule. Per-room override is over-engineering. | 2025-11-24 |
| **Q4** | Where to store district/campus settings? | **JSONB columns on existing tables** - Add `daep_settings` JSONB to `tenants` and `campuses`. | 2025-11-24 |

## Test Strategy Summary

### Test Levels

| Level | Scope | Tools | Coverage |
|-------|-------|-------|----------|
| **Unit Tests** | Zod schemas, utilities | Vitest | All validation schemas, `getCurrentPeriod()`, `getSchoolDayCount()` |
| **Integration Tests** | Server Actions, database | Vitest + Supabase test client | CRUD operations, RLS enforcement |
| **E2E Tests** | Full user flows | Playwright | Settings page navigation, form submission, tab switching |
| **Manual Tests** | Visual verification | Human review | Calendar grid display, form layouts |

### Test Scenarios by Story

**Story 1.5: Room Management**
- [ ] Create room with all fields
- [ ] Create room with minimum fields (room_number, campus)
- [ ] Duplicate room number in same campus fails
- [ ] Assign primary staff
- [ ] Assign multiple rotational staff
- [ ] Edit room capacity
- [ ] Deactivate room
- [ ] Non-admin cannot access

**Story 1.6: Bell Schedules**
- [ ] Create schedule with 8 periods
- [ ] Validate overlapping periods fail
- [ ] Set schedule as default
- [ ] Previous default unset
- [ ] getCurrentPeriod returns correct period at 9:00 AM
- [ ] getCurrentPeriod returns null on holiday
- [ ] getCurrentPeriod handles edge cases (between periods)

**Story 1.7: Discipline Codes**
- [ ] Create code with all fields
- [ ] Duplicate code fails
- [ ] Toggle mandatory flag
- [ ] Select each behavior location
- [ ] Deactivate code
- [ ] Deactivated code not in dropdowns

**Story 1.8: School Calendar**
- [ ] Upload valid CSV (365 days)
- [ ] Upload CSV with errors (partial import)
- [ ] Click day to edit
- [ ] Mark weather day
- [ ] getSchoolDayCount returns correct count
- [ ] Year selector filters calendar

**Story 1.9: District/Campus Settings**
- [ ] Load existing settings
- [ ] Update timezone
- [ ] Update default points
- [ ] Invalid school year format fails
- [ ] Settings isolated per tenant

**Story 1.10: Behavior Categories**
- [ ] Create positive category
- [ ] Create negative category
- [ ] Reorder categories
- [ ] Deactivate category
- [ ] Deactivated category not in dropdowns

### Critical Path Tests

These tests MUST pass before Epic 1b is considered complete:

1. **Admin access control:** Non-admin users cannot access `/daep/settings/*`
2. **Tenant isolation:** Settings data isolated between tenants
3. **Bell schedule utility:** `getCurrentPeriod()` returns correct period during school hours
4. **Calendar utility:** `getSchoolDayCount()` calculates correctly
5. **Soft delete:** Deactivated codes/categories hidden from downstream dropdowns
6. **Audit logging:** All mutations create audit log entries

### Edge Cases

- Calendar with no school days in current month
- Bell schedule with lunch period (non-instructional)
- Room with 0 staff assigned
- Discipline code with special characters
- CSV with empty rows or extra columns
- Settings form submitted with no changes
- Concurrent edits to same record

---

*Tech Spec generated by Epic Tech Context workflow*
*Last updated: 2025-11-24*

