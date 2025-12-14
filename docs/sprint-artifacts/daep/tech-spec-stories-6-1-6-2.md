# Tech Spec: Stories 6.1 & 6.2 - Dashboard with KPIs, Action Items, and Charts

**Epic:** 6 - Dashboard & Reporting
**Points:** 5 (6.1) + 3 (6.2) = 8 total
**Status:** Ready for Development
**FRs:** FR78 (KPI cards), FR79 (Drill-down)
**Last Updated:** 2024-12-13

---

## Purpose

Create the DAEP Dashboard as the main landing page (`/daep`) providing:
- At-a-glance KPI cards with trend indicators
- Role-aware Action Items that surface what needs attention
- Today's Intakes with one-click No-Show action
- Intake Pipeline status counts
- Students At Risk summary
- Attendance Trend and Discipline Overview charts

**Design Philosophy:** "How did they ever do their job without this?" - The dashboard anticipates user needs, surfaces urgent items proactively, and provides effortless access to key information.

---

## Key Decisions from Planning

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Main route | `/daep` renders dashboard inline | Clean URL, no redirect hop |
| Chart library | Recharts | React-native, SVG-based, smaller bundle |
| KPI count | 4 cards | Matches user mockups |
| Action item completion | 400ms slide-out animation | Visual feedback without modal |
| YoY comparison | Placeholder for now | Historical data may come later |
| Additional charts | Toggleable via settings | Allow personalization |

---

## Auth Pattern (per CLAUDE.md)

```typescript
const supabase = await createServerClient();
const tenantId = await getTenantId();
const user = await currentUser();
// RLS handles role-based access at DB level
```

---

## Story 6.1: Dashboard Page with KPI Cards

### Updated Acceptance Criteria

| AC | Description | Status |
|----|-------------|--------|
| 6.1.1 | Dashboard renders at `/daep` (main landing page) | Pending |
| 6.1.2 | Students Enrolled KPI with trend | Pending |
| 6.1.3 | Attendance Rate KPI with trend | Pending |
| 6.1.4 | Pending Approvals KPI with "Needs attention" | Pending |
| 6.1.5 | Recidivism Rate KPI with breakdown capability | Pending |
| 6.1.6 | Action Items section (role-aware) | Pending |
| 6.1.7 | Today's Intakes with No-Show button | Pending |
| 6.1.8 | No-Show click: 400ms slide-out animation | Pending |
| 6.1.9 | Intake Pipeline mini-view (counts by status) | Pending |
| 6.1.10 | Students At Risk card | Pending |
| 6.1.11 | Attendance Trend chart (Recharts line) | Pending |
| 6.1.12 | Discipline Overview chart (Recharts bar) | Pending |
| 6.1.13 | Quick actions: Export, + New Intake | Pending |
| 6.1.14 | Last Updated timestamp | Pending |
| 6.1.15 | Mobile responsive grid | Pending |

---

## Story 6.2: Drill-Downs and Campus Filter

| AC | Description | Status |
|----|-------------|--------|
| 6.2.1 | Campus filter dropdown in header | Pending |
| 6.2.2 | KPI cards clickable → filtered detail views | Pending |
| 6.2.3 | Recidivism drill-down with offense breakdown | Pending |
| 6.2.4 | Breadcrumb navigation on drill-down pages | Pending |

---

## Dashboard Layout (Updated Mockup)

