# Story 5-2: One-Time Field Mapping Setup

**Status:** drafted
**Epic:** 5 - CSV Reconciliation
**Points:** 3
**FRs:** FR53
**Dependencies:** Story 5-1 (CSV Upload)

---

## Story

As a **DAEP administrator**,
I want **to configure how my SIS CSV columns map to DAEP fields**,
So that **future CSV uploads are automatically parsed correctly without repeated configuration**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Every district uses different column names in their SIS exports. Skyward might call it "StudentNumber" while PowerSchool uses "Student_ID". This one-time mapping setup lets admins connect their SIS columns to DAEP fields once, then forget about it. All future uploads use this saved mapping automatically.

---

## UX Overview

### Field Mapping Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CSV Field Mapping                                                       │
│  Configure how your SIS export columns map to DAEP fields               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Student Information System                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ SIS Provider:  [Skyward        ▼]                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  Required Fields                               🔴 Must map all           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Student ID           →    [StudentNumber          ▼]              │  │
│  │ Unique student identifier                                         │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ First Name           →    [FirstName              ▼]              │  │
│  │ Student first name                                                │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ Last Name            →    [LastName               ▼]              │  │
│  │ Student last name                                                 │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ Incident Number      →    [IncidentID             ▼]              │  │
│  │ Unique incident ID from SIS                                       │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ Start Date           →    [PlacementStartDate     ▼]              │  │
│  │ Placement start date                                              │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ Days Assigned        →    [DaysAssigned           ▼]              │  │
│  │ Number of DAEP days                                               │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ Offense Code         →    [OffenseCode            ▼]              │  │
│  │ PEIMS discipline code                                             │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ Home Campus          →    [HomeCampusName         ▼]              │  │
│  │ Student home campus                                               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Optional Fields                               🔵 Map if available       │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Parent Email         →    [ParentEmail            ▼]              │  │
│  │ Guardian email address                                            │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ Guardian Phone       →    [-- Not mapped --       ▼]              │  │
│  │ Guardian phone number                                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│                                      [Cancel]  [Save Mapping]            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Flow

1. User uploads CSV (Story 5-1) → No mapping exists → Redirect here
2. System extracts column headers from uploaded CSV
3. User selects their SIS provider
4. User maps each required DAEP field to a CSV column
5. Optionally maps additional fields
6. Saves mapping → Redirect back to reconciliation session

---

## Acceptance Criteria

| AC | Description | Status | Test |
|----|-------------|--------|------|
| 5.2.1 | Show mapping UI if no mapping exists for tenant | Pending | First upload, verify redirect |
| 5.2.2 | Extract CSV column headers from uploaded file | Pending | Upload CSV, verify headers displayed |
| 5.2.3 | Two-column interface: DAEP field → CSV column | Pending | Verify layout renders correctly |
| 5.2.4 | All 8 required fields must be mapped before save | Pending | Try save with missing, verify error |
| 5.2.5 | Optional fields can be left unmapped | Pending | Leave optional blank, verify save works |
| 5.2.6 | Save mapping to database | Pending | Save, verify record in DB |
| 5.2.7 | SIS provider dropdown with common options + Other | Pending | Verify dropdown options |
| 5.2.8 | Mapping reused for all future uploads | Pending | Second upload, verify no mapping prompt |
| 5.2.9 | Edit existing mapping from settings | Pending | Go to settings, modify mapping |
| 5.2.10 | Audit log records mapping save | Pending | Save mapping, check audit_log |
| 5.2.11 | Smart auto-suggest mappings based on column names | Pending | Upload CSV with "StudentID", verify auto-mapped |
| 5.2.12 | Preview first 3 rows of sample data | Pending | Verify sample data displayed next to columns |
| 5.2.13 | Pre-select SIS if detected from filename | Pending | Upload "skyward_export.csv", verify SIS pre-selected |

---

## Tasks / Subtasks

### Task 1: Database Migration

