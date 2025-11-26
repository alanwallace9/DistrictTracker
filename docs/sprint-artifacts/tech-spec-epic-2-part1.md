# Tech Spec - Epic 2: Placement Management (Part 1)

**Epic:** 2 - Placement Management
**Stories:** 13 (2.1-2.13)
**Points:** 34
**FRs:** FR9-FR26, FR73-FR77
**Date:** 2025-11-26

> **Document Split:** This is Part 1 covering Overview, Data Models, and Stories 2.1-2.6.
> See [tech-spec-epic-2-part2.md](./tech-spec-epic-2-part2.md) for Stories 2.7-2.13, Integration Patterns, and Testing.

---

## Executive Summary

Epic 2 implements the core placement management functionality for the DAEP module. This includes student profiles, placement creation with intake workflow, room assignment with separation logic, and the placement state machine (Pending → Active → Transition → Complete).

**Key Dependencies:**
- Epic 1a: Core schema (✅ complete)
- Epic 1b: Configuration UI (✅ complete - rooms, schedules, discipline codes, calendar)

**Story Status:**
- **Story 2.1:** DONE (Student search/list view implemented)
- **Stories 2.2-2.13:** Ready for implementation

---

## Dependencies on Epic 1b

| Configuration | Table | Used By Stories |
|--------------|-------|-----------------|
| DAEP Rooms | `daep_rooms` | 2.4, 2.6 |
| Bell Schedules | `daep_bell_schedules` | 2.7 |
| School Calendar | `daep_school_calendar` | 2.7 |
| Discipline Codes | `daep_discipline_codes` | 2.4, 2.5 |
| Behavior Categories | `daep_behavior_categories` | Future (Epic 3) |
| District Settings | `tenant.daep_settings` | 2.7, 2.9 |
| Campus Settings | `campuses.daep_settings` | 2.6 |

---

## Data Models

### Existing Tables (from Epic 1a/1b)

```sql
-- Already exists: daep_placements (core placement record)
-- Already exists: daep_rooms (room configuration)
-- Already exists: daep_school_calendar (school days)
-- Already exists: daep_discipline_codes (offense codes)
-- Already exists: campuses (with composite PK: tenant_id, id)
-- Already exists: trespass_records (student demographics)
```

### New Tables for Epic 2

```sql
-- Student separation constraints (for room assignment logic)
CREATE TABLE daep_student_separations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  student_a_school_id TEXT NOT NULL,
  student_b_school_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  separation_type TEXT DEFAULT 'building_half', -- 'building_half' | 'different_room'
  active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(tenant_id, student_a_school_id, student_b_school_id),
  CHECK (student_a_school_id < student_b_school_id) -- Prevent duplicate pairs
);

CREATE INDEX idx_daep_separations_tenant ON daep_student_separations(tenant_id);
CREATE INDEX idx_daep_separations_students ON daep_student_separations(student_a_school_id, student_b_school_id);

-- Placement history/transitions log
CREATE TABLE daep_placement_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  transition_reason TEXT,
  transitioned_by TEXT NOT NULL,
  transitioned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_daep_transitions_placement ON daep_placement_transitions(placement_id);
```

### Placement Status State Machine

```
┌─────────────┐    intake     ┌─────────────┐    requirements    ┌─────────────┐    meeting +    ┌─────────────┐
│   PENDING   │───────────────│   ACTIVE    │────────────────────│ TRANSITION  │────first day────│  COMPLETE   │
│ (approved)  │               │ (at DAEP)   │       met          │ (returning) │     back        │  (closed)   │
└─────────────┘               └─────────────┘                    └─────────────┘                 └─────────────┘
       │                                                                                                │
       │                        ┌─────────────┐                                                         │
       └────────────────────────│   APPEAL    │─────────────────────────────────────────────────────────┘
           appeal granted       │ (overturned)│   skip to complete (never attended)
                                └─────────────┘
```

**Valid Transitions:**
- `pending` → `active` (intake day)
- `active` → `transition` (days complete OR manual trigger)
- `transition` → `complete` (campus confirms meeting + first day back)
- `pending` → `complete` (appeal overturned before intake)
- Any → `cancelled` (administrative cancellation)

---

## Zod Validation Schemas