```
+------------------------------------------------------------------+
| Dashboard                    [Campus: All ▼]  [Export] [+ New Intake]
| Overview of program metrics and student status
+------------------------------------------------------------------+
|                                                                    |
| [Students    ] [Attendance ] [Pending     ] [Recidivism  ]        |
| [Enrolled    ] [Rate       ] [Approvals   ] [Rate        ]        |
| [247         ] [92.4%      ] [8           ] [15.3%       ]        |
| [▲ +12 week ] [▲ +2.1%    ] [⚠ Needs attn] [▼ -3.2%     ]        |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
| Action Items          [3] [👁 View Closed] | Today's Intakes      |
| ─────────────────────────────────────────── | ─────────────────────|
| ⚠ 2 No-shows need reschedule    [View]    | 9:00 AM  Jordan M.   |
| 📋 5 pending approvals          [Review]  |   Jefferson MS       |
| 📊 CSV reconciliation ready     [Review]  |   [No Show] [✓]      |
| 👤 3 students ready for review  [Start]   | ───────────────────  |
|                                            | 10:30 AM  Alex R.    |
|                                            |   Washington MS      |
|                                            |   [No Show] [✓]      |
+------------------------------------------------------------------+
|                                                                    |
| Intake Pipeline                | Students At Risk                  |
| ─────────────────────────────  | ──────────────────────────────── |
| Approved  Scheduled  Arrived   | 3 below 85% attendance           |
|   [3]       [2]        [1]     | 2 with declining points          |
| No-Show ⚠                      |                                   |
|   [2]                          | [View Students →]                 |
+------------------------------------------------------------------+
|                                                                    |
| Attendance Trend                         [3wk] [6wk] [9wk] [YTD]  |
| ─────────────────────────────────────────────────────────────────  |
|  100% ─┬─────────────────────────────────────────────────────────  |
|        │         ___                                               |
|   95% ─┤    ___/    \___     ___                                  |
|        │___/             \__/   \___      This Year               |
|   90% ─┤                            \___  - - - Last Year         |
|        │                                                           |
|   85% ─┴─────────────────────────────────────────────────────────  |
|        Wk1   Wk2   Wk3   Wk4   Wk5   Wk6         [Copy] [Export]  |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
| Discipline Overview                      [District ▼] [By Campus]  |
| ─────────────────────────────────────────────────────────────────  |
|  Fighting      ████████████████████████  42                        |
|  Drugs         ████████████             28                        |
|  Weapons       ██████                   15                        |
|  Theft         █████                    12                        |
|  Disruption    ████                      8                        |
|  Other         ███                       6                        |
|                                                     [Copy] [Export]|
+------------------------------------------------------------------+
| Last updated: 2:34 PM                                              |
+------------------------------------------------------------------+
```

---

## KPI Card Definitions (4 Cards)

### 1. Students Enrolled
```sql
SELECT COUNT(*) FROM daep_placements
WHERE tenant_id = :tenantId AND status = 'active'
```
- **Trend:** Compare to 7 days ago
- **Format:** Number with "+X this week"
- **Icon:** Users (blue)
- **Click:** → `/daep/students?filter=active`

### 2. Attendance Rate
```sql
SELECT
  COUNT(*) FILTER (WHERE status IN ('P', 'T')) * 100.0 / NULLIF(COUNT(*), 0)
FROM daep_attendance
WHERE tenant_id = :tenantId AND date = CURRENT_DATE
```
- **Trend:** Compare to same day last week
- **Format:** Percentage with "+X% from last week"
- **Icon:** Calendar/Clock (green when up, red when down)
- **Click:** → `/daep/attendance?date=today`

### 3. Pending Approvals
```sql
SELECT COUNT(*) FROM daep_daily_points
WHERE tenant_id = :tenantId AND approval_status = 'pending'
```
- **Trend:** Shows "Needs attention" if > 0
- **Format:** Number
- **Icon:** Hourglass (orange)
- **Click:** → `/daep/approvals`

### 4. Recidivism Rate
```sql
-- Students with multiple placements / total completed placements
SELECT
  COUNT(DISTINCT school_id) FILTER (WHERE placement_count > 1) * 100.0 /
  NULLIF(COUNT(DISTINCT school_id), 0)
FROM (
  SELECT school_id, COUNT(*) as placement_count
  FROM daep_placements
  WHERE tenant_id = :tenantId AND status = 'completed'
  GROUP BY school_id
) subq
```
- **Trend:** Compare to last month
- **Format:** Percentage with breakdown by discipline code
- **Icon:** Repeat/Refresh (red background)
- **Click:** → Modal/page with offense breakdown

---

## Action Items (Role-Aware)

### Data Structure

```typescript
interface ActionItem {
  id: string;
  type: ActionItemType;
  priority: 'urgent' | 'warning' | 'info';
  title: string;
  subtitle: string;
  count?: number;
  roles: UserRole[];
  timeWindow?: { start: string; end: string }; // 24h format
  href: string;
  actionLabel: string;
  relatedIds?: string[];
  completedAt?: string | null;
}

type ActionItemType =
  | 'no-show'
  | 'attendance-missing'
  | 'review-ready'
  | 'approval-pending'
  | 'reconciliation'
  | 'returning-student';

type UserRole = 'l1_admin' | 'l2_admin' | 'daep_staff';
```

