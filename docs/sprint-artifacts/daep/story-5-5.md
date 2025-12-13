# Story 5-5: Reconciliation Review Page (Combined)

**Status:** drafted
**Epic:** 5 - CSV Reconciliation
**Points:** 8
**FRs:** FR56, FR57, FR58, FR59
**Dependencies:** Story 5-4 (Comparison Engine)
**Combines:** Original 5-5 (Categorization), 5-6 (Side-by-Side UI), 5-7 (Resolution Actions)

---

## Story

As a **DAEP administrator**,
I want **a single-page reconciliation review where I can see SIS vs DAEP data side-by-side and resolve each discrepancy with one click**,
So that **I can quickly reconcile my data without navigating between multiple screens**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Banking-style reconciliation on a single page. Upload CSV, see what matches and what doesn't, click Accept or Keep for each conflict, done. No extra screens, no unnecessary clicks. The summary stays visible while you work through discrepancies one by one.

---

## Reference Mockup

**Source:** `docs/sessions/ux-design-directions.html` → Reconciliation tab

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CSV Reconciliation                        [Upload New CSV] [Accept All Matches]│
│ Last import: Nov 24, 2025 7:15 AM • 5 discrepancies found                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Discrepancy 1 of 5   [Start Date Mismatch]        [← Previous] [Next →]    │
│                                                                              │
│                    ┌─────┐                                                   │
│                    │ JM  │  Jordan Martinez                                  │
│                    └─────┘  STU-2024-001 • Lincoln HS                        │
│                                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐         │
│  │ SIS Data ({SIS Name} Export) │  │ DAEP Data (Current Record)   │         │
│  ├──────────────────────────────┤  ├──────────────────────────────┤         │
│  │ Student ID    STU-2024-001   │  │ Student ID    STU-2024-001   │         │
│  │ Name          Jordan Martinez│  │ Name          Jordan Martinez│         │
│  │ Start Date    Nov 10, 2025 ⚠️│  │ Start Date    Nov 9, 2025  ⚠️│         │
│  │ Days Assigned 45             │  │ Days Assigned 45             │         │
│  │ Offense Code  02             │  │ Offense Code  02             │         │
│  └──────────────────────────────┘  └──────────────────────────────┘         │
│                                                                              │
│  [Accept SIS (Nov 10)]  [Keep DAEP (Nov 9)]  [Add note (optional)...]       │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Reconciliation Summary                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                │
│  │    142     │ │     5      │ │     3      │ │     1      │                │
│  │  Matched   │ │Discrepancies│ │ New in SIS │ │Missing SIS │                │
│  │   (gray)   │ │  (yellow)  │ │   (blue)   │ │   (red)    │                │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Wins (UX Improvements) - ALL INCLUDED

| Quick Win | UX Benefit | Effort | Status |
|-----------|------------|--------|--------|
| **"Accept All Matches" button** | One click to auto-resolve all matched records (skip to actual conflicts) | Low | ✅ Include |
| **Discrepancy type badge** | "Start Date Mismatch" badge tells you what's wrong before reading details | Low | ✅ Include |
| **Conflict field highlighting** | Yellow/red highlight on mismatched values - eye goes right to the problem | Low | ✅ Include |
| **Smart button labels** | "Accept SIS (Nov 10)" shows the value you're accepting - no guessing | Low | ✅ Include |
| **Progress persistence** | "Discrepancy 3 of 5" - know exactly where you are, can leave and resume | Low | ✅ Include |
| **Inline note field** | Add note without opening modal - one less click | Low | ✅ Include |
| **Keyboard shortcuts** | S = Accept SIS, D = Keep DAEP, → = Next, ← = Previous | Medium | ✅ Include |
| **Auto-advance after resolution** | After clicking Accept/Keep, automatically show next discrepancy | Low | ✅ Include |
| **Dynamic SIS label** | Shows "Skyward Export" / "Focus Export" based on saved mapping | Low | ✅ Include |

---

## Acceptance Criteria

