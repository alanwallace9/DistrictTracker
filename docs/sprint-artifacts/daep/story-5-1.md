# Story 5-1: CSV Upload to Supabase Storage

**Status:** drafted
**Epic:** 5 - CSV Reconciliation
**Points:** 5
**FRs:** FR52
**Dependencies:** Epic 1 (schema), Epic 2 (placements exist)

---

## Story

As a **DAEP administrator**,
I want **to upload a CSV file exported from my district's SIS**,
So that **I can begin the reconciliation process to compare DAEP records with official district data**.

---

## Design Philosophy

> "How did they ever do their job without this?"

CSV reconciliation is the core differentiator. Districts export student placement data from their SIS (Skyward, Focus, PowerSchool, etc.) and need to verify it matches what's in DAEP Management. This story is the entry point: a simple, fast file upload with clear feedback. Target: upload a file in under 10 seconds with zero friction.

---

## UX Overview

### Reconciliation Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SIS Reconciliation                                                      │
│  Compare your SIS data with DAEP records                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        📄                                        │    │
│  │                   Upload SIS Export                              │    │
│  │                                                                  │    │
│  │         Drag and drop your CSV file, or click to browse         │    │
│  │                                                                  │    │
│  │                   Maximum file size: 10MB                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  ▼ What fields do I need in my CSV?                    [Expand/Collapse]│
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Required Fields (8)                                               │  │
│  │ ├─ Student ID         Unique identifier (e.g., 12345)            │  │
│  │ ├─ First Name         Student's first name                       │  │
│  │ ├─ Last Name          Student's last name                        │  │
│  │ ├─ Incident Number    Unique incident ID from SIS                │  │
│  │ ├─ Start Date         DAEP placement start date                  │  │
│  │ ├─ Days Assigned      Number of DAEP days (1-365)                │  │
│  │ ├─ Offense Code       PEIMS discipline code                      │  │
│  │ └─ Home Campus        Student's home campus name                 │  │
│  │                                                                   │  │
│  │ Optional Fields (6)                         [Show optional ▼]    │  │
│  │                                                                   │  │
│  │ [📄 Download Sample CSV]   [📋 Download Field List]              │  │
│  │                                                                   │  │
│  │ Need help building this report in your SIS?                      │  │
│  │ ┌──────────────┐  ┌──────────────┐                               │  │
│  │ │  ☁️ Skyward  │  │  📊 Focus    │                               │  │
│  │ │  View Guide  │  │  View Guide  │                               │  │
│  │ └──────────────┘  └──────────────┘                               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  Recent Reconciliation Sessions                                          │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ students_dec_2024.csv          │ Completed │ Dec 10 │ 245 records │  │
│  │ 12 matched · 3 discrepancies · 1 new                               │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ students_nov_2024.csv          │ Completed │ Nov 15 │ 198 records │  │
│  │ 198 matched · 0 discrepancies · 0 new                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### SIS Guide Modal (Skyward Example)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📘 Building Your Export in Skyward                         [X] Close  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Follow these steps to create a custom report with DAEP placement data. │
│                                                                          │
│  Step 1 of 5: Open Data Mining                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│  Navigate to Students → Student Data Mining from the main menu.         │
│                                                                          │
│  [Screenshot placeholder: Skyward main menu with Data Mining highlighted]│
│                                                                          │
│  Step 2 of 5: Create New Report                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  Click "Add" to create a new report. Enter a name like                  │
│  "DAEP Reconciliation Export".                                          │
│                                                                          │
│  [Screenshot placeholder: New report dialog]                            │
│                                                                          │
│  ... (additional steps)                                                  │
│                                                                          │
│                              [◀ Previous]  [Next ▶]                     │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│  [📥 Download PDF Guide]                                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Upload Flow

1. User drags CSV file to dropzone (or clicks to browse)
2. Progress indicator shows upload status
3. On success:
   - If **no field mapping exists**: Redirect to CSV Mapping setup (Story 5-2)
   - If **mapping exists**: Redirect to reconciliation session view (Story 5-4+)
4. On error: Show clear message with retry option

