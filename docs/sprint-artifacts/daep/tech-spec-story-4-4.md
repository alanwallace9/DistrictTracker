# Tech Spec: Story 4-4 - Attach Notes to Incidents

**Epic:** 4 - Behavior Documentation
**Story Points:** 2
**FRs:** FR50
**Version:** 1.0
**Created:** 2025-12-10

---

## Overview

Story 4-4 enhances the behavior notes system to properly link notes to placements ("incidents"). While 4-1 already stores `placement_id` on notes, this story adds:

1. **Visual placement context** - Notes display shows which incident/placement they're associated with
2. **View notes by placement** - Filter/group notes by specific placement on student profile
3. **Notes without active placement** - Handle students who have no active placement (notes linked to student only)
4. **Placement badge on list view** - Behavior notes list shows incident number for each note

The key insight from the Epic definition is:
> "If student has no active placement, note still created (linked to student, not placement)"

Currently, `daep_behavior_notes.placement_id` is required (NOT NULL). This story makes it **nullable** to allow notes without an active placement.

---

## Current State Analysis

### Database Schema (`daep_behavior_notes`)

```sql
placement_id UUID NOT NULL REFERENCES daep_placements(id)  -- Currently required
```

**Problem:** Notes can't be created for students without active placements. The schema needs to be updated to allow `placement_id = NULL`.

### Existing Server Actions (`behavior-notes.ts`)

- `createBehaviorNote()` - **Requires** `placement_id` in input validation
- `getBehaviorNotesList()` - Joins via `daep_placements!inner` (excludes notes without placement)
- `getBehaviorNoteById()` - Same inner join issue

### Current UI Flow

1. Quick Note Modal requires placement context (opened from room roster or student profile with active placement)
2. Behavior Notes list shows student but not placement/incident info
3. Student profile Activity tab groups by date, not by placement

---

## Technical Design

### 1. Database Migration

**Migration:** `*_make_behavior_notes_placement_nullable.sql`

```sql
-- Make placement_id nullable to allow notes without active placement
ALTER TABLE daep_behavior_notes
ALTER COLUMN placement_id DROP NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN daep_behavior_notes.placement_id IS
  'Optional FK to placement. NULL when student has no active placement at time of note.';

-- Add student_school_id for notes without placement
ALTER TABLE daep_behavior_notes
ADD COLUMN student_school_id TEXT;

COMMENT ON COLUMN daep_behavior_notes.student_school_id IS
  'Student school ID for notes without active placement. Links to trespass_records.school_id.';

-- Add index for student_school_id queries
CREATE INDEX idx_daep_behavior_notes_student_school_id
ON daep_behavior_notes(tenant_id, student_school_id)
WHERE student_school_id IS NOT NULL;
```

### 2. Schema Updates

**Update `BehaviorNoteSchema`:**

```typescript
export const BehaviorNoteSchema = z.object({
  // Make placement_id optional - null when no active placement
  placement_id: z.string().uuid().optional().nullable(),

  // Add student_school_id for notes without placement
  student_school_id: z.string().min(1).optional(),

  // ... existing fields ...
}).refine(
  (data) => data.placement_id || data.student_school_id,
  { message: 'Either placement_id or student_school_id is required' }
);
```

**Add `BehaviorNoteListItem` field:**

```typescript
// In BehaviorNoteListItem interface, add:
incident_number: string | null;  // From placement if linked
placement_status: string | null; // active, completed, etc.
```

### 3. Server Action Updates

#### `createBehaviorNote()` modifications:

```typescript
// Current: requires placement_id
// New: accepts either placement_id OR student_school_id

if (placement_id) {
  // Existing flow - verify placement exists
} else if (student_school_id) {
  // New flow - verify student exists in trespass_records
  const { data: student, error } = await supabase
    .from('trespass_records')
    .select('id, school_id')
    .eq('school_id', student_school_id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !student) {
    return { success: false, error: 'Student not found' };
  }

  // Create note with student_school_id instead of placement_id
}
```

#### `getBehaviorNotesList()` modifications:

```typescript
// Change from inner join to left join for placements
.select(`
  id,
  incident_date,
  ...
  placement_id,
  student_school_id,
  daep_placements (
    id,
    incident_number,
    status,
    trespass_records (
      school_id,
      first_name,
      last_name,
      photo_url
    ),
    home_campus_id
  )
`)

// For notes without placement, fetch student directly from trespass_records
// using student_school_id
```

#### New: `getNotesForPlacement(placementId)`

```typescript
export async function getNotesForPlacement(
  placementId: string
): Promise<BehaviorNoteListItem[]> {
  // Returns all notes linked to a specific placement
  // Used by student profile placement detail view
}
```

