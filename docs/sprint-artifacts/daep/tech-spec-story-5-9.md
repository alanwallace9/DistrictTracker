# Tech Spec: Story 5-9 - Reconciliation Summary Report

**Epic:** 5 - CSV Reconciliation
**Points:** 3
**Status:** Drafted
**FRs:** FR61
**Dependencies:** Story 5-7 (Resolution Actions), Story 5-8 (Audit Trail)

---

## Purpose

Provide a summary report at session completion showing all reconciliation results, resolution breakdown, and metrics. Support export to PDF for documentation and historical reference.

---

## Acceptance Criteria Checklist

| AC | Description | Required Implementation |
|----|-------------|------------------------|
| 5.9.1 | Summary at session completion | Display when all discrepancies resolved |
| 5.9.2 | Show total metrics | total records, matched, conflicts resolved, new added, missing flagged |
| 5.9.3 | Resolution breakdown | Count of Accept SIS vs Keep DAEP decisions |
| 5.9.4 | Export to PDF | Generate downloadable PDF summary |
| 5.9.5 | Store summary in session | Summary data saved for historical reference |
| 5.9.6 | Email summary (optional) | Send summary to administrator if configured |

---

## Summary Report Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│           SIS RECONCILIATION SUMMARY REPORT                          │
│                                                                      │
│  Session: SIS-2025-11-15-001                                        │
│  Completed: November 15, 2025 at 2:45 PM                            │
│  Completed By: admin@birdville.edu                                  │
│  Duration: 12 minutes                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  OVERALL RESULTS                                                     │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐      │
│  │ Total        │ Matched      │ Conflicts    │ New          │      │
│  │    151       │    142       │      5       │      3       │      │
│  └──────────────┴──────────────┴──────────────┴──────────────┘      │
│                                                                      │
│  RESOLUTION BREAKDOWN                                                │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │ Accept SIS:  4 records updated from SIS data              │      │
│  │ Keep DAEP:   3 records retained DAEP values               │      │
│  │ New Created: 2 new placements added                       │      │
│  │ Flagged:     1 missing record flagged for review          │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                      │
│  DETAILED RESOLUTIONS                                                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Student          │ Type          │ Resolution │ Note        │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │ John Smith       │ Field Conflict│ Accept SIS │ SIS correct │    │
│  │ Jane Doe         │ Field Conflict│ Keep DAEP  │ Manual entry│    │
│  │ Bob Johnson      │ New in SIS    │ Accept SIS │ Created     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  [Download PDF]  [Email Summary]  [View Audit Log]                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Types

```typescript
// lib/types/daep.ts

export interface ReconciliationSummary {
  sessionId: string;
  fileName: string;
  uploadDate: string;
  completedAt: string;
  completedBy: string;
  completedByEmail: string;
  durationMinutes: number;

  // Counts
  totalRecords: number;
  matchedCount: number;
  conflictCount: number;
  newInSISCount: number;
  missingFromSISCount: number;

  // Resolution breakdown
  acceptedSISCount: number;
  keptDAEPCount: number;
  newPlacementsCreated: number;
  missingFlagged: number;

  // Detailed resolutions (for the table)
  resolutions: ResolutionDetail[];
}

export interface ResolutionDetail {
  studentId: string;
  studentName: string;
  discrepancyType: DiscrepancyType;
  resolution: 'accept_sis' | 'keep_daep';
  note?: string;
  changedFields?: string[];
  resolvedAt: string;
}
```

---

## Server Actions

### File: `app/actions/daep/reconciliation.ts`

#### `getReconciliationSummary(sessionId: string)`

```typescript
export async function getReconciliationSummary(
  sessionId: string
): Promise<ReconciliationSummary | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get session
  const { data: session, error: sessionError } = await supabase
    .from('daep_reconciliation_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single();

  if (sessionError || !session) {
    return null;
  }

  // Get all discrepancies with resolutions
  const { data: discrepancies } = await supabase
    .from('daep_reconciliation_discrepancies')
    .select('*')
    .eq('session_id', sessionId)
    .eq('tenant_id', tenantId)
    .order('resolved_at', { ascending: true });

  // Get user info for completedBy
  const { data: completedByUser } = await supabase
    .from('user_profiles')
    .select('email, display_name')
    .eq('id', session.uploaded_by)
    .single();

  // Calculate duration
  const uploadTime = new Date(session.upload_date).getTime();
  const completedTime = session.completed_at
    ? new Date(session.completed_at).getTime()
    : Date.now();
  const durationMinutes = Math.round((completedTime - uploadTime) / 60000);

  // Calculate resolution breakdown
  const resolutions = (discrepancies || [])
    .filter(d => d.discrepancy_type !== 'matched')
    .map(d => ({
      studentId: d.student_id,
      studentName: d.student_name,
      discrepancyType: d.discrepancy_type as DiscrepancyType,
      resolution: d.resolution as 'accept_sis' | 'keep_daep',
      note: d.resolution_note,
      changedFields: d.conflicts?.map((c: any) => c.field),
      resolvedAt: d.resolved_at,
    }));

  const acceptedSISCount = resolutions.filter(r => r.resolution === 'accept_sis').length;
  const keptDAEPCount = resolutions.filter(r => r.resolution === 'keep_daep').length;
  const newPlacementsCreated = resolutions.filter(
    r => r.discrepancyType === 'new_in_sis' && r.resolution === 'accept_sis'
  ).length;
  const missingFlagged = resolutions.filter(
    r => r.discrepancyType === 'missing_from_sis'
  ).length;

  return {
    sessionId: session.id,
    fileName: session.file_name,
    uploadDate: session.upload_date,
    completedAt: session.completed_at || new Date().toISOString(),
    completedBy: completedByUser?.display_name || session.uploaded_by,
    completedByEmail: completedByUser?.email || '',
    durationMinutes,
    totalRecords: session.total_records,
    matchedCount: session.matched_count,
    conflictCount: session.discrepancy_count,
    newInSISCount: session.new_in_sis_count,
    missingFromSISCount: session.missing_from_sis_count,
    acceptedSISCount,
    keptDAEPCount,
    newPlacementsCreated,
    missingFlagged,
    resolutions,
  };
}
```

