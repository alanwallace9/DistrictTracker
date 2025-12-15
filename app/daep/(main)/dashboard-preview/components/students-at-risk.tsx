'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, TrendingDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AtRiskStudent {
  id: string;
  name: string;
  initials: string;
  attendanceRate: number;
  daysRemaining: number;
  trend: 'improving' | 'declining' | 'stable';
}

// Test data - some at-risk students
const testStudents: AtRiskStudent[] = [
  {
    id: '1',
    name: 'Alex Thompson',
    initials: 'AT',
    attendanceRate: 72,
    daysRemaining: 15,
    trend: 'declining',
  },
  {
    id: '2',
    name: 'Jordan Lee',
    initials: 'JL',
    attendanceRate: 68,
    daysRemaining: 22,
    trend: 'stable',
  },
  {
    id: '3',
    name: 'Casey Martinez',
    initials: 'CM',
    attendanceRate: 75,
    daysRemaining: 8,
    trend: 'improving',
  },
];

interface StudentsAtRiskProps {
  students?: AtRiskStudent[];
}

export function StudentsAtRisk({ students = testStudents }: StudentsAtRiskProps) {
  const hasRiskStudents = students.length > 0;

  return (
    <Card className="shadow-sm border-slate-200/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
          <AlertTriangle className={cn('h-4 w-4', hasRiskStudents ? 'text-amber-500' : 'text-slate-400')} />
          Students At Risk
          {hasRiskStudents && (
            <Badge variant="secondary" className="ml-1 text-xs bg-amber-100 text-amber-700">
              {students.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {!hasRiskStudents ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <div className="bg-emerald-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">No students at risk</p>
              <p className="text-xs text-slate-400 mt-1">
                All students meeting attendance thresholds
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {students.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    'hover:shadow-sm transition-all cursor-pointer',
                    student.attendanceRate < 70
                      ? 'bg-red-50/50 border-red-100'
                      : 'bg-amber-50/50 border-amber-100'
                  )}
                >
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                    {student.initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {student.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        'text-xs font-medium',
                        student.attendanceRate < 70 ? 'text-red-600' : 'text-amber-600'
                      )}>
                        {student.attendanceRate}% attendance
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {student.daysRemaining} days left
                      </span>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                    student.trend === 'improving' && 'bg-emerald-100 text-emerald-700',
                    student.trend === 'declining' && 'bg-red-100 text-red-700',
                    student.trend === 'stable' && 'bg-slate-100 text-slate-600'
                  )}>
                    {student.trend === 'declining' && <TrendingDown className="h-3 w-3" />}
                    {student.trend === 'improving' && <TrendingDown className="h-3 w-3 rotate-180" />}
                    <span className="capitalize">{student.trend}</span>
                  </div>
                </motion.div>
              ))}

              <Link href="/daep/students?filter=at-risk">
                <Button variant="ghost" size="sm" className="w-full mt-2 text-slate-500 hover:text-slate-700">
                  View all at-risk students
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
