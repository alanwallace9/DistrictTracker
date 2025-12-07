'use client';

/**
 * Student Points Log Component
 *
 * Story 3-4: Point Notes/Comments
 *
 * Displays point adjustment history for a student placement.
 * Features:
 * - Date range filter (Last 30 days, All time, This placement)
 * - Color-coded adjustment badges
 * - Edit button for original creator or admins
 * - Export to CSV/PDF
 */

import { useState, useEffect, useTransition, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Clock,
  User,
  Pencil,
  Download,
  FileText,
  FileSpreadsheet,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import {
  getStudentPointHistory,
  type PointHistoryEntry,
} from '@/app/actions/daep/points';
import { PointAdjustmentDialog } from '@/components/daep/roster/PointAdjustmentDialog';
import { getActiveBehaviorCategories, type BehaviorCategory } from '@/app/actions/daep/behavior-categories';

interface Placement {
  id: string;
  incident_number: string | null;
  start_date: string;
  expected_end_date: string | null;
  status: string;
}

interface StudentPointsLogProps {
  placements: Placement[];
  studentName: string;
  currentUserId?: string;
  userRole?: string;
}

type DateRangeFilter = 'last30' | 'all' | 'placement';

// Format adjustment for display
function formatAdjustment(value: number): string {
  if (value > 0) return `+${value}`;
  if (value === 0) return '0';
  return String(value);
}

// Get color classes for adjustment
function getAdjustmentStyles(value: number): { badge: string; card: string } {
  if (value > 0)
    return {
      badge: 'bg-emerald-500 text-white',
      card: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30',
    };
  if (value < 0)
    return {
      badge: 'bg-red-500 text-white',
      card: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
    };
  return {
    badge: 'bg-gray-500 text-white',
    card: 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/30',
  };
}

// Format time from ISO string
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

// Format date for display
function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString + 'T00:00:00'), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

