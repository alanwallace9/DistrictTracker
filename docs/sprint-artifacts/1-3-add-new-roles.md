# Story 1.3: Add New DAEP Roles

## Story

**As an** administrator
**I want** to assign DAEP-specific roles to users
**So that** staff have appropriate permissions for their responsibilities

**Story Key:** 1-3-add-new-roles
**Epic:** 1a - Core Schema & Security
**Points:** 3
**Priority:** High
**FRs:** FR3, FR4

---

## Acceptance Criteria

- [x] AC1: New roles added to `user_profiles.role` enum: `daep_admin_l1`, `daep_admin_l2`, `daep_staff`, `parent`, `student`, `counselor`
- [x] AC2: Role permissions documented in code comments
- [x] AC3: Admin panel role dropdown includes new roles
- [x] AC4: RLS policies updated to handle new roles
- [x] AC5: Role hierarchy: district_admin > daep_admin_l1 > daep_admin_l2 > daep_staff
- [x] AC6: Parent/Student roles have read-only access to own data only
- [x] AC7: Existing roles (viewer, campus_admin, district_admin, master_admin) unchanged

---

## Role Definitions

| Role | Scope | Permissions |
|------|-------|-------------|
| daep_admin_l1 | DAEP campus | Full DAEP ops, point approval, staff management |
| daep_admin_l2 | DAEP campus | Daily ops, point entry, limited reports |
| daep_staff | Assigned rooms | Point entry, attendance, behavior notes |
| parent | Own child | Read-only student progress |
| student | Self | Read-only own progress |
| counselor | Assigned students | View profiles, placement history |

---

## Tasks/Subtasks

- [x] **Task 1: Database Migration**
  - [x] Create migration to extend user_profiles.role constraint with 6 new roles
  - [x] Verify migration runs without errors
  - [x] Verify existing roles still work

- [x] **Task 2: Create Role Utilities (lib/roles.ts)**
  - [x] Define ROLE_HIERARCHY constant with numeric levels
  - [x] Create hasPermission() utility function
  - [x] Create DAEP_ROLES and TRESPASS_ROLES arrays
  - [x] Add comprehensive JSDoc comments documenting each role

- [x] **Task 3: Update TypeScript Types**
  - [x] Update UserProfile.role type in lib/supabase.ts
  - [x] Update role parameter type in app/actions/admin/users.ts

- [x] **Task 4: Update Admin Panel UI**
  - [x] Add new roles to filter dropdown in users page
  - [x] Add new roles to edit dialog role selector
  - [x] Group roles by category (TrespassTracker, DAEP, Special)

- [x] **Task 5: Update RLS Policies**
  - [x] Create RLS policy function for role-based access (has_role_permission, is_daep_role, is_readonly_role)
  - [x] Update existing policies to recognize new roles
  - [x] Add read-only policies for parent/student roles

---

## Dev Notes

**Technical Approach:**
- Extend existing CHECK constraint on user_profiles.role column
- New roles integrate into existing role-based permission system
- Role hierarchy defined in lib/roles.ts for consistent permission checks
- Admin panel updates are UI-only; no new server actions needed

**Role Hierarchy (numeric):**
```
master_admin: 100
district_admin: 90
daep_admin_l1: 80
campus_admin: 70
daep_admin_l2: 60
daep_staff: 50
counselor: 40
viewer: 30
parent: 20
student: 10
```

**Dependencies:**
- Story 1.2 (Module Access) must be complete (✓ Done)

---

## Dev Agent Record

### Debug Log
- Session started: 2025-11-25
- Loading implementation context from tech-spec-epic-1a.md
- Current role constraint includes: viewer, campus_admin, district_admin, master_admin
- Need to add: daep_admin_l1, daep_admin_l2, daep_staff, parent, student, counselor
- Created migration: 20251125000153_add_daep_roles.sql
- Applied migration successfully to Supabase
- Created lib/roles.ts with role hierarchy utilities
- Updated TypeScript types in lib/supabase.ts and app/actions/admin/users.ts
- Updated admin panel UI with categorized role dropdowns
- Applied RLS policy migration for role-based access control
- Verified all helper functions work correctly

### Completion Notes
**Implementation Summary:**
1. Database migration added 6 new roles to user_profiles.role CHECK constraint
2. Created lib/roles.ts with:
   - ROLE_HIERARCHY constant (numeric levels 10-100)
   - hasPermission(), hasPermissionLevel() utilities
   - isDaepRole(), isTrespassRole(), isReadOnlyRole() checks
   - ROLE_INFO object for UI labels and descriptions
   - getAssignableRoles() for role assignment logic
3. Updated TypeScript types to include all 10 roles
4. Updated admin panel with categorized role dropdowns (TrespassTracker, DAEP, Special)
5. Created SQL helper functions: has_role_permission(), is_daep_role(), is_readonly_role()
6. Added RLS policies to enforce parent/student read-only access on DAEP tables
7. Updated user_profiles UPDATE policy to allow daep_admin_l1 to manage users

---

## File List

### New Files
- `lib/roles.ts` - Role hierarchy and permission utilities
- `supabase/migrations/20251125000153_add_daep_roles.sql` - Database migration (roles constraint + helper functions)

### Modified Files
- `lib/supabase.ts` - Update UserProfile.role type
- `app/actions/admin/users.ts` - Update role parameter types
- `app/admin/users/page.tsx` - Update role dropdowns

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
