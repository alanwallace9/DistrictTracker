'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedKPICard } from './components/enhanced-kpi-card';
import { EnhancedActionItems } from './components/enhanced-action-items';
import { DashboardSkeleton } from './components/dashboard-skeleton';
import { IntakePipeline } from './components/intake-pipeline';
import { StudentsAtRisk } from './components/students-at-risk';
import { AttendanceTrend } from './components/attendance-trend';
import { DisciplineOverview } from './components/discipline-overview';
import { CollapsibleCard } from './components/collapsible-card';
import { CampusFilter, type Campus } from './components/campus-filter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  UserPlus,
  Clock,
  AlertTriangle,
  TrendingUp,
  Scale,
} from 'lucide-react';
import Link from 'next/link';
import type { UserRole } from '@/lib/roles';
import { getDashboardData, getCampuses, type KPICard } from '@/app/actions/daep/dashboard';

/**
 * Dashboard Preview Page
 *
 * Compare enhanced styling and animations with the live dashboard.
 * Uses test data to demonstrate interactions.
 *
 * Route: /daep/dashboard-preview
 */

// Test Data - Realistic scenarios
const TEST_KPIS = [
  {
    id: 'enrollment',
    label: 'Current Enrollment',
    value: 47,
    format: 'number' as const,
    trend: {
      value: 3,
      direction: 'up' as const,
      label: '+3 this week',
      sentiment: 'neutral' as const,
    },
    icon: 'Users',
    iconColor: 'text-blue-600',
    href: '/daep/students?filter=active',
  },
  {
    id: 'attendance',
    label: "Today's Attendance",
    value: 92,
    format: 'percent' as const,
    trend: {
      value: 4,
      direction: 'up' as const,
      label: '+4% vs last week',
      sentiment: 'positive' as const,
    },
    icon: 'Clock',
    iconColor: 'text-emerald-600',
    href: '/daep/attendance',
  },
  {
    id: 'approvals',
    label: 'Pending Approvals',
    value: 8,
    format: 'number' as const,
    trend: {
      value: 8,
      direction: 'neutral' as const,
      label: 'Needs attention',
      sentiment: 'attention' as const,
    },
    icon: 'Hourglass',
    iconColor: 'text-amber-600',
    href: '/daep/approvals',
  },
  {
    id: 'recidivism',
    label: 'Recidivism Rate',
    value: 12.5,
    format: 'percent' as const,
    trend: {
      value: 2,
      direction: 'down' as const,
      label: '-2% from last month',
      sentiment: 'positive' as const,
    },
    icon: 'RefreshCw',
    iconColor: 'text-purple-600',
    href: '/daep/reports/recidivism',
  },
];

const TEST_ACTION_ITEMS = [
  {
    id: 'no-show-1',
    type: 'no-show',
    priority: 'urgent' as const,
    title: '2 No-shows need reschedule',
    subtitle: 'From yesterday\'s intakes',
    count: 2,
    href: '/daep/students?filter=no-show',
    actionLabel: 'View',
    completedAt: null,
  },
  {
    id: 'approval-1',
    type: 'approval-pending',
    priority: 'warning' as const,
    title: '8 pending point approvals',
    subtitle: 'Awaiting your review',
    count: 8,
    href: '/daep/approvals',
    actionLabel: 'Review',
    completedAt: null,
  },
  {
    id: 'reconciliation-1',
    type: 'reconciliation',
    priority: 'info' as const,
    title: 'CSV reconciliation ready',
    subtitle: '3 discrepancies found',
    count: 3,
    href: '/daep/reconciliation',
    actionLabel: 'Review',
    completedAt: null,
  },
  {
    id: 'transition-1',
    type: 'transition-pending',
    priority: 'info' as const,
    title: '1 pending transition',
    subtitle: 'Awaiting approval',
    count: 1,
    href: '/daep/students?filter=transition-pending',
    actionLabel: 'Review',
    completedAt: null,
  },
];

const TEST_INTAKES = [
  {
    id: 'intake-1',
    scheduledTime: '9:00 AM',
    studentName: 'Marcus Johnson',
    studentInitials: 'MJ',
    campusName: 'Lincoln Middle School',
    status: 'scheduled' as const,
    placementId: 'p-1',
  },
  {
    id: 'intake-2',
    scheduledTime: '9:30 AM',
    studentName: 'Sophia Rodriguez',
    studentInitials: 'SR',
    campusName: 'Washington High School',
    status: 'scheduled' as const,
    placementId: 'p-2',
  },
  {
    id: 'intake-3',
    scheduledTime: '10:00 AM',
    studentName: 'David Kim',
    studentInitials: 'DK',
    campusName: 'Jefferson Elementary',
    status: 'arrived' as const,
    placementId: 'p-3',
  },
];

