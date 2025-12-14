import { getDashboardData } from '@/app/actions/daep/dashboard';
import { KPIGrid } from './components/dashboard/kpi-grid';
import { ActionItems } from './components/dashboard/action-items';
import { TodayIntakes } from './components/dashboard/today-intakes';
import { PipelineMini } from './components/dashboard/pipeline-mini';
import { AtRiskCard } from './components/dashboard/at-risk-card';
import { QuickActions } from './components/dashboard/quick-actions';
import { ChartsWrapper } from './components/dashboard/charts-wrapper';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DAEPDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of program metrics and student status
          </p>
        </div>
        <QuickActions />
      </div>

      {/* KPI Cards */}
      <KPIGrid kpis={data.kpis} />

      {/* Action Items & Today's Intakes */}
      <div className="grid gap-6 md:grid-cols-2">
        <ActionItems initialItems={data.actionItems} />
        <TodayIntakes initialIntakes={data.todayIntakes} />
      </div>

      {/* Pipeline & At Risk */}
      <div className="grid gap-6 md:grid-cols-2">
        <PipelineMini counts={data.pipelineCounts} />
        <AtRiskCard summary={data.atRisk} />
      </div>

      {/* Charts - loaded client-side for bundle optimization */}
      <ChartsWrapper
        attendanceTrend={data.attendanceTrend}
        disciplineOverview={data.disciplineOverview}
      />

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center py-4 border-t">
        Last updated: {format(new Date(data.lastUpdated), 'h:mm a')}
      </div>
    </div>
  );
}