| AC | Description | Status | Test |
|----|-------------|--------|------|
| 5.5.1 | Review page at `/daep/reconciliation/[sessionId]` | Pending | Navigate to page after comparison |
| 5.5.2 | Summary cards show counts (Matched, Discrepancies, New, Missing) | Pending | Verify counts match comparison results |
| 5.5.3 | Color-coded summary cards (gray/yellow/blue/red) | Pending | Visual verification |
| 5.5.4 | Side-by-side layout: SIS left, DAEP right | Pending | Upload CSV with conflicts, verify layout |
| 5.5.5 | Conflicting fields highlighted (yellow background) | Pending | Create date mismatch, verify highlight |
| 5.5.6 | Student name/ID/campus prominent at top | Pending | Visual verification |
| 5.5.7 | Discrepancy type badge (e.g., "Start Date Mismatch") | Pending | Create conflicts, verify badges |
| 5.5.8 | Previous/Next navigation | Pending | Navigate through multiple discrepancies |
| 5.5.9 | Progress indicator "Discrepancy X of Y" | Pending | Verify count updates |
| 5.5.10 | "Accept SIS" button with value in label | Pending | Click Accept SIS, verify data updated |
| 5.5.11 | "Keep DAEP" button with value in label | Pending | Click Keep DAEP, verify SIS data ignored |
| 5.5.12 | Inline note field (optional) | Pending | Add note, verify saved with resolution |
| 5.5.13 | Auto-advance to next discrepancy after resolution | Pending | Resolve one, verify auto-advance |
| 5.5.14 | "Accept All Matches" bulk action | Pending | Click, verify matched records resolved |
| 5.5.15 | Completion state when all resolved | Pending | Resolve all, verify success message |
| 5.5.16 | "New in SIS" shows empty DAEP column | Pending | Upload CSV with new student |
| 5.5.17 | "Missing from SIS" shows empty SIS column | Pending | Have placement not in CSV |
| 5.5.18 | Dynamic SIS label from mapping | Pending | Verify "Skyward Export" / "Focus Export" based on config |
| 5.5.19 | Cannot skip discrepancies - must resolve all | Pending | Verify no way to proceed without resolving |

---

## Tasks / Subtasks

### Task 1: Page Structure & Routing

- [ ] 1.1 Create page at `app/daep/(main)/reconciliation/[sessionId]/page.tsx`
- [ ] 1.2 Add session validation (verify session exists, belongs to tenant)
- [ ] 1.3 Redirect to `/daep/reconciliation` if session not found
- [ ] 1.4 Load session data and discrepancies on mount

### Task 2: Summary Cards Component

- [ ] 2.1 Create `ReconciliationSummary` component
  - Four cards: Matched (gray), Discrepancies (yellow), New in SIS (blue), Missing (red)
  - Display counts from session data
  - Fixed position at bottom of page
- [ ] 2.2 Add color theme constants for categories
- [ ] 2.3 Update counts in real-time as resolutions happen

### Task 3: Comparison Card Component

- [ ] 3.1 Create `DiscrepancyCard` component
  - Header: Student avatar, name, ID, home campus
  - Discrepancy type badge
  - Progress indicator "Discrepancy X of Y"
  - Prev/Next buttons
- [ ] 3.2 Create `SideBySideComparison` component
  - Two-column grid layout
  - SIS Data (left) with "Skyward Export" label
  - DAEP Data (right) with "Current Record" label
  - Row for each field (Student ID, Name, Start Date, Days Assigned, Offense Code)
- [ ] 3.3 Add conflict highlighting
  - Compare field values
  - Yellow background on mismatched rows
  - Show both values clearly

### Task 4: Resolution Actions

- [ ] 4.1 Create `ResolutionActions` component
  - "Accept SIS" button (blue) with value in label
  - "Keep DAEP" button (outline) with value in label
  - Inline note text input (optional)
- [ ] 4.2 Implement `resolveDiscrepancy` server action
  - Accept resolution type ('accept_sis' | 'keep_daep')
  - Store note if provided
  - Update discrepancy record with resolution
  - Update placement record if Accept SIS
  - Log to audit trail
- [ ] 4.3 Auto-advance to next discrepancy after resolution
  - If more discrepancies, show next
  - If last one, show completion state

### Task 5: Special Cases UI