#### New: `getNotesForStudent(schoolId)`

```typescript
export async function getNotesForStudent(
  schoolId: string,
  options?: { includePlacementNotes?: boolean }
): Promise<BehaviorNoteListItem[]> {
  // Returns notes for a student
  // If includePlacementNotes = false, only returns notes with placement_id = NULL
  // If true (default), returns ALL notes for the student across placements
}
```

### 4. UI Changes

#### A. Behavior Notes List - Add Incident Column

**File:** `BehaviorNotesTable.tsx`

Add new column between "Campus" and "Category":

| Column | Width | Content |
|--------|-------|---------|
| Incident | 90px | `INC-2024-001` or `—` if no placement |

```tsx
// New column in table
<TableHead className="w-[90px]">Incident</TableHead>

// Cell content
<TableCell>
  {note.incident_number ? (
    <Link
      href={`/daep/students/${note.student_school_id}?tab=history&placement=${note.placement_id}`}
      className="text-sm font-mono text-muted-foreground hover:text-primary"
    >
      {formatIncidentNumber(note.incident_number)}
    </Link>
  ) : (
    <span className="text-muted-foreground">—</span>
  )}
</TableCell>
```

#### B. Behavior Note Detail Sheet - Show Placement Context

**File:** `BehaviorNoteDetailSheet.tsx`

Add placement section when note is linked to a placement:

```tsx
{note.placement_id && (
  <div className="border-t pt-4 mt-4">
    <h4 className="text-sm font-medium mb-2">Linked Placement</h4>
    <div className="bg-muted rounded-lg p-3 space-y-1">
      <div className="flex justify-between">
        <span className="text-sm text-muted-foreground">Incident:</span>
        <span className="font-mono text-sm">{note.incident_number}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge variant={getStatusVariant(note.placement_status)}>
          {note.placement_status}
        </Badge>
      </div>
    </div>
  </div>
)}

{!note.placement_id && (
  <div className="border-t pt-4 mt-4">
    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
      <AlertCircle className="h-4 w-4" />
      <span className="text-sm">No active placement when note was created</span>
    </div>
  </div>
)}
```

#### C. Student Profile - Notes by Placement

**File:** `StudentPointsLog.tsx` (or new `StudentBehaviorNotes.tsx`)

Enhance the Activity tab to show behavior notes grouped by placement:

```tsx
// Placement selector (when student has multiple placements)
// Default to current/most recent placement
const defaultPlacement = currentPlacement?.id || placements[0]?.id || 'all';

<Select value={selectedPlacement} onValueChange={setSelectedPlacement} defaultValue={defaultPlacement}>
  <SelectTrigger>
    <SelectValue placeholder="Select placement" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All placements</SelectItem>
    <SelectItem value="none">Notes without placement</SelectItem>
    <SelectSeparator />
    {placements.map((p) => (
      <SelectItem key={p.id} value={p.id}>
        {p.incident_number} ({formatDate(p.start_date)})
        {p.id === currentPlacement?.id && ' — Current'}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// Notes list filtered by selection
{filteredNotes.map((note) => (
  <BehaviorNoteCard note={note} />
))}
```

#### D. Quick Note Modal - Handle No Active Placement

**File:** Room roster / student profile note modal

When adding a note for a student without active placement, show a placement selector with historical placements:

```tsx
{!activePlacement && historicalPlacements.length > 0 && (
  <div className="space-y-3 mb-4">
    <Alert variant="warning">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        This student has no active DAEP placement. Select a placement to link this note to:
      </AlertDescription>
    </Alert>

    <Select value={selectedPlacement} onValueChange={setSelectedPlacement}>
      <SelectTrigger>
        <SelectValue placeholder="Select placement..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="student_only">
          <span className="text-muted-foreground">Link to student only (no placement)</span>
        </SelectItem>
        <SelectSeparator />
        {historicalPlacements.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.incident_number} — {formatDate(p.start_date)} ({p.status})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}

{!activePlacement && historicalPlacements.length === 0 && (
  <Alert variant="warning" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      This student has no DAEP placements.
      The note will be linked to the student record only.
    </AlertDescription>
  </Alert>
)}
```

### 5. CSV Export Update

Add incident number to export columns:

| # | Column | Source |
|---|--------|--------|
| 5a | Incident Number | `placement.incident_number ?? ''` |

Update column count from 18 to 19 (or replace a less useful column).

---

## Implementation Tasks

