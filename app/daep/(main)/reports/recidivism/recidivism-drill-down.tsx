'use client';

/**
 * Recidivism Drill-Down Client Component
 * Story 6-2: Clickable KPIs & Drill-Down
 *
 * Renders the full recidivism breakdown with animations.
 */

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Download,
  ExternalLink,
  Users,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DrillDownHeader } from '../../dashboard-preview/components/drill-down-header';
import type {
  RecidivismBreakdown,
  CampusOption,
} from '@/app/actions/daep/dashboard';

interface RecidivismDrillDownProps {
  data: RecidivismBreakdown;
  campuses: CampusOption[];
  campusId?: string;
}

// Animation variants
const cardEntrance = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const listItemEntrance = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
};

export function RecidivismDrillDown({
  data,
  campuses,
  campusId,
}: RecidivismDrillDownProps) {
  const [exporting, setExporting] = useState(false);

  // Export to CSV (dynamic import)
  const handleExport = async () => {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');

      const exportData = data.returningStudents.map((student) => ({
        'Student Name': `${student.firstName} ${student.lastName}`,
        'Student ID': student.schoolId,
        'Original Offense': student.originalOffenseCode || student.originalOffense,
        '1st Placement Days': student.firstPlacementDisplay,
        'Return Offense': student.returnOffenseCode || student.returnOffense,
        'Days Between': student.daysBetween,
        'Total Placements': student.placementCount,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Returning Students');
      XLSX.writeFile(wb, `recidivism-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <DrillDownHeader
        title="Recidivism Rate"
        subtitle={`${data.rate}% (${data.returningCount} of ${data.totalCompleted} students returned)`}
        icon={<RefreshCw className="h-5 w-5 text-purple-600" />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/daep/dashboard-preview' },
          { label: 'Recidivism Rate' },
        ]}
        campuses={campuses}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || data.returningStudents.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
        }
      />

      {/* Summary Stats */}
      <motion.div
        variants={cardEntrance}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
        className="grid gap-4 grid-cols-1 sm:grid-cols-3"
      >
        <Card className="bg-gradient-to-br from-purple-50/80 to-violet-50/40 border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <RefreshCw className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Recidivism Rate</p>
                <p className="text-2xl font-bold text-purple-900">{data.rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/80 to-orange-50/40 border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-600 font-medium">Returning Students</p>
                <p className="text-2xl font-bold text-amber-900">{data.returningCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Students</p>
                <p className="text-2xl font-bold text-blue-900">{data.totalCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Breakdown Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* By Offense */}
        <motion.div
          variants={cardEntrance}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-slate-500" />
                By Original Offense
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.byOffense.length > 0 ? (
                <div className="space-y-3">
                  {data.byOffense.map((item, index) => (
                    <motion.div
                      key={item.offenseCode}
                      variants={listItemEntrance}
                      initial="initial"
                      animate="animate"
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 font-medium">
                          {item.offenseCode}
                        </span>
                        <span className="text-slate-500">
                          {item.percentage}% ({item.count})
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ delay: 0.4 + index * 0.05, duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No offense data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Time to Return */}
        <motion.div
          variants={cardEntrance}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.25 }}
        >
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                Time to Return
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.timeToReturn.some((t) => t.count > 0) ? (
                <div className="space-y-3">
                  {data.timeToReturn.map((item, index) => (
                    <motion.div
                      key={item.range}
                      variants={listItemEntrance}
                      initial="initial"
                      animate="animate"
                      transition={{ delay: 0.35 + index * 0.05 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 font-medium">
                          {item.range}
                        </span>
                        <span className="text-slate-500">
                          {item.percentage}% ({item.count})
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ delay: 0.45 + index * 0.05, duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No return data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Returning Students Table */}
      <motion.div
        variants={cardEntrance}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.35 }}
      >
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              Returning Students
              {data.returningStudents.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {data.returningStudents.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.returningStudents.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Original Offense</TableHead>
                      <TableHead className="text-center">1st Placement Days</TableHead>
                      <TableHead>Return Offense</TableHead>
                      <TableHead className="text-center">Times</TableHead>
                      <TableHead className="text-center">Days Between</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.returningStudents.map((student, index) => (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + index * 0.03 }}
                        className="group"
                      >
                        <TableCell>
                          <Link
                            href={`/daep/students/${student.schoolId}`}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            {student.firstName} {student.lastName.charAt(0)}.
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-600 font-mono text-sm">
                          {student.originalOffenseCode || student.originalOffense}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              student.firstRequiresReview
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            )}
                          >
                            {student.firstPlacementDisplay}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 font-mono text-sm">
                          {student.returnOffenseCode || student.returnOffense}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={student.placementCount > 2 ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {student.placementCount}x
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={cn(
                              'font-medium',
                              student.daysBetween < 30
                                ? 'text-red-600'
                                : student.daysBetween < 90
                                  ? 'text-amber-600'
                                  : 'text-slate-600'
                            )}
                          >
                            {student.daysBetween}
                          </span>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="font-medium">No Repeat Placements</p>
                <p className="text-sm mt-1">
                  No students have returned for additional placements.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-muted-foreground text-center py-4 border-t"
      >
        Data includes all completed and active placements
      </motion.div>
    </div>
  );
}
