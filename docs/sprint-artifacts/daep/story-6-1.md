# Story 6-1: Dashboard Page with KPI Cards

**Status:** ready-for-dev
**Epic:** 6 - Dashboard & Reporting
**Points:** 5
**FRs:** FR78
**Dependencies:** Epic 2 (placements), Epic 3 (points, attendance), Epic 5 (reconciliation)

---

## Story

As a **DAEP administrator**,
I want **a dashboard showing key metrics at a glance with trend indicators**,
So that **I can monitor program health quickly and identify areas needing attention**.

---

## Design Philosophy

> "How did they ever do their job without this?"

Right now, DAEP admins piece together program status from multiple screens. This dashboard puts everything in one view: enrollment, attendance, points, transitions, and approvals. Color-coded trends show if things are improving or declining. One screen to know exactly where you stand.

---

## Reference Mockup

**Source:** `docs/sprint-artifacts/daep/tech-spec-stories-6-1-6-2.md`

```
+------------------------------------------------------------------+
|  DAEP Dashboard                    [View Students] [Reconcile] [+ New Placement]
|  Overview of program metrics and student status
+------------------------------------------------------------------+
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | Current          |  | Today's          |  | Avg Points       |  |
|  | Enrollment       |  | Attendance       |  | Today            |  |
|  |                  |  |                  |  |                  |  |
|  |       47         |  |      92%         |  |      8.4         |  |
|  |  [Users Icon]    |  |  [Clock Icon]    |  |  [Award Icon]    |  |
|  |  ▲ 8.5% vs last  |  |  ▲ 3% vs last    |  |  ▲ 0.5 vs last   |  |
|  |     week         |  |     week         |  |     week         |  |
|  +------------------+  +------------------+  +------------------+  |
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | Below 85%        |  | Pending          |  | Pending          |  |
|  | Attendance       |  | Transitions      |  | Approvals        |  |
|  |                  |  |                  |  |                  |  |
|  |        5         |  |        3         |  |       12         |  |
|  | [Warning Icon]   |  | [Arrows Icon]    |  | [Check Icon]     |  |
|  |  ▼ 2 vs last     |  |  — No change     |  |  ▲ Needs attn    |  |
|  |     week (good!) |  |                  |  |                  |  |
|  +------------------+  +------------------+  +------------------+  |
|                                                                    |
+------------------------------------------------------------------+
```

**KPI Card Color Coding:**
- **Current Enrollment:** Blue (neutral metric)
- **Today's Attendance:** Green when ▲, Red when ▼
- **Avg Points Today:** Purple, Green when ▲
- **Below 85% Attendance:** Red icon, Green trend when ▼
- **Pending Transitions:** Amber (action needed)
- **Pending Approvals:** Orange (action needed)

---

## Acceptance Criteria

| AC | Description | Status | Test |
|----|-------------|--------|------|
| 6.1.1 | Dashboard renders at `/daep` (main landing page) | Pending | Navigate to URL, page renders |
| 6.1.2 | Students Enrolled KPI with trend (+X this week) | Pending | Verify count matches DB |
| 6.1.3 | Attendance Rate KPI with trend (+X% from last week) | Pending | Verify calculation correct |
| 6.1.4 | Pending Approvals KPI with "Needs attention" indicator | Pending | Verify count matches |
| 6.1.5 | Recidivism Rate KPI with trend (-X% from last month) | Pending | Verify calculation correct |
| 6.1.6 | Action Items section (role-aware) | Pending | Verify items match user role |
| 6.1.7 | Today's Intakes with No-Show button | Pending | Verify list loads |
| 6.1.8 | No-Show click: spinner, 400ms slide-out, toast | Pending | Click and verify animation |
| 6.1.9 | Intake Pipeline mini-view (counts by status) | Pending | Verify counts match DB |
| 6.1.10 | Students At Risk card | Pending | Verify counts display |
| 6.1.11 | Attendance Trend chart (Recharts line, 3/6/9wk/YTD) | Pending | Verify chart renders |
| 6.1.12 | Discipline Overview chart (Recharts bar, top 6) | Pending | Verify chart renders |
| 6.1.13 | Quick actions: Export, + New Intake | Pending | Click each button |
| 6.1.14 | Last Updated timestamp | Pending | Verify timestamp displays |
| 6.1.15 | Grid is mobile responsive (1/2/3 columns) | Pending | Resize browser, verify layout |
| 6.1.16 | Action item completion with slide-out animation | Pending | Mark complete, verify animation |
| 6.1.17 | "View Closed" button shows today's completed items | Pending | Click and verify popover |

