# Story 6-2: Clickable KPIs & Drill-Down

**Status:** drafted
**Epic:** 6 - Dashboard & Reporting
**Points:** 3
**FRs:** FR79
**Dependencies:** Story 6-1 (Dashboard with KPI Cards)

---

## Story

As a **DAEP administrator**,
I want **to click on KPI cards to see detailed breakdowns and filter the dashboard by campus**,
So that **I can drill down into specific metrics and focus on individual campuses when needed**.

---

## Design Philosophy

> "Cross-card filtering creates a connected data experience."

The dashboard shows program-wide metrics by default, but admins often need to focus on a specific campus. A single campus filter in the header updates all KPIs, charts, and lists simultaneously. Clicking a KPI card opens a drill-down view with detailed breakdowns, allowing admins to understand the "why" behind each number.

From dashboard-feature-framework.md:
- **Cross-Card Filtering** is a CORE feature for Admin and Campus Admin personas
- Clear paths, delightful moments, no confusion
- Wow factor + Intuitive = Not overwhelming

---

## Role-Based Access

| Role | Dashboard Access | Recidivism Breakdown Access |
|------|------------------|----------------------------|
| Super Admin | Full | Full (detailed student table) |
| District Admin | Full | Full (detailed student table) |
| L1 Admin (DAEP Admin) | Full | Full (detailed student table) |
| L2 Admin | Full | Full |
| DAEP Staff | Full | Card only (no detailed breakdown) |
| Campus Admin | Full | Card only (no detailed breakdown) |
| Parent | **NO ACCESS** | N/A |
| Student | **NO ACCESS** | N/A |

**Important:** The DAEP Dashboard is an administrative tool. Parents and students should not see this view.

---

## Build Approach

**Development Location:** `app/daep/(main)/dashboard-preview/`

Build all features in the dashboard-preview sandbox first. Later, users will have the option to choose their preferred dashboard style:
- **Classic** - Current simple dashboard
- **Modern** - Enhanced dashboard with animations (from preview)

---

## Reference Mockup

**Source:** `docs/sprint-artifacts/daep/tech-spec-stories-6-1-6-2.md`

```
+------------------------------------------------------------------+
| Dashboard                    [Campus: All ▼]  [Export] [+ New Intake]
| Overview of program metrics and student status
+------------------------------------------------------------------+
                               ↑
                               Campus Filter Dropdown
```

**KPI Card Click Behavior:**
```
+------------------+
| Students         |  ← Click entire card
| Enrolled         |
|       47         |
| ▲ +12 this week  |
+------------------+
        ↓
+------------------------------------------------------------------+
| ← Back to Dashboard                                               |
| Students Enrolled                        [Campus: All ▼] [Export] |
+------------------------------------------------------------------+
| BREADCRUMB: Dashboard > Students Enrolled                         |
+------------------------------------------------------------------+
|                                                                    |
| Current: 47 active students                                        |
|                                                                    |
| By Campus                           | By Status                   |
| ─────────────────────────────────── | ─────────────────────────── |
| Lincoln MS          12              | Active        47            |
| Washington HS       15              | Transitioning  3            |
| Jefferson Elem       8              | Pending Review 2            |
| Roosevelt MS        12              |                             |
|                                                                    |
| [View All Students →]                                             |
+------------------------------------------------------------------+
```

