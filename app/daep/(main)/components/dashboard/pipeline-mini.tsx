'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { GitBranch, AlertTriangle } from 'lucide-react';
import type { PipelineCounts } from '@/app/actions/daep/dashboard';

interface PipelineMiniProps {
  counts: PipelineCounts;
}

interface PipelineStageProps {
  label: string;
  count: number;
  href: string;
  variant?: 'default' | 'warning';
}

function PipelineStage({ label, count, href, variant = 'default' }: PipelineStageProps) {
  return (
    <Link href={href} className="block">
      <div
        className={cn(
          'flex flex-col items-center p-3 rounded-lg border transition-colors hover:bg-accent/50',
          variant === 'warning' && count > 0 && 'border-orange-200 bg-orange-50'
        )}
      >
        <span
          className={cn(
            'text-2xl font-bold',
            variant === 'warning' && count > 0 ? 'text-orange-600' : 'text-foreground'
          )}
        >
          {count}
        </span>
        <span className="text-xs text-muted-foreground text-center">{label}</span>
        {variant === 'warning' && count > 0 && (
          <AlertTriangle className="h-3 w-3 text-orange-500 mt-1" />
        )}
      </div>
    </Link>
  );
}

export function PipelineMini({ counts }: PipelineMiniProps) {
  const total = counts.approved + counts.scheduled + counts.arrivedToday + counts.noShow;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Intake Pipeline
          {total > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {total} total
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          <PipelineStage
            label="Approved"
            count={counts.approved}
            href="/daep/students?filter=approved"
          />
          <PipelineStage
            label="Scheduled"
            count={counts.scheduled}
            href="/daep/students?filter=scheduled"
          />
          <PipelineStage
            label="Arrived"
            count={counts.arrivedToday}
            href="/daep/students?filter=arrived-today"
          />
          <PipelineStage
            label="No-Show"
            count={counts.noShow}
            href="/daep/students?filter=no-show"
            variant="warning"
          />
        </div>
      </CardContent>
    </Card>
  );
}
