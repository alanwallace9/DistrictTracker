# Tech Spec: Story 5-1 - CSV Upload

**Epic:** 5 - CSV Reconciliation
**Points:** 3
**Status:** Drafted
**FRs:** FR52
**Dependencies:** Epic 1 (schema), Epic 2 (placements exist)

---

## Purpose

Enable DAEP administrators to upload CSV files exported from their district SIS (Student Information System) as the first step in the banking-style reconciliation workflow. This is the entry point for the core differentiator feature.

---

## Acceptance Criteria Checklist

| AC | Description | Required Implementation |
|----|-------------|------------------------|
| 5.1.1 | Reconciliation page exists | Page at `/daep/reconciliation` with upload interface |
| 5.1.2 | File dropzone accepts CSV only | Drag-and-drop zone with file type validation |
| 5.1.3 | Max file size 10MB | Client + server validation with clear error message |
| 5.1.4 | Upload to Supabase Storage | Files stored in `daep-uploads` bucket |
| 5.1.5 | Unique file naming | Format: `{tenant_id}/{timestamp}-{original_name}` |
| 5.1.6 | Progress indicator | Visual progress during upload |
| 5.1.7 | Error handling | Clear messages for invalid type, size exceeded, upload failed |
| 5.1.8 | Proceed to mapping or parsing | After upload, check if field mapping exists; route accordingly |

---

## Database Tables

### New Table: `daep_reconciliation_sessions`

```sql
CREATE TABLE daep_reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  uploaded_by TEXT NOT NULL, -- Clerk user_id
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  total_records INT DEFAULT 0,
  matched_count INT DEFAULT 0,
  discrepancy_count INT DEFAULT 0,
  new_in_sis_count INT DEFAULT 0,
  missing_from_sis_count INT DEFAULT 0,
  status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'mapping_required', 'parsing', 'comparing', 'in_review', 'completed', 'failed')),
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recon_sessions_tenant ON daep_reconciliation_sessions(tenant_id);
CREATE INDEX idx_recon_sessions_status ON daep_reconciliation_sessions(status);
CREATE INDEX idx_recon_sessions_date ON daep_reconciliation_sessions(upload_date DESC);

-- RLS Policy
ALTER TABLE daep_reconciliation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for reconciliation sessions"
  ON daep_reconciliation_sessions
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true));
```

### Supabase Storage Bucket

```sql
-- Create bucket via Supabase Dashboard or API
-- Bucket name: daep-uploads
-- Public: false (signed URLs for access)
-- Max file size: 10MB
-- Allowed MIME types: text/csv, application/vnd.ms-excel, text/plain
```

---

## Server Actions

### File: `app/actions/daep/reconciliation.ts`

#### 1. `uploadReconciliationCSV(formData: FormData)`

**Purpose:** Upload CSV file and create reconciliation session

```typescript
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { getTenantId } from '@/lib/tenant';
import { logAuditEvent } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];

export async function uploadReconciliationCSV(formData: FormData) {
  const supabase = await createServerClient();
  const user = await currentUser();
  const tenantId = await getTenantId();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const file = formData.get('file') as File;

  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.csv')) {
    return { success: false, error: 'Invalid file type. Please upload a CSV file.' };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File too large. Maximum size is 10MB.' };
  }

  // Generate unique filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${tenantId}/${timestamp}-${safeName}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('daep-uploads')
    .upload(storagePath, file, {
      contentType: 'text/csv',
      upsert: false,
    });

  if (uploadError) {
    console.error('[DAEP Reconciliation] Upload failed:', uploadError);
    return { success: false, error: 'Failed to upload file. Please try again.' };
  }

  // Get signed URL for future access
  const { data: urlData } = await supabase.storage
    .from('daep-uploads')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

  // Create reconciliation session record
  const { data: session, error: sessionError } = await supabase
    .from('daep_reconciliation_sessions')
    .insert({
      tenant_id: tenantId,
      uploaded_by: user.id,
      file_name: file.name,
      file_url: urlData?.signedUrl || storagePath,
      status: 'uploading',
    })
    .select()
    .single();

  if (sessionError) {
    console.error('[DAEP Reconciliation] Session creation failed:', sessionError);
    // Attempt to delete uploaded file
    await supabase.storage.from('daep-uploads').remove([storagePath]);
    return { success: false, error: 'Failed to create reconciliation session.' };
  }

  // Log audit event
  await logAuditEvent({
    eventType: 'reconciliation.session_created',
    module: 'daep_management',
    actorId: user.id,
    actorEmail: user.emailAddresses[0]?.emailAddress,
    targetId: session.id,
    action: 'Created reconciliation session',
    details: { fileName: file.name, fileSize: file.size },
  });

  // Check if field mapping exists for this tenant
  const { data: mapping } = await supabase
    .from('daep_csv_field_mappings')
    .select('id')
    .eq('tenant_id', tenantId)
    .single();

  // Update session status based on mapping existence
  const nextStatus = mapping ? 'parsing' : 'mapping_required';
  await supabase
    .from('daep_reconciliation_sessions')
    .update({ status: nextStatus })
    .eq('id', session.id);

  revalidatePath('/daep/reconciliation');

  return {
    success: true,
    sessionId: session.id,
    requiresMapping: !mapping,
    redirectTo: mapping
      ? `/daep/reconciliation/${session.id}`
      : `/daep/settings/csv-mapping?session=${session.id}`,
  };
}
```