---

## Acceptance Criteria

| AC | Description | Status | Test |
|----|-------------|--------|------|
| 5.1.1 | Reconciliation page exists at `/daep/reconciliation` | Pending | Navigate to URL, verify page renders |
| 5.1.2 | File dropzone accepts CSV files only | Pending | Try uploading .xlsx, verify rejection |
| 5.1.3 | Max file size enforced at 10MB | Pending | Upload 11MB file, verify rejection |
| 5.1.4 | File uploaded to Supabase Storage bucket | Pending | Upload file, verify in Storage |
| 5.1.5 | Unique file naming: `{tenant_id}/{timestamp}-{name}` | Pending | Upload file, check storage path |
| 5.1.6 | Progress indicator during upload with speed/ETA | Pending | Upload file, observe progress with speed |
| 5.1.7 | Clear error messages for failures | Pending | Force network error, verify message |
| 5.1.8 | Redirect to mapping if no mapping exists | Pending | First upload, verify redirect to mapping |
| 5.1.9 | Redirect to session if mapping exists | Pending | Second upload, verify redirect to session |
| 5.1.10 | Session list shows recent uploads | Pending | Upload file, verify appears in list |
| 5.1.11 | Audit log records upload event | Pending | Upload file, check audit_log table |
| 5.1.12 | Left nav shows "SIS Reconciliation" for admin L1/L2 only | Pending | Login as teacher, verify nav hidden |
| 5.1.13 | Auto-detect SIS type from filename patterns | Pending | Upload "skyward_export.csv", verify detection |
| 5.1.14 | Collapsible "What fields do I need?" section | Pending | Click to expand, verify field list shows |
| 5.1.15 | Required fields list with descriptions | Pending | Expand section, verify 8 required fields |
| 5.1.16 | Optional fields list (expandable) | Pending | Click "Show optional", verify 6 optional fields |
| 5.1.17 | Download Sample CSV button works | Pending | Click button, verify CSV downloads |
| 5.1.18 | Download Field List button works | Pending | Click button, verify list downloads |
| 5.1.19 | SIS guide buttons show for Skyward and Focus | Pending | Verify two guide buttons visible |
| 5.1.20 | SIS guide modal opens with step-by-step content | Pending | Click Skyward, verify modal with steps |
| 5.1.21 | SIS guide content loaded from database | Pending | Check sis_guides table, verify content renders |
| 5.1.22 | Download PDF button in guide modal | Pending | Click download, verify PDF generates |

---

## Tasks / Subtasks

### Task 1: Database Migration - Reconciliation Sessions

- [ ] 1.1 Create migration file `[timestamp]_daep_reconciliation_sessions.sql`
  - Create `daep_reconciliation_sessions` table
  - Fields: id, tenant_id, uploaded_by, upload_date, file_name, file_url, total_records, matched_count, discrepancy_count, new_in_sis_count, missing_from_sis_count, status, error_message, completed_at
  - Status enum: 'uploading', 'mapping_required', 'parsing', 'comparing', 'in_review', 'completed', 'failed'
- [ ] 1.2 Add indexes
  - `idx_recon_sessions_tenant` on (tenant_id)
  - `idx_recon_sessions_status` on (status)
  - `idx_recon_sessions_date` on (upload_date DESC)
- [ ] 1.3 Add RLS policies
  - Tenant isolation with active_tenant_id support
- [ ] 1.4 Add updated_at trigger

### Task 1b: Database Migration - SIS Guides (AC: 5.1.21)

