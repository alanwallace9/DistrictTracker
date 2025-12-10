'use client';

/**
 * CategorySelect - Grouped behavior category dropdown
 *
 * Story 4-2: Predefined Behavior Categories
 *
 * Features:
 * - Groups categories by type (Positive, Negative, Neutral)
 * - Color-coded text by category type
 * - "None" option at bottom
 * - Filters by variant: student (positive+negative) or teacher (neutral)
 */

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';

interface CategorySelectProps {
  categories: BehaviorCategory[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  variant: 'student' | 'teacher';
  className?: string;
  disabled?: boolean;
}

const CATEGORY_TYPE_STYLES: Record<string, string> = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-blue-600',
  bonus: 'text-amber-600',
};

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  positive: 'Positive',
  negative: 'Negative',
  neutral: 'Neutral',
  bonus: 'Bonus',
};

export function CategorySelect({
  categories,
  value,
  onValueChange,
  placeholder = 'Select action...',
  variant,
  className,
  disabled = false,
}: CategorySelectProps) {
  // Filter categories based on variant
  const filteredCategories = React.useMemo(() => {
    if (variant === 'student') {
      // Student actions: positive + negative
      return categories.filter(
        (c) => c.is_active && (c.category_type === 'positive' || c.category_type === 'negative')
      );
    }
    // Teacher actions: neutral only
    return categories.filter((c) => c.is_active && c.category_type === 'neutral');
  }, [categories, variant]);

  // Group by category_type
  const groupedCategories = React.useMemo(() => {
    const groups: Record<string, BehaviorCategory[]> = {};

    filteredCategories.forEach((cat) => {
      if (!groups[cat.category_type]) {
        groups[cat.category_type] = [];
      }
      groups[cat.category_type].push(cat);
    });

    // Sort groups: positive first, then negative for student; neutral for teacher
    const groupOrder = variant === 'student' ? ['positive', 'negative'] : ['neutral'];

    return groupOrder
      .filter((type) => groups[type]?.length > 0)
      .map((type) => ({
        type,
        label: CATEGORY_TYPE_LABELS[type] || type,
        categories: groups[type].sort((a, b) => a.display_order - b.display_order),
      }));
  }, [filteredCategories, variant]);

  // Handle empty string for "None" option
  const handleValueChange = (newValue: string) => {
    onValueChange(newValue === '__none__' ? '' : newValue);
  };

  const displayValue = value === '' ? '__none__' : value;

  // Get display text - show placeholder if None selected, otherwise show value
  const displayText = value === '' ? null : value;

  return (
    <Select value={displayValue} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className={cn('w-[160px] h-8', className)}>
        {displayText ? (
          <span className={cn(
            CATEGORY_TYPE_STYLES[
              filteredCategories.find(c => c.name === value)?.category_type || ''
            ]
          )}>
            {displayText}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {/* Grouped categories */}
        {groupedCategories.map((group) => (
          <SelectGroup key={group.type}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {group.label}
            </SelectLabel>
            {group.categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                <span className={cn(CATEGORY_TYPE_STYLES[cat.category_type])}>
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}

        {/* None option at bottom */}
        <SelectGroup>
          <SelectItem value="__none__">
            <span className="text-muted-foreground">None</span>
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
