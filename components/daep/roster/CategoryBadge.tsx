'use client';

/**
 * CategoryBadge - Color-coded badge for behavior categories
 *
 * Story 4-2: Predefined Behavior Categories
 *
 * Colors:
 * - Positive: Green
 * - Negative: Red
 * - Neutral: Blue
 * - Bonus: Amber
 */

import { cn } from '@/lib/utils';

export type CategoryType = 'positive' | 'negative' | 'neutral' | 'bonus';

interface CategoryBadgeProps {
  category: string;
  type?: CategoryType;
  className?: string;
}

const BADGE_STYLES: Record<CategoryType, string> = {
  positive: 'bg-green-100 text-green-700 border-green-200',
  negative: 'bg-red-100 text-red-700 border-red-200',
  neutral: 'bg-blue-100 text-blue-600 border-blue-200',
  bonus: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function CategoryBadge({ category, type = 'neutral', className }: CategoryBadgeProps) {
  if (!category) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border',
        BADGE_STYLES[type],
        className
      )}
    >
      {category}
    </span>
  );
}
