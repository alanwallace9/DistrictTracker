# Tech Spec: Story 5-2 - Field Mapping Setup

**Epic:** 5 - CSV Reconciliation
**Points:** 3
**Status:** Drafted
**FRs:** FR53
**Dependencies:** Story 5-1 (CSV Upload)

---

## Purpose

Enable DAEP administrators to configure a one-time field mapping between their SIS CSV export columns and DAEP system fields. This mapping is saved and reused for all future CSV uploads, eliminating the need for repeated configuration.

---

## Acceptance Criteria Checklist

| AC | Description | Required Implementation |
|----|-------------|------------------------|
| 5.2.1 | Show mapping UI if no mapping exists | Redirect from upload when tenant has no saved mapping |
| 5.2.2 | Extract CSV column headers | Parse first row of uploaded file to get headers |
| 5.2.3 | Two-column mapping interface | SIS field dropdown → DAEP field (fixed list) |
| 5.2.4 | Required DAEP fields | student_id, first_name, last_name, incident_number, start_date, days_assigned, offense_code, home_campus |
| 5.2.5 | Optional DAEP fields | parent_email, guardian_phone, grade_level, assigning_campus |
| 5.2.6 | Save mapping to database | Store in `daep_csv_field_mappings` table |
| 5.2.7 | Include SIS name | Dropdown for Skyward, Focus, PowerSchool, Other |
| 5.2.8 | Mapping reused for future uploads | Once saved, all future uploads use this mapping |

---

## Database Tables

### `daep_csv_field_mappings`

```sql
CREATE TABLE daep_csv_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sis_name TEXT NOT NULL CHECK (sis_name IN ('Skyward', 'Focus', 'PowerSchool', 'Ascender', 'Other')),
  sis_name_other TEXT, -- If sis_name = 'Other', store custom name
  field_mappings JSONB NOT NULL,
  -- Example: {
  --   "student_id": "StudentNumber",
  --   "first_name": "FirstName",
  --   "last_name": "LastName",
  --   "incident_number": "IncidentID",
  --   "start_date": "PlacementStartDate",
  --   "days_assigned": "DaysAssigned",
  --   "offense_code": "OffenseCode",
  --   "home_campus": "HomeCampusName"
  -- }
  sample_headers TEXT[], -- Store CSV headers for reference
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id) -- One mapping per tenant
);

CREATE INDEX idx_csv_mappings_tenant ON daep_csv_field_mappings(tenant_id);

-- RLS
ALTER TABLE daep_csv_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daep_csv_field_mappings_tenant_isolation"
  ON daep_csv_field_mappings
  FOR ALL
  USING (
    tenant_id IN (
      SELECT COALESCE(active_tenant_id, tenant_id)
      FROM user_profiles
      WHERE id = auth.uid()::text
    )
  );
```

---

## DAEP Field Definitions

### Required Fields

| DAEP Field | Description | Expected Format |
|------------|-------------|-----------------|
| `student_id` | Unique student identifier | String (e.g., "12345", "S00012345") |
| `first_name` | Student's first name | String |
| `last_name` | Student's last name | String |
| `incident_number` | Unique incident identifier from SIS | String (e.g., "INC-2024-001") |
| `start_date` | DAEP placement start date | Date (MM/DD/YYYY, YYYY-MM-DD, M/D/YY) |
| `days_assigned` | Number of days assigned to DAEP | Integer (1-365) |
| `offense_code` | PEIMS discipline code | String (e.g., "26", "34") |
| `home_campus` | Student's home campus name or ID | String |

### Optional Fields

| DAEP Field | Description | Expected Format |
|------------|-------------|-----------------|
| `parent_email` | Parent/guardian email address | Email string |
| `guardian_phone` | Parent/guardian phone number | Phone string |
| `grade_level` | Student's grade level | Integer (1-12) or String |
| `assigning_campus` | Campus that assigned placement | String |
| `placement_reason` | Reason for placement | String (long text) |
| `mandatory_placement` | Whether placement is mandatory | Boolean or "Yes"/"No" |

---

## Server Actions

### File: `app/actions/daep/reconciliation.ts`

