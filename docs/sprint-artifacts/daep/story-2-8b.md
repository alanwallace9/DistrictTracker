# Story 2.8b: Inline Student & Placement Editing

**Status:** drafted
**Epic:** 2 - Placement Management
**Points:** 5
**FRs:** FR18 (enhances existing), FR9 (student data)
**Predecessor:** Story 2-8 (Edit Placement)

---

## Story

As a **DAEP administrator**,
I want **to edit student demographics and placement details directly on the student profile page without navigating away**,
So that **I can make corrections and updates while maintaining full context of the student's record**.

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 2.8b.1 | Student profile page has Edit button in header action bar | Click Edit → page enters edit mode |
| 2.8b.2 | Editable student fields: guardian_name, guardian_phone, guardian_email, home_campus_id, grade_level, gender, race_ethnicity | Fields render as inputs in edit mode |
| 2.8b.3 | Non-editable student fields: student_id (school_id), first_name, last_name (unless correction needed - admin only) | These fields remain read-only or require elevated permission |
| 2.8b.4 | Editable placement fields: days_assigned, assigned_room_id, intake_notes, completion_notes, placement_reason, offense_code | Placement section fields editable |
| 2.8b.5 | Room assignment inline-editable via edit icon (replaces modal) | Click room edit icon → dropdown appears inline with separation logic |
| 2.8b.6 | Room dropdown enforces separation constraints | Rooms with separated students grayed out and not selectable |
| 2.8b.7 | Save/Cancel buttons appear in edit mode | Save persists all changes, Cancel reverts |
| 2.8b.8 | Uses existing validation schemas | UpdatePlacementSchema + new UpdateStudentSchema |
| 2.8b.9 | All changes logged to audit trail | Uses existing logAuditEvent() |
| 2.8b.10 | Role-based field access | Lower-privilege roles may only edit room assignment |

---

## Tasks / Subtasks

### Task 1: Add Edit Mode State to Student Profile Page
- [ ] 1.1 Add `isEditing` state to student profile page
- [ ] 1.2 Modify Edit button in header to toggle edit mode (not navigate away)
- [ ] 1.3 Conditionally render view mode vs edit mode across all sections

### Task 2: Inline Edit Form Fields - Student Demographics
- [ ] 2.1 Create inline input for guardian_name
- [ ] 2.2 Create inline input for guardian_phone
- [ ] 2.3 Create inline input for guardian_email
- [ ] 2.4 Create inline select for home_campus_id (campus dropdown)
- [ ] 2.5 Create inline select for grade_level
- [ ] 2.6 Create inline select for gender
- [ ] 2.7 Create inline select for race_ethnicity
- [ ] 2.8 Keep student_id, first_name, last_name as read-only (or admin-editable with confirmation)

### Task 3: Inline Edit Form Fields - Placement
- [ ] 3.1 Create inline input for days_assigned (number)
- [ ] 3.2 Create inline select for offense_code (from discipline_codes table)
- [ ] 3.3 Create inline select for assigned_room_id with separation enforcement
- [ ] 3.4 Create inline textarea for placement_reason
- [ ] 3.5 Create inline textarea for intake_notes
- [ ] 3.6 Create inline textarea for completion_notes

### Task 4: Room Assignment Inline Edit (Replace Modal)
- [ ] 4.1 Replace room assignment modal with inline dropdown on edit icon click
- [ ] 4.2 Dropdown calls getAvailableRoomsForStudent() for options
- [ ] 4.3 Gray out and disable rooms with separation conflicts
- [ ] 4.4 Show tooltip on disabled rooms explaining separation reason
- [ ] 4.5 Role-based: users with room-only access can edit just this field

### Task 5: Save/Cancel Actions
- [ ] 5.1 Add Save button that calls updateStudent() + updatePlacement()
- [ ] 5.2 Add Cancel button that reverts to original values
- [ ] 5.3 Show loading state during save
- [ ] 5.4 Show toast on success/error
- [ ] 5.5 Exit edit mode on successful save

### Task 6: Server Actions - Student Update
- [ ] 6.1 Add UpdateStudentSchema to lib/validation/schemas.ts
- [ ] 6.2 Add updateStudent() server action to app/actions/daep/students.ts
- [ ] 6.3 Validate tenant isolation
- [ ] 6.4 Log changes to audit trail

### Task 7: Clean Up Redundant UI
- [ ] 7.1 Remove Edit button from CurrentPlacementCard (keep only header Edit)
- [ ] 7.2 Remove or deprecate room assignment modal (replaced by inline)
- [ ] 7.3 Keep edit page at /daep/placements/[id]/edit as fallback (remove later)

---

## Dev Notes

### Key Patterns

**Reuse from Story 2-8:**
- `UpdatePlacementSchema` from `lib/validation/schemas.ts`
- `updatePlacement()` from `app/actions/daep/placements.ts`
- `getOffenseCodesForForm()` for offense dropdown

**CRITICAL - Room Separation Logic:**
- `getAvailableRoomsForStudent()` from `app/actions/daep/rooms.ts` enforces separation constraints
- This MUST be used for any room selection UI
- Rooms with separation conflicts must be visually disabled (grayed out, not selectable)
- Tooltip should explain why room is unavailable
- Future enhancement: Room grouping for hallway/wing-level separation (see backlog)

**Role-Based Access:**
- Full edit: daep_admin_l1, daep_admin_l2, district_admin, super_admin
- Room-only edit: May include additional roles (e.g., teachers with room assignment permission)
- Implement field-level permission checks

**New Server Action Needed:**
- `updateStudent()` — similar pattern to updatePlacement()
- Must handle guardian info, campus, demographic fields

### Components to Modify
- `app/daep/(main)/students/[school_id]/page.tsx` — add edit mode
- `components/daep/CurrentPlacementCard.tsx` — remove edit button, add inline edit fields
- `components/daep/StudentDemographicsCard.tsx` (or equivalent) — add inline edit fields

### Remove/Deprecate
- Room assignment modal — replaced by inline edit
- Edit button on CurrentPlacementCard — consolidated to header

### Reference Design
See `docs/sessions/ux-refactor-story-2-8-planning.md` Section "Inline Edit Pattern"

---

## Related Backlog Items

1. **Multiple Guardian Contacts** (Medium priority)
   - Allow adding additional phone/email without overwriting
   - See: `docs/sprint-artifacts/daep/backlog-multiple-guardian-contacts.md`

2. **Room Grouping for Separation** (HIGH priority)
   - Group rooms by hallway/wing/lunch schedule for broader separation logic
   - See: `docs/sprint-artifacts/daep/backlog-room-grouping-separation.md`

---

## Known Issues to Investigate

**BUG: Offense code auto-changing**
- Observed: offense_code changed from 21 (Violation Code of Conduct) to 22 overnight
- Expected: offense_code should be static unless manually updated
- Action: Investigate if there's a trigger or scheduled job modifying this field
- See: `docs/sprint-artifacts/daep/bug-offense-code-auto-change.md`

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-11-30 | SM Agent | Story created via correct-course workflow |
| 2025-11-30 | SM Agent | Expanded scope per PO feedback: full student record editing |
