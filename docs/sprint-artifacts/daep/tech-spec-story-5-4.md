# Tech Spec: Story 5-4 - Comparison Engine

**Epic:** 5 - CSV Reconciliation
**Points:** 5
**Status:** Drafted
**FRs:** FR54, FR55
**Dependencies:** Story 5-3 (CSV Parsing)

---

## Purpose

Compare parsed SIS records against existing DAEP placement records to identify matches, field conflicts, new records, and missing records. This is the core logic that powers the banking-style reconciliation workflow.

---

## Acceptance Criteria Checklist

| AC | Description | Required Implementation |
|----|-------------|------------------------|
| 5.4.1 | Compare by composite key | Match on student_id + incident_number |
| 5.4.2 | Find matching DAEP placements | Query existing placements for each SIS record |
| 5.4.3 | Categorize as Matched | SIS and DAEP data identical |
| 5.4.4 | Categorize as Field Conflict | Record exists in both but fields differ |
| 5.4.5 | Categorize as New in SIS | In SIS but not in DAEP |
| 5.4.6 | Categorize as Missing from SIS | In DAEP but not in SIS |
| 5.4.7 | Identify differing fields | List specific fields with conflicts |
| 5.4.8 | Compare key fields | start_date, days_assigned, offense_code, names, campus, parent_email |
| 5.4.9 | Store results | Save to daep_reconciliation_discrepancies table |

---

## Comparison Logic

### Composite Key Matching

```
SIS Record Key: student_id + incident_number
DAEP Record Key: school_id + incident_number

Match occurs when both components match exactly.
```

### Categorization Rules

| Category | Condition |
|----------|-----------|
| **Matched** | Key exists in both AND all compared fields identical |
| **Field Conflict** | Key exists in both AND one or more compared fields differ |
| **New in SIS** | Key exists in SIS but NOT in DAEP |
| **Missing from SIS** | Key exists in DAEP (active placements) but NOT in SIS upload |

### Fields Compared for Conflicts

| Field | SIS Source | DAEP Source | Comparison Logic |
|-------|------------|-------------|------------------|
| `start_date` | start_date | start_date | Date equality |
| `days_assigned` | days_assigned | days_assigned | Integer equality |
| `offense_code` | offense_code | offense_code | String equality (trimmed) |
| `first_name` | first_name | student first_name | Case-insensitive |
| `last_name` | last_name | student last_name | Case-insensitive |
| `home_campus` | home_campus | home_campus_id/name | Fuzzy match by name |
| `parent_email` | parent_email | parent email | Case-insensitive |

---

## Data Types

```typescript
// lib/types/daep.ts

export type DiscrepancyType = 'matched' | 'field_conflict' | 'new_in_sis' | 'missing_from_sis';

export interface FieldConflict {
  field: string;
  sisValue: string | number | boolean | null;
  daepValue: string | number | boolean | null;
  label: string; // Human-readable field name
}

export interface Discrepancy {
  id?: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  incidentNumber: string;
  discrepancyType: DiscrepancyType;
  sisData: SISRecord | null;
  daepData: DAEPPlacementRecord | null;
  conflicts: FieldConflict[];
  resolution: 'pending' | 'accept_sis' | 'keep_daep';
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface ComparisonResult {
  sessionId: string;
  totalSISRecords: number;
  totalDAEPRecords: number;
  matched: number;
  fieldConflicts: number;
  newInSIS: number;
  missingFromSIS: number;
  discrepancies: Discrepancy[];
}

export interface DAEPPlacementRecord {
  id: string;
  school_id: string;
  incident_number: string;
  first_name: string;
  last_name: string;
  start_date: string;
  days_assigned: number;
  days_served: number;
  offense_code: string;
  home_campus_id: string;
  home_campus_name: string;
  status: string;
  parent_email?: string;
}
```

---

## Database Tables

### `daep_reconciliation_discrepancies`

