'use server';

/**
 * Dashboard Server Actions
 *
 * Story 6-1: Dashboard Page with KPI Cards
 *
 * Provides server actions for:
 * - getDashboardData: Main data fetch with parallel queries
 * - getKPIs: 4 KPI cards (Enrollment, Attendance, Approvals, Recidivism)
 * - getActionItems: Role-aware action items
 * - getTodayIntakes: Today's scheduled intakes
 * - getPipelineCounts: Intake pipeline status counts
 * - getAtRiskSummary: Students at risk summary
 * - getAttendanceTrend: Chart data for attendance trend
 * - getDisciplineOverview: Chart data for discipline breakdown
 */

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { format, subDays, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

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
    label: string;
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
  placementId: string;
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
  weekNumber: number;
  rate: number;
  lastYear?: number;
}

export interface DisciplineCount {
  code: string;
  label: string;
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
// HELPERS
// ============================================================================

async function getTenantId(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('tenant_id, active_tenant_id')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  return effectiveTenantId;
}

async function getUserRole(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  return profile.role;
}

// Discipline code colors for chart
const DISCIPLINE_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
];

// ============================================================================
// MAIN DASHBOARD FETCH
// ============================================================================

export async function getDashboardData(
  campusFilter?: string
): Promise<DashboardData> {
  const tenantId = await getTenantId();
  const userRole = await getUserRole();
  const supabase = await createServerClient();
  const today = format(new Date(), 'yyyy-MM-dd');

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
    getKPIs(supabase, tenantId, today, campusFilter),
    getActionItems(supabase, tenantId, userRole, today),
    getTodayIntakes(supabase, tenantId, today),
    getPipelineCounts(supabase, tenantId),
    getAtRiskSummary(supabase, tenantId),
    getAttendanceTrend(supabase, tenantId, 6),
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
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string,
  today: string,
  campusFilter?: string
): Promise<KPICard[]> {
  const lastWeek = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  // 1. Current Enrollment
  let enrollmentQuery = supabase
    .from('daep_placements')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (campusFilter) {
    enrollmentQuery = enrollmentQuery.eq('home_campus_id', campusFilter);
  }

  const { count: currentEnrollment } = await enrollmentQuery;

  // Enrollment 7 days ago (placements that were active then)
  let enrollmentLastWeekQuery = supabase
    .from('daep_placements')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lte('start_date', lastWeek);

  if (campusFilter) {
    enrollmentLastWeekQuery = enrollmentLastWeekQuery.eq('home_campus_id', campusFilter);
  }

  const { count: enrollmentLastWeek } = await enrollmentLastWeekQuery;

  const enrollmentChange = (currentEnrollment || 0) - (enrollmentLastWeek || 0);
  const enrollmentDirection = enrollmentChange > 0 ? 'up' : enrollmentChange < 0 ? 'down' : 'neutral';

  // 2. Today's Attendance Rate
  let attendanceQuery = supabase
    .from('daep_attendance')
    .select('status, counts_toward_days_served')
    .eq('tenant_id', tenantId)
    .eq('date', today);

  const { data: todayAttendance } = await attendanceQuery;

  let attendanceRate = 0;
  if (todayAttendance && todayAttendance.length > 0) {
    const present = todayAttendance.filter(
      (a) => a.status !== 'A' || a.counts_toward_days_served
    ).length;
    attendanceRate = Math.round((present / todayAttendance.length) * 100);
  }

  // Attendance same day last week
  const lastWeekDay = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const { data: lastWeekAttendance } = await supabase
    .from('daep_attendance')
    .select('status, counts_toward_days_served')
    .eq('tenant_id', tenantId)
    .eq('date', lastWeekDay);

  let lastWeekRate = 0;
  if (lastWeekAttendance && lastWeekAttendance.length > 0) {
    const present = lastWeekAttendance.filter(
      (a) => a.status !== 'A' || a.counts_toward_days_served
    ).length;
    lastWeekRate = Math.round((present / lastWeekAttendance.length) * 100);
  }

  const attendanceChange = attendanceRate - lastWeekRate;
  const attendanceDirection = attendanceChange > 0 ? 'up' : attendanceChange < 0 ? 'down' : 'neutral';

  // 3. Pending Approvals
  const { count: pendingApprovals } = await supabase
    .from('daep_daily_points')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('approval_status', 'pending');

  // 4. Recidivism Rate
  // Students with multiple placements / total students with completed placements
  let completedQuery = supabase
    .from('daep_placements')
    .select('school_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed');

  if (campusFilter) {
    completedQuery = completedQuery.eq('home_campus_id', campusFilter);
  }

  const { data: completedPlacements } = await completedQuery;

  let recidivismRate = 0;
  if (completedPlacements && completedPlacements.length > 0) {
    const studentCounts = new Map<string, number>();
    completedPlacements.forEach((p: { school_id: string }) => {
      studentCounts.set(p.school_id, (studentCounts.get(p.school_id) || 0) + 1);
    });

    const totalStudents = studentCounts.size;
    const repeatStudents = Array.from(studentCounts.values()).filter((c) => c > 1).length;

    if (totalStudents > 0) {
      recidivismRate = Math.round((repeatStudents / totalStudents) * 100 * 10) / 10;
    }
  }

  return [
    {
      id: 'enrollment',
      label: 'Current Enrollment',
      value: currentEnrollment || 0,
      format: 'number',
      trend: {
        value: Math.abs(enrollmentChange),
        direction: enrollmentDirection,
        label: enrollmentChange === 0 ? 'No change' : `${enrollmentChange > 0 ? '+' : ''}${enrollmentChange} this week`,
        sentiment: 'neutral',
      },
      icon: 'Users',
      iconColor: 'text-blue-500',
      href: '/daep/students?filter=active',
    },
    {
      id: 'attendance',
      label: "Today's Attendance",
      value: attendanceRate,
      format: 'percent',
      trend: {
        value: Math.abs(attendanceChange),
        direction: attendanceDirection,
        label: todayAttendance?.length === 0
          ? 'No attendance recorded'
          : attendanceChange === 0
            ? 'Same as last week'
            : `${attendanceChange > 0 ? '+' : ''}${attendanceChange}% vs last week`,
        sentiment: attendanceDirection === 'up' ? 'positive' : attendanceDirection === 'down' ? 'negative' : 'neutral',
      },
      icon: 'Clock',
      iconColor: attendanceDirection === 'up' ? 'text-green-500' : attendanceDirection === 'down' ? 'text-red-500' : 'text-gray-500',
      href: '/daep/attendance',
    },
    {
      id: 'approvals',
      label: 'Pending Approvals',
      value: pendingApprovals || 0,
      format: 'number',
      trend: {
        value: pendingApprovals || 0,
        direction: 'neutral',
        label: (pendingApprovals || 0) > 0 ? 'Needs attention' : 'All caught up',
        sentiment: (pendingApprovals || 0) > 0 ? 'attention' : 'positive',
      },
      icon: 'Hourglass',
      iconColor: (pendingApprovals || 0) > 0 ? 'text-orange-500' : 'text-green-500',
      href: '/daep/approvals',
    },
    {
      id: 'recidivism',
      label: 'Recidivism Rate',
      value: recidivismRate,
      format: 'percent',
      trend: {
        value: 0,
        direction: 'neutral',
        label: 'All time',
        sentiment: recidivismRate > 20 ? 'negative' : 'neutral',
      },
      icon: 'RefreshCw',
      iconColor: recidivismRate > 20 ? 'text-red-500' : 'text-purple-500',
      href: '/daep/reports/recidivism',
    },
  ];
}