**Recidivism Drill-Down (L1+ Admin Only):**
```
+------------------------------------------------------------------+
| ← Back to Dashboard                                               |
| Recidivism Rate                          [Campus: All ▼] [Export] |
+------------------------------------------------------------------+
| BREADCRUMB: Dashboard > Recidivism Rate                           |
+------------------------------------------------------------------+
|                                                                    |
| Rate: 15.3%  (12 of 78 completed placements returned)             |
|                                                                    |
| By Original Offense              | Time to Return                 |
| ───────────────────────────────  | ────────────────────────────── |
| Fighting        42%  (5)         | < 30 days     25%  (3)         |
| Drugs           25%  (3)         | 30-90 days    42%  (5)         |
| Weapons         17%  (2)         | 91-180 days   25%  (3)         |
| Disruption       8%  (1)         | > 180 days     8%  (1)         |
| Other            8%  (1)         |                                |
|                                                                    |
| Returning Students                                                 |
| ─────────────────────────────────────────────────────────────────  |
| Name           | Original    | 1st Placement | Return     | Days  |
|                | Offense     | Days          | Offense    | Between|
| ─────────────────────────────────────────────────────────────────  |
| Marcus J.      | Fighting    | 30 w/review   | Fighting   | 45    |
| Alex R.        | Drugs       | 45            | Drugs      | 92    |
| Jordan L.      | Fighting    | 30 w/review   | Disruption | 28    |
| ...                                                                |
|                                                                    |
| [Export to CSV] [View Full Report →]                              |
+------------------------------------------------------------------+
```

**Note:** Student names are clickable links to their profile pages.

---

## Acceptance Criteria

| AC | Description | Status | Test |
|----|-------------|--------|------|
| 6.2.1 | Campus filter dropdown appears in dashboard header | Pending | Dropdown visible and lists all campuses |
| 6.2.2 | Selecting campus updates ALL dashboard components | Pending | Select campus, verify KPIs/charts/lists filter |
| 6.2.3 | "All Campuses" option resets to program-wide view | Pending | Select "All", verify reset |
| 6.2.4 | Single-campus tenants auto-hide campus filter | Pending | Login as single-campus tenant, filter hidden |
| 6.2.5 | Students Enrolled KPI clickable → drill-down page | Pending | Click card, navigate to breakdown |
| 6.2.6 | Attendance Rate KPI clickable → Room Roster | Pending | Click card, navigate to `/daep/attendance` |
| 6.2.7 | Pending Approvals KPI clickable → existing approvals | Pending | Click card, navigate to `/daep/approvals` |
| 6.2.8 | Recidivism Rate KPI clickable → detailed breakdown | Pending | Click card, see offense breakdown |
| 6.2.9 | Recidivism drill-down shows by-offense distribution | Pending | Verify offense categories and counts |
| 6.2.10 | Recidivism table shows first placement days | Pending | Verify "30 w/review" style column |
| 6.2.11 | Recidivism table shows days between placements | Pending | Verify days between column |
| 6.2.12 | Student names in recidivism table link to profile | Pending | Click name, navigate to student profile |
| 6.2.13 | Recidivism breakdown restricted to L1+ Admin | Pending | Staff/Campus Admin see card only, no drill-down |
| 6.2.14 | Breadcrumb navigation on drill-down pages | Pending | Verify "Dashboard > [KPI Name]" breadcrumb |
| 6.2.15 | Back to Dashboard button on drill-down pages | Pending | Click back, return to dashboard |
| 6.2.16 | Campus filter persists across drill-down navigation | Pending | Filter by campus, click KPI, verify filter retained |
| 6.2.17 | Drill-down pages are mobile responsive | Pending | Resize browser, verify layout |
| 6.2.18 | Visual style matches dashboard-preview (gradients, animations) | Pending | Verify consistent look with preview |

---

## Tasks / Subtasks

### Task 1: Campus Filter Component

- [ ] 1.1 Create `dashboard-preview/components/campus-filter.tsx` dropdown component
- [ ] 1.2 Fetch campuses from `campuses` table (tenant-scoped)
- [ ] 1.3 Add "All Campuses" option as default
- [ ] 1.4 Store selected campus in URL search params (`?campus=xxx`)
- [ ] 1.5 Add filter dropdown to dashboard-preview header
- [ ] 1.6 Pass campus filter to dashboard data fetch
- [ ] 1.7 Auto-hide dropdown for single-campus tenants (check campus count)

### Task 2: Update Server Actions for Campus Filtering

