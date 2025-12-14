'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendBadge } from './trend-badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Users,
  Clock,
  Hourglass,
  RefreshCw,
  LucideIcon,
} from 'lucide-react';
import type { KPICard as KPICardType } from '@/app/actions/daep/dashboard';

const iconMap: Record<string, LucideIcon> = {
  Users,
  Clock,
  Hourglass,
  RefreshCw,
};

interface KPICardProps {
  kpi: KPICardType;
}

export function KPICard({ kpi }: KPICardProps) {
  const Icon = iconMap[kpi.icon] || Users;

  const formattedValue = kpi.format === 'percent'
    ? `${kpi.value}%`
    : kpi.format === 'decimal'
      ? kpi.value.toFixed(1)
      : kpi.value.toLocaleString();

  return (
    <Link href={kpi.href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <p className="text-3xl font-bold tracking-tight">
                {formattedValue}
              </p>
              <TrendBadge
                value={kpi.trend.value}
                direction={kpi.trend.direction}
                label={kpi.trend.label}
                sentiment={kpi.trend.sentiment}
              />
            </div>
            <div
              className={cn(
                'rounded-lg p-3 bg-opacity-10',
                kpi.iconColor.includes('blue') && 'bg-blue-100',
                kpi.iconColor.includes('green') && 'bg-green-100',
                kpi.iconColor.includes('red') && 'bg-red-100',
                kpi.iconColor.includes('orange') && 'bg-orange-100',
                kpi.iconColor.includes('purple') && 'bg-purple-100',
                kpi.iconColor.includes('gray') && 'bg-gray-100'
              )}
            >
              <Icon className={cn('h-6 w-6', kpi.iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
