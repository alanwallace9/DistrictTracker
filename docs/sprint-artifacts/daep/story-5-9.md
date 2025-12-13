# Story 5-9: Reconciliation Summary Report

**Status:** drafted
**Epic:** 5 - CSV Reconciliation
**Points:** 3
**FRs:** FR61
**Dependencies:** Story 5-5 (Reconciliation Review - Combined), Story 5-8 (Audit Trail)

---

## Story

As a **DAEP administrator**,
I want **a summary report when reconciliation is complete showing all results, resolution breakdown, and export to PDF**,
So that **I have documentation for compliance and can reference historical reconciliation decisions**.

---

## Design Philosophy

> "How did they ever do their job without this?"

When you're done reconciling, you need proof of what happened. This summary is your receipt - shows exactly what matched, what you changed, and who did what. One click to download a PDF for your records. No more manually documenting reconciliation sessions.

---

## Reference Mockup

**Source:** `docs/sprint-artifacts/daep/tech-spec-story-5-9.md` - Summary Report Structure

```
+---------------------------------------------------------------------+
|           SIS RECONCILIATION SUMMARY REPORT                          |
|                                                                      |
|  Session: skyward-export-2025-11-15.csv                             |
|  Completed: November 15, 2025 at 2:45 PM                            |
|  Completed By: admin@birdville.edu                                  |
|  Duration: 12 minutes                                               |
+---------------------------------------------------------------------+
|                                                                      |
|  OVERALL RESULTS                                                     |
|  Total Records: 73                                                   |
|  +--------------+--------------+--------------+--------------+      |
|  | Matched      | Conflicts    | New in SIS   | Missing      |      |
|  |    67        |      4       |      2       |      0       |      |
|  +--------------+--------------+--------------+--------------+      |
|                                                                      |
|  RESOLUTION BREAKDOWN                                                |
|  Accept SIS: 3 | Keep DAEP: 3                                       |
|                                                                      |
+---------------------------------------------------------------------+
|  DISCREPANCIES RESOLVED (6)                                          |
|  +----------------------------------------------------------------+ |
|  | Student    | Type      | Field      | SIS    | DAEP   | Accepted   | Note     |
|  +------------+-----------+------------+--------+--------+------------+----------|
|  | John Smith | Conflict  | Start Date | Nov 10 | Nov 9  | SIS (Nov 10)| Date fix|
|  | Jane Doe   | Conflict  | Days       | 45     | 30     | DAEP (30)   | Manual  |
|  | Mike Brown | Conflict  | Offense    | 03     | 02     | SIS (03)    |         |
|  | Bob Johnson| New in SIS| —          | —      | —      | Created     |         |
|  | Sarah W.   | New in SIS| —          | —      | —      | Created     |         |
|  | Lisa Chen  | Missing   | —          | —      | —      | Keep Record | Enrolled|
|  +----------------------------------------------------------------+ |
|                                                                      |
|  MATCHED RECORDS (67)                                                |
|  +----------------------------------+                                |
|  | Student          | Campus        |                                |
|  +------------------+---------------+                                |
|  | Alex Martinez    | Lincoln HS    |                                |
|  | Jordan Williams  | Washington MS |                                |
|  | Taylor Adams     | Lincoln HS    |                                |
|  | ... (all 67)     |               |                                |
|  +----------------------------------+                                |
|                                                                      |
|  [Download PDF]  [View Audit Log]  [Back to Reconciliation]         |
+---------------------------------------------------------------------+
```

**Note:** For field conflicts with multiple fields changed, each field gets its own row (student may appear multiple times).

---

## Acceptance Criteria

| AC | Description | Status | Test |
|----|-------------|--------|------|
| 5.9.1 | Summary displays when session status = 'completed' | Pending | Complete all discrepancies, verify summary shows |
| 5.9.2 | Show total metrics: total records, matched, conflicts resolved, new added, missing reviewed | Pending | Verify counts match session data |
| 5.9.3 | Resolution breakdown: Accept SIS count vs Keep DAEP count | Pending | Verify breakdown math correct |
| 5.9.4 | Export to PDF (dynamic import for performance) | Pending | Click Download PDF, verify file downloads |
| 5.9.5 | PDF includes session details, metrics, breakdown | Pending | Open PDF, verify all sections present |
| 5.9.6 | Detailed resolutions table shows each decision | Pending | Verify student name, type, resolution, note |
| 5.9.7 | "View Audit Log" links to audit history for session | Pending | Click link, verify audit events display |
| 5.9.8 | Duration calculated from upload to completion | Pending | Verify minutes calculation correct |
| 5.9.9 | Completed by shows user email who finished | Pending | Verify correct user displayed |