- [ ] 2.1 Modify `getKPIs()` to accept optional campusId filter
- [ ] 2.2 Modify `getActionItems()` to filter by campus
- [ ] 2.3 Modify `getTodayIntakes()` to filter by campus
- [ ] 2.4 Modify `getPipelineCounts()` to filter by campus
- [ ] 2.5 Modify `getAtRiskSummary()` to filter by campus
- [ ] 2.6 Modify `getAttendanceTrend()` to filter by campus
- [ ] 2.7 Modify `getDisciplineOverview()` to filter by campus

### Task 3: KPI Card Click Navigation

- [ ] 3.1 Update `enhanced-kpi-card.tsx` to be clickable with cursor pointer
- [ ] 3.2 Add hover effect for clickable cards (subtle lift, matches preview style)
- [ ] 3.3 Configure click destinations per KPI type:
  - Students Enrolled → `/daep/reports/enrollment` (new drill-down)
  - Attendance Rate → `/daep/attendance` (existing Room Roster)
  - Pending Approvals → `/daep/approvals` (existing page)
  - Recidivism Rate → `/daep/reports/recidivism` (new drill-down, L1+ only)
- [ ] 3.4 Preserve campus filter in navigation URL
- [ ] 3.5 Add role check for Recidivism click (L1+: drill-down, others: no action)

### Task 4: Enrollment Drill-Down Page

- [ ] 4.1 Create `app/daep/(main)/reports/enrollment/page.tsx`
- [ ] 4.2 Create server action `getEnrollmentBreakdown(campusId?)`
- [ ] 4.3 Show summary card with total count
- [ ] 4.4 Create "By Campus" bar chart (when viewing all)
- [ ] 4.5 Create "By Status" distribution (active, transitioning, pending review)
- [ ] 4.6 Add "View All Students" link to students list
- [ ] 4.7 Add campus filter dropdown (synced with dashboard)
- [ ] 4.8 Add breadcrumb: Dashboard > Students Enrolled
- [ ] 4.9 Add Back to Dashboard button

### Task 5: Attendance KPI → Room Roster Integration

- [ ] 5.1 Verify `/daep/attendance` (Room Roster) accepts `?campus=xxx` param
- [ ] 5.2 Add campus filter to Room Roster if not present
- [ ] 5.3 Ensure Room Roster page loads filtered when navigated from dashboard

### Task 6: Recidivism Drill-Down Page (L1+ Admin Only)

- [ ] 6.1 Create `app/daep/(main)/reports/recidivism/page.tsx`
- [ ] 6.2 Add role-based access check (redirect non-L1+ users)
- [ ] 6.3 Create server action `getRecidivismBreakdown(campusId?)`
- [ ] 6.4 Show summary card with rate and counts
- [ ] 6.5 Create "By Original Offense" pie/bar chart
- [ ] 6.6 Create "Time to Return" distribution chart
- [ ] 6.7 Create returning students table with columns:
  - Student name (clickable link to `/daep/students/[id]` profile)
  - Original offense
  - First placement days (e.g., "30 w/review", "45")
  - Return offense
  - Days between placements
- [ ] 6.8 Add pagination for students table (server-side)
- [ ] 6.9 Add "Export to CSV" button (dynamic import for xlsx)
- [ ] 6.10 Add breadcrumb: Dashboard > Recidivism Rate
- [ ] 6.11 Match dashboard-preview visual style (gradients, animations)

### Task 7: Shared Drill-Down Components

- [ ] 7.1 Create `components/dashboard/drill-down-header.tsx` (title, filter, export)
- [ ] 7.2 Create `components/dashboard/drill-down-breadcrumb.tsx`
- [ ] 7.3 Create `components/dashboard/back-button.tsx`
- [ ] 7.4 Create `components/dashboard/summary-stat-card.tsx` (large number display)
- [ ] 7.5 Create `components/dashboard/distribution-chart.tsx` (reusable pie/bar)

### Task 8: Testing

