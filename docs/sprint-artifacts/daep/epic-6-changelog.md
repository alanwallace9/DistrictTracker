# Epic 6 Changelog - Dashboard & Reporting

**Epic:** 6 - Dashboard & Reporting
**Version Range:** v0.6.0 - v0.6.x
**FRs:** FR78-FR92, FR108
**Stories:** 2 of 12 complete

---

## Summary Table

| Version | Story | Title | Status |
|---------|-------|-------|--------|
| v0.6.0 | 6-1 | Dashboard Page with KPI Cards | Done |
| v0.6.1 | 6-2 | Clickable KPIs & Drill-Down | Done |
| - | 6-3 | Attendance Reports | Backlog |
| - | 6-4 | Discipline Reports | Backlog |
| - | 6-5 | Point Progress Reports | Backlog |
| - | 6-6 | Placement Length Reports | Backlog |
| - | 6-7 | PDF/Excel Export | Backlog |
| - | 6-8 | Recidivism Tracking KPI | Backlog |
| - | 6-9 | 90-Day Assessment Tracking | Backlog |
| - | 6-10 | 120-Day Status Review Tracking | Backlog |
| - | 6-11 | PEIMS Submission 3 Export | Backlog |
| - | 6-12 | Audit Reports | Backlog |

---

## v0.6.0 - Dashboard Page with KPI Cards

**Released:** December 14, 2024
**Story:** 6-1
**FR:** FR78

### What's New

Your DAEP program health is now visible at a glance. The new Dashboard landing page puts everything you need to monitor in one view—no more jumping between screens to piece together program status.

### Key Features

**KPI Cards**
- **Current Enrollment** - See how many students are actively placed with week-over-week trend
- **Today's Attendance** - Real-time attendance percentage with color-coded status (green when up, red when down)
- **Pending Approvals** - Point entries awaiting your review with "Needs attention" indicator
- **Recidivism Rate** - Track repeat placements across your program

**Action Items (Role-Aware)**
- L1 Admins see: No-shows needing reschedule, pending point approvals, reconciliation sessions, transition requests
- L2 Admins see: No-shows, student reviews
- DAEP Staff see: Attendance warnings (after 9am), student reviews

**Today's Intakes**
- View all students scheduled to arrive today
- One-click **No-Show** button with smooth animation
- One-click **Arrived** confirmation
- Visual status indicators for each intake

**Intake Pipeline Mini-View**
- At-a-glance counts: Approved → Scheduled → Arrived Today → No-Show
- Quick visibility into your intake workflow

**Students At Risk**
- Students below 85% attendance threshold
- Students with declining point trends

**Charts & Visualizations**
- **Attendance Trend** - Line chart showing attendance over time (3wk, 6wk, 9wk, YTD, Semester views)
- **Discipline Overview** - Bar chart of top 6 discipline codes driving placements

**Quick Actions**
- View Students button
- Reconcile button (CSV comparison)
- + New Placement button

**Mobile Responsive**
- Adapts from 1 column (mobile) to 2 columns (tablet) to 4 columns (desktop)

### Feedback Board Entry

Use this to create the feedback item for the changelog page:

| Field | Value |
|-------|-------|
| **Type** | Feature Request |
| **Title** | DAEP Dashboard with KPI Cards |
| **Product** | DAEP Dashboard |
| **Status** | Done |
| **Date** | Dec 14, 2024 |

**Description:**
```
See your entire DAEP program health at a glance. The new Dashboard shows enrollment, attendance, pending approvals, and recidivism metrics with trend indicators. Role-aware action items highlight what needs your attention, and quick-action buttons let you manage today's intakes without leaving the page.
```

**Admin Response:** *(green box)*
```
The DAEP Dashboard is now live! Monitor program health with 4 KPI cards showing enrollment, attendance, pending approvals, and recidivism rate—all with week-over-week trends. Action items are role-aware so you see exactly what needs your attention.
```

**Release Notes:** *(blue box on changelog)*
```
• 4 KPI cards: Enrollment, Attendance, Pending Approvals, Recidivism Rate
• Role-aware action items (L1 Admin, L2 Admin, Staff see different tasks)
• Today's Intakes with No-Show/Arrived buttons
• Intake Pipeline mini-view (Approved → Scheduled → Arrived → No-Show)
• Students At Risk card
• Attendance Trend chart (3wk/6wk/9wk/YTD views)
• Discipline Overview chart (top 6 codes)
• Mobile responsive layout
```

---

## v0.6.1 - Clickable KPIs & Drill-Down

**Released:** December 14, 2024
**Story:** 6-2
**FR:** FR79

### What's New

Your dashboard KPIs are now interactive! Click any metric card to drill down into the details, and use the campus filter to focus on specific locations. The recidivism breakdown gives L1+ admins deep insight into repeat placements with offense analysis and student-level data.

### Key Features

**Campus Filter Dropdown**
- Filter all dashboard components by campus
- Auto-hides for single-campus tenants
- Persists in URL for bookmarking and sharing

**KPI Card Click Navigation**
- **Current Enrollment** → Students page with active filter
- **Today's Attendance** → Attendance/Room Roster page
- **Pending Approvals** → Approvals page
- **Recidivism Rate** → Detailed breakdown (L1+ Admin only)

