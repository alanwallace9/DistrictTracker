# Future Backlog Items

Items identified during development that should be addressed in future sprints.

---

## HIGH PRIORITY

### Admin Panel & Settings Consolidation
**Priority:** HIGH
**Identified:** 2025-11-26
**Type:** Architecture Decision

Currently we have:
- `/admin` - Admin panel (built for trespass, but really district-wide: users, campuses, audit logs, reports)
- `/daep/settings` - DAEP-specific settings (rooms, schedules, codes, calendar, behaviors)

**Problem:**
- Navigation confusion: "Back to Dashboard" doesn't know if user came from DAEP or Trespass
- Admin panel on demo subdomain doesn't show "DEMO" branding
- No tenant name visible in admin panel header
- Unclear what's module-specific vs district-wide

**Consideration:** Merge into unified "District Tracker Admin Panel" with sections:
```
Admin Panel
├── District Settings (timezone, etc.) - shared
├── Trespass Tracker
│   └── (trespass-specific settings if any)
├── DAEP Management
│   ├── Rooms
│   ├── Schedules
│   ├── Codes
│   ├── Calendar
│   └── Behaviors
├── Users & Campuses - shared
├── Audit Logs - shared
└── Reports - shared (or per-module tabs)
```

**Visibility:** Left nav items shown based on role + module access

**Questions to resolve:**
1. Should DAEP settings move into main admin panel?
2. Or keep separate but improve navigation between them?
3. How to handle module-specific vs shared settings?
4. Alphabetical ordering? (DAEP, then Trespass, then shared at bottom?)

**Needs:** Party mode brainstorming session before decision

---

### Changelog & Versioning System
**Priority:** HIGH
**Identified:** 2025-11-26

Set up automated changelog generation and semantic versioning for acquisition-readiness documentation.

**Technical Setup:**
1. Install `standard-version` npm package
2. Configure conventional commit enforcement (optional: commitlint + husky)
3. Auto-generate `CHANGELOG.md` on version bumps
4. Semantic versioning: major.minor.patch (e.g., 1.2.3)

**Deliverables:**
- `CHANGELOG.md` at project root (auto-generated, technical)
- `/whats-new` customer-facing page (manually curated, marketing-friendly)
- `docs/releases/` folder for drafting release notes

**Why Important:**
- Acquisition readiness - shows professional development process
- Customer communication - "What's New" feature announcements
- Developer documentation - track all changes over time
- Security audit trail - document when vulnerabilities were fixed

**Commands to run:**
```bash
npm install --save-dev standard-version
npx standard-version --first-release  # Creates initial CHANGELOG.md
npx standard-version                   # Subsequent releases
```

---

### Role-Based Module Access Defaults in Invite Form
**Priority:** HIGH
**Identified:** 2025-11-26

Auto-select module access based on role selection in invite form:
- `student`, `parent` → DAEP Only (hide "Both Modules" option)
- `daep_admin_l1`, `daep_admin_l2`, `daep_staff` → DAEP Only
- All others → Both Modules (default)

---

### Resend Invite Action
**Priority:** HIGH
**Identified:** 2025-11-26

Add "Resend Invite" option in user actions for users with `invited` status who haven't completed signup. Prevents need to delete and recreate user.

---

### Invite Expiration Tracking
**Priority:** HIGH
**Identified:** 2025-11-26

Track invitation expiration dates and show status in user management:
- `invited` → `expired` after X days
- Visual indicator for expired invites
- Option to resend or revoke expired invites

---

### Testing Report Accuracy & Audit Log Completeness
**Priority:** HIGH
**Identified:** 2025-11-26

Verify that all reports and audit logs are accurately tracking all system events.

**Concerns:**
- Audit logs may not be capturing all user actions
- Report data may have gaps or inaccuracies
- Need comprehensive review of what's being tracked vs. what should be tracked

**Approach:**
- Use a **party mode session** to have all agents review the current audit logging and reporting implementation
- Cross-reference: What actions exist? What's being logged? What's missing?
- Compare report outputs against raw data to verify accuracy

**Areas to Review:**
- `lib/audit-logger.ts` - What events are being logged?
- All server actions - Are they calling `logAuditEvent()`?
- Report queries - Are they pulling correct/complete data?
- Dashboard metrics - Do they match underlying data?