### Action Items by Role

| Action Type | Roles | Time Window | Click Behavior |
|-------------|-------|-------------|----------------|
| No-shows need reschedule | L1, L2 | Always | → Reschedule modal |
| Attendance not submitted | Staff | After 9:00 AM | → Room attendance page |
| Students ready for review | Staff, L1 | Always | Staff: Submit grades/notes, L1: Start review |
| Pending point approvals | L1 | Always | → Approval queue |
| CSV reconciliation ready | L1 | Always | → Reconciliation review |
| Returning student today | Staff, L1 | Always | Staff: Submit grades/notes, L1: Review record |

### Click Behavior by Role (Same Action Type)

| Action | Staff Clicks | L1 Admin Clicks |
|--------|--------------|-----------------|
| Review Ready / Returning Student | → Submit grades & progress notes dialog | → Full student review (attendance, points, grades) |
| No-Show | View only (no action) | → Reschedule modal |

### Completion Animation

When user clicks dismiss/complete on an action item:
1. Item slides out to the right (400ms ease-out)
2. Remaining items slide up to fill gap (400ms)
3. Toast: "✓ Marked as complete"
4. Item moves to "Closed Today" list

### "View Closed" Button

- Icon button next to "Action Items" header
- Opens popover/drawer showing today's completed action items
- Items can be restored if marked complete by mistake

---

## Today's Intakes Section

### Data Structure

```typescript
interface TodayIntake {
  id: string;
  scheduledTime: string; // "9:00 AM"
  studentName: string;
  studentInitials: string;
  campusName: string;
  status: 'scheduled' | 'arrived' | 'processing' | 'completed' | 'no-show';
  placementId?: string;
}
```

### No-Show Button Behavior

1. User clicks "No Show" button on intake card
2. Button shows spinner (200ms)
3. Card fades out and slides right (400ms ease-out)
4. Toast appears: "✓ [Student Name] marked as No-Show"
5. Student moves to No-Show column in Intake Pipeline
6. Pipeline count updates

### UI States

| Status | Badge Color | Actions Available |
|--------|-------------|-------------------|
| Scheduled | Blue | [No Show] [✓ Arrived] |
| Arrived | Green | [Start Processing] |
| Processing | Yellow | [Complete] |
| Completed | Gray (muted) | None |
| No-Show | Red | [Reschedule] |

---

## Intake Pipeline Mini-View

Shows counts from the Kanban board (to be built separately):

```typescript
interface PipelineCounts {
  approved: number;    // Needs scheduling
  scheduled: number;   // Has date/time
  arrivedToday: number;
  noShow: number;      // Needs reschedule (urgent)
}
```

- Each count is clickable → navigates to `/daep/intakes?status=X`
- No-Show count has warning indicator if > 0

---

## Students At Risk Card

```typescript
interface AtRiskSummary {
  belowAttendanceThreshold: number; // < 85%
  decliningPoints: number;          // Avg points decreasing over 5 days
}
```

- Simple card with two counts
- "View Students →" link goes to filtered list
- Links to `/daep/students?filter=at-risk`

---

## Charts (Recharts)

### Attendance Trend Chart

```typescript
interface AttendanceTrendData {
  week: string;        // "Week 1", "Week 2", etc.
  rate: number;        // This year's rate
  lastYear?: number;   // Previous year (if available)
}
```

**Features:**
- Line chart with smooth curves
- Time period selector: 3 weeks, 6 weeks, 9 weeks, YTD, Semester
- Optional year-over-year comparison (dashed line for last year)
- Copy button: Copies data to clipboard as table
- Export button: Downloads as PNG or CSV

**Recharts Implementation:**
```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
    <XAxis dataKey="week" />
    <YAxis domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
    <Tooltip formatter={(v) => `${v}%`} />
    <Legend />
    <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} name="This Year" />
    <Line type="monotone" dataKey="lastYear" stroke="#9ca3af" strokeDasharray="5 5" name="Last Year" />
  </LineChart>
</ResponsiveContainer>
```

