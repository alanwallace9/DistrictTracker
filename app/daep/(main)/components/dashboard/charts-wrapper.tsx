'use client';

import dynamic from 'next/dynamic';
import { AttendanceTrendChartSkeleton } from './attendance-trend-chart';
import { DisciplineChartSkeleton } from './discipline-chart';
import type { AttendanceTrendPoint, DisciplineCount } from '@/app/actions/daep/dashboard';

// Dynamic imports for chart components to reduce bundle size
// These are loaded client-side only since they use canvas/SVG rendering
const AttendanceTrendChart = dynamic(
  () =>
    import('./attendance-trend-chart').then((mod) => mod.AttendanceTrendChart),
  {
    loading: () => <AttendanceTrendChartSkeleton />,
    ssr: false,
  }
);

const DisciplineChart = dynamic(
  () => import('./discipline-chart').then((mod) => mod.DisciplineChart),
  {
    loading: () => <DisciplineChartSkeleton />,
    ssr: false,
  }
);

interface ChartsWrapperProps {
  attendanceTrend: AttendanceTrendPoint[];
  disciplineOverview: DisciplineCount[];
}

export function ChartsWrapper({
  attendanceTrend,
  disciplineOverview,
}: ChartsWrapperProps) {
  return (
    <div className="space-y-6">
      <AttendanceTrendChart data={attendanceTrend} />
      <DisciplineChart data={disciplineOverview} />
    </div>
  );
}