---

## UI/UX Improvements

### Profile Dropdown Consistency
**Priority:** Medium
**Identified:** 2025-11-26

Add consistent profile dropdown to admin panel and DAEP settings layouts (like trespass DashboardLayout has). Currently these pages only have "Back to..." buttons.

**Considerations:**
- May move profile to left nav (bottom left corner, near support/help)
- Should include: user info, settings access, sign out
- Consistent with main dashboard experience

---

### Modal Styling Systematization
**Priority:** Low
**Identified:** 2025-11-25

Update grayish/dingy modal backgrounds to match the new color scheme across all dialogs. Need to:
- Audit all Dialog components across the codebase
- Update to consistent white/slate-50 backgrounds
- Ensure consistent border, shadow, and spacing patterns
- Components to review: InviteUserDialog, BulkUserUploadDialog, edit dialogs on admin pages, confirmation dialogs, etc.

---

## Feature Enhancements

### Ghost Mode - Support Impersonation
**Priority:** Medium (Future)
**Identified:** 2025-11-26 (Party Mode Session 2)
**Type:** Feature

Remote support feature allowing super_admin to perform actions on behalf of users with full audit trail.

**Use Case:** When a tenant needs support, super_admin can "log in as them" to diagnose and fix issues.

**Requirements:**
- MOU/consent must be in place with tenant
- All actions logged with: "Update by [Super Admin Name] on behalf of [User Name] at [timestamp]"
- Clear visual indicator that Ghost Mode is active
- Educational need-to-know justification (FERPA compliance)
- Session can be time-limited for safety

**Audit Log Format:**
```
Action: Updated student record
Performed by: Alan Wallace (super_admin)
On behalf of: Sam Johnson (campus_admin)
Tenant: Jefferson ISD
Timestamp: August 23, 2026 2:30 PM
Justification: Support ticket #12345
```

**Distinction from View-Only Impersonation:**
- View-Only: See what they see, cannot act (current impersonation)
- Ghost Mode: See AND act on their behalf with full audit (this feature)

---

### Year Picker / School Year Selector
**Priority:** Medium
**Identified:** 2025-11-26 (Party Mode Session 2)
**Type:** UI Component

Add school year picker similar to Focus SIS pattern (see reference screenshot).

**Use Case:** Allow users to view historical data by selecting previous school years.

**Requirements:**
- Dropdown selector showing available school years (e.g., "2024-2025", "2023-2024")
- Default to current school year
- Filter all data views by selected year
- Grading period sub-selector (e.g., "4th 9 Weeks", "QT2")
- Persist selection during session
- Show current period indicator

**Affected Modules:**
- DAEP Management (placement history, attendance)
- Trespass Tracker (incident history, reports)
- Admin Panel (audit logs, reports)

**Reference:** Focus SIS year picker pattern

---

### Demo Guide PDF
**Priority:** Low
**Identified:** 2025-11-26 (Party Mode Session 1)
**Type:** Documentation

Create downloadable PDF guide for demo users explaining:
- Available demo roles and what each can do
- Sample workflows to try
- Feature highlights
- How to provide feedback

**Owner:** Paige (Tech Writer) to help draft

---

### Module-Specific RLS Mapping
**Priority:** Medium
**Identified:** 2025-11-27 (Party Mode Session 2)
**Type:** Architecture / Security

Define granular Row-Level Security permissions per module and role.

**Trespass Tracker:**
| Role | See Records | Edit Records |
|------|-------------|--------------|
| Viewer | Own campus only | None |
| Campus Admin | ALL records | Only own campus students |
| District Admin | ALL records | ALL records |

**DAEP Management:**
| Role | See Records | Edit Records |
|------|-------------|--------------|
| Student | Own record only | None |
| Parent | Own child only | None |
| Counselor | TBD | TBD |
| DAEP Staff | TBD | TBD |
| DAEP Admin L1 | TBD | TBD |
| DAEP Admin L2 | TBD | TBD |
| Campus Admin | Only own campus students | Very limited (photo, parent contact) |
| District Admin | ALL students | ALL fields |

**Future Enhancement:** Outlook-style granular field-level permissions (see/edit specific fields per role)