- [ ] 1.1 Create migration file `[timestamp]_daep_csv_field_mappings.sql`
  - Create `daep_csv_field_mappings` table
  - Fields: id, tenant_id, sis_name, sis_name_other, field_mappings (JSONB), sample_headers (TEXT[]), created_by, created_at, updated_at
  - sis_name enum: 'Skyward', 'Focus', 'PowerSchool', 'Ascender', 'Other'
  - UNIQUE constraint on tenant_id (one mapping per tenant)
- [ ] 1.2 Add indexes
  - `idx_csv_mappings_tenant` on (tenant_id)
- [ ] 1.3 Add RLS policies
  - Tenant isolation with active_tenant_id support
- [ ] 1.4 Add updated_at trigger

### Task 2: Validation Schema

- [ ] 2.1 Add `FieldMappingSchema` to `lib/validation/schemas.ts`
  - sisName: enum
  - sisNameOther: optional string (if Other)
  - mappings: Record<string, string> with required field validation
  - sampleHeaders: string[]
  - sessionId: optional UUID

### Task 3: Server Actions

- [ ] 3.1 Add to `app/actions/daep/reconciliation.ts`
- [ ] 3.2 Implement `extractCSVHeadersAndSample(sessionId)`
  - Get session to find file URL
  - Fetch file content (first ~10KB for headers + sample rows)
  - Parse first 4 rows using PapaParse (1 header + 3 data rows)
  - Clean headers (trim, handle BOM)
  - Return headers array AND sample data rows
- [ ] 3.3 Implement `getFieldMapping()`
  - Fetch existing mapping for tenant
  - Return null if none exists
- [ ] 3.4 Implement `saveFieldMapping(input)`
  - Validate all required fields mapped
  - Upsert mapping (one per tenant)
  - Update session status to 'parsing' if sessionId provided
  - Log audit event
  - Return redirect path

### Task 4: UI Components

- [ ] 4.1 Create page at `app/daep/settings/csv-mapping/page.tsx`
  - Server component
  - Fetch existing mapping
  - Extract headers AND sample data if session param provided
  - Accept `detected_sis` URL param for pre-selection
- [ ] 4.2 Create `FieldMappingForm` component
  - Client component for the mapping interface
  - SIS provider dropdown (pre-selected if detected)
  - Required fields section with badges
  - Optional fields section
  - Save/Cancel buttons
- [ ] 4.3 Create individual mapping row component
  - DAEP field label + description
  - Arrow indicator
  - CSV column dropdown
  - Sample data preview (first 3 values from selected column)
- [ ] 4.4 Handle SIS "Other" option
  - Show custom name input when Other selected
- [ ] 4.5 Create `SampleDataPreview` component
  - Display first 3 rows of data for selected column
  - Update preview when column selection changes
  - Compact inline format below dropdown

### Task 5: Field Definitions

- [ ] 5.1 Define DAEP_FIELDS constant
  - Required: student_id, first_name, last_name, incident_number, start_date, days_assigned, offense_code, home_campus
  - Optional: parent_email, guardian_phone, grade_level, assigning_campus, placement_reason, mandatory_placement

### Task 6: Smart Auto-Suggest Matching (AC: 5.2.11)

- [ ] 6.1 Create `autoSuggestMappings()` utility
  - Input: CSV headers array
  - Output: Suggested mappings object
  - Match common patterns to DAEP fields
- [ ] 6.2 Define matching patterns for each DAEP field
  - student_id: "studentid", "student_id", "studentnumber", "student_number", "id", "pupilid"
  - first_name: "firstname", "first_name", "fname", "first"
  - last_name: "lastname", "last_name", "lname", "last", "surname"
  - incident_number: "incidentid", "incident_id", "incidentnumber", "incident_number", "incident"
  - start_date: "startdate", "start_date", "placementstart", "placement_start", "begindate"
  - days_assigned: "daysassigned", "days_assigned", "days", "numdays", "assigneddays"
  - offense_code: "offensecode", "offense_code", "offense", "disciplinecode", "peimscode"
  - home_campus: "homecampus", "home_campus", "campus", "school", "homeschool"
  - (optional fields similarly)
- [ ] 6.3 Apply suggestions on initial load
  - Pre-fill dropdowns with matches
  - Show "Suggested" badge on auto-matched fields
  - Allow user to override any suggestion