// Today's Intakes Component (Preview Version)
function PreviewTodayIntakes() {
  const [intakes, setIntakes] = useState(TEST_INTAKES);

  const handleMarkArrived = (id: string) => {
    setIntakes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'arrived' as const } : i))
    );
  };

  const handleMarkNoShow = (id: string) => {
    setIntakes((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <Card className="shadow-sm border-slate-200/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
          <Calendar className="h-4 w-4" />
          Today&apos;s Intakes
          <Badge variant="secondary" className="ml-1 text-xs bg-slate-100">
            {intakes.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {intakes.map((intake, index) => (
              <motion.div
                key={intake.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 100, transition: { duration: 0.3 } }}
                transition={{ delay: index * 0.08 }}
                layout
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50/50 to-white hover:shadow-md transition-all"
              >
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-medium text-blue-700">
                  {intake.studentInitials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-slate-800 truncate">
                      {intake.studentName}
                    </p>
                    {intake.status === 'arrived' && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        Arrived
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {intake.scheduledTime} • {intake.campusName}
                  </p>
                </div>

                {/* Actions */}
                {intake.status !== 'arrived' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-white/80 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      onClick={() => handleMarkNoShow(intake.id)}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      No-Show
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-white/80 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                      onClick={() => handleMarkArrived(intake.id)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Arrived
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Actions Component
// Simulated role and reconciliation state for demo
const DEMO_USER_ROLE: UserRole = 'daep_admin_l1'; // Admin role for demo
const ADMIN_ROLES = ['daep_admin_l1', 'daep_admin_l2', 'super_admin'];

// Test campuses for demo
const TEST_CAMPUSES: Campus[] = [
  { id: 'campus-1', name: 'Lincoln Middle School' },
  { id: 'campus-2', name: 'Washington High School' },
  { id: 'campus-3', name: 'Jefferson Elementary' },
  { id: 'campus-4', name: 'Roosevelt Middle School' },
];

interface QuickActionsProps {
  isReconciled?: boolean;
  onReconcile?: () => void;
  userRole?: string;
}

function PreviewQuickActions({
  isReconciled = false,
  onReconcile,
  userRole = DEMO_USER_ROLE
}: QuickActionsProps) {
  const canReconcile = ADMIN_ROLES.includes(userRole);

  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/daep/students">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-background hover:bg-muted border-border shadow-sm"
        >
          <Users className="h-4 w-4" />
          View Students
        </Button>
      </Link>
      {canReconcile && (
        isReconciled ? (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="gap-2 bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default"
          >
            <CheckCircle2 className="h-4 w-4" />
            Reconciled
          </Button>
        ) : (
          <Link href="/daep/reconciliation">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-background hover:bg-muted border-border shadow-sm"
              onClick={onReconcile}
            >
              <FileText className="h-4 w-4" />
              Reconcile
            </Button>
          </Link>
        )
      )}
      <Link href="/daep/placements/new">
        <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
          <Plus className="h-4 w-4" />
          New Placement
        </Button>
      </Link>
    </div>
  );
}

// Main Preview Page
export default function DashboardPreviewPage() {
  const searchParams = useSearchParams();
  const campusId = searchParams.get('campus') || undefined;

  const [isLoading, setIsLoading] = useState(true);
  const [isReconciled, setIsReconciled] = useState(false);
  const [kpis, setKpis] = useState<KPICard[]>(TEST_KPIS);
  const [campuses, setCampuses] = useState<Campus[]>(TEST_CAMPUSES);
  const [dataLoading, setDataLoading] = useState(false);

  // Track if initial load is complete
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Initial load - fetch campuses and show skeleton demo
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Fetch real campuses
        const realCampuses = await getCampuses();
        if (realCampuses.length > 0) {
          setCampuses(realCampuses);
        }
        // Fetch real KPIs with initial campus filter
        const data = await getDashboardData(campusId);
        if (data.kpis.length > 0) {
          setKpis(data.kpis);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Keep test data on error
      }
      // Show skeleton for at least 1s for the animation demo
      setTimeout(() => {
        setIsLoading(false);
        setInitialLoadDone(true);
      }, 1000);
    };
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Re-fetch when campus filter changes (after initial load)
  useEffect(() => {
    if (initialLoadDone) {
      const fetchFilteredData = async () => {
        setDataLoading(true);
        try {
          const data = await getDashboardData(campusId);
          if (data.kpis.length > 0) {
            setKpis(data.kpis);
          }
        } catch (error) {
          console.error('Failed to load filtered data:', error);
        }
        setDataLoading(false);
      };
      fetchFilteredData();
    }
  }, [campusId, initialLoadDone]);

  // Handler for reconciliation demo
  const handleReconcile = () => {
    // In real app, this would be set based on DB state
    setIsReconciled(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Preview Badge */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            Preview Mode
          </Badge>
          <span className="text-sm text-amber-700">
            Loading skeleton demo - watch the animations!
          </span>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview Badge */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            Preview Mode
          </Badge>
          <span className="text-sm text-amber-700">
            Enhanced dashboard with test data. Try completing action items!
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsLoading(true)}
          className="text-amber-700 hover:text-amber-800"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Replay Loading
        </Button>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Good morning! ☀️
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what needs your attention today
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CampusFilter campuses={campuses} />
          <PreviewQuickActions isReconciled={isReconciled} onReconcile={handleReconcile} />
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      >
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.1 }}
          >
            <EnhancedKPICard kpi={kpi} userRole={DEMO_USER_ROLE} />
          </motion.div>
        ))}
      </motion.div>

      {/* Intake Pipeline & Students At Risk */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <IntakePipeline />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <StudentsAtRisk />
        </motion.div>
      </div>

      {/* Action Items & Today's Intakes */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <EnhancedActionItems initialItems={TEST_ACTION_ITEMS} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <PreviewTodayIntakes />
        </motion.div>
      </div>

      {/* Charts: Attendance Trend & Discipline Overview (with CollapsibleCard demo) */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <CollapsibleCard
            cardId="attendance-trend"
            title="Attendance Trend"
            icon={<TrendingUp className="h-4 w-4" />}
          >
            <AttendanceTrend embedded />
          </CollapsibleCard>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <CollapsibleCard
            cardId="discipline-overview"
            title="Discipline Overview"
            icon={<Scale className="h-4 w-4" />}
          >
            <DisciplineOverview embedded />
          </CollapsibleCard>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-xs text-muted-foreground text-center py-4 border-t"
      >
        Last updated: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </motion.div>
    </div>
  );
}