#### 1. `extractCSVHeaders(sessionId: string)`

**Purpose:** Extract column headers from uploaded CSV

```typescript
export async function extractCSVHeaders(sessionId: string) {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get session to find file URL
  const { data: session } = await supabase
    .from('daep_reconciliation_sessions')
    .select('file_url, file_name')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single();

  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  // Download file content (first 5KB should be enough for headers)
  const response = await fetch(session.file_url);
  const text = await response.text();
  const firstLine = text.split('\n')[0];

  // Parse headers using PapaParse
  const Papa = await import('papaparse');
  const parsed = Papa.parse(firstLine, { header: false });
  const headers = parsed.data[0] as string[];

  // Clean headers (trim whitespace, handle BOM)
  const cleanHeaders = headers.map(h =>
    h.replace(/^\uFEFF/, '').trim()
  ).filter(h => h.length > 0);

  return {
    success: true,
    headers: cleanHeaders,
    fileName: session.file_name,
  };
}
```

#### 2. `getFieldMapping()`

**Purpose:** Get existing field mapping for tenant

```typescript
export async function getFieldMapping() {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_csv_field_mappings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('[DAEP Mapping] Error fetching mapping:', error);
    return null;
  }

  return data;
}
```

#### 3. `saveFieldMapping(input: FieldMappingInput)`

**Purpose:** Save or update field mapping

```typescript
export interface FieldMappingInput {
  sisName: 'Skyward' | 'Focus' | 'PowerSchool' | 'Ascender' | 'Other';
  sisNameOther?: string;
  mappings: Record<string, string>; // daepField -> csvColumn
  sampleHeaders: string[];
  sessionId?: string; // If coming from upload flow
}

export async function saveFieldMapping(input: FieldMappingInput) {
  const supabase = await createServerClient();
  const user = await currentUser();
  const tenantId = await getTenantId();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate required fields are mapped
  const requiredFields = [
    'student_id', 'first_name', 'last_name', 'incident_number',
    'start_date', 'days_assigned', 'offense_code', 'home_campus'
  ];

  const missingFields = requiredFields.filter(f => !input.mappings[f]);
  if (missingFields.length > 0) {
    return {
      success: false,
      error: `Missing required mappings: ${missingFields.join(', ')}`,
    };
  }

  // Upsert mapping (one per tenant)
  const { data, error } = await supabase
    .from('daep_csv_field_mappings')
    .upsert({
      tenant_id: tenantId,
      sis_name: input.sisName,
      sis_name_other: input.sisNameOther,
      field_mappings: input.mappings,
      sample_headers: input.sampleHeaders,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'tenant_id',
    })
    .select()
    .single();

  if (error) {
    console.error('[DAEP Mapping] Save failed:', error);
    return { success: false, error: 'Failed to save field mapping' };
  }

  // Log audit event
  await logAuditEvent({
    eventType: 'reconciliation.mapping_saved',
    module: 'daep_management',
    actorId: user.id,
    actorEmail: user.emailAddresses[0]?.emailAddress,
    action: 'Saved CSV field mapping',
    details: { sisName: input.sisName, fieldCount: Object.keys(input.mappings).length },
  });

  // If session provided, update its status and redirect
  if (input.sessionId) {
    await supabase
      .from('daep_reconciliation_sessions')
      .update({ status: 'parsing' })
      .eq('id', input.sessionId)
      .eq('tenant_id', tenantId);
  }

  revalidatePath('/daep/settings/csv-mapping');
  revalidatePath('/daep/reconciliation');

  return {
    success: true,
    mappingId: data.id,
    redirectTo: input.sessionId
      ? `/daep/reconciliation/${input.sessionId}`
      : '/daep/settings/csv-mapping',
  };
}
```

---

## Validation Schema