**Action Required:** Complete mapping during Epic implementation planning

---

### Campus Admin Role in Admin Panel - Review Needed
**Priority:** Medium
**Identified:** 2025-11-27 (Party Mode Session 2)
**Type:** Architecture Decision

**Question:** Should Campus Admin have access to the Admin Panel?

**Current State:** Campus Admin is listed in admin panel role options, but unclear if intentional.

**Considerations:**
- What would Campus Admin legitimately do in Admin Panel?
- Can they manage users for their campus only?
- Can they view audit logs for their campus only?
- Or should Admin Panel be restricted to DAEP Admin L1+, District Admin, Super Admin?

**Decision Needed:** Party mode or architecture review session

---

### Outlook-Style Granular Permissions
**Priority:** Low (Future)
**Identified:** 2025-11-27 (Party Mode Session 2)
**Type:** Feature / Architecture

Implement field-level permission controls similar to Microsoft Outlook/SharePoint.

**Concept:**
- Define permissions at field level, not just record level
- "Campus Admin can VIEW student.ssn but not EDIT"
- "DAEP Staff can VIEW placement.end_date but only Campus Admin can EDIT"

**Benefits:**
- Finer control over sensitive data
- FERPA compliance for specific fields (SSN, medical, discipline history)
- Role customization per district needs

**Complexity:** High - requires permission matrix per entity/field/role

---

### CSV Column Mapping for Bulk User Upload
**Priority:** Medium
**Identified:** 2025-11-25

Add column mapping UI to Bulk User Upload similar to the records upload flow. This would:
- Allow users to map CSV columns to expected fields
- Handle missing or renamed columns gracefully
- Support varying column names (e.g., "module_access" vs "access" vs "modules")
- Improve user experience when uploading spreadsheets from different sources

**Reference:** Check how column mapping was implemented in the records upload feature for patterns to follow.

---

### Multiple DAEP Campuses Support
**Priority:** Medium
**Identified:** 2025-11-25

Support multiple DAEP campuses per district for larger districts that operate separate elementary and secondary DAEP facilities. Currently the system assumes a single DAEP campus per tenant.

**Requirements:**
- Allow marking multiple campuses as `is_daep = true`
- DAEP Settings page should handle multiple campuses (dropdown or tabs)
- Campus-level DAEP settings should be configurable per DAEP campus
- Student assignments may need to specify which DAEP campus (elementary vs secondary)
- Reports and dashboards should aggregate or filter by DAEP campus
- Bell schedules and calendars may differ between DAEP campuses

**Affected Areas:**
- `app/daep/settings/page.tsx` - Currently expects single DAEP campus
- `app/actions/daep/settings.ts` - `getDAEPCampuses()` returns array but UI may assume single
- Student placement workflow - May need DAEP campus selection
- DAEP dashboard and reports

**Use Case:** Districts like large urban ISDs often have separate DAEP campuses for elementary (K-5) and secondary (6-12) students due to different programming needs and age-appropriate environments.

---

### Application Module Selector Page (`/application`)
**Priority:** HIGH
**Identified:** 2025-11-27
**Type:** UX / Navigation

Create an Eduphoria-style module selector page that appears after login, showing available modules based on user role.

**Visual Reference:** Eduphoria's Applications page (birdville.schoolobjects.com)
- Clean card layout with module icons
- Each card shows: Module icon, Module name, Brief description
- Only shows modules the user has access to
- "Log Off" and "My Profile" buttons at bottom

**Layout Concept:**
```
┌─────────────────────────────────────────────────────────────┐
│                    District Tracker                          │
│              Select an application to continue               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐    ┌─────────────────┐               │
│   │  🛡️             │    │  📋             │               │
│   │  Trespass       │    │  DAEP           │               │
│   │  Tracker        │    │  Management     │               │
│   │                 │    │                 │               │
│   │  Manage campus  │    │  Student        │               │
│   │  trespass       │    │  placements &   │               │
│   │  records        │    │  attendance     │               │
│   └─────────────────┘    └─────────────────┘               │
│                                                             │
│   ┌─────────────────┐                                      │
│   │  ⚙️             │     (Only if district_admin+)        │
│   │  Admin          │                                      │
│   │  Panel          │                                      │
│   │                 │                                      │
│   │  System         │                                      │
│   │  administration │                                      │
│   └─────────────────┘                                      │
│                                                             │
│            [Log Off]    [My Profile]                        │
└─────────────────────────────────────────────────────────────┘
```

