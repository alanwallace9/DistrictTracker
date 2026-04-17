'use client';

import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { CalendarCheck } from 'lucide-react';
import type { StudentAttendanceRates } from '@/lib/validation/schemas';

interface Props {
  attendanceRates: StudentAttendanceRates;
  daysAssigned: number;
}

export function StudentAttendanceCard({ attendanceRates, daysAssigned }: Props) {
  const { cumulative } = attendanceRates;
  const daysPresent = cumulative.periodsPresent;
  const rate = cumulative.rate;

  const rateColor =
    cumulative.rateCategory === 'green'
      ? 'text-green-600 dark:text-green-400'
      : cumulative.rateCategory === 'yellow'
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-destructive';

  const barColor =
    cumulative.rateCategory === 'green'
      ? 'bg-green-500'
      : cumulative.rateCategory === 'yellow'
        ? 'bg-yellow-500'
        : 'bg-destructive';

  const collapsedSummary = `${daysPresent} / ${daysAssigned} days • ${rate}%`;

  return (
    <CollapsibleCard
      title="Attendance"
      icon={<CalendarCheck className="w-4 h-4" />}
      storageKey="student-attendance-summary"
      defaultOpen={true}
      collapsedSummary={collapsedSummary}
      contentClassName="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-2xl font-bold">{daysPresent}</p>
            <p className="text-xs text-muted-foreground">Days Present</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-2xl font-bold">{daysAssigned}</p>
            <p className="text-xs text-muted-foreground">Days Assigned</p>
          </div>
          <div className="bg-muted/50 rounded-md p-2">
            <p className={`text-2xl font-bold ${rateColor}`}>{rate}%</p>
            <p className="text-xs text-muted-foreground">Rate</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`${barColor} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(100, rate)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {daysPresent} of {daysAssigned} days served
          </p>
        </div>
    </CollapsibleCard>
  );
}
