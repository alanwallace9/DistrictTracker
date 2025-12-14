'use client';

import { KPICard } from './kpi-card';
import type { KPICard as KPICardType } from '@/app/actions/daep/dashboard';

interface KPIGridProps {
  kpis: KPICardType[];
}

export function KPIGrid({ kpis }: KPIGridProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}