### Discipline Overview Chart

```typescript
interface DisciplineData {
  code: string;        // "Fighting", "Drugs", etc.
  shortCode: string;   // State code
  count: number;
  color: string;
}
```

**Features:**
- Horizontal bar chart showing top 6 discipline codes
- Toggle: District total vs By Campus breakdown
- Color-coded bars
- Copy button: Copies data as table
- Export button: Downloads as PNG or CSV

**Recharts Implementation:**
```tsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
    <XAxis type="number" />
    <YAxis type="category" dataKey="code" />
    <Tooltip />
    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
      {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
    </Bar>
  </BarChart>
</ResponsiveContainer>
```

### Chart Settings (Future - Settings Page)

Users can toggle charts on/off in Settings → Dashboard:

| Chart | Default | Description |
|-------|---------|-------------|
| Attendance Trend | On | Line chart over time |
| Discipline Overview | On | Top 6 codes bar chart |
| Enrollment Flow | Off | Intakes vs completions |
| Points Trend | Off | Average points over time |
| Days to Completion | Off | Distribution histogram |
| Attendance by Day | Off | Mon-Fri pattern heatmap |
| Recidivism Breakdown | On | Pie/bar by offense |

---

## Server Actions

### File: `app/actions/daep/dashboard.ts`

```typescript
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getTenantId } from '@/lib/tenant';
import { currentUser } from '@clerk/nextjs/server';
import { format, subDays, subMonths } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export interface KPICard {
  id: string;
  label: string;
  value: number;
  format: 'number' | 'percent' | 'decimal';
  trend: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string; // "+12 this week", "+2.1% from last week"
    sentiment: 'positive' | 'negative' | 'neutral' | 'attention';
  };
  icon: string;
  iconColor: string;
  href: string;
}

export interface ActionItem {
  id: string;
  type: string;
  priority: 'urgent' | 'warning' | 'info';
  title: string;
  subtitle: string;
  count?: number;
  href: string;
  actionLabel: string;
  completedAt: string | null;
}

export interface TodayIntake {
  id: string;
  scheduledTime: string;
  studentName: string;
  studentInitials: string;
  campusName: string;
  status: 'scheduled' | 'arrived' | 'processing' | 'completed' | 'no-show';
  placementId?: string;
}

export interface PipelineCounts {
  approved: number;
  scheduled: number;
  arrivedToday: number;
  noShow: number;
}

export interface AtRiskSummary {
  belowAttendanceThreshold: number;
  decliningPoints: number;
}

export interface AttendanceTrendPoint {
  week: string;
  rate: number;
  lastYear?: number;
}

export interface DisciplineCount {
  code: string;
  shortCode: string;
  count: number;
  color: string;
}

export interface DashboardData {
  kpis: KPICard[];
  actionItems: ActionItem[];
  todayIntakes: TodayIntake[];
  pipelineCounts: PipelineCounts;
  atRisk: AtRiskSummary;
  attendanceTrend: AttendanceTrendPoint[];
  disciplineOverview: DisciplineCount[];
  lastUpdated: string;
}

// ============================================================================
// MAIN DASHBOARD FETCH
// ============================================================================

export async function getDashboardData(
  userRole: string,
  campusFilter?: string
): Promise<DashboardData> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();
  const today = format(new Date(), 'yyyy-MM-dd');
  const lastWeek = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM-dd');

  // Parallel fetch all data
  const [
    kpis,
    actionItems,
    todayIntakes,
    pipelineCounts,
    atRisk,
    attendanceTrend,
    disciplineOverview,
  ] = await Promise.all([
    getKPIs(supabase, tenantId, today, lastWeek, lastMonth, campusFilter),
    getActionItems(supabase, tenantId, userRole, today),
    getTodayIntakes(supabase, tenantId, today),
    getPipelineCounts(supabase, tenantId),
    getAtRiskSummary(supabase, tenantId),
    getAttendanceTrend(supabase, tenantId, 6), // Default 6 weeks
    getDisciplineOverview(supabase, tenantId, campusFilter),
  ]);

  return {
    kpis,
    actionItems,
    todayIntakes,
    pipelineCounts,
    atRisk,
    attendanceTrend,
    disciplineOverview,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// KPI CARDS
// ============================================================================

async function getKPIs(
  supabase: any,
  tenantId: string,
  today: string,
  lastWeek: string,
  lastMonth: string,
  campusFilter?: string
): Promise<KPICard[]> {
  // Implementation for 4 KPIs: Enrollment, Attendance, Approvals, Recidivism
  // ... (detailed implementation)
  return [];
}

// ============================================================================
// ACTION ITEMS
// ============================================================================

async function getActionItems(
  supabase: any,
  tenantId: string,
  userRole: string,
  today: string
): Promise<ActionItem[]> {
  const items: ActionItem[] = [];
  const currentHour = new Date().getHours();

  // No-shows needing reschedule (L1, L2)
  if (['l1_admin', 'l2_admin'].includes(userRole)) {
    const { count } = await supabase
      .from('daep_intakes') // Or wherever no-shows are tracked
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'no-show')
      .is('rescheduled_to', null);

    if (count && count > 0) {
      items.push({
        id: 'no-shows',
        type: 'no-show',
        priority: 'warning',
        title: `${count} No-show${count > 1 ? 's' : ''} need reschedule`,
        subtitle: 'From recent intakes',
        count,
        href: '/daep/intakes?status=no-show',
        actionLabel: 'View',
        completedAt: null,
      });
    }
  }

  // Attendance not submitted (Staff, after 9am)
  if (userRole === 'daep_staff' && currentHour >= 9) {
    // Check if user's room has attendance submitted for today
    // ... implementation
  }

  // Students ready for review (Staff, L1)
  if (['daep_staff', 'l1_admin'].includes(userRole)) {
    // Query students where review is due based on days/points threshold
    // Reference: bell notification story for the field name
    // ... implementation
  }

  // Pending point approvals (L1)
  if (userRole === 'l1_admin') {
    const { count } = await supabase
      .from('daep_daily_points')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending');

    if (count && count > 0) {
      items.push({
        id: 'pending-approvals',
        type: 'approval-pending',
        priority: 'warning',
        title: `${count} pending point approval${count > 1 ? 's' : ''}`,
        subtitle: 'Awaiting your review',
        count,
        href: '/daep/approvals',
        actionLabel: 'Review',
        completedAt: null,
      });
    }
  }

  // CSV reconciliation ready (L1)
  if (userRole === 'l1_admin') {
    const { count } = await supabase
      .from('daep_reconciliation_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'reviewed')
      .gt('discrepancy_count', 0);

    if (count && count > 0) {
      items.push({
        id: 'reconciliation',
        type: 'reconciliation',
        priority: 'info',
        title: 'CSV reconciliation ready',
        subtitle: `${count} session${count > 1 ? 's' : ''} with discrepancies`,
        count,
        href: '/daep/reconciliation',
        actionLabel: 'Review',
        completedAt: null,
      });
    }
  }

  return items;
}

// ============================================================================
// ACTION ITEM MUTATIONS
// ============================================================================

export async function completeActionItem(itemId: string): Promise<{ success: boolean }> {
  // Mark action item as completed for today
  // Store in local storage or a user_action_items table
  return { success: true };
}

export async function restoreActionItem(itemId: string): Promise<{ success: boolean }> {
  // Restore a completed action item
  return { success: true };
}

// ============================================================================
// TODAY'S INTAKES
// ============================================================================

async function getTodayIntakes(
  supabase: any,
  tenantId: string,
  today: string
): Promise<TodayIntake[]> {
  // Fetch scheduled intakes for today
  // ... implementation
  return [];
}

export async function markIntakeNoShow(intakeId: string): Promise<{ success: boolean }> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { error } = await supabase
    .from('daep_intakes')
    .update({ status: 'no-show', no_show_at: new Date().toISOString() })
    .eq('id', intakeId)
    .eq('tenant_id', tenantId);

  return { success: !error };
}

export async function markIntakeArrived(intakeId: string): Promise<{ success: boolean }> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { error } = await supabase
    .from('daep_intakes')
    .update({ status: 'arrived', arrived_at: new Date().toISOString() })
    .eq('id', intakeId)
    .eq('tenant_id', tenantId);

  return { success: !error };
}

// ============================================================================
// PIPELINE COUNTS
// ============================================================================

async function getPipelineCounts(
  supabase: any,
  tenantId: string
): Promise<PipelineCounts> {
  // Count intakes by status
  // ... implementation
  return {
    approved: 0,
    scheduled: 0,
    arrivedToday: 0,
    noShow: 0,
  };
}

// ============================================================================
// AT RISK SUMMARY
// ============================================================================

async function getAtRiskSummary(
  supabase: any,
  tenantId: string
): Promise<AtRiskSummary> {
  // Count students below attendance threshold
  // Count students with declining points (5-day average trending down)
  // ... implementation
  return {
    belowAttendanceThreshold: 0,
    decliningPoints: 0,
  };
}

// ============================================================================
// ATTENDANCE TREND CHART
// ============================================================================

export async function getAttendanceTrend(
  supabase: any,
  tenantId: string,
  weeks: number = 6
): Promise<AttendanceTrendPoint[]> {
  // Fetch weekly attendance rates for the specified number of weeks
  // Optionally include last year's data for comparison
  // ... implementation
  return [];
}

// ============================================================================
// DISCIPLINE OVERVIEW CHART
// ============================================================================

async function getDisciplineOverview(
  supabase: any,
  tenantId: string,
  campusFilter?: string
): Promise<DisciplineCount[]> {
  // Get top 6 discipline codes by count
  // ... implementation
  return [];
}

// ============================================================================
// RECIDIVISM DRILL-DOWN (Story 6.2)
// ============================================================================

export interface RecidivismDetail {
  studentName: string;
  schoolId: string;
  originalOffense: string;
  returnOffense: string;
  daysBetween: number;
  placementCount: number;
}

export async function getRecidivismBreakdown(
  campusFilter?: string
): Promise<{
  byOffense: { offense: string; count: number; percentage: number }[];
  students: RecidivismDetail[];
}> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get students with multiple placements, grouped by original offense
  // This answers "why are students returning?"
  // ... implementation

  return {
    byOffense: [],
    students: [],
  };
}
```