- [ ] 5.1 Handle "New in SIS" display
  - SIS column shows data
  - DAEP column shows "Not in DAEP" placeholder
  - "Create Placement" button creates new placement from SIS data
  - "Dismiss" button marks as reviewed (student not being added)
  - **Must choose one to continue** - no skipping
- [ ] 5.2 Handle "Missing from SIS" display
  - SIS column shows "Not in SIS Export" placeholder
  - DAEP column shows current data
  - "Keep Record" confirms DAEP record is correct (student still enrolled)
  - "Remove Placement" marks placement as ended (student no longer in DAEP)
  - **Must choose one to continue** - no skipping

### Task 6: Bulk Actions

- [ ] 6.1 Implement "Accept All Matches" button
  - Auto-resolve all 'matched' type discrepancies
  - Update session stats
  - Refresh view to show remaining discrepancies
- [ ] 6.2 Add confirmation dialog for bulk action
  - "This will auto-accept 142 matched records. Continue?"

### Task 7: Navigation & State

- [ ] 7.1 Implement Previous/Next navigation
  - Track current index in URL params or state
  - Disable Previous on first item
  - Disable Next on last item
- [ ] 7.2 Add keyboard shortcuts
  - ArrowLeft: Previous
  - ArrowRight: Next
  - S key: Accept SIS
  - D key: Keep DAEP
- [ ] 7.3 Persist progress (resume where left off)
  - Store current index in session record
  - On page load, start from first unresolved

### Task 8: Completion State

- [ ] 8.1 Create completion UI
  - "All Discrepancies Resolved!" message
  - Summary: X accepted from SIS, Y kept DAEP
  - "View Summary Report" button (links to 5-9)
  - "Upload Another CSV" button
- [ ] 8.2 Update session status to 'completed'

### Task 9: Testing

- [ ] 9.1 Test side-by-side layout displays correctly
- [ ] 9.2 Test conflict highlighting on mismatched fields
- [ ] 9.3 Test Accept SIS updates placement data
- [ ] 9.4 Test Keep DAEP ignores SIS data
- [ ] 9.5 Test note saved with resolution
- [ ] 9.6 Test auto-advance after resolution
- [ ] 9.7 Test Previous/Next navigation
- [ ] 9.8 Test "New in SIS" creates placement
- [ ] 9.9 Test "Missing from SIS" display
- [ ] 9.10 Test "Accept All Matches" bulk action
- [ ] 9.11 Test completion state
- [ ] 9.12 Test keyboard shortcuts
- [ ] 9.13 TypeScript compilation
- [ ] 9.14 Playwright MCP verification

---

## Dev Notes

### Discrepancy Type Badge Labels

| Type | Badge Text | Color |
|------|------------|-------|
| `field_conflict` (start_date) | "Start Date Mismatch" | Yellow |
| `field_conflict` (days_assigned) | "Days Mismatch" | Yellow |
| `field_conflict` (multiple) | "Multiple Conflicts" | Yellow |
| `new_in_sis` | "New Student" | Blue |
| `missing_from_sis` | "Missing from SIS" | Red |

### Smart Button Labels

```typescript
// For field conflicts - show the specific value being chosen
"Accept SIS (Nov 10)"  // Accept the SIS start_date value
"Keep DAEP (Nov 9)"    // Keep the DAEP start_date value

// For new_in_sis
"Create Placement"     // Creates new placement from SIS data
"Dismiss"              // Student not being added, marks as reviewed

// For missing_from_sis
"Keep Record"          // Confirm DAEP record is correct (still enrolled)
"Remove Placement"     // Student no longer in DAEP, end placement
```

**Important:** User MUST resolve every discrepancy. No skip option. Cannot proceed until all resolved.

### Resolution Server Action

```typescript
export async function resolveDiscrepancy(
  sessionId: string,
  discrepancyId: string,
  resolution: 'accept_sis' | 'keep_daep' | 'create_placement' | 'dismiss' | 'remove_placement',
  note?: string
) {
  // 1. Update discrepancy record with resolution
  // 2. Based on resolution type:
  //    - accept_sis (field_conflict): Update placement with SIS values
  //    - keep_daep (field_conflict): No change to placement
  //    - create_placement (new_in_sis): Create new placement from SIS data
  //    - dismiss (new_in_sis): Mark discrepancy resolved, no placement created
  //    - keep_daep (missing_from_sis): Confirm placement is correct
  //    - remove_placement (missing_from_sis): End/deactivate placement
  // 3. Log to audit trail
  // 4. Return next unresolved discrepancy or null if all done
}
```

