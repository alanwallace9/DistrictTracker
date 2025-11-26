# Architecture - DAEPManagement Module (Part 1)

> **Document Split:** This is Part 1 covering Executive Summary, Patterns, Decisions, and CSV Reconciliation.
> See [architecture-part2.md](./architecture-part2.md) for Data Architecture, Analytics, and Project Structure.

**Author:** Alan
**Date:** 2025-11-24
**Version:** 1.0 (In Progress)

## Executive Summary

DAEPManagement is the second module for DistrictTracker.com, extending the existing TrespassTracker foundation. This architecture builds on proven infrastructure (Next.js 15, Supabase, Clerk) to add DAEP-specific capabilities including CSV reconciliation, point tracking, and compliance management.

**Architectural Approach:** Modular monolith - shared infrastructure with clear module boundaries. DAEP inherits authentication, multi-tenancy, and UI patterns from TrespassTracker while adding unique features like banking-style CSV reconciliation.

**Scale Target:** 10-100 Texas school districts, each with ~20K students, 33 campuses, ~700 DAEP placements/year. Multi-tenant SaaS with tenant_id isolation and horizontal scaling via Vercel + Supabase.

## Project Foundation (Inherited from TrespassTracker)

**No starter template needed** - extending operational codebase:

- ✅ **Framework:** Next.js 15.5.4 with App Router
- ✅ **Language:** TypeScript 5.9.3 (strict mode)
- ✅ **Frontend:** React 19.2.0 + Radix UI + Tailwind CSS + shadcn/ui
- ✅ **Database:** Supabase PostgreSQL with Row-Level Security (RLS)
- ✅ **Authentication:** Clerk (invite-based)
- ✅ **Deployment:** Vercel (horizontal scaling)
- ✅ **Multi-tenancy:** Subdomain routing + tenant_id isolation
- ✅ **State:** React Server Components + Server Actions
- ✅ **Audit logging:** admin_audit_log table pattern
- ✅ **Export:** PDF/Excel generation (TrespassTracker pattern)
- ✅ **File storage:** Supabase Storage

**Repository Structure:**
```
DistrictTracker/                    # Modular monolith
├── modules/                        # Module-specific docs
│   ├── TrespassTracker/
│   └── DAEPManagement/
├── app/                            # Shared Next.js app
│   ├── trespass/                   # TT routes
│   ├── daep/                       # DAEP routes (NEW)
│   └── actions/                    # Server actions (all modules)
├── components/
│   ├── shared/                     # Cross-module
│   ├── trespass/                   # TT-specific
│   └── daep/                       # DAEP-specific (NEW)
└── supabase/migrations/            # Shared database
```

## Decision Summary

