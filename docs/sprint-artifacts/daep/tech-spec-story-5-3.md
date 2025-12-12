# Tech Spec: Story 5-3 - CSV Parsing

**Epic:** 5 - CSV Reconciliation
**Points:** 3
**Status:** Drafted
**FRs:** FR53
**Dependencies:** Story 5-1 (CSV Upload), Story 5-2 (Field Mapping)

---

## Purpose

Parse uploaded CSV files using the saved field mapping to transform SIS export data into normalized DAEP records. Handle various date formats, encoding issues, and validation errors with human-readable error messages.

---

## Acceptance Criteria Checklist

| AC | Description | Required Implementation |
|----|-------------|------------------------|
| 5.3.1 | Use PapaParse for CSV parsing | Server-side parsing with streaming support |
| 5.3.2 | Apply field mapping | Transform CSV columns to DAEP field names |
| 5.3.3 | Validate required fields | Ensure all mapped required fields have values |
| 5.3.4 | Parse multiple date formats | Support MM/DD/YYYY, YYYY-MM-DD, M/D/YY |
| 5.3.5 | Handle encoding issues | Support UTF-8, Windows-1252, detect BOM |
| 5.3.6 | Skip header row | First row treated as headers |
| 5.3.7 | Return normalized records | Array of SISRecord objects ready for comparison |
| 5.3.8 | Log parsing errors with context | Row number, student name, field name in errors |

---

## Data Types

### SIS Record (Normalized)

```typescript
// lib/types/daep.ts

export interface SISRecord {
  // Required fields
  student_id: string;
  first_name: string;
  last_name: string;
  incident_number: string;
  start_date: string; // ISO format YYYY-MM-DD
  days_assigned: number;
  offense_code: string;
  home_campus: string;

  // Optional fields
  parent_email?: string;
  guardian_phone?: string;
  grade_level?: number;
  assigning_campus?: string;
  placement_reason?: string;
  mandatory_placement?: boolean;

  // Metadata
  _rowNumber: number; // Original CSV row for error reporting
  _rawData: Record<string, string>; // Original CSV values
}

export interface ParseResult {
  success: boolean;
  records: SISRecord[];
  errors: ParseError[];
  warnings: ParseWarning[];
  stats: {
    totalRows: number;
    parsedRows: number;
    errorRows: number;
    skippedRows: number;
  };
}

export interface ParseError {
  row: number;
  studentName?: string;
  studentId?: string;
  field: string;
  value: string;
  message: string;
}

export interface ParseWarning {
  row: number;
  studentName?: string;
  field: string;
  message: string;
}
```

---

## Server Actions

### File: `app/actions/daep/reconciliation.ts`

#### `parseCSVFile(sessionId: string)`

**Purpose:** Parse uploaded CSV using saved field mapping