```typescript
// lib/validation/schemas.ts - Add these schemas

import { z } from 'zod';

// Placement status enum
export const PlacementStatusSchema = z.enum([
  'pending',
  'active',
  'transition',
  'complete',
  'cancelled'
]);
export type PlacementStatus = z.infer<typeof PlacementStatusSchema>;

// Student search (already exists - for reference)
export const StudentSearchSchema = z.object({
  query: z.string().optional(),
  status: PlacementStatusSchema.optional(),
  room_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25),
});
export type StudentSearchInput = z.infer<typeof StudentSearchSchema>;

// Create placement form
export const CreatePlacementSchema = z.object({
  school_id: z.string().min(1, 'Student ID is required'),
  incident_number: z.string().min(1, 'Incident number is required'),
  placement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  days_assigned: z.number().int().min(1, 'Must assign at least 1 day').max(365, 'Cannot exceed 365 days'),
  offense_code: z.string().min(1, 'Offense code is required'),
  placement_reason: z.string().min(10, 'Reason must be at least 10 characters'),
  mandatory_placement: z.boolean().default(false),
  home_campus_id: z.string().min(1, 'Home campus is required'),
  assigning_campus_id: z.string().optional(),
  intake_notes: z.string().optional(),
});
export type CreatePlacementInput = z.infer<typeof CreatePlacementSchema>;

// Update placement
export const UpdatePlacementSchema = z.object({
  id: z.string().uuid(),
  days_assigned: z.number().int().min(1).max(365).optional(),
  assigned_room_id: z.string().uuid().optional().nullable(),
  status: PlacementStatusSchema.optional(),
  expected_end_date: z.string().optional(),
  intake_notes: z.string().optional(),
  completion_notes: z.string().optional(),
  rollover_decision: z.enum(['continue', 'reset']).optional(),
});
export type UpdatePlacementInput = z.infer<typeof UpdatePlacementSchema>;

// Room assignment
export const RoomAssignmentSchema = z.object({
  placement_id: z.string().uuid(),
  room_id: z.string().uuid(),
});
export type RoomAssignmentInput = z.infer<typeof RoomAssignmentSchema>;

// Student separation
export const StudentSeparationSchema = z.object({
  student_a_school_id: z.string().min(1),
  student_b_school_id: z.string().min(1),
  reason: z.string().min(5, 'Reason is required'),
  separation_type: z.enum(['building_half', 'different_room']).default('building_half'),
  expires_at: z.string().optional(),
});
export type StudentSeparationInput = z.infer<typeof StudentSeparationSchema>;

// Placement transition
export const PlacementTransitionSchema = z.object({
  placement_id: z.string().uuid(),
  to_status: PlacementStatusSchema,
  transition_reason: z.string().optional(),
  notes: z.string().optional(),
  // Transition-specific fields
  transition_meeting_date: z.string().optional(),
  first_day_back_date: z.string().optional(),
});
export type PlacementTransitionInput = z.infer<typeof PlacementTransitionSchema>;

// Student profile request
export const StudentProfileSchema = z.object({
  school_id: z.string().min(1),
  include_placements: z.boolean().default(true),
  include_trespass_history: z.boolean().default(true),
});
export type StudentProfileInput = z.infer<typeof StudentProfileSchema>;
```

---

## Story 2.1: Student Search & List View

**Status:** ✅ DONE

**Already Implemented:**
- `/app/daep/students/page.tsx` - Student list page
- `/app/actions/daep/students.ts` - Server actions
  - `getDAEPStudents()` - Paginated list with filters
  - `searchStudents()` - Quick search
  - `getDAEPRoomsForFilter()` - Room dropdown options
- `/components/daep/StudentFilters.tsx` - Filter controls
- `/components/daep/StudentListTable.tsx` - Data table

**UI Fixes Needed (per retrospective):**
- [ ] Match admin panel left sidebar pattern
- [ ] Add tenant switcher (super_admin only)
- [ ] Add campus switcher (if multi-DAEP campus)

---

## Story 2.2: Student Profile Page (3 pts)

**FR References:** FR9, FR12-FR14
**Route:** `/daep/students/[school_id]`

### Acceptance Criteria

- [ ] **2.2.1:** Profile page shows student demographics (name, ID, grade, home campus)
- [ ] **2.2.2:** Photo display from `trespass_records.photo`
- [ ] **2.2.3:** Current placement card with status badge, days remaining
- [ ] **2.2.4:** Placement history list (all placements for this student)
- [ ] **2.2.5:** Quick actions: Edit placement, Transition, View Trespass Record
- [ ] **2.2.6:** Contact info section (guardian, emergency contacts)
- [ ] **2.2.7:** Special flags visible (Special Ed, 504, ELL)
- [ ] **2.2.8:** Audit log entry when viewing profile

