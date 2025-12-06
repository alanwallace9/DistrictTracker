'use client';

/**
 * Roster Student Row Component
 *
 * Story 3-1: Room Roster View
 *
 * Displays a single student in the roster table.
 * Uses render props pattern for extensibility - future stories (3-2, 3-9)
 * can add columns for points entry, attendance, behavior notes.
 */

import { type ReactNode } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DaysRemainingBadge } from './DaysRemainingBadge';
import type { RosterStudent } from '@/app/actions/daep/roster';
import type { PlacementStatus } from '@/lib/validation/schemas';

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
  // Future stories add: renderPointsCell, renderAttendanceCell, renderNotesCell
  renderExtraCells?: (context: StudentRowContext) => ReactNode;
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
  renderExtraCells,
}: RosterStudentRowProps) {
  const context: StudentRowContext = { student, isSelected };

  return (
    <TableRow
      className={isSelected ? 'bg-muted/50' : undefined}
      onClick={() => onSelect?.(student.placement_id)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {/* Student Name */}
      <TableCell className="font-medium">
        <div className="flex flex-col">
          <span>
            {student.last_name}, {student.first_name}
          </span>
          <span className="text-xs text-muted-foreground">
            ID: {student.school_id}
          </span>
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

      {/* Days Remaining */}
      <TableCell className="text-center">
        <DaysRemainingBadge days={student.days_remaining} />
      </TableCell>

      {/* Extensible cells via render props */}
      {renderExtraCells?.(context)}
    </TableRow>
  );
}