```typescript
import Papa from 'papaparse';

export async function parseCSVFile(sessionId: string): Promise<ParseResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get session
  const { data: session } = await supabase
    .from('daep_reconciliation_sessions')
    .select('id, file_url, status')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single();

  if (!session) {
    return {
      success: false,
      records: [],
      errors: [{ row: 0, field: '', value: '', message: 'Session not found' }],
      warnings: [],
      stats: { totalRows: 0, parsedRows: 0, errorRows: 0, skippedRows: 0 },
    };
  }

  // Get field mapping
  const { data: mapping } = await supabase
    .from('daep_csv_field_mappings')
    .select('field_mappings')
    .eq('tenant_id', tenantId)
    .single();

  if (!mapping) {
    return {
      success: false,
      records: [],
      errors: [{ row: 0, field: '', value: '', message: 'Field mapping not configured' }],
      warnings: [],
      stats: { totalRows: 0, parsedRows: 0, errorRows: 0, skippedRows: 0 },
    };
  }

  // Update session status
  await supabase
    .from('daep_reconciliation_sessions')
    .update({ status: 'parsing' })
    .eq('id', sessionId);

  // Download CSV file
  const response = await fetch(session.file_url);
  let csvText = await response.text();

  // Handle BOM
  csvText = csvText.replace(/^\uFEFF/, '');

  // Parse CSV
  const parseResult = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const fieldMappings = mapping.field_mappings as Record<string, string>;
  const records: SISRecord[] = [];
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  // Process each row
  parseResult.data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 for header row and 0-indexing

    try {
      const record = transformRow(row, fieldMappings, rowNumber, errors, warnings);
      if (record) {
        records.push(record);
      }
    } catch (err) {
      errors.push({
        row: rowNumber,
        field: 'row',
        value: '',
        message: `Failed to parse row: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    }
  });

  // Update session with parse results
  const success = errors.length === 0 || records.length > 0;
  await supabase
    .from('daep_reconciliation_sessions')
    .update({
      status: success ? 'comparing' : 'failed',
      total_records: records.length,
      error_message: errors.length > 0 ? `${errors.length} parsing errors` : null,
    })
    .eq('id', sessionId);

  return {
    success,
    records,
    errors,
    warnings,
    stats: {
      totalRows: parseResult.data.length,
      parsedRows: records.length,
      errorRows: errors.length,
      skippedRows: parseResult.data.length - records.length - errors.length,
    },
  };
}
```

#### Helper: `transformRow()`

```typescript
function transformRow(
  row: Record<string, string>,
  mappings: Record<string, string>,
  rowNumber: number,
  errors: ParseError[],
  warnings: ParseWarning[]
): SISRecord | null {
  // Reverse mapping: DAEP field -> CSV column
  const getValue = (daepField: string): string => {
    const csvColumn = mappings[daepField];
    return csvColumn ? (row[csvColumn] || '').trim() : '';
  };

  // Get values
  const studentId = getValue('student_id');
  const firstName = getValue('first_name');
  const lastName = getValue('last_name');
  const incidentNumber = getValue('incident_number');
  const startDateRaw = getValue('start_date');
  const daysAssignedRaw = getValue('days_assigned');
  const offenseCode = getValue('offense_code');
  const homeCampus = getValue('home_campus');

  // Build student name for error messages
  const studentName = `${firstName} ${lastName}`.trim() || `Row ${rowNumber}`;

  // Validate required fields
  const requiredFields = [
    { field: 'student_id', value: studentId },
    { field: 'first_name', value: firstName },
    { field: 'last_name', value: lastName },
    { field: 'incident_number', value: incidentNumber },
    { field: 'start_date', value: startDateRaw },
    { field: 'days_assigned', value: daysAssignedRaw },
    { field: 'offense_code', value: offenseCode },
    { field: 'home_campus', value: homeCampus },
  ];

  let hasError = false;
  for (const { field, value } of requiredFields) {
    if (!value) {
      errors.push({
        row: rowNumber,
        studentName,
        studentId,
        field,
        value: '',
        message: `Missing required field: ${field}`,
      });
      hasError = true;
    }
  }

  if (hasError) return null;

  // Parse date
  const startDate = parseDate(startDateRaw);
  if (!startDate) {
    errors.push({
      row: rowNumber,
      studentName,
      studentId,
      field: 'start_date',
      value: startDateRaw,
      message: `Invalid date format: "${startDateRaw}". Expected MM/DD/YYYY, YYYY-MM-DD, or M/D/YY`,
    });
    return null;
  }

  // Parse days assigned
  const daysAssigned = parseInt(daysAssignedRaw, 10);
  if (isNaN(daysAssigned) || daysAssigned < 1 || daysAssigned > 365) {
    errors.push({
      row: rowNumber,
      studentName,
      studentId,
      field: 'days_assigned',
      value: daysAssignedRaw,
      message: `Invalid days assigned: "${daysAssignedRaw}". Must be a number between 1 and 365`,
    });
    return null;
  }

  // Parse optional fields
  const gradeRaw = getValue('grade_level');
  let gradeLevel: number | undefined;
  if (gradeRaw) {
    const parsed = parseInt(gradeRaw, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
      gradeLevel = parsed;
    } else {
      warnings.push({
        row: rowNumber,
        studentName,
        field: 'grade_level',
        message: `Invalid grade level "${gradeRaw}", skipping`,
      });
    }
  }

  const mandatoryRaw = getValue('mandatory_placement');
  let mandatoryPlacement: boolean | undefined;
  if (mandatoryRaw) {
    const lower = mandatoryRaw.toLowerCase();
    if (['yes', 'true', '1', 'y'].includes(lower)) {
      mandatoryPlacement = true;
    } else if (['no', 'false', '0', 'n'].includes(lower)) {
      mandatoryPlacement = false;
    }
  }

  return {
    student_id: studentId,
    first_name: firstName,
    last_name: lastName,
    incident_number: incidentNumber,
    start_date: startDate,
    days_assigned: daysAssigned,
    offense_code: offenseCode,
    home_campus: homeCampus,
    parent_email: getValue('parent_email') || undefined,
    guardian_phone: getValue('guardian_phone') || undefined,
    grade_level: gradeLevel,
    assigning_campus: getValue('assigning_campus') || undefined,
    placement_reason: getValue('placement_reason') || undefined,
    mandatory_placement: mandatoryPlacement,
    _rowNumber: rowNumber,
    _rawData: row,
  };
}
```

#### Helper: `parseDate()`

```typescript
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();

  // Try YYYY-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return cleaned;
    }
  }

  // Try MM/DD/YYYY
  const mmddyyyy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Try M/D/YY
  const mdyy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mdyy) {
    const [, month, day, yearShort] = mdyy;
    // Assume 20xx for years < 50, 19xx for years >= 50
    const yearNum = parseInt(yearShort);
    const year = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
    const date = new Date(year, parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Try MM-DD-YYYY
  const mmddyyyyDash = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mmddyyyyDash) {
    const [, month, day, year] = mmddyyyyDash;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return null;
}
```

---

## Utility Module

### File: `lib/utils/daep/csv-parser.ts`

```typescript
import Papa from 'papaparse';

export { parseDate } from './date-parser';

export interface CSVParseOptions {
  maxRows?: number;
  encoding?: 'utf-8' | 'windows-1252';
}

export function parseCSVContent(
  content: string,
  options: CSVParseOptions = {}
): Papa.ParseResult<Record<string, string>> {
  // Remove BOM
  let cleaned = content.replace(/^\uFEFF/, '');

  // Handle Windows encoding if needed
  if (options.encoding === 'windows-1252') {
    // Attempt to decode common problematic characters
    cleaned = cleaned
      .replace(/\x93/g, '"')
      .replace(/\x94/g, '"')
      .replace(/\x91/g, "'")
      .replace(/\x92/g, "'")
      .replace(/\x96/g, '-')
      .replace(/\x97/g, '-');
  }

  return Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });
}