```typescript
// lib/validation/schemas.ts

export const FieldMappingSchema = z.object({
  sisName: z.enum(['Skyward', 'Focus', 'PowerSchool', 'Ascender', 'Other']),
  sisNameOther: z.string().max(100).optional(),
  mappings: z.record(z.string(), z.string()).refine(
    (mappings) => {
      const required = ['student_id', 'first_name', 'last_name', 'incident_number',
                        'start_date', 'days_assigned', 'offense_code', 'home_campus'];
      return required.every(field => mappings[field] && mappings[field].length > 0);
    },
    { message: 'All required fields must be mapped' }
  ),
  sampleHeaders: z.array(z.string()),
  sessionId: z.string().uuid().optional(),
});
```

---

## UI Component Structure

```
/app/daep/settings/csv-mapping/
├── page.tsx                    # Server component - settings page
└── components/
    ├── field-mapping-form.tsx  # Client - the mapping interface
    ├── mapping-row.tsx         # Client - single field mapping row
    ├── sis-selector.tsx        # Client - SIS type dropdown
    └── preview-table.tsx       # Client - show sample data
```

### Page Component

```typescript
// app/daep/settings/csv-mapping/page.tsx
import { getFieldMapping, extractCSVHeaders } from '@/app/actions/daep/reconciliation';
import { FieldMappingForm } from './components/field-mapping-form';

export default async function CSVMappingPage({
  searchParams,
}: {
  searchParams: { session?: string };
}) {
  const existingMapping = await getFieldMapping();

  // If coming from upload flow, extract headers from that session
  let csvHeaders: string[] = [];
  if (searchParams.session) {
    const result = await extractCSVHeaders(searchParams.session);
    if (result.success) {
      csvHeaders = result.headers;
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CSV Field Mapping</h1>
        <p className="text-muted-foreground">
          Configure how your SIS export columns map to DAEP fields
        </p>
      </div>

      <FieldMappingForm
        existingMapping={existingMapping}
        csvHeaders={csvHeaders}
        sessionId={searchParams.session}
      />
    </div>
  );
}
```

### Field Mapping Form Component