- [ ] 1b.1 Create `sis_guides` table in same migration
  ```sql
  CREATE TABLE sis_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id), -- NULL = global template
    sis_name TEXT NOT NULL, -- 'Skyward', 'Focus', etc.
    title TEXT NOT NULL,
    overview TEXT, -- Markdown content
    steps JSONB NOT NULL, -- Array of step objects
    field_mapping_hints JSONB, -- SIS field → DAEP field suggestions
    pdf_url TEXT, -- Optional pre-generated PDF
    is_active BOOLEAN DEFAULT true,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] 1b.2 Add index on (sis_name, tenant_id)
- [ ] 1b.3 Add RLS policy - read access for authenticated users
- [ ] 1b.4 Seed initial Skyward and Focus guides with placeholder content

### Task 2: Supabase Storage Bucket Setup

- [ ] 2.1 Create `daep-uploads` bucket via Supabase Dashboard
  - Private bucket (signed URLs)
  - Max file size: 10MB
  - Allowed MIME types: text/csv, application/vnd.ms-excel, text/plain
- [ ] 2.2 Add RLS policies for storage bucket
  - Allow authenticated users to upload to their tenant folder
  - Allow read access for same tenant

### Task 3: Validation Schema

- [ ] 3.1 Add `CSVUploadSchema` to `lib/validation/schemas.ts`
  - File instance validation
  - Size check (≤ 10MB)
  - Type check (CSV)

### Task 4: Server Actions

- [ ] 4.1 Create `app/actions/daep/reconciliation.ts`
- [ ] 4.2 Implement `uploadReconciliationCSV(formData)`
  - Validate file type and size
  - Generate unique storage path
  - Upload to Supabase Storage
  - Create signed URL
  - Create reconciliation session record
  - Check if field mapping exists
  - Update status based on mapping existence
  - Log audit event
  - Return success with redirect path
- [ ] 4.3 Implement `getReconciliationSessions()`
  - Fetch recent sessions for tenant
  - Order by upload_date DESC
  - Limit to 20 sessions
- [ ] 4.4 Implement `getReconciliationSession(sessionId)`
  - Fetch single session with tenant check

### Task 5: UI Components

- [ ] 5.1 Create page at `app/daep/reconciliation/page.tsx`
  - Server component fetching sessions
  - Layout with title and description
- [ ] 5.2 Create `ReconciliationDashboard` component
  - Client component combining upload and session list
- [ ] 5.3 Create `CSVDropzone` component
  - Use `react-dropzone` for drag-and-drop
  - File type and size validation on client
  - Upload progress with speed (KB/s) and ETA display
  - Error display
  - Success handling with redirect
- [ ] 5.4 Create `SessionList` component
  - Display recent reconciliation sessions
  - Show status badges
  - Click to view session details
- [ ] 5.5 Create `SessionCard` component
  - Individual session display
  - Status, date, record counts
  - Summary of matched/discrepancies

### Task 6: Left Navigation Integration (AC: 5.1.12)

- [ ] 6.1 Add "SIS Reconciliation" to DAEP left nav
  - Route: `/daep/reconciliation`
  - Icon: FileSpreadsheet or similar
  - Position: After "Settings" or in admin section
- [ ] 6.2 Restrict visibility to daep_admin_l1 and daep_admin_l2
  - Use existing role-based nav filtering pattern
  - Hide from daep_teacher and other roles

### Task 6b: Field Requirements Section (AC: 5.1.14-5.1.18)

- [ ] 6b.1 Create `FieldRequirementsSection` component
  - Collapsible section with "What fields do I need?" header
  - Starts collapsed by default
  - Smooth expand/collapse animation
- [ ] 6b.2 Display required fields list (8 fields)
  - Field name, description, example format
  - Visual indicator (required badge)
- [ ] 6b.3 Display optional fields list (6 fields)
  - Initially hidden, "Show optional fields" toggle
  - Same format as required
- [ ] 6b.4 Create sample CSV file
  - Static file at `/public/downloads/daep-sample-export.csv`
  - Contains header row + 3 example data rows
  - All required + optional columns
- [ ] 6b.5 Create field list download
  - Markdown or PDF format
  - Lists all fields with descriptions and expected formats
- [ ] 6b.6 Wire up download buttons
  - Sample CSV: direct file download
  - Field List: generate or serve static file

### Task 6c: SIS Guide Components (AC: 5.1.19-5.1.22)

- [ ] 6c.1 Create `SISGuideButton` component
  - Button with SIS icon and name
  - Opens guide modal on click
- [ ] 6c.2 Create `SISGuideModal` component
  - Full modal with step-by-step walkthrough
  - Step navigation (Previous/Next)
  - Progress indicator (Step X of Y)
  - Screenshot placeholders
  - Download PDF button
- [ ] 6c.3 Create `getSISGuide(sisName)` server action
  - Fetch guide from `sis_guides` table
  - Fall back to global guide if no tenant-specific
  - Return steps array and metadata
- [ ] 6c.4 Create `generateGuidePDF(sisName)` server action
  - Generate PDF from guide content
  - Use existing PDF generation pattern or simple HTML-to-PDF
  - Return download URL
- [ ] 6c.5 Render guide steps with markdown support
  - Overview text
  - Step title and content
  - Screenshot placeholder areas

### Task 7: Auto-Detect SIS Type (AC: 5.1.13)

- [ ] 7.1 Create `detectSISFromFilename()` utility
  - Pattern matching for common SIS export filenames
  - Skyward: "skyward", "sky_", "skyw"
  - Focus: "focus", "fcs_"
  - PowerSchool: "powerschool", "ps_", "pschool"
  - Ascender: "ascender", "asc_"
  - Return detected SIS or null
- [ ] 7.2 Pass detected SIS to mapping page via URL param
  - `?session=xxx&detected_sis=Skyward`
- [ ] 7.3 Pre-select SIS dropdown if detected

### Task 8: Install Dependencies

- [ ] 8.1 Install `react-dropzone` if not present
  - `npm install react-dropzone`

### Task 10: Testing

- [ ] 10.1 Upload valid CSV file (< 10MB)
- [ ] 10.2 Reject non-CSV files (.xlsx, .pdf)
- [ ] 10.3 Reject files > 10MB
- [ ] 10.4 Verify progress indicator with speed/ETA
- [ ] 10.5 Verify session record created in database
- [ ] 10.6 Verify redirect to mapping if no mapping exists
- [ ] 10.7 Verify redirect to session if mapping exists
- [ ] 10.8 Verify audit log entry created
- [ ] 10.9 Verify left nav visible only to L1/L2 admins
- [ ] 10.10 Verify SIS auto-detection from filename
- [ ] 10.11 Verify field requirements section expands/collapses
- [ ] 10.12 Verify sample CSV downloads correctly
- [ ] 10.13 Verify field list downloads correctly
- [ ] 10.14 Verify Skyward guide modal opens with steps
- [ ] 10.15 Verify Focus guide modal opens with steps
- [ ] 10.16 Verify guide PDF download works
- [ ] 10.17 Verify TypeScript compilation
- [ ] 10.18 Verify with Playwright MCP - full upload flow

---

## Dev Notes

### Storage Path Format

```
{tenant_id}/{timestamp}-{sanitized_filename}