#### `generateSummaryPDF(sessionId: string)`

```typescript
export async function generateSummaryPDF(sessionId: string) {
  const summary = await getReconciliationSummary(sessionId);

  if (!summary) {
    return { success: false, error: 'Summary not found' };
  }

  // Generate PDF using react-pdf or similar
  // Store in Supabase Storage
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const pdfContent = generatePDFContent(summary);
  const fileName = `reconciliation-summary-${sessionId}.pdf`;
  const storagePath = `${tenantId}/reports/${fileName}`;

  const { data, error } = await supabase.storage
    .from('daep-uploads')
    .upload(storagePath, pdfContent, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error('[PDF] Upload failed:', error);
    return { success: false, error: 'Failed to generate PDF' };
  }

  const { data: urlData } = await supabase.storage
    .from('daep-uploads')
    .createSignedUrl(storagePath, 60 * 60); // 1 hour

  return {
    success: true,
    url: urlData?.signedUrl,
    fileName,
  };
}

function generatePDFContent(summary: ReconciliationSummary): Buffer {
  // Implementation using react-pdf, pdfkit, or jspdf
  // Returns PDF buffer

  // Placeholder - actual implementation would use PDF library
  const content = `
RECONCILIATION SUMMARY REPORT
=============================

Session: ${summary.sessionId}
File: ${summary.fileName}
Completed: ${new Date(summary.completedAt).toLocaleString()}
Completed By: ${summary.completedByEmail}
Duration: ${summary.durationMinutes} minutes

OVERALL RESULTS
---------------
Total Records: ${summary.totalRecords}
Matched: ${summary.matchedCount}
Conflicts: ${summary.conflictCount}
New in SIS: ${summary.newInSISCount}
Missing from SIS: ${summary.missingFromSISCount}

RESOLUTION BREAKDOWN
--------------------
Accept SIS: ${summary.acceptedSISCount}
Keep DAEP: ${summary.keptDAEPCount}
New Placements Created: ${summary.newPlacementsCreated}
Missing Flagged: ${summary.missingFlagged}

DETAILED RESOLUTIONS
--------------------
${summary.resolutions.map(r =>
  `${r.studentName} | ${r.discrepancyType} | ${r.resolution} | ${r.note || '-'}`
).join('\n')}
`;

  return Buffer.from(content);
}
```

#### `emailReconciliationSummary(sessionId: string, email: string)`

```typescript
export async function emailReconciliationSummary(
  sessionId: string,
  email: string
) {
  const summary = await getReconciliationSummary(sessionId);

  if (!summary) {
    return { success: false, error: 'Summary not found' };
  }

  // Generate PDF attachment
  const pdfResult = await generateSummaryPDF(sessionId);

  // Send email via Resend (if configured)
  // Placeholder for Resend integration
  console.log(`[Email] Would send summary to ${email}`);

  return { success: true };
}
```

---

## UI Components

### Summary Report Component