```sql
CREATE TABLE daep_reconciliation_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES daep_reconciliation_sessions(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id TEXT,
  student_name TEXT,
  incident_number TEXT,
  discrepancy_type TEXT NOT NULL CHECK (discrepancy_type IN ('matched', 'field_conflict', 'new_in_sis', 'missing_from_sis')),
  sis_data JSONB,
  daep_data JSONB,
  conflicts JSONB DEFAULT '[]',
  resolution TEXT DEFAULT 'pending' CHECK (resolution IN ('pending', 'accept_sis', 'keep_daep')),
  resolution_note TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discrepancies_session ON daep_reconciliation_discrepancies(session_id);
CREATE INDEX idx_discrepancies_type ON daep_reconciliation_discrepancies(discrepancy_type);
CREATE INDEX idx_discrepancies_resolution ON daep_reconciliation_discrepancies(resolution);
CREATE INDEX idx_discrepancies_student ON daep_reconciliation_discrepancies(student_id);

-- RLS
ALTER TABLE daep_reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daep_reconciliation_discrepancies_tenant_isolation"
  ON daep_reconciliation_discrepancies
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

## Server Actions

### File: `app/actions/daep/reconciliation.ts`

#### `startReconciliationComparison(sessionId: string)`

**Purpose:** Run comparison between SIS records and DAEP placements

```typescript
export async function startReconciliationComparison(
  sessionId: string,
  sisRecords: SISRecord[]
): Promise<ComparisonResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();
  const user = await currentUser();

  // Update session status
  await supabase
    .from('daep_reconciliation_sessions')
    .update({ status: 'comparing' })
    .eq('id', sessionId);

  // Get all active DAEP placements for this tenant
  const { data: daepPlacements, error } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      incident_number,
      start_date,
      days_assigned,
      days_served,
      offense_code,
      home_campus_id,
      status,
      trespass_records!inner (
        first_name,
        last_name,
        parent_email
      ),
      campuses!daep_placements_home_campus_id_fkey (
        name
      )
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'active', 'transition']);

  if (error) {
    console.error('[Reconciliation] Failed to fetch placements:', error);
    throw new Error('Failed to fetch DAEP placements');
  }

  // Transform to comparison format
  const daepRecords: DAEPPlacementRecord[] = (daepPlacements || []).map(p => ({
    id: p.id,
    school_id: p.school_id,
    incident_number: p.incident_number || '',
    first_name: p.trespass_records?.first_name || '',
    last_name: p.trespass_records?.last_name || '',
    start_date: p.start_date,
    days_assigned: p.days_assigned,
    days_served: p.days_served,
    offense_code: p.offense_code,
    home_campus_id: p.home_campus_id,
    home_campus_name: p.campuses?.name || '',
    status: p.status,
    parent_email: p.trespass_records?.parent_email,
  }));

  // Build lookup maps
  const sisMap = new Map<string, SISRecord>();
  for (const record of sisRecords) {
    const key = `${record.student_id}|${record.incident_number}`;
    sisMap.set(key, record);
  }

  const daepMap = new Map<string, DAEPPlacementRecord>();
  for (const record of daepRecords) {
    const key = `${record.school_id}|${record.incident_number}`;
    daepMap.set(key, record);
  }

  // Compare records
  const discrepancies: Discrepancy[] = [];
  let matched = 0;
  let fieldConflicts = 0;
  let newInSIS = 0;
  let missingFromSIS = 0;

  // Check each SIS record
  for (const [key, sisRecord] of sisMap) {
    const daepRecord = daepMap.get(key);

    if (!daepRecord) {
      // New in SIS
      newInSIS++;
      discrepancies.push({
        sessionId,
        studentId: sisRecord.student_id,
        studentName: `${sisRecord.first_name} ${sisRecord.last_name}`,
        incidentNumber: sisRecord.incident_number,
        discrepancyType: 'new_in_sis',
        sisData: sisRecord,
        daepData: null,
        conflicts: [],
        resolution: 'pending',
      });
    } else {
      // Compare fields
      const conflicts = compareRecords(sisRecord, daepRecord);

      if (conflicts.length === 0) {
        // Matched - store for count but no action needed
        matched++;
        // Optionally store matched records for audit
        discrepancies.push({
          sessionId,
          studentId: sisRecord.student_id,
          studentName: `${sisRecord.first_name} ${sisRecord.last_name}`,
          incidentNumber: sisRecord.incident_number,
          discrepancyType: 'matched',
          sisData: sisRecord,
          daepData: daepRecord,
          conflicts: [],
          resolution: 'pending', // Auto-resolved for matched
        });
      } else {
        // Field conflict
        fieldConflicts++;
        discrepancies.push({
          sessionId,
          studentId: sisRecord.student_id,
          studentName: `${sisRecord.first_name} ${sisRecord.last_name}`,
          incidentNumber: sisRecord.incident_number,
          discrepancyType: 'field_conflict',
          sisData: sisRecord,
          daepData: daepRecord,
          conflicts,
          resolution: 'pending',
        });
      }

      // Remove from DAEP map (remaining will be "missing from SIS")
      daepMap.delete(key);
    }
  }

  // Remaining DAEP records are missing from SIS
  for (const [key, daepRecord] of daepMap) {
    missingFromSIS++;
    discrepancies.push({
      sessionId,
      studentId: daepRecord.school_id,
      studentName: `${daepRecord.first_name} ${daepRecord.last_name}`,
      incidentNumber: daepRecord.incident_number,
      discrepancyType: 'missing_from_sis',
      sisData: null,
      daepData: daepRecord,
      conflicts: [],
      resolution: 'pending',
    });
  }

  // Store discrepancies in database
  const discrepancyInserts = discrepancies.map(d => ({
    session_id: sessionId,
    tenant_id: tenantId,
    student_id: d.studentId,
    student_name: d.studentName,
    incident_number: d.incidentNumber,
    discrepancy_type: d.discrepancyType,
    sis_data: d.sisData,
    daep_data: d.daepData,
    conflicts: d.conflicts,
    resolution: d.discrepancyType === 'matched' ? 'keep_daep' : 'pending',
  }));

  // Batch insert
  const { error: insertError } = await supabase
    .from('daep_reconciliation_discrepancies')
    .insert(discrepancyInserts);

  if (insertError) {
    console.error('[Reconciliation] Failed to store discrepancies:', insertError);
    throw new Error('Failed to store comparison results');
  }

  // Update session with counts
  await supabase
    .from('daep_reconciliation_sessions')
    .update({
      status: 'in_review',
      total_records: sisRecords.length,
      matched_count: matched,
      discrepancy_count: fieldConflicts,
      new_in_sis_count: newInSIS,
      missing_from_sis_count: missingFromSIS,
    })
    .eq('id', sessionId);

  // Log audit event
  await logAuditEvent({
    eventType: 'reconciliation.comparison_completed',
    module: 'daep_management',
    actorId: user?.id || 'system',
    targetId: sessionId,
    action: 'Completed reconciliation comparison',
    details: {
      sisRecords: sisRecords.length,
      daepRecords: daepRecords.length,
      matched,
      fieldConflicts,
      newInSIS,
      missingFromSIS,
    },
  });

  return {
    sessionId,
    totalSISRecords: sisRecords.length,
    totalDAEPRecords: daepRecords.length,
    matched,
    fieldConflicts,
    newInSIS,
    missingFromSIS,
    discrepancies,
  };
}
```

#### Helper: `compareRecords()`

```typescript
function compareRecords(
  sis: SISRecord,
  daep: DAEPPlacementRecord
): FieldConflict[] {
  const conflicts: FieldConflict[] = [];

  // Compare start_date
  if (sis.start_date !== daep.start_date) {
    conflicts.push({
      field: 'start_date',
      sisValue: sis.start_date,
      daepValue: daep.start_date,
      label: 'Start Date',
    });
  }

  // Compare days_assigned
  if (sis.days_assigned !== daep.days_assigned) {
    conflicts.push({
      field: 'days_assigned',
      sisValue: sis.days_assigned,
      daepValue: daep.days_assigned,
      label: 'Days Assigned',
    });
  }

  // Compare offense_code
  if (sis.offense_code.trim() !== daep.offense_code.trim()) {
    conflicts.push({
      field: 'offense_code',
      sisValue: sis.offense_code,
      daepValue: daep.offense_code,
      label: 'Offense Code',
    });
  }

  // Compare first_name (case-insensitive)
  if (sis.first_name.toLowerCase() !== daep.first_name.toLowerCase()) {
    conflicts.push({
      field: 'first_name',
      sisValue: sis.first_name,
      daepValue: daep.first_name,
      label: 'First Name',
    });
  }

  // Compare last_name (case-insensitive)
  if (sis.last_name.toLowerCase() !== daep.last_name.toLowerCase()) {
    conflicts.push({
      field: 'last_name',
      sisValue: sis.last_name,
      daepValue: daep.last_name,
      label: 'Last Name',
    });
  }

  // Compare home_campus (fuzzy match)
  const sisHomeCampusNorm = sis.home_campus.toLowerCase().trim();
  const daepHomeCampusNorm = daep.home_campus_name.toLowerCase().trim();
  if (sisHomeCampusNorm !== daepHomeCampusNorm) {
    // Check if one contains the other (handles "Birdville HS" vs "Birdville High School")
    if (!sisHomeCampusNorm.includes(daepHomeCampusNorm) &&
        !daepHomeCampusNorm.includes(sisHomeCampusNorm)) {
      conflicts.push({
        field: 'home_campus',
        sisValue: sis.home_campus,
        daepValue: daep.home_campus_name,
        label: 'Home Campus',
      });
    }
  }

  // Compare parent_email if both present
  if (sis.parent_email && daep.parent_email) {
    if (sis.parent_email.toLowerCase() !== daep.parent_email.toLowerCase()) {
      conflicts.push({
        field: 'parent_email',
        sisValue: sis.parent_email,
        daepValue: daep.parent_email,
        label: 'Parent Email',
      });
    }
  }

  return conflicts;
}
```

#### `getSessionDiscrepancies(sessionId: string)`

```typescript
export async function getSessionDiscrepancies(sessionId: string) {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_reconciliation_discrepancies')
    .select('*')
    .eq('session_id', sessionId)
    .eq('tenant_id', tenantId)
    .order('discrepancy_type', { ascending: true })
    .order('student_name', { ascending: true });

  if (error) {
    console.error('[Reconciliation] Failed to fetch discrepancies:', error);
    return [];
  }

  return data;
}
```

---

## Migration File

```sql
-- supabase/migrations/20251211_daep_reconciliation_discrepancies.sql

