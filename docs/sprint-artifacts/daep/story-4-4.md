# Story 4-4: Attach Notes to Incidents

**Epic:** 4 - Behavior Documentation
**Points:** 2
**Status:** drafted
**FRs:** FR50

---

## User Story

**As a** DAEP staff member,
**I want to** have behavior notes automatically linked to the student's placement (incident),
**So that** notes are associated with the relevant context and can be viewed per placement.

---

## Acceptance Criteria

### Core Features
- [ ] **AC 4.4.1:** Behavior notes automatically linked to active placement via `placement_id`
- [ ] **AC 4.4.2:** Note shows which placement/incident it's associated with
- [ ] **AC 4.4.3:** Can view all notes for a specific placement on student profile
- [ ] **AC 4.4.4:** If student has no active placement, note still created (linked to student, not placement)

### UI Enhancements
- [ ] **AC 4.4.5:** Behavior notes list shows "Incident" column with incident number
- [ ] **AC 4.4.6:** Note detail sheet shows linked placement with incident number and status
- [ ] **AC 4.4.7:** Student profile Activity tab can filter notes by placement
- [ ] **AC 4.4.8:** When no active placement, prompt to select historical placement or "link to student only"
- [ ] **AC 4.4.9:** Activity tab defaults to current/most recent placement

---

## Tasks

### Task 1: Database Migration
- [ ] 1.1 Create migration `*_make_behavior_notes_placement_nullable.sql`
- [ ] 1.2 Make `placement_id` nullable (ALTER COLUMN DROP NOT NULL)
- [ ] 1.3 Add `student_school_id TEXT` column for notes without placement
- [ ] 1.4 Add index on `(tenant_id, student_school_id)` where not null
- [ ] 1.5 Apply migration via MCP

### Task 2: Validation Schema Updates
- [ ] 2.1 Update `BehaviorNoteSchema` - make `placement_id` optional
- [ ] 2.2 Add `student_school_id` field to schema
- [ ] 2.3 Add refinement: either `placement_id` OR `student_school_id` required
- [ ] 2.4 Add `incident_number` and `placement_status` to `BehaviorNoteListItem`

### Task 3: Server Action Updates
- [ ] 3.1 Update `createBehaviorNote()` to handle notes without placement
- [ ] 3.2 Update `getBehaviorNotesList()` to use left join for placements
- [ ] 3.3 Update `getBehaviorNoteById()` to handle null placement
- [ ] 3.4 Add `getNotesForPlacement(placementId)` server action
- [ ] 3.5 Update `exportBehaviorNotesToCSV()` to include incident number column

### Task 4: Behavior Notes List Updates
- [ ] 4.1 Add "Incident" column to `BehaviorNotesTable.tsx` (between Campus and Category)
- [ ] 4.2 Show incident number as link to student profile placement tab
- [ ] 4.3 Show "—" for notes without placement
- [ ] 4.4 Update `BehaviorNoteDetailSheet.tsx` to show placement context section

### Task 5: Student Profile Activity Tab
- [ ] 5.1 Add placement filter dropdown to Activity tab
- [ ] 5.2 Include "Notes without placement" as filter option
- [ ] 5.3 Update note display to show placement badge when grouped

### Task 6: Handle No Active Placement
- [ ] 6.1 Update Quick Note Modal to detect no active placement
- [ ] 6.2 Fetch historical placements for student
- [ ] 6.3 Show placement selector with historical placements + "Link to student only" option
- [ ] 6.4 If no historical placements, show warning that note will link to student only
- [ ] 6.5 Pass selected `placement_id` or `student_school_id` based on selection
- [ ] 6.6 Enable "+ Add Note" button on student profile even without active placement

### Task 7: Testing & Verification
- [ ] 7.1 TypeScript compilation passes
- [ ] 7.2 Create note with active placement - verify `placement_id` set
- [ ] 7.3 Create note without placement - verify `student_school_id` set
- [ ] 7.4 View notes list - incident column displays correctly
- [ ] 7.5 Open note detail - placement context shows
- [ ] 7.6 Filter notes by placement on student profile
- [ ] 7.7 CSV export includes incident number
- [ ] 7.8 Playwright MCP visual verification

---

## Technical Notes

### Database Changes

**Before:**
```sql
placement_id UUID NOT NULL  -- Required
```

**After:**
```sql
placement_id UUID NULL      -- Optional
student_school_id TEXT      -- For notes without placement
-- Constraint: one of these must be set
```

### New Column in Notes List

| Column | Width | Sortable | Content |
|--------|-------|----------|---------|
| Incident | 90px | ✅ | `INC-2024-001` linked to profile, or `—` |

### Placement Context in Detail Sheet

When note has placement:
```
┌──────────────────────────────────────┐
│ Linked Placement                      │
│ ┌──────────────────────────────────┐ │
│ │ Incident:     INC-2024-00042     │ │
│ │ Status:       [Active]           │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

When note has no placement:
```
┌──────────────────────────────────────┐
│ ⚠️ No active placement when created   │
└──────────────────────────────────────┘
```

### Server Action: `getNotesForPlacement`

```typescript
export async function getNotesForPlacement(
  placementId: string
): Promise<BehaviorNoteListItem[]>
```

Returns all behavior notes linked to a specific placement. Used by student profile.

### Student Profile Filter Options

Default to current/most recent placement:

```typescript
// Default selection logic
const defaultPlacement = currentPlacement?.id || placements[0]?.id || 'all';

const PLACEMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All notes' },
  { value: 'none', label: 'Notes without placement' },
  // Dynamic: one option per placement, mark current
  { value: placementId, label: `${incidentNumber} (${startDate}) — Current` },
];
```

---

## Dev Notes

- **Tech Spec:** `docs/sprint-artifacts/daep/tech-spec-story-4-4.md`
- **4-1 already links** notes to `placement_id` - this story enhances visibility
- **Nullable FK** allows notes when student has no active placement
- **student_school_id** provides fallback link to student record
- Follow existing patterns in `StudentPointsLog.tsx` for Activity tab filtering

---

## Dependencies

- [x] Story 4-1: Quick Behavior Note Modal (DONE)
- [x] Story 4-3: Behavior Notes List View (DONE)
- [x] Epic 2: Placement Management (DONE)

---

## Out of Scope

| Item | Future Story |
|------|--------------|
| Reassigning notes between placements | Future enhancement |
| Bulk linking orphan notes | Future enhancement |
| Notification when note added | Epic 7 |
| Full timeline view integration | Story 4-5 |

---

## File Changes

| File | Action |
|------|--------|
| `supabase/migrations/*_make_behavior_notes_placement_nullable.sql` | Create |
| `lib/validation/schemas.ts` | Modify |
| `app/actions/daep/behavior-notes.ts` | Modify |
| `components/daep/behavior-notes/BehaviorNotesTable.tsx` | Modify |
| `components/daep/behavior-notes/BehaviorNoteDetailSheet.tsx` | Modify |
| `components/daep/StudentPointsLog.tsx` | Modify |

---

_Story Version: 1.0_
_Created: 2025-12-10_
_Tech Spec: v1.0_
