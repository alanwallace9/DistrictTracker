'use client';

/**
 * BehaviorNotesTable
 *
 * Story 4-3: Behavior Notes List View
 *
 * Sortable table with pagination for behavior notes list:
 * - 7 columns: Date/Time, Student, Campus, Category, Description, Staff, Verified
 * - Click headers to sort (arrows show direction)
 * - Tooltip on description for full text
 * - Row click opens detail sheet
 * - Pagination controls
 */

import Link from 'next/link';
import { ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { BehaviorNoteListItem, BehaviorNotesSortKey } from '@/lib/validation/schemas';

interface BehaviorNotesTableProps {
  notes: BehaviorNoteListItem[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  sortConfig: { key: BehaviorNotesSortKey; direction: 'asc' | 'desc' };
  onSort: (key: BehaviorNotesSortKey) => void;
  onRowClick: (note: BehaviorNoteListItem) => void;
}

const CATEGORY_TYPE_STYLES: Record<string, string> = {
  positive: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  negative: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  neutral: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'p' : 'a';
  const h12 = h % 12 || 12;
  return ` ${h12}:${minutes}${ampm}`;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export function BehaviorNotesTable({
  notes,
  loading,
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  sortConfig,
  onSort,
  onRowClick,
}: BehaviorNotesTableProps) {
  const renderSortableHeader = (label: string, key: BehaviorNotesSortKey, className?: string) => {
    const isActive = sortConfig.key === key;
    return (
      <button
        type="button"
        onClick={() => onSort(key)}
        className={cn(
          'flex items-center gap-1 text-left text-sm font-semibold text-muted-foreground hover:text-foreground',
          className
        )}
      >
        <span>{label}</span>
        {isActive ? (
          <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-50" />
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Loading behavior notes...</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border rounded-lg bg-muted/50">
        <p className="text-muted-foreground">No behavior notes found matching your criteria</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 w-[100px]">
                  {renderSortableHeader('Date/Time', 'date')}
                </th>
                <th className="text-left p-3 w-[140px]">
                  {renderSortableHeader('Student', 'student_name')}
                </th>
                <th className="text-left p-3 w-[90px]">
                  {renderSortableHeader('Campus', 'campus')}
                </th>
                <th className="text-left p-3 w-[100px]">
                  {renderSortableHeader('Category', 'category')}
                </th>
                <th className="text-left p-3">Description</th>
                <th className="text-left p-3 w-[80px]">
                  {renderSortableHeader('Staff', 'staff')}
                </th>
                <th className="text-center p-3 w-[50px]">
                  {renderSortableHeader('', 'verified')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {notes.map((note, index) => {
                const rowBg = index % 2 === 0 ? 'bg-card' : 'bg-muted/30';

                return (
                  <tr
                    key={note.id}
                    className={`${rowBg} hover:bg-accent transition-colors cursor-pointer`}
                    onClick={() => onRowClick(note)}
                  >
                    {/* Date/Time */}
                    <td className="p-3 text-sm">
                      <span className="font-medium">{formatDate(note.incident_date)}</span>
                      <span className="text-muted-foreground">
                        {formatTime(note.incident_time)}
                      </span>
                    </td>

                    {/* Student with Avatar */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 text-xs flex-shrink-0">
                          {note.student_photo_url && (
                            <AvatarImage
                              src={note.student_photo_url}
                              alt={`${note.student_first_name} ${note.student_last_name}`}
                            />
                          )}
                          <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                            {getInitials(note.student_first_name, note.student_last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <Link
                          href={`/daep/students/${note.student_school_id}`}
                          className="text-sm font-medium hover:underline text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {note.student_last_name}, {note.student_first_name?.[0]}.
                        </Link>
                      </div>
                    </td>

                    {/* Campus */}
                    <td className="p-3 text-sm text-muted-foreground">
                      {note.home_campus_name || '—'}
                    </td>

                    {/* Category Badge */}
                    <td className="p-3">
                      {note.category ? (
                        <span
                          className={cn(
                            'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium',
                            note.category_type
                              ? CATEGORY_TYPE_STYLES[note.category_type]
                              : 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {note.category}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>

                    {/* Description with Tooltip */}
                    <td className="p-3 max-w-[300px]">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block text-sm cursor-help">
                              {note.description_snippet || '—'}
                            </span>
                          </TooltipTrigger>
                          {note.description && note.description.length > 40 && (
                            <TooltipContent side="top" className="max-w-md">
                              <p className="text-sm whitespace-pre-wrap">
                                {note.description.slice(0, 500)}
                                {note.description.length > 500 && '...'}
                              </p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </td>

                    {/* Staff */}
                    <td className="p-3 text-sm text-muted-foreground">
                      {note.staff_last_name}
                    </td>

                    {/* Verified */}
                    <td className="p-3 text-center">
                      {note.is_verified ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total} notes
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