### Server Action: `getStudentProfile`

```typescript
// app/actions/daep/students.ts

export interface StudentProfile {
  // Demographics (from trespass_records)
  school_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  grade_level: number | null;
  photo: string | null;
  current_school: string | null;

  // Guardian info
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  parent_email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;

  // Special flags
  special_education: boolean;
  plan_504: boolean;
  ell_status: boolean;

  // DAEP status
  is_daep: boolean;
  daep_expiration_date: string | null;

  // Placements
  current_placement: DAEPPlacementDetail | null;
  placement_history: DAEPPlacementDetail[];

  // Stats
  total_placements: number;
  is_recidivist: boolean;
}

export interface DAEPPlacementDetail {
  id: string;
  incident_number: string;
  status: PlacementStatus;
  placement_date: string;
  start_date: string;
  expected_end_date: string | null;
  actual_end_date: string | null;
  days_assigned: number;
  days_served: number;
  days_remaining: number | null;
  offense_code: string;
  offense_label: string;
  placement_reason: string;
  mandatory_placement: boolean;
  home_campus: { id: string; name: string } | null;
  assigned_room: { id: string; room_number: string; room_name: string | null } | null;
  intake_notes: string | null;
  completion_notes: string | null;
  rollover_student: boolean;
  no_show: boolean;
}

export async function getStudentProfile(school_id: string): Promise<StudentProfile> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();
  const user = await currentUser();

  // 1. Get student demographics from trespass_records
  const { data: student, error: studentError } = await supabase
    .from('trespass_records')
    .select(`
      school_id,
      first_name,
      last_name,
      date_of_birth,
      grade_level,
      photo,
      current_school,
      guardian_first_name,
      guardian_last_name,
      guardian_phone,
      parent_email,
      emergency_contact_name,
      emergency_contact_phone,
      special_education,
      plan_504,
      ell_status,
      is_daep,
      daep_expiration_date
    `)
    .eq('tenant_id', tenantId)
    .eq('school_id', school_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (studentError || !student) {
    throw new Error('Student not found');
  }

  // 2. Get all placements for this student
  const { data: placements, error: placementsError } = await supabase
    .from('daep_placements')
    .select(`
      id,
      incident_number,
      status,
      placement_date,
      start_date,
      expected_end_date,
      actual_end_date,
      days_assigned,
      days_served,
      days_remaining,
      offense_code,
      placement_reason,
      mandatory_placement,
      home_campus_id,
      assigned_room_id,
      intake_notes,
      completion_notes,
      rollover_student,
      no_show,
      discipline_code:daep_discipline_codes!fk_placement_offense(code, label),
      home_campus:campuses!fk_daep_placements_home_campus(id, name),
      room:daep_rooms(id, room_number, room_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('school_id', school_id)
    .order('start_date', { ascending: false });

  if (placementsError) {
    throw new Error('Failed to fetch placements');
  }

  // 3. Format placements
  const formattedPlacements: DAEPPlacementDetail[] = (placements || []).map(p => ({
    id: p.id,
    incident_number: p.incident_number,
    status: p.status as PlacementStatus,
    placement_date: p.placement_date,
    start_date: p.start_date,
    expected_end_date: p.expected_end_date,
    actual_end_date: p.actual_end_date,
    days_assigned: p.days_assigned,
    days_served: p.days_served,
    days_remaining: p.days_remaining,
    offense_code: p.offense_code,
    offense_label: (p.discipline_code as any)?.label || p.offense_code,
    placement_reason: p.placement_reason,
    mandatory_placement: p.mandatory_placement,
    home_campus: Array.isArray(p.home_campus) ? p.home_campus[0] : p.home_campus,
    assigned_room: Array.isArray(p.room) ? p.room[0] : p.room,
    intake_notes: p.intake_notes,
    completion_notes: p.completion_notes,
    rollover_student: p.rollover_student,
    no_show: p.no_show,
  }));

  // 4. Determine current placement (active or pending, most recent)
  const currentPlacement = formattedPlacements.find(
    p => p.status === 'active' || p.status === 'pending' || p.status === 'transition'
  ) || null;

  // 5. Log audit event
  await logAuditEvent({
    eventType: 'student.profile_viewed',
    module: 'daep_management',
    actorId: user?.id || 'unknown',
    targetId: school_id,
    action: `Viewed student profile for ${student.first_name} ${student.last_name}`,
    recordSubjectName: `${student.first_name} ${student.last_name}`,
    recordSchoolId: school_id,
    tenantId,
  });

  return {
    ...student,
    current_placement: currentPlacement,
    placement_history: formattedPlacements,
    total_placements: formattedPlacements.length,
    is_recidivist: formattedPlacements.length >= 2,
  };
}
```

### UI Components

```
/app/daep/students/[school_id]/
├── page.tsx              # Server component - fetches data
└── components/
    ├── profile-header.tsx       # Photo, name, ID, status badge
    ├── demographics-card.tsx    # Grade, campus, DOB
    ├── contact-info-card.tsx    # Guardian, emergency contacts
    ├── special-flags-card.tsx   # SpEd, 504, ELL badges
    ├── current-placement-card.tsx  # Days remaining, room, etc.
    ├── placement-history.tsx    # Timeline of all placements
    └── quick-actions.tsx        # Edit, transition, view trespass
