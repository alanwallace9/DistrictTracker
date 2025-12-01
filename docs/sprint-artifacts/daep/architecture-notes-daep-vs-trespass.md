# Architecture Notes: DAEP Module vs TrespassTracker

**Date:** 2025-11-30
**Source:** Story 2-9 validation discussion with Alan
**Status:** Architectural context for future stories

---

## Core Distinction: DAEP Students vs Trespass Records

| Concept | DAEP Module | TrespassTracker |
|---------|-------------|-----------------|
| **Primary Identity** | DAEP Student Record | Trespass Record |
| **Trespass Status** | Incidental — students ARE trespassed during DAEP stay | Primary purpose |
| **After Completion** | Inactive student, history persists by school year | Inactive on expiration, record preserved |
| **Searchability** | Always searchable by Student ID | Always searchable |
| **Relationship** | Not all trespass records are DAEP students | Can exist independently |

**Key Insight:** The two modules share records (via `trespass_records` table with `school_id`), but creating a DAEP placement is the primary action. The trespass status is a byproduct.

---

## DAEP Transition Workflow (Actual)

```
Student completes DAEP days
        ↓
DAEP Admin reviews, marks status = "met"
        ↓
📢 Notification to TEACHERS: "Prepare grade reports for [Student]"
        ↓
Teachers upload grade reports (PDF/Word to student profile)
        ↓
📢 Notification to DAEP ADMIN: "Grade reports ready for [Student]"
        ↓
DAEP Admin (or Home Campus Admin) marks "transition ready"
        ↓
📢 Notification to HOME CAMPUS ADMINS ONLY: "[Student] returning tomorrow"
   (with access to uploaded grade reports/docs)
```

### Notification Recipients

| Notification Type | Recipients |
|-------------------|------------|
| "Prepare grade reports" | Teachers (future: specific teachers assigned to student) |
| "Grade reports ready" | DAEP Admin who initiated transition |
| "Student returning" | ALL `campus_admin` users WHERE `campus_id = home_campus_id` |

**Critical:** Only the home campus admins get the return notification. With 33 campuses, notifying all would be problematic.

---

## Separate Feature: Early Warning Notifications

**Different from transition notifications.**

- Configured per-user via `notification_days` field in `user_profiles`
- Settings: 2, 3, 5, 7 days out
- Purpose: "Who's possibly returning to your campus soon?"
- Not tied to transition workflow

---

## Notification UI Concepts (Future)

| Feature | Description |
|---------|-------------|
| **Icon differentiation** | Green checkmark = confirmed returning; Exclamation = other alerts |
| **Grouping** | Multiple students = "X students returning tomorrow" |
| **Click to expand** | Shows list of students to process |
| **Per-notification opt-out** | Some notifications cannot be disabled (mandatory) |

---

## Document Upload Requirements (New Feature)

| Requirement | Details |
|-------------|---------|
| **Upload location** | Student profile, NOT placement record |
| **File types** | PDF, Word documents |
| **Access** | DAEP admins AND home campus admins |
| **Similar to** | TrespassTracker document upload (currently broken) |
| **Use case** | Grade reports, transition paperwork |

**Note:** This could repurpose or expand where trespass status info is displayed.

---

## Archive/History Behavior

### DAEP Students
- Completed placements → student becomes "inactive"
- History stored by school year
- Archived under previous year at year-end
- Remains searchable by Student ID indefinitely
- Multiple placements per student possible (historical record)

### Trespass Records
- Expiration date reached → status becomes "inactive"
- Record preserved for reference
- Searchable even after expiration
- Purpose: "They couldn't attend last week's game" verification

---

## MVP Query: Home Campus Admins

```sql
SELECT id, email, first_name, last_name
FROM user_profiles
WHERE tenant_id = $tenant_id
  AND campus_id = $home_campus_id  -- ONLY this campus
  AND role = 'campus_admin'         -- MVP: hardcoded role
  AND deleted_at IS NULL
```

### Future Enhancements (Post-MVP)

1. **Role expansion:** Add `principal`, `assistant_principal`, `counselor` roles
2. **Per-campus notification config:** UI to select which users at each campus receive notifications
3. **`receives_daep_return_notifications` flag:** Per-user toggle for this specific notification type
4. **Notification opt-out rules:** Some notifications mandatory, others optional

---

## Schema Ready, Data Needed

| Table | Field | Status |
|-------|-------|--------|
| `user_profiles` | `campus_id` | Exists, currently null for all users |
| `user_profiles` | `role` | Exists, only `super_admin` defined so far |
| `user_profiles` | `notifications_enabled` | Exists, for general opt-out |
| `user_profiles` | `notification_days` | Exists, for early warning only |
| `campuses` | `is_daep` | Exists, distinguishes DAEP campus |

**Action needed:** Create `campus_admin` users and assign them to campuses for testing.

---

## Tech Debt / Future Stories

- [ ] Document upload feature (similar to TrespassTracker, needs fixing there too)
- [ ] Notification system epic (icons, grouping, opt-out rules)
- [ ] Role hierarchy: principal > assistant_principal > counselor > campus_admin
- [ ] Per-campus notification recipient configuration
- [ ] `receives_daep_return_notifications` flag on user_profiles
- [ ] Teacher assignment to students for grade report notifications