---

## UI Components

### File Structure

```
app/daep/(main)/
├── page.tsx                              # Dashboard (main landing page)
├── components/
│   ├── dashboard/
│   │   ├── kpi-card.tsx                 # Single KPI card
│   │   ├── kpi-grid.tsx                 # 4-card grid
│   │   ├── action-items.tsx             # Role-aware action list
│   │   ├── action-item-card.tsx         # Single action with animation
│   │   ├── today-intakes.tsx            # Intake list with actions
│   │   ├── intake-card.tsx              # Single intake with No-Show button
│   │   ├── pipeline-mini.tsx            # Pipeline counts
│   │   ├── at-risk-card.tsx             # Students at risk summary
│   │   ├── attendance-trend-chart.tsx   # Recharts line chart
│   │   ├── discipline-chart.tsx         # Recharts bar chart
│   │   ├── chart-controls.tsx           # Time period selector, copy/export
│   │   ├── quick-actions.tsx            # Export, + New Intake buttons
│   │   └── closed-items-popover.tsx     # View completed actions
```

### Animation Constants

```typescript
// lib/constants/animations.ts
export const DASHBOARD_ANIMATIONS = {
  slideOut: {
    duration: 400,
    easing: 'ease-out',
  },
  slideUp: {
    duration: 400,
    easing: 'ease-out',
  },
  fadeIn: {
    duration: 200,
    easing: 'ease-in',
  },
};
```

