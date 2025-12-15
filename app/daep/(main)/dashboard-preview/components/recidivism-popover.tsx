'use client';

/**
 * Recidivism Popover Component
 * Story 6-2: Clickable KPIs & Drill-Down
 *
 * Shows recidivism breakdown in a popover when clicking the KPI card.
 * Includes offense distribution, time to return, and link to full report.
 * Only visible to L1+ Admin roles.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getRecidivismBreakdown,
  RecidivismBreakdown,
} from '@/app/actions/daep/dashboard';

interface RecidivismPopoverProps {
  children: React.ReactNode;
  canAccess: boolean;
  className?: string;
}

export function RecidivismPopover({
  children,
  canAccess,
  className,
}: RecidivismPopoverProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<RecidivismBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const campusId = searchParams.get('campus') || undefined;

  // Fetch data when popover opens
  useEffect(() => {
    if (open && canAccess && !data) {
      setLoading(true);
      getRecidivismBreakdown(campusId)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, canAccess, campusId, data]);

  // Reset data when campus changes
  useEffect(() => {
    setData(null);
  }, [campusId]);

  // If user can't access, just render children without popover
  if (!canAccess) {
    return <div className={cn('cursor-default', className)}>{children}</div>;
  }

  const reportUrl = campusId
    ? `/daep/reports/recidivism?campus=${campusId}`
    : '/daep/reports/recidivism';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn('cursor-pointer', className)}>{children}</div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 shadow-lg border-slate-200"
        align="start"
        sideOffset={8}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12"
            >
              <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            </motion.div>
          ) : data ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-b border-purple-100">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold text-purple-900">
                    Recidivism Rate
                  </span>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {data.rate}%
                  <span className="text-sm font-normal text-purple-600 ml-2">
                    ({data.returningCount} of {data.totalCompleted} returned)
                  </span>
                </p>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* By Offense */}
                {data.byOffense.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      By Original Offense
                    </h4>
                    <div className="space-y-1.5">
                      {data.byOffense.map((item) => (
                        <div
                          key={item.offenseCode}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-700 truncate flex-1">
                            {item.offense}
                          </span>
                          <span className="text-slate-500 ml-2">
                            {item.percentage}% ({item.count})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.byOffense.length > 0 && data.timeToReturn.some(t => t.count > 0) && (
                  <Separator />
                )}

                {/* Time to Return */}
                {data.timeToReturn.some(t => t.count > 0) && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Time to Return
                    </h4>
                    <div className="space-y-1.5">
                      {data.timeToReturn
                        .filter((item) => item.count > 0)
                        .map((item) => (
                          <div
                            key={item.range}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-700">{item.range}</span>
                            <span className="text-slate-500">
                              {item.percentage}% ({item.count})
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {data.returningCount === 0 && (
                  <div className="text-center py-4 text-slate-500">
                    <p className="text-sm">No repeat placements recorded</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <Link href={reportUrl} onClick={() => setOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-purple-700 hover:text-purple-800 hover:bg-purple-50"
                  >
                    View Full Report
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              <p className="text-sm">Unable to load data</p>
            </div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