- [ ] 8.1 Verify campus filter dropdown appears and populates
- [ ] 8.2 Verify selecting campus filters all dashboard sections
- [ ] 8.3 Verify each KPI card is clickable
- [ ] 8.4 Verify enrollment drill-down page loads and shows data
- [ ] 8.5 Verify attendance drill-down page loads and shows data
- [ ] 8.6 Verify recidivism drill-down shows offense breakdown
- [ ] 8.7 Verify recidivism shows returning students table
- [ ] 8.8 Verify breadcrumb navigation works
- [ ] 8.9 Verify back button returns to dashboard
- [ ] 8.10 Verify campus filter persists through navigation
- [ ] 8.11 Verify mobile responsive layouts
- [ ] 8.12 TypeScript compilation
- [ ] 8.13 Playwright MCP verification

---

## Dev Notes

### Campus Filter Implementation

Use URL search params for campus filter state:
- Enables bookmarking specific campus views
- Persists across navigation
- Server-side rendering friendly

```typescript
// In dashboard page.tsx
const searchParams = useSearchParams();
const campusId = searchParams.get('campus') || 'all';

// In campus-filter.tsx
const router = useRouter();
const pathname = usePathname();

const handleCampusChange = (value: string) => {
  const params = new URLSearchParams(searchParams);
  if (value === 'all') {
    params.delete('campus');
  } else {
    params.set('campus', value);
  }
  router.push(`${pathname}?${params.toString()}`);
};
```

### KPI Card Click Destinations

| KPI | Destination | Query Params | Notes |
|-----|-------------|--------------|-------|
| Students Enrolled | `/daep/reports/enrollment` | `?campus=xxx` | New drill-down page |
| Attendance Rate | `/daep/attendance` | `?campus=xxx` | Existing Room Roster |
| Pending Approvals | `/daep/approvals` | `?campus=xxx` | Existing approvals page |
| Recidivism Rate | `/daep/reports/recidivism` | `?campus=xxx` | L1+ Admin only |

### Role-Based Recidivism Access

```typescript
// In recidivism drill-down page
const ALLOWED_ROLES = ['super_admin', 'district_admin', 'l1_admin', 'l2_admin'];

if (!ALLOWED_ROLES.includes(userRole)) {
  // Show card only - no navigation for staff/campus_admin
  redirect('/daep'); // or show "Access Restricted" message
}
```

### Single-Campus Auto-Hide

```typescript
// In campus-filter.tsx
const campuses = await getCampuses();
if (campuses.length <= 1) {
  return null; // Hide dropdown for single-campus tenants
}
```

### Recidivism Query

```sql
-- Get returning students with placement details
WITH ranked_placements AS (
  SELECT
    p.id,
    p.school_id,
    p.discipline_code,
    p.assigned_days,
    p.requires_review,
    p.created_at,
    p.status,
    ROW_NUMBER() OVER (PARTITION BY p.school_id ORDER BY p.created_at) as placement_num
  FROM daep_placements p
  WHERE p.tenant_id = :tenantId
    AND p.status IN ('completed', 'active')
),
returning_students AS (
  SELECT
    rp.school_id,
    s.first_name,
    s.last_name,
    -- First placement info
    first_p.discipline_code as original_offense,
    first_p.assigned_days as first_placement_days,
    first_p.requires_review as first_requires_review,
    first_p.created_at as first_placement_date,
    -- Most recent return info
    MAX(rp.created_at) as return_date,
    MAX(rp.discipline_code) as return_offense,
    COUNT(*) as placement_count,
    -- Days between first and most recent
    EXTRACT(DAY FROM MAX(rp.created_at) - first_p.created_at) as days_between
  FROM ranked_placements rp
  JOIN students s ON rp.school_id = s.school_id AND s.tenant_id = :tenantId
  JOIN ranked_placements first_p ON first_p.school_id = rp.school_id AND first_p.placement_num = 1
  WHERE rp.placement_num > 1
  GROUP BY rp.school_id, s.first_name, s.last_name,
           first_p.discipline_code, first_p.assigned_days,
           first_p.requires_review, first_p.created_at
)
SELECT
  rs.*,
  dc_orig.description as original_offense_desc,
  dc_return.description as return_offense_desc,
  -- Format first placement days (e.g., "30 w/review" or "45")
  CASE
    WHEN rs.first_requires_review THEN rs.first_placement_days || ' w/review'
    ELSE rs.first_placement_days::text
  END as first_placement_display
FROM returning_students rs
LEFT JOIN discipline_codes dc_orig ON dc_orig.code = rs.original_offense
LEFT JOIN discipline_codes dc_return ON dc_return.code = rs.return_offense
ORDER BY rs.placement_count DESC, rs.return_date DESC;

-- Get offense breakdown for returning students
SELECT
  dc.description as offense,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM daep_placements p
JOIN discipline_codes dc ON p.discipline_code = dc.code
WHERE p.tenant_id = :tenantId
  AND p.school_id IN (SELECT school_id FROM returning_students)
GROUP BY dc.description
ORDER BY count DESC;
```

