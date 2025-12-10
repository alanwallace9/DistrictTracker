# Story 4.1: Quick Behavior Note Entry

**Status:** done
**Epic:** 4 - Behavior Documentation
**Points:** 3
**FRs:** FR45, FR46, FR48

---

## Story

As a **DAEP staff member**,
I want **to quickly add behavior notes and point adjustments from the room roster**,
So that **I can document incidents without disrupting my workflow**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Teachers need speed. The current workflow requires navigating to a student's profile to add notes - that's 3+ clicks and context-switching away from the roster they're working in. This story brings behavior documentation directly into the room roster with an inline expandable panel. Target: complete an entry in under 30 seconds without leaving the page.

---

## UX Overview

### Click Zone Behavior

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ ☐ │      STUDENT NAME (click → profile)         │ ... │ Today's │ Adjust │
│   │                                              │     │  Total  │   ▼    │
├───┴──────────────────────────────────────────────┴─────┴─────────┴────────┤
│ ☐ │ Smiley, Sara        9   Pending   P▾   67%   30d    28/28   │   ▼    │
│   │ ID: 7654321                                                  │        │
│   │ ←────── Click = Go to profile ──────→                        │ Expand │
└──────────────────────────────────────────────────────────────────┴────────┘
```

| Click Zone | Action |
|------------|--------|
| Checkbox | Select for bulk actions |
| Student name/row | Navigate to student profile page |
| ▼ Chevron (Adjust column) | Expand/collapse inline panel |

### Expanded Inline Panel

When the ▼ chevron is clicked, an inline panel expands below the student row showing:
1. **Add Entry Form** - Points adjustment, Student Action, Teacher Action, Notes
2. **Recent Activity** - Last 5 entries (points, notes, attendance) in compact format

### Bulk Selection Toolbar

When 1+ students are selected, a floating toolbar appears with:
- Quick point buttons: [-15] [-10] [-5] [0] [+5]
- [+ Detailed...] button for bulk entry with actions & notes
- [Clear] to deselect all

---

## Acceptance Criteria

| AC | Description | Status | Test |
|----|-------------|--------|------|
| 4.1.1 | Click ▼ chevron expands inline panel | Pending | Click chevron, verify panel slides down |
| 4.1.2 | Click ▲ chevron collapses panel | Pending | Click again, verify panel slides up |
| 4.1.3 | Click student name navigates to profile | Pending | Click name, verify navigation |
| 4.1.4 | Entry form shows Points, Student Action, Teacher Action, Notes | Pending | Expand panel, verify fields |
| 4.1.5 | Save creates point entry with actions | Pending | Save entry, verify in DB |
| 4.1.6 | Recent Activity shows last 5 items | Pending | Verify 5 items displayed |
| 4.1.7 | Recent Activity uses compact single-line style | Pending | Verify styling matches spec |
| 4.1.8 | "View All" links to student profile Activity tab | Pending | Click link, verify navigation |
| 4.1.9 | Bulk selection shows quick point buttons in toolbar | Pending | Select 2+, verify toolbar |
| 4.1.10 | Quick point button applies points to all selected | Pending | Click [-5], verify all get -5 pts |
| 4.1.11 | Incident date/time auto-populated and editable | Pending | Modify date, verify saved correctly |
| 4.1.12 | Audit trail records created_at separately from incident_date | Pending | Check created_at unchanged on edit |

---

## Tasks / Subtasks

### Task 1: Database Migration (AC: 4.1.11, 4.1.12)

- [ ] 1.1 Create migration file `[timestamp]_behavior_notes_enhancements.sql`
  - Add `category_id UUID` FK to `daep_behavior_categories`
  - Add `incident_date DATE` (user-editable)
  - Add `incident_time TIME` (user-editable)
  - Backfill from existing `date`/`time` columns
- [ ] 1.2 Add indexes for efficient queries
  - `idx_daep_behavior_notes_placement_date` on (placement_id, date DESC, time DESC)
  - `idx_daep_behavior_notes_category` on (category_id)
- [ ] 1.3 Add RLS policies for behavior_notes
  - `behavior_notes_tenant_read` - SELECT for same tenant
  - `behavior_notes_tenant_insert` - INSERT for same tenant
  - `behavior_notes_update` - UPDATE for original staff or admin roles

### Task 2: Validation Schema Updates (AC: 4.1.4, 4.1.5)

- [ ] 2.1 Add `BehaviorNoteSchema` to `lib/validation/schemas.ts`
  - placement_id (uuid, required)
  - incident_date (YYYY-MM-DD format)
  - incident_time (HH:MM format)
  - category_id (uuid, nullable)
  - description (max 2000 chars, nullable)
  - action_taken (max 500 chars, nullable)
  - points (0-10, optional)
  - student_action (nullable)
  - teacher_action (nullable)
- [ ] 2.2 Add `RecentActivityItem` interface
  - id, type ('point_entry' | 'behavior_note' | 'attendance')
  - timestamp, summary, points, student_action, teacher_action, staff_name

### Task 3: Server Actions (AC: 4.1.5, 4.1.6, 4.1.10)

- [ ] 3.1 Create `app/actions/daep/behavior-notes.ts`
  - `createBehaviorNote()` - validates input, creates note, logs audit
  - Standard patterns: getTenantId, checkDAEPStaffRole, logDAEPAuditEvent
- [ ] 3.2 Add `getRecentActivityForPlacement()` server action
  - Fetches points, notes, attendance in parallel
  - Returns last N items combined and sorted by timestamp
  - Includes staff display names
- [ ] 3.3 Add `bulkAddBehaviorPoints()` server action
  - Input: placement_ids[], date, period, points, student_action, teacher_action, notes
  - Upserts to daep_daily_points for all placements
  - Logs audit event for bulk action
  - Revalidates /daep/rooms path

### Task 4: Create InlineStudentPanel Component (AC: 4.1.1-4.1.8)

- [ ] 4.1 Create `components/daep/roster/InlineStudentPanel.tsx`
  - Props: isExpanded, onToggle, placementId, studentName, schoolId, recentActivity, categories, onSaveEntry
  - Chevron button for expand/collapse
  - Animates open/closed smoothly
- [ ] 4.2 Implement Add Entry form
  - Points dropdown (from hardcoded POINT_ADJUSTMENTS for now)
  - Student Action select (positive + negative behavior categories)
  - Teacher Action select (neutral behavior categories)
  - Notes input field
  - Save button with loading state
- [ ] 4.3 Implement Recent Activity section
  - Compact single-line format for each item
  - Icon + points badge + summary + timestamp
  - "View All →" link to student profile Activity tab
  - Empty state: "No recent activity"

### Task 5: Create CompactActivityItem Component (AC: 4.1.7)

- [ ] 5.1 Create `components/daep/roster/CompactActivityItem.tsx`
  - Single-line format: Icon + Points Badge + Summary + Timestamp
  - Icon: Pencil for points/notes, Circle for attendance
  - Points badge: Green (positive), Red (negative), Gray (zero)
  - Timestamp: Right-aligned, relative time (Today: time, else: date)
- [ ] 5.2 Add `formatRelativeTime()` utility to `lib/utils/date.ts`
  - Today: show time (10:32 AM)
  - Yesterday: "Yesterday"
  - Within 7 days: day name (Monday)
  - Older: short date (Dec 5)

### Task 6: Update BulkActionsToolbar (AC: 4.1.9, 4.1.10)

- [ ] 6.1 Modify `components/daep/roster/BulkActionsToolbar.tsx`
  - Add quick point buttons: [-15] [-10] [-5] [0] [+5]
  - Add [+ Detailed...] button to open bulk entry modal
  - Add [Clear] button to deselect all
- [ ] 6.2 Wire up quick point buttons
  - onClick calls bulkAddBehaviorPoints() with selected placements
  - Show toast on success with count

### Task 7: Integrate with RoomRosterTable (AC: 4.1.1-4.1.3)

- [ ] 7.1 Modify `components/daep/roster/RoomRosterTable.tsx`
  - Add expanded state tracking per student (Map<placementId, boolean>)
  - Add "Adjust" column with chevron button
  - Render InlineStudentPanel when expanded
  - Fetch behavior categories once for all rows
- [ ] 7.2 Fetch recent activity when panel expands
  - Call getRecentActivityForPlacement() on expand
  - Cache results to avoid re-fetching on collapse/expand

### Task 8: Update Student Profile Activity Timeline (AC: 4.1.7)

- [ ] 8.1 Update `components/daep/StudentPointsLog.tsx`
  - Replace card layout with compact single-line format
  - Use CompactActivityItem component for consistency
  - Keep edit button on hover for admin users
  - Keep date filter dropdown and Export button

### Task 9: Testing

- [ ] 9.1 Test inline panel expand/collapse
- [ ] 9.2 Test entry form saves correctly to DB
- [ ] 9.3 Test recent activity displays last 5 items
- [ ] 9.4 Test bulk selection toolbar appears
- [ ] 9.5 Test quick point buttons apply to all selected
- [ ] 9.6 Test click zones: name → profile, chevron → expand
- [ ] 9.7 Test Activity Timeline uses same compact style
- [ ] 9.8 Verify TypeScript compilation
- [ ] 9.9 Verify Playwright MCP - full flow test

---

## Dev Notes

### Point Adjustment Values

**For now, use hardcoded values (future story will add settings):**
```typescript
const POINT_ADJUSTMENTS = [
  { value: 10, label: '+10' },
  { value: 5, label: '+5' },
  { value: 0, label: '0 (Note Only)' },
  { value: -5, label: '-5' },
  { value: -10, label: '-10' },
  { value: -15, label: '-15' },
];
```

### Student & Teacher Actions

**Source:** Behavior Categories from `/daep/settings/behaviors` (existing from Story 1.10)

```typescript
// Student Actions = positive + negative categories
const studentActions = categories.filter(
  c => c.category_type === 'positive' || c.category_type === 'negative'
);