```typescript
// app/daep/reconciliation/[sessionId]/components/summary-report.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  Mail,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  History,
} from 'lucide-react';
import { generateSummaryPDF } from '@/app/actions/daep/reconciliation';
import { CategoryBadge } from '@/components/daep/reconciliation/category-badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { ReconciliationSummary } from '@/lib/types/daep';

interface Props {
  summary: ReconciliationSummary;
}

export function SummaryReport({ summary }: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    const result = await generateSummaryPDF(summary.sessionId);

    if (result.success && result.url) {
      window.open(result.url, '_blank');
      toast.success('PDF generated successfully');
    } else {
      toast.error(result.error || 'Failed to generate PDF');
    }
    setDownloading(false);
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
        <h1 className="text-2xl font-bold text-green-800 mb-2">
          Reconciliation Complete!
        </h1>
        <p className="text-green-700">
          All discrepancies have been resolved.
        </p>
      </div>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">File</p>
            <p className="font-medium">{summary.fileName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="font-medium">
              {new Date(summary.completedAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Completed By</p>
            <p className="font-medium">{summary.completedByEmail}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-medium">{summary.durationMinutes} minutes</p>
          </div>
        </CardContent>
      </Card>

      {/* Overall Results */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Matched</p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.matchedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Conflicts Resolved</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {summary.conflictCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <PlusCircle className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">New Created</p>
                <p className="text-2xl font-bold text-blue-600">
                  {summary.newPlacementsCreated}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MinusCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Missing Reviewed</p>
                <p className="text-2xl font-bold text-red-600">
                  {summary.missingFlagged}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Accept SIS</p>
              <p className="text-3xl font-bold text-blue-700">
                {summary.acceptedSISCount}
              </p>
              <p className="text-sm text-blue-600">
                records updated from SIS data
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Keep DAEP</p>
              <p className="text-3xl font-bold text-green-700">
                {summary.keptDAEPCount}
              </p>
              <p className="text-sm text-green-600">
                records retained DAEP values
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Resolutions Table */}
      {summary.resolutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Resolutions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Resolved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.resolutions.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {r.studentName}
                      <span className="block text-xs text-muted-foreground">
                        {r.studentId}
                      </span>
                    </TableCell>
                    <TableCell>
                      <CategoryBadge type={r.discrepancyType} size="sm" />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.resolution === 'accept_sis' ? 'default' : 'secondary'}
                      >
                        {r.resolution === 'accept_sis' ? 'Accept SIS' : 'Keep DAEP'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.note || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(r.resolvedAt), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button onClick={handleDownloadPDF} disabled={downloading}>
          <Download className="h-4 w-4 mr-2" />
          {downloading ? 'Generating...' : 'Download PDF'}
        </Button>
        <Button variant="outline">
          <History className="h-4 w-4 mr-2" />
          View Audit Log
        </Button>
      </div>
    </div>
  );
}
```

---

## PDF Generation

### Using jsPDF (Client-Side Option)

```typescript
// lib/utils/daep/pdf-generator.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReconciliationSummary } from '@/lib/types/daep';

export function generateReconciliationPDF(summary: ReconciliationSummary): Blob {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('SIS Reconciliation Summary Report', 20, 20);

  doc.setFontSize(10);
  doc.text(`Session: ${summary.sessionId}`, 20, 30);
  doc.text(`File: ${summary.fileName}`, 20, 35);
  doc.text(`Completed: ${new Date(summary.completedAt).toLocaleString()}`, 20, 40);
  doc.text(`By: ${summary.completedByEmail}`, 20, 45);
  doc.text(`Duration: ${summary.durationMinutes} minutes`, 20, 50);

  // Overall Results
  doc.setFontSize(14);
  doc.text('Overall Results', 20, 65);

  autoTable(doc, {
    startY: 70,
    head: [['Metric', 'Count']],
    body: [
      ['Total Records', summary.totalRecords.toString()],
      ['Matched', summary.matchedCount.toString()],
      ['Conflicts', summary.conflictCount.toString()],
      ['New in SIS', summary.newInSISCount.toString()],
      ['Missing from SIS', summary.missingFromSISCount.toString()],
    ],
    theme: 'striped',
  });

  // Resolution Breakdown
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Resolution Breakdown', 20, finalY);

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Action', 'Count']],
    body: [
      ['Accept SIS', summary.acceptedSISCount.toString()],
      ['Keep DAEP', summary.keptDAEPCount.toString()],
      ['New Placements Created', summary.newPlacementsCreated.toString()],
      ['Missing Flagged', summary.missingFlagged.toString()],
    ],
    theme: 'striped',
  });

  // Detailed Resolutions (if fits)
  if (summary.resolutions.length > 0 && summary.resolutions.length <= 20) {
    const detailY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Detailed Resolutions', 20, detailY);

    autoTable(doc, {
      startY: detailY + 5,
      head: [['Student', 'Type', 'Resolution', 'Note']],
      body: summary.resolutions.map(r => [
        r.studentName,
        r.discrepancyType.replace('_', ' '),
        r.resolution === 'accept_sis' ? 'Accept SIS' : 'Keep DAEP',
        r.note || '-',
      ]),
      theme: 'striped',
      styles: { fontSize: 8 },
    });
  }

  return doc.output('blob');
}
```

---

## Edge Cases

1. **Session not yet complete:** Show progress, not summary
2. **Very large number of resolutions:** Paginate table, limit PDF detail
3. **PDF generation fails:** Show error, offer retry
4. **Email not configured:** Hide email button
5. **Session has no discrepancies (all matched):** Show simplified success summary

---

## Testing Checklist

- [ ] Summary displays after all discrepancies resolved
- [ ] Correct counts for all categories
- [ ] Resolution breakdown accurate
- [ ] Detailed table shows all resolutions
- [ ] PDF generation works
- [ ] PDF downloads correctly
- [ ] Duration calculated correctly
- [ ] Completed by shows correct user
- [ ] Empty resolutions handled (all matched)