export function StudentPointsLog({
  placements,
  studentName,
  currentUserId,
  userRole,
}: StudentPointsLogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // State
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>(
    placements[0]?.id || ''
  );
  const [dateRange, setDateRange] = useState<DateRangeFilter>('last30');
  const [entries, setEntries] = useState<PointHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [behaviorCategories, setBehaviorCategories] = useState<BehaviorCategory[]>([]);

  // Edit dialog state
  const [editEntry, setEditEntry] = useState<PointHistoryEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Get selected placement
  const selectedPlacement = placements.find((p) => p.id === selectedPlacementId);

  // Check if user can edit an entry
  const canEdit = useCallback(
    (entry: PointHistoryEntry) => {
      const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
      if (userRole && adminRoles.includes(userRole)) return true;
      if (currentUserId && entry.entered_by === currentUserId) return true;
      return false;
    },
    [currentUserId, userRole]
  );

  // Calculate date range options
  const getDateOptions = useCallback(() => {
    const today = new Date();
    const options: { startDate?: string; endDate?: string } = {};

    switch (dateRange) {
      case 'last30':
        options.startDate = format(subDays(today, 30), 'yyyy-MM-dd');
        break;
      case 'placement':
        if (selectedPlacement) {
          options.startDate = selectedPlacement.start_date;
          if (selectedPlacement.expected_end_date) {
            options.endDate = selectedPlacement.expected_end_date;
          }
        }
        break;
      case 'all':
      default:
        // No date filter
        break;
    }

    return options;
  }, [dateRange, selectedPlacement]);

  // Fetch point history
  const fetchHistory = useCallback(async () => {
    if (!selectedPlacementId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const options = getDateOptions();
      const data = await getStudentPointHistory(selectedPlacementId, options);
      setEntries(data);
    } catch (error) {
      console.error('Error fetching point history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load point history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlacementId, getDateOptions, toast]);

  // Fetch behavior categories for edit dialog
  useEffect(() => {
    async function loadCategories() {
      try {
        const categories = await getActiveBehaviorCategories();
        setBehaviorCategories(categories);
      } catch (error) {
        console.error('Error loading behavior categories:', error);
      }
    }
    loadCategories();
  }, []);

  // Fetch history when placement or date range changes
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle edit click
  const handleEditClick = (entry: PointHistoryEntry) => {
    setEditEntry(entry);
    setEditDialogOpen(true);
  };

  // Handle edit success
  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setEditEntry(null);
    fetchHistory(); // Refresh data
  };

  // Export to CSV
  const exportToCSV = () => {
    if (entries.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    const headers = [
      'Date',
      'Period',
      'Adjustment',
      'Student Action',
      'Teacher Action',
      'Notes',
      'Entered By',
      'Time',
    ];
    const rows = entries.map((e) => [
      formatDate(e.date),
      e.period,
      formatAdjustment(e.points_earned),
      e.student_action || '',
      e.teacher_action || '',
      e.notes || '',
      e.entered_by_name,
      formatTime(e.created_at),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${studentName.replace(/\s+/g, '_')}_points_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: 'CSV exported successfully' });
  };

  // Export to PDF (simple implementation)
  const exportToPDF = async () => {
    if (entries.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    // Dynamic import to avoid bundle size issues
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.text(`Point History: ${studentName}`, 14, 20);

    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 28);
    if (selectedPlacement) {
      doc.text(
        `Placement: ${selectedPlacement.incident_number || 'N/A'} (${selectedPlacement.status})`,
        14,
        34
      );
    }

    // Table headers
    let y = 45;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', 14, y);
    doc.text('Period', 40, y);
    doc.text('Adj', 65, y);
    doc.text('Student Action', 80, y);
    doc.text('Notes', 130, y);

    // Table rows
    doc.setFont('helvetica', 'normal');
    y += 7;

    entries.forEach((entry) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.text(formatDate(entry.date), 14, y);
      doc.text(entry.period || '', 40, y);
      doc.text(formatAdjustment(entry.points_earned), 65, y);
      doc.text((entry.student_action || '').substring(0, 25), 80, y);
      doc.text((entry.notes || '').substring(0, 40), 130, y);

      y += 6;
    });

    doc.save(
      `${studentName.replace(/\s+/g, '_')}_points_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    );

    toast({ title: 'PDF exported successfully' });
  };

  // Empty placements state
  if (placements.length === 0) {
    return (
      <div className="p-6 border rounded-lg bg-card text-center text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No placements found for this student.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Export */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Placement selector */}
        {placements.length > 1 && (
          <Select value={selectedPlacementId} onValueChange={setSelectedPlacementId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select placement..." />
            </SelectTrigger>
            <SelectContent>
              {placements.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  #{p.incident_number || 'N/A'} - {formatDate(p.start_date)} ({p.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date range filter */}
        <Select
          value={dateRange}
          onValueChange={(v) => setDateRange(v as DateRangeFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last30">Last 30 days</SelectItem>
            <SelectItem value="placement">This placement</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={entries.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportToCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Entry count */}
        {!isLoading && (
          <span className="text-sm text-muted-foreground ml-auto">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-6 w-12" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <div className="p-8 border rounded-lg bg-card text-center text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No point adjustments recorded for this placement.</p>
          <p className="text-sm mt-1">
            Adjustments made from the room roster will appear here.
          </p>
        </div>
      )}

      {/* Entries list */}
      {!isLoading && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => {
            const styles = getAdjustmentStyles(entry.points_earned);
            return (
              <Card key={entry.id} className={cn('transition-colors', styles.card)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Adjustment badge */}
                    <Badge className={cn('text-sm font-semibold shrink-0', styles.badge)}>
                      {formatAdjustment(entry.points_earned)}
                    </Badge>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header: Date, Period, Student Action */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{formatDate(entry.date)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{entry.period}</span>
                        {entry.student_action && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span
                              className={cn(
                                entry.points_earned > 0 && 'text-emerald-600 dark:text-emerald-400',
                                entry.points_earned < 0 && 'text-red-600 dark:text-red-400'
                              )}
                            >
                              {entry.student_action}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Notes */}
                      {entry.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">{entry.notes}</p>
                      )}

                      {/* Footer: Teacher action, entered by, time */}
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        {entry.teacher_action && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.teacher_action}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {entry.entered_by_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(entry.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Edit button */}
                    {canEdit(entry) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-8 w-8 p-0"
                        onClick={() => handleEditClick(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      {editEntry && (
        <PointAdjustmentDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          placementId={editEntry.placement_id}
          date={editEntry.date}
          period={editEntry.period}
          studentName={studentName}
          behaviorCategories={behaviorCategories}
          existingAdjustments={[]}
          currentUserId={currentUserId}
          onSuccess={handleEditSuccess}
          editMode={{
            entryId: editEntry.id,
            initialValues: {
              adjustment_value: editEntry.points_earned,
              student_action: editEntry.student_action,
              teacher_action: editEntry.teacher_action,
              notes: editEntry.notes,
            },
          }}
        />
      )}
    </div>
  );
}
