# Tech Spec: Story 3.3 - Bulk Point Entry

**Story:** 3-3
**Points:** 2
**FRs:** FR30
**Dependencies:** Story 3-2 (Point Entry Grid)

---

## Overview

Bulk Point Entry allows teachers and DAEP staff to apply the **same point adjustment** to multiple students at once. This is a productivity feature for common scenarios:

1. **Motivational Reset**: "Class had a rough morning. If everyone gets back on track this afternoon, I'll add +5 to everyone."
2. **Reward Day**: "Great behavior during the assembly - everyone gets +10 bonus."
3. **Rough Period**: "Period 3 was chaos. 8 students need a -5 deduction."

**The workflow is 3 clicks:**
1. **Select** students (checkboxes or "Select All")
2. **Choose** adjustment from dropdown (+10, +5, -5, -10, -15)
3. **Apply** with confirmation

---

## Key Design Decision: Additive Adjustments (NOT Final Totals)

The bulk action applies an **adjustment value** to the selected students - the same way individual point entry works in Story 3-2.

| Dropdown Option | What Happens |
|-----------------|--------------|
| +10 Exceptional | Adds +10 adjustment to each selected student |
| +5 Bonus | Adds +5 adjustment to each selected student |
| -5 Deduction | Adds -5 adjustment to each selected student |
| -10 Major Issue | Adds -10 adjustment to each selected student |
| -15 Critical | Adds -15 adjustment to each selected student |

**Why this model?**
- Matches how teachers already think in Story 3-2 (adjustments, not final scores)
- Simple mental model: "Give everyone +5" is intuitive
- No backwards math required ("If I want 8 total, I need to subtract 2...")

---

## User Workflow

### Scenario: Motivational Bonus

```
Teacher opens Room Roster for Period 4
→ Checks "Select All" (15 students selected)
→ Clicks "Bulk Actions" dropdown
→ Selects "+5 Bonus"
→ Confirmation dialog: "Add +5 points to 15 students for Period 4?"
→ Clicks "Apply"
→ Success toast: "Added +5 points to 15 students"
→ All cells update to show the new adjustment
```

### Scenario: Targeted Deduction

```
Teacher opens Room Roster for Period 2
→ Checks 6 specific students who were disruptive
→ Clicks "Bulk Actions" dropdown
→ Selects "-5 Deduction"
→ Confirmation dialog shows 6 student names
→ Clicks "Apply"
→ Done
```

---

## Data Model

No schema changes needed. Bulk entry creates individual `daep_daily_points` records - one per student per action. This maintains:

- Full audit trail per student
- Multiple adjustments allowed per period (existing pattern from Story 3-2)
- Consistent data model with single-student entry

**Important:** The unique constraint on `(tenant_id, placement_id, date, period)` was dropped in Story 3-2 to allow multiple adjustments per period. Use INSERT, not upsert.

```sql
-- Bulk +5 action for 3 students creates 3 rows:
INSERT INTO daep_daily_points (tenant_id, placement_id, date, period, points_earned, is_base_points, notes, entered_by, approval_status, public)
VALUES
  ('tenant-1', 'placement-a', '2025-01-15', '4', 5, false, 'Bulk: Good afternoon behavior', 'user-123', 'approved', true),
  ('tenant-1', 'placement-b', '2025-01-15', '4', 5, false, 'Bulk: Good afternoon behavior', 'user-123', 'approved', true),
  ('tenant-1', 'placement-c', '2025-01-15', '4', 5, false, 'Bulk: Good afternoon behavior', 'user-123', 'approved', true);
```

---

## UI Components

### 1. Selection Checkboxes

**Location:** First column of RoomRosterTable

| Component | Purpose |
|-----------|---------|
| Header checkbox | Select All / Deselect All toggle |
| Row checkbox | Select individual student |

**Behavior:**
- Checked state stored in RoomRosterContext
- Visual indicator: row background highlight when selected
- Count badge: "3 selected" appears in toolbar

### 2. Bulk Actions Toolbar

**Location:** Above the roster table, appears when selection count > 0

```
┌─────────────────────────────────────────────────────────────────┐
│ ☑ 8 selected    [Bulk Actions ▼]    [Clear Selection]          │
└─────────────────────────────────────────────────────────────────┘
```