Example:
tenant_abc123/1702345678901-students_dec_2024.csv
```

### Session Status Flow

```
uploading → mapping_required → parsing → comparing → in_review → completed
    ↓                                       ↓
  failed                                  failed
```

### File Type Detection

```typescript
const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];

// Also check file extension as fallback
const isCSV = ALLOWED_TYPES.includes(file.type) || file.name.endsWith('.csv');
```

### Signed URL Duration

Generate 7-day signed URLs for file access. Sessions older than 7 days will need URL regeneration (future enhancement).

### Upload Progress with Speed/ETA

```typescript
// Track upload progress with timing
const [uploadState, setUploadState] = useState({
  progress: 0,
  bytesUploaded: 0,
  totalBytes: 0,
  startTime: 0,
  speed: 0, // bytes per second
  eta: 0,   // seconds remaining
});

// Calculate speed and ETA during upload
const updateProgress = (loaded: number, total: number) => {
  const elapsed = (Date.now() - uploadState.startTime) / 1000;
  const speed = loaded / elapsed;
  const remaining = total - loaded;
  const eta = remaining / speed;

  setUploadState({
    progress: (loaded / total) * 100,
    bytesUploaded: loaded,
    totalBytes: total,
    speed,
    eta,
  });
};

// Display format
const formatSpeed = (bps: number) => {
  if (bps > 1024 * 1024) return `${(bps / 1024 / 1024).toFixed(1)} MB/s`;
  return `${(bps / 1024).toFixed(1)} KB/s`;
};
```

### SIS Auto-Detection Patterns

```typescript
const SIS_PATTERNS: Record<string, RegExp[]> = {
  Skyward: [/skyward/i, /^sky_/i, /^skyw/i],
  Focus: [/focus/i, /^fcs_/i],
  PowerSchool: [/powerschool/i, /^ps_/i, /pschool/i],
  Ascender: [/ascender/i, /^asc_/i],
};