// ============================================================================
// ACTION ITEMS
// ============================================================================

async function getActionItems(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string,
  userRole: string,
  today: string
): Promise<ActionItem[]> {
  const items: ActionItem[] = [];
  const currentHour = new Date().getHours();

  const isL1Admin = ['super_admin', 'district_admin', 'daep_admin_l1'].includes(userRole);
  const isL2Admin = ['daep_admin_l2'].includes(userRole);
  const isStaff = ['daep_staff'].includes(userRole);

  // 1. No-shows needing reschedule (L1, L2)
  if (isL1Admin || isL2Admin) {
    const { count } = await supabase
      .from('daep_placements')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('no_show', true)
      .eq('status', 'pending');

    if (count && count > 0) {
      items.push({
        id: 'no-shows',
        type: 'no-show',
        priority: 'warning',
        title: `${count} No-show${count > 1 ? 's' : ''} need reschedule`,
        subtitle: 'From recent intakes',
        count,
        href: '/daep/students?filter=no-show',
        actionLabel: 'View',
        completedAt: null,
      });
    }
  }

  // 2. Pending point approvals (L1 only)
  if (isL1Admin) {
    const { count } = await supabase
      .from('daep_daily_points')
      .select('*', { count: 'exact', head: true })
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

  // 3. CSV reconciliation ready (L1 only)
  if (isL1Admin) {
    const { count } = await supabase
      .from('daep_reconciliation_sessions')
      .select('*', { count: 'exact', head: true })
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

  // 4. Attendance not submitted (Staff, after 9am)
  if (isStaff && currentHour >= 9) {
    // Check if user has any rooms with missing attendance for today
    const { count } = await supabase
      .from('daep_rooms')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('active', true);

    // This is simplified - in full implementation, check specific rooms assigned to user
    if (count && count > 0) {
      const { count: attendanceCount } = await supabase
        .from('daep_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('date', today);

      // If no attendance recorded yet and it's after 9am
      if (!attendanceCount || attendanceCount === 0) {
        items.push({
          id: 'attendance-missing',
          type: 'attendance-missing',
          priority: 'urgent',
          title: 'Attendance not submitted',
          subtitle: "Today's attendance needs to be recorded",
          href: '/daep/rooms',
          actionLabel: 'Submit',
          completedAt: null,
        });
      }
    }
  }

  // 5. Students with transition requested (L1)
  if (isL1Admin) {
    const { count } = await supabase
      .from('daep_placements')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('transition_requested_date', 'is', null)
      .is('transition_approved_date', null);

    if (count && count > 0) {
      items.push({
        id: 'transitions',
        type: 'transition-pending',
        priority: 'info',
        title: `${count} pending transition${count > 1 ? 's' : ''}`,
        subtitle: 'Awaiting approval',
        count,
        href: '/daep/students?filter=transition-pending',
        actionLabel: 'Review',
        completedAt: null,
      });
    }
  }

  return items;
}

// ============================================================================
// TODAY'S INTAKES
// ============================================================================

async function getTodayIntakes(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string,
  today: string
): Promise<TodayIntake[]> {
  // Get placements with start_date = today (pending status = scheduled intake)
  const { data: placements, error } = await supabase
    .from('daep_placements')
    .select(`
      id,
      status,
      no_show,
      start_date,
      home_campus_id,
      students!inner(school_id, first_name, last_name),
      campuses:home_campus_id(name)
    `)
    .eq('tenant_id', tenantId)
    .eq('start_date', today)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: true });

  if (error || !placements) {
    console.error('Error fetching today intakes:', error);
    return [];
  }

  return placements.map((p) => {
    // Handle joined data
    const student = Array.isArray(p.students) ? p.students[0] : p.students;
    const campus = Array.isArray(p.campuses) ? p.campuses[0] : p.campuses;

    let status: TodayIntake['status'] = 'scheduled';
    if (p.no_show) {
      status = 'no-show';
    } else if (p.status === 'active') {
      status = 'arrived';
    }

    const firstName = student?.first_name || '';
    const lastName = student?.last_name || '';

    return {
      id: p.id,
      scheduledTime: '9:00 AM', // Default - could be stored in intake_notes or a separate field
      studentName: `${firstName} ${lastName}`.trim() || 'Unknown',
      studentInitials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '??',
      campusName: campus?.name || 'Unknown Campus',
      status,
      placementId: p.id,
    };
  });
}

// ============================================================================
// INTAKE MUTATIONS
// ============================================================================

export async function markIntakeNoShow(placementId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await getTenantId();
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('daep_placements')
      .update({ no_show: true })
      .eq('id', placementId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error marking no-show:', error);
      return { success: false, error: 'Failed to mark as no-show' };
    }

    return { success: true };
  } catch (error) {
    console.error('markIntakeNoShow error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function markIntakeArrived(placementId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await getTenantId();
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('daep_placements')
      .update({
        status: 'active',
        no_show: false,
      })
      .eq('id', placementId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error marking arrived:', error);
      return { success: false, error: 'Failed to mark as arrived' };
    }

    return { success: true };
  } catch (error) {
    console.error('markIntakeArrived error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// PIPELINE COUNTS
// ============================================================================

async function getPipelineCounts(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string
): Promise<PipelineCounts> {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Approved = pending status, no start_date yet (needs scheduling)
  const { count: approved } = await supabase
    .from('daep_placements')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .is('start_date', null);

  // Scheduled = pending status, has start_date in future
  const { count: scheduled } = await supabase
    .from('daep_placements')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .not('start_date', 'is', null)
    .gte('start_date', today)
    .eq('no_show', false);

  // Arrived today = active status, start_date = today
  const { count: arrivedToday } = await supabase
    .from('daep_placements')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .eq('start_date', today);

  // No-shows
  const { count: noShow } = await supabase
    .from('daep_placements')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('no_show', true)
    .eq('status', 'pending');

  return {
    approved: approved || 0,
    scheduled: scheduled || 0,
    arrivedToday: arrivedToday || 0,
    noShow: noShow || 0,
  };
}

// ============================================================================
// AT RISK SUMMARY
// ============================================================================

async function getAtRiskSummary(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string
): Promise<AtRiskSummary> {
  // Get active placements
  const { data: placements } = await supabase
    .from('daep_placements')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (!placements || placements.length === 0) {
    return { belowAttendanceThreshold: 0, decliningPoints: 0 };
  }

  const placementIds = placements.map((p) => p.id);

  // Get attendance for these placements
  const { data: attendance } = await supabase
    .from('daep_attendance')
    .select('placement_id, status, counts_toward_days_served')
    .eq('tenant_id', tenantId)
    .in('placement_id', placementIds);

  // Calculate attendance rate per placement
  const attendanceByPlacement = new Map<string, { present: number; total: number }>();

  (attendance || []).forEach((a) => {
    const current = attendanceByPlacement.get(a.placement_id) || { present: 0, total: 0 };
    current.total++;
    if (a.status !== 'A' || a.counts_toward_days_served) {
      current.present++;
    }
    attendanceByPlacement.set(a.placement_id, current);
  });

  // Count students below 85% threshold
  let belowThreshold = 0;
  attendanceByPlacement.forEach((data) => {
    if (data.total > 0) {
      const rate = (data.present / data.total) * 100;
      if (rate < 85) {
        belowThreshold++;
      }
    }
  });

  // For declining points, we'd need a more complex calculation
  // For MVP, we'll return 0 and implement properly in a later story
  const decliningPoints = 0;

  return {
    belowAttendanceThreshold: belowThreshold,
    decliningPoints,
  };
}

// ============================================================================
// ATTENDANCE TREND CHART
// ============================================================================

async function getAttendanceTrend(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string,
  weeks: number = 6
): Promise<AttendanceTrendPoint[]> {
  const data: AttendanceTrendPoint[] = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });

    const { data: weekAttendance } = await supabase
      .from('daep_attendance')
      .select('status, counts_toward_days_served')
      .eq('tenant_id', tenantId)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(weekEnd, 'yyyy-MM-dd'));

    let rate = 0;
    if (weekAttendance && weekAttendance.length > 0) {
      const present = weekAttendance.filter(
        (a) => a.status !== 'A' || a.counts_toward_days_served
      ).length;
      rate = Math.round((present / weekAttendance.length) * 100 * 10) / 10;
    }

    data.push({
      week: `Week ${weeks - i}`,
      weekNumber: weeks - i,
      rate,
      // lastYear would require historical data - placeholder for now
      lastYear: undefined,
    });
  }

  return data;
}