### Cross-Card Filtering Logic

When campus is selected:
1. All KPI queries add `WHERE campus_id = :campusId`
2. Action items filter to campus-related items
3. Intakes filter to students from that campus
4. Charts show campus-specific data
5. Pipeline counts show campus-specific pipeline

### Animation on Drill-Down Navigation

Use Framer Motion for smooth page transitions:
```typescript
// In drill-down pages
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* Page content */}
</motion.div>
```

### Breadcrumb Component

```typescript
interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

// Usage
<DrillDownBreadcrumb
  items={[
    { label: 'Dashboard', href: '/daep' },
    { label: 'Recidivism Rate' }
  ]}
/>
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| No campuses in tenant | Show "No campuses configured" in dropdown |
| Single campus tenant | Auto-hide dropdown, auto-select the campus |
| Campus with no students | Show zero counts, empty charts |
| No recidivism data | Show "No repeat placements" message |
| Campus filter + date range | Both filters apply (AND logic) |
| Deep link to drill-down | Parse campus from URL, load filtered data |
| Mobile campus filter | Full-width dropdown, touch-friendly |
| Non-L1 user clicks Recidivism | Show card only, no click action / disabled state |
| Student has no profile page | Link still works, profile shows minimal data |
| First placement has no review flag | Show days only (e.g., "45" not "45 w/review") |

---

## Out of Scope

| Item | Deferred To |
|------|-------------|
| Multiple campus selection | Future (multi-select filter) |
| Date range on all KPIs | Story 6-3 (Reports) |
| Export all KPIs at once | Story 6-7 (PDF/Excel Export) |
| Custom drill-down layouts | Future |
| Comparison mode (campus vs campus) | Future |

---

## Dependencies

### Tables
- `campuses` - Campus list for filter dropdown
- `daep_placements` - Enrollment, recidivism data
- `daep_attendance` - Attendance breakdowns
- `daep_daily_points` - Pending approvals
- `discipline_codes` - Offense descriptions
- `students` - Student names for recidivism table

### Existing Components
- `kpi-card.tsx` - Update to be clickable
- `getDashboardData()` - Update to accept campus filter
- shadcn/ui: Select, Breadcrumb, Table

---

## Definition of Done

- [ ] Campus filter dropdown in dashboard-preview header
- [ ] Single-campus tenants auto-hide the filter
- [ ] Selecting campus updates all dashboard sections
- [ ] All 4 KPI cards are clickable with hover effects
- [ ] Students Enrolled → new drill-down page
- [ ] Attendance Rate → existing Room Roster page
- [ ] Pending Approvals → existing approvals page
- [ ] Recidivism Rate → drill-down (L1+ only)
- [ ] Recidivism drill-down shows offense breakdown charts
- [ ] Recidivism table shows first placement days (e.g., "30 w/review")
- [ ] Recidivism table shows days between placements
- [ ] Student names link to profile pages
- [ ] Role-based access enforced (L1+ for recidivism breakdown)
- [ ] Breadcrumb navigation on drill-down pages
- [ ] Back button returns to dashboard
- [ ] Campus filter persists through navigation
- [ ] Visual style matches dashboard-preview (gradients, animations)
- [ ] Drill-down pages are mobile responsive
- [ ] TypeScript compiles without errors
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-stories-6-1-6-2.md` - Technical specification
- `docs/sprint-artifacts/daep/story-6-1.md` - Story 6-1 (dependency)
- `docs/sessions/dashboard-preview-session-dec14.md` - Dashboard preview session
- `docs/sessions/dashboard-feature-framework.md` - Feature framework (cross-card filtering)
- `docs/reference/epics-part2.md` - Epic 6 story definitions

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### File List

