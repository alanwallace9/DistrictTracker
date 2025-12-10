'use client';

/**
 * Inline Student Panel Component
 *
 * Story 4-1: Quick Behavior Note Entry
 *
 * Expandable inline panel that appears below a student row in the roster.
 * Contains:
 * - Entry form (points, student action, teacher action, notes)
 * - Recent activity list (last 5 items)
 * - "View All" link to student profile
 */

import { useState, useCallback, useEffect, useTransition } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CompactActivityItem, CompactActivityEmpty } from './CompactActivityItem';
import { CategorySelect } from './CategorySelect';
import { PointsSelect } from './PointsSelect';
import { createBehaviorNote, getRecentActivityForPlacement } from '@/app/actions/daep/behavior-notes';
import type { RecentActivityItem } from '@/lib/validation/schemas';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';
import Link from 'next/link';

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

  // Form state
  const [points, setPoints] = useState<number>(0);
  const [studentAction, setStudentAction] = useState<string>('');
  const [teacherAction, setTeacherAction] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Recent activity state
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  // Categories are filtered by CategorySelect component based on variant

  // Get today's date in YYYY-MM-DD format
  const today = currentDate || new Date().toISOString().split('T')[0];

  // Fetch recent activity on mount
  useEffect(() => {
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
  }, [placementId]);

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

          // Refresh recent activity
          const activity = await getRecentActivityForPlacement(placementId, 5);
          setRecentActivity(activity);
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

        {/* Right: Recent Activity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Activity</h4>
            <Link
              href={`/daep/students/${schoolId}?tab=activity`}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View All
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="border rounded-md bg-background">
            {isLoadingActivity ? (
              <div className="py-4 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : recentActivity.length === 0 ? (
              <CompactActivityEmpty />
            ) : (
              <div className="divide-y">
                {recentActivity.map((item) => (
                  <CompactActivityItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
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
