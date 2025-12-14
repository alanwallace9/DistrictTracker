'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IntakeCard } from './intake-card';
import type { TodayIntake } from '@/app/actions/daep/dashboard';
import { listVariants } from '@/lib/constants/animations';
import { Calendar, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface TodayIntakesProps {
  initialIntakes: TodayIntake[];
}

export function TodayIntakes({ initialIntakes }: TodayIntakesProps) {
  const [intakes, setIntakes] = useState<TodayIntake[]>(initialIntakes);

  const handleStatusChange = () => {
    // In a full implementation, we'd refetch the data
    // For now, we'll just trigger a page refresh to get updated data
    window.location.reload();
  };

  const scheduledIntakes = intakes.filter((i) => i.status === 'scheduled');
  const otherIntakes = intakes.filter((i) => i.status !== 'scheduled');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Today&apos;s Intakes
          {intakes.length > 0 && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              ({intakes.length})
            </span>
          )}
        </CardTitle>
        <Link href="/daep/students/new">
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            New Intake
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {intakes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No intakes scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledIntakes.length > 0 && (
              <motion.div
                variants={listVariants}
                initial="initial"
                animate="animate"
                className="space-y-2"
              >
                <AnimatePresence mode="popLayout">
                  {scheduledIntakes.map((intake) => (
                    <IntakeCard
                      key={intake.id}
                      intake={intake}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {otherIntakes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Processed
                </p>
                {otherIntakes.map((intake) => (
                  <IntakeCard
                    key={intake.id}
                    intake={intake}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