**Role → Module Visibility:**
| Role | Trespass | DAEP | Admin |
|------|----------|------|-------|
| `viewer`, `campus_admin` | ✓ | ✓ (view students) | ✗ |
| `student`, `parent` | ✗ | ✓ | ✗ |
| `daep_staff` | ✗ | ✓ | ✗ |
| `daep_admin_l1/l2` | Maybe | ✓ | ✓ |
| `district_admin` | ✓ | ✓ | ✓ |
| `super_admin` | ✓ | ✓ | ✓ |

**Route:** `/application` (rename from `/dashboard`)

**Implementation Notes:**
- After Clerk login, redirect to `/application` instead of `/dashboard`
- `/dashboard` can redirect to `/application` for backwards compatibility
- Cards should be clickable and navigate to module home (`/trespass`, `/daep`, `/admin`)

---

### Module Switcher Dropdown (In-App Navigation)
**Priority:** HIGH
**Identified:** 2025-11-27
**Type:** UX / Navigation

Replace "Back to Trespass" / "Back to DAEP" buttons with Eduphoria-style module switcher dropdown.

**Visual Reference:** Eduphoria's in-app module switcher (top-right gear icon dropdown)
- Shows available modules as dropdown items
- "Applications Home" option returns to `/application`
- Icon-based trigger (grid icon or similar)

**Layout Concept:**
```
┌──────────────────┐
│  ⊞  ▾            │  ← Click to open dropdown
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ 🛡️ Trespass      │
│ 📋 DAEP          │
│ ⚙️ Admin         │  (if has access)
│ ─────────────────│
│ 🏠 Applications  │  ← Returns to /application
│    Home          │
└──────────────────┘
```

**Placement:**
- Admin Panel: Header, right side (replace "Back to Trespass" button)
- DAEP Settings: Header, right side (replace "Back to DAEP" button)
- Trespass Dashboard: Header area (add new)
- DAEP Dashboard: Header area (add new)

**Behavior:**
- Shows only modules user has access to (based on effectiveRole in demo, actualRole in prod)
- Clicking module navigates directly to that module's home page
- "Applications Home" always visible, navigates to `/application`

---

### Smart Access Denied Redirect
**Priority:** MEDIUM
**Identified:** 2025-11-27
**Type:** UX / Navigation

Update access denied pages to redirect users to appropriate modules based on their role/module_access.

**Current Behavior:** Hardcoded redirect to `/trespass`

**Desired Behavior:**
| User's `module_access` | Redirect To |
|----------------------|-------------|
| `trespass_only` | `/trespass` |
| `daep_only` | `/daep` |
| `both` | `/application` (module selector) |

**Additional Logic:**
- Check `effectiveRole` to determine default module
- `student`, `parent` → `/daep`
- `viewer`, `campus_admin` → `/trespass`
- `daep_staff`, `daep_admin_*` → `/daep`
- `district_admin`, `super_admin` → `/application`

**Files to Update:**
- `app/daep/access-denied/page.tsx`
- `app/admin/layout.tsx` (redirect logic)
- `app/daep/settings/layout.tsx` (redirect logic)
- Any other access control redirects

---

### License Agreement Page
**Priority:** LOW
**Identified:** 2025-11-27
**Type:** Legal / Compliance

Create a license agreement page similar to Eduphoria's (eduphoria.com/license-agreement).

**Requirements:**
- Static page at `/license` or `/terms`
- Link from login page footer
- Link from `/application` page footer
- Standard SaaS license agreement content
- Last updated date

**Reference:** https://www.eduphoria.com/license-agreement

---

### Intake Pipeline (Kanban Workflow)
**Priority:** HIGH
**Identified:** 2025-11-28 (Dev Review Session)
**Type:** Feature / Epic 2 Addition

Kanban-style intake workflow for processing new DAEP placements. Per UX mockup (`docs/ux-design-directions.html`).

**Columns:**
1. **Approved** - Placement created, needs intake scheduling
   - Badge: "Needs Scheduling"
