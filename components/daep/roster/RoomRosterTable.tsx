'use client';

/**
 * Room Roster Table Component
 *
 * Story 3-1: Room Roster View
 * Story 3-3: Bulk Point Entry (selection checkboxes)
 *
 * Displays students in a sortable table with color-coded days remaining.
 * Uses render props pattern for extensibility - future stories (3-2, 3-9)
 * can add columns for points entry, attendance, behavior notes.
 */

import { useState, useMemo, type ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, Users } from 'lucide-react';
import { RosterStudentRow, type StudentRowContext } from './RosterStudentRow';
import { SelectAllCheckbox, RowSelectionCheckbox } from './SelectionCheckbox';
import { useRoomRoster } from './RoomRosterContext';
import type { RosterStudent } from '@/app/actions/daep/roster';
import { cn } from '@/lib/utils';

// ========== TYPES ==========

type SortField = 'name' | 'grade' | 'days' | 'status';
type SortDirection = 'asc' | 'desc';

interface ExtraColumn {
  id: string;
  header: ReactNode;
  width?: string;
}

export interface RoomRosterTableProps {
  students: RosterStudent[];
  isLoading?: boolean;
  selectedStudentId?: string | null;
  onStudentSelect?: (placementId: string) => void;

  // Extensibility props for future stories
  extraColumns?: ExtraColumn[];
  renderExtraCells?: (context: StudentRowContext) => ReactNode;
}

// ========== SORTING UTILITIES ==========

function compareStrings(a: string, b: string, dir: SortDirection): number {
  const result = a.localeCompare(b);
  return dir === 'asc' ? result : -result;
}

function compareNumbers(a: number | null, b: number | null, dir: SortDirection): number {
  // Null values sort to end
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  const result = a - b;
  return dir === 'asc' ? result : -result;
}

function sortStudents(
  students: RosterStudent[],
  field: SortField,
  direction: SortDirection
): RosterStudent[] {
  return [...students].sort((a, b) => {
    switch (field) {
      case 'name':
        const nameA = `${a.last_name}, ${a.first_name}`;
        const nameB = `${b.last_name}, ${b.first_name}`;
        return compareStrings(nameA, nameB, direction);

      case 'grade':
        return compareNumbers(a.grade_level, b.grade_level, direction);

      case 'days':
        return compareNumbers(a.days_remaining, b.days_remaining, direction);

      case 'status':
        return compareStrings(a.status, b.status, direction);

      default:
        return 0;
    }
  });
}

// ========== SORT BUTTON COMPONENT ==========

interface SortButtonProps {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}

function SortButton({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
}: SortButtonProps) {
  const isActive = currentField === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=active]:bg-accent"
      onClick={() => onSort(field)}
      data-state={isActive ? 'active' : 'inactive'}
    >
      {label}
      {isActive ? (
        currentDirection === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}

// ========== EMPTY STATE ==========

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground">
        No students in this room
      </h3>
      <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
        Students will appear here once they are assigned to this room through the placement management system.
      </p>
    </div>
  );
}

// ========== LOADING STATE ==========

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-pulse text-muted-foreground">
        Loading roster...
      </div>
    </div>
  );
}

// ========== MAIN COMPONENT ==========

export function RoomRosterTable({
  students,
  isLoading = false,
  selectedStudentId,
  onStudentSelect,
  extraColumns = [],
  renderExtraCells,
}: RoomRosterTableProps) {
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Memoized sorted students
  const sortedStudents = useMemo(
    () => sortStudents(students, sortField, sortDirection),
    [students, sortField, sortDirection]
  );

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Empty state
  if (students.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Story 3-3: Selection checkbox column */}
            <TableHead className="w-[40px] px-2">
              <SelectAllCheckbox />
            </TableHead>
            <TableHead className="w-[250px]">
              <SortButton
                label="Student"
                field="name"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="w-[80px] text-center">
              <SortButton
                label="Grade"
                field="grade"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="w-[100px]">
              <SortButton
                label="Status"
                field="status"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="w-[120px] text-center">
              <SortButton
                label="Days Left"
                field="days"
                currentField={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            {/* Extra columns from future stories */}
            {extraColumns.map((col) => (
              <TableHead key={col.id} style={{ width: col.width }}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStudents.map((student) => (
            <RosterStudentRow
              key={student.placement_id}
              student={student}
              isSelected={selectedStudentId === student.placement_id}
              onSelect={onStudentSelect}
              renderExtraCells={renderExtraCells}
            />
          ))}
        </TableBody>
      </Table>

      {/* Footer with count */}
      <div className="border-t px-4 py-2 text-sm text-muted-foreground">
        {students.length} {students.length === 1 ? 'student' : 'students'}
      </div>
    </div>
  );
}
