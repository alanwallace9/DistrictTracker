/**
 * Room Roster Components
 *
 * Story 3-1: Room Roster View
 * Story 3-2: Point Entry Grid
 * Story 3-3: Bulk Point Entry
 * Story 3-9: Attendance Entry
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

// Story 3-9: Attendance Entry Components
export { AttendanceCell } from './AttendanceCell';
export type { AttendanceCellProps } from './AttendanceCell';
export { AttendanceStatusBadge } from './AttendanceStatusBadge';
export type { AttendanceStatusBadgeProps } from './AttendanceStatusBadge';
export { AttendanceTimeModal } from './AttendanceTimeModal';
export type { AttendanceTimeModalProps } from './AttendanceTimeModal';
export { AttendanceSummaryBanner } from './AttendanceSummaryBanner';
export type { AttendanceSummaryBannerProps } from './AttendanceSummaryBanner';

// Story 3-10: Excuse Modal Component
export { ExcuseModal } from './ExcuseModal';
export type { ExcuseData } from './ExcuseModal';

// Story 3-12: Override Reason Modal Component
export { OverrideReasonModal } from './OverrideReasonModal';
export type { OverrideData } from './OverrideReasonModal';

// Story 3-11: Attendance Rate Components
export { AttendanceRateBadge } from './AttendanceRateBadge';
