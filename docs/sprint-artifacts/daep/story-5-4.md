# Story 5-4: Comparison Engine (SIS vs DAEP)

**Status:** drafted
**Epic:** 5 - CSV Reconciliation
**Points:** 5
**FRs:** FR54, FR55
**Dependencies:** Story 5-3 (CSV Parsing)

---

## Story

As a **DAEP administrator**,
I want **parsed SIS records to be automatically compared against existing DAEP placements**,
So that **discrepancies are identified and categorized for review without manual cross-checking**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Banking-style reconciliation: just as a bank statement comparison highlights every difference between your records and theirs, this engine identifies every mismatch between what the SIS says and what DAEP has recorded. No more side-by-side spreadsheet comparisons or missed discrepancies.

---

## UX Overview

### Comparison Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Reconciliation Session: abc-123                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Status: Comparing Records...                                            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  ████████████████████░░░░░░░░░░  65%                               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Comparing 247 SIS records against 312 DAEP placements...               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Comparison Complete

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Comparison Results                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  ✓ Matched   │  │  ⚠ Conflicts │  │  ➕ New      │  │  ➖ Missing  │ │
│  │    198       │  │     12       │  │     37       │  │     65       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                          │
│  Summary:                                                                │
│  • 198 records match perfectly - no action needed                       │
│  • 12 records have field differences requiring review                   │
│  • 37 records are new in SIS (not yet in DAEP)                         │
│  • 65 DAEP placements not found in SIS upload                          │
│                                                                          │
│                                    [Back] [Review Discrepancies →]      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Categorization

| Category | Icon | Description | Action |
|----------|------|-------------|--------|
| Matched | ✓ | Record exists in both with identical fields | None |
| Field Conflict | ⚠ | Record exists in both but fields differ | Review & choose |
| New in SIS | ➕ | In SIS file but not in DAEP database | Create placement |
| Missing from SIS | ➖ | In DAEP but not in current SIS upload | Verify status |

---

## Quick Wins (UX Improvements)

| Quick Win | UX Benefit | Effort |
|-----------|------------|--------|
| **Auto-run comparison after parsing** | Seamless flow: upload → parse → compare without extra clicks | Low |
| **Color-coded category badges** | Instant visual recognition: green=matched, yellow=conflict, blue=new, red=missing | Low |
| **"All synced" celebration state** | Positive feedback when SIS and DAEP match perfectly - "Nothing to review!" | Low |
| **Sort conflicts first in review list** | Most actionable items appear at top, matched records hidden by default | Low |
| **Record counts in progress text** | "Comparing 247 SIS records against 312 placements..." provides context | Low |
| **Expandable matched section** | Hide matched records by default, show count with "View all" option | Low |

---

## Acceptance Criteria

| AC | Description | Status | Test |
|----|-------------|--------|------|
| 5.4.1 | Compare by composite key (student_id + incident_number) | Pending | Upload CSV, verify records matched by composite key |
| 5.4.2 | Find matching DAEP placements for each SIS record | Pending | Upload CSV with known placements, verify matches found |
| 5.4.3 | Categorize as "matched" when all fields identical | Pending | Upload CSV matching existing data, verify matched count |
| 5.4.4 | Categorize as "field_conflict" when fields differ | Pending | Upload CSV with modified days_assigned, verify conflict detected |
| 5.4.5 | Categorize as "new_in_sis" for unmatched SIS records | Pending | Upload CSV with new student, verify categorized as new |
| 5.4.6 | Categorize as "missing_from_sis" for unmatched DAEP records | Pending | Upload partial CSV, verify missing placements identified |
| 5.4.7 | Identify specific differing fields with values | Pending | Create conflict, verify field names and both values shown |
| 5.4.8 | Compare key fields: start_date, days_assigned, offense_code | Pending | Modify each field, verify conflict detected |
| 5.4.9 | Store discrepancies in database | Pending | Run comparison, query daep_reconciliation_discrepancies |

---

## Tasks / Subtasks

### Task 1: Type Definitions

- [ ] 1.1 Add `DiscrepancyType` type to `lib/validation/schemas.ts`
  - 'matched' | 'field_conflict' | 'new_in_sis' | 'missing_from_sis'