### Task 7: Add to Settings Navigation

- [ ] 7.1 Add "CSV Mapping" tab to DAEP settings page
  - Route: `/daep/settings/csv-mapping`
  - Show current mapping or "Not configured" state

### Task 8: Testing

- [ ] 8.1 Upload CSV, verify redirect to mapping page
- [ ] 8.2 Verify CSV headers extracted correctly
- [ ] 8.3 Verify sample data (3 rows) displayed for each column
- [ ] 8.4 Verify smart auto-suggest pre-fills mappings
- [ ] 8.5 Verify "Suggested" badge shows on auto-matched fields
- [ ] 8.6 Verify all 8 required fields must be mapped
- [ ] 8.7 Verify optional fields can be skipped
- [ ] 8.8 Save mapping, verify in database
- [ ] 8.9 Upload second CSV, verify no mapping prompt
- [ ] 8.10 Edit existing mapping from settings
- [ ] 8.11 Verify SIS "Other" option shows custom input
- [ ] 8.12 Verify SIS pre-selected if detected from filename
- [ ] 8.13 Verify audit log entry
- [ ] 8.14 Verify TypeScript compilation
- [ ] 8.15 Verify with Playwright MCP

---

## Dev Notes

### Required DAEP Fields

| Field | Description | Expected Format |
|-------|-------------|-----------------|
| `student_id` | Unique student identifier | String |
| `first_name` | Student's first name | String |
| `last_name` | Student's last name | String |
| `incident_number` | Unique incident ID from SIS | String |
| `start_date` | DAEP placement start date | Date (various formats) |
| `days_assigned` | Number of days assigned | Integer (1-365) |
| `offense_code` | PEIMS discipline code | String |
| `home_campus` | Student's home campus | String |

### Optional DAEP Fields

| Field | Description |
|-------|-------------|
| `parent_email` | Parent/guardian email |
| `guardian_phone` | Parent/guardian phone |
| `grade_level` | Student grade (1-12) |
| `assigning_campus` | Campus that assigned placement |
| `placement_reason` | Reason for placement |
| `mandatory_placement` | Is placement mandatory? |

### SIS Provider Options

```typescript
const SIS_OPTIONS = [
  { value: 'Skyward', label: 'Skyward' },
  { value: 'Focus', label: 'Focus' },
  { value: 'PowerSchool', label: 'PowerSchool' },
  { value: 'Ascender', label: 'Ascender' },
  { value: 'Other', label: 'Other' },
];
```

### Mapping Storage Format

```json
{
  "student_id": "StudentNumber",
  "first_name": "FirstName",
  "last_name": "LastName",
  "incident_number": "IncidentID",
  "start_date": "PlacementStartDate",
  "days_assigned": "DaysAssigned",
  "offense_code": "OffenseCode",
  "home_campus": "HomeCampusName",
  "parent_email": "ParentEmail"
}
```

### Header and Sample Data Extraction

```typescript
// Fetch first ~10KB to get headers + 3 sample rows
const response = await fetch(session.file_url);
const text = await response.text();
const lines = text.split('\n').slice(0, 4); // header + 3 data rows

// Parse using PapaParse
const Papa = await import('papaparse');
const parsed = Papa.parse(lines.join('\n'), { header: true });

// Clean headers (handle BOM, whitespace)
const headers = Object.keys(parsed.data[0] || {}).map(h =>
  h.replace(/^\uFEFF/, '').trim()
).filter(h => h.length > 0);

// Sample data: array of objects
const sampleData = parsed.data.slice(0, 3);

return { headers, sampleData };
```

### Smart Auto-Suggest Matching