function detectSISFromFilename(filename: string): string | null {
  for (const [sis, patterns] of Object.entries(SIS_PATTERNS)) {
    if (patterns.some(p => p.test(filename))) {
      return sis;
    }
  }
  return null;
}
```

### Left Nav Role Restriction

Only show "SIS Reconciliation" nav item for:
- `daep_admin_l1`
- `daep_admin_l2`

Hidden from:
- `daep_teacher`
- `district_admin` (unless also L1/L2)
- Other roles

### Sample CSV Content

```csv
student_id,first_name,last_name,incident_number,start_date,days_assigned,offense_code,home_campus,parent_email,guardian_phone,grade_level,assigning_campus,placement_reason,mandatory_placement
12345,John,Smith,INC-2024-001,2024-12-01,30,26,Central Middle School,parent@email.com,555-123-4567,7,Central Middle School,Fighting - mutual combat,Yes
12346,Jane,Doe,INC-2024-002,2024-12-05,15,34,Northside High School,jane.parent@email.com,555-234-5678,10,Northside High School,Tobacco possession,No
12347,Bob,Johnson,INC-2024-003,2024-12-10,45,21,Eastside Elementary,bob.guardian@email.com,555-345-6789,5,Eastside Elementary,Assault on staff,Yes
```

### SIS Guide Steps Structure (JSONB)

```typescript
interface SISGuideStep {
  order: number;
  title: string;
  content: string; // Markdown
  screenshot_url: string | null;
  screenshot_placeholder: string; // Description for placeholder
  field_hints?: Record<string, string>; // SIS field name → tip
}