- [ ] 1.2 Add `FieldConflict` interface
  - field, sisValue, daepValue, fieldLabel
- [ ] 1.3 Add `ComparisonRecord` interface
  - id, type, studentId, studentName, incidentNumber, sisRecord?, daepPlacement?, conflicts?, resolution
- [ ] 1.4 Add `DAEPPlacementCompact` interface
  - Subset of placement fields needed for comparison
- [ ] 1.5 Add `ComparisonResult` interface
  - sessionId, success, timestamp, stats, records, errors

### Task 2: Database Verification

- [ ] 2.1 Verify `daep_reconciliation_discrepancies` table exists
  - Check schema matches tech spec requirements
- [ ] 2.2 Add migration if table needs updates
  - Ensure columns: sis_record, daep_snapshot, field_conflicts JSONB
- [ ] 2.3 Verify RLS policies are in place
  - Tenant isolation using active_tenant_id pattern

### Task 3: Server Actions

- [ ] 3.1 Add `runComparison(sessionId)` to `app/actions/daep/reconciliation.ts`
  - Get session and validate status is 'comparing'
  - Fetch parsed SIS records (from prior parse step)
  - Fetch active DAEP placements for tenant
  - Build lookup maps by composite key
  - Compare and categorize all records
  - Save discrepancies to database
  - Update session status to 'review'
  - Return ComparisonResult
- [ ] 3.2 Add `compareFields(sisRecord, daepPlacement)` helper
  - Compare start_date (date only, ignore time)
  - Compare days_assigned (integer)
  - Compare offense_code (case-insensitive, trimmed)
  - Compare grade_level (optional)
  - Compare mandatory_placement (boolean)
  - Return FieldConflict[] array
- [ ] 3.3 Add `saveDiscrepancies(sessionId, tenantId, records)` helper
  - Filter out matched records (only save discrepancies)
  - Batch insert to database
  - Store SIS and DAEP snapshots for audit
- [ ] 3.4 Add `getSessionDiscrepancies(sessionId, filters?)` action
  - Fetch discrepancies with optional filtering by type/resolution
  - Order by student name
  - Return ComparisonRecord[]

### Task 4: Comparison Integration

- [ ] 4.1 Update session page to trigger comparison after parsing
  - Auto-start when status changes to 'comparing'
- [ ] 4.2 Add comparison progress state to UI
  - Show spinner and status message during comparison
- [ ] 4.3 Display comparison stats when complete
  - Stats cards for each category
  - Summary message

### Task 5: Session Status Updates

- [ ] 5.1 Update session status to 'review' on completion
- [ ] 5.2 Store comparison stats in session record
  - total_records, matched_records, discrepancy_count
- [ ] 5.3 Handle comparison errors gracefully
  - Update status to 'failed' with error message

### Task 6: Testing

- [ ] 6.1 Test matching by composite key (student_id + incident_number)
- [ ] 6.2 Test matched records (all fields identical)
- [ ] 6.3 Test field_conflict detection for each compared field
- [ ] 6.4 Test new_in_sis categorization
- [ ] 6.5 Test missing_from_sis categorization
- [ ] 6.6 Test with empty SIS record set
- [ ] 6.7 Test with no existing DAEP placements
- [ ] 6.8 Test case-insensitive offense code comparison
- [ ] 6.9 Test date comparison ignoring time component
- [ ] 6.10 Verify discrepancies saved to database
- [ ] 6.11 Verify session status updated to 'review'
- [ ] 6.12 TypeScript compilation
- [ ] 6.13 Playwright MCP verification

---

## Dev Notes

### Composite Key Matching

```typescript
// SIS Record key
const sisKey = `${sisRecord.student_id}|${sisRecord.incident_number}`;

// DAEP Placement key
const daepKey = `${placement.student_id}|${placement.incident_number}`;

// Match when both components are identical
```

### Field Comparison Strategy

| Field | Normalization | Notes |
|-------|---------------|-------|
| `start_date` | `substring(0, 10)` | Compare YYYY-MM-DD only |
| `days_assigned` | `String(value)` | Integer comparison |
| `offense_code` | `toUpperCase().trim()` | Case-insensitive |
| `grade_level` | Optional, skip if empty | 1-12 range |
| `mandatory_placement` | `=== true` check | Boolean |