```

---

## Story 2.3: Trespass Records Integration (2 pts)

**FR References:** FR73-FR76
**Route:** Component within student profile page

### Acceptance Criteria

- [ ] **2.3.1:** View linked trespass records for student (from TrespassTracker)
- [ ] **2.3.2:** Display incident date, expiration date, campus of origin
- [ ] **2.3.3:** Link to full trespass record in TrespassTracker module
- [ ] **2.3.4:** Show recidivism indicator if 2+ trespass incidents
- [ ] **2.3.5:** DAEP placements linked by `school_id` + `incident_number`

### Server Action: `getStudentTrespassHistory`

```typescript
// app/actions/daep/students.ts

export interface TrespassRecord {
  id: string;
  incident_number: string | null;
  incident_date: string | null;
  trespassed_from: string;
  expiration_date: string;
  status: 'active' | 'inactive';
  campus: { id: string; name: string } | null;
  notes: string | null;
  created_at: string;
}

export async function getStudentTrespassHistory(school_id: string): Promise<TrespassRecord[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data: records, error } = await supabase
    .from('trespass_records')
    .select(`
      id,
      incident_number,
      incident_date,
      trespassed_from,
      expiration_date,
      status,
      notes,
      created_at,
      campus:campuses!fk_trespass_campus(id, name)
    `)
    .eq('tenant_id', tenantId)
    .eq('school_id', school_id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch trespass history');
  }

  return (records || []).map(r => ({
    id: r.id,
    incident_number: r.incident_number,
    incident_date: r.incident_date,
    trespassed_from: r.trespassed_from,
    expiration_date: r.expiration_date,
    status: r.status as 'active' | 'inactive',
    campus: Array.isArray(r.campus) ? r.campus[0] : r.campus,
    notes: r.notes,
    created_at: r.created_at,
  }));
}
```

### UI Component: `TrespassHistoryCard`

```typescript
// components/daep/students/trespass-history-card.tsx

interface TrespassHistoryCardProps {
  records: TrespassRecord[];
  school_id: string;
}

