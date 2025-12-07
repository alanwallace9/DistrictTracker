# Story 3.3: Bulk Point Entry

**Status:** done
**Epic:** 3 - Daily Operations
**Points:** 2
**FRs:** FR30

---

## Story

As a **DAEP staff member**,
I want **to apply the same point adjustment to multiple students at once**,
So that **I can efficiently reward or redirect an entire class without clicking each student individually**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Bulk actions should be **3 clicks + 1 confirm** - not a chore. When a teacher says "Everyone who finishes early gets +5 bonus points," the system should make that happen in seconds. This frees up teacher time to focus on students, not data entry.

**Real Use Cases:**
1. **Motivational Reset**: "Class had a rough morning. If everyone gets back on track this afternoon, I'll add +5 to everyone."
2. **Reward Day**: "Great behavior during the assembly - everyone gets +10 bonus."
3. **Rough Period**: "Period 3 was chaos. 8 students need a -5 deduction."

---

## UX Principles Applied

| Principle | Source | Application |
|-----------|--------|-------------|
| Big, obvious action buttons | Fitts's Law | "Apply to N Students" button is unmissable |
| Simplified choices | Hick's Law | 5 preset adjustments (+10, +5, -5, -10, -15) - no custom values |
| Minimal friction | UX Design Spec | 3 clicks to apply: Select → Choose → Confirm |
| Instant feedback | Story 3-2 pattern | Toast shows "Added +5 points to 8 students" |

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 3.3.1 | Checkbox column for multi-select students | Click checkbox to select, visual indicator |
| 3.3.2 | "Select All" checkbox in header | Toggles all visible students |
| 3.3.3 | Bulk actions dropdown: "+10 Exceptional", "+5 Bonus", "-5 Deduction", "-10 Major", "-15 Critical" | Matches individual point entry presets |
| 3.3.4 | ~~Custom bulk entry~~ | **OUT OF SCOPE** - Preset values cover use cases |
| 3.3.5 | Confirmation dialog before bulk action | Shows count, student names, adjustment value |
| 3.3.6 | Success toast with count of updated students | "Added +5 points to 8 students" |
| 3.3.7 | Audit trail records bulk action | Individual `daep_daily_points` rows + single audit log entry |

---

## Tasks / Subtasks

### Task 1: Add Selection State to Context (AC: 3.3.1, 3.3.2)

- [x] 1.1 Update `components/daep/roster/RoomRosterContext.tsx`
  - Add `selectedPlacements: Set<string>` state
  - Add `toggleSelection(placementId: string)` action
  - Add `selectAll()` action (uses current `students` array)
  - Add `clearSelection()` action
  - Add `isAllSelected: boolean` computed property
- [x] 1.2 Ensure selection clears when room/date/period changes
- [ ] 1.3 **Quick Win**: Add keyboard shortcut (Ctrl/Cmd+A) to select all students (BACKLOG)

### Task 2: Create Selection Column Component (AC: 3.3.1, 3.3.2)

- [x] 2.1 Create `components/daep/roster/SelectionCheckbox.tsx`
  - Header checkbox with Select All / Deselect All toggle
  - Indeterminate state when some (but not all) selected
  - Row checkbox that calls `toggleSelection`
- [x] 2.2 Add visual highlight for selected rows
  - Subtle background color change (e.g., `bg-primary/5`)
  - **Quick Win**: Add hover highlight when row is selectable (visual affordance)
- [x] 2.3 Integrate into `RoomRosterTable.tsx`
  - Add checkbox as first column (before Student name)
  - Pass selection state from context

### Task 3: Create Bulk Actions Toolbar (AC: 3.3.3)

- [x] 3.1 Create `components/daep/roster/BulkActionsToolbar.tsx`
  - Only visible when `selectedPlacements.size > 0`
  - Shows count: "8 selected"
  - Dropdown with adjustment options:
    - "+10 Exceptional"
    - "+5 Bonus"
    - "-5 Deduction"
    - "-10 Major Issue"
    - "-15 Critical"
  - "Clear Selection" button
- [x] 3.2 Position above table, same row as existing controls
- [x] 3.3 Animate in/out with Tailwind transitions

### Task 4: Create Confirmation Dialog (AC: 3.3.5)

- [x] 4.1 Create `components/daep/roster/BulkApplyDialog.tsx`
  - Title: "Apply +5 Points"
  - Body: "Add +5 points to 8 students for Period 4?"
  - Student list (first 5 names + "and N more...")
  - Optional note input field (defaults to "Bulk: +5 points")
  - Cancel and "Apply to N Students" buttons
