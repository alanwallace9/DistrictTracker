'use client';

/**
 * Inline Student Panel Component
 *
 * Story 4-1: Quick Behavior Note Entry
 * Story 4-B: Tabbed Activity Panel
 *
 * Expandable inline panel that appears below a student row in the roster.
 * Contains:
 * - Manila folder tabs: Activity | Attendance | Behavior
 * - Left: Entry form (points, student action, teacher action, notes)
 * - Right: Tab-specific content (changes based on active tab)
 */

import { useState, useCallback, useEffect, useTransition } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, ClipboardList, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ManilaFolderTabs, ManilaFolderTabPanel } from '@/components/ui/manila-folder-tabs';
import { CompactActivityItem, CompactActivityEmpty } from './CompactActivityItem';
import { CategorySelect } from './CategorySelect';
import { PointsSelect } from './PointsSelect';
import { createBehaviorNote, getRecentActivityForPlacement, getNotesForPlacement } from '@/app/actions/daep/behavior-notes';
import { getDailyAttendanceSummary, type DailyAttendanceSummary } from '@/app/actions/daep/attendance';
import type { RecentActivityItem, BehaviorNoteListItem } from '@/lib/validation/schemas';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';
import Link from 'next/link';

// ========== TAB CONFIGURATION ==========

const PANEL_TABS = [
  { id: 'behavior', label: 'Behavior', icon: <FileText className="w-4 h-4" /> },
  { id: 'activity', label: 'Activity', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'attendance', label: 'Attendance', icon: <Calendar className="w-4 h-4" /> },
];

// ========== PROPS ==========

export interface InlineStudentPanelProps {
  placementId: string;
  studentName: string;
  schoolId: string;
  categories: BehaviorCategory[];
  currentPeriod?: string;
  currentDate?: string;
}

// ========== CHEVRON BUTTON (for table cell) ==========

interface ChevronButtonProps {
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function ChevronButton({ isExpanded, onToggle, className }: ChevronButtonProps) {
  const Icon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-7 w-7 p-0', className)}
      onClick={(e) => {
        e.stopPropagation(); // Prevent row click
        onToggle();
      }}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

// ========== HELPER COMPONENTS ==========

interface AttendanceSummaryItemProps {
  item: DailyAttendanceSummary;
}

function AttendanceSummaryItem({ item }: AttendanceSummaryItemProps) {
  const statusColors = {
    present: 'text-green-600',
    absent: 'text-red-600',
    partial: 'text-yellow-600',
    excused: 'text-blue-600',
  };

  const date = new Date(item.date + 'T00:00:00');
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium w-12">{formatted}</span>
        <span className={cn('flex-1', statusColors[item.status])}>{item.summary}</span>
      </div>
      <span className="text-muted-foreground">{item.percentage}%</span>
    </div>
  );
}

interface BehaviorNoteItemProps {
  note: BehaviorNoteListItem;
}

function BehaviorNoteItem({ note }: BehaviorNoteItemProps) {
  const date = new Date(note.incident_date + 'T00:00:00');
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const typeColors = {
    positive: 'bg-green-100 text-green-700',
    negative: 'bg-red-100 text-red-700',
    neutral: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="flex items-start justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors text-xs gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        {note.category && (
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
              note.category_type ? typeColors[note.category_type as keyof typeof typeColors] : 'bg-gray-100 text-gray-700'
            )}
          >
            {note.category}
          </span>
        )}
        {note.description && (
          <span className="truncate text-foreground">{note.description}</span>
        )}
      </div>
      <span className="text-muted-foreground whitespace-nowrap flex-shrink-0">
        {formatted} ({note.staff_last_name})
      </span>
    </div>
  );
}

// ========== MAIN COMPONENT ==========

