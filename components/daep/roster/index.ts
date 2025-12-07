/**
 * Room Roster Components
 *
 * Story 3-1: Room Roster View
 * Story 3-2: Point Entry Grid
 * Story 3-3: Bulk Point Entry
 *
 * Re-exports all roster-related components for easy imports.
 */

export { RoomRosterTable } from './RoomRosterTable';
export type { RoomRosterTableProps } from './RoomRosterTable';

export { RosterStudentRow } from './RosterStudentRow';
export type { RosterStudentRowProps, StudentRowContext } from './RosterStudentRow';

export { RoomSelector } from './RoomSelector';
export { DateSelector } from './DateSelector';
export { PeriodSelector } from './PeriodSelector';
export { DaysRemainingBadge } from './DaysRemainingBadge';

export { RoomRosterProvider, useRoomRoster } from './RoomRosterContext';

// Story 3-2: Point Entry Components
export { TodaysTotalCell, TodaysTotalBadge, PointsColorLegend } from './TodaysTotalCell';
export { PointAdjustmentCell, PointAdjustmentButton } from './PointAdjustmentCell';
export { PointAdjustmentDialog } from './PointAdjustmentDialog';

// Story 3-3: Bulk Point Entry Components
export { SelectAllCheckbox, RowSelectionCheckbox } from './SelectionCheckbox';
export { BulkActionsToolbar, ADJUSTMENT_OPTIONS } from './BulkActionsToolbar';
export type { AdjustmentOption } from './BulkActionsToolbar';
export { BulkApplyDialog } from './BulkApplyDialog';