```typescript
// app/daep/settings/csv-mapping/components/field-mapping-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { saveFieldMapping } from '@/app/actions/daep/reconciliation';
import { toast } from 'sonner';

const DAEP_FIELDS = {
  required: [
    { key: 'student_id', label: 'Student ID', description: 'Unique student identifier' },
    { key: 'first_name', label: 'First Name', description: 'Student first name' },
    { key: 'last_name', label: 'Last Name', description: 'Student last name' },
    { key: 'incident_number', label: 'Incident Number', description: 'Unique incident ID from SIS' },
    { key: 'start_date', label: 'Start Date', description: 'Placement start date' },
    { key: 'days_assigned', label: 'Days Assigned', description: 'Number of DAEP days' },
    { key: 'offense_code', label: 'Offense Code', description: 'PEIMS discipline code' },
    { key: 'home_campus', label: 'Home Campus', description: 'Student home campus' },
  ],
  optional: [
    { key: 'parent_email', label: 'Parent Email', description: 'Guardian email address' },
    { key: 'guardian_phone', label: 'Guardian Phone', description: 'Guardian phone number' },
    { key: 'grade_level', label: 'Grade Level', description: 'Student grade (1-12)' },
    { key: 'assigning_campus', label: 'Assigning Campus', description: 'Campus that assigned placement' },
    { key: 'placement_reason', label: 'Placement Reason', description: 'Reason for placement' },
    { key: 'mandatory_placement', label: 'Mandatory', description: 'Is placement mandatory?' },
  ],
};

const SIS_OPTIONS = [
  { value: 'Skyward', label: 'Skyward' },
  { value: 'Focus', label: 'Focus' },
  { value: 'PowerSchool', label: 'PowerSchool' },
  { value: 'Ascender', label: 'Ascender' },
  { value: 'Other', label: 'Other' },
];

interface Props {
  existingMapping: any | null;
  csvHeaders: string[];
  sessionId?: string;
}

export function FieldMappingForm({ existingMapping, csvHeaders, sessionId }: Props) {
  const router = useRouter();
  const [sisName, setSisName] = useState(existingMapping?.sis_name || '');
  const [sisNameOther, setSisNameOther] = useState(existingMapping?.sis_name_other || '');
  const [mappings, setMappings] = useState<Record<string, string>>(
    existingMapping?.field_mappings || {}
  );
  const [saving, setSaving] = useState(false);

  // Use existing headers or passed headers
  const headers = csvHeaders.length > 0
    ? csvHeaders
    : existingMapping?.sample_headers || [];

  const handleMappingChange = (daepField: string, csvColumn: string) => {
    setMappings(prev => ({
      ...prev,
      [daepField]: csvColumn,
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);

    const result = await saveFieldMapping({
      sisName: sisName as any,
      sisNameOther: sisName === 'Other' ? sisNameOther : undefined,
      mappings,
      sampleHeaders: headers,
      sessionId,
    });

    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success('Field mapping saved successfully');
    router.push(result.redirectTo);
  };

  const allRequiredMapped = DAEP_FIELDS.required.every(
    field => mappings[field.key] && mappings[field.key].length > 0
  );

  return (
    <div className="space-y-6">
      {/* SIS Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Student Information System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>SIS Provider</Label>
              <Select value={sisName} onValueChange={setSisName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your SIS" />
                </SelectTrigger>
                <SelectContent>
                  {SIS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sisName === 'Other' && (
              <div className="space-y-2">
                <Label>SIS Name</Label>
                <Input
                  value={sisNameOther}
                  onChange={e => setSisNameOther(e.target.value)}
                  placeholder="Enter your SIS name"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Required Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Required Fields
            <Badge variant="destructive">Must map all</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAEP_FIELDS.required.map(field => (
              <div key={field.key} className="grid gap-4 md:grid-cols-3 items-center">
                <div>
                  <p className="font-medium">{field.label}</p>
                  <p className="text-sm text-muted-foreground">{field.description}</p>
                </div>
                <div className="text-center text-muted-foreground">→</div>
                <Select
                  value={mappings[field.key] || ''}
                  onValueChange={v => handleMappingChange(field.key, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select CSV column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optional Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Optional Fields
            <Badge variant="secondary">Map if available</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAEP_FIELDS.optional.map(field => (
              <div key={field.key} className="grid gap-4 md:grid-cols-3 items-center">
                <div>
                  <p className="font-medium">{field.label}</p>
                  <p className="text-sm text-muted-foreground">{field.description}</p>
                </div>
                <div className="text-center text-muted-foreground">→</div>
                <Select
                  value={mappings[field.key] || ''}
                  onValueChange={v => handleMappingChange(field.key, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select CSV column (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- Not mapped --</SelectItem>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!sisName || !allRequiredMapped || saving}
        >
          {saving ? 'Saving...' : 'Save Mapping'}
        </Button>
      </div>
    </div>
  );
}
```

---

## Migration File

```sql
-- supabase/migrations/20251211_daep_csv_field_mappings.sql

-- Create field mappings table
CREATE TABLE IF NOT EXISTS daep_csv_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sis_name TEXT NOT NULL CHECK (sis_name IN ('Skyward', 'Focus', 'PowerSchool', 'Ascender', 'Other')),
  sis_name_other TEXT,
  field_mappings JSONB NOT NULL,
  sample_headers TEXT[],
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- Indexes
CREATE INDEX idx_csv_mappings_tenant ON daep_csv_field_mappings(tenant_id);

-- RLS
ALTER TABLE daep_csv_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daep_csv_field_mappings_tenant_isolation"
  ON daep_csv_field_mappings
  FOR ALL
  USING (
    tenant_id IN (
      SELECT COALESCE(active_tenant_id, tenant_id)
      FROM user_profiles
      WHERE id = auth.uid()::text
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_daep_csv_field_mappings_updated_at
  BEFORE UPDATE ON daep_csv_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Audit Events

| Event | When | Details |
|-------|------|---------|
| `reconciliation.mapping_saved` | After saving mapping | sisName, fieldCount |
| `reconciliation.mapping_updated` | When existing mapping is changed | sisName, changedFields |

---

## Edge Cases

1. **CSV with BOM (Byte Order Mark):** Strip BOM from first header
2. **Headers with special characters:** Preserve original, display cleaned version
3. **Duplicate header names in CSV:** Show warning, allow mapping
4. **Empty headers in CSV:** Filter out empty columns
5. **Very long header names:** Truncate display, show full on hover
6. **Tenant already has mapping:** Show existing, allow edit/override

---

## Quick Wins Included

### 1. Smart Auto-Suggest Matching

Pre-fill field mappings based on common column name patterns:

```typescript
const FIELD_PATTERNS: Record<string, string[]> = {
  student_id: ['studentid', 'student_id', 'studentnumber', 'student_number', 'id', 'pupilid', 'stuid'],
  first_name: ['firstname', 'first_name', 'fname', 'first', 'givenname'],
  last_name: ['lastname', 'last_name', 'lname', 'last', 'surname', 'familyname'],
  incident_number: ['incidentid', 'incident_id', 'incidentnumber', 'incident_number', 'incident'],
  start_date: ['startdate', 'start_date', 'placementstart', 'placement_start', 'begindate'],
  days_assigned: ['daysassigned', 'days_assigned', 'days', 'numdays', 'assigneddays'],
  offense_code: ['offensecode', 'offense_code', 'offense', 'disciplinecode', 'peimscode'],
  home_campus: ['homecampus', 'home_campus', 'campus', 'school', 'homeschool'],
  parent_email: ['parentemail', 'parent_email', 'guardianemail', 'email'],
  guardian_phone: ['guardianphone', 'phone', 'parentphone', 'homephone'],
  grade_level: ['gradelevel', 'grade_level', 'grade', 'gradelvl'],
};

