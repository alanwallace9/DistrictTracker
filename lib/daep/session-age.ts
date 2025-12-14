/**
 * Session age utilities for reconciliation alerts (Story 5-10)
 *
 * Age categories for color coding:
 * - recent: < 1 day (no special color)
 * - warning: 1-3 days (yellow)
 * - critical: 3-7 days (orange)
 * - abandoned: 7+ days (red)
 */

import type { SessionAgeCategory } from '@/lib/validation/schemas';

/**
 * Calculate session age category based on upload date
 */
export function getSessionAgeCategory(uploadDate: string): SessionAgeCategory {
  const daysSinceUpload = Math.floor(
    (Date.now() - new Date(uploadDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceUpload >= 7) return 'abandoned';
  if (daysSinceUpload >= 3) return 'critical';
  if (daysSinceUpload >= 1) return 'warning';
  return 'recent';
}

/**
 * Get Tailwind classes for age-based color coding
 */
export function getAgeColorClasses(category: SessionAgeCategory): string {
  const colors: Record<SessionAgeCategory, string> = {
    recent: 'bg-muted/50',
    warning: 'border-l-4 border-l-yellow-500 bg-yellow-50',
    critical: 'border-l-4 border-l-orange-500 bg-orange-50',
    abandoned: 'border-l-4 border-l-red-500 bg-red-50',
  };
  return colors[category];
}

/**
 * Get badge variant for age category
 */
export function getAgeBadgeVariant(
  category: SessionAgeCategory
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<SessionAgeCategory, 'default' | 'secondary' | 'destructive' | 'outline'> =
    {
      recent: 'secondary',
      warning: 'outline',
      critical: 'default',
      abandoned: 'destructive',
    };
  return variants[category];
}

/**
 * Format age as human-readable text
 */
export function formatAgeText(uploadDate: string): string {
  const daysSinceUpload = Math.floor(
    (Date.now() - new Date(uploadDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceUpload === 0) return 'Today';
  if (daysSinceUpload === 1) return 'Yesterday';
  return `${daysSinceUpload} days ago`;
}

/**
 * Calculate days since upload
 */
export function getDaysSinceUpload(uploadDate: string): number {
  return Math.floor(
    (Date.now() - new Date(uploadDate).getTime()) / (1000 * 60 * 60 * 24)
  );
}