2. **Scheduled** - Intake appointment set
   - Badge: "Today" (if appointment is today)
   - Shows: Date/time of appointment
3. **Arrived Today** - Student arrived for intake
   - Badge: "Processing"
4. **No-Show** - Student didn't arrive for scheduled intake
   - Badge: "Reschedule"
   - Shows: Original date + reason (e.g., "No contact", "Parent called")

**Features:**
- Drag-and-drop cards between columns
- "Import CSV" button for bulk intake scheduling
- "+ Manual Intake" button for walk-ins
- Cards show: Student name, Home campus, Offense code
- Auto-move to "Arrived Today" when attendance marked? (TBD)

**Route:** `/daep/intakes` (Operations section in sidebar)

**Relationship to Placement Status:**
- Intake Pipeline is operational workflow (daily task)
- Placement Status is lifecycle state (pending → active → transition → complete)
- Completing intake processing moves placement from `pending` → `active`

**Story Needed:** New story in Epic 2 or Epic 3

---

### SFTP/API Import Audit Trail
**Priority:** MEDIUM
**Identified:** 2025-11-29
**Type:** Infrastructure / Audit

When SFTP or SIS API imports are implemented, update the `created_via` column handling:

**Current `created_via` values:**
- `manual` - Admin UI creation (current)
- `csv_upload` - CSV bulk import (current)
- `sftp_import` - SFTP automated import (future)
- `sis_api` - SIS API integration (future)
- `migration` - Data migration scripts (current)

**Required Changes:**
1. Update import jobs to set appropriate `created_via` value
2. For `sftp_import`: Set `user_id` to `system:sftp-import` or integration service account
3. For `sis_api`: Set `user_id` to `system:sis-{district_id}` pattern
4. Add import job tracking table for audit (job_id, source, timestamp, records_processed)
5. Update audit logs to capture import metadata (source file, job_id, etc.)

**Schema Reference:**
- Column: `trespass_records.created_via` (added 2025-11-29)
- Constraint: `chk_created_via` limits values to approved list

---

### Remaining DAEP Dialogs Theme Fix
**Priority:** LOW
**Identified:** 2025-11-29
**Type:** UI/UX

Apply `DAEPDialogContent` wrapper to remaining DAEP dialogs for consistent theme styling.

**Already Fixed:**
- `app/daep/(main)/placements/new/page.tsx`
- `components/daep/RoomAssignmentDialog.tsx`
- `components/daep/AddSeparationDialog.tsx`

**Still Need Fix:**
- `app/daep/settings/rooms/EditRoomDialog.tsx`
- `app/daep/settings/rooms/AddRoomDialog.tsx`
- `app/daep/settings/behaviors/AddCategoryDialog.tsx`
- `app/daep/settings/behaviors/EditCategoryDialog.tsx`
- `app/daep/settings/calendar/DayEditorDialog.tsx`
- `app/daep/settings/calendar/CSVUploadDialog.tsx`
- `app/daep/settings/calendar/GenerateCalendarDialog.tsx`
- `app/daep/settings/schedules/AddScheduleDialog.tsx`
- `app/daep/settings/schedules/EditScheduleDialog.tsx`
- `app/daep/settings/codes/AddCodeDialog.tsx`
- `app/daep/settings/codes/EditCodeDialog.tsx`

**Pattern:**
1. Import from `@/components/daep/DAEPDialog` instead of `@/components/ui/dialog`
2. Replace `DialogContent` with `DAEPDialogContent`
3. Replace `</DialogContent>` with `</DAEPDialogContent>`

---

### Error Codes Expansion
**Priority:** MEDIUM
**Identified:** 2025-11-29
**Type:** Infrastructure

Expand error_codes table with codes for all modules as features are built.

**Current Codes (seeded 2025-11-29):**
- `DM-001xx` - DAEP Create operations
- `DM-006xx` - DAEP Auth errors
- `DM-007xx` - DAEP Validation errors
- `SY-xxxxx` - System-wide errors

**To Add:**
- `TT-xxxxx` - Trespass Tracker module
- `AT-xxxxx` - Attendance module (when built)
- Additional DM codes as features expand

**Error Code Format:** `[MODULE]-[SEQUENCE]`
- Informal ranges (not enforced): 001xx=Create, 002xx=Edit, 003xx=Delete, 006xx=Auth, 007xx=Validation