**Recidivism Drill-Down Page** (L1+ Admin Only)
- Summary stats: Rate, returning students count, total completed
- "By Original Offense" distribution chart
- "Time to Return" distribution chart (< 30 days, 30-90 days, 91-180 days, > 180 days)
- Returning students table with:
  - Student name (clickable link to profile)
  - Original offense
  - First placement days (e.g., "30 w/review")
  - Return offense
  - Days between placements
- Export to Excel functionality

**Role-Based Access Control**
- L1+ Admin (Super Admin, District Admin, L1 Admin, L2 Admin): Full recidivism breakdown access
- DAEP Staff, Campus Admin: See KPI card only, no drill-down
- Parent, Student: No dashboard access

**Visual Enhancements**
- Hover effects on KPI cards
- Smooth animations on drill-down pages
- Matching gradient styles from dashboard-preview
- Mobile responsive layouts

### Feedback Board Entry

Use this to create the feedback item for the changelog page:

| Field | Value |
|-------|-------|
| **Type** | Feature Request |
| **Title** | Dashboard Campus Filter & KPI Drill-Downs |
| **Product** | DAEP Dashboard |
| **Status** | Done |
| **Date** | Dec 14, 2024 |

**Description:**
```
Click any KPI card to see detailed breakdowns. Filter the entire dashboard by campus to focus on specific locations. Admins can access the recidivism drill-down to see offense patterns and returning student details.
```

**Admin Response:** *(green box)*
```
Dashboard KPIs are now clickable! Filter by campus to see location-specific metrics, and click any card to drill down into the data. L1+ admins get access to the new recidivism breakdown showing offense patterns and returning student details.
```

**Release Notes:** *(blue box on changelog)*
```
• Campus filter dropdown to focus on specific locations
• Click-through navigation on all 4 KPI cards
• Recidivism drill-down with offense breakdown charts
• Returning students table with profile links
• "First placement days" format (e.g., "30 w/review")
• Export to Excel on recidivism report
• Role-based access for sensitive data
• Campus filter persists in URL
```

### Technical Notes

**New Files (12)**
- `app/daep/(main)/dashboard-preview/components/campus-filter.tsx`
- `app/daep/(main)/dashboard-preview/components/drill-down-header.tsx`
- `app/daep/(main)/dashboard-preview/components/drill-down-breadcrumb.tsx`
- `app/daep/(main)/dashboard-preview/components/back-button.tsx`
- `app/daep/(main)/dashboard-preview/components/recidivism-popover.tsx`
- `app/daep/(main)/reports/recidivism/page.tsx`
- `app/daep/(main)/reports/recidivism/recidivism-drill-down.tsx`
- `components/daep/DAEPPopover.tsx`
- `components/daep/DAEPSheet.tsx`
- `components/daep/DAEPAlertDialog.tsx`
- `components/daep/DAEPDropdownMenu.tsx`
- `components/daep/index.ts`

**Modified Files**
- `app/daep/(main)/dashboard-preview/page.tsx` - Added campus filter, real data fetching
- `app/daep/(main)/dashboard-preview/components/enhanced-kpi-card.tsx` - Added click navigation, role-based popover
- `app/actions/daep/dashboard.ts` - Added getCampuses(), getRecidivismBreakdown()

---

## Remaining Stories

| Story | Title | Points | FRs |
|-------|-------|--------|-----|
| 6-3 | Attendance Reports | 3 | FR80-81 |
| 6-4 | Discipline Reports | 3 | FR82-83 |
| 6-5 | Point Progress Reports | 3 | FR84-85 |
| 6-6 | Placement Length Reports | 2 | FR86 |
| 6-7 | PDF/Excel Export | 3 | FR87 |
| 6-8 | Recidivism Tracking KPI | 3 | FR88 |
| 6-9 | 90-Day Assessment Tracking | 3 | FR89 |
| 6-10 | 120-Day Status Review Tracking | 3 | FR90 |
| 6-11 | PEIMS Submission 3 Export | 3 | FR91 |
| 6-12 | Audit Reports | 2 | FR92, FR108 |

---

## Technical Notes

### New Dependencies
- `recharts` v2.15.4 - Chart library (dynamically imported for bundle optimization)
- `framer-motion` v12.23.26 - Animation library

### New Files (17)
- `app/actions/daep/dashboard.ts` - Server actions for dashboard data
- `app/daep/(main)/components/dashboard/kpi-card.tsx`
- `app/daep/(main)/components/dashboard/kpi-grid.tsx`
- `app/daep/(main)/components/dashboard/trend-badge.tsx`
- `app/daep/(main)/components/dashboard/action-items.tsx`
- `app/daep/(main)/components/dashboard/action-item-card.tsx`
- `app/daep/(main)/components/dashboard/closed-items-popover.tsx`
- `app/daep/(main)/components/dashboard/today-intakes.tsx`
- `app/daep/(main)/components/dashboard/intake-card.tsx`
- `app/daep/(main)/components/dashboard/pipeline-mini.tsx`
- `app/daep/(main)/components/dashboard/at-risk-card.tsx`
- `app/daep/(main)/components/dashboard/attendance-trend-chart.tsx`
- `app/daep/(main)/components/dashboard/discipline-chart.tsx`
- `app/daep/(main)/components/dashboard/chart-controls.tsx`
- `app/daep/(main)/components/dashboard/quick-actions.tsx`
- `app/daep/(main)/components/dashboard/charts-wrapper.tsx`
- `lib/constants/animations.ts`

### Modified Files
- `app/daep/(main)/page.tsx` - Now renders dashboard
- `package.json` - Added recharts, framer-motion