### Fields NOT Compared (MVP Decision)

- `first_name`, `last_name` - Name variations acceptable, display only
- `parent_email`, `guardian_phone` - Contact info updated separately
- `home_campus` - **Skipped for MVP** (SIS may say "Birdville HS" while DAEP has "Birdville High School" - fuzzy matching adds complexity, defer to future story)
- `placement_reason` - Free text, too variable

### Database Storage Decision

**Only store actual discrepancies** - matched records are NOT saved to `daep_reconciliation_discrepancies`:
- `field_conflict` - stored (needs resolution)
- `new_in_sis` - stored (needs action to create placement)
- `missing_from_sis` - stored (needs verification)
- `matched` - **NOT stored** (no action needed, just counted in stats)

### Session Status Flow

```
comparing → review    (discrepancies exist)
         → completed  (no discrepancies, all matched)
         → failed     (comparison error)
```

### Performance: Map-Based Lookup

```typescript
// O(1) lookups instead of O(n) nested loops
const sisMap = new Map<string, SISRecord>();
sisRecords.forEach(r => sisMap.set(`${r.student_id}|${r.incident_number}`, r));

const daepMap = new Map<string, DAEPPlacementCompact>();
placements.forEach(p => daepMap.set(`${p.student_id}|${p.incident_number}`, p));
```

### Watch Out For

1. **Null incident_number** - Skip record with warning, don't crash
2. **Duplicate keys in SIS** - Use last occurrence, log warning
3. **Date timezone drift** - Compare date strings, not Date objects
4. **Empty optional fields** - Don't flag as conflict if both empty
5. **Student ID leading zeros** - Compare as strings, not numbers

---

## Edge Cases

| Case | Handling |
|------|----------|
| No SIS records parsed | Return error, status stays 'comparing' |
| No DAEP placements exist | All SIS records categorized as 'new_in_sis' |
| All records match | Status → 'completed', discrepancy_count = 0 |
| SIS has duplicate composite keys | Use last occurrence, log warning |
| DAEP placement missing incident_number | Skip from comparison, log warning |
| Very large dataset (>1000) | Batch inserts, progress updates |

---

## Out of Scope

| Item | Story |
|------|-------|
| Discrepancy list UI | Story 5-5 |
| Side-by-side comparison view | Story 5-6 |
| Batch resolution actions | Story 5-7 |
| Re-run comparison button | Story 5-8 |

---

## Dependencies

- Story 5-3 (CSV Parsing) - Provides SISRecord[] from parseCSVFile
- `daep_reconciliation_sessions` table - Session tracking
- `daep_reconciliation_discrepancies` table - Discrepancy storage
- `daep_placements` table - Source of DAEP records

---

## Definition of Done

- [ ] Type definitions added (DiscrepancyType, FieldConflict, ComparisonRecord, etc.)
- [ ] Database schema verified/updated for discrepancies table
- [ ] runComparison server action implemented
- [ ] compareFields helper compares all key fields
- [ ] Discrepancies saved to database with SIS/DAEP snapshots
- [ ] Session status updated to 'review' or 'completed'
- [ ] Comparison stats stored in session record
- [ ] All edge cases handled gracefully
- [ ] TypeScript compiles without errors
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-story-5-4.md`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- None required

### Completion Notes List

- (To be filled during implementation)

### File List

**New Files:**
- None (all code in existing files)

**Modified Files:**
- `lib/validation/schemas.ts` - Add comparison types
- `app/actions/daep/reconciliation.ts` - Add runComparison, compareFields, saveDiscrepancies, getSessionDiscrepancies
- `app/daep/reconciliation/[sessionId]/page.tsx` - Add comparison trigger and results display

---

## References

- [Source: docs/reference/epics-part2.md#Story-5.4] - Epic definition
- [Source: docs/sprint-artifacts/daep/tech-spec-story-5-4.md] - Technical specification
- [Source: FR54] - Compare SIS data functional requirement
- [Source: FR55] - Flag discrepancies functional requirement
- [Source: Story 5-3] - CSV Parsing (provides SISRecord[])
