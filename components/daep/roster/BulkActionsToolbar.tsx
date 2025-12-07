'use client';

/**
 * Bulk Actions Toolbar Component
 *
 * Story 3-3: Bulk Point Entry
 *
 * Toolbar that appears when students are selected, showing:
 * - Selection count
 * - Bulk actions dropdown (+10, +5, -5, -10, -15)
 * - Clear selection button
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CheckSquare, ChevronDown, X, Plus, Minus } from 'lucide-react';
import { useRoomRoster } from './RoomRosterContext';
import { cn } from '@/lib/utils';

// ========== ADJUSTMENT OPTIONS ==========

interface AdjustmentOption {
  value: number;
  label: string;
  description: string;
  icon: 'plus' | 'minus';
}

const ADJUSTMENT_OPTIONS: AdjustmentOption[] = [
  { value: 10, label: '+10 Exceptional', description: 'Outstanding behavior', icon: 'plus' },
  { value: 5, label: '+5 Bonus', description: 'Good behavior', icon: 'plus' },
  { value: -5, label: '-5 Deduction', description: 'Off task', icon: 'minus' },
  { value: -10, label: '-10 Major', description: 'Disruptive', icon: 'minus' },
  { value: -15, label: '-15 Critical', description: 'Major incident', icon: 'minus' },
];

// ========== PROPS ==========

interface BulkActionsToolbarProps {
  onApplyAction: (adjustment: number) => void;
  className?: string;
}

// ========== COMPONENT ==========

export function BulkActionsToolbar({ onApplyAction, className }: BulkActionsToolbarProps) {
  const { selectedPlacements, clearSelection, students } = useRoomRoster();
  const [isOpen, setIsOpen] = useState(false);

  const selectedCount = selectedPlacements.size;
  const hasSelection = selectedCount > 0;

  // Get names of selected students for accessibility
  const selectedStudents = students.filter((s) => selectedPlacements.has(s.placement_id));

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 bg-primary/5 border border-primary/20 rounded-lg',
        'transition-all duration-300 ease-out',
        hasSelection
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 -translate-x-4 pointer-events-none',
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span>{selectedCount} selected</span>
      </div>

      {/* Bulk actions dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" className="gap-1">
            Bulk Actions
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {ADJUSTMENT_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => {
                onApplyAction(option.value);
                setIsOpen(false);
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              {option.icon === 'plus' ? (
                <Plus className="h-4 w-4 text-green-600" />
              ) : (
                <Minus className="h-4 w-4 text-red-600" />
              )}
              <div className="flex flex-col">
                <span className={cn(
                  'font-medium',
                  option.value > 0 ? 'text-green-700' : 'text-red-700'
                )}>
                  {option.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear selection button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={clearSelection}
        className="gap-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
        Clear
      </Button>
    </div>
  );
}

// Export adjustment options for use in dialog
export { ADJUSTMENT_OPTIONS };
export type { AdjustmentOption };
