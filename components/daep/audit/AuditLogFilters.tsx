'use client';

/**
 * Audit Log Filters Component
 *
 * Story 3-8: Point Audit Trail
 *
 * Filter controls for audit log:
 * - Date range picker
 * - User dropdown
 * - Event category toggle (Points/Attendance/Placement/All)
 * - Placement dropdown (for student-level view)
 * - Search input
 * - Clear filters button
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, X, Search } from 'lucide-react';
import type { AuditFilterOptions, AuditUser } from '@/app/actions/daep/audit';
import { type EventCategory, categoryLabels } from './audit-utils';

interface Placement {
  id: string;
  label: string;
}

interface AuditLogFiltersProps {
  placements?: Placement[];
  users: AuditUser[];
  showCategoryToggle?: boolean;
  showPlacementFilter?: boolean;
  showSearch?: boolean;
  onFilterChange: (filters: AuditFilterOptions) => void;
  initialFilters?: AuditFilterOptions;
}

export function AuditLogFilters({
  placements,
  users,
  showCategoryToggle = true,
  showPlacementFilter = true,
  showSearch = true,
  onFilterChange,
  initialFilters,
}: AuditLogFiltersProps) {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: initialFilters?.startDate ? new Date(initialFilters.startDate) : undefined,
    to: initialFilters?.endDate ? new Date(initialFilters.endDate) : undefined,
  });
  const [userId, setUserId] = useState<string>(initialFilters?.userId || '');
  const [category, setCategory] = useState<EventCategory>(
    initialFilters?.eventCategory || 'all'
  );
  const [placementId, setPlacementId] = useState<string>(initialFilters?.placementId || '');
  const [searchText, setSearchText] = useState<string>(initialFilters?.searchText || '');

  // Build and emit filters
  const emitFilters = useCallback(
    (overrides?: Partial<{
      dateRange: { from?: Date; to?: Date };
      userId: string;
      category: EventCategory;
      placementId: string;
      searchText: string;
    }>) => {
      const dr = overrides?.dateRange ?? dateRange;
      const uid = overrides?.userId ?? userId;
      const cat = overrides?.category ?? category;
      const pid = overrides?.placementId ?? placementId;
      const st = overrides?.searchText ?? searchText;

      const filters: AuditFilterOptions = {};

      if (dr.from) {
        filters.startDate = format(dr.from, 'yyyy-MM-dd');
      }
      if (dr.to) {
        filters.endDate = format(dr.to, 'yyyy-MM-dd');
      }
      if (uid) {
        filters.userId = uid;
      }
      if (cat && cat !== 'all') {
        filters.eventCategory = cat;
      }
      if (pid) {
        filters.placementId = pid;
      }
      if (st) {
        filters.searchText = st;
      }

      onFilterChange(filters);
    },
    [dateRange, userId, category, placementId, searchText, onFilterChange]
  );

  // Handle date range change
  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    const newRange = range || { from: undefined, to: undefined };
    setDateRange(newRange);
    emitFilters({ dateRange: newRange });
  };

  // Handle user change
  const handleUserChange = (value: string) => {
    const newUserId = value === 'all' ? '' : value;
    setUserId(newUserId);
    emitFilters({ userId: newUserId });
  };

  // Handle category change
  const handleCategoryChange = (value: string) => {
    const newCategory = (value as EventCategory) || 'all';
    setCategory(newCategory);
    emitFilters({ category: newCategory });
  };

  // Handle placement change
  const handlePlacementChange = (value: string) => {
    const newPlacementId = value === 'all' ? '' : value;
    setPlacementId(newPlacementId);
    emitFilters({ placementId: newPlacementId });
  };

  // Handle search change (debounced effect would be better)
  const handleSearchChange = (value: string) => {
    setSearchText(value);
  };

  const handleSearchSubmit = () => {
    emitFilters({ searchText });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setUserId('');
    setCategory('all');
    setPlacementId('');
    setSearchText('');
    onFilterChange({});
  };

  // Check if any filters are active
  const hasActiveFilters =
    dateRange.from ||
    dateRange.to ||
    userId ||
    category !== 'all' ||
    placementId ||
    searchText;

  return (
    <div className="space-y-3">
      {/* First row: Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal w-[240px]',
                !dateRange.from && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </>
                ) : (
                  format(dateRange.from, 'MMM d, yyyy')
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* User Filter */}
        {users.length > 0 && (
          <Select value={userId || 'all'} onValueChange={handleUserChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Placement Filter */}
        {showPlacementFilter && placements && placements.length > 1 && (
          <Select value={placementId || 'all'} onValueChange={handlePlacementChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All placements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All placements</SelectItem>
              {placements.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search Input */}
        {showSearch && (
          <div className="flex items-center gap-1">
            <Input
              placeholder="Search actions..."
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className="w-[180px]"
            />
            <Button variant="ghost" size="icon" onClick={handleSearchSubmit}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Second row: Category toggle */}
      {showCategoryToggle && (
        <ToggleGroup
          type="single"
          value={category}
          onValueChange={handleCategoryChange}
          className="justify-start"
        >
          {(Object.keys(categoryLabels) as EventCategory[]).map((cat) => (
            <ToggleGroupItem
              key={cat}
              value={cat}
              aria-label={`Filter by ${categoryLabels[cat]}`}
              className="text-xs"
            >
              {categoryLabels[cat]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  );
}
