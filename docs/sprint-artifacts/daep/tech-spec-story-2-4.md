# Tech Spec: Story 2-4 - Create New Placement

**Epic:** 2 - Placement Management
**Points:** 5
**Status:** Done (Implementation Review)
**FRs:** FR9, FR15-FR17

> ⚠️ **Theme Requirement:** All UI components must follow the [Theme & Styling Guidelines](./tech-spec-epic-2-part1.md#theme--styling-guidelines). Never hardcode colors.

---

## Purpose

This spec documents the technical requirements for the placement creation workflow, used to validate the existing implementation for completeness and correctness.

---

## Acceptance Criteria Checklist

| AC | Description | Required Implementation | Verified |
|----|-------------|------------------------|----------|
| 2.4.1 | Form with required fields | Form page at `/daep/placements/new` with all required inputs | |
| 2.4.2 | Student search/select | Typeahead search by name OR school_id with debounce | |
| 2.4.3 | Offense code dropdown | Populated from `daep_discipline_codes` where `active=true` | |
| 2.4.4 | Home campus dropdown | Populated from `campuses` where `tenant_id` matches and `status='active'` | |
| 2.4.5 | Days assigned (1-365) | Number input with min=1, max=365 validation | |
| 2.4.6 | Auto-calculate expected_end_date | Uses school calendar when available, estimation fallback | |
| 2.4.7 | Mandatory flag auto-set | Sets true when offense code has `mandatory_placement=true` | |
| 2.4.8 | Incident number input | Text field, required, stored as FK link | |
| 2.4.9 | Prevent duplicates | Check `school_id + incident_number` before insert | |
| 2.4.10 | Create student if not exists | "New Student" dialog when search returns empty | |
| 2.4.11 | Audit log on creation | `placement.created` event with all details | |

---

## Database Tables Referenced

### `daep_placements` (Primary)
```sql
CREATE TABLE daep_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  school_id VARCHAR(50) NOT NULL,  -- FK to trespass_records
  incident_number VARCHAR(50) NOT NULL,
  placement_date DATE NOT NULL,
  start_date DATE NOT NULL,
  days_assigned INTEGER NOT NULL CHECK (days_assigned BETWEEN 1 AND 365),
  days_served INTEGER DEFAULT 0,
  days_remaining INTEGER NOT NULL,
  expected_end_date DATE,
  offense_code VARCHAR(20) NOT NULL,  -- FK to daep_discipline_codes
  placement_reason TEXT NOT NULL,
  mandatory_placement BOOLEAN DEFAULT FALSE,
  home_campus_id VARCHAR(50) NOT NULL,  -- FK to campuses
  assigning_campus_id VARCHAR(50),
  assigned_room_id UUID,  -- FK to daep_rooms (set during intake)
  intake_notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'transition', 'complete', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, school_id, incident_number)  -- Prevents duplicates
);
```

### Supporting Tables
- `trespass_records` - Student demographics (school_id, name, grade)
- `daep_discipline_codes` - Offense codes with mandatory_placement flag
- `campuses` - Home campus selection
- `daep_school_calendar` - School days for end date calculation

---

## Server Actions Required

### 1. `getDisciplineCodesForForm()`
**Purpose:** Populate offense code dropdown
**Query:**
```typescript
supabase
  .from('daep_discipline_codes')
  .select('code, label, mandatory_placement')
  .eq('tenant_id', tenantId)
  .eq('active', true)
  .order('code')
```
**Returns:** `DisciplineCodeOption[]`

### 2. `getCampusesForForm()`
**Purpose:** Populate home campus dropdown (non-DAEP campuses)
**Query:**
```typescript
supabase
  .from('campuses')
  .select('id, name, is_daep')
  .eq('tenant_id', tenantId)
  .eq('status', 'active')
  .order('name')
```
**Note:** UI should filter to show non-DAEP campuses only

### 3. `searchStudentsForPlacement(query: string)`
**Purpose:** Typeahead student search
**Requirements:**
- Minimum 2 characters before search
- Search by first_name, last_name, OR school_id (ilike)
- Return `has_active_placement` flag for each result
- Disable selection of students with active placements
- Limit 20 results

### 4. `checkDuplicatePlacement(school_id, incident_number)`
**Purpose:** Prevent duplicate placements
**Check:** `tenant_id + school_id + incident_number` unique combination
**Timing:** Called with debounce when both fields populated

### 5. `createPlacement(input: CreatePlacementInput)`
**Purpose:** Create new placement record
**Steps:**
1. Validate input with Zod schema
2. Check duplicate (school_id + incident_number)
3. Look up offense code mandatory_placement flag
4. Calculate expected_end_date from school calendar
5. Insert placement with status='pending'
6. Update trespass_records (is_daep=true, daep_expiration_date)
7. Log audit event
8. Revalidate paths

### 6. `getExpectedEndDatePreview(start_date, days_assigned)`
**Purpose:** Show expected end date in form (real-time preview)
**Returns:** `{ date: string, isEstimate: boolean }`
**Note:** isEstimate=true when school calendar incomplete

### 7. `createQuickStudent(input: QuickStudentInput)` (AC 2.4.10)
**Purpose:** Create student record from placement form when not in system
**Required Fields:** school_id, first_name, last_name
**Optional Fields:** grade_level, campus_id

---

## Validation Schema

```typescript
// lib/validation/schemas.ts

export const CreatePlacementSchema = z.object({
  school_id: z.string().min(1, 'Student ID is required'),
  incident_number: z.string().min(1).max(50),
  placement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days_assigned: z.number().int().min(1).max(365),
  offense_code: z.string().min(1),
  placement_reason: z.string().min(10).max(2000),
  mandatory_placement: z.boolean().default(false),
  home_campus_id: z.string().min(1),
  assigning_campus_id: z.string().optional(),
  intake_notes: z.string().max(2000).optional(),
});

export const QuickStudentSchema = z.object({
  school_id: z.string().min(1).max(50),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  grade_level: z.number().int().min(1).max(12).nullable().optional(),
  current_school: z.string().max(200).nullable().optional(),
  campus_id: z.string().max(50).nullable().optional(),
});
```

---

## UI Component Structure

```
/app/daep/placements/new/
└── page.tsx (client component)
    ├── Student Search Section
    │   ├── Typeahead input with search icon
    │   ├── Results dropdown with active placement indicator
    │   ├── Selected student info card
    │   └── "Create New Student" button (when no results)
    │
    ├── Placement Details Section
    │   ├── Incident number input + duplicate warning
    │   ├── Offense code select (shows mandatory tag)
    │   ├── Home campus select
    │   ├── Placement date input
    │   ├── Start date input
    │   ├── Days assigned input
    │   ├── Expected end date display (calculated, read-only)
    │   ├── Mandatory placement checkbox (auto-checked when applicable)
    │   └── Placement reason textarea
    │
    ├── Optional Section
    │   └── Intake notes textarea
    │
    ├── Form Actions
    │   ├── Cancel button → /daep/students
    │   └── Create Placement button
    │
    └── New Student Dialog (modal)
        ├── Student ID input
        ├── First name input
        ├── Last name input
        ├── Grade level select (1-12)
        └── Home campus select
```

---

## Tenant Isolation Pattern

All queries MUST use effective tenant ID:

```typescript
async function getTenantId(): Promise<string> {
  const user = await currentUser();
  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, active_tenant_id')
    .eq('id', user.id)
    .single();

  // Support super_admin tenant switching
  return profile.active_tenant_id || profile.tenant_id;
}
```

---

## Audit Events

| Event | When | Details |
|-------|------|---------|
| `placement.created` | After successful insert | days_assigned, offense_code, mandatory_placement, start_date, expected_end_date, incident_number |
| `student.quick_created` | When creating new student from form | school_id, first_name, last_name |

---

## Edge Cases

1. **Student with active placement:** Disable selection in search dropdown, show "Active Placement" badge
2. **Duplicate incident number:** Show inline error, prevent submission
3. **No school calendar configured:** Show expected end date with "(Est.)" indicator
4. **Offense code not found:** Should not happen if dropdown populated correctly
5. **Student not in system:** Show "Create New Student" button, open dialog

---

## Implementation Review Checklist

### Server Actions (app/actions/daep/placements.ts)
- [ ] `getDisciplineCodesForForm` - Filters by tenant_id and active=true
- [ ] `getCampusesForForm` - Filters by tenant_id and status='active'
- [ ] `searchStudentsForPlacement` - Min 2 chars, searches name + school_id
- [ ] `checkDuplicatePlacement` - Checks tenant_id + school_id + incident_number
- [ ] `createPlacement` - All 9 steps implemented
- [ ] `getExpectedEndDatePreview` - Returns date and isEstimate flag
- [ ] `createQuickStudent` - Creates trespass_record with minimal fields

### Validation (lib/validation/schemas.ts)
- [ ] `CreatePlacementSchema` - All fields with correct types/constraints
- [ ] `QuickStudentSchema` - Minimal student creation fields

### Days Calculation (lib/daep/days-remaining.ts)
- [ ] `calculateExpectedEndDate` - Uses school calendar, has estimation fallback
- [ ] `previewExpectedEndDate` - Returns isEstimate flag

### UI (app/daep/placements/new/page.tsx)
- [ ] Student typeahead with debounce (300ms)
- [ ] Active placement indicator on search results
- [ ] Offense code dropdown with mandatory tag
- [ ] Campus dropdown filtered to non-DAEP
- [ ] Expected end date preview (real-time)
- [ ] Duplicate placement error display
- [ ] Mandatory checkbox auto-set from offense code
- [ ] New Student dialog with create action
- [ ] Form validation before submit
- [ ] Success toast and redirect

### Audit Logging
- [ ] `placement.created` event in audit log
- [ ] `student.quick_created` event in audit log
- [ ] AuditEventType includes both event types

---

## UX Compliance (from docs/sessions/ux-design-specification.md)

### Pattern Adherence

| UX Pattern | Implementation |
|------------|----------------|
| Primary Button | Blue filled (`#3B82F6`) for "Create Placement" |
| Secondary Button | White with border for "Cancel" |
| Required Fields | Asterisk (*) after label |
| Form Validation | On blur + on submit |
| Error Feedback | Inline error messages + toast |
| Success Feedback | Toast notification (bottom-right) + redirect |
| Loading State | Skeleton/spinner during form options load |
| Touch Targets | 44x44px minimum for iPad compatibility |
| Empty States | "No students found" with "Create New Student" CTA |

### Custom Components Used

| Component | Reference |
|-----------|-----------|
| Student Search | Typeahead with instant filter (no submit) |
| Form Layout | Card sections with clear hierarchy |
| Date Display | Absolute format (YYYY-MM-DD) for placement dates |

### Accessibility

- [ ] Form labels associated with inputs
- [ ] ARIA labels on icon buttons
- [ ] Focus indicators on all interactive elements
- [ ] Color contrast 4.5:1 minimum
- [ ] Keyboard navigation (Tab through all actions)

---

## Known Gaps From Review

*(To be filled in during review)*

1.
2.
3.
