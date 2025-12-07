'use client';

/**
 * Selection Checkbox Components
 *
 * Story 3-3: Bulk Point Entry
 *
 * Provides checkboxes for multi-select functionality in the roster table:
 * - SelectAllCheckbox: Header checkbox to select/deselect all students
 * - RowSelectionCheckbox: Individual row checkbox
 */

import { Checkbox } from '@/components/ui/checkbox';
import { useRoomRoster } from './RoomRosterContext';
import { cn } from '@/lib/utils';

// ========== SELECT ALL CHECKBOX (Header) ==========

export function SelectAllCheckbox() {
  const { students, isAllSelected, isSomeSelected, selectAll, clearSelection } = useRoomRoster();

  const handleCheckedChange = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      selectAll();
    } else {
      clearSelection();
    }
  };

  // Disable if no students
  const disabled = students.length === 0;

  return (
    <Checkbox
      checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
      onCheckedChange={handleCheckedChange}
      disabled={disabled}
      aria-label={isAllSelected ? 'Deselect all students' : 'Select all students'}
      className={cn(
        'h-4 w-4',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    />
  );
}

// ========== ROW SELECTION CHECKBOX ==========

interface RowSelectionCheckboxProps {
  placementId: string;
  studentName?: string;
}

export function RowSelectionCheckbox({ placementId, studentName }: RowSelectionCheckboxProps) {
  const { selectedPlacements, toggleSelection } = useRoomRoster();

  const isSelected = selectedPlacements.has(placementId);

  const handleCheckedChange = () => {
    toggleSelection(placementId);
  };

  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={handleCheckedChange}
      aria-label={isSelected ? `Deselect ${studentName || 'student'}` : `Select ${studentName || 'student'}`}
      className="h-4 w-4"
    />
  );
}
