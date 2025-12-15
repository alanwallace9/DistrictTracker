'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, CheckCircle2, Calendar, UserCheck, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface PipelineStage {
  id: string;
  label: string;
  value: number;
  icon: typeof CheckCircle2;
  color: string;
  bgColor: string;
}

const stages: PipelineStage[] = [
  {
    id: 'approved',
    label: 'Approved',
    value: 12,
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    value: 8,
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'arrived',
    label: 'Arrived',
    value: 3,
    icon: UserCheck,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
  {
    id: 'no-show',
    label: 'No-Show',
    value: 2,
    icon: UserX,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
];

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 1000;
      const steps = 30;
      const increment = value / steps;
      let current = 0;

      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return <span>{displayValue}</span>;
}

export function IntakePipeline() {
  return (
    <Card className="shadow-sm border-slate-200/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
          <GitBranch className="h-4 w-4" />
          Intake Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100',
                  'hover:shadow-md transition-all duration-200 cursor-pointer',
                  stage.bgColor
                )}
              >
                <div className="text-3xl font-bold text-slate-800">
                  <AnimatedNumber value={stage.value} delay={200 + index * 100} />
                </div>
                <div className={cn('text-xs font-medium mt-1', stage.color)}>
                  {stage.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