---

## Tasks / Subtasks

### Task 1: Setup & Dependencies

- [ ] 1.1 Install recharts: `npm install recharts`
- [ ] 1.2 Install framer-motion: `npm install framer-motion`
- [ ] 1.3 Create `lib/constants/animations.ts` with DASHBOARD_ANIMATIONS

### Task 2: Server Actions - getDashboardData

- [ ] 2.1 Create `app/actions/daep/dashboard.ts`
- [ ] 2.2 Add TypeScript interfaces (KPICard, ActionItem, TodayIntake, etc.)
- [ ] 2.3 Implement `getDashboardData()` with parallel queries
- [ ] 2.4 Implement `getKPIs()` for 4 cards (Enrollment, Attendance, Approvals, Recidivism)
- [ ] 2.5 Implement `getActionItems()` with role-awareness
- [ ] 2.6 Implement `getTodayIntakes()` for intake list
- [ ] 2.7 Implement `getPipelineCounts()` for pipeline mini-view
- [ ] 2.8 Implement `getAtRiskSummary()` for at-risk card
- [ ] 2.9 Implement `getAttendanceTrend()` for chart data
- [ ] 2.10 Implement `getDisciplineOverview()` for chart data
- [ ] 2.11 Implement `markIntakeNoShow()` and `markIntakeArrived()` mutations
- [ ] 2.12 Implement `completeActionItem()` and `restoreActionItem()` mutations

### Task 3: Dashboard Page

- [ ] 3.1 Replace `app/daep/(main)/page.tsx` with dashboard content
- [ ] 3.2 Set `export const dynamic = 'force-dynamic'`
- [ ] 3.3 Fetch dashboard data with user role
- [ ] 3.4 Render header with title and quick actions
- [ ] 3.5 Add Suspense boundaries with skeleton loading

### Task 4: KPI Cards (4 cards)

- [ ] 4.1 Create `components/dashboard/kpi-card.tsx`
- [ ] 4.2 Create `components/dashboard/kpi-grid.tsx` (4-column responsive)
- [ ] 4.3 Create `components/dashboard/trend-badge.tsx`
- [ ] 4.4 Configure icons and colors per KPI type
- [ ] 4.5 Add click navigation to detail views

### Task 5: Action Items Section

- [ ] 5.1 Create `components/dashboard/action-items.tsx`
- [ ] 5.2 Create `components/dashboard/action-item-card.tsx` with animation
- [ ] 5.3 Create `components/dashboard/closed-items-popover.tsx`
- [ ] 5.4 Implement 400ms slide-out animation on complete
- [ ] 5.5 Implement role-based click behavior
- [ ] 5.6 Add "View Closed" button with today's completed items

### Task 6: Today's Intakes Section

- [ ] 6.1 Create `components/dashboard/today-intakes.tsx`
- [ ] 6.2 Create `components/dashboard/intake-card.tsx`
- [ ] 6.3 Implement No-Show button with loading spinner
- [ ] 6.4 Implement 400ms slide-out animation on No-Show
- [ ] 6.5 Show toast on successful action
- [ ] 6.6 Implement Arrived (✓) button

### Task 7: Pipeline & At-Risk Cards

- [ ] 7.1 Create `components/dashboard/pipeline-mini.tsx`
- [ ] 7.2 Create `components/dashboard/at-risk-card.tsx`
- [ ] 7.3 Add clickable counts → navigate to filtered views

### Task 8: Charts (Recharts)

- [ ] 8.1 Create `components/dashboard/attendance-trend-chart.tsx`
- [ ] 8.2 Add time period selector (3wk, 6wk, 9wk, YTD, Semester)
- [ ] 8.3 Add YoY comparison line (dashed, if data available)
- [ ] 8.4 Create `components/dashboard/discipline-chart.tsx`
- [ ] 8.5 Add District/Campus toggle
- [ ] 8.6 Create `components/dashboard/chart-controls.tsx` (Copy, Export)
- [ ] 8.7 Implement dynamic import for Recharts (bundle optimization)

### Task 9: Quick Actions & Navigation

- [ ] 9.1 Create `components/dashboard/quick-actions.tsx` (Export, + New Intake)
- [ ] 9.2 Update DAEP sidebar with Dashboard link at top
- [ ] 9.3 Add Last Updated timestamp footer