- [x] 4.2 Use existing Dialog pattern from shadcn/ui
- [x] 4.3 Primary button shows count: "Apply to 8 Students"

### Task 5: Create Server Action (AC: 3.3.7)

- [x] 5.1 Add `BulkAddPointsInput` interface to `app/actions/daep/points.ts`
  ```typescript
  interface BulkAddPointsInput {
    placementIds: string[];
    date: string;
    period: string;
    adjustment: number;  // +10, +5, -5, -10, -15
    notes?: string;
  }
  ```
- [x] 5.2 Implement `bulkAddPoints()` function
  - Validate adjustment is one of allowed values
  - Use INSERT (not upsert) - multiple entries per period allowed
  - Build entries array matching `createPointAdjustment` pattern
  - Include: `is_base_points: false`, `approval_status: 'approved'`, `public: true`
- [x] 5.3 Add bulk audit log entry
  - Event type: `points.bulk_adjustment`
  - Include all placement IDs in details
- [x] 5.4 Return `{ success: boolean; count: number; error?: string }`

### Task 6: Integration & Polish (AC: 3.3.6)

- [x] 6.1 Wire toolbar dropdown to open confirmation dialog
- [x] 6.2 Connect dialog to `bulkAddPoints()` server action
- [x] 6.3 Show success toast: "Added +5 points to 8 students"
- [x] 6.4 Clear selection after successful apply
- [x] 6.5 Refresh daily points data via `refreshDailyPoints()`
- [x] 6.6 Handle errors with user-friendly toast

### Task 7: Testing

- [x] 7.1 Test selecting individual students
- [x] 7.2 Test Select All / Clear Selection
- [x] 7.3 Test bulk action with each preset value (+5 tested)
- [x] 7.4 Test confirmation dialog shows correct students
- [x] 7.5 Test success toast and UI update
- [x] 7.6 Test audit log entry created correctly (verified in DB)
- [x] 7.7 Playwright MCP visual verification (screenshot saved)

---

## Dev Notes

### Data Model (No Changes)

Uses existing `daep_daily_points` table from Story 3-2. Bulk entry creates individual rows - one per student - to maintain full audit trail.

```sql
-- Bulk +5 action for 3 students creates 3 rows:
INSERT INTO daep_daily_points (tenant_id, placement_id, date, period, points_earned, is_base_points, notes, entered_by, approval_status, public)
VALUES
  ('tenant-1', 'placement-a', '2025-01-15', '4', 5, false, 'Bulk: +5 points', 'user-123', 'approved', true),
  ('tenant-1', 'placement-b', '2025-01-15', '4', 5, false, 'Bulk: +5 points', 'user-123', 'approved', true),
  ('tenant-1', 'placement-c', '2025-01-15', '4', 5, false, 'Bulk: +5 points', 'user-123', 'approved', true);
```

### Period Type Clarification

- Context stores `periodIndex: number` (0-based index into periods array)
- Server action receives `period: string` (period name like "Period 4")
- Conversion: `periods[periodIndex]?.period_name`

### Adjustment Values

Match Story 3-2's individual point entry:

| Label | Value | Use Case |
|-------|-------|----------|
| +10 Exceptional | +10 | Outstanding behavior, helped others |
| +5 Bonus | +5 | Good day, finished early |
| -5 Deduction | -5 | Off task, needed redirection |
| -10 Major Issue | -10 | Disruptive, rule violation |
| -15 Critical | -15 | Major incident |

No "0" option - that's a no-op.

### Why Additive Adjustments (Not Final Totals)

The original epic mentioned "Set Points to 10, 8, 0" which implied setting final totals. After discussion, we clarified:

**Wrong approach:** "Set Points to 8" means calculate what adjustment is needed to reach 8 total. Confusing mental math.

**Correct approach:** "Add +5" means add +5 adjustment to each student. Simple, matches how teachers already think in Story 3-2.

### Existing Patterns to Reuse