// Teacher Actions = neutral categories
const teacherActions = categories.filter(c => c.category_type === 'neutral');
```

### Timestamp Handling

| Field | Editable | Purpose |
|-------|----------|---------|
| `incident_date` | Yes | When behavior happened (user can backdate) |
| `incident_time` | Yes | Time it happened |
| `created_at` | No (auto) | Audit: when note was recorded in system |
| `updated_at` | No (auto) | Audit: last modification |
| `staff_member` | No (auto) | Audit: who recorded it |

### Recent Activity Query Pattern

```typescript
// Fetch points, notes, and attendance in parallel
const [pointsResult, notesResult, attendanceResult] = await Promise.all([
  supabase.from('daep_daily_points').select(...).eq('placement_id', placementId),
  supabase.from('daep_behavior_notes').select(...).eq('placement_id', placementId),
  supabase.from('daep_attendance').select(...).eq('placement_id', placementId),
]);

// Combine, sort by timestamp, return top N
```

### Watch Out For

1. **Click zone conflicts** - Ensure chevron click doesn't trigger row click
2. **Performance** - Fetch recent activity lazily (only when panel expands)
3. **Category loading** - Fetch behavior categories once, pass to all panels
4. **Mobile responsiveness** - Panel form may need to stack on small screens

---

## Out of Scope

| Item | Story |
|------|-------|
| Full behavior notes list page | Story 4-3 |
| Attach notes without placement | Story 4-4 |
| Full unified timeline with all event types | Story 4-5 |
| Edit/delete inline entries | Future |
| Point adjustment settings page | Future |

---

## Dependencies

- Story 1.10 (Behavior Categories) - **DONE**
- Epic 2 (Placements) - **DONE**
- Story 3-2 (Point Entry Grid) - **DONE**
- Story 3-3 (Bulk Point Entry) - **DONE**
- Story 3-4 (Point Notes/Comments) - **DONE**

---

## Definition of Done

- [ ] Click chevron expands inline panel below student row
- [ ] Entry form has Points, Student Action, Teacher Action, Notes
- [ ] Save creates point entry in DB with all fields
- [ ] Recent Activity shows last 5 items in compact format
- [ ] "View All" links to student profile Activity tab
- [ ] Bulk selection shows quick point buttons
- [ ] Quick point buttons apply to all selected students
- [ ] Student profile Activity tab uses same compact style
- [ ] TypeScript compiles without errors
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-story-4-1.md`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## References

- [Source: docs/reference/epics-part2.md#Story-4.1] - Epic definition
- [Source: docs/sprint-artifacts/daep/tech-spec-story-4-1.md] - Technical specification
- [Source: components/daep/roster/RoomRosterTable.tsx] - Room roster to modify
- [Source: components/daep/roster/BulkActionsToolbar.tsx] - Bulk toolbar to update
- [Source: app/actions/daep/points.ts] - Existing points server actions
- [Source: lib/validation/schemas.ts] - Validation schemas
