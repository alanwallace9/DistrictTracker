# Story 4-3: Behavior Notes List View

**Epic:** 4 - Behavior Documentation
**Points:** 3
**Status:** ready-for-dev
**FRs:** FR49

---

## User Story

**As a** DAEP administrator,
**I want to** view, filter, sort, and export all behavior notes across students,
**So that** I can review behavior documentation, identify patterns, and generate reports.

---

## Acceptance Criteria

### Core Features
- [ ] **AC 4.3.1:** Behavior notes page at `/daep/behavior-notes`
- [ ] **AC 4.3.2:** List shows 7 columns: Date/Time, Student, Campus, Category, Description, Staff, Verified
- [ ] **AC 4.3.3:** Filter by student (search by name, ID, or description)
- [ ] **AC 4.3.4:** Filter by category type (All, Positive, Negative, Neutral)
- [ ] **AC 4.3.5:** Filter by staff member (dropdown of staff who created notes)
- [ ] **AC 4.3.6:** Filter by date range (From/To date pickers)
- [ ] **AC 4.3.7:** Filter by campus (dropdown of home campuses)
- [ ] **AC 4.3.8:** Sort by any column (click header toggles asc/desc with arrow indicator)
- [ ] **AC 4.3.9:** Default sort by date (newest first)
- [ ] **AC 4.3.10:** Click row to view full note detail in slide-out sheet
- [ ] **AC 4.3.11:** Pagination (25 per page) with "Showing X-Y of Z" display
- [ ] **AC 4.3.12:** Export to CSV with 18 columns
- [ ] **AC 4.3.13:** Student name links to student profile
- [ ] **AC 4.3.14:** Verified indicator column (✓ checkmark for verified notes)
- [ ] **AC 4.3.15:** Admin access only (RLS enforced)

### UX Quick Wins
- [ ] **AC 4.3.16:** Quick filter chips: "Today", "This Week", "Negative", "My Notes" - one-click presets
- [ ] **AC 4.3.17:** Summary stats bar showing: total count, today's count, negative count, unverified count
- [ ] **AC 4.3.18:** Hover preview tooltip shows full description without clicking
- [ ] **AC 4.3.19:** "New since last visit" badge showing count of notes added since user's last visit
- [ ] **AC 4.3.20:** Inline student photo thumbnail in Student column for visual recognition

---

## Tasks

### Task 1: Database Migration
- [ ] 1.1 Create migration `*_add_behavior_notes_verification.sql`
- [ ] 1.2 Add `verified_by TEXT` column to `daep_behavior_notes`
- [ ] 1.3 Add `verified_at TIMESTAMPTZ` column
- [ ] 1.4 Add index on `verified_by` (partial index WHERE NOT NULL)
- [ ] 1.5 Apply migration via MCP

### Task 2: Validation Schemas
- [ ] 2.1 Add `BEHAVIOR_NOTES_SORT_KEYS` const array
- [ ] 2.2 Add `BehaviorNotesSortKey` type
- [ ] 2.3 Add `BehaviorNotesListQuerySchema` with filters, sorting, pagination
- [ ] 2.4 Add `BehaviorNoteListItem` interface with all fields (including campus, staff_last_name, verified, points)
- [ ] 2.5 Add `BehaviorNotesListResult` interface

### Task 3: Server Actions
- [ ] 3.1 Implement `getBehaviorNotesList(query)` with joins (placements, students, campuses, staff)
- [ ] 3.2 Implement `sortNotes()` helper for client-side sorting of joined fields
- [ ] 3.3 Implement `getBehaviorNotesStaffList()` returning `{id, name, lastName}[]`
- [ ] 3.4 Implement `getBehaviorNotesCampusList()` returning `{id, name}[]`
- [ ] 3.5 Implement `getBehaviorNoteById(noteId)` with full detail
- [ ] 3.6 Implement `exportBehaviorNotesToCSV(filters)` with 18 columns and proper escaping

### Task 4: UI Components
- [ ] 4.1 Create `BehaviorNotesFilters.tsx` with search, category, campus, staff, date filters
- [ ] 4.2 Create `BehaviorNotesTable.tsx` with sortable headers and verified column
- [ ] 4.3 Create `SortableHeader` sub-component with arrow indicators
- [ ] 4.4 Create `BehaviorNoteDetailSheet.tsx` with campus and verified badge
- [ ] 4.5 Create `components/daep/behavior-notes/index.ts` barrel export

### Task 5: Page Implementation
- [ ] 5.1 Create `app/daep/(main)/behavior-notes/page.tsx`
- [ ] 5.2 Implement filter state (search, category, campus, staff, dates)
- [ ] 5.3 Implement sort state (key, direction)
- [ ] 5.4 Implement pagination state
- [ ] 5.5 Wire up data fetching with all filters and sorting
- [ ] 5.6 Implement CSV export with download trigger
- [ ] 5.7 Implement detail sheet open/close

### Task 6: Navigation
- [ ] 6.1 Add "Behavior Notes" link to DAEP sidebar navigation

### Task 7: UX Quick Wins
- [ ] 7.1 Create `QuickFilterChips` component with "Today", "This Week", "Negative", "My Notes" presets
- [ ] 7.2 Create `SummaryStatsBar` component showing total/today/negative/unverified counts
- [ ] 7.3 Add `getBehaviorNotesStats()` server action for summary counts
- [ ] 7.4 Add hover tooltip on Description cell showing full text (use Tooltip component)
- [ ] 7.5 Track user's last visit timestamp in localStorage
- [ ] 7.6 Add "X new" badge next to page title when notes added since last visit
- [ ] 7.7 Add student photo thumbnail using existing avatar pattern (fallback to initials)

