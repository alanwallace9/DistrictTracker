'use client';

/**
 * Student Activity Timeline Component
 *
 * Story 4-D: Condensed Activity Timeline
 *
 * Replaces the card-based StudentPointsLog with a condensed single-line format.
 * Features:
 * - Filter tabs: All | Points | Attendance | Behavior
 * - Grouped by date with date headers
 * - Condensed single-line format matching roster inline panel
 * - Edit capability for points (original creator or admins)
 * - Export to CSV/PDF
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Download,
  FileText,
  Calendar,
  Pencil,
  Circle,
  ClipboardList,
} from 'lucide-react';
import { CompactActivityItem, CompactActivityEmpty } from './roster/CompactActivityItem';
import { ExportActivityModal } from './ExportActivityModal';
import { getRecentActivityForPlacement } from '@/app/actions/daep/behavior-notes';
import type { RecentActivityItem } from '@/lib/validation/schemas';

// ========== TYPES ==========

interface Placement {
  id: string;
  incident_number: string | null;
  start_date: string;
  expected_end_date: string | null;
  status: string;
}

interface StudentActivityTimelineProps {
  placements: Placement[];
  studentName: string;
  schoolId: string;
  homeCampus?: string;
  currentUserId?: string;
  userRole?: string;
}

type ActivityFilter = 'all' | 'points' | 'attendance' | 'behavior';
type DateRangeFilter = 'last30' | 'all' | 'placement';

// ========== FILTER TABS ==========

const FILTER_TABS: { id: ActivityFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { id: 'points', label: 'Points', icon: <Pencil className="w-3.5 h-3.5" /> },
  { id: 'attendance', label: 'Attendance', icon: <Circle className="w-3.5 h-3.5" /> },
  { id: 'behavior', label: 'Behavior', icon: <FileText className="w-3.5 h-3.5" /> },
];

// ========== HELPERS ==========

function formatDateHeader(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString + 'T00:00:00'), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

// Group activities by date
function groupByDate(items: RecentActivityItem[]): Map<string, RecentActivityItem[]> {
  const grouped = new Map<string, RecentActivityItem[]>();

  items.forEach((item) => {
    // Extract date from timestamp (YYYY-MM-DD)
    const date = item.timestamp.split('T')[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(item);
  });

  return grouped;
}

// Filter activities by type
function filterByType(items: RecentActivityItem[], filter: ActivityFilter): RecentActivityItem[] {
  if (filter === 'all') return items;

  return items.filter((item) => {
    switch (filter) {
      case 'points':
        return item.type === 'point_entry';
      case 'attendance':
        return item.type === 'attendance';
      case 'behavior':
        return item.type === 'behavior_note';
      default:
        return true;
    }
  });
}

// ========== MAIN COMPONENT ==========

export function StudentActivityTimeline({
  placements,
  studentName,
  schoolId,
  homeCampus,
  currentUserId,
  userRole,
}: StudentActivityTimelineProps) {
  const { toast } = useToast();

  // State
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>(
    placements[0]?.id || ''
  );
  const [dateRange, setDateRange] = useState<DateRangeFilter>('last30');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [entries, setEntries] = useState<RecentActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Get selected placement
  const selectedPlacement = placements.find((p) => p.id === selectedPlacementId);

  // Fetch activity data
  const fetchActivity = useCallback(async () => {
    if (!selectedPlacementId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch more items for the timeline view (up to 100)
      const data = await getRecentActivityForPlacement(selectedPlacementId, 100);
      setEntries(data);
    } catch (error) {
      console.error('Error fetching activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity timeline',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlacementId, toast]);

  // Fetch activity when placement changes
  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Filter entries by type
  const filteredEntries = useMemo(() => {
    return filterByType(entries, activityFilter);
  }, [entries, activityFilter]);

  // Group filtered entries by date
  const groupedEntries = useMemo(() => {
    return groupByDate(filteredEntries);
  }, [filteredEntries]);

  // Get sorted date keys
  const sortedDates = useMemo(() => {
    return Array.from(groupedEntries.keys()).sort((a, b) => b.localeCompare(a));
  }, [groupedEntries]);

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
      {/* Filters Row */}
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

        {/* Export button - opens WYSIWYG preview modal */}
        <Button
          variant="outline"
          size="sm"
          disabled={filteredEntries.length === 0}
          onClick={() => setExportModalOpen(true)}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>

        {/* Entry count */}
        {!isLoading && (
          <span className="text-sm text-muted-foreground ml-auto">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivityFilter(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              activityFilter === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2 border rounded-lg p-2 bg-background">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 px-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredEntries.length === 0 && (
        <CompactActivityEmpty />
      )}

      {/* Timeline grouped by date */}
      {!isLoading && filteredEntries.length > 0 && (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-1">
              {/* Date header */}
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">
                {formatDateHeader(date)}
              </div>

              {/* Activities for this date */}
              <div className="divide-y border rounded-lg bg-background">
                {groupedEntries.get(date)!.map((item) => (
                  <CompactActivityItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export Modal - Story 4-E: WYSIWYG preview */}
      <ExportActivityModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        student={{
          name: studentName,
          schoolId: schoolId,
          homeCampus: homeCampus,
        }}
        placement={selectedPlacement ? {
          incidentNumber: selectedPlacement.incident_number,
          status: selectedPlacement.status,
        } : undefined}
        activities={filteredEntries}
        filterType={FILTER_TABS.find(t => t.id === activityFilter)?.label || 'All'}
      />
    </div>
  );
}
