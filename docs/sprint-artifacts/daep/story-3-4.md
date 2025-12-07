# Story 3.4: Point Notes/Comments

**Status:** done
**Epic:** 3 - Daily Operations
**Points:** 5
**FRs:** FR36

---

## Story

As a **DAEP staff member**,
I want **to add notes and context to point entries and view them on student profiles**,
So that **I can document specific behaviors and other staff can see the history**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Point entries should tell a story. A simple "+5" or "-5" doesn't capture *why*. With notes, student actions, and teacher responses documented, any staff member can quickly understand a student's day - enabling better support and consistent follow-through across the team.

---

## Implementation Note

**Most of this story was already implemented in Story 3-2:**

| Feature | Status | Source |
|---------|--------|--------|
| Click point cell → detail modal | Done | PointAdjustmentDialog.tsx |
| Student action dropdown | Done | Uses behavior categories |
| Teacher action dropdown | Done | Uses neutral categories |
| Notes textarea | Done | 500 char max |
| Save with all fields | Done | createPointAdjustment() |

**Remaining scope:** Display point notes on student profile Activity tab.

---

## Acceptance Criteria

| AC | Description | Status | Test |
|----|-------------|--------|------|
| 3.4.1 | Click point cell to open detail modal | Done (3-2) | Opens PointAdjustmentDialog |
| 3.4.2 | Modal shows: points input, student_action, teacher_action, notes | Done (3-2) | All fields present |
| 3.4.3 | student_action populated from behavior categories (Story 1.10) | Done (3-2) | Positive/negative categories appear |
| 3.4.4 | teacher_action shows: Redirected, Conference, Parent Contact, None | Done (3-2) | Neutral categories appear |
| 3.4.5 | Notes field: free text, optional | Done (3-2) | Can save with/without notes |
| 3.4.6 | Save updates point entry with additional fields | Done (3-2) | DB record has all fields |
| 3.4.7 | Notes visible on student profile daily activity | **NEW** | Activity tab shows point log |
| 3.4.8 | View historical placement activity | **NEW** | Dropdown to select past placements |
| 3.4.9 | Edit entry from timeline | **NEW** | Click opens pre-filled dialog, saves update |
| 3.4.10 | Only original teacher or admin can edit | **NEW** | Permission check enforced |
| 3.4.11 | Edit tracked in audit log | **NEW** | `points.adjustment_edited` event logged |
| 3.4.12 | Export point history to CSV/PDF | **NEW** | Download button with format options |

---

## Tasks / Subtasks

### Task 1: Server Action - Get Student Point History (AC: 3.4.7)

- [ ] 1.1 Add `getStudentPointHistory()` to `app/actions/daep/points.ts`
  - Accepts `placementId` and optional `options: { startDate?, endDate?, limit? }`
  - Returns adjustments (where `is_base_points = false`) ordered by date desc
  - Includes `entered_by` user display name
- [ ] 1.2 Add `PointHistoryEntry` type to schemas if needed
  - Extends `DailyPointEntry` with `entered_by_name: string`

### Task 2: Create StudentPointsLog Component (AC: 3.4.7)

- [ ] 2.1 Create `components/daep/StudentPointsLog.tsx`
  - Props: `placementId`, `studentName`
  - Fetches point history on mount
  - Displays as card list, newest first
- [ ] 2.2 Design point entry card
  - Header: Date, Period, Adjustment badge (color-coded)
  - Body: Student action, notes (if present)
  - Footer: Teacher action, entered_by, time
- [ ] 2.3 Add color coding
  - Positive (+10, +5): green badge, light green background
  - Neutral (0): gray badge
  - Negative (-5, -10, -15): red badge, light red background
- [ ] 2.4 Add date range filter
  - Options: Last 30 days (default), All time, This placement
  - Default: Last 30 days
- [ ] 2.5 Add empty state
  - "No point adjustments recorded for this placement"
- [ ] 2.6 Add loading state
  - Skeleton cards while fetching

### Task 3: Student Profile Integration (AC: 3.4.7)