### Task 10: Testing

- [ ] 10.1 Verify dashboard renders at `/daep`
- [ ] 10.2 Verify 4 KPI cards display with correct values
- [ ] 10.3 Verify Action Items show role-appropriate items
- [ ] 10.4 Verify No-Show animation (400ms slide-out, toast)
- [ ] 10.5 Verify action item completion animation
- [ ] 10.6 Verify "View Closed" popover works
- [ ] 10.7 Verify charts render with data
- [ ] 10.8 Verify chart controls (time period, copy, export)
- [ ] 10.9 Verify mobile responsive grid
- [ ] 10.10 TypeScript compilation
- [ ] 10.11 Playwright MCP verification

---

## Dev Notes

### Key Decisions from Planning Session (Dec 13, 2024)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Main route | `/daep` renders dashboard inline | Clean URL, no redirect |
| Chart library | Recharts | React-native, SVG, smaller bundle |
| KPI count | 4 cards | Matches user mockups |
| Animation timing | 400ms ease-out | Smooth but not slow |
| YoY comparison | Placeholder | Historical data may come later |

### Action Items by Role

| Role | Sees |
|------|------|
| L1 Admin | No-shows, pending approvals, reconciliation, reviews |
| L2 Admin | No-shows, reviews |
| DAEP Staff | Attendance warning (after 9am), reviews |

### Click Behavior by Role (Same Action Type)

| Action | Staff Clicks | L1 Admin Clicks |
|--------|--------------|-----------------|
| Review Ready | → Submit grades/notes | → Full student review |
| No-Show | View only | → Reschedule modal |

### Animation Constants

```typescript
export const DASHBOARD_ANIMATIONS = {
  slideOut: { duration: 400, easing: 'ease-out' },
  slideUp: { duration: 400, easing: 'ease-out' },
  fadeIn: { duration: 200, easing: 'ease-in' },
};
```

### Recharts Dynamic Import (Bundle Optimization)

```typescript
const AttendanceTrendChart = dynamic(
  () => import('./attendance-trend-chart'),
  { loading: () => <Skeleton className="h-[300px]" /> }
);
```

### Responsive Grid Classes

```typescript
// 4 KPI cards
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

// Action Items + Today's Intakes (2 columns)
<div className="grid gap-6 md:grid-cols-2">

// Pipeline + At Risk (2 columns)
<div className="grid gap-6 md:grid-cols-2">

// Charts (full width)
<div className="space-y-6">
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| No placements yet | Show 0 for enrollment, hide trend |
| No attendance recorded today | Show 0% with "No attendance recorded" |
| No intakes today | Show empty state with "No intakes scheduled" |
| Division by zero (trend calc) | Return 0% change, neutral direction |
| No historical data for YoY | Hide comparison line, show only current |
| Action item already completed | Filter out from active list |

---

## Out of Scope (See dashboard-backlog.md)

| Item | Deferred To |
|------|-------------|
| Campus filter dropdown | Story 6-2 |
| KPI card drill-down navigation | Story 6-2 |
| Recidivism offense breakdown | Story 6-2 |
| "Start My Day" button | Story 6-3 |
| Predictive alerts | Story 6-3 |
| Student quick preview popover | Story 6-5 |
| Keyboard shortcuts | Future |

---

## Dependencies

### Tables
- `daep_placements` - Enrollment, transitions, recidivism
- `daep_attendance` - Attendance rate calculations
- `daep_daily_points` - Points, pending approvals
- `daep_reconciliation_sessions` - Reconciliation status
- `daep_intakes` (or similar) - Intake pipeline

### Packages (New)
- `recharts` - Chart library
- `framer-motion` - Animations

### Existing
- shadcn/ui components: Card, Button, Badge, Popover
- `sonner` for toasts

---

## Definition of Done

- [ ] Dashboard renders at `/daep`
- [ ] 4 KPI cards display with correct values and trends
- [ ] Action Items section shows role-appropriate items
- [ ] Action item completion animates (400ms slide-out)
- [ ] "View Closed" shows today's completed items
- [ ] Today's Intakes section loads with No-Show/Arrived buttons
- [ ] No-Show click: spinner, slide-out, toast
- [ ] Pipeline mini-view shows counts by status
- [ ] Students At Risk card shows counts
- [ ] Attendance Trend chart renders with time period selector
- [ ] Discipline Overview chart renders with top 6 codes
- [ ] Charts have copy/export controls
- [ ] Last Updated timestamp displays
- [ ] Grid is mobile responsive
- [ ] Page loads in < 2 seconds
- [ ] TypeScript compiles without errors
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-stories-6-1-6-2.md` - Technical specification
- `docs/reference/epics-part2.md` - Epic 6 story definitions
- `app/actions/daep/attendance.ts` - getStudentsBelowThreshold function

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### File List

