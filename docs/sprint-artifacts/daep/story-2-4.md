# Story 2-4: Placement Creation Form

**Epic:** 2 - Placement Management
**Points:** 5
**Status:** Done
**FRs:** FR9, FR15-FR17

---

## Summary

Create new DAEP placement form with student search, offense code selection, and automated expected end date calculation.

---

## Acceptance Criteria

| AC | Description | Status |
|----|-------------|--------|
| 2.4.1 | Form to create new placement with required fields | Done |
| 2.4.2 | Student search/select (by name or school ID) | Done |
| 2.4.3 | Offense code dropdown (from daep_discipline_codes) | Done |
| 2.4.4 | Home campus dropdown (from campuses where tenant matches) | Done |
| 2.4.5 | Days assigned input with validation (1-365) | Done |
| 2.4.6 | Auto-calculate expected_end_date from school calendar | Done |
| 2.4.7 | Mandatory placement flag (auto-set based on offense code) | Done |
| 2.4.8 | Incident number input (links to trespass record) | Done |
| 2.4.9 | Prevent duplicate placements (same student + incident_number) | Done |
| 2.4.10 | Create trespass_record if student not in system | Done |
| 2.4.11 | Audit log entry on placement creation | Done |

---

## Implementation Summary

### Files Created/Modified

**Server Actions:**
- `app/actions/daep/placements.ts` - Complete placement management actions
  - `getDisciplineCodesForForm()` - Fetch active discipline codes
  - `getCampusesForForm()` - Fetch tenant campuses
  - `searchStudentsForPlacement()` - Debounced student search
  - `checkDuplicatePlacement()` - Prevent duplicate placements
  - `createPlacement()` - Create placement with validation
  - `getExpectedEndDatePreview()` - Calculate end date preview
  - `createQuickStudent()` - Create minimal student record (AC 2.4.10)

**Utility:**
- `lib/daep/days-remaining.ts` - Days calculation utility
  - `calculateExpectedEndDate()` - Based on school calendar
  - `calculateDaysServed()` - Count school days served
  - `calculateDaysRemaining()` - Days left in placement
  - `previewExpectedEndDate()` - Form preview with estimate flag

**Validation Schemas:**
- `lib/validation/schemas.ts`
  - `CreatePlacementSchema` - Full placement validation
  - `QuickStudentSchema` - Minimal student creation

**UI:**
- `app/daep/placements/new/page.tsx` - Full placement form
  - Student typeahead search
  - Auto-populated home campus
  - Real-time end date calculation
  - Duplicate placement detection
  - "Create New Student" dialog (AC 2.4.10)

**Audit Events:**
- `lib/audit-logger.ts` - Added `student.quick_created` event type

---

## Route

`/daep/placements/new`

---

## Technical Notes

1. **Days Calculation**: Uses school calendar (`daep_school_calendar`) when available, falls back to estimation (5 school days/week, 10% buffer for holidays)

2. **Duplicate Prevention**: Checks `school_id + incident_number` combination before creation

3. **Mandatory Placement**: Auto-sets based on offense code's `mandatory_placement` flag, can be overridden

4. **New Student Flow**: When student not found, opens dialog to create minimal trespass_record with:
   - Required: school_id, first_name, last_name
   - Optional: grade_level, campus_id

5. **Tenant Isolation**: All queries use `active_tenant_id || tenant_id` pattern for super_admin support

---

## Definition of Done

- [x] All acceptance criteria met
- [x] TypeScript compiles without errors
- [x] Build passes
- [x] Audit logging implemented
- [x] Tenant isolation verified
