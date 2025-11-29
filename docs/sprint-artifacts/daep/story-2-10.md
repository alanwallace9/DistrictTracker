# Story 2-10: Prevent Duplicate Active Placements

**Epic:** 2 - Placement Management
**Story Points:** 1
**Status:** done
**FRs:** FR24

---

## User Story

**As the** system
**I want** to prevent creating duplicate active placements for the same student
**So that** data integrity is maintained

---

## Acceptance Criteria

- [ ] **AC 2.10.1:** Creating placement for student with active/pending/transition placement fails with error
- [ ] **AC 2.10.2:** Error message includes incident number of existing active placement
- [ ] **AC 2.10.3:** Database unique constraint blocks duplicate (tenant_id, school_id, incident_number)
- [ ] **AC 2.10.4:** Multiple placements with different incident numbers allowed if previous are complete (recidivism)
- [ ] **AC 2.10.5:** Completed placements don't block new placements (only pending/active/transition)
- [ ] **AC 2.10.6:** UI warning component displays when selecting student with active placement

---

## Tasks

### Task 1: Server Action - checkActivePlacement()
- [x] Create `checkActivePlacement(schoolId, excludePlacementId?)` in `app/actions/daep/placements.ts`
- [x] Query `daep_placements` for status IN ('pending', 'active', 'transition')
- [x] Exclude specified placement ID (for edit scenarios)
- [x] Return { hasActive: boolean, activePlacement: { id, incident_number, status } | null }

### Task 2: Server Action - validatePlacement()
- [x] Create `validatePlacement(schoolId, incidentNumber, excludePlacementId?)` in placements.ts
- [x] Check for duplicate incident number (same student + same incident)
- [x] Check for active placement (same student + any incident + active status)
- [x] Return { valid: boolean, error?: string }

### Task 3: ActivePlacementWarning Component
- [x] Create `components/daep/ActivePlacementWarning.tsx`
- [x] Implement as client component with useEffect
- [x] Fetch active placement status on schoolId change
- [x] Display Alert with destructive variant when active placement exists
- [x] Include link to student profile for managing existing placement

### Task 4: Integration with createPlacement()
- [x] Updated createPlacement() to call validatePlacement() before insert
- [x] Error response format returns { success: false, error: string }
- [x] Integration complete - validates both duplicate incident and active placement

### Task 5: Database Constraint Verification
- [x] Verified UNIQUE(tenant_id, school_id, incident_number) exists in migration
- [x] Constraint at: supabase/migrations/20251124221840_create_daep_schema.sql:189
- [x] Friendly error messages via validatePlacement() before DB constraint hit

---

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-stories-2-2-2-3-2-10.md`

### Dependencies
- Epic 1a schema: DONE - unique constraint exists on daep_placements
- Story 2-4 (Create Placement): FUTURE - will consume validatePlacement()

### Existing Patterns
- Server action error handling: See existing actions
- Alert component: shadcn/ui Alert with destructive variant

### Validation Rules
1. **Same student + same incident_number:** Blocked by DB unique constraint
2. **Same student + different incident + active status:** Blocked by application logic
3. **Same student + different incident + complete status:** Allowed (recidivism tracking)

### Notes
- This is a foundational story - provides validation logic for Story 2-4
- excludePlacementId parameter needed for edit scenarios (Story 2-8)
- Keep error messages user-friendly with actionable information
