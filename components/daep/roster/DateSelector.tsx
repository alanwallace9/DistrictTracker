'use client';

/**
 * Date Selector Component
 *
 * Story 3-1: Room Roster View
 * Date picker that defaults to today, with quick navigation buttons
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateSelectorProps {
  date: string;
  onDateChange: (date: string) => void;
  disabled?: boolean;
}

export function DateSelector({
  date,
  onDateChange,
  disabled = false,
}: DateSelectorProps) {
  // Navigate to previous day
  const goToPreviousDay = () => {
    const current = new Date(date);
    current.setDate(current.getDate() - 1);
    onDateChange(formatDate(current));
  };

  // Navigate to next day
  const goToNextDay = () => {
    const current = new Date(date);
    current.setDate(current.getDate() + 1);
    onDateChange(formatDate(current));
  };

  // Go to today
  const goToToday = () => {
    onDateChange(formatDate(new Date()));
  };

  // Check if selected date is today
  const isToday = date === formatDate(new Date());

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToPreviousDay}
        disabled={disabled}
        title="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className="w-[140px]"
        disabled={disabled}
      />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToNextDay}
        disabled={disabled}
        title="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isToday && (
        <Button
          variant="outline"
          size="sm"
          onClick={goToToday}
          disabled={disabled}
          className="text-xs"
        >
          Today
        </Button>
      )}
    </div>
  );
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
