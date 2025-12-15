'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Dashboard Loading Skeleton
 *
 * Design goal: Feel like the dashboard is already ready,
 * just personalizing the data for the user.
 */

// Shimmer animation for skeleton elements
function Shimmer({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded bg-slate-100',
        className
      )}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          ease: 'linear',
          repeat: Infinity,
        }}
      />
    </motion.div>
  );
}

// KPI Card Skeleton
export function KPICardSkeleton() {
  return (
    <Card className="border-0 bg-gradient-to-br from-slate-50/80 to-gray-50/40 shadow-sm">
      <CardContent className="pt-6 pb-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-9 w-20" />
            <Shimmer className="h-5 w-32 rounded-full" />
          </div>
          <Shimmer className="h-12 w-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

// KPI Grid Skeleton
export function KPIGridSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <KPICardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// Action Item Skeleton
function ActionItemSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.08 }}
      className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50"
    >
      <Shimmer className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-48" />
        <Shimmer className="h-3 w-32" />
      </div>
      <div className="flex items-center gap-2">
        <Shimmer className="h-8 w-16 rounded-md" />
        <Shimmer className="h-8 w-8 rounded-md" />
      </div>
    </motion.div>
  );
}

// Action Items Skeleton
export function ActionItemsSkeleton() {
  return (
    <Card className="shadow-sm border-slate-200/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-5 w-24" />
        </div>
        <Shimmer className="h-8 w-20 rounded-md" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <ActionItemSkeleton key={i} index={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Intake Card Skeleton
function IntakeCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.08 }}
      className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50"
    >
      <Shimmer className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-36" />
        <Shimmer className="h-3 w-24" />
      </div>
      <div className="flex items-center gap-2">
        <Shimmer className="h-8 w-20 rounded-md" />
        <Shimmer className="h-8 w-8 rounded-md" />
      </div>
    </motion.div>
  );
}

// Today's Intakes Skeleton
export function TodayIntakesSkeleton() {
  return (
    <Card className="shadow-sm border-slate-200/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-5 w-28" />
        </div>
        <Shimmer className="h-6 w-16 rounded-full" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <IntakeCardSkeleton key={i} index={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Chart Skeleton
export function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card className="shadow-sm border-slate-200/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Shimmer className="h-5 w-32" />
          <Shimmer className="h-8 w-40 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-end justify-between gap-2 px-4 pb-4">
          {[60, 80, 45, 90, 70, 85, 65, 75, 50, 95].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
              className="flex-1 bg-gradient-to-t from-blue-100 to-blue-50 rounded-t"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Intake Pipeline Skeleton
export function IntakePipelineSkeleton() {
  return (
    <Card className="shadow-sm border-slate-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-5 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-slate-50/50"
            >
              <Shimmer className="h-8 w-10" />
              <Shimmer className="h-3 w-16 mt-2" />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Students At Risk Skeleton
export function StudentsAtRiskSkeleton() {
  return (
    <Card className="shadow-sm border-slate-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shimmer className="h-4 w-4 rounded" />
          <Shimmer className="h-5 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50"
            >
              <Shimmer className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-4 w-28" />
                <Shimmer className="h-3 w-36" />
              </div>
              <Shimmer className="h-6 w-20 rounded-full" />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Full Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="space-y-2">
          <Shimmer className="h-8 w-32" />
          <Shimmer className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Shimmer className="h-9 w-28 rounded-md" />
          <Shimmer className="h-9 w-36 rounded-md" />
        </div>
      </motion.div>

      {/* KPI Cards */}
      <KPIGridSkeleton />

      {/* Intake Pipeline & Students At Risk */}
      <div className="grid gap-6 md:grid-cols-2">
        <IntakePipelineSkeleton />
        <StudentsAtRiskSkeleton />
      </div>

      {/* Action Items & Intakes */}
      <div className="grid gap-6 md:grid-cols-2">
        <ActionItemsSkeleton />
        <TodayIntakesSkeleton />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartSkeleton title="Attendance Trend" />
        <ChartSkeleton title="Discipline Overview" />
      </div>
    </div>
  );
}