#### 2. `getReconciliationSessions()`

**Purpose:** List all reconciliation sessions for the tenant

```typescript
export async function getReconciliationSessions() {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_reconciliation_sessions')
    .select(`
      id,
      file_name,
      upload_date,
      total_records,
      matched_count,
      discrepancy_count,
      new_in_sis_count,
      missing_from_sis_count,
      status,
      completed_at
    `)
    .eq('tenant_id', tenantId)
    .order('upload_date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[DAEP Reconciliation] Failed to fetch sessions:', error);
    return [];
  }

  return data;
}
```

#### 3. `getReconciliationSession(sessionId: string)`

**Purpose:** Get single session details

```typescript
export async function getReconciliationSession(sessionId: string) {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_reconciliation_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    console.error('[DAEP Reconciliation] Failed to fetch session:', error);
    return null;
  }

  return data;
}
```

---

## Validation Schema

```typescript
// lib/validation/schemas.ts

export const CSVUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      file => file.type === 'text/csv' ||
              file.type === 'application/vnd.ms-excel' ||
              file.name.endsWith('.csv'),
      'File must be a CSV'
    ),
});
```

---

## UI Component Structure

```
/app/daep/reconciliation/
├── page.tsx                      # Server component - main page
└── components/
    ├── reconciliation-dashboard.tsx  # Client - session list + upload
    ├── csv-dropzone.tsx              # Client - drag-and-drop upload
    ├── session-list.tsx              # Server - previous sessions
    ├── session-card.tsx              # Server - individual session
    └── upload-progress.tsx           # Client - progress indicator
```

### Page Component

```typescript
// app/daep/reconciliation/page.tsx
import { getReconciliationSessions } from '@/app/actions/daep/reconciliation';
import { ReconciliationDashboard } from './components/reconciliation-dashboard';

export default async function ReconciliationPage() {
  const sessions = await getReconciliationSessions();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">SIS Reconciliation</h1>
          <p className="text-muted-foreground">
            Compare your SIS data with DAEP records
          </p>
        </div>
      </div>

      <ReconciliationDashboard sessions={sessions} />
    </div>
  );
}
```

### CSV Dropzone Component