function autoSuggestMappings(csvHeaders: string[]): Record<string, string> {
  const suggestions: Record<string, string> = {};
  for (const [daepField, patterns] of Object.entries(FIELD_PATTERNS)) {
    const match = csvHeaders.find(header => {
      const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      return patterns.some(p => normalized.includes(p) || p.includes(normalized));
    });
    if (match) suggestions[daepField] = match;
  }
  return suggestions;
}
```

Show "Suggested" badge on auto-matched fields:

```typescript
{isSuggested && (
  <Badge variant="outline" className="ml-2 text-xs">
    Suggested
  </Badge>
)}
```

### 2. Sample Data Preview

Show first 3 values from selected column to help verify correct mapping:

```typescript
// Fetch headers AND sample data (first 3 rows)
export async function extractCSVHeadersAndSample(sessionId: string) {
  // ... fetch file content ...
  const lines = text.split('\n').slice(0, 4); // header + 3 data rows
  const Papa = await import('papaparse');
  const parsed = Papa.parse(lines.join('\n'), { header: true });

  return {
    headers: Object.keys(parsed.data[0] || {}),
    sampleData: parsed.data.slice(0, 3) as Record<string, string>[],
  };
}

// In mapping row component
<div className="text-xs text-muted-foreground mt-1">
  Sample: {sampleData.map(row => row[selectedColumn]).filter(Boolean).slice(0, 3).join(', ')}
</div>
```

### 3. Pre-Select SIS from Detection

Accept `detected_sis` URL param from upload page:

```typescript
// In page.tsx
export default async function CSVMappingPage({
  searchParams,
}: {
  searchParams: { session?: string; detected_sis?: string };
}) {
  // Pass detected_sis to form for pre-selection
  return (
    <FieldMappingForm
      detectedSIS={searchParams.detected_sis}
      // ...
    />
  );
}

// In form component
const [sisName, setSisName] = useState(
  existingMapping?.sis_name || detectedSIS || ''
);
```

---

## Testing Checklist

- [ ] Extract headers from uploaded CSV
- [ ] Extract sample data (first 3 rows) from CSV
- [ ] Show mapping form with required/optional sections
- [ ] Auto-suggest mappings based on column names
- [ ] Show "Suggested" badge on auto-matched fields
- [ ] Show sample data preview for each mapped column
- [ ] Pre-select SIS if detected from filename
- [ ] Validate all required fields mapped before save
- [ ] Save mapping successfully
- [ ] Redirect to reconciliation session if sessionId provided
- [ ] Load existing mapping for editing
- [ ] Handle CSV with different encodings (UTF-8, Windows-1252)
- [ ] SIS "Other" option shows custom name input
- [ ] Audit log records mapping save