**New Files (in dashboard-preview):**
- `app/daep/(main)/dashboard-preview/components/campus-filter.tsx`
- `app/daep/(main)/dashboard-preview/components/drill-down-header.tsx`
- `app/daep/(main)/dashboard-preview/components/drill-down-breadcrumb.tsx`
- `app/daep/(main)/dashboard-preview/components/back-button.tsx`
- `app/daep/(main)/dashboard-preview/components/summary-stat-card.tsx`
- `app/daep/(main)/dashboard-preview/components/distribution-chart.tsx`
- `app/daep/(main)/reports/enrollment/page.tsx`
- `app/daep/(main)/reports/recidivism/page.tsx`

**Modified Files:**
- `app/daep/(main)/dashboard-preview/page.tsx` - Add campus filter to header
- `app/daep/(main)/dashboard-preview/components/enhanced-kpi-card.tsx` - Add click navigation
- `app/actions/daep/dashboard.ts` - Add campus filter to all queries, add recidivism breakdown
- `app/daep/(main)/attendance/page.tsx` - Accept campus filter param (if not present)
- `docs/sprint-artifacts/sprint-status.yaml` - Update story status

---

## User Feedback & Design Decisions (Dec 14, 2024)

### Recidivism Breakdown Enhancements
- **First Placement Days**: Show the original placement duration (e.g., "30 w/review", "45")
- **Student Profile Links**: Names are clickable links to student profile pages
- **Role Restriction**: Breakdown only accessible to L1+ Admin (Super Admin, District Admin, L1 Admin, L2 Admin)
- **Card Visibility**: DAEP Staff and Campus Admin can see the KPI card but cannot access detailed breakdown

### KPI Click Destinations (Reuse Existing Pages)
- **Attendance Rate** → Room Roster (`/daep/attendance`) for taking attendance
- **Pending Approvals** → Existing approvals page (`/daep/approvals`)
- **Students Enrolled** → New enrollment drill-down
- **Recidivism Rate** → New recidivism drill-down (L1+ only)

### Dashboard Access Control
- **NO ACCESS**: Parents, Students (Dashboard is administrative only)
- **Full Access**: Super Admin, District Admin, L1 Admin, L2 Admin, DAEP Staff, Campus Admin

### UX Decisions
- **Single-Campus Auto-Hide**: Hide campus filter dropdown for single-campus tenants
- **Visual Style**: Match dashboard-preview (gradients, count-up animations, hover effects)
- **Build Location**: Continue in `dashboard-preview/`, later offer style choice (Classic vs Modern)

---

## References

- [Source: docs/sprint-artifacts/daep/tech-spec-stories-6-1-6-2.md] - AC definitions
- [Source: docs/sessions/dashboard-feature-framework.md] - Cross-card filtering as CORE feature
- [Source: docs/sessions/dashboard-preview-session-dec14.md] - Dashboard preview visual style
- [Source: FR79] - Drill-down requirement
- [Source: docs/reference/epics-part2.md] - Epic 6 story 6.2 definition