export function TrespassHistoryCard({ records, school_id }: TrespassHistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Trespass History
          {records.length >= 2 && (
            <Badge variant="destructive">Repeat Offender</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-muted-foreground">No trespass records found</p>
        ) : (
          <div className="space-y-4">
            {records.map((record, index) => (
              <div key={record.id} className="border-l-2 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Incident #{index + 1}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.trespassed_from}
                    </p>
                    <p className="text-sm">
                      Expires: {format(new Date(record.expiration_date), 'MM/dd/yyyy')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={record.status === 'active' ? 'destructive' : 'secondary'}>
                      {record.status}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/records?id=${record.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Story 2.4: Placement Creation Form (5 pts)

**FR References:** FR9, FR15-FR17
**Route:** Modal or `/daep/placements/new`

### Acceptance Criteria

- [ ] **2.4.1:** Form to create new placement with required fields
- [ ] **2.4.2:** Student search/select (by name or school ID)
- [ ] **2.4.3:** Offense code dropdown (from `daep_discipline_codes`)
- [ ] **2.4.4:** Home campus dropdown (from `campuses` where tenant matches)
- [ ] **2.4.5:** Days assigned input with validation (1-365)
- [ ] **2.4.6:** Auto-calculate expected_end_date from school calendar
- [ ] **2.4.7:** Mandatory placement flag (auto-set based on offense code)
- [ ] **2.4.8:** Incident number input (links to trespass record)
- [ ] **2.4.9:** Prevent duplicate placements (same student + incident_number)
- [ ] **2.4.10:** Create trespass_record if student not in system
- [ ] **2.4.11:** Audit log entry on placement creation

### Server Action: `createPlacement`

```typescript
// app/actions/daep/placements.ts

'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { logAuditEvent } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { CreatePlacementSchema, type CreatePlacementInput } from '@/lib/validation/schemas';
import { calculateExpectedEndDate } from '@/lib/utils/daep/days-remaining';

export async function createPlacement(input: CreatePlacementInput): Promise<{ id: string }> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  // 1. Validate input
  const validation = CreatePlacementSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.errors[0].message}`);
  }

  const data = validation.data;
  const tenantId = await getTenantId();

  // 2. Check for duplicate placement (same student + incident_number)
  const { data: existing } = await supabase
    .from('daep_placements')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('school_id', data.school_id)
    .eq('incident_number', data.incident_number)
    .single();

  if (existing) {
    throw new Error(`A placement already exists for this student with incident number ${data.incident_number}`);
  }

  // 3. Check if offense code requires mandatory placement
  const { data: offenseCode } = await supabase
    .from('daep_discipline_codes')
    .select('mandatory_placement')
    .eq('tenant_id', tenantId)
    .eq('code', data.offense_code)
    .single();

  const isMandatory = offenseCode?.mandatory_placement || data.mandatory_placement;

  // 4. Calculate expected end date based on school calendar
  const expectedEndDate = await calculateExpectedEndDate(
    tenantId,
    data.start_date,
    data.days_assigned
  );

  // 5. Get student name for audit log
  const { data: student } = await supabase
    .from('trespass_records')
    .select('first_name, last_name')
    .eq('tenant_id', tenantId)
    .eq('school_id', data.school_id)
    .limit(1)
    .single();

  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : `Student ${data.school_id}`;

  // 6. Create placement
  const { data: placement, error } = await supabase
    .from('daep_placements')
    .insert({
      tenant_id: tenantId,
      school_id: data.school_id,
      incident_number: data.incident_number,
      placement_date: data.placement_date,
      start_date: data.start_date,
      days_assigned: data.days_assigned,
      days_served: 0,
      days_remaining: data.days_assigned,
      expected_end_date: expectedEndDate,
      offense_code: data.offense_code,
      placement_reason: data.placement_reason,
      mandatory_placement: isMandatory,
      home_campus_id: data.home_campus_id,
      assigning_campus_id: data.assigning_campus_id || data.home_campus_id,
      intake_notes: data.intake_notes,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating placement:', error);
    throw new Error('Failed to create placement');
  }

  // 7. Update trespass_record is_daep flag
  await supabase
    .from('trespass_records')
    .update({
      is_daep: true,
      daep_expiration_date: expectedEndDate,
    })
    .eq('tenant_id', tenantId)
    .eq('school_id', data.school_id);

  // 8. Log audit event
  await logAuditEvent({
    eventType: 'placement.created',
    module: 'daep_management',
    actorId: user.id,
    targetId: placement.id,
    action: `Created DAEP placement for ${studentName}`,
    recordSubjectName: studentName,
    recordSchoolId: data.school_id,
    tenantId,
    details: {
      days_assigned: data.days_assigned,
      offense_code: data.offense_code,
      mandatory_placement: isMandatory,
      start_date: data.start_date,
      expected_end_date: expectedEndDate,
    },
  });

  // 9. Revalidate paths
  revalidatePath('/daep/students');
  revalidatePath('/daep/placements');
  revalidatePath(`/daep/students/${data.school_id}`);

  return { id: placement.id };
}
```

### Server Action: `getDisciplineCodesForForm`

```typescript
// app/actions/daep/placements.ts

export interface DisciplineCodeOption {
  code: string;
  label: string;
  mandatory_placement: boolean;
}

export async function getDisciplineCodesForForm(): Promise<DisciplineCodeOption[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_discipline_codes')
    .select('code, label, mandatory_placement')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('code');

  if (error) {
    throw new Error('Failed to fetch discipline codes');
  }

  return data || [];
}
```

### Server Action: `getCampusesForForm`

```typescript
// app/actions/daep/placements.ts

export interface CampusOption {
  id: string;
  name: string;
  is_daep: boolean;
}

export async function getCampusesForForm(): Promise<CampusOption[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('campuses')
    .select('id, name, is_daep')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('name');

  if (error) {
    throw new Error('Failed to fetch campuses');
  }

  return data || [];
}
```

### UI Component Structure

```
/app/daep/placements/new/
├── page.tsx                    # Server component
└── components/
    ├── placement-form.tsx      # Main form (client component)
    ├── student-search.tsx      # Typeahead student search
    ├── offense-select.tsx      # Discipline code dropdown
    ├── campus-select.tsx       # Home campus dropdown
    └── days-calculator.tsx     # Shows expected end date preview
```

---

## Story 2.5: Placement Intake Process (3 pts)

**FR References:** FR19, FR21
**Route:** Component in student profile / placement detail

### Acceptance Criteria

- [ ] **2.5.1:** Intake form captures intake date confirmation
- [ ] **2.5.2:** Transitions placement from `pending` → `active`
- [ ] **2.5.3:** Captures intake notes (optional)
- [ ] **2.5.4:** Assigns student to a room (via Story 2.6)
- [ ] **2.5.5:** Validates student is not already active in another placement
- [ ] **2.5.6:** Creates transition log entry
- [ ] **2.5.7:** Updates `trespass_records.is_daep = true`

### Server Action: `processIntake`

```typescript
// app/actions/daep/placements.ts

export interface IntakeInput {
  placement_id: string;
  intake_notes?: string;
  room_id?: string;
}

export async function processIntake(input: IntakeInput): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // 1. Get placement details
  const { data: placement, error: fetchError } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      status,
      student:trespass_records!inner(first_name, last_name)
    `)
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !placement) {
    throw new Error('Placement not found');
  }

  if (placement.status !== 'pending') {
    throw new Error(`Cannot process intake for placement with status: ${placement.status}`);
  }

  const studentName = `${(placement.student as any).first_name} ${(placement.student as any).last_name}`;

  // 2. Check for existing active placements
  const { data: activeCheck } = await supabase
    .from('daep_placements')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('school_id', placement.school_id)
    .eq('status', 'active')
    .neq('id', input.placement_id)
    .limit(1);

  if (activeCheck && activeCheck.length > 0) {
    throw new Error('Student already has an active placement');
  }

  // 3. Update placement status and room
  const { error: updateError } = await supabase
    .from('daep_placements')
    .update({
      status: 'active',
      assigned_room_id: input.room_id || null,
      intake_notes: input.intake_notes,
    })
    .eq('id', input.placement_id);

  if (updateError) {
    throw new Error('Failed to process intake');
  }

  // 4. Create transition log entry
  await supabase
    .from('daep_placement_transitions')
    .insert({
      tenant_id: tenantId,
      placement_id: input.placement_id,
      from_status: 'pending',
      to_status: 'active',
      transition_reason: 'Intake processed',
      transitioned_by: user.id,
      notes: input.intake_notes,
    });

  // 5. Update trespass_record
  await supabase
    .from('trespass_records')
    .update({ is_daep: true })
    .eq('tenant_id', tenantId)
    .eq('school_id', placement.school_id);

  // 6. Audit log
  await logAuditEvent({
    eventType: 'placement.intake_processed',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: `Processed intake for ${studentName}`,
    recordSubjectName: studentName,
    recordSchoolId: placement.school_id,
    tenantId,
  });

  revalidatePath('/daep/students');
  revalidatePath('/daep/placements');
  revalidatePath(`/daep/students/${placement.school_id}`);
}
```

---

## Story 2.6: Room Assignment with Separation Logic (5 pts)

**FR References:** FR18, FR67
**Route:** Modal or inline component

### Acceptance Criteria

- [ ] **2.6.1:** Room selection dropdown filtered by capacity
- [ ] **2.6.2:** Shows current room occupancy (`X/15 students`)
- [ ] **2.6.3:** Student separation enforcement:
  - If Student A is in rooms 501-505, Student B can only be assigned to 506-509
  - Warning displayed when separation conflict exists
- [ ] **2.6.4:** Separation reason displayed to user
- [ ] **2.6.5:** Can create new separation flags between students
- [ ] **2.6.6:** Separation flags have expiration dates
- [ ] **2.6.7:** Audit log for room assignments and separation flag changes

### Server Action: `getAvailableRoomsForStudent`

```typescript
// app/actions/daep/rooms.ts

export interface RoomAvailability {
  id: string;
  room_number: string;
  room_name: string | null;
  building_section: string | null;
  capacity: number;
  current_count: number;
  available_spots: number;
  is_available: boolean;
  blocked_reason?: string;
}

export async function getAvailableRoomsForStudent(
  school_id: string,
  placement_id?: string
): Promise<RoomAvailability[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // 1. Get all active rooms
  const { data: rooms } = await supabase
    .from('daep_rooms')
    .select('id, room_number, room_name, building_section, capacity')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('room_number');

  if (!rooms) return [];

  // 2. Get current room occupancy
  const { data: occupancy } = await supabase
    .from('daep_placements')
    .select('assigned_room_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .not('assigned_room_id', 'is', null);

  const roomCounts = new Map<string, number>();
  (occupancy || []).forEach(p => {
    const count = roomCounts.get(p.assigned_room_id) || 0;
    roomCounts.set(p.assigned_room_id, count + 1);
  });

  // 3. Check separation constraints for this student
  const { data: separations } = await supabase
    .from('daep_student_separations')
    .select('student_a_school_id, student_b_school_id, reason, separation_type')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .or(`student_a_school_id.eq.${school_id},student_b_school_id.eq.${school_id}`);

  // Get building sections of separated students
  const blockedSections = new Set<string>();
  if (separations && separations.length > 0) {
    const separatedStudentIds = separations.map(s =>
      s.student_a_school_id === school_id ? s.student_b_school_id : s.student_a_school_id
    );

    // Get current placements of separated students
    const { data: separatedPlacements } = await supabase
      .from('daep_placements')
      .select('school_id, room:daep_rooms(building_section)')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .in('school_id', separatedStudentIds);

    (separatedPlacements || []).forEach(p => {
      const section = (p.room as any)?.building_section;
      if (section) blockedSections.add(section);
    });
  }

  // 4. Build availability list
  return rooms.map(room => {
    const currentCount = roomCounts.get(room.id) || 0;
    const availableSpots = room.capacity - currentCount;

    let isAvailable = availableSpots > 0;
    let blockedReason: string | undefined;

    // Check separation constraints
    if (room.building_section && blockedSections.has(room.building_section)) {
      isAvailable = false;
      blockedReason = 'Student separation conflict';
    }

    return {
      id: room.id,
      room_number: room.room_number,
      room_name: room.room_name,
      building_section: room.building_section,
      capacity: room.capacity,
      current_count: currentCount,
      available_spots: availableSpots,
      is_available: isAvailable,
      blocked_reason: blockedReason,
    };
  });
}
```

### Server Action: `assignRoom`

```typescript
// app/actions/daep/rooms.ts

export async function assignRoom(input: RoomAssignmentInput): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // 1. Get placement and room details
  const { data: placement } = await supabase
    .from('daep_placements')
    .select('id, school_id, assigned_room_id')
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!placement) throw new Error('Placement not found');

  // 2. Validate room is available for this student
  const availableRooms = await getAvailableRoomsForStudent(
    placement.school_id,
    placement.id
  );

  const selectedRoom = availableRooms.find(r => r.id === input.room_id);
  if (!selectedRoom) {
    throw new Error('Room not found');
  }

  if (!selectedRoom.is_available) {
    throw new Error(selectedRoom.blocked_reason || 'Room is not available');
  }

  // 3. Update placement
  const { error } = await supabase
    .from('daep_placements')
    .update({ assigned_room_id: input.room_id })
    .eq('id', input.placement_id);

  if (error) throw new Error('Failed to assign room');

  // 4. Audit log
  await logAuditEvent({
    eventType: 'room.assignment_changed',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: `Assigned student to room ${selectedRoom.room_number}`,
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      previous_room_id: placement.assigned_room_id,
      new_room_id: input.room_id,
      room_number: selectedRoom.room_number,
    },
  });

  revalidatePath('/daep/students');
  revalidatePath(`/daep/students/${placement.school_id}`);
}
```

### Server Action: `createStudentSeparation`

```typescript
// app/actions/daep/separations.ts

export async function createStudentSeparation(input: StudentSeparationInput): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Ensure consistent ordering (student_a < student_b)
  const [studentA, studentB] = [input.student_a_school_id, input.student_b_school_id].sort();

  // Check for existing separation
  const { data: existing } = await supabase
    .from('daep_student_separations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('student_a_school_id', studentA)
    .eq('student_b_school_id', studentB)
    .eq('active', true)
    .single();

  if (existing) {
    throw new Error('Separation already exists between these students');
  }

  // Create separation
  const { error } = await supabase
    .from('daep_student_separations')
    .insert({
      tenant_id: tenantId,
      student_a_school_id: studentA,
      student_b_school_id: studentB,
      reason: input.reason,
      separation_type: input.separation_type,
      created_by: user.id,
      expires_at: input.expires_at || null,
    });

  if (error) throw new Error('Failed to create separation');

  // Audit log
  await logAuditEvent({
    eventType: 'student.separation_added',
    module: 'daep_management',
    actorId: user.id,
    action: `Created separation between students ${studentA} and ${studentB}`,
    tenantId,
    details: {
      student_a: studentA,
      student_b: studentB,
      reason: input.reason,
      separation_type: input.separation_type,
    },
  });

  revalidatePath('/daep/students');
}
```

---

## File Structure for Part 1

```
app/
├── daep/
│   ├── students/
│   │   ├── page.tsx                    # Story 2.1 ✅
│   │   └── [school_id]/
│   │       ├── page.tsx                # Story 2.2
│   │       └── components/
│   │           ├── profile-header.tsx
│   │           ├── demographics-card.tsx
│   │           ├── contact-info-card.tsx
│   │           ├── special-flags-card.tsx
│   │           ├── current-placement-card.tsx
│   │           ├── placement-history.tsx
│   │           ├── trespass-history-card.tsx  # Story 2.3
│   │           └── quick-actions.tsx
│   │
│   └── placements/
│       └── new/
│           ├── page.tsx                # Story 2.4
│           └── components/
│               ├── placement-form.tsx
│               ├── student-search.tsx
│               ├── offense-select.tsx
│               ├── campus-select.tsx
│               └── days-calculator.tsx
│
├── actions/
│   └── daep/
│       ├── students.ts                 # Stories 2.1-2.3
│       ├── placements.ts               # Stories 2.4-2.5
│       ├── rooms.ts                    # Story 2.6 (extended)
│       └── separations.ts              # Story 2.6
│
└── components/
    └── daep/
        ├── students/                   # Story 2.2-2.3 components
        ├── placements/                 # Story 2.4-2.5 components
        └── rooms/
            ├── room-assignment-modal.tsx  # Story 2.6
            ├── room-availability-list.tsx
            └── separation-warning.tsx
```

---

## Migration: Student Separations

```sql
-- File: supabase/migrations/20251126000001_create_daep_student_separations.sql

-- Student separation constraints
CREATE TABLE IF NOT EXISTS daep_student_separations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  student_a_school_id TEXT NOT NULL,
  student_b_school_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  separation_type TEXT DEFAULT 'building_half',
  active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(tenant_id, student_a_school_id, student_b_school_id),
  CHECK (student_a_school_id < student_b_school_id)
);

CREATE INDEX idx_daep_separations_tenant ON daep_student_separations(tenant_id);
CREATE INDEX idx_daep_separations_students ON daep_student_separations(student_a_school_id, student_b_school_id);
CREATE INDEX idx_daep_separations_active ON daep_student_separations(active) WHERE active = true;

-- RLS policy
ALTER TABLE daep_student_separations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their tenant's separations"
  ON daep_student_separations
  FOR ALL
  USING (tenant_id = get_my_tenant_id());

-- Placement transitions log
CREATE TABLE IF NOT EXISTS daep_placement_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  transition_reason TEXT,
  transitioned_by TEXT NOT NULL,
  transitioned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_daep_transitions_placement ON daep_placement_transitions(placement_id);
CREATE INDEX idx_daep_transitions_tenant ON daep_placement_transitions(tenant_id);

-- RLS policy
ALTER TABLE daep_placement_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their tenant's transitions"
  ON daep_placement_transitions
  FOR ALL
  USING (tenant_id = get_my_tenant_id());
```

---

**Continue to Part 2:** [tech-spec-epic-2-part2.md](./tech-spec-epic-2-part2.md)

Part 2 covers:
- Story 2.7: Days Calculation Utility
- Story 2.8: Placement Status Transitions
- Story 2.9: Transition Workflow
- Story 2.10: No-Show and Early Termination
- Story 2.11: Rollover Students
- Story 2.12: TrespassTracker Expiration Sync
- Story 2.13: 90-Day Assessment Tracking