- [ ] 3.1 Update `app/daep/(main)/students/[school_id]/page.tsx`
  - Import `StudentPointsLog` component
  - Replace placeholder in "Activity Timeline" tab
- [ ] 3.2 Handle no active placement case
  - Show placement selector even when no active placement

### Task 4: Historical Placement Selector (AC: 3.4.8)

- [ ] 4.1 Add placement dropdown to StudentPointsLog
  - Options: Current placement + all historical placements
  - Display: "Placement #incident - Start Date to End Date (Status)"
  - Default: Current placement if exists, otherwise most recent
- [ ] 4.2 Fetch placement history for student
  - Use existing `getStudentProfile()` which returns `placementHistory`
- [ ] 4.3 Update point history when placement selection changes

### Task 5: Edit Entry from Timeline (AC: 3.4.9, 3.4.10, 3.4.11)

- [ ] 5.1 Add `updatePointAdjustment()` server action to `app/actions/daep/points.ts`
  - Input: `entryId`, updated fields (adjustment_value, student_action, teacher_action, notes)
  - Permission check: only `entered_by` user OR admin roles can edit
  - Admin roles: super_admin, district_admin, daep_admin_l1
  - Returns success/error with user-friendly message
- [ ] 5.2 Add audit logging for edits
  - Event type: `points.adjustment_edited`
  - Details: before/after values, edited_by user
- [ ] 5.3 Add edit button to each entry card in StudentPointsLog
  - Only visible if current user can edit (entered_by or admin)
  - Icon button (pencil) on hover/always visible
- [ ] 5.4 Open PointAdjustmentDialog in "edit mode"
  - Pre-fill all fields from existing entry
  - Change submit button to "Save Changes"
  - Pass `entryId` to distinguish create vs update

### Task 6: Export Point History (AC: 3.4.12)

- [ ] 6.1 Add export button to StudentPointsLog header
  - Dropdown with options: "Export CSV", "Export PDF"
- [ ] 6.2 Implement CSV export
  - Columns: Date, Period, Adjustment, Student Action, Teacher Action, Notes, Entered By, Time
  - Filename: `{student_name}_points_{date_range}.csv`
- [ ] 6.3 Implement PDF export
  - Header: Student name, ID, placement info, date range
  - Table: Same columns as CSV
  - Footer: Generated date, generated by
  - Use existing PDF patterns or react-pdf
  - Filename: `{student_name}_points_{date_range}.pdf`

### Task 7: Testing

- [ ] 7.1 Test point history display with multiple entries
- [ ] 7.2 Test date range filtering
- [ ] 7.3 Test empty state (student with no adjustments)
- [ ] 7.4 Test color coding for all adjustment values
- [ ] 7.5 Test historical placement selector
- [ ] 7.6 Test edit entry - original teacher can edit
- [ ] 7.7 Test edit entry - admin can edit any entry
- [ ] 7.8 Test edit entry - other staff cannot edit
- [ ] 7.9 Test audit log records edits with before/after
- [ ] 7.10 Test CSV export downloads correctly
- [ ] 7.11 Test PDF export downloads correctly
- [ ] 7.12 Verify Playwright MCP - full flow test

---

## Dev Notes

### Server Action Pattern

Follow existing `getStudentPointEntries()` pattern but with date range support:

```typescript
export async function getStudentPointHistory(
  placementId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<PointHistoryEntry[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  let query = supabase
    .from('daep_daily_points')
    .select(`
      id, placement_id, date, period, points_earned,
      is_base_points, student_action, teacher_action,
      notes, entered_by, created_at
    `)
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .eq('is_base_points', false)  // Only adjustments
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.startDate) {
    query = query.gte('date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('date', options.endDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  // ... handle error, map to PointHistoryEntry with user names
}
```

### Getting Entered By Name

Join with `user_profiles` to get `display_name` for `entered_by`. Since users are soft-deleted, the profile record will always exist.

### Component Structure

```
StudentPointsLog
├── DateRangeFilter (dropdown)
├── PointEntryCard[] (list)
│   ├── Header (date, period, badge)
│   ├── Body (student_action, notes)
│   └── Footer (teacher_action, entered_by, time)
└── EmptyState (when no entries)
```

