# UX Refactor Planning: Story 2-8 and Beyond

**Date:** 2025-11-29
**Session:** Story 2-8 Edit Placement debugging → UX architecture discussion
**Participants:** Alan (Product Owner), Claude (Dev Agent)

---

## Executive Summary

During implementation of Story 2-8 (Edit Placement), we discovered that the separate edit page approach creates UX fragmentation. After reviewing existing patterns and discussing user workflows, we identified a better architecture: **unified inline editing with a kanban-based intake pipeline**.

This document captures the vision, decisions, and implementation plan.

---

## Current State Issues

### What Was Built (Story 2-8 v1)
- Separate edit page at `/daep/placements/[id]/edit`
- EditPlacementForm component with all fields
- Server actions: `getPlacementForEdit()`, `updatePlacement()`
- Edit button added to CurrentPlacementCard

### Problems Identified
1. **Two edit buttons** - Confusing UX (one in header, one on card)
2. **Navigation away from context** - User loses view of student profile
3. **Duplicate code** - Create and Edit forms have similar logic
4. **Multiple patterns** - Room has modal, placement has page, inconsistent
5. **FK syntax errors** - Query assumptions didn't match schema

### Bugs Fixed During Session
- FK join syntax: `campuses!fk_daep_placements_home_campus` (not `home_campus_id`)
- Non-existent column: `intake_date` removed (doesn't exist in schema)
- Student name fetch: Separate query to `trespass_records` (no FK exists)
- Route location: Moved to `(main)` route group

---

## Target UX Vision

### Design Principles
1. **One pattern for view/edit** - Toggle mode, not separate pages
2. **Inline editing** - Click Edit, fields become editable, Save/Cancel
3. **Unified create/edit** - Same component handles both
4. **Progressive disclosure** - Show only what's needed
5. **Contextual actions** - Actions appear where data is
6. **Every minute counts** - Optimize for daily DAEP admin workflows

### Reference: Top Software Patterns

| Company | Pattern |
|---------|---------|
| Salesforce | Record page = view AND edit, click field to edit |
| Linear | Same side panel for create/edit, inline editing on cards |
| HubSpot | Inline editing everywhere, progressive disclosure |
| Notion | Everything inline editable, click and type |

---

## Screenshot Descriptions (For Reference)

### Screenshot 1: Current Student Profile Page
**URL:** `/daep/students/[school_id]`
**Layout:**
- Header: Student avatar, name (Sara Smiley), ID badge, grade, school, DAEP badge
- Action bar: Back, Edit Placement, Add Note
- Left column:
  - Demographics card (Guardian info - shows "No guardian info on file")
  - TrespassTracker Status card (Active record, TT/DAEP expiry dates)
- Right column:
  - Current Placement card with Edit button
  - Days Progress bar (0 of 30, 0% complete)
  - Offense code, Home Campus, Assigned Room (with edit icon → modal)
  - Start Date, Expected End, Incident #, Intake Notes
  - Activate Placement button
- Bottom tabs: Placement History, Separations, Activity Timeline

### Screenshot 2: Edit Placement Page (What I Built)
**URL:** `/daep/placements/[id]/edit`
**Layout:**
- Header card: Student name, status badge, placement dates, days progress
- Status Actions: Activate Placement button
- Placement Details card:
  - Days Assigned (number input)
  - Offense Code (dropdown)
  - Assigned Room (dropdown with current marked)
  - Placement Reason (textarea)
- Notes card:
  - Intake Notes (textarea)
  - Completion Notes (textarea)
- Footer: Cancel / Save Changes

### Screenshot 3: New Placement Page (Existing)
**URL:** `/daep/placements/new`
**Layout:**
- Student Information section with search input
- Placement Details card:
  - Incident Number, Offense Code
  - Location (depends on offense), Home Campus, Placement Date
  - Start Date, Days Assigned, Expected End Date (calculated)
  - Mandatory checkbox
  - Placement Reason (textarea, 10 char min)
  - Intake Notes (optional)
- Footer: Cancel / Create Placement

### Screenshot 4: Ideal Student Profile Modal (Reference Design)
**Layout:** Side panel or modal with comprehensive student view
- Header: Avatar, name, student ID
- Left column:
  - Student Information (DOB, Gender, Race/Ethnicity, Grade)
  - Contact Information (Address)
  - Guardian Information (Primary: name, relationship, phone, email; Secondary: name, phone)
  - Performance Metrics (Attendance Rate %, Discipline Incidents count, Status badge)
- Right column:
  - Placement Overview (Total placements, Active count, Days Owed, "2nd Time" badge)
  - Placement History (expandable cards with offense code, dates, progress bar)
  - Recent Behavior Notes (date, type, points +/-)
- Footer: Edit Student | Add New Placement (primary button)

**Key insight:** This layout shows EVERYTHING about a student in one view. Edit mode could toggle all editable fields.

### Screenshot 5: Intake Pipeline Kanban (Reference Design)
**URL:** `/daep/intakes` (proposed)
**Layout:** Kanban board with columns:
1. **Approved (3)** - Cards show: Name, School, Offense Code, "Needs Scheduling" badge
2. **Scheduled (2)** - Cards show: Name, School, Date/Time, "Today" badge
3. **Arrived Today (1)** - Cards show: Name, School, Arrival time, "Processing" badge
4. **No-Show (2)** - Cards show: Name, Date, Note ("No contact", "Parent called"), "Reschedule" badge

**Header actions:** Import CSV | + Manual Intake

**Workflow:**
1. CSV import from SIS → populates "Approved" column
2. Click card → schedule intake → moves to "Scheduled"
3. Student arrives → click to process → moves to "Arrived Today"
4. No-show → moves to "No-Show" for follow-up

---

## Proposed Architecture

### Component: `<PlacementEditor />`

```typescript
interface PlacementEditorProps {
  mode: 'create' | 'edit' | 'view';
  studentId?: string;      // For create mode (after search)
  placementId?: string;    // For edit/view mode
  onSave?: () => void;
  onCancel?: () => void;
}
```

**Behavior by mode:**
- `create`: Student search visible, form empty, Save creates new
- `edit`: Student info read-only, form editable, Save updates existing
- `view`: Everything read-only, Edit button switches to edit mode

### Component: `<StudentCard />`

```typescript
interface StudentCardProps {
  student: Student;
  placement?: Placement;
  editMode: boolean;
  onToggleEdit: () => void;
}
```

**Sections:**
- Student Info (editable: guardian, contact)
- Current Placement (editable: days, room, notes)
- Placement History (expandable, add note to past placements)
- Behavior Notes (add new)

### Inline Edit Pattern

```
[View Mode]                         [Edit Mode]
┌──────────────────────────┐       ┌──────────────────────────┐
│ Days Assigned: 30        │ Edit  │ Days Assigned: [30    ]  │
│ Room: 501 (Beakley)      │  →    │ Room: [dropdown      ▾]  │
│ Intake Notes: "..."      │       │ Intake Notes: [textarea] │
└──────────────────────────┘       │        [Cancel] [Save]   │
                                   └──────────────────────────┘
```

### Keep Existing

- **Room assignment modal** - Already works, specific use case for quick room changes
- **Status transition buttons** - Activate, Mark Days Met, Complete

---

## Implementation Plan

### Phase 1: Cleanup Current (Immediate)
- [ ] Remove duplicate Edit button from header (keep one on card)
- [ ] Keep edit page working for now (it's functional)
- [ ] Document lessons learned in workflow docs ✅ DONE

### Phase 2: Inline Editing on CurrentPlacementCard
- [ ] Add edit mode state to CurrentPlacementCard
- [ ] Toggle fields between read-only and editable
- [ ] Reuse validation from UpdatePlacementSchema
- [ ] Save button calls updatePlacement()
- [ ] Keep room modal for quick room-only changes

### Phase 3: Unified PlacementEditor Component
- [ ] Create `<PlacementEditor mode="create|edit|view" />`
- [ ] Migrate create page to use it
- [ ] Migrate edit functionality to use it
- [ ] Single audit logging entry point
- [ ] Delete separate edit page

### Phase 4: Student Profile Enhancement
- [ ] Add guardian/contact editing
- [ ] Add notes to past placements
- [ ] Performance metrics display
- [ ] Placement history with expand/collapse

### Phase 5: Intake Pipeline (Epic 2b)
- [ ] Kanban board for intake workflow
- [ ] CSV import to "Approved" column
- [ ] Scheduling flow
- [ ] No-show tracking
- [ ] See: `docs/sessions/brainstorm-workflow-pipelines-2025-11-28.md`

---

## Technical Decisions

### Keep
- Room assignment modal (working, focused use case)
- Status transition actions component
- UpdatePlacementSchema validation
- Server actions (getPlacementForEdit, updatePlacement)
- Audit logging via logAuditEvent()

### Refactor
- CurrentPlacementCard → add inline edit mode
- Create new placement page → use unified component

### Delete (After Phase 3)
- `/app/daep/(main)/placements/[id]/edit/page.tsx`
- `EditPlacementForm.tsx` component

---

## Lessons Learned

### Supabase/PostgREST FK Joins
When table has multiple FKs to same target, must use explicit hint:
```typescript
// WRONG
home_campus:campuses(id, name)

// CORRECT
home_campus:campuses!fk_daep_placements_home_campus(id, name)
```

**Before writing joins:** `grep -r "tablename!" app/actions/`

### Schema Verification
Always verify columns exist before assuming:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'your_table';
```

### UX Decisions During Story Creation
Push back on separate pages when inline editing makes more sense. Ask:
- Does user need to navigate away?
- Is this a quick edit or a complex form?
- Can we reuse existing patterns?

---

## Files Reference

### Created This Session
- `docs/workflows/story-development-workflow.md` - Added "Patterns & Lessons Learned"
- `docs/sessions/ux-refactor-story-2-8-planning.md` - This file

### Modified This Session
- `app/actions/daep/placements.ts` - Fixed FK syntax, removed intake_date
- `app/daep/(main)/placements/[id]/edit/page.tsx` - Moved to correct route
- `components/daep/placements/EditPlacementForm.tsx` - Created (may delete later)
- `components/daep/CurrentPlacementCard.tsx` - Added Edit button

### Screenshot References
Save these screenshots to `docs/sessions/screenshots/` for future reference:
1. `student-profile-current.png` - Current student profile page
2. `edit-placement-page.png` - Edit page I built
3. `new-placement-page.png` - Existing create page
4. `student-profile-ideal.png` - Reference design for unified view
5. `intake-pipeline-kanban.png` - Reference design for intake workflow

---

## Next Steps

1. ~~**New session:** Execute Phase 2 (inline editing on CurrentPlacementCard)~~ → **Story 2-8b created**
2. ~~**Story update:** Revise Story 2-8 scope to reflect inline editing approach~~ → **2-8 kept as-is, 2-8b handles inline**
3. ~~**Backlog:** Add Story 2-8b for unified PlacementEditor component~~ → **Done via correct-course workflow**
4. **Epic 2b:** Reference this doc when implementing intake pipeline
5. **Phase 3 (Unified PlacementEditor):** Defer to post-MVP or Epic 3

---

## Course Correction Applied

**Date:** 2025-11-30
**Decision:** Option D — Split stories
**Workflow:** correct-course

**Artifacts Created:**
- `docs/sprint-artifacts/daep/story-2-8b.md` — Inline Student & Placement Editing (5 pts)
- `docs/sprint-artifacts/daep/bug-offense-code-auto-change.md` — Bug report for auto-changing offense code
- `docs/sprint-artifacts/daep/backlog-multiple-guardian-contacts.md` — Feature request
- `docs/sprint-artifacts/daep/backlog-room-grouping-separation.md` — HIGH priority enhancement

**Artifacts Updated:**
- `docs/sprint-artifacts/sprint-status.yaml` — Added 2-8b to backlog
- `docs/sprint-artifacts/daep/story-2-8.md` — Added UX discovery note
- This file — Documented course correction

**Sprint Change Proposal:** `docs/sprint-artifacts/sprint-change-proposal-2025-11-30.md`

---

## Open Questions

1. Should "Edit Student" (demographics) be separate from "Edit Placement"?
   - Current thinking: Yes, different data domains

2. Where do performance metrics (attendance rate, discipline incidents) come from?
   - Need to check if this data exists in current schema

3. Should past placements be fully editable or just "add note"?
   - Probably just add note for audit trail integrity

---

*Document created: 2025-11-29*
*Last updated: 2025-11-29*
