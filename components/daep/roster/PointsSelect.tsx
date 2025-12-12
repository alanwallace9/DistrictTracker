'use client';

/**
 * PointsSelect - Points adjustment dropdown
 *
 * Story 4-2: UI Enhancement
 *
 * Features:
 * - Matches CategorySelect style
 * - Color-coded values (green positive, red negative, gray zero)
 * - Shows placeholder when zero selected
 */

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PointsSelectProps {
  value: number | null;
  onValueChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Point adjustments (hardcoded for now, future: from settings)
const POINT_ADJUSTMENTS = [
  { value: 10, label: '+10' },
  { value: 5, label: '+5' },
  { value: 0, label: '0 (Note Only)' },
  { value: -5, label: '-5' },
  { value: -10, label: '-10' },
  { value: -15, label: '-15' },
];

function getPointsColor(points: number): string {
  if (points > 0) return 'text-green-600';
  if (points < 0) return 'text-red-600';
  return 'text-muted-foreground';
}

export function PointsSelect({
  value,
  onValueChange,
  placeholder = 'Points',
  className,
  disabled = false,
}: PointsSelectProps) {
  const handleValueChange = (newValue: string) => {
    onValueChange(parseInt(newValue, 10));
  };

  // Find the selected option label
  const selectedOption = value !== null ? POINT_ADJUSTMENTS.find((opt) => opt.value === value) : null;

  // Show placeholder when value is null (unselected state)
  const showPlaceholder = value === null;

  return (
    <Select value={value !== null ? value.toString() : ''} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className={cn('w-[120px] h-8', className)}>
        {showPlaceholder ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : selectedOption ? (
          <span className={cn(getPointsColor(value!))}>
            {selectedOption.label}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {POINT_ADJUSTMENTS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value.toString()}>
            <span className={cn(getPointsColor(opt.value))}>
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