**Table:** `error_codes` (created 2025-11-29)

---

### Wrong Subdomain Redirect to Assigned Tenant
**Priority:** MEDIUM
**Identified:** 2025-11-29
**Type:** UX / Security

When a user visits a subdomain they don't have access to, redirect them to their assigned tenant's subdomain instead of just showing Access Denied.

**Current Behavior:**
- Birdville user visits `keller.districttracker.com` → Access Denied page

**Desired Behavior:**
- Birdville user visits `keller.districttracker.com` → Redirected to `birdville.districttracker.com`

**Implementation:**
1. In middleware, when blocking access to another tenant's subdomain
2. Look up user's assigned `tenant_id` from profile
3. Redirect to `{tenant_id}.districttracker.com` instead of `/access-denied`
4. Show a toast/message: "You've been redirected to your assigned workspace"

**File to Update:** `middleware.ts` (around line 130 where it currently redirects to `/demo-guide`)

**Note:** RLS still enforces data isolation - this is purely a UX improvement.

---

### Centralized getTenantId Migration
**Priority:** LOW
**Identified:** 2025-11-29
**Type:** Technical Debt

Migrate all server action files to use centralized `getTenantId` from `@/lib/tenant.ts`.

**Already Migrated:**
- `app/actions/daep/placements.ts`

**Still Have Local getTenantId:**
- `app/actions/daep/rooms.ts`
- `app/actions/daep/students.ts`
- `app/actions/daep/behavior-categories.ts`
- `app/actions/daep/school-calendar.ts`
- `app/actions/daep/discipline-codes.ts`
- `app/actions/daep/schedules.ts`
- `app/actions/daep/settings.ts`
- `app/actions/invite-user.ts`

**Pattern:**
1. Add `import { getTenantId } from '@/lib/tenant';`
2. Remove local `async function getTenantId()` definition
3. Benefit: Localhost automatically routes to `staging` tenant

---

## Change Log

| Date | Item Added | Added By |
|------|------------|----------|
| 2025-11-29 | Wrong Subdomain Redirect to Assigned Tenant | Bug Fix Session |
| 2025-11-29 | SFTP/API Import Audit Trail | Bug Fix Session |
| 2025-11-29 | Remaining DAEP Dialogs Theme Fix | Bug Fix Session |
| 2025-11-29 | Error Codes Expansion | Bug Fix Session |
| 2025-11-29 | Centralized getTenantId Migration | Bug Fix Session |
| 2025-11-28 | Intake Pipeline (Kanban Workflow) | Dev Review Session |
| 2025-11-27 | Application Module Selector Page | Dev Session |
| 2025-11-27 | Module Switcher Dropdown | Dev Session |
| 2025-11-27 | Smart Access Denied Redirect | Dev Session |
| 2025-11-27 | License Agreement Page | Dev Session |
| 2025-11-27 | Module-Specific RLS Mapping | Party Mode Session 2 |
| 2025-11-27 | Campus Admin in Admin Panel - Review | Party Mode Session 2 |
| 2025-11-27 | Outlook-Style Granular Permissions | Party Mode Session 2 |
| 2025-11-27 | Ghost Mode - Support Impersonation | Party Mode Session 2 |
| 2025-11-27 | Year Picker / School Year Selector | Party Mode Session 2 |
| 2025-11-27 | Demo Guide PDF | Party Mode Session 1 (missed) |
| 2025-11-26 | Admin Panel & Settings Consolidation | Dev Session |
| 2025-11-26 | Profile Dropdown Consistency | Dev Session |
| 2025-11-26 | Testing Report Accuracy & Audit Log Completeness | Dev Session |
| 2025-11-26 | Changelog & Versioning System | Dev Session |
| 2025-11-26 | Role-Based Module Access Defaults | Dev Session |
| 2025-11-26 | Resend Invite Action | Dev Session |
| 2025-11-26 | Invite Expiration Tracking | Dev Session |
| 2025-11-25 | Modal Styling Systematization | Dev Session |
| 2025-11-25 | CSV Column Mapping for Bulk Upload | Dev Session |
| 2025-11-25 | Multiple DAEP Campuses Support | Dev Session |
