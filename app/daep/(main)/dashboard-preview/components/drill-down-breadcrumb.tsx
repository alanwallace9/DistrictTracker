'use client';

/**
 * Drill-Down Breadcrumb Component
 * Story 6-2: Clickable KPIs & Drill-Down
 *
 * Navigation breadcrumb for drill-down pages.
 * Example: Dashboard > Recidivism Rate
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DrillDownBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function DrillDownBreadcrumb({ items, className }: DrillDownBreadcrumbProps) {
  return (
    <nav className={cn('flex items-center text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.label} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast ? 'text-slate-900 font-medium' : 'text-slate-500')}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
