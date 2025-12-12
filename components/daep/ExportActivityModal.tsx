'use client';

/**
 * Export Activity Modal Component
 *
 * Story 4-E: View All Expansion + Export Modal
 *
 * WYSIWYG preview modal for exporting student activity data.
 * Features:
 * - Preview exactly what will be exported
 * - Export options: PDF, Excel (CSV), Copy Link
 * - Student info header with name, ID, campus, report date
 * - Table view of activity data
 */

import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Link2,
  ChevronDown,
  CheckCircle,
} from 'lucide-react';
import type { RecentActivityItem } from '@/lib/validation/schemas';

// ========== TYPES ==========

interface StudentInfo {
  name: string;
  schoolId: string;
  homeCampus?: string;
}

interface PlacementInfo {
  incidentNumber?: string | null;
  status: string;
  daysServed?: number;
  daysAssigned?: number;
}

interface ExportActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentInfo;
  placement?: PlacementInfo;
  activities: RecentActivityItem[];
  filterType?: string;
}

// ========== HELPERS ==========

function formatActivityType(type: string): string {
  switch (type) {
    case 'point_entry':
      return 'Points';
    case 'behavior_note':
      return 'Behavior';
    case 'attendance':
      return 'Attendance';
    default:
      return type;
  }
}

// ========== COMPONENT ==========

export function ExportActivityModal({
  open,
  onOpenChange,
  student,
  placement,
  activities,
  filterType = 'All',
}: ExportActivityModalProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const reportDate = format(new Date(), 'MMMM d, yyyy');

  // Export to CSV
  const exportToCSV = useCallback(() => {
    setIsExporting(true);

    try {
      const headers = ['Date/Time', 'Type', 'Points', 'Action', 'Summary', 'Staff'];
      const rows = activities.map((e) => [
        format(parseISO(e.timestamp), 'MMM d, yyyy h:mm a'),
        formatActivityType(e.type),
        e.points !== undefined ? String(e.points) : '',
        e.student_action || '',
        e.summary,
        e.staff_name,
      ]);

      const csvContent = [
        // Header info
        `Student Activity Report`,
        `Student: ${student.name} (${student.schoolId})`,
        `Campus: ${student.homeCampus || 'N/A'}`,
        `Report Date: ${reportDate}`,
        placement ? `Placement: #${placement.incidentNumber || 'N/A'} (${placement.status})` : '',
        '',
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${student.name.replace(/\s+/g, '_')}_activity_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Excel (CSV) exported successfully' });
    } finally {
      setIsExporting(false);
    }
  }, [activities, student, placement, reportDate, toast]);

  // Export to PDF
  const exportToPDF = useCallback(async () => {
    setIsExporting(true);

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.text('STUDENT ACTIVITY REPORT', 14, 20);

      doc.setFontSize(11);
      doc.text(`Student: ${student.name} (${student.schoolId})`, 14, 32);
      doc.text(`Home Campus: ${student.homeCampus || 'N/A'}`, 14, 39);
      doc.text(`Report Date: ${reportDate}`, 14, 46);

      if (placement) {
        doc.text(
          `Placement: #${placement.incidentNumber || 'N/A'} | ${placement.daysServed || 0}/${placement.daysAssigned || 0} days | ${placement.status}`,
          14,
          53
        );
      }

      // Table headers
      let y = 65;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Date/Time', 14, y);
      doc.text('Type', 55, y);
      doc.text('Pts', 80, y);
      doc.text('Action', 95, y);
      doc.text('Staff', 165, y);

      // Line under headers
      doc.setLineWidth(0.5);
      doc.line(14, y + 2, 196, y + 2);

      // Table rows
      doc.setFont('helvetica', 'normal');
      y += 8;

      activities.forEach((entry) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }

        doc.text(format(parseISO(entry.timestamp), 'MMM d h:mm a'), 14, y);
        doc.text(formatActivityType(entry.type), 55, y);
        doc.text(entry.points !== undefined ? String(entry.points) : '-', 80, y);
        doc.text((entry.student_action || entry.summary).substring(0, 35), 95, y);
        doc.text(entry.staff_name.substring(0, 12), 165, y);

        y += 6;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(`Generated by DAEP Manager on ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 285);

      doc.save(`${student.name.replace(/\s+/g, '_')}_activity_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast({ title: 'PDF exported successfully' });
    } finally {
      setIsExporting(false);
    }
  }, [activities, student, placement, reportDate, toast]);

  // Copy shareable link
  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}/daep/students/${student.schoolId}?tab=activity`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Link copied to clipboard' });

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy link',
        description: 'Please copy the URL manually',
        variant: 'destructive',
      });
    }
  }, [student.schoolId, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Export Activity Report</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                disabled={copied}
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={isExporting || activities.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={exportToPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>

        {/* WYSIWYG Preview */}
        <div className="flex-1 overflow-auto border rounded-lg bg-white p-6 mt-4">
          {/* Report Header */}
          <div className="border-b pb-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-3">STUDENT ACTIVITY REPORT</h2>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <div>
                <span className="font-medium">Student:</span> {student.name} ({student.schoolId})
              </div>
              <div>
                <span className="font-medium">Home Campus:</span> {student.homeCampus || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Report Date:</span> {reportDate}
              </div>
              {placement && (
                <div>
                  <span className="font-medium">Placement:</span> #{placement.incidentNumber || 'N/A'} | {placement.daysServed || 0}/{placement.daysAssigned || 0} days | {placement.status}
                </div>
              )}
            </div>
            {filterType !== 'All' && (
              <div className="mt-2 text-sm text-gray-500">
                Filtered by: {filterType}
              </div>
            )}
          </div>

          {/* Activity Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-semibold text-gray-900">Date/Time</th>
                <th className="py-2 pr-4 font-semibold text-gray-900">Type</th>
                <th className="py-2 pr-4 font-semibold text-gray-900 text-center">Pts</th>
                <th className="py-2 pr-4 font-semibold text-gray-900">Action</th>
                <th className="py-2 font-semibold text-gray-900">Staff</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-700">
                    {format(parseISO(entry.timestamp), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="py-2 pr-4 text-gray-700">
                    {formatActivityType(entry.type)}
                  </td>
                  <td className="py-2 pr-4 text-center">
                    {entry.points !== undefined ? (
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded text-xs font-medium',
                          entry.points > 0 && 'bg-green-100 text-green-700',
                          entry.points < 0 && 'bg-red-100 text-red-700',
                          entry.points === 0 && 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {entry.points > 0 ? `+${entry.points}` : entry.points}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-700">
                    {entry.student_action || entry.summary}
                  </td>
                  <td className="py-2 text-gray-700">{entry.staff_name}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {activities.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No activity to export
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t text-xs text-gray-400">
            Generated by DAEP Manager on {format(new Date(), 'MMMM d, yyyy h:mm a')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