---

## Tasks / Subtasks

### Task 1: Server Action - getReconciliationSummary

- [ ] 1.1 Add `ReconciliationSummary` interface to `lib/validation/schemas.ts`
  - sessionId, fileName, uploadDate, completedAt
  - completedBy, completedByEmail, durationMinutes
  - totalRecords, matchedCount, conflictCount, newInSISCount, missingFromSISCount
  - acceptedSISCount, keptDAEPCount, newPlacementsCreated, missingFlagged
  - resolutions: ResolutionDetail[]
- [ ] 1.2 Add `ResolutionDetail` interface
  - studentId, studentName, discrepancyType, resolution, note, changedFields, resolvedAt
- [ ] 1.3 Implement `getReconciliationSummary(sessionId)` in `reconciliation.ts`
  - Fetch session data
  - Fetch all discrepancies with resolutions
  - Get user info for completedBy
  - Calculate duration from upload_date to completed_at
  - Count Accept SIS vs Keep DAEP resolutions
  - Return populated ReconciliationSummary

### Task 2: PDF Generator with Dynamic Import

- [ ] 2.1 Create `lib/utils/daep/pdf-generator.ts`
  - Use async function with dynamic imports (jsPDF ~29MB)
  - NO static imports for jsPDF or jspdf-autotable
- [ ] 2.2 Implement `generateReconciliationPDF(summary)` function
  - Header: Title, session details
  - Overall Results table: counts for each category
  - Resolution Breakdown table: Accept SIS vs Keep DAEP
  - Detailed Resolutions table (if <= 20 items)
  - Return Blob for download

### Task 3: Summary Report Component

- [ ] 3.1 Create `app/daep/(main)/reconciliation/[sessionId]/components/summary-report.tsx`
  - Success header with checkmark icon
  - Session details card: File, Completed, Completed By, Duration
  - Four stats cards: Matched (green), Conflicts (yellow), New (blue), Missing (red)
- [ ] 3.2 Add Resolution Breakdown section
  - Two cards: Accept SIS count, Keep DAEP count
  - Description text under each count
- [ ] 3.3 Add Detailed Resolutions table
  - Columns: Student, Type, Resolution, Note, Resolved
  - Inline type badge using Badge component
  - formatDistanceToNow for resolved timestamp

### Task 4: Action Buttons

- [ ] 4.1 Implement Download PDF button
  - Dynamic import of pdf-generator on click
  - Create blob URL and trigger download
  - Show loading state while generating
- [ ] 4.2 Add View Audit Log button
  - Navigate to session with audit panel expanded
  - Or open inline audit history (reuse Story 5-8)
- [ ] 4.3 Add Back to Reconciliation button
  - Navigate to `/daep/reconciliation`

### Task 5: Integrate with Session Page

- [ ] 5.1 Update `[sessionId]/page.tsx` to handle 'completed' status
  - Load summary data via getReconciliationSummary
  - Render SummaryReport component instead of basic Alert
- [ ] 5.2 Add loading state for summary fetch
- [ ] 5.3 Handle edge case: all matched (no discrepancies)
  - Show simplified success: "All X records matched perfectly!"

### Task 6: Testing

- [ ] 6.1 Complete a reconciliation session (resolve all discrepancies)
- [ ] 6.2 Verify summary displays with correct counts
- [ ] 6.3 Verify resolution breakdown math
- [ ] 6.4 Test PDF download works (dynamic import)
- [ ] 6.5 Verify PDF contains all sections
- [ ] 6.6 Test duration calculation
- [ ] 6.7 Test "all matched" edge case
- [ ] 6.8 TypeScript compilation
- [ ] 6.9 Playwright MCP verification

---

## Dev Notes

### Performance: Dynamic Imports Required

Per CLAUDE.md, jsPDF (~29MB) MUST use dynamic imports:

