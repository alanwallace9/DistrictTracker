/**
 * Audit Utility Functions
 *
 * Story 3-8: Point Audit Trail
 *
 * Provides utility functions for audit log display:
 * - Event type to icon mapping
 * - Event type to color mapping
 * - Relative time formatting
 * - Action text formatting
 */

import {
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  Package,
  RefreshCw,
  MapPin,
  ClipboardList,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

// ========== EVENT TYPE ICON MAPPING ==========

const eventIconMap: Record<string, LucideIcon> = {
  // Points - Created/Approved
  'points.base_auto_approved': Plus,
  'points.auto_approved': Plus,
  'points.approved_by_admin': Check,
  'points.bulk_approved_by_admin': Check,
  'points.edited_and_approved': Check,

  // Points - Pending
  'points.base_pending_approval': AlertCircle,
  'points.pending_approval': AlertCircle,
  'points.bulk_pending_approval': AlertCircle,

  // Points - Rejected/Removed
  'points.rejected_by_admin': X,
  'points.base_removed': Trash2,
  'points.adjustment_deleted': Trash2,

  // Points - Edited
  'points.adjustment_edited': Pencil,

  // Points - Bulk
  'points.bulk_auto_approved': Package,
  // 'points.bulk_pending_approval' is already mapped to AlertCircle above (pending status)

  // Placement - Created
  'placement.created': Plus,

  // Placement - Updated/Edited
  'placement.updated': Pencil,

  // Placement - Status
  'placement.intake_processed': RefreshCw,
  'placement.transitioned': RefreshCw,
  'placement.cancelled': X,
  'placement.no_show': X,
  'placement.rollover_decision': RefreshCw,

  // Room/Separation
  'room.assignment_changed': MapPin,
  'student.separation_added': MapPin,
  'student.separation_removed': MapPin,

  // Attendance
  'attendance.marked': ClipboardList,
  'attendance.override': Pencil,
};

export function getEventIcon(eventType: string): LucideIcon {
  return eventIconMap[eventType] || AlertCircle;
}

// ========== EVENT TYPE COLOR MAPPING ==========

type ColorScheme = {
  bg: string;
  text: string;
  border: string;
  iconBg: string;
};

const eventColorMap: Record<string, ColorScheme> = {
  // Green - Created/Approved
  'points.base_auto_approved': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900',
  },
  'points.auto_approved': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900',
  },
  'points.approved_by_admin': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900',
  },
  'points.bulk_approved_by_admin': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900',
  },
  'points.edited_and_approved': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900',
  },
  'placement.created': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900',
  },

  // Amber - Pending/Warning
  'points.base_pending_approval': {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
  },
  'points.pending_approval': {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
  },
  'points.bulk_pending_approval': {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
  },
  'points.adjustment_edited': {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
  },
  'placement.updated': {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
  },

  // Red - Rejected/Deleted
  'points.rejected_by_admin': {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    iconBg: 'bg-red-100 dark:bg-red-900',
  },
  'points.base_removed': {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    iconBg: 'bg-red-100 dark:bg-red-900',
  },
  'points.adjustment_deleted': {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    iconBg: 'bg-red-100 dark:bg-red-900',
  },
  'placement.cancelled': {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    iconBg: 'bg-red-100 dark:bg-red-900',
  },
  'placement.no_show': {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    iconBg: 'bg-red-100 dark:bg-red-900',
  },

  // Purple - Status changes
  'placement.intake_processed': {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    iconBg: 'bg-purple-100 dark:bg-purple-900',
  },
  'placement.transitioned': {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    iconBg: 'bg-purple-100 dark:bg-purple-900',
  },
  'placement.rollover_decision': {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    iconBg: 'bg-purple-100 dark:bg-purple-900',
  },

  // Slate - Room/Location
  'room.assignment_changed': {
    bg: 'bg-slate-50 dark:bg-slate-950/30',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
  },
  'student.separation_added': {
    bg: 'bg-slate-50 dark:bg-slate-950/30',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
  },
  'student.separation_removed': {
    bg: 'bg-slate-50 dark:bg-slate-950/30',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
  },

  // Teal - Attendance
  'attendance.marked': {
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    iconBg: 'bg-teal-100 dark:bg-teal-900',
  },
  'attendance.override': {
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800',
    iconBg: 'bg-teal-100 dark:bg-teal-900',
  },

  // Blue - Bulk actions
  'points.bulk_auto_approved': {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
  },
};

const defaultColors: ColorScheme = {
  bg: 'bg-gray-50 dark:bg-gray-900/30',
  text: 'text-gray-700 dark:text-gray-300',
  border: 'border-gray-200 dark:border-gray-700',
  iconBg: 'bg-gray-100 dark:bg-gray-800',
};

export function getEventColors(eventType: string): ColorScheme {
  return eventColorMap[eventType] || defaultColors;
}

// ========== RELATIVE TIME FORMATTING ==========

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'Just now';
  }

  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }

  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }

  if (diffDay === 1) {
    return 'Yesterday';
  }

  if (diffDay < 7) {
    return `${diffDay} days ago`;
  }

  // For older entries, show the date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatFullDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ========== EVENT CATEGORY HELPERS ==========

export type EventCategory = 'points' | 'attendance' | 'placement' | 'all';

export function getEventCategory(eventType: string): EventCategory {
  if (eventType.startsWith('points.')) return 'points';
  if (eventType.startsWith('attendance.')) return 'attendance';
  if (
    eventType.startsWith('placement.') ||
    eventType.startsWith('room.') ||
    eventType.startsWith('student.')
  ) {
    return 'placement';
  }
  return 'all';
}

export const categoryLabels: Record<EventCategory, string> = {
  points: 'Points',
  attendance: 'Attendance',
  placement: 'Placement',
  all: 'All',
};

// ========== EVENT TYPE LABELS ==========

const eventTypeLabels: Record<string, string> = {
  // Points
  'points.base_auto_approved': 'Base points added',
  'points.base_pending_approval': 'Base points pending',
  'points.base_removed': 'Base points removed',
  'points.auto_approved': 'Adjustment approved',
  'points.pending_approval': 'Adjustment pending',
  'points.adjustment_deleted': 'Adjustment deleted',
  'points.adjustment_edited': 'Adjustment edited',
  'points.bulk_auto_approved': 'Bulk points added',
  'points.bulk_pending_approval': 'Bulk points pending',
  'points.approved_by_admin': 'Points approved',
  'points.rejected_by_admin': 'Points rejected',
  'points.bulk_approved_by_admin': 'Bulk approved',
  'points.edited_and_approved': 'Edited & approved',

  // Placement
  'placement.created': 'Placement created',
  'placement.updated': 'Placement updated',
  'placement.intake_processed': 'Intake completed',
  'placement.transitioned': 'Status changed',
  'placement.cancelled': 'Placement cancelled',
  'placement.no_show': 'Marked no-show',
  'placement.rollover_decision': 'Rollover decision',

  // Room/Separation
  'room.assignment_changed': 'Room changed',
  'student.separation_added': 'Separation added',
  'student.separation_removed': 'Separation removed',

  // Attendance
  'attendance.marked': 'Attendance marked',
  'attendance.override': 'Attendance override',
};

export function getEventTypeLabel(eventType: string): string {
  return eventTypeLabels[eventType] || eventType.replace(/[._]/g, ' ');
}

// ========== TRUNCATE TEXT ==========

export function truncateText(text: string, maxLength: number = 150): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
