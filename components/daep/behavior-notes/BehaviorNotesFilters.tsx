'use client';

/**
 * BehaviorNotesFilters
 *
 * Story 4-3: Behavior Notes List View
 *
 * Filter controls for the behavior notes list:
 * - Search input (by student name, ID, or description)
 * - Category type dropdown (All, Positive, Negative, Neutral)
 * - Campus dropdown
 * - Staff dropdown
 * - Date range (From/To)
 * - Clear filters button
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';

interface Staff {
  id: string;
  name: string;
  lastName: string;
}

interface Campus {
  id: string;
  name: string;
}

interface BehaviorNotesFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryType: 'positive' | 'negative' | 'neutral' | 'all';
  onCategoryTypeChange: (type: 'positive' | 'negative' | 'neutral' | 'all') => void;
  campusId: string | 'all';
  onCampusChange: (campusId: string | 'all') => void;
  staffId: string | 'all';
  onStaffChange: (staffId: string | 'all') => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  campuses: Campus[];
  staffList: Staff[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const CATEGORY_TYPE_LABELS: Record<'positive' | 'negative' | 'neutral' | 'all', string> = {
  all: 'All Categories',
  positive: 'Positive',
  negative: 'Negative',
  neutral: 'Neutral',
};

export function BehaviorNotesFilters({
  searchQuery,
  onSearchChange,
  categoryType,
  onCategoryTypeChange,
  campusId,
  onCampusChange,
  staffId,
  onStaffChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  campuses,
  staffList,
  onClearFilters,
  hasActiveFilters,
}: BehaviorNotesFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by student name, ID, or description..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Category Type Filter */}
        <div className="flex-shrink-0 w-40">
          <Select
            value={categoryType}
            onValueChange={(value) =>
              onCategoryTypeChange(value as 'positive' | 'negative' | 'neutral' | 'all')
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campus Filter */}
        <div className="flex-shrink-0 w-44">
          <Select value={campusId} onValueChange={onCampusChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Campuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campuses</SelectItem>
              {campuses.map((campus) => (
                <SelectItem key={campus.id} value={campus.id}>
                  {campus.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Staff Filter */}
        <div className="flex-shrink-0 w-44">
          <Select value={staffId} onValueChange={onStaffChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-36"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To:</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-36"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