### Task 1: Database Migration
- [ ] 1.1 Create migration `*_make_behavior_notes_placement_nullable.sql`
- [ ] 1.2 Make `placement_id` nullable
- [ ] 1.3 Add `student_school_id` column
- [ ] 1.4 Add index on `student_school_id`
- [ ] 1.5 Apply migration via MCP

### Task 2: Schema Updates
- [ ] 2.1 Update `BehaviorNoteSchema` to make `placement_id` optional
- [ ] 2.2 Add `student_school_id` to schema with refinement
- [ ] 2.3 Add `incident_number`, `placement_status` to `BehaviorNoteListItem`

### Task 3: Server Action Updates
- [ ] 3.1 Update `createBehaviorNote()` to handle notes without placement
- [ ] 3.2 Update `getBehaviorNotesList()` to use left join for placements
- [ ] 3.3 Update `getBehaviorNoteById()` to handle null placement
- [ ] 3.4 Add `getNotesForPlacement(placementId)` server action
- [ ] 3.5 Update `exportBehaviorNotesToCSV()` to include incident number
- [ ] 3.6 Update audit logging to handle student_school_id context

### Task 4: UI - Notes List Updates
- [ ] 4.1 Add "Incident" column to `BehaviorNotesTable.tsx`
- [ ] 4.2 Update `BehaviorNoteDetailSheet.tsx` with placement context
- [ ] 4.3 Handle notes without placement in detail sheet (warning message)

### Task 5: UI - Student Profile Updates
- [ ] 5.1 Add placement filter to Activity tab
- [ ] 5.2 Add "Notes without placement" filter option
- [ ] 5.3 Show behavior notes grouped by placement in timeline

### Task 6: Handle No Active Placement
- [ ] 6.1 Update Quick Note Modal to show warning when no active placement
- [ ] 6.2 Update `createBehaviorNote()` call to pass `student_school_id`
- [ ] 6.3 Add "+ Add Note" button to student profile even without placement

### Task 7: Testing
- [ ] 7.1 TypeScript compilation passes
- [ ] 7.2 Create note with placement - verify linked
- [ ] 7.3 Create note without placement - verify student_school_id used
- [ ] 7.4 View notes list - incident column shows correctly
- [ ] 7.5 Filter notes by placement on student profile
- [ ] 7.6 CSV export includes incident number
- [ ] 7.7 Playwright MCP visual verification

---

## Acceptance Criteria Mapping

| AC | Description | Task |
|----|-------------|------|
| 4.4.1 | Notes automatically linked to active placement via `placement_id` | Already done in 4-1 |
| 4.4.2 | Note shows which placement/incident it's associated with | Task 4.1, 4.2 |
| 4.4.3 | Can view all notes for a specific placement | Task 5.1, 3.4 |
| 4.4.4 | If student has no active placement, note still created (linked to student) | Task 1, 2, 3.1, 6 |

---

## Edge Cases

1. **Student with multiple active placements** - Rare but possible (concurrent placements). Quick Note modal should let user select which placement to link.

2. **Note created during placement transition** - If status changes between note creation and save, the placement_id is still valid.

3. **Placement deleted after note creation** - Notes should remain with `placement_id` intact; FK should be ON DELETE SET NULL.

4. **Migrating existing notes** - All existing notes already have `placement_id` set, no backfill needed.

---

## Security Considerations

- RLS policies already enforce tenant isolation on `daep_behavior_notes`
- `student_school_id` queries must include `tenant_id` filter
- No additional permissions needed - follows existing DAEP staff role requirements

---

## Dependencies

- **Story 4-1:** Quick Behavior Note Modal (DONE)
- **Story 4-3:** Behavior Notes List View (IN PROGRESS)
- **Epic 2:** Placement Management (DONE)

---

## Out of Scope

| Item | Reason |
|------|--------|
| Reassigning notes between placements | Future enhancement |
| Bulk linking orphan notes to placements | Future enhancement |
| Notification when note added to placement | Story 7-x (Epic 7) |

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/*_make_behavior_notes_placement_nullable.sql` | Create | Schema changes |
| `lib/validation/schemas.ts` | Modify | Update BehaviorNoteSchema |
| `app/actions/daep/behavior-notes.ts` | Modify | Update 4 actions, add 1 new |
| `components/daep/behavior-notes/BehaviorNotesTable.tsx` | Modify | Add Incident column |
| `components/daep/behavior-notes/BehaviorNoteDetailSheet.tsx` | Modify | Add placement context |
| `components/daep/StudentPointsLog.tsx` | Modify | Add placement filter |

---

_Tech Spec Version: 1.0_
_Author: Claude_
_Date: 2025-12-10_