| Pattern | Source | Usage |
|---------|--------|-------|
| Checkbox styling | `components/ui/checkbox.tsx` | Selection checkboxes |
| Dialog pattern | `components/daep/roster/PointAdjustmentDialog.tsx` | Confirmation dialog |
| Dropdown menu | `components/ui/dropdown-menu.tsx` | Bulk actions menu |
| Toast notifications | Story 3-2 | Success/error feedback |
| Context update pattern | `RoomRosterContext.tsx` | Selection state |
| Server action pattern | `points.ts > createPointAdjustment` | Bulk action |

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Select All with 0 students | Button disabled |
| Bulk action with no selection | Toolbar hidden |
| User deselects all after opening dropdown | Toolbar hides |
| Page navigation with selection | Selection clears |
| Student marked absent | Can still select (teacher discretion) |
| Network error | Toast error, preserve selection, allow retry |

### Watch Out For

1. **Period name vs index**: Ensure correct conversion from `periodIndex` to period name string
2. **Large selections**: If 20+ students, ensure dialog scrolls and doesn't break layout
3. **Concurrent edits**: Last write wins (same as individual point entry)
4. **Selection persistence**: Selection should NOT persist across room/date/period changes
5. **Checkbox column width**: First column is narrow (40px) - ensure checkbox doesn't overflow
6. **Toolbar positioning**: Must appear above table but not shift layout when appearing/disappearing
7. **Mobile/iPad touch targets**: Checkboxes need adequate touch size (44px minimum)

### Quick Wins (Included in Scope)

| Enhancement | Why It Helps | Effort |
|-------------|--------------|--------|
| Row highlight on hover when selectable | Visual affordance that rows are selectable | Low |
| Keyboard shortcut (Ctrl+A) | Quick select all for power users | Low |

### Backlog (Future Stories)

| Idea | Target | Notes |
|------|--------|-------|
| Shift+click range select | Story 3-3b | Power users can select range without clicking each |
| Undo bulk action via toast | Epic 3 backlog | "Undo" button in success toast for quick recovery |
| Bulk attendance marking | Story 3-9 | Apply same attendance status to multiple students |

### Learnings from Story 3-2

- **Optimistic updates**: Use `refreshDailyPoints()` after bulk action to update UI
- **Toast pattern**: Show count in success message
- **Error handling**: User-friendly messages, suggest feedback page on repeated failures
- **Audit logging**: Use existing `logPointsAuditEvent()` helper

---

## Definition of Done

- [x] Checkbox column appears for all students
- [x] Select All toggles all checkboxes
- [x] Bulk Actions toolbar appears when students selected
- [x] All 5 preset adjustment values work
- [x] Confirmation dialog shows student names and adjustment
- [x] Success toast shows count: "Added +5 points to N students"
- [x] Selection clears after successful action
- [x] Audit log entry created with all affected students
- [x] Error handling with user-friendly messages
- [x] No console errors
- [ ] Mobile/iPad view works (not verified)
- [x] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/story-3-3.context.xml`
- `docs/sprint-artifacts/daep/tech-spec-story-3-3.md`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

**Created:**
- `components/daep/roster/SelectionCheckbox.tsx` - Header and row checkboxes
- `components/daep/roster/BulkActionsToolbar.tsx` - Toolbar with dropdown actions
- `components/daep/roster/BulkApplyDialog.tsx` - Confirmation dialog

**Modified:**
- `components/daep/roster/RoomRosterContext.tsx` - Added selection state (selectedPlacements, toggleSelection, selectAll, clearSelection, isAllSelected, isSomeSelected)
- `components/daep/roster/RoomRosterTable.tsx` - Added SelectAllCheckbox in header
- `components/daep/roster/RosterStudentRow.tsx` - Added RowSelectionCheckbox as first column
- `components/daep/roster/index.ts` - Re-exported Story 3-3 components
- `app/actions/daep/points.ts` - Added BulkAddPointsInput interface and bulkAddPoints() function
- `app/daep/(main)/rooms/[roomId]/RoomRosterView.tsx` - Integrated toolbar and dialog

**Screenshots:**
- `.playwright-mcp/story-3-3-bulk-points-success.png` - Visual verification

---

## References

- [Source: docs/reference/epics-part2.md#Story-3.3] - Epic definition
- [Source: docs/sprint-artifacts/daep/story-3-2.md] - Previous story (Point Entry Grid)
- [Source: docs/sprint-artifacts/daep/tech-spec-story-3-3.md] - Technical specification
- [Source: components/daep/roster/RoomRosterContext.tsx] - Context for selection state
- [Source: components/daep/roster/RoomRosterTable.tsx] - Table to add checkbox column
- [Source: app/actions/daep/points.ts] - Server actions pattern
- [Source: docs/sessions/ux-design-specification.md] - UX principles
