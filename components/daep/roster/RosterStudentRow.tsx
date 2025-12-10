'use client';

/**
 * Roster Student Row Component
 *
 * Story 3-1: Room Roster View
 * Story 3-3: Bulk Point Entry (selection checkbox)
 * Story 4-1: Quick Behavior Note Entry (expandable panel)
 *
 * Displays a single student in the roster table.
 * Uses render props pattern for extensibility - future stories (3-2, 3-9)
 * can add columns for points entry, attendance, behavior notes.
 */

import { type ReactNode, useState, Fragment } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DaysRemainingBadge } from './DaysRemainingBadge';
import { RowSelectionCheckbox } from './SelectionCheckbox';
import { ChevronButton, ExpandedStudentRow } from './InlineStudentPanel';
import { useRoomRoster } from './RoomRosterContext';
import { cn } from '@/lib/utils';
import type { RosterStudent } from '@/app/actions/daep/roster';
import type { PlacementStatus } from '@/lib/validation/schemas';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';

// ========== RENDER PROP TYPES ==========

export interface StudentRowContext {
  student: RosterStudent;
  isSelected?: boolean;
}

export interface RosterStudentRowProps {
  student: RosterStudent;
  isSelected?: boolean;
  onSelect?: (placementId: string) => void;

  // Render props for extensibility
  // Story 3-9: Attendance cell (positioned after Status, before Rate)
  renderAttendanceCell?: (context: StudentRowContext) => ReactNode;
  // Story 3-11: Rate cell (positioned after Attendance, before Days Remaining)
  renderRateCell?: (context: StudentRowContext) => ReactNode;
  // Story 3-2: Points/Behavior columns at the end
  renderExtraCells?: (context: StudentRowContext) => ReactNode;

  // Story 4-1: Expandable panel
  showExpandButton?: boolean;
  behaviorCategories?: BehaviorCategory[];
  currentPeriod?: string;
  currentDate?: string;
  colSpan?: number;
}

// ========== STATUS BADGE ==========

function StatusBadge({ status }: { status: PlacementStatus }) {
  const variants: Record<PlacementStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    pending: { variant: 'outline', label: 'Pending' },
    active: { variant: 'default', label: 'Active' },
    met: { variant: 'secondary', label: 'Met' },
    complete: { variant: 'secondary', label: 'Complete' },
  };

  const config = variants[status] || { variant: 'outline', label: status };

  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}

// ========== COMPONENT ==========

export function RosterStudentRow({
  student,
  isSelected = false,
  onSelect,
  renderAttendanceCell,
  renderRateCell,
  renderExtraCells,
  showExpandButton = false,
  behaviorCategories = [],
  currentPeriod,
  currentDate,
  colSpan = 7,
}: RosterStudentRowProps) {
  const { selectedPlacements } = useRoomRoster();
  const context: StudentRowContext = { student, isSelected };

  // Story 3-3: Check if this student is selected for bulk action
  const isChecked = selectedPlacements.has(student.placement_id);
  const studentName = `${student.last_name}, ${student.first_name}`;

  // Story 4-1: Expandable panel state
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Fragment>
      <TableRow
        className={cn(
          isSelected && 'bg-muted/50',
          // Story 3-3: Highlight selected rows for bulk action
          isChecked && 'bg-primary/5 hover:bg-primary/10',
          // Story 4-1: Highlight expanded row
          isExpanded && 'bg-muted/30'
        )}
        onClick={() => onSelect?.(student.placement_id)}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
      >
        {/* Story 3-3: Selection Checkbox */}
        <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
          <RowSelectionCheckbox placementId={student.placement_id} studentName={studentName} />
        </TableCell>

        {/* Student Name with optional expand button */}
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {/* Story 4-1: Expand/collapse button */}
            {showExpandButton && (
              <ChevronButton
                isExpanded={isExpanded}
                onToggle={() => setIsExpanded((prev) => !prev)}
              />
            )}
            <div className="flex flex-col">
              <span>
                {student.last_name}, {student.first_name}
              </span>
              <span className="text-xs text-muted-foreground">
                ID: {student.school_id}
              </span>
            </div>
          </div>
        </TableCell>

        {/* Grade */}
        <TableCell className="text-center">
          {student.grade_level !== null ? student.grade_level : '--'}
        </TableCell>

        {/* Status */}
        <TableCell>
          <StatusBadge status={student.status} />
        </TableCell>

        {/* Story 3-9: Attendance Cell */}
        {renderAttendanceCell?.(context)}

        {/* Story 3-11: Rate Cell */}
        {renderRateCell?.(context)}

        {/* Days Remaining */}
        <TableCell className="text-center">
          <DaysRemainingBadge days={student.days_remaining} />
        </TableCell>

        {/* Extensible cells via render props */}
        {renderExtraCells?.(context)}
      </TableRow>

      {/* Story 4-1: Expanded inline panel */}
      {showExpandButton && isExpanded && (
        <ExpandedStudentRow
          colSpan={colSpan}
          placementId={student.placement_id}
          studentName={studentName}
          schoolId={student.school_id}
          categories={behaviorCategories}
          currentPeriod={currentPeriod}
          currentDate={currentDate}
        />
      )}
    </Fragment>
  );
}