export function InlineStudentPanel({
  placementId,
  studentName,
  schoolId,
  categories,
  currentPeriod = 'Period 1',
  currentDate,
}: InlineStudentPanelProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Tab state - default to Behavior (teachers care about this most)
  const [activeTab, setActiveTab] = useState('behavior');

  // Form state
  const [points, setPoints] = useState<number>(0);
  const [studentAction, setStudentAction] = useState<string>('');
  const [teacherAction, setTeacherAction] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Data state for each tab
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<DailyAttendanceSummary[]>([]);
  const [behaviorNotes, setBehaviorNotes] = useState<BehaviorNoteListItem[]>([]);

  // Loading states
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isLoadingBehavior, setIsLoadingBehavior] = useState(true); // Start loading behavior (default tab)

  // Get today's date in YYYY-MM-DD format
  const today = currentDate || new Date().toISOString().split('T')[0];

  // Fetch behavior notes on mount (default tab)
  useEffect(() => {
    async function fetchBehavior() {
      setIsLoadingBehavior(true);
      try {
        const notes = await getNotesForPlacement(placementId);
        setBehaviorNotes(notes.slice(0, 5)); // Limit to 5 for inline panel
      } catch (error) {
        console.error('Error fetching behavior notes:', error);
      } finally {
        setIsLoadingBehavior(false);
      }
    }
    fetchBehavior();
  }, [placementId]);

  // Fetch activity only when Activity tab is selected
  useEffect(() => {
    if (activeTab !== 'activity' || recentActivity.length > 0) return;

    async function fetchActivity() {
      setIsLoadingActivity(true);
      try {
        const activity = await getRecentActivityForPlacement(placementId, 5);
        setRecentActivity(activity);
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setIsLoadingActivity(false);
      }
    }
    fetchActivity();
  }, [activeTab, placementId, recentActivity.length]);

  // Fetch attendance only when Attendance tab is selected
  useEffect(() => {
    if (activeTab !== 'attendance' || attendanceSummary.length > 0) return;

    async function fetchAttendance() {
      setIsLoadingAttendance(true);
      try {
        const summary = await getDailyAttendanceSummary(placementId, 5);
        setAttendanceSummary(summary);
      } catch (error) {
        console.error('Error fetching attendance summary:', error);
      } finally {
        setIsLoadingAttendance(false);
      }
    }
    fetchAttendance();
  }, [activeTab, placementId, attendanceSummary.length]);

  // Handle save
  const handleSave = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await createBehaviorNote({
          placement_id: placementId,
          incident_date: today,
          points: points !== 0 ? points : undefined,
          period: currentPeriod,
          student_action: studentAction || undefined,
          teacher_action: teacherAction || undefined,
          notes: notes || undefined,
          description: notes || undefined,
        });

        if (result.success) {
          toast({
            title: 'Entry saved',
            description: `${points !== 0 ? `${points > 0 ? '+' : ''}${points} points` : 'Note'} added for ${studentName}`,
          });

          // Reset form
          setPoints(0);
          setStudentAction('');
          setTeacherAction('');
          setNotes('');

          // Refresh data for all tabs
          const [activity, notes] = await Promise.all([
            getRecentActivityForPlacement(placementId, 5),
            getNotesForPlacement(placementId),
          ]);
          setRecentActivity(activity);
          setBehaviorNotes(notes.slice(0, 5));
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to save entry',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save entry',
          variant: 'destructive',
        });
      }
    });
  }, [placementId, today, currentPeriod, points, studentAction, teacherAction, notes, studentName, toast]);

  return (
    <div className="bg-muted/30 border-t border-b p-4 animate-in slide-in-from-top-2 duration-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Entry Form */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Add Entry</h4>

          {/* Points + Actions row - all fields same width as Notes */}
          <div className="flex gap-2">
            {/* Points selector */}
            <PointsSelect
              value={points}
              onValueChange={setPoints}
              placeholder="Points"
              className="flex-1"
            />

            {/* Student Action - Story 4-2: Grouped CategorySelect */}
            <CategorySelect
              categories={categories}
              value={studentAction}
              onValueChange={setStudentAction}
              placeholder="Student Action"
              variant="student"
              className="flex-1"
            />

            {/* Teacher Action - Story 4-2: Grouped CategorySelect */}
            <CategorySelect
              categories={categories}
              value={teacherAction}
              onValueChange={setTeacherAction}
              placeholder="Teacher Action"
              variant="teacher"
              className="flex-1"
            />
          </div>

          {/* Notes */}
          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-16 text-sm resize-none"
          />

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={isPending || (points === 0 && !notes.trim())}
            className="w-full"
            size="sm"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Entry'
            )}
          </Button>
        </div>

        {/* Right: Tabbed Content */}
        <div className="space-y-2">
          <ManilaFolderTabs
            tabs={PANEL_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          >
            {/* Behavior Tab (Default) */}
            <ManilaFolderTabPanel tabId="behavior" activeTab={activeTab}>
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Recent Notes</span>
                  <Link
                    href={`/daep/students/${schoolId}?tab=behavior`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View All
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {isLoadingBehavior ? (
                  <div className="py-4 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : behaviorNotes.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No behavior notes
                  </div>
                ) : (
                  <div className="divide-y border rounded-md bg-background">
                    {behaviorNotes.map((note) => (
                      <BehaviorNoteItem key={note.id} note={note} />
                    ))}
                  </div>
                )}
              </div>
            </ManilaFolderTabPanel>

            {/* Activity Tab */}
            <ManilaFolderTabPanel tabId="activity" activeTab={activeTab}>
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Recent Activity</span>
                  <Link
                    href={`/daep/students/${schoolId}?tab=activity`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View All
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {isLoadingActivity ? (
                  <div className="py-4 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : recentActivity.length === 0 ? (
                  <CompactActivityEmpty />
                ) : (
                  <div className="divide-y border rounded-md bg-background">
                    {recentActivity.map((item) => (
                      <CompactActivityItem key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </ManilaFolderTabPanel>

            {/* Attendance Tab */}
            <ManilaFolderTabPanel tabId="attendance" activeTab={activeTab}>
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Daily Summary</span>
                  <Link
                    href={`/daep/students/${schoolId}?tab=attendance`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View All
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {isLoadingAttendance ? (
                  <div className="py-4 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : attendanceSummary.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No attendance records
                  </div>
                ) : (
                  <div className="divide-y border rounded-md bg-background">
                    {attendanceSummary.map((item) => (
                      <AttendanceSummaryItem key={item.date} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </ManilaFolderTabPanel>
          </ManilaFolderTabs>
        </div>
      </div>
    </div>
  );
}

// ========== EXPANDED ROW WRAPPER ==========

/**
 * Wrapper for rendering expanded panel in table context.
 * Use this in RoomRosterTable when a row is expanded.
 */
interface ExpandedRowProps {
  colSpan: number;
  placementId: string;
  studentName: string;
  schoolId: string;
  categories: BehaviorCategory[];
  currentPeriod?: string;
  currentDate?: string;
}

export function ExpandedStudentRow({
  colSpan,
  placementId,
  studentName,
  schoolId,
  categories,
  currentPeriod,
  currentDate,
}: ExpandedRowProps) {
  return (
    <tr>
      <TableCell colSpan={colSpan} className="p-0">
        <InlineStudentPanel
          placementId={placementId}
          studentName={studentName}
          schoolId={schoolId}
          categories={categories}
          currentPeriod={currentPeriod}
          currentDate={currentDate}
        />
      </TableCell>
    </tr>
  );
}
