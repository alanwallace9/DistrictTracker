'use client';

/**
 * Period Selector Component
 *
 * Story 3-1: Room Roster View
 * Period dropdown with keyboard navigation (Quick Win #1)
 */

import { useCallback, KeyboardEvent } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import type { BellSchedulePeriod } from '@/lib/validation/schemas';
import type { CurrentPeriodResult } from '@/lib/daep/bell-schedule';

interface PeriodSelectorProps {
  periods: BellSchedulePeriod[];
  selectedPeriodIndex: number;
  onPeriodChange: (periodIndex: number) => void;
  currentPeriodInfo?: CurrentPeriodResult | null;
  disabled?: boolean;
}

export function PeriodSelector({
  periods,
  selectedPeriodIndex,
  onPeriodChange,
  currentPeriodInfo,
  disabled = false,
}: PeriodSelectorProps) {
  const selectedPeriod = periods[selectedPeriodIndex];

  // Keyboard navigation (Quick Win #1)
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || periods.length === 0) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const newIndex = Math.max(0, selectedPeriodIndex - 1);
      if (newIndex !== selectedPeriodIndex) {
        onPeriodChange(newIndex);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const newIndex = Math.min(periods.length - 1, selectedPeriodIndex + 1);
      if (newIndex !== selectedPeriodIndex) {
        onPeriodChange(newIndex);
      }
    }
  }, [disabled, periods.length, selectedPeriodIndex, onPeriodChange]);

  // Check if a period is the current period
  const isCurrentPeriod = (period: BellSchedulePeriod): boolean => {
    if (!currentPeriodInfo?.period) return false;
    return currentPeriodInfo.period.period_name === period.period_name;
  };

  if (periods.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span className="text-sm">No schedule configured</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="group"
      aria-label="Period selector"
    >
      <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />

      <Select
        value={String(selectedPeriodIndex)}
        onValueChange={(value) => onPeriodChange(Number(value))}
        disabled={disabled}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select period">
            {selectedPeriod && (
              <span className="flex items-center gap-2">
                <span>{selectedPeriod.period_name}</span>
                {isCurrentPeriod(selectedPeriod) && (
                  <Badge variant="default" className="text-xs">
                    Now
                  </Badge>
                )}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {periods.map((period, index) => (
            <SelectItem key={index} value={String(index)}>
              <div className="flex items-center justify-between w-full gap-2">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{period.period_name}</span>
                  <span className="text-muted-foreground text-xs">
                    {period.start_time} - {period.end_time}
                  </span>
                </span>
                {isCurrentPeriod(period) && (
                  <Badge variant="default" className="ml-2 text-xs">
                    Current
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Keyboard hint */}
      <span className="text-xs text-muted-foreground hidden sm:inline">
        (Use arrow keys)
      </span>
    </div>
  );
}