```typescript
// app/daep/reconciliation/components/csv-dropzone.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { uploadReconciliationCSV } from '@/app/actions/daep/reconciliation';
import { toast } from 'sonner';

export function CSVDropzone() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(30);
      const result = await uploadReconciliationCSV(formData);
      setProgress(90);

      if (!result.success) {
        setError(result.error || 'Upload failed');
        toast.error(result.error || 'Upload failed');
        return;
      }

      setProgress(100);
      toast.success('File uploaded successfully');

      // Redirect based on whether mapping is required
      router.push(result.redirectTo);
    } catch (err) {
      console.error('[CSV Upload] Error:', err);
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [router]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
          `}
        >
          <input {...getInputProps()} />

          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <p className="text-lg font-medium">Uploading...</p>
              <Progress value={progress} className="w-64 mx-auto" />
            </div>
          ) : (
            <>
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                {isDragActive ? 'Drop your CSV file here' : 'Upload SIS Export'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your CSV file, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 10MB
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {fileRejections.length > 0 && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              {fileRejections[0].errors[0].code === 'file-too-large'
                ? 'File is too large. Maximum size is 10MB.'
                : 'Invalid file type. Please upload a CSV file.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Migration File

```sql
-- supabase/migrations/20251211_daep_reconciliation_upload.sql

-- Create reconciliation sessions table
CREATE TABLE IF NOT EXISTS daep_reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  total_records INT DEFAULT 0,
  matched_count INT DEFAULT 0,
  discrepancy_count INT DEFAULT 0,
  new_in_sis_count INT DEFAULT 0,
  missing_from_sis_count INT DEFAULT 0,
  status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'mapping_required', 'parsing', 'comparing', 'in_review', 'completed', 'failed')),
  error_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recon_sessions_tenant ON daep_reconciliation_sessions(tenant_id);
CREATE INDEX idx_recon_sessions_status ON daep_reconciliation_sessions(status);
CREATE INDEX idx_recon_sessions_date ON daep_reconciliation_sessions(upload_date DESC);

-- RLS
ALTER TABLE daep_reconciliation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daep_reconciliation_sessions_tenant_isolation"
  ON daep_reconciliation_sessions
  FOR ALL
  USING (
    tenant_id IN (
      SELECT COALESCE(active_tenant_id, tenant_id)
      FROM user_profiles
      WHERE id = auth.uid()::text
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_daep_reconciliation_sessions_updated_at
  BEFORE UPDATE ON daep_reconciliation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SIS Guides Table (for step-by-step help)
-- =============================================

CREATE TABLE IF NOT EXISTS sis_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = global template
  sis_name TEXT NOT NULL CHECK (sis_name IN ('Skyward', 'Focus', 'PowerSchool', 'Ascender', 'Other')),
  title TEXT NOT NULL,
  overview TEXT, -- Markdown content
  steps JSONB NOT NULL DEFAULT '[]', -- Array of step objects
  field_mapping_hints JSONB, -- SIS field → DAEP field suggestions
  pdf_url TEXT, -- Optional pre-generated PDF URL
  is_active BOOLEAN DEFAULT true,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX idx_sis_guides_lookup ON sis_guides(sis_name, tenant_id);

-- RLS - Read access for authenticated users
ALTER TABLE sis_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sis_guides_read_access"
  ON sis_guides
  FOR SELECT
  USING (
    is_active = true AND (
      tenant_id IS NULL OR -- Global guides visible to all
      tenant_id IN (
        SELECT COALESCE(active_tenant_id, tenant_id)
        FROM user_profiles
        WHERE id = auth.uid()::text
      )
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_sis_guides_updated_at
  BEFORE UPDATE ON sis_guides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Seed Initial Guides (Skyward and Focus)
-- =============================================

INSERT INTO sis_guides (sis_name, title, overview, steps) VALUES
('Skyward', 'Building Your Export in Skyward',
 'Follow these steps to create a custom Data Mining report with DAEP placement data.',
 '[
   {"order": 1, "title": "Open Data Mining", "content": "Navigate to **Students → Student Data Mining** from the main menu.", "screenshot_url": null, "screenshot_placeholder": "Screenshot: Skyward main menu with Data Mining highlighted"},
   {"order": 2, "title": "Create New Report", "content": "Click **Add** to create a new report. Enter a name like \"DAEP Reconciliation Export\".", "screenshot_url": null, "screenshot_placeholder": "Screenshot: New report dialog with name field"},
   {"order": 3, "title": "Select Student Fields", "content": "Add these fields from the Student table:\n- Student ID (maps to `student_id`)\n- First Name (maps to `first_name`)\n- Last Name (maps to `last_name`)", "screenshot_url": null, "screenshot_placeholder": "Screenshot: Field selection with student fields highlighted"},
   {"order": 4, "title": "Add Discipline Fields", "content": "Add these fields from Discipline:\n- Incident Number\n- Offense Code\n- Start Date\n- Days Assigned\n- Home Campus", "screenshot_url": null, "screenshot_placeholder": "Screenshot: Discipline fields selection"},
   {"order": 5, "title": "Export to CSV", "content": "Click the **Excel** icon to export. Save as CSV format.", "screenshot_url": null, "screenshot_placeholder": "Screenshot: Export button and format selection"}
 ]'::jsonb),
('Focus', 'Building Your Export in Focus',
 'Follow these steps to create an Ad Hoc Report with DAEP placement data.',
 '[
   {"order": 1, "title": "Open Ad Hoc Reports", "content": "Navigate to **Reports → Ad Hoc Reports** from the main menu.", "screenshot_url": null, "screenshot_placeholder": "Screenshot: Focus main menu with Ad Hoc Reports highlighted"},
   {"order": 2, "title": "Create New Report", "content": "Click **Create New Report**. Select the Discipline data area.", "screenshot_url": null, "screenshot_placeholder": "Screenshot: New report with data area selection"},
   {"order": 3, "title": "Drag Required Fields", "content": "Drag these fields to your report:\n- Student ID, First Name, Last Name\n- Incident Number, Start Date, Days Assigned\n- Offense Code, Home Campus", "screenshot_url": null, "screenshot_placeholder": "Screenshot: Drag-and-drop field builder"},
   {"order": 4, "title": "Apply Filters", "content": "Filter to show only DAEP placements for your date range.", "screenshot_url": null, "screenshot_placeholder": "Screenshot: Filter configuration"},
   {"order": 5, "title": "Export to CSV", "content": "Click **Export** and select CSV format.", "screenshot_url": null, "screenshot_placeholder": "Screenshot: Export options"}
 ]'::jsonb);
```

---

## Audit Events

| Event | When | Details |
|-------|------|---------|
| `reconciliation.session_created` | After successful upload | fileName, fileSize, sessionId |
| `reconciliation.upload_failed` | On upload error | fileName, error |

---

## Edge Cases

1. **Network interruption during upload:** Show retry button, maintain file reference
2. **Invalid CSV content:** Detected in Story 5-3 (parsing), this story only validates file type/size
3. **Storage quota exceeded:** Return clear error, suggest contacting support
4. **Duplicate upload (same file):** Allow - each upload creates new session
5. **Session already in progress:** Show warning but allow new upload

---

## Dependencies

- `react-dropzone` package for file upload UI
- Supabase Storage bucket `daep-uploads` must exist
- Story 5-2 (Field Mapping) for first-time setup flow

---

## Quick Wins Included

### 1. Left Navigation (Admin L1/L2 Only)

Add "SIS Reconciliation" to DAEP left nav, visible only to `daep_admin_l1` and `daep_admin_l2`:

```typescript
// In DAEP nav config
{
  name: 'SIS Reconciliation',
  href: '/daep/reconciliation',
  icon: FileSpreadsheet,
  roles: ['daep_admin_l1', 'daep_admin_l2'], // Restricted
}
```

### 2. Upload Speed and ETA

Show upload speed (KB/s) and estimated time remaining:

```typescript
const [uploadState, setUploadState] = useState({
  progress: 0,
  speed: 0,    // bytes per second
  eta: 0,      // seconds remaining
  startTime: 0,
});

const formatSpeed = (bps: number) =>
  bps > 1024 * 1024
    ? `${(bps / 1024 / 1024).toFixed(1)} MB/s`
    : `${(bps / 1024).toFixed(1)} KB/s`;

const formatETA = (seconds: number) =>
  seconds < 60
    ? `${Math.ceil(seconds)}s remaining`
    : `${Math.ceil(seconds / 60)}m remaining`;
```

### 3. Auto-Detect SIS from Filename

Detect SIS type from filename patterns and pass to mapping page:

```typescript
const SIS_PATTERNS: Record<string, RegExp[]> = {
  Skyward: [/skyward/i, /^sky_/i, /^skyw/i],
  Focus: [/focus/i, /^fcs_/i],
  PowerSchool: [/powerschool/i, /^ps_/i, /pschool/i],
  Ascender: [/ascender/i, /^asc_/i],
};

function detectSISFromFilename(filename: string): string | null {
  for (const [sis, patterns] of Object.entries(SIS_PATTERNS)) {
    if (patterns.some(p => p.test(filename))) return sis;
  }
  return null;
}

// In upload success handler:
const detectedSIS = detectSISFromFilename(file.name);
const redirectUrl = mapping
  ? `/daep/reconciliation/${session.id}`
  : `/daep/settings/csv-mapping?session=${session.id}${detectedSIS ? `&detected_sis=${detectedSIS}` : ''}`;
```

### 4. Field Requirements Section

Collapsible section showing required and optional CSV fields:

```typescript
// Field definitions
const REQUIRED_FIELDS = [
  { key: 'student_id', label: 'Student ID', description: 'Unique identifier (e.g., 12345)', example: '12345' },
  { key: 'first_name', label: 'First Name', description: "Student's first name", example: 'John' },
  { key: 'last_name', label: 'Last Name', description: "Student's last name", example: 'Smith' },
  { key: 'incident_number', label: 'Incident Number', description: 'Unique incident ID from SIS', example: 'INC-2024-001' },
  { key: 'start_date', label: 'Start Date', description: 'DAEP placement start date', example: '2024-12-01' },
  { key: 'days_assigned', label: 'Days Assigned', description: 'Number of DAEP days (1-365)', example: '30' },
  { key: 'offense_code', label: 'Offense Code', description: 'PEIMS discipline code', example: '26' },
  { key: 'home_campus', label: 'Home Campus', description: "Student's home campus name", example: 'Central Middle School' },
];

const OPTIONAL_FIELDS = [
  { key: 'parent_email', label: 'Parent Email', description: 'Guardian email address', example: 'parent@email.com' },
  { key: 'guardian_phone', label: 'Guardian Phone', description: 'Guardian phone number', example: '555-123-4567' },
  { key: 'grade_level', label: 'Grade Level', description: 'Student grade (1-12)', example: '7' },
  { key: 'assigning_campus', label: 'Assigning Campus', description: 'Campus that assigned placement', example: 'Central Middle School' },
  { key: 'placement_reason', label: 'Placement Reason', description: 'Reason for DAEP placement', example: 'Fighting - mutual combat' },
  { key: 'mandatory_placement', label: 'Mandatory Placement', description: 'Is placement mandatory?', example: 'Yes' },
];
```

### 5. Sample CSV Download

Static sample file at `/public/downloads/daep-sample-export.csv`:

```csv
student_id,first_name,last_name,incident_number,start_date,days_assigned,offense_code,home_campus,parent_email,guardian_phone,grade_level,assigning_campus,placement_reason,mandatory_placement
12345,John,Smith,INC-2024-001,2024-12-01,30,26,Central Middle School,parent@email.com,555-123-4567,7,Central Middle School,Fighting - mutual combat,Yes
12346,Jane,Doe,INC-2024-002,2024-12-05,15,34,Northside High School,jane.parent@email.com,555-234-5678,10,Northside High School,Tobacco possession,No
12347,Bob,Johnson,INC-2024-003,2024-12-10,45,21,Eastside Elementary,bob.guardian@email.com,555-345-6789,5,Eastside Elementary,Assault on staff,Yes
```

### 6. SIS Guide Modal Component

```typescript
// components/daep/reconciliation/SISGuideModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface SISGuideStep {
  order: number;
  title: string;
  content: string;
  screenshot_url: string | null;
  screenshot_placeholder: string;
}

interface SISGuide {
  sis_name: string;
  title: string;
  overview: string;
  steps: SISGuideStep[];
}

export function SISGuideModal({
  sisName,
  open,
  onOpenChange,
}: {
  sisName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [guide, setGuide] = useState<SISGuide | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && sisName) {
      loadGuide(sisName);
    }
  }, [open, sisName]);

  const loadGuide = async (sis: string) => {
    setLoading(true);
    const result = await getSISGuide(sis);
    setGuide(result);
    setCurrentStep(0);
    setLoading(false);
  };

  const step = guide?.steps[currentStep];
  const totalSteps = guide?.steps.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{guide?.title || `Loading ${sisName} Guide...`}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">Loading guide...</div>
        ) : guide && step ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{guide.overview}</p>

            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-2">
                Step {currentStep + 1} of {totalSteps}
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: marked(step.content) }} />

              {step.screenshot_url ? (
                <img src={step.screenshot_url} alt={step.title} className="mt-4 rounded border" />
              ) : (
                <div className="mt-4 bg-muted rounded p-4 text-sm text-muted-foreground italic">
                  {step.screenshot_placeholder}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(s => s - 1)}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>

              <Button variant="outline" onClick={() => handleDownloadPDF(sisName)}>
                <Download className="w-4 h-4 mr-1" /> Download PDF
              </Button>

              <Button
                onClick={() => setCurrentStep(s => s + 1)}
                disabled={currentStep >= totalSteps - 1}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Guide not found for {sisName}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Testing Checklist

- [ ] Upload valid CSV file (< 10MB)
- [ ] Reject non-CSV files (.xlsx, .pdf, etc.)
- [ ] Reject files > 10MB
- [ ] Show progress with speed and ETA during upload
- [ ] Create session record on success
- [ ] Redirect to mapping if no mapping exists
- [ ] Redirect to session review if mapping exists
- [ ] Handle network errors gracefully
- [ ] Audit log records upload event
- [ ] Left nav visible only to L1/L2 admins
- [ ] SIS auto-detected from filename patterns
- [ ] Field requirements section expands/collapses
- [ ] Required fields (8) display correctly
- [ ] Optional fields (6) toggle works
- [ ] Sample CSV downloads correctly
- [ ] Field list downloads correctly
- [ ] Skyward guide modal opens with steps
- [ ] Focus guide modal opens with steps
- [ ] Guide step navigation works (Previous/Next)
- [ ] Screenshot placeholders display when no image
- [ ] PDF download button works
