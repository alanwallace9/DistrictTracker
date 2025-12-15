'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, useInView } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Users,
  Clock,
  Hourglass,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  LucideIcon,
} from 'lucide-react';
import { kpiCardHover, countUpConfig } from './enhanced-animations';
import { RecidivismPopover } from './recidivism-popover';
import type { UserRole } from '@/lib/roles';

const iconMap: Record<string, LucideIcon> = {
  Users,
  Clock,
  Hourglass,
  RefreshCw,
};

// Roles that can access recidivism breakdown
const RECIDIVISM_ALLOWED_ROLES: UserRole[] = [
  'super_admin',
  'district_admin',
  'daep_admin_l1',
  'daep_admin_l2',
];

interface KPIData {
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

interface EnhancedKPICardProps {
  kpi: KPIData;
  userRole?: UserRole;
}

// Animated number counter
function AnimatedNumber({
  value,
  format
}: {
  value: number;
  format: 'number' | 'percent' | 'decimal';
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const startValue = 0;
    const duration = countUpConfig.duration * 1000;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic for satisfying deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * easeProgress;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value]);

  const formatted = format === 'percent'
    ? `${Math.round(displayValue)}%`
    : format === 'decimal'
      ? displayValue.toFixed(1)
      : Math.round(displayValue).toLocaleString();

  return <span ref={ref}>{formatted}</span>;
}

// Trend badge with better styling
function EnhancedTrendBadge({
  trend
}: {
  trend: KPIData['trend'];
}) {
  const TrendIcon = trend.direction === 'up'
    ? TrendingUp
    : trend.direction === 'down'
      ? TrendingDown
      : Minus;

  const colorClasses = {
    positive: 'text-emerald-600 bg-emerald-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-slate-500 bg-slate-50',
    attention: 'text-amber-600 bg-amber-50',
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      colorClasses[trend.sentiment]
    )}>
      <TrendIcon className="h-3 w-3" />
      <span>{trend.label}</span>
    </div>
  );
}

// Gradient backgrounds based on card type
const gradientClasses: Record<string, string> = {
  enrollment: 'from-blue-50/80 to-indigo-50/40',
  attendance: 'from-emerald-50/80 to-teal-50/40',
  approvals: 'from-amber-50/80 to-orange-50/40',
  recidivism: 'from-purple-50/80 to-violet-50/40',
};

const iconBgClasses: Record<string, string> = {
  enrollment: 'bg-gradient-to-br from-blue-100 to-indigo-100',
  attendance: 'bg-gradient-to-br from-emerald-100 to-teal-100',
  approvals: 'bg-gradient-to-br from-amber-100 to-orange-100',
  recidivism: 'bg-gradient-to-br from-purple-100 to-violet-100',
};

// The card content (shared between linked and popover versions)
function KPICardContent({ kpi }: { kpi: KPIData }) {
  const Icon = iconMap[kpi.icon] || Users;

  return (
    <motion.div
      initial="rest"
      whileHover="hover"
      variants={kpiCardHover}
      className="h-full rounded-xl overflow-hidden"
    >
      <Card className={cn(
        'h-full border-0 bg-gradient-to-br shadow-sm rounded-xl',
        'hover:shadow-lg transition-shadow duration-300',
        gradientClasses[kpi.id] || 'from-slate-50/80 to-gray-50/40'
      )}>
        <CardContent className="pt-6 pb-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground/80">
                {kpi.label}
              </p>
              <p className="text-3xl font-bold tracking-tight text-slate-900">
                <AnimatedNumber value={kpi.value} format={kpi.format} />
              </p>
              <div className="pt-1">
                <EnhancedTrendBadge trend={kpi.trend} />
              </div>
            </div>
            <div className={cn(
              'rounded-xl p-3 shadow-sm',
              iconBgClasses[kpi.id] || 'bg-slate-100'
            )}>
              <Icon className={cn('h-6 w-6', kpi.iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function EnhancedKPICard({ kpi, userRole }: EnhancedKPICardProps) {
  const searchParams = useSearchParams();
  const campusId = searchParams.get('campus');

  // Build URL with campus filter preserved
  const buildUrl = (basePath: string) => {
    if (!campusId) return basePath;
    const separator = basePath.includes('?') ? '&' : '?';
    return `${basePath}${separator}campus=${campusId}`;
  };

  // Special handling for recidivism card
  if (kpi.id === 'recidivism') {
    const canAccessRecidivism = userRole && RECIDIVISM_ALLOWED_ROLES.includes(userRole);

    return (
      <RecidivismPopover canAccess={canAccessRecidivism || false}>
        <KPICardContent kpi={kpi} />
      </RecidivismPopover>
    );
  }

  // All other cards use direct navigation
  return (
    <Link href={buildUrl(kpi.href)}>
      <KPICardContent kpi={kpi} />
    </Link>
  );
}
