'use client';

/**
 * Drill-Down Header Component
 * Story 6-2: Clickable KPIs & Drill-Down
 *
 * Shared header for drill-down pages with title, subtitle, and optional actions.
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CampusFilter, Campus } from './campus-filter';
import { BackButton } from './back-button';
import { DrillDownBreadcrumb } from './drill-down-breadcrumb';

interface DrillDownHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  breadcrumbs: Array<{ label: string; href?: string }>;
  campuses?: Campus[];
  actions?: React.ReactNode;
  className?: string;
}

export function DrillDownHeader({
  title,
  subtitle,
  icon,
  breadcrumbs,
  campuses,
  actions,
  className,
}: DrillDownHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-4', className)}
    >
      {/* Top row: Back button + Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <DrillDownBreadcrumb items={breadcrumbs} />
        </div>
      </div>

      {/* Header row: Title + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {campuses && campuses.length > 1 && (
            <CampusFilter campuses={campuses} />
          )}
          {actions}
        </div>
      </div>
    </motion.div>
  );
}