| Category | Decision | Version | Affects FRs | Rationale |
| -------- | -------- | ------- | ----------- | --------- |
| **CSV Reconciliation** | Side-by-side comparison UI with field-level discrepancy highlighting | N/A | FR52-FR62 | Banking-style reconciliation with Accept SIS/Keep DAEP/Add Note actions |
| **CSV Field Mapping** | One-time mapping setup per district, saved for future imports | N/A | FR52-FR53 | SIS systems use consistent field names after initial configuration |
| **TT Integration** | Student lookup by student_id + incident_number | N/A | FR73-FR77 | Each placement tied to specific incident from TrespassTracker |
| **Expiration Sync** | DAEP placement end date syncs to TrespassTracker (farthest date shown) | N/A | FR74 | TT shows latest expiration, auto-updates active/inactive status |
| **Dashboard KPI Updates** | Daily midnight cron job recalculation | N/A | FR78-FR79 | Students enroll/leave daily, 24-hour freshness acceptable |
| **Bell Schedules** | Multiple schedules per district with day-by-day assignment | N/A | FR63-FR68 | Support regular, early release, half-day schedules |
| **Period Tracking** | Current period calculated from bell schedule + current time | N/A | FR68 | Real-time period detection for attendance entry |
| **Attendance Options** | P (Present), A (Absent), T (Tardy with time), ED (Early Dismissal with time) | N/A | FR38-FR41 | Four status types with optional timestamps |
| **Discipline Codes** | District-level PEIMS codes with mandatory/discretionary flags | N/A | FR69-FR72 | Texas state codes, set once per year, track mandatory vs discretionary |
| **Compliance Tracking** | 90-day assessment trigger based on days_assigned > 90 | N/A | FR87-FR88 | Texas TEC §37.0082 requirement, auto-flag students |
| **Assessment Tracking** | Intake scores stored in placement record (math, reading) | N/A | FR87 | Track assessment results per placement |
| **Email Infrastructure** | Build new email notification system (not in TrespassTracker) | TBD | FR93-FR98 | TrespassTracker only has notification bell, DAEP needs email |
| **Notification Triggers** | Return: 7/5/3/2 days before transition, 3+ absent days, below 85% threshold | N/A | FR93-FR98 | User-configurable notification timing for campus returns and interventions |
| **Report Format** | Interactive drilldown + Excel/CSV export | N/A | FR78-FR86 | Quick iPad answers with detailed export capability |
| **Report Types** | Attendance, enrollment by campus, recidivism, offense trends | N/A | FR78-FR86 | Filterable, 24-hour data freshness |
| **Search & Filter** | By student ID, name, campus, status, date range | N/A | FR10-FR11 | Standard search/filter patterns for student lists |
| **Days Calculation** | School days only (exclude holidays/weekends from calendar) | N/A | FR20 | Based on uploaded school calendar, manual weather day adjustments |
| **Room Capacity** | Maximum 15 students per room | N/A | FR67 | DAEP classroom size limit |
| **Student Separation** | Constraint-based room assignment (flagged students → separate building halves) | N/A | FR18 | Safety requirement: separated students cannot be in adjacent rooms |
| **Room Assignment Logic** | If Student A in rooms 501-505, Student B only in 506-509 (and vice versa) | N/A | FR18 | Automatic dropdown filtering based on separation flags |
| **Rollover Students** | End-of-year report for students with days remaining > school days left | N/A | FR25 | Campus decision workflow for next-year planning |
| **Rollover Handling** | Time stops at year end, decision recorded, student continues or resets next year | N/A | FR25 | Formal transition between school years |
| **No-Show Students** | Entered with full days_assigned, days_owed = days_assigned | N/A | FR26 | Track assigned-but-never-attended students |
| **Bulk Point Entry** | Checkbox selection + bulk action dropdown (Add Points, Mark Present) | N/A | FR30 | Teachers reward whole class or handle room-wide scenarios efficiently |
| **Recidivism Tracking** | Same student, different incident_number = recidivism | CRITICAL | FR85-FR86 | MOVED FROM NICE-TO-HAVE - core metric for program effectiveness |
| **Excused Absences** | Excused periods count toward days served + points earned | N/A | FR42 | Court, official school events - student still progresses |
| **Unexcused Absences** | Unexcused periods do NOT count toward days served, no points | N/A | FR42 | Doctor's note - not truancy, but day doesn't count |
| **Half-Day Scenarios** | Can be excused AM + unexcused PM (or vice versa) | N/A | FR42 | Period-level granularity for absence tracking |
| **Point Milestones** | Achievement badges for streaks (5 perfect days, etc.) | N/A | FR35, FR95 | Student/parent portal motivation feature |
| **Behavior Categories** | District-configurable positive/negative categories in admin panel | N/A | FR47 | Editable by district, custom to their discipline framework |
| **Point Approval Flag** | Per-teacher flag in admin panel (not per-room) | N/A | FR31-FR33 | Most teachers approved, some need oversight for parent-facing content |
| **Unapproved Points Display** | Teacher sees "pending", other staff see it, students/parents do NOT see it | N/A | FR31-FR33 | Unapproved posts stay private until admin reviews |
| **Point Approval Action** | Admin can edit verbiage, change category, adjust points, then publish | N/A | FR33 | Admin controls what becomes parent/student-visible |
| **Rejected Points** | Stay private (don't disappear), teacher can still see them | N/A | FR33 | Maintain audit trail, allow staff awareness |
| **Placement States** | PENDING (approved, pre-intake) → ACTIVE (serving at DAEP) → TRANSITION (DAEP complete, awaiting campus return) → COMPLETE (transition meeting + first day back) | N/A | FR21 | Track full student journey from approval to campus reintegration |
| **State Transitions** | Pending→Active (intake day), Active→Transition (manual trigger when requirements met), Transition→Complete (campus confirms meeting + first day) | N/A | FR21 | Clear workflow gates for each stage |
| **Skip States** | Pending → Complete possible (appeal overturned before intake) | N/A | FR21 | Handle edge cases like successful appeals |
| **Intake Pipeline Enhancement** | Show all 4 states in pipeline view (not just intake), drag-and-drop to move students between states | N/A | FR21 | Visual workflow management with state count at top |
| **Recidivism Formula** | Student-focused: (Students with 2+ placements) / (Total unique students) × 100 | N/A | FR85-FR86 | TEA has no mandated formula; focus on student outcomes, not placement counts |
| **Recidivism Breakdown** | Show: 2 placements, 3 placements, 4+ placements with clickable cards | N/A | FR85-FR86 | Detailed view shows which students are repeat offenders |
| **Recidivism by Campus** | Filter recidivism rate by home campus for comparative analysis | N/A | FR85-FR86 | Identify which campuses have better transition support/interventions |

### Technology Stack Decisions

| Technology | Decision | Version | Purpose | Rationale |
|------------|----------|---------|---------|-----------|
| **Email Service** | Resend (optional/future) | Latest | Return-to-campus emails, notifications | Modern API, React Email templates, best deliverability; Clerk handles magic links |
| **In-App Notifications** | Bell icon + notification store | N/A | Primary notification method | Most notifications in-app, not email; reduce email volume |
| **CSV Parsing** | PapaParse | Latest | Parse SIS CSV exports for reconciliation | Battle-tested, handles messy CSV files, auto-detects encodings, TypeScript support |
| **Cron Jobs** | Vercel Cron | N/A | Daily KPI updates, notification triggers, status badges | Already using for TrespassTracker demo reset and badge updates |
| **Date/Time Library** | date-fns | Latest | Days remaining calculation, school calendar logic | Modern, tree-shakeable, immutable, addBusinessDays() built-in |
| **School Calendar** | CSV upload of school days | N/A | Define school days for days-served calculation | Upload at year start, manual adjustments for weather days (second semester) |
| **Chart Library** | Tremor | Latest | Dashboard visualizations, attendance trends, enrollment graphs | Tailwind-native, matches shadcn/ui, professional look, accessible |
| **KPI Cards** | shadcn/ui Card component | N/A | Dashboard metric cards | Already using, consistent with design system |

## Implementation Patterns

**These patterns ensure AI agents write consistent code matching TrespassTracker conventions.**

### Naming Conventions

| Type | Pattern | Example | Rule |
|------|---------|---------|------|
| **Server Actions** | `verbNoun()` camelCase | `createPlacement()`, `updatePoints()`, `getStudentProfile()` | Match TrespassTracker: `createRecord()`, `updateRecord()` |
| **Files** | kebab-case.ts | `student-placements.ts`, `point-tracking.ts` | Consistent with existing `upload-records.ts` |
| **Components** | PascalCase.tsx | `PointEntryModal.tsx`, `ReconciliationView.tsx` | React convention, matches existing |
| **Database Tables** | snake_case | `daep_students`, `daep_placements`, `daily_points` | Match existing: `trespass_records`, `user_profiles` |
| **Database Columns** | snake_case | `student_id`, `days_assigned`, `home_campus_id` | Consistent with Supabase conventions |
| **Types/Interfaces** | PascalCase | `DAEPStudent`, `Placement`, `PointEntry` | TypeScript convention |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_ROOM_CAPACITY`, `DEFAULT_POINTS` | Standard for constants |

### Code Organization

**Server Actions Location:**
```
app/actions/daep/
├── students.ts          # Student CRUD operations
├── placements.ts        # Placement management
├── points.ts            # Point entry and approval
├── attendance.ts        # Attendance tracking
├── reconciliation.ts    # CSV reconciliation
├── notifications.ts     # Notification triggers
└── reports.ts           # Report generation
```

**Component Organization:**
```
components/daep/
├── dashboard/           # Dashboard components
├── students/            # Student list and profile
├── placements/          # Placement workflows
├── rooms/               # Room roster and point entry
├── reconciliation/      # CSV reconciliation UI
└── shared/              # DAEP-specific reusable components
```

**Pattern:** Group by feature, not by type (no separate `/forms`, `/modals` folders)

### Server Action Pattern

**All DAEP server actions follow this structure (matching TrespassTracker):**

```typescript
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { logAuditEvent } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { validateData, PlacementSchema } from '@/lib/validation/schemas';

export async function createPlacement(data: CreatePlacementInput) {
  // 1. Get authenticated context
  const supabase = await createServerClient();
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // 2. Validate input with Zod
  const validation = validateData(PlacementSchema, data);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  // 3. Database operation
  const { data: placement, error } = await supabase
    .from('daep_placements')
    .insert(validation.data)
    .select()
    .single();

  if (error) {
    console.error('Error creating placement:', error);
    throw new Error(error.message);
  }

  // 4. Audit log (critical for FERPA compliance)
  await logAuditEvent({
    eventType: 'placement.created',
    module: 'daep_management',
    actorId: userId,
    targetId: placement.id,
    action: `Created DAEP placement for student ${data.student_id}`,
    tenantId: placement.tenant_id,
    details: { days_assigned: data.days_assigned }
  });

  // 5. Revalidate affected routes
  revalidatePath('/daep/dashboard');
  revalidatePath(`/daep/students/${data.student_id}`);

  return placement;
}
```

**Pattern Rules:**
- ✅ Always use `'use server'` directive
- ✅ Always authenticate with Clerk
- ✅ Always validate with Zod schemas
- ✅ Always log mutations to audit trail
- ✅ Always revalidate affected paths
- ✅ Throw errors (don't return error objects)

### Error Handling

**Pattern:** Throw descriptive errors, let error boundaries catch them

```typescript
// ❌ DON'T return error objects
return { success: false, error: 'Something failed' };

// ✅ DO throw errors with context
throw new Error('Failed to create placement: Student not found');
```

**Client-side error display:**
- Use toast notifications for user-facing errors
- Log detailed errors to console for debugging
- Show generic "Something went wrong" to users, specific errors to admins

### API Response Format

**Server Actions return data directly (not wrapped):**

```typescript
// ✅ Correct - matches TrespassTracker
export async function getStudent(id: string): Promise<DAEPStudent> {
  // ... fetch logic
  return student;
}

// ❌ Don't wrap in { data, error } objects
// Server Actions throw errors instead
```

### Database Query Patterns

**Always use RLS-aware queries:**

```typescript
// ✅ Correct - RLS automatically filters by tenant_id
const { data: students } = await supabase
  .from('daep_students')
  .select('*')
  .eq('status', 'active');

// ❌ Don't manually filter by tenant_id in queries
// RLS policies handle this automatically
```

**Joining related data:**

```typescript
// ✅ Use Supabase's relationship syntax
const { data: placements } = await supabase
  .from('daep_placements')
  .select(`
    *,
    student:daep_students(*),
    home_campus:campuses(*)
  `)
  .eq('status', 'active');
```

### Validation Schemas

**Use Zod schemas in `/lib/validation/schemas.ts`:**

```typescript
import { z } from 'zod';

export const PlacementSchema = z.object({
  student_id: z.string().uuid(),
  incident_number: z.string().min(1, 'Incident number required'),
  days_assigned: z.number().int().min(1).max(365),
  start_date: z.string().date(),
  offense_code: z.string().min(1),
  placement_reason: z.string().min(10, 'Reason must be at least 10 characters'),
  home_campus_id: z.string().uuid(),
  tenant_id: z.string()
});

export type CreatePlacementInput = z.infer<typeof PlacementSchema>;
```

### Date Handling

**Use date-fns for all date operations:**

```typescript
import { addBusinessDays, isWeekend, format } from 'date-fns';

// Calculate days remaining
function calculateDaysRemaining(
  startDate: Date,
  daysAssigned: number,
  schoolCalendar: Date[]
): Date {
  let daysServed = 0;
  let currentDate = startDate;

  while (daysServed < daysAssigned) {
    currentDate = addBusinessDays(currentDate, 1);

    // Check if date is in school calendar
    if (schoolCalendar.some(d => isSameDay(d, currentDate))) {
      daysServed++;
    }
  }

  return currentDate;
}
```

**Date storage:** Always store dates as ISO strings in database, parse with `new Date()` in code

**Date formatting:** Use US format (MM/DD/YYYY) and 12-hour clock (Central Time)

```typescript
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Display dates in US format
const displayDate = format(new Date(dbDate), 'MM/dd/yyyy'); // "11/24/2025"

// Display times in 12-hour format (Central Time)
const centralDate = toZonedTime(new Date(dbDate), 'America/Chicago');
const displayTime = format(centralDate, 'h:mm a'); // "2:30 PM"

// Full timestamp
const displayTimestamp = format(centralDate, 'MM/dd/yyyy h:mm a'); // "11/24/2025 2:30 PM"

// Relative dates for recent events
import { formatDistanceToNow } from 'date-fns';
const relativeTime = formatDistanceToNow(new Date(dbDate), { addSuffix: true }); // "2 hours ago"
```

**Rule:** All user-facing dates use configured timezone (default: America/Chicago for this build), server timestamps use UTC

**Timezone Configuration:**
- **For this build:** Hard-coded to Central Time (`America/Chicago`)
- **Future:** Admin panel setting for timezone selection per tenant
  - Florida districts: `America/New_York` (EST/EDT)
  - California districts: `America/Los_Angeles` (PST/PDT)
  - Texas districts: `America/Chicago` (CST/CDT)
- **Implementation:** Tenant table gets `timezone` column, all date displays use tenant's configured timezone

### Client vs Server Execution

**CRITICAL SECURITY RULE: Data access and business logic ALWAYS run on the server, never in the browser.**

**Server-Side (Secure):**
- ✅ Database queries
- ✅ Student data access
- ✅ Permission checks
- ✅ Point calculations
- ✅ CSV processing
- ✅ Email sending
- ✅ Audit logging
- ✅ Report generation

**Client-Side (UI Only):**
- ✅ Form validation (visual feedback)
- ✅ UI state (modals, tabs, filters)
- ✅ Optimistic updates (pending states)
- ✅ Chart rendering
- ✅ Client-side sorting/filtering (after data loaded)

**Common Security Mistakes to AVOID:**

```typescript
// ❌ NEVER do database queries in client components
'use client';
export function StudentList() {
  const supabase = createClient(); // WRONG - exposes credentials
  const { data } = await supabase.from('daep_students').select('*');
  // ...
}

// ✅ ALWAYS fetch data in Server Components or Server Actions
export default async function StudentList() {
  const students = await getStudents(); // Server Action
  return <StudentListClient students={students} />;
}
```

```typescript
// ❌ NEVER check permissions in client code
'use client';
if (userRole === 'district_admin') { // Can be bypassed in browser
  return <DeleteButton />;
}

// ✅ ALWAYS check permissions on the server
export async function deleteStudent(id: string) {
  const { userId } = await auth();
  const user = await getUserRole(userId);

  if (user.role !== 'district_admin') {
    throw new Error('Unauthorized'); // Server blocks request
  }
  // ... delete logic
}
```

```typescript
// ❌ NEVER calculate sensitive data in the browser
'use client';
const daysRemaining = placement.days_assigned - daysServed; // Can be manipulated

// ✅ ALWAYS calculate on server, send results to client
export async function getPlacement(id: string) {
  const placement = await fetchPlacement(id);
  const daysRemaining = calculateDaysRemaining(placement); // Server calculation
  return { ...placement, daysRemaining };
}
```

**Pattern:** If it touches student data or business rules, it runs on the server. If it's just UI state, it can be client-side.

### Logging Strategy

**Console logging for development:**

```typescript
// ✅ Descriptive context
console.log('[DAEP Reconciliation] Processing CSV with', records.length, 'records');
console.error('[DAEP Points] Failed to approve points:', error);

// ❌ Generic logging
console.log('Processing');
console.error(error);
```

**Audit logging for compliance:**

```typescript
// Log ALL mutations affecting student data
await logAuditEvent({
  eventType: 'points.approved',
  module: 'daep_management',
  actorId: userId,
  targetId: pointEntryId,
  action: 'Approved 8 points for student',
  tenantId: tenantId,
  details: { student_id, period, points }
});
```

### Form Patterns

**Use React Hook Form + Zod:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(PlacementSchema),
  defaultValues: { /* ... */ }
});

// In component
<Form {...form}>
  <FormField
    control={form.control}
    name="days_assigned"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Days Assigned</FormLabel>
        <FormControl>
          <Input type="number" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

**Match existing TrespassTracker form patterns from shadcn/ui**

### State Management

**Use React Server Components + Server Actions (no client state for data):**

```typescript
// ✅ Server Component fetches data
export default async function StudentsPage() {
  const students = await getStudents(); // Server Action

  return <StudentList students={students} />;
}

// ✅ Client Component handles mutations
'use client';
export function PointEntryForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (data) => {
    startTransition(async () => {
      await createPointEntry(data); // Server Action
      toast.success('Points saved');
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**For notifications:** Use zustand store (lightweight, matches TrespassTracker pattern if implemented)

### File Upload Pattern

**Use Supabase Storage with Server Actions:**

```typescript
export async function uploadCSV(file: File) {
  const supabase = await createServerClient();
  const { userId } = await auth();

  // Generate unique filename
  const fileName = `${userId}/${Date.now()}-${file.name}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('daep-uploads')
    .upload(fileName, file);

  if (error) throw new Error(error.message);

  // Return public URL
  const { data: { publicUrl } } = supabase.storage
    .from('daep-uploads')
    .getPublicUrl(fileName);

  return publicUrl;
}
```

## Novel Pattern: CSV Reconciliation Architecture

**This is the core differentiator** - banking-style reconciliation that builds data trust.

### Business Flow

```
1. Admin uploads SIS CSV export
   ↓
2. System parses CSV and maps fields (using saved mapping)
   ↓
3. System compares SIS data vs existing DAEP records
   ↓
4. System categorizes discrepancies:
   - Matched (142 students)
   - Field conflicts (5 students - start date different)
   - New in SIS (3 students - not in DAEP yet)
   - Missing from SIS (1 student - in DAEP but not SIS)
   ↓
5. Admin reviews each discrepancy
   ↓
6. For each conflict, admin chooses:
   - Accept SIS (overwrites DAEP)
   - Keep DAEP (ignores SIS)
   - Add note (explains decision)
   ↓
7. System generates reconciliation summary
   ↓
8. Audit trail records all decisions
```

### Data Model

**Tables needed:**

```sql
-- Field mapping configuration (one-time setup per district)
CREATE TABLE daep_csv_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  sis_name TEXT NOT NULL, -- e.g., "Skyward", "Focus", "PowerSchool"
  field_mappings JSONB NOT NULL,
  -- Example: {
  --   "student_id": "StudentNumber",
  --   "first_name": "FirstName",
  --   "start_date": "PlacementStartDate"
  -- }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconciliation sessions
CREATE TABLE daep_reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  uploaded_by TEXT NOT NULL, -- Clerk user_id
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  total_records INT NOT NULL,
  matched_count INT DEFAULT 0,
  discrepancy_count INT DEFAULT 0,
  new_in_sis_count INT DEFAULT 0,
  missing_from_sis_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending | in_review | completed
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual discrepancies found
CREATE TABLE daep_reconciliation_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES daep_reconciliation_sessions(id) ON DELETE CASCADE,
  student_id TEXT, -- May be null for "new in SIS" records
  discrepancy_type TEXT NOT NULL, -- 'field_conflict' | 'new_in_sis' | 'missing_from_sis'
  sis_data JSONB NOT NULL, -- Full SIS record
  daep_data JSONB, -- Current DAEP record (null if new)
  conflicts JSONB, -- Array of conflicting fields
  -- Example: [
  --   { field: "start_date", sis_value: "2025-11-10", daep_value: "2025-11-09" },
  --   { field: "days_assigned", sis_value: 45, daep_value: 30 }
  -- ]
  resolution TEXT, -- 'accept_sis' | 'keep_daep' | 'pending'
  resolution_note TEXT, -- Admin's explanation
  resolved_by TEXT, -- Clerk user_id
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconciliation audit trail
CREATE TABLE daep_reconciliation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES daep_reconciliation_sessions(id),
  discrepancy_id UUID REFERENCES daep_reconciliation_discrepancies(id),
  action TEXT NOT NULL, -- 'session_started' | 'discrepancy_resolved' | 'session_completed'
  actor_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Component Architecture

**Upload Flow:**

```typescript
// app/daep/reconciliation/page.tsx (Server Component)
export default async function ReconciliationPage() {
  const sessions = await getReconciliationSessions();
  return <ReconciliationDashboard sessions={sessions} />;
}

// components/daep/reconciliation/UploadCSV.tsx (Client Component)
'use client';
export function UploadCSV() {
  const handleUpload = async (file: File) => {
    // 1. Upload file to Supabase Storage
    const fileUrl = await uploadCSVFile(file);

    // 2. Parse CSV and create reconciliation session
    const session = await startReconciliationSession(fileUrl, file.name);

    // 3. Redirect to review page
    router.push(`/daep/reconciliation/${session.id}`);
  };

  return <FileDropzone onDrop={handleUpload} />;
}
```

**Reconciliation Server Actions:**

```typescript
// app/actions/daep/reconciliation.ts
'use server';

export async function startReconciliationSession(
  fileUrl: string,
  fileName: string
) {
  const supabase = await createServerClient();
  const { userId } = await auth();

  // 1. Download and parse CSV
  const csvData = await downloadFile(fileUrl);
  const records = Papa.parse(csvData, { header: true }).data;

  // 2. Get field mapping for this tenant
  const mapping = await getFieldMapping();

  // 3. Transform SIS records using mapping
  const sisRecords = records.map(row => transformSISRecord(row, mapping));

  // 4. Fetch current DAEP students
  const { data: daepStudents } = await supabase
    .from('daep_students')
    .select('*')
    .in('student_id', sisRecords.map(r => r.student_id));

  // 5. Compare and find discrepancies
  const { matched, discrepancies } = compareRecords(sisRecords, daepStudents);

  // 6. Create reconciliation session
  const { data: session } = await supabase
    .from('daep_reconciliation_sessions')
    .insert({
      uploaded_by: userId,
      file_name: fileName,
      file_url: fileUrl,
      total_records: records.length,
      matched_count: matched.length,
      discrepancy_count: discrepancies.length,
      status: 'in_review'
    })
    .select()
    .single();

  // 7. Insert discrepancies
  await supabase
    .from('daep_reconciliation_discrepancies')
    .insert(
      discrepancies.map(d => ({
        session_id: session.id,
        ...d
      }))
    );

  return session;
}

// Compare SIS vs DAEP records
// IMPORTANT: Compare by student_id + incident_number (composite key)
// Students can have multiple placements with different incident numbers
function compareRecords(sisRecords, daepPlacements) {
  const matched = [];
  const discrepancies = [];

  for (const sisRecord of sisRecords) {
    // Find placement by student_id + incident_number
    const daepPlacement = daepPlacements.find(
      p => p.student_id === sisRecord.student_id &&
           p.incident_number === sisRecord.incident_number
    );

    if (!daepPlacement) {
      // New placement in SIS (could be student's 2nd, 3rd placement)
      const studentName = `${sisRecord.first_name} ${sisRecord.last_name}`;
      discrepancies.push({
        student_id: sisRecord.student_id,
        discrepancy_type: 'new_placement_in_sis',
        sis_data: sisRecord,
        daep_data: null,
        conflicts: null,
        display_message: `New placement for ${studentName} (${sisRecord.student_id}) - Incident ${sisRecord.incident_number}`
      });
      continue;
    }

    // Find field conflicts (placement data AND student demographics)
    const conflicts = findConflicts(sisRecord, daepPlacement);

    if (conflicts.length === 0) {
      matched.push(`${sisRecord.student_id}-${sisRecord.incident_number}`);
    } else {
      const studentName = `${sisRecord.first_name} ${sisRecord.last_name}`;
      discrepancies.push({
        student_id: sisRecord.student_id,
        incident_number: sisRecord.incident_number,
        discrepancy_type: 'field_conflict',
        sis_data: sisRecord,
        daep_data: daepPlacement,
        conflicts,
        display_message: `Data conflicts found for ${studentName} (${sisRecord.student_id}) - Incident ${sisRecord.incident_number}`
      });
    }
  }

  // Find students in DAEP but missing from SIS
  const sisStudentIds = new Set(sisRecords.map(r => r.student_id));
  for (const daepStudent of daepStudents) {
    if (!sisStudentIds.has(daepStudent.student_id)) {
      discrepancies.push({
        student_id: daepStudent.student_id,
        discrepancy_type: 'missing_from_sis',
        sis_data: null,
        daep_data: daepStudent,
        conflicts: null
      });
    }
  }

  return { matched, discrepancies };
}

function findConflicts(sisRecord, daepPlacement) {
  const conflicts = [];

  // Check placement fields (specific to this incident)
  const placementFields = [
    { key: 'start_date', label: 'Start Date' },
    { key: 'days_assigned', label: 'Days Assigned' },
    { key: 'offense_code', label: 'Offense Code' },
    { key: 'placement_reason', label: 'Placement Reason' }
  ];

  // Check student demographic fields (applies across all placements)
  const studentFields = [
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'home_campus_id', label: 'Home Campus' },
    { key: 'parent_phone', label: 'Parent Phone' },
    { key: 'parent_email', label: 'Parent Email' }
  ];

  const allFields = [...placementFields, ...studentFields];

  for (const { key, label } of allFields) {
    if (sisRecord[key] !== daepPlacement[key]) {
      conflicts.push({
        field: key,
        field_label: label,
        sis_value: sisRecord[key],
        daep_value: daepPlacement[key],
        // Human-readable message
        message: `${label} changed from "${daepPlacement[key]}" to "${sisRecord[key]}"`
      });
    }
  }

  return conflicts;
}

// Human-readable error messages for CSV validation
function validateCSVRecord(record, rowNumber) {
  const errors = [];
  const studentName = `${record.first_name || 'Unknown'} ${record.last_name || 'Student'}`;
  const studentId = record.student_id || `Row ${rowNumber}`;

  if (!record.student_id) {
    errors.push(`Student ${studentName} at row ${rowNumber} is missing a Student ID`);
  }
  if (!record.incident_number) {
    errors.push(`Student ${studentName} (${studentId}) is missing an Incident Number - this is required to track placements`);
  }
  if (!record.start_date) {
    errors.push(`Student ${studentName} (${studentId}) is missing a Start Date - please add the placement start date in MM/DD/YYYY format`);
  }
  if (!record.days_assigned || record.days_assigned < 1) {
    errors.push(`Student ${studentName} (${studentId}) has invalid Days Assigned - must be at least 1 day`);
  }
  if (!record.home_campus_id) {
    errors.push(`Student ${studentName} (${studentId}) is missing a Home Campus - please specify which campus they're returning to`);
  }

  return errors;
}
```

**Review UI:**

```typescript
// app/daep/reconciliation/[id]/page.tsx
export default async function ReconciliationReviewPage({ params }) {
  const session = await getReconciliationSession(params.id);
  const discrepancies = await getDiscrepancies(params.id);

  return (
    <ReconciliationReview
      session={session}
      discrepancies={discrepancies}
    />
  );
}

// components/daep/reconciliation/ReconciliationReview.tsx
'use client';
export function ReconciliationReview({ session, discrepancies }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentDiscrepancy = discrepancies[currentIndex];

  const handleResolve = async (resolution: 'accept_sis' | 'keep_daep', note?: string) => {
    await resolveDiscrepancy(currentDiscrepancy.id, resolution, note);

    // Move to next discrepancy
    if (currentIndex < discrepancies.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All resolved, complete session
      await completeReconciliationSession(session.id);
      router.push('/daep/reconciliation');
    }
  };

  return (
    <div>
      <ReconciliationSummary
        matched={session.matched_count}
        discrepancies={session.discrepancy_count}
        newInSIS={session.new_in_sis_count}
        missingFromSIS={session.missing_from_sis_count}
      />

      <DiscrepancyCard
        discrepancy={currentDiscrepancy}
        currentIndex={currentIndex}
        total={discrepancies.length}
      />

      <ComparisonView
        sisData={currentDiscrepancy.sis_data}
        daepData={currentDiscrepancy.daep_data}
        conflicts={currentDiscrepancy.conflicts}
      />

      <ResolutionActions
        onAcceptSIS={() => handleResolve('accept_sis')}
        onKeepDAEP={() => handleResolve('keep_daep')}
        onAddNote={(note) => handleResolve('accept_sis', note)}
      />

      <Navigation
        onPrevious={() => setCurrentIndex(i => i - 1)}
        onNext={() => setCurrentIndex(i => i + 1)}
        hasPrevious={currentIndex > 0}
        hasNext={currentIndex < discrepancies.length - 1}
      />
    </div>
  );
}
```

**Resolve Discrepancy:**

```typescript
export async function resolveDiscrepancy(
  discrepancyId: string,
  resolution: 'accept_sis' | 'keep_daep',
  note?: string
) {
  const supabase = await createServerClient();
  const { userId } = await auth();

  // Get discrepancy details
  const { data: discrepancy } = await supabase
    .from('daep_reconciliation_discrepancies')
    .select('*')
    .eq('id', discrepancyId)
    .single();

  // Apply resolution
  if (resolution === 'accept_sis') {
    if (discrepancy.discrepancy_type === 'new_in_sis') {
      // Create new DAEP student
      await supabase
        .from('daep_students')
        .insert(discrepancy.sis_data);
    } else if (discrepancy.discrepancy_type === 'field_conflict') {
      // Update existing DAEP record with SIS data
      await supabase
        .from('daep_students')
        .update(discrepancy.sis_data)
        .eq('student_id', discrepancy.student_id);
    }
  }
  // If 'keep_daep', no database changes needed

  // Mark discrepancy as resolved
  await supabase
    .from('daep_reconciliation_discrepancies')
    .update({
      resolution,
      resolution_note: note,
      resolved_by: userId,
      resolved_at: new Date().toISOString()
    })
    .eq('id', discrepancyId);

  // Audit log
  await logAuditEvent({
    eventType: 'reconciliation.discrepancy_resolved',
    module: 'daep_management',
    actorId: userId,
    targetId: discrepancyId,
    action: `Resolved discrepancy: ${resolution}`,
    details: { student_id: discrepancy.student_id, note }
  });

  revalidatePath('/daep/reconciliation');
}
```

### Field Mapping Setup

**One-time configuration UI:**

```typescript
// app/daep/settings/csv-mapping/page.tsx
export function CSVMappingSetup() {
  const [sample, setSample] = useState(null);

  const handleUploadSample = async (file: File) => {
    const data = Papa.parse(await file.text(), { header: true });
    setSample(data.meta.fields); // CSV column names
  };

  const handleSaveMapping = async (mapping) => {
    await saveFieldMapping({
      sis_name: 'Skyward', // or Focus, PowerSchool
      field_mappings: mapping
    });
  };

  return (
    <div>
      <h2>CSV Field Mapping Setup</h2>
      <FileDropzone onDrop={handleUploadSample} />

      {sample && (
        <MappingEditor
          csvFields={sample}
          daepFields={DAEP_REQUIRED_FIELDS}
          onSave={handleSaveMapping}
        />
      )}
    </div>
  );
}

const DAEP_REQUIRED_FIELDS = [
  'student_id',
  'first_name',
  'last_name',
  'incident_number',
  'start_date',
  'days_assigned',
  'offense_code',
  'home_campus_id'
];
```

### Performance Considerations

**For 100 records (typical):**
- Parse CSV: <1 second
- Compare records: <2 seconds
- Total processing: <5 seconds ✅

**Optimization strategies:**
- Process in batches if CSV >500 rows
- Use database indexes on `student_id`, `tenant_id`
- Cache field mapping (load once per session)
- Show progress bar for large uploads

### Error Handling

**Scenarios to handle:**
1. Invalid CSV format → Show clear error, sample format
2. Missing required fields → Highlight which fields needed
3. Duplicate student IDs in CSV → Flag duplicates
4. Network timeout during upload → Resume capability
5. Concurrent reconciliation sessions → Lock mechanism

