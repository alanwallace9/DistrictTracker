# Story 2-3: TrespassTracker Status Display

**Epic:** 2 - Placement Management
**Story Points:** 2
**Status:** done
**FRs:** FR15, FR76

---

## User Story

**As a** DAEP staff member
**I want** to see if a student has active trespass records
**So that** I'm aware of their full disciplinary history

---

## Acceptance Criteria

- [ ] **AC 2.3.1:** TrespassTracker Status section visible on student profile page
- [ ] **AC 2.3.2:** Shows "No records found" if student has no TrespassTracker records
- [ ] **AC 2.3.3:** Displays is_daep flag status as "DAEP Flagged" badge
- [ ] **AC 2.3.4:** Displays daep_expiration_date when set
- [ ] **AC 2.3.5:** Shows total record count badge
- [ ] **AC 2.3.6:** Shows most recent incident date
- [ ] **AC 2.3.7:** Warning banner displays if TrespassTracker status is "active"
- [ ] **AC 2.3.8:** "View in TrespassTracker" link present and navigates to TT detail
- [ ] **AC 2.3.9:** Link hidden if user has `daep_only` module access

---

## Tasks

### Task 1: Server Action - getTrespassTrackerStatus()
- [x] Create `getTrespassTrackerStatus(schoolId: string)` in `app/actions/daep/students.ts`
- [x] Query `trespass_records` by tenant_id and school_id
- [x] Return record count, is_daep, daep_expiration_date, status, expiration_date
- [x] Return most recent incident info (id, description, incident_date)
- [x] Handle case where no records exist

### Task 2: Types and Interfaces
- [x] Add `TrespassTrackerStatusResult` interface to students.ts
- [x] Include hasRecord, recordCount, isDAEP, daepExpirationDate
- [x] Include trespassStatus, trespassExpirationDate, mostRecentIncident

### Task 3: TrespassTrackerStatus Component
- [x] Create `components/daep/TrespassTrackerStatus.tsx`
- [x] Implement as client component with useEffect for data fetching
- [x] Display loading state (skeleton)
- [x] Display empty state for no records
- [x] Display status badges (TT status, DAEP flag, record count)
- [x] Display expiration dates formatted
- [x] Display most recent incident date

### Task 4: Active Warning Banner
- [x] Add warning banner for active trespass status
- [x] Use AlertTriangle icon with theme-compliant destructive styling
- [x] Banner text: "Active Trespass Record"
- [x] Apply destructive border to card when active

### Task 5: Module Access Check
- [x] Check user's module_access before showing TT link
- [x] Hide "View in TrespassTracker" for daep_only users
- [x] Implemented via moduleAccess prop (defaults to 'both')

### Task 6: Integrate with Profile Page
- [x] Import TrespassTrackerStatus into student profile page
- [x] Place in left column below demographics card
- [x] TypeScript compilation verified

---

## Dev Agent Record

### Context Reference
- Tech Spec: `docs/sprint-artifacts/tech-spec-stories-2-2-2-3-2-10.md`

### Dependencies
- Story 2-2 (Student Profile Page): Must be implemented first - provides profile page structure
- `trespass_records` table: EXISTS - contains TT status fields
- `user_profiles.module_access`: EXISTS from Epic 1a

### Existing Patterns
- Client component data fetching: See `app/daep/students/page.tsx`
- Badge styling: shadcn/ui Badge component
- Alert/warning: shadcn/ui Alert component

### Notes
- TrespassTracker module may have different record structure - verify schema
- Module access check requires useUser hook or similar
- Link uses Next.js Link component for client-side navigation