### Action Item Card with Animation

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActionItem } from '@/app/actions/daep/dashboard';

interface ActionItemCardProps {
  item: ActionItem;
  onComplete: (id: string) => void;
  onClick: () => void;
}

export function ActionItemCard({ item, onComplete, onClick }: ActionItemCardProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExiting(true);
    // Animation completes, then remove from DOM
    setTimeout(() => onComplete(item.id), 400);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          layout
          className="..."
          onClick={onClick}
        >
          {/* Card content */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Intake Card with No-Show Animation

```tsx
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { markIntakeNoShow } from '@/app/actions/daep/dashboard';

interface IntakeCardProps {
  intake: TodayIntake;
  onStatusChange: () => void;
}

export function IntakeCard({ intake, onStatusChange }: IntakeCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleNoShow = async () => {
    setIsLoading(true);
    const result = await markIntakeNoShow(intake.id);

    if (result.success) {
      setIsExiting(true);
      toast.success(`${intake.studentName} marked as No-Show`);
      setTimeout(() => onStatusChange(), 400);
    } else {
      setIsLoading(false);
      toast.error('Failed to mark as no-show');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1, x: 0 }}
      animate={isExiting ? { opacity: 0, x: 100 } : { opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="..."
    >
      {/* Intake info */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNoShow}
          disabled={isLoading || intake.status !== 'scheduled'}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'No Show'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {/* Mark arrived */}}
          disabled={intake.status !== 'scheduled'}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          ✓
        </Button>
      </div>
    </motion.div>
  );
}
```

---

## Dependencies

### New Package: Recharts

```bash
npm install recharts
```

### New Package: Framer Motion (for animations)

```bash
npm install framer-motion
```

---

## Database Considerations

### Existing Tables Used
- `daep_placements` - Enrollment, transitions, recidivism
- `daep_attendance` - Attendance rates
- `daep_daily_points` - Points, approvals
- `daep_reconciliation_sessions` - Reconciliation status
- `daep_intakes` (or similar) - Intake pipeline

### Students Ready for Review Field

Reference the bell notification story and settings page for the field that indicates when a student is due for review based on days/points threshold.

### Discipline Codes Reference Table

Check for existing `discipline_codes` or similar table with state codes and descriptions.

---

## Performance Budget

| Metric | Target |
|--------|--------|
| First Load JS | < 200KB (with Recharts lazy-loaded) |
| Dashboard data fetch | < 800ms |
| Time to Interactive | < 2s |
| Chart render | < 200ms |

### Optimization Strategies

1. **Parallel queries** with `Promise.all()`
2. **Lazy load charts** - Dynamic import for Recharts
3. **Skeleton loading** - Show placeholders while data loads
4. **Memoization** - Cache chart data client-side

---

## Testing Checklist

### Story 6.1
- [ ] Dashboard renders at `/daep`
- [ ] 4 KPI cards display with correct values
- [ ] Trends show correct direction and colors
- [ ] Action Items section shows role-appropriate items
- [ ] Action item click navigates correctly by role
- [ ] Action item completion animates (400ms slide-out)
- [ ] "View Closed" shows today's completed items
- [ ] Today's Intakes section loads
- [ ] No-Show button: loading state, slide-out, toast
- [ ] Pipeline counts display correctly
- [ ] Students At Risk card shows counts
- [ ] Attendance Trend chart renders
- [ ] Chart time period selector works
- [ ] Chart copy/export buttons work
- [ ] Discipline Overview chart renders
- [ ] Last Updated timestamp displays
- [ ] Mobile responsive (1/2/3 columns)
- [ ] TypeScript compiles without errors
- [ ] Playwright MCP verification

### Story 6.2
- [ ] Campus filter dropdown in header
- [ ] Filter updates all KPIs and charts
- [ ] KPI card click → filtered detail view
- [ ] Recidivism card click → offense breakdown
- [ ] Breadcrumb navigation on drill-down
- [ ] Back to Dashboard button works

---

## File List

### New Files

| File | Description |
|------|-------------|
| `app/daep/(main)/page.tsx` | Dashboard main page (replaces current) |
| `app/actions/daep/dashboard.ts` | Dashboard server actions |
| `app/daep/(main)/components/dashboard/*.tsx` | All dashboard components |
| `lib/constants/animations.ts` | Animation timing constants |

### Modified Files

| File | Changes |
|------|---------|
| `components/daep/sidebar.tsx` | Dashboard link at top |
| `package.json` | Add recharts, framer-motion |

### Deleted/Replaced Files

| File | Reason |
|------|--------|
| `app/daep/(main)/dashboard/page.tsx` | Merged into `/daep/page.tsx` |

---

## References

- [Source: CLAUDE.md] - Auth patterns, performance guidelines
- [Source: Epic 6 Stories] - FR78, FR79 requirements
- [Source: User Mockups] - Dashboard design (Dec 13, 2024)
- [Source: Kanban Mockup] - Intake pipeline design
- [Source: Planning Session] - Feature decisions and UX principles
- [Source: dashboard-backlog.md] - Deferred features list