```typescript
// WRONG - Static import bloats initial page load
import jsPDF from 'jspdf';

// CORRECT - Dynamic import on demand
const handleDownloadPDF = async () => {
  const { generateReconciliationPDF } = await import('@/lib/utils/daep/pdf-generator');
  const blob = await generateReconciliationPDF(summary);
  // ... trigger download
};
```

### Inline Type Badge Helper

```typescript
function getTypeBadge(type: DiscrepancyType) {
  const config: Record<DiscrepancyType, { label: string; variant: string }> = {
    matched: { label: 'Matched', variant: 'default' },
    field_conflict: { label: 'Conflict', variant: 'secondary' },
    new_in_sis: { label: 'New in SIS', variant: 'outline' },
    missing_from_sis: { label: 'Missing', variant: 'destructive' },
  };
  const { label, variant } = config[type];
  return <Badge variant={variant}>{label}</Badge>;
}
```

### Duration Calculation & Format

```typescript
const uploadTime = new Date(session.upload_date).getTime();
const completedTime = new Date(session.completed_at).getTime();
const totalMinutes = Math.round((completedTime - uploadTime) / 60000);

// Format as plain English
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hourStr = `${hours} hour${hours !== 1 ? 's' : ''}`;
  if (mins === 0) return hourStr;
  return `${hourStr} ${mins} minute${mins !== 1 ? 's' : ''}`;
}
// Examples: "12 minutes", "1 hour", "1 hour 15 minutes", "2 hours 30 minutes"
```

### PDF Structure - Discrepancy Table

Each discrepancy row must include:
- Student name
- Type (Conflict, New in SIS, Missing)
- Field name (for conflicts)
- SIS Value
- DAEP Value
- Accepted (e.g., "SIS (Nov 10)" or "DAEP (30)")
- Note

For multi-field conflicts, one row per field (student appears multiple times).

---

## Edge Cases

| Case | Handling |
|------|----------|
| All records matched | Show simplified success, no detailed resolutions table |
| Very long session (hours) | Display hours + minutes: "2 hours, 15 minutes" |
| PDF with 50+ resolutions | Paginate or limit to first 20 with note |
| Session completed but no completed_at | Use current timestamp |
| No resolutions (edge case) | Show "No discrepancies were found" |

---

## Out of Scope

| Item | Reason |
|------|--------|
| Email summary (AC 5.9.6 original) | Deferred - no email service configured |
| Excel export | Future enhancement |
| Print-friendly CSS | Future enhancement |

---

## Dependencies

- Story 5-5 (Combined) - Provides completed reconciliation sessions
- Story 5-8 - Audit trail data available for "View Audit Log"
- `daep_reconciliation_sessions` table - Session status and completion data
- `daep_reconciliation_discrepancies` table - Resolution records
- `user_profiles` table - User email lookup

---

## Definition of Done

- [ ] Summary report displays when session status = 'completed'
- [ ] Shows all metrics: total, matched, conflicts, new, missing
- [ ] Shows resolution breakdown: Accept SIS vs Keep DAEP counts
- [ ] Detailed resolutions table displays each decision
- [ ] PDF download works with dynamic import (no bundle bloat)
- [ ] PDF includes all summary sections
- [ ] Duration calculated correctly
- [ ] Completed by shows correct user
- [ ] "All matched" case handled gracefully
- [ ] TypeScript compiles without errors
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-story-5-9.md` - Technical specification
- `docs/sessions/ux-design-specification.md` - Section 5.2
- `app/daep/(main)/reconciliation/[sessionId]/page.tsx` - Existing session page

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### File List

**New Files:**
- `app/daep/(main)/reconciliation/[sessionId]/components/summary-report.tsx`
- `lib/utils/daep/pdf-generator.ts`

**Modified Files:**
- `app/actions/daep/reconciliation.ts` - Add getReconciliationSummary
- `lib/validation/schemas.ts` - Add ReconciliationSummary, ResolutionDetail types
- `app/daep/(main)/reconciliation/[sessionId]/page.tsx` - Handle completed status

---

## References

- [Source: docs/sprint-artifacts/daep/tech-spec-story-5-9.md] - Technical specification
- [Source: FR61] - Summary report requirement
- [Source: CLAUDE.md] - Performance guidelines (dynamic imports)