// Example Skyward guide steps
const skywardSteps: SISGuideStep[] = [
  {
    order: 1,
    title: "Open Data Mining",
    content: "Navigate to **Students → Student Data Mining** from the main menu.",
    screenshot_url: null,
    screenshot_placeholder: "Screenshot: Skyward main menu with Data Mining highlighted"
  },
  {
    order: 2,
    title: "Create New Report",
    content: "Click **Add** to create a new report. Enter a name like \"DAEP Reconciliation Export\".",
    screenshot_url: null,
    screenshot_placeholder: "Screenshot: New report dialog with name field"
  },
  {
    order: 3,
    title: "Select Student Fields",
    content: "Add these fields from the Student table:\n- Student ID (maps to `student_id`)\n- First Name (maps to `first_name`)\n- Last Name (maps to `last_name`)",
    screenshot_url: null,
    screenshot_placeholder: "Screenshot: Field selection with student fields highlighted"
  },
  {
    order: 4,
    title: "Add Discipline Fields",
    content: "Add these fields from Discipline:\n- Incident Number\n- Offense Code\n- Start Date\n- Days Assigned",
    screenshot_url: null,
    screenshot_placeholder: "Screenshot: Discipline fields selection"
  },
  {
    order: 5,
    title: "Export to CSV",
    content: "Click the **Excel** icon to export. Save as CSV format.",
    screenshot_url: null,
    screenshot_placeholder: "Screenshot: Export button and format selection"
  }
];
```

### Focus Guide Steps (Placeholder)

```typescript
const focusSteps: SISGuideStep[] = [
  {
    order: 1,
    title: "Open Ad Hoc Reports",
    content: "Navigate to **Reports → Ad Hoc Reports** from the main menu.",
    screenshot_url: null,
    screenshot_placeholder: "Screenshot: Focus main menu with Ad Hoc Reports highlighted"
  },
  {
    order: 2,
    title: "Create New Report",
    content: "Click **Create New Report**. Select the Discipline data area.",
    screenshot_url: null,
    screenshot_placeholder: "Screenshot: New report with data area selection"
  },
  {
    order: 3,
    title: "Drag Required Fields",
    content: "Drag these fields to your report:\n- Student ID, First Name, Last Name\n- Incident Number, Start Date, Days Assigned\n- Offense Code, Home Campus",
    screenshot_url: null,
    screenshot_placeholder: "Screenshot: Drag-and-drop field builder"
  },
  {
    order: 4,
    title: "Apply Filters",
    content: "Filter to show only DAEP placements for your date range.",
    screenshot_url: null,
    screenshot_placeholder: "Screenshot: Filter configuration"
  },
  {
    order: 5,
    title: "Export to CSV",
    content: "Click **Export** and select CSV format.",
    screenshot_url: null,
    screenshot_placeholder: "Screenshot: Export options"
  }
];
```

### Future: Admin Guide Editing UI

The admin UI for editing SIS guides will be added in a future story. For now:
- Guides are seeded via migration
- Screenshots can be added directly to database or storage
- Content updates require database migration or direct edit

### Watch Out For

1. **Large files** - 10MB CSV can have 100k+ rows; parsing happens in Story 5-3
2. **BOM characters** - Windows Excel adds BOM to UTF-8 CSVs; handle in parsing
3. **Network interruptions** - Show clear retry option on failure
4. **Duplicate uploads** - Allow multiple uploads; each creates new session
5. **PDF generation** - May need server-side library (puppeteer, react-pdf, or html-pdf)
6. **Guide screenshots** - Use placeholder text until real screenshots provided

---

## Edge Cases

| Case | Handling |
|------|----------|
| Network interruption | Show error message with retry button |
| Invalid CSV content | Detected in Story 5-3 (parsing), not here |
| Storage quota exceeded | Return clear error, suggest contacting support |
| Same file uploaded twice | Allow - each upload creates new session |
| Session already in progress | Allow new upload, show warning |

---

## Out of Scope

| Item | Story |
|------|-------|
| Field mapping configuration | Story 5-2 |
| CSV parsing and validation | Story 5-3 |
| Record comparison logic | Story 5-4 |
| Discrepancy display UI | Story 5-6 |
| Resolution actions | Story 5-7 |
| Admin UI for editing SIS guides | Future story |
| SIS guides for PowerSchool, Ascender | Future (start with Skyward, Focus) |

---

## Dependencies

- Epic 1 (Core Schema) - **DONE**
- Epic 2 (Placements exist) - **DONE**
- Story 5-2 (Field Mapping) - For first-time setup flow

---

## Definition of Done

- [ ] Page exists at `/daep/reconciliation`
- [ ] Left nav shows "SIS Reconciliation" for daep_admin_l1 and daep_admin_l2 only
- [ ] Dropzone accepts only CSV files
- [ ] Files > 10MB are rejected with clear message
- [ ] Upload shows progress with speed (KB/s) and ETA
- [ ] File stored in Supabase Storage with unique path
- [ ] Reconciliation session record created in database
- [ ] Auto-detect SIS type from filename patterns
- [ ] Redirect to mapping if no mapping exists for tenant
- [ ] Redirect to session if mapping exists
- [ ] Recent sessions displayed in list
- [ ] Audit log records upload event
- [ ] "What fields do I need?" section expands/collapses
- [ ] Required fields (8) and optional fields (6) displayed
- [ ] Sample CSV download works
- [ ] Field list download works
- [ ] Skyward guide modal opens with step-by-step instructions
- [ ] Focus guide modal opens with step-by-step instructions
- [ ] Guide content loaded from database (`sis_guides` table)
- [ ] PDF download button in guide modal works
- [ ] TypeScript compiles without errors
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-story-5-1.md`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## References

- [Source: docs/reference/epics-part2.md#Story-5.1] - Epic definition
- [Source: docs/sprint-artifacts/daep/tech-spec-story-5-1.md] - Technical specification
- [Source: FR52] - CSV Upload functional requirement