**Dropdown options:**

| Label | Adjustment Value |
|-------|------------------|
| +10 Exceptional | +10 |
| +5 Bonus | +5 |
| -5 Deduction | -5 |
| -10 Major Issue | -10 |
| -15 Critical | -15 |

Note: No "0" option because 0 adjustment is a no-op.

### 3. Confirmation Dialog

Before applying, show a confirmation with:

```
┌─────────────────────────────────────────────────────────────────┐
│  Apply +5 Points                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Add +5 points to 8 students for Period 4?                      │
│                                                                 │
│  Students affected:                                             │
│  • Martinez, Carlos                                             │
│  • Johnson, Emily                                               │
│  • Smith, Michael                                               │
│  • (and 5 more...)                                              │
│                                                                 │
│  Optional note:                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Good afternoon behavior                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                              [Cancel]    [Apply to 8 Students]  │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Shows first 5 student names, then "+ N more" if more than 5
- Optional note field (applied to all entries)
- Note defaults to "Bulk: [adjustment description]" if left empty
- Primary action button shows count: "Apply to 8 Students"

---

## Technical Implementation

### Context State Addition

```typescript
// RoomRosterContext additions
interface RoomRosterContextValue {
  // ... existing fields

  // Selection state
  selectedPlacements: Set<string>;  // Set of placement IDs
  toggleSelection: (placementId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isAllSelected: boolean;
}
```

### New Components

| File | Purpose |
|------|---------|
| `components/daep/roster/SelectionColumn.tsx` | Header + row checkboxes |
| `components/daep/roster/BulkActionsToolbar.tsx` | Toolbar with dropdown |
| `components/daep/roster/BulkApplyDialog.tsx` | Confirmation dialog |

### Server Action

```typescript
// app/actions/daep/points.ts

interface BulkAddPointsInput {
  placementIds: string[];
  date: string;
  period: string;  // string, not number (matches existing schema)
  adjustment: number;  // +10, +5, -5, -10, -15
  notes?: string;
}

export async function bulkAddPoints(
  input: BulkAddPointsInput
): Promise<{ success: boolean; count: number; error?: string }> {
  const { userId, tenantId, displayName } = await checkDAEPStaffRole();
  const supabase = await createServerClient();

  const { placementIds, date, period, adjustment, notes } = input;

  // Validate adjustment is one of the allowed values
  const allowedAdjustments = [10, 5, -5, -10, -15];
  if (!allowedAdjustments.includes(adjustment)) {
    return { success: false, count: 0, error: 'Invalid adjustment value' };
  }

  // Build insert records (matching existing createPointAdjustment pattern)
  const entries = placementIds.map(placementId => ({
    tenant_id: tenantId,
    placement_id: placementId,
    date,
    period,
    points_earned: adjustment,  // column is 'points_earned', not 'adjustment'
    is_base_points: false,      // required: bulk actions are adjustments
    notes: notes || `Bulk: ${adjustment > 0 ? '+' : ''}${adjustment} points`,
    entered_by: userId,
    approval_status: 'approved',
    public: true,
  }));

  // INSERT (not upsert - multiple entries per period are allowed)
  const { error } = await supabase
    .from('daep_daily_points')
    .insert(entries);

  if (error) {
    console.error('Error creating bulk points:', error);
    return { success: false, count: 0, error: 'Failed to save bulk points' };
  }

  // Audit log for bulk action
  await logPointsAuditEvent(
    supabase,
    'points.bulk_adjustment',
    userId,
    placementIds[0], // Primary target
    `Bulk ${adjustment >= 0 ? '+' : ''}${adjustment} to ${placementIds.length} students`,
    tenantId,
    {
      date,
      period,
      adjustment,
      notes,
      affected_count: placementIds.length,
      placement_ids: placementIds,
      entered_by_name: displayName,
    }
  );

  // Revalidate roster pages
  revalidatePath('/daep/rooms');

  return { success: true, count: placementIds.length };
}
```

---

## Acceptance Criteria Mapping

| AC from Epic | Implementation |
|--------------|----------------|
| 3.3.1: Checkbox column for multi-select | SelectionColumn.tsx with row checkboxes |
| 3.3.2: "Select All" checkbox in header | SelectionColumn.tsx header checkbox |
| 3.3.3: Bulk actions dropdown | BulkActionsToolbar.tsx with +10, +5, -5, -10, -15 options |
| 3.3.4: Custom bulk entry | **OUT OF SCOPE** - Preset values cover use cases |
| 3.3.5: Confirmation dialog | BulkApplyDialog.tsx with student list |
| 3.3.6: Success toast with count | Toast after server action completes |
| 3.3.7: Audit trail | Individual `daep_daily_points` rows per student + single audit log entry |

**Note on AC 3.3.4:** The original AC mentioned "Custom bulk entry: Set Points to [X]". This was based on the "final total" mental model. With the adjustment model, the 5 preset values (+10, +5, -5, -10, -15) match the individual point entry and cover all realistic use cases. If we discover a need for custom values, we can add in a future iteration.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Student already has adjustment for this period | Upsert replaces the existing entry |
| Select All with 0 students in roster | "Select All" disabled |
| User deselects all after opening dropdown | Toolbar hides, dropdown closes |
| Page navigation with active selection | Selection clears (not persisted) |
| Student marked absent | Can still be selected and given points (teacher discretion) |
| Network error during bulk | Show error toast, preserve selection, allow retry |

---

## Task Breakdown

### Task 1: Selection State in Context
- [ ] Add `selectedPlacements: Set<string>` to RoomRosterContext
- [ ] Add `toggleSelection`, `selectAll`, `clearSelection` methods
- [ ] Add `isAllSelected` computed property

### Task 2: Selection Column
- [ ] Create `SelectionColumn.tsx` with header checkbox
- [ ] Add row checkboxes that call `toggleSelection`
- [ ] Add visual highlight for selected rows (subtle background)

### Task 3: Bulk Actions Toolbar
- [ ] Create `BulkActionsToolbar.tsx`
- [ ] Show only when `selectedPlacements.size > 0`
- [ ] Dropdown with adjustment options (+10, +5, -5, -10, -15)
- [ ] "Clear Selection" button

### Task 4: Confirmation Dialog
- [ ] Create `BulkApplyDialog.tsx`
- [ ] Show affected student names (max 5 + "and N more")
- [ ] Optional note input field
- [ ] "Apply to N Students" button with count

### Task 5: Server Action
- [ ] Add `BulkAddPointsInput` interface to `app/actions/daep/points.ts`
- [ ] Add `bulkAddPoints()` function following `createPointAdjustment` pattern
- [ ] Validate adjustment values (+10, +5, -5, -10, -15)
- [ ] Use INSERT (not upsert) to allow multiple entries per period
- [ ] Add bulk audit log entry with all affected placement IDs
- [ ] Return count of affected records

### Task 6: Integration
- [ ] Wire up toolbar to roster page
- [ ] Connect dialog to server action
- [ ] Show success/error toast
- [ ] Clear selection after successful apply
- [ ] Refresh roster data to show updated adjustments

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `components/daep/roster/RoomRosterContext.tsx` | Modify - add selection state |
| `components/daep/roster/SelectionColumn.tsx` | Create |
| `components/daep/roster/BulkActionsToolbar.tsx` | Create |
| `components/daep/roster/BulkApplyDialog.tsx` | Create |
| `components/daep/roster/RoomRosterTable.tsx` | Modify - add selection column |
| `app/actions/daep/points.ts` | Modify - add bulkAddPoints |

---

## Out of Scope

- Custom point values (preset values cover use cases)
- Bulk attendance marking (separate story 3-4)
- Bulk behavior notes (would need different UI)
- Persisting selection across page navigation
- Undo bulk action (audit trail allows manual correction)

---

## Success Metrics

After Story 3-3 is complete, a teacher can:
1. Check students with a single click per student (or Select All)
2. Click dropdown, select "+5 Bonus"
3. See confirmation with student names
4. Click "Apply to 8 Students"
5. See success toast: "Added +5 points to 8 students"
6. See roster refresh with updated adjustments

**Total workflow: 3 clicks + 1 confirm = 4 actions** to give 8+ students the same point adjustment.
