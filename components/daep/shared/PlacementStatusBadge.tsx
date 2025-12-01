'use client';

import { Badge } from '@/components/ui/badge';
import type { PlacementStatus } from '@/lib/validation/schemas';

interface PlacementStatusBadgeProps {
  status: PlacementStatus | string;
  className?: string;
}

/**
 * Placement Status Badge Component
 * Displays the current placement status with appropriate styling
 *
 * Story 2-6: AC 2.6.1, AC 2.6.2
 *
 * Status colors use Tailwind theme colors for consistency:
 * - pending: yellow (warning - awaiting first attendance)
 * - active: green (success - student actively in DAEP)
 * - met: blue (info - requirements met, pending review)
 * - complete: gray (neutral - placement finished)
 */
export function PlacementStatusBadge({ status, className = '' }: PlacementStatusBadgeProps) {
  const styles = getStatusStyles(status);
  const label = getStatusLabel(status);

  return (
    <Badge variant="outline" className={`${styles} ${className}`}>
      {label}
    </Badge>
  );
}

/**
 * Get Tailwind classes for status styling
 * Uses semantic colors that work with light/dark themes
 */
function getStatusStyles(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    case 'met':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'complete':
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    // Legacy status support (for data before migration)
    case 'transition':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    case 'closed':
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700';
  }
}

/**
 * Get human-readable label for status
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'active':
      return 'Active';
    case 'met':
      return 'Requirements Met';
    case 'complete':
      return 'Complete';
    // Legacy status support
    case 'transition':
      return 'In Transition';
    case 'closed':
      return 'Closed';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

/**
 * Export helper functions for use elsewhere
 */
export { getStatusStyles, getStatusLabel };