```typescript
const FIELD_PATTERNS: Record<string, string[]> = {
  student_id: ['studentid', 'student_id', 'studentnumber', 'student_number', 'id', 'pupilid', 'stuid'],
  first_name: ['firstname', 'first_name', 'fname', 'first', 'givenname'],
  last_name: ['lastname', 'last_name', 'lname', 'last', 'surname', 'familyname'],
  incident_number: ['incidentid', 'incident_id', 'incidentnumber', 'incident_number', 'incident', 'incnum'],
  start_date: ['startdate', 'start_date', 'placementstart', 'placement_start', 'begindate', 'startdt'],
  days_assigned: ['daysassigned', 'days_assigned', 'days', 'numdays', 'assigneddays', 'dayscnt'],
  offense_code: ['offensecode', 'offense_code', 'offense', 'disciplinecode', 'peimscode', 'code'],
  home_campus: ['homecampus', 'home_campus', 'campus', 'school', 'homeschool', 'campusname'],
  parent_email: ['parentemail', 'parent_email', 'guardianemail', 'email'],
  guardian_phone: ['guardianphone', 'phone', 'parentphone', 'homephone'],
  grade_level: ['gradelevel', 'grade_level', 'grade', 'gradelvl'],
  assigning_campus: ['assigningcampus', 'assigning_campus', 'fromcampus'],
};

function autoSuggestMappings(csvHeaders: string[]): Record<string, string> {
  const suggestions: Record<string, string> = {};

  for (const [daepField, patterns] of Object.entries(FIELD_PATTERNS)) {
    const match = csvHeaders.find(header => {
      const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      return patterns.some(p => normalized.includes(p) || p.includes(normalized));
    });
    if (match) {
      suggestions[daepField] = match;
    }
  }

  return suggestions;
}
```

### Sample Data Preview UX

```
┌───────────────────────────────────────────────────────────────┐
│ Student ID         →    [StudentNumber        ▼]  ✓ Suggested │
│ Unique student identifier                                     │
│                         Sample: 12345, 12346, 12347           │
└───────────────────────────────────────────────────────────────┘
```

- Show first 3 values from the selected column
- Helps verify correct column is mapped
- Gray text, compact format

### Watch Out For

1. **BOM characters** - Windows Excel adds BOM to UTF-8 CSVs
2. **Empty headers** - Filter out blank column headers
3. **Duplicate headers** - Show warning but allow mapping
4. **Special characters** - Preserve original, display cleaned
5. **Encoding issues** - Handle UTF-8, Windows-1252

---

## Edge Cases

| Case | Handling |
|------|----------|
| CSV with BOM | Strip BOM from first header |
| Headers with special characters | Preserve original, display cleaned version |
| Duplicate header names | Show warning, allow mapping |
| Empty headers in CSV | Filter out empty columns |
| Very long header names | Truncate display, show full on hover |
| Tenant already has mapping | Show existing, allow edit/override |

---

## Out of Scope

| Item | Story |
|------|-------|
| CSV parsing and validation | Story 5-3 |
| Record comparison logic | Story 5-4 |
| Discrepancy detection | Story 5-5 |
| Side-by-side comparison UI | Story 5-6 |

---

## Dependencies

- Story 5-1 (CSV Upload) - Provides the uploaded file to extract headers from
- `papaparse` library - For CSV parsing

---

## Definition of Done

- [ ] Mapping page at `/daep/settings/csv-mapping`
- [ ] CSV headers extracted from uploaded file
- [ ] Sample data (first 3 rows) displayed for each column
- [ ] Smart auto-suggest pre-fills mappings based on column names
- [ ] "Suggested" badge shows on auto-matched fields
- [ ] Two-column mapping interface (DAEP → CSV)
- [ ] All 8 required fields must be mapped
- [ ] Optional fields can be skipped
- [ ] Mapping saved to database (one per tenant)
- [ ] SIS provider dropdown with common options
- [ ] SIS pre-selected if detected from filename
- [ ] "Other" option shows custom name input
- [ ] Redirect back to reconciliation session after save
- [ ] Future uploads use saved mapping automatically
- [ ] Audit log records mapping save
- [ ] TypeScript compiles without errors
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-story-5-2.md`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## References

- [Source: docs/reference/epics-part2.md#Story-5.2] - Epic definition
- [Source: docs/sprint-artifacts/daep/tech-spec-story-5-2.md] - Technical specification
- [Source: FR53] - Field Mapping functional requirement
- [Source: Story 5-1] - CSV Upload (provides file for header extraction)