export function detectEncoding(content: string): 'utf-8' | 'windows-1252' {
  // Check for common Windows-1252 characters
  if (/[\x80-\x9F]/.test(content)) {
    return 'windows-1252';
  }
  return 'utf-8';
}
```

---

## UI Components

### Parsing Progress/Results Display

```typescript
// app/daep/reconciliation/[sessionId]/components/parse-results.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import type { ParseResult } from '@/lib/types/daep';

interface Props {
  result: ParseResult;
}

export function ParseResults({ result }: Props) {
  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Rows</p>
                <p className="text-2xl font-bold">{result.stats.totalRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Parsed Successfully</p>
                <p className="text-2xl font-bold text-green-600">{result.stats.parsedRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600">{result.stats.errorRows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{result.warnings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Errors List */}
      {result.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Parsing Errors ({result.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.errors.slice(0, 50).map((error, i) => (
                <Alert key={i} variant="destructive">
                  <AlertTitle>
                    Row {error.row}
                    {error.studentName && ` - ${error.studentName}`}
                  </AlertTitle>
                  <AlertDescription>
                    <strong>{error.field}:</strong> {error.message}
                    {error.value && <span className="text-xs ml-2">(value: "{error.value}")</span>}
                  </AlertDescription>
                </Alert>
              ))}
              {result.errors.length > 50 && (
                <p className="text-sm text-muted-foreground text-center">
                  ...and {result.errors.length - 50} more errors
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings List */}
      {result.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Warnings ({result.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {result.warnings.slice(0, 20).map((warning, i) => (
                <div key={i} className="text-sm p-2 bg-yellow-50 rounded border border-yellow-200">
                  <strong>Row {warning.row}</strong>
                  {warning.studentName && ` (${warning.studentName})`}: {warning.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14"
  }
}
```

---

## Edge Cases

1. **Empty CSV file:** Return error "CSV file is empty"
2. **CSV with only headers:** Return 0 records, no errors
3. **Inconsistent row lengths:** PapaParse handles, log warning
4. **Quoted fields with commas:** PapaParse handles automatically
5. **Newlines in quoted fields:** PapaParse handles
6. **Very large file (10MB):** Stream parsing to avoid memory issues
7. **Date in unrecognized format:** Log error with example formats
8. **Non-numeric days_assigned:** Log error with valid range
9. **Student ID with leading zeros:** Preserve as string
10. **Unicode characters in names:** Preserve correctly

---

## Testing Checklist

- [ ] Parse valid CSV with all required fields
- [ ] Handle missing required fields with clear errors
- [ ] Parse date format MM/DD/YYYY
- [ ] Parse date format YYYY-MM-DD
- [ ] Parse date format M/D/YY
- [ ] Reject invalid date formats with helpful message
- [ ] Parse days_assigned as integer
- [ ] Reject invalid days_assigned values
- [ ] Handle optional fields when missing
- [ ] Handle optional fields when present
- [ ] Strip BOM from UTF-8 files
- [ ] Handle Windows-1252 encoding
- [ ] Include row numbers in error messages
- [ ] Include student names in error messages
- [ ] Update session status to 'comparing' on success
- [ ] Update session status to 'failed' on critical errors
