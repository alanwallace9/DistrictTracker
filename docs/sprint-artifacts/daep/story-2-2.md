# Story 2-2: Student Profile Page with Demographics

**Epic:** 2 - Placement Management
**Story Points:** 3
**Status:** done
**FRs:** FR9, FR14, FR16

---

## User Story

**As a** DAEP staff member
**I want** to view a student's complete profile with demographics and placement info
**So that** I have full context when working with the student

---

## Acceptance Criteria

- [ ] **AC 2.2.1:** Profile page at `/daep/students/[school_id]` renders student data
- [ ] **AC 2.2.2:** Header shows photo placeholder, name, student ID, grade, home campus
- [ ] **AC 2.2.3:** Demographics section shows DOB, guardian name, guardian phone, parent email, emergency contact, address
- [ ] **AC 2.2.4:** Special flags (IEP, 504, ELL) displayed as colored badges when applicable
- [ ] **AC 2.2.5:** Current placement card shows status badge, days progress, room, offense code
- [ ] **AC 2.2.6:** When no active placement exists, appropriate empty state message displays
- [ ] **AC 2.2.7:** Placement history tab shows all past placements with date, days, offense, status
- [ ] **AC 2.2.8:** Quick actions: "Edit Placement" and "Add Note" buttons visible (link to future stories)
- [ ] **AC 2.2.9:** Non-existent student shows 404 page

---

## Tasks

### Task 1: Server Action - getStudentProfile()
- [x] Create `getStudentProfile(schoolId: string)` in `app/actions/daep/students.ts`
- [x] Query `trespass_records` for demographics by school_id
- [x] Query `daep_placements` for all placements (joined with room, campus, discipline code)
- [x] Return `StudentProfileResult` with student, currentPlacement, placementHistory
- [x] Handle "student not found" error case

### Task 2: Types and Interfaces
- [x] Add `StudentProfile` interface to students.ts
- [x] Add `PlacementDetail` interface to students.ts
- [x] Add `StudentProfileResult` interface to students.ts

### Task 3: Profile Page Route
- [x] Create `app/daep/(main)/students/[school_id]/page.tsx`
- [x] Create `app/daep/(main)/students/[school_id]/loading.tsx`
- [x] Create `app/daep/(main)/students/[school_id]/not-found.tsx`
- [x] Fetch profile data in server component
- [x] Handle notFound() if student doesn't exist

### Task 4: StudentProfileHeader Component
- [x] Create `components/daep/StudentProfileHeader.tsx`
- [x] Display avatar placeholder with initials
- [x] Display full name, student ID badge, grade level badge
- [x] Display special flag badges (IEP, 504, ELL) conditionally
- [x] Add "Edit Placement" and "Add Note" action buttons

### Task 5: StudentDemographicsCard Component
- [x] Create `components/daep/StudentDemographicsCard.tsx`
- [x] Display DOB with calculated age
- [x] Display guardian/parent section
- [x] Display emergency contact section
- [x] Display address if present
- [x] Use Card component from shadcn/ui

### Task 6: CurrentPlacementCard Component
- [x] Create `components/daep/CurrentPlacementCard.tsx`
- [x] Display status badge prominently
- [x] Display days progress bar (served / assigned)
- [x] Display offense code with label
- [x] Display home campus and assigned room
- [x] Display key dates (start, expected end)
- [x] Show 90-day assessment alert if required and not completed

### Task 7: PlacementHistoryTable Component
- [x] Create `components/daep/PlacementHistoryTable.tsx`
- [x] Use Table with columns: Incident #, Start Date, Days, Offense, Status, Outcome
- [x] Sort by start_date descending
- [x] Make rows clickable (future: navigate to placement detail)

### Task 8: Assemble Profile Page
- [x] Import all components into profile page
- [x] Implement 3-column grid layout (1 left, 2 right)
- [x] Add Tabs for History/Activity
- [x] Test loading and not-found states (build passed)

---

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-stories-2-2-2-3-2-10.md`

### Dependencies
- Story 2-1 (Student List View): DONE - provides navigation to profile
- Epic 1a schema: DONE - `daep_placements` table exists
- `trespass_records` table: EXISTS - contains student demographics

### Existing Patterns
- Server action pattern: `app/actions/daep/students.ts` (getDAEPStudents)
- Component pattern: `app/daep/settings/` components
- Card/Badge/Tabs: shadcn/ui components

### Notes
- Photo upload is future scope - use initials avatar for now
- Activity timeline tab is placeholder for Epic 4 (Story 4.5)
- "Edit Placement" links to Story 2-8, "Add Note" links to Story 4.1