**New Files:**
- `app/actions/daep/dashboard.ts` - Dashboard server actions
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
- `lib/constants/animations.ts` - Animation timing constants
- `docs/sprint-artifacts/daep/dashboard-backlog.md` - Deferred features

**Modified Files:**
- `app/daep/(main)/page.tsx` - Replace with dashboard content
- `components/daep/sidebar.tsx` - Add Dashboard nav link at top
- `package.json` - Add recharts, framer-motion

---

## User Feedback & Design Direction (Dec 13, 2024 Planning Session)

### Reference Mockups
User provided three mockup images:
1. Dashboard with 4 KPI cards + Action Items + Today's Intakes
2. Dashboard with scheduled intakes and pending actions sidebar
3. Intake Pipeline Kanban board

### Confirmed KPIs (4 cards)
1. **Students Enrolled** - Count with "+X this week" trend
2. **Attendance Rate** - Percentage with "+X% from last week" trend
3. **Pending Approvals** - Count with "Needs attention" indicator
4. **Recidivism Rate** - Percentage with breakdown by discipline code

### Role Clarifications
- **L1 Admin** - Approves points and teacher comments
- **Students ready for review** - Based on days/points threshold (settings configurable)
- **No 90-day reviews** - Students return daily with reviews

### Action Items by Role (Corrected)

| Role | Sees | Click Behavior |
|------|------|----------------|
| L1 Admin | No-shows, pending approvals, reconciliation, reviews | Review → Full student review |
| L2 Admin | No-shows, reviews | Review → Full student review |
| DAEP Staff | Attendance warning (9am+), reviews | Review → Submit grades/notes |

### No-Show Button Behavior
- Click → spinner (200ms) → slide-out animation (400ms) → toast
- Moves student to No-Show column on Kanban board
- L1/L2 can click to reschedule
- Staff sees view only

### Action Item Completion
- 400ms slide-out to right animation
- Remaining cards slide up (400ms)
- "View Closed" button next to header shows today's completed items
- Can restore if completed by mistake

### Charts (IN SCOPE for 6-1)
- **Attendance Trend** - Line chart with 3wk/6wk/9wk/YTD/Semester options
- **Discipline Overview** - Bar chart, top 6 codes, District/Campus toggle
- Both charts have Copy and Export buttons
- YoY comparison is placeholder (historical data may come later)

### Additional Charts (Settings toggle, defaults OFF)
- Enrollment Flow - Intakes vs completions
- Points Trend - Average over time
- Days to Completion - Distribution histogram
- Attendance by Day - Mon-Fri heatmap
- Recidivism Breakdown - By offense

### UX Principles Confirmed
> "Its simplicity and effectiveness should allow the user to walk away with a sense that using it was effortless."

- Professional appearance
- Helpful confirmations without being intrusive
- Not overly busy
- Anticipatory - show what users need before they ask

### Deferred to Future Stories
See `docs/sprint-artifacts/daep/dashboard-backlog.md` for full list:
- Campus filter dropdown (6-2)
- Recidivism drill-down (6-2)
- "Start My Day" button (6-3)
- Student quick preview popover (6-5)
- Keyboard shortcuts (Future)

### Open Questions (Resolved)
| Question | Resolution |
|----------|------------|
| Campus filter UI | Dropdown in header (Story 6-2) |
| Max action items | TBD during implementation |
| Tomorrow toggle | TBD during implementation |
| Charts | IN SCOPE - Attendance Trend + Discipline Overview |

---

## References

- [Source: docs/sprint-artifacts/daep/tech-spec-stories-6-1-6-2.md] - Technical specification
- [Source: docs/sprint-artifacts/daep/dashboard-backlog.md] - Deferred features
- [Source: FR78] - KPI cards requirement
- [Source: docs/reference/epics-part2.md] - Epic 6 story 6.1 definition
- [Source: User mockups] - Three dashboard design references provided Dec 13, 2024