### Dynamic SIS Label

```typescript
// Pull SIS name from saved field mapping
const sisName = fieldMapping?.sis_name || 'SIS';  // 'Skyward', 'Focus', 'PowerSchool', etc.
const label = `${sisName} Export`;  // "Skyward Export"
```

### URL Structure

```
/daep/reconciliation                    # List of sessions
/daep/reconciliation/[sessionId]        # Review page for specific session
/daep/reconciliation/[sessionId]?d=3    # Optional: specific discrepancy index
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| All records matched | Show success state immediately, no discrepancies to review |
| Single discrepancy | Hide Prev/Next, show just the one card |
| Session already completed | Show read-only summary, option to re-upload |
| User navigates away mid-review | Save progress, resume on return |
| Bulk accept with no matched records | Disable button, show "No matched records" |
| Very long student name | Truncate with ellipsis, show full on hover |

---

## Out of Scope

| Item | Story |
|------|-------|
| Reconciliation audit trail report | Story 5-8 |
| Summary report / PDF export | Story 5-9 |
| Unresolved discrepancy alerts | Story 5-10 |

---

## Dependencies

- Story 5-4 (Comparison Engine) - Provides discrepancies with types and conflict details
- `daep_reconciliation_sessions` table - Session tracking
- `daep_reconciliation_discrepancies` table - Discrepancy records
- `daep_placements` table - Updated when Accept SIS

---

## Definition of Done

- [ ] Single-page reconciliation review at `/daep/reconciliation/[sessionId]`
- [ ] Summary cards show counts with correct colors (gray/yellow/blue/red)
- [ ] Side-by-side comparison with SIS left, DAEP right
- [ ] Dynamic SIS label shows "Skyward Export" / "Focus Export" based on mapping
- [ ] Conflicting fields highlighted in yellow
- [ ] Discrepancy type badge displays correctly
- [ ] Accept SIS updates placement with SIS data
- [ ] Keep DAEP preserves existing data
- [ ] Optional note saved with resolution
- [ ] Auto-advance to next discrepancy after resolution
- [ ] Previous/Next navigation works
- [ ] "Accept All Matches" bulk action works
- [ ] User cannot skip - must resolve every discrepancy to complete
- [ ] Completion state displays when all resolved
- [ ] Handles new_in_sis (Create Placement / Dismiss)
- [ ] Handles missing_from_sis (Keep Record / Remove Placement)
- [ ] Keyboard shortcuts work (S, D, arrows)
- [ ] TypeScript compiles without errors
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sessions/ux-design-directions.html` - Reconciliation mockup
- `docs/sessions/ux-design-specification.md` - Section 5.2
- Original tech specs: `tech-spec-story-5-5.md`, `tech-spec-story-5-6.md`, `tech-spec-story-5-7.md`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### File List

**New Files:**
- `app/daep/(main)/reconciliation/[sessionId]/page.tsx`
- `app/daep/(main)/reconciliation/[sessionId]/components/reconciliation-summary.tsx`
- `app/daep/(main)/reconciliation/[sessionId]/components/discrepancy-card.tsx`
- `app/daep/(main)/reconciliation/[sessionId]/components/side-by-side-comparison.tsx`
- `app/daep/(main)/reconciliation/[sessionId]/components/resolution-actions.tsx`

**Modified Files:**
- `app/actions/daep/reconciliation.ts` - Add resolveDiscrepancy, bulkAcceptMatches
- `lib/validation/schemas.ts` - Add resolution types if needed

---

## References

- [Source: docs/sessions/ux-design-directions.html] - Visual mockup
- [Source: docs/sessions/ux-design-specification.md#5.2] - UX flow
- [Source: FR56] - Categorize discrepancies
- [Source: FR57] - Side-by-side comparison
- [Source: FR58] - Resolution actions
- [Source: FR59] - Add notes to resolutions