### Color Coding (Matches PointAdjustmentDialog)

```typescript
function getAdjustmentStyles(value: number) {
  if (value > 0) return { badge: 'bg-emerald-500', card: 'border-emerald-200 bg-emerald-50' };
  if (value < 0) return { badge: 'bg-red-500', card: 'border-red-200 bg-red-50' };
  return { badge: 'bg-gray-500', card: 'border-gray-200 bg-gray-50' };
}
```

### Relationship to Story 4.5

This story replaces the "coming in 4.5" placeholder in the Activity Timeline tab with point adjustments now.

Story 4.5 (Student Profile Timeline) will later expand to include:
- Behavior notes (Epic 4)
- Attendance events (Stories 3.9-3.12)

The `StudentPointsLog` component can be kept as-is or refactored into a unified timeline based on user feedback.

### Edit Permission Logic

```typescript
// Server action permission check
function canEditEntry(entry: DailyPointEntry, currentUserId: string, userRole: string): boolean {
  const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];

  // Admins can edit any entry
  if (adminRoles.includes(userRole)) return true;

  // Original creator can edit their own entry
  if (entry.entered_by === currentUserId) return true;

  return false;
}
```

### Update Point Adjustment Server Action

```typescript
export async function updatePointAdjustment(
  entryId: string,
  updates: {
    adjustment_value?: number;
    student_action?: string | null;
    teacher_action?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  // 1. Check user role and get entry
  // 2. Verify permission (entered_by or admin)
  // 3. Store before values for audit
  // 4. Update entry
  // 5. Log to audit trail with before/after
  // 6. Revalidate path
}
```

### Export Patterns

**CSV Export:**
- Use browser download via Blob
- No server action needed - generate client-side from loaded data

**PDF Export:**
- Option A: Client-side with react-pdf or jspdf
- Option B: Server action that generates PDF and returns URL
- **Recommendation:** Client-side with jspdf for simplicity

### Watch Out For

1. **Timezone display**: Format dates/times using tenant timezone
2. **Large datasets**: If student has 100+ adjustments, consider "Load more" pagination
3. **Empty state**: New placements will have no adjustments yet
4. **Edit race conditions**: Last write wins if two users edit same entry
5. **PDF generation**: May need to lazy-load jspdf to avoid bundle size issues

---

## Backlog (Future Stories)

| Idea | Target | Notes |
|------|--------|-------|
| Parent/student view | Epic 7 | Read-only view for accountability |
| Search/filter by action type | Story 4.5 | Part of unified timeline |
| Bulk edit/delete entries | Future | Admin-only bulk operations |

---

## Definition of Done

- [x] Point adjustment dialog has student_action dropdown (Done 3-2)
- [x] Point adjustment dialog has teacher_action dropdown (Done 3-2)
- [x] Point adjustment dialog has notes field (Done 3-2)
- [x] Adjustments save with all metadata (Done 3-2)
- [ ] Student profile Activity tab shows point history
- [ ] Entries display: date, period, adjustment, student_action, teacher_action, notes, entered_by
- [ ] Color coding by adjustment value
- [ ] Date range filter works (Last 30 days, All time, This placement)
- [ ] Empty state for no adjustments
- [ ] Historical placement selector works
- [ ] Edit entry from timeline works (original teacher + admins only)
- [ ] Edit tracked in audit log with before/after values
- [ ] Export to CSV works
- [ ] Export to PDF works
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-story-3-4.md`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## References

- [Source: docs/reference/epics-part2.md#Story-3.4] - Epic definition
- [Source: docs/sprint-artifacts/daep/story-3-2.md] - Previous story (Point Entry Grid)
- [Source: docs/sprint-artifacts/daep/tech-spec-story-3-4.md] - Technical specification
- [Source: components/daep/roster/PointAdjustmentDialog.tsx] - Existing dialog with notes
- [Source: app/actions/daep/points.ts] - Server actions
- [Source: app/daep/(main)/students/[school_id]/page.tsx] - Student profile page
