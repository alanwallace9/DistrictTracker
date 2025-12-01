'use client';

import { useRouter } from 'next/navigation';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DAEPStudent } from '@/app/actions/daep/students';
import type { PlacementStatus } from '@/lib/validation/schemas';

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
}: StudentListTableProps) {
  const router = useRouter();

  const handleRowClick = (schoolId: string) => {
    router.push(`/daep/students/${schoolId}`);
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
            <thead className="bg-muted/50">
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
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student, index) => {
                const rowBg = index % 2 === 0 ? 'bg-card' : 'bg-muted/30';
                const placement = student.placement;

                return (
                  <tr
                    key={`${student.school_id}-${placement?.id || 'no-placement'}`}
                    className={`${rowBg} hover:bg-accent transition-colors cursor-pointer`}
                    onClick={() => handleRowClick(student.school_id)}
                  >
                    <td className="p-4">
                      <div className="font-medium">
                        {student.last_name}, {student.first_name}
                      </div>
                      {student.grade_level && (
                        <div className="text-sm text-muted-foreground">
                          Grade {student.grade_level}
                        </div>
                      )}
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