### Task 8: Testing & Verification
- [ ] 8.1 Verify TypeScript compilation passes
- [ ] 8.2 Test all filters individually and combined
- [ ] 8.3 Test quick filter chips apply correct filters
- [ ] 8.4 Test sorting on each column
- [ ] 8.5 Test pagination navigation
- [ ] 8.6 Test CSV export content (18 columns, proper escaping)
- [ ] 8.7 Test "new since last visit" badge updates correctly
- [ ] 8.8 Playwright MCP visual verification

---

## Technical Notes

### Table Columns (7 total, 6 sortable)

| Column | Width | Sortable | Description |
|--------|-------|----------|-------------|
| Date/Time | 100px | ✅ | Incident date + time (Dec 9 3:45p) |
| Student | 120px | ✅ | "Last, F." linked to profile |
| Campus | 90px | ✅ | Home campus name |
| Category | 100px | ✅ | Badge with color (Positive/Negative/Neutral) |
| Description | flex | ❌ | Truncated to 40 chars |
| Staff | 80px | ✅ | Staff last name |
| ✓ | 40px | ✅ | Checkmark if verified |

### CSV Export Columns (18 total)

1. Student Name
2. Student ID
3. Date
4. Time
5. Home Campus
6. Category
7. Category Type
8. Student Action
9. Teacher Action
10. Points
11. Description
12. Action Taken
13. Staff Last Name
14. Staff Full Name
15. Verified (Yes/No)
16. Verified At
17. Recorded At
18. Last Updated

### Sort Implementation

- Date sorting done server-side via Supabase `.order()`
- Other columns sorted client-side via `sortNotes()` helper after fetch
- Sort state: `{ key: BehaviorNotesSortKey, direction: 'asc' | 'desc' }`
- Default: `{ key: 'date', direction: 'desc' }`

### Category Type Styling

```typescript
const CATEGORY_TYPE_STYLES = {
  positive: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  negative: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  neutral: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};
```

### UX Quick Wins Implementation

**Quick Filter Chips:**
```typescript
const QUICK_FILTERS = [
  { label: 'Today', filter: { date_from: today, date_to: today } },
  { label: 'This Week', filter: { date_from: weekStart, date_to: today } },
  { label: 'Negative', filter: { category_type: 'negative' } },
  { label: 'My Notes', filter: { staff_id: currentUserId } },
];
```

**Summary Stats Bar:**
- New server action `getBehaviorNotesStats()` returns: `{ total, today, negative, unverified }`
- Display as: "142 total • 23 today • 45 negative • 12 unverified"
- Stats update when filters change (filtered stats, not global)

**Hover Preview:**
- Use shadcn `Tooltip` component on Description cell
- Show full description text on hover (max 500 chars)

**New Since Last Visit:**
- Store `lastVisit` timestamp in `localStorage` key: `daep_behavior_notes_last_visit`
- Query notes where `created_at > lastVisit`
- Show badge: "12 new" next to page title
- Update `lastVisit` on page load

**Student Photo:**
- Query `trespass_records.photo_url` via placement join
- Use existing Avatar component pattern with initials fallback
- Size: 24x24px in table row

---

## Dev Notes

- **Tech Spec:** `docs/sprint-artifacts/daep/tech-spec-story-4-3.md`
- **Existing patterns:** Follow `StudentFilters.tsx` for filter layout, `StudentsPage` for list pattern
- **Verified columns** are future-ready - actual verification workflow will be a separate story
- **Campus filter** queries unique home campuses from placements with behavior notes
- **Staff filter** sorted by last name for easier lookup

---

## Dependencies

- [x] Story 4-1: Quick Behavior Note Modal (DONE)
- [x] Story 4-2: Predefined Behavior Categories (DONE - part of 4-1)
- [x] Epic 1: Core Schema & Security (DONE)
- [x] Epic 2: Placement Management (DONE)

---

## Out of Scope

| Item | Future Story |
|------|--------------|
| Edit/delete notes | Future enhancement |
| Verify notes (admin action) | Future enhancement |
| Attach notes without placement | Story 4-4 |
| Full timeline integration | Story 4-5 |
| Bulk actions on notes | Future enhancement |

---

## File Changes

| File | Action |
|------|--------|
| `supabase/migrations/*_add_behavior_notes_verification.sql` | Create |
| `lib/validation/schemas.ts` | Modify |
| `app/actions/daep/behavior-notes.ts` | Modify (add 6 server actions) |
| `app/daep/(main)/behavior-notes/page.tsx` | Create |
| `components/daep/behavior-notes/BehaviorNotesFilters.tsx` | Create |
| `components/daep/behavior-notes/BehaviorNotesTable.tsx` | Create |
| `components/daep/behavior-notes/BehaviorNoteDetailSheet.tsx` | Create |
| `components/daep/behavior-notes/QuickFilterChips.tsx` | Create |
| `components/daep/behavior-notes/SummaryStatsBar.tsx` | Create |
| `components/daep/behavior-notes/index.ts` | Create |
| Navigation component | Modify |

---

_Story Version: 1.1_
_Created: 2025-12-10_
_Updated: 2025-12-10 - Added UX Quick Wins (AC 4.3.16-20, Task 7)_
_Tech Spec: v1.2_