// ============================================================================
// DISCIPLINE OVERVIEW CHART
// ============================================================================

async function getDisciplineOverview(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  tenantId: string,
  campusFilter?: string
): Promise<DisciplineCount[]> {
  // Get all placements with offense codes
  let query = supabase
    .from('daep_placements')
    .select('offense_code')
    .eq('tenant_id', tenantId)
    .not('offense_code', 'is', null);

  if (campusFilter) {
    query = query.eq('home_campus_id', campusFilter);
  }

  const { data: placements } = await query;

  if (!placements || placements.length === 0) {
    return [];
  }

  // Count by offense code
  const counts = new Map<string, number>();
  placements.forEach((p) => {
    if (p.offense_code) {
      counts.set(p.offense_code, (counts.get(p.offense_code) || 0) + 1);
    }
  });

  // Get discipline code labels
  const codes = Array.from(counts.keys());
  const { data: disciplineCodes } = await supabase
    .from('daep_discipline_codes')
    .select('code, label')
    .eq('tenant_id', tenantId)
    .in('code', codes);

  // Build label lookup
  const labelMap = new Map<string, string>();
  (disciplineCodes || []).forEach((dc) => {
    labelMap.set(dc.code, dc.label);
  });

  // Sort by count and take top 6
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return sorted.map(([code, count], index) => ({
    code,
    label: labelMap.get(code) || code,
    count,
    color: DISCIPLINE_COLORS[index % DISCIPLINE_COLORS.length],
  }));
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

export async function getAttendanceTrendForPeriod(
  period: '3wk' | '6wk' | '9wk' | 'ytd' | 'semester'
): Promise<AttendanceTrendPoint[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const weeksMap = {
    '3wk': 3,
    '6wk': 6,
    '9wk': 9,
    'ytd': 36, // ~9 months
    'semester': 18, // ~4.5 months
  };

  return getAttendanceTrend(supabase, tenantId, weeksMap[period]);
}

// ============================================================================
// ACTION ITEM MUTATIONS
// ============================================================================

export async function completeActionItem(itemId: string): Promise<{ success: boolean }> {
  // For MVP, action items are computed dynamically
  // Completion could be stored in local storage or a user_action_items table
  // For now, we just return success - the item will reappear if the underlying condition still exists
  return { success: true };
}

export async function restoreActionItem(itemId: string): Promise<{ success: boolean }> {
  return { success: true };
}