CREATE TABLE IF NOT EXISTS daep_reconciliation_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES daep_reconciliation_sessions(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id TEXT,
  student_name TEXT,
  incident_number TEXT,
  discrepancy_type TEXT NOT NULL CHECK (discrepancy_type IN ('matched', 'field_conflict', 'new_in_sis', 'missing_from_sis')),
  sis_data JSONB,
  daep_data JSONB,
  conflicts JSONB DEFAULT '[]',
  resolution TEXT DEFAULT 'pending' CHECK (resolution IN ('pending', 'accept_sis', 'keep_daep')),
  resolution_note TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_discrepancies_session ON daep_reconciliation_discrepancies(session_id);
CREATE INDEX idx_discrepancies_type ON daep_reconciliation_discrepancies(discrepancy_type);
CREATE INDEX idx_discrepancies_resolution ON daep_reconciliation_discrepancies(resolution);
CREATE INDEX idx_discrepancies_tenant ON daep_reconciliation_discrepancies(tenant_id);

-- RLS
ALTER TABLE daep_reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daep_reconciliation_discrepancies_tenant_isolation"
  ON daep_reconciliation_discrepancies
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

## Audit Events

| Event | When | Details |
|-------|------|---------|
| `reconciliation.comparison_completed` | After comparison finishes | sisRecords, daepRecords, matched, conflicts, newInSIS, missingFromSIS |

---

## Edge Cases

1. **No existing DAEP placements:** All SIS records marked as "new_in_sis"
2. **Empty SIS upload:** All active placements marked as "missing_from_sis"
3. **Duplicate keys in SIS:** Use last occurrence (log warning)
4. **Student ID format differences:** Trim and normalize (leading zeros preserved)
5. **Campus name variations:** Fuzzy matching (contains check)
6. **Date timezone issues:** All dates stored as UTC, compare date only
7. **Large dataset (1000+ records):** Batch processing with progress
8. **Null incident_number:** Skip with error log

---

## Performance Considerations

- Build hash maps for O(1) lookups instead of nested loops
- Batch insert discrepancies (single query)
- Index on composite key (student_id, incident_number)
- Limit query to active placements only

---

## Testing Checklist

- [ ] Match records by student_id + incident_number
- [ ] Detect field conflicts (all comparison fields)
- [ ] Categorize new SIS records correctly
- [ ] Categorize missing DAEP records correctly
- [ ] Handle perfect matches (no conflicts)
- [ ] Store all discrepancies in database
- [ ] Update session counts accurately
- [ ] Handle empty SIS file
- [ ] Handle no existing placements
- [ ] Log comparison audit event
- [ ] Fuzzy match campus names
- [ ] Case-insensitive name comparison
