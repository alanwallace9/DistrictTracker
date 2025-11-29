# Story 1.4: Approved Teacher Flag

## Story

**As an** administrator
**I want** to designate specific teachers as "approved" for immediate point posting
**So that** trusted staff don't need admin approval for their point entries

**Story Key:** 1-4-approved-teacher-flag
**Epic:** 1a - Core Schema & Security
**Points:** 2
**Priority:** High
**FRs:** FR5

---

## Acceptance Criteria

- [x] AC1: `approved_teacher` column exists on `user_profiles` with BOOLEAN type, default false
- [x] AC2: Admin panel shows "Approved Teacher" toggle on user edit for `daep_staff` and `daep_admin_l2` users
- [x] AC3: Toggle only visible for appropriate roles (hidden for district_admin, parent, student, etc.)
- [x] AC4: Flag can be changed without affecting other user properties
- [x] AC5: Audit log records when `approved_teacher` flag is changed

---

## Technical Notes

- This flag is per-user, not per-room
- Used in Story 3.5 and 3.6 for point approval workflow
- Only `daep_staff` and `daep_admin_l2` roles should show the toggle
- The flag determines if point entries need admin approval before finalizing

---

## Tasks/Subtasks

- [x] **Task 1: Database Migration**
  - [x] Create migration to add `approved_teacher` boolean column to `user_profiles`
  - [x] Set default value to `false`
  - [x] Verify migration runs without errors

- [x] **Task 2: Update TypeScript Types**
  - [x] Add `approved_teacher` field to UserProfile type in lib/supabase.ts
  - [x] Add field to AdminUserListItem type in app/actions/admin/users.ts (inherits from UserProfile)

- [x] **Task 3: Update Server Action**
  - [x] Add `approvedTeacher` parameter to updateUserRole() function
  - [x] Include approved_teacher in audit log details when changed

- [x] **Task 4: Update Admin Panel UI**
  - [x] Add state variable for approved teacher toggle
  - [x] Add toggle to edit dialog (only visible for daep_staff/daep_admin_l2 roles)
  - [x] Pass approved teacher value to updateUserRole()

- [x] **Task 5: Create Helper Function**
  - [x] Add canHaveApprovedTeacherFlag() function in lib/roles.ts
  - [x] Returns true only for daep_staff and daep_admin_l2 roles

---

## Dev Notes

**Technical Approach:**
- Simple column addition to existing user_profiles table
- UI toggle only visible when editing users with daep_staff or daep_admin_l2 role
- Audit logging leverages existing logAuditEvent() infrastructure
- No RLS changes needed (column is on user_profiles, already has RLS)

**Roles eligible for approved_teacher flag:**
- `daep_staff` - Primary use case, classroom teachers
- `daep_admin_l2` - May also enter points, can be approved

**Dependencies:**
- Story 1.3 (New Roles) must be complete (Done)

---

## Dev Agent Record

### Debug Log
- Session started: 2025-11-25
- Story file created
- Ready for implementation
- Applied migration `20251125100000_add_approved_teacher_flag.sql` to Supabase
- Verified `approved_teacher` column exists with BOOLEAN type, default false
- Also added missing `notification_days` column (was in TypeScript types but not DB)
- Updated UserProfile type in lib/supabase.ts
- Added `approvedTeacher` parameter to updateUserRole() server action
- Updated audit log to track approved_teacher changes
- Created canHaveApprovedTeacherFlag() helper function in lib/roles.ts
- Added APPROVED_TEACHER_ELIGIBLE_ROLES constant for daep_staff and daep_admin_l2
- Updated admin panel UI with Switch toggle for approved teacher
- Toggle conditionally renders based on role eligibility
- Build verification passed - TypeScript compiles successfully

### Completion Notes
**Implementation Summary:**
1. Database migration adds `approved_teacher` BOOLEAN column (default false) to user_profiles
2. TypeScript UserProfile type updated with `approved_teacher: boolean`
3. Server action updateUserRole() accepts optional `approvedTeacher` parameter
4. Audit log captures old/new approved_teacher values when changed
5. lib/roles.ts exports:
   - `APPROVED_TEACHER_ELIGIBLE_ROLES` constant
   - `canHaveApprovedTeacherFlag()` function
6. Admin panel edit dialog shows toggle only for daep_staff/daep_admin_l2 roles
7. Toggle uses shadcn/ui Switch component with descriptive label

---

## File List

### New Files
- `supabase/migrations/20251125100000_add_approved_teacher_flag.sql` - Database migration

### Modified Files
- `lib/supabase.ts` - Add approved_teacher to UserProfile type
- `lib/roles.ts` - Add canHaveApprovedTeacherFlag() helper and APPROVED_TEACHER_ELIGIBLE_ROLES
- `app/actions/admin/users.ts` - Add approvedTeacher parameter and audit logging
- `app/admin/users/page.tsx` - Add toggle to edit dialog with conditional rendering

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-25 | Story file created | Dev Agent |
| 2025-11-25 | Implementation complete - all tasks done | Dev Agent |

---

## Status

**Current Status:** review
**Last Updated:** 2025-11-25
