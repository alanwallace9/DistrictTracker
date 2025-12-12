'use client';

/**
 * Student List Table Component
 *
 * Story 4-I: Student List Page - Room Format
 *
 * Displays all DAEP students with expandable rows for quick note entry.
 * Features:
 * - Row click navigates to student profile
 * - Chevron expansion shows inline entry panel + recent activity
 * - Avatar with initials (future: student photo)
 * - Sortable columns
 */

import { useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { InlineStudentPanel } from '@/components/daep/roster/InlineStudentPanel';
import { cn } from '@/lib/utils';
import type { DAEPStudent } from '@/app/actions/daep/students';
import type { PlacementStatus } from '@/lib/validation/schemas';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';

interface StudentListTableProps {
  students: DAEPStudent[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  sortConfig: { key: SortKey; direction: 'asc' | 'desc' };
  onSort: (key: SortKey) => void;
  // Story 4-I: Expansion support
  behaviorCategories?: BehaviorCategory[];
}

type SortKey = 'name' | 'school_id' | 'status' | 'home_campus' | 'days_remaining' | 'room';

const STATUS_BADGE_CLASSES: Record<PlacementStatus, string> = {
  pending: 'bg-[rgb(var(--daep-warning))]/15 text-[rgb(var(--daep-warning))]',
  active: 'bg-[rgb(var(--daep-success))]/15 text-[rgb(var(--daep-success))]',
  met: 'bg-[rgb(var(--daep-info))]/15 text-[rgb(var(--daep-info))]',
  complete: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<PlacementStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  met: 'Requirements Met',
  complete: 'Complete',
};

function getDaysRemainingColor(daysRemaining: number | null): string {
  if (daysRemaining === null) return 'text-muted-foreground';
  if (daysRemaining > 10) return 'text-[rgb(var(--daep-success))]';
  if (daysRemaining >= 5) return 'text-[rgb(var(--daep-warning))]';
  return 'text-[rgb(var(--daep-danger))]';
}

// Story 4-I: Generate initials from name
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Story 4-I: Generate consistent color from student ID
function getAvatarColor(schoolId: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
  ];
  // Simple hash from school_id
  let hash = 0;
  for (let i = 0; i < schoolId.length; i++) {
    hash = schoolId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function StudentListTable({
  students,
  loading,
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  sortConfig,
  onSort,
  behaviorCategories = [],
}: StudentListTableProps) {
  const router = useRouter();
  // Story 4-I: Track which rows are expanded
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleRowClick = (schoolId: string) => {
    router.push(`/daep/students/${schoolId}`);
  };

  // Story 4-I: Toggle row expansion
  const toggleExpansion = (placementId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(placementId)) {
        next.delete(placementId);
      } else {
        next.add(placementId);
      }
      return next;
    });
  };

  const renderSortableHeader = (label: string, key: SortKey) => {
    const isActive = sortConfig.key === key;
    return (
      <button
        type="button"
        onClick={() => onSort(key)}
        className="flex items-center gap-1 text-left text-sm font-semibold text-muted-foreground hover:text-foreground"
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
        <p className="text-muted-foreground mt-4">Loading students...</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border rounded-lg bg-muted/50">
        <p className="text-muted-foreground">No students found matching your criteria</p>
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
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4">{renderSortableHeader('Name', 'name')}</th>
                <th className="text-left p-4">{renderSortableHeader('Student ID', 'school_id')}</th>
                <th className="text-left p-4">{renderSortableHeader('Status', 'status')}</th>
                <th className="text-left p-4">
                  {renderSortableHeader('Home Campus', 'home_campus')}
                </th>
                <th className="text-left p-4">
                  {renderSortableHeader('Days Remaining', 'days_remaining')}
                </th>
                <th className="text-left p-4">{renderSortableHeader('Room', 'room')}</th>
                {/* Story 4-I: Expand column */}
                <th className="w-16 text-center p-4">Expand</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student, index) => {
                const rowBg = index % 2 === 0 ? 'bg-card' : 'bg-muted/30';
                const placement = student.placement;
                const studentKey = `${student.school_id}-${placement?.id || 'no-placement'}`;
                const isExpanded = placement?.id ? expandedRows.has(placement.id) : false;
                const studentName = `${student.last_name}, ${student.first_name}`;
                const initials = getInitials(student.first_name, student.last_name);
                const avatarColor = getAvatarColor(student.school_id);

                return (
                  <Fragment key={studentKey}>
                    <tr
                      className={cn(
                        rowBg,
                        'hover:bg-[rgb(var(--daep-primary))]/20 transition-colors cursor-pointer',
                        isExpanded && 'bg-[rgb(var(--daep-primary))]/20'
                      )}
                      onClick={() => handleRowClick(student.school_id)}
                    >
                      {/* Name column with avatar */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {/* Story 4-I: Avatar with initials */}
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className={cn(avatarColor, 'text-white text-xs font-medium')}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {student.last_name}, {student.first_name}
                            </div>
                            {student.grade_level && (
                              <div className="text-sm text-muted-foreground">
                                Grade {student.grade_level}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{student.school_id}</td>
                      <td className="p-4">
                        {placement ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_BADGE_CLASSES[placement.status]
                            }`}
                          >
                            {STATUS_LABELS[placement.status]}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {placement?.home_campus?.name || student.current_school || '—'}
                      </td>
                      <td className="p-4">
                        {placement ? (
                          <span
                            className={`font-medium ${getDaysRemainingColor(
                              placement.days_remaining
                            )}`}
                          >
                            {placement.days_remaining ?? '—'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {placement?.room ? (
                          <span>
                            {placement.room.room_number}
                            {placement.room.room_name && (
                              <span className="opacity-70 ml-1">
                                ({placement.room.room_name})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      {/* Story 4-I: Expand button */}
                      <td
                        className="p-4 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (placement?.id) {
                            toggleExpansion(placement.id);
                          }
                        }}
                      >
                        {placement?.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    </tr>
                    {/* Story 4-I: Expanded inline panel */}
                    {isExpanded && placement?.id && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <InlineStudentPanel
                            placementId={placement.id}
                            studentName={studentName}
                            schoolId={student.school_id}
                            categories={behaviorCategories}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total}{' '}
          students
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
