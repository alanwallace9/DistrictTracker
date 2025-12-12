'use client';

/**
 * DAEP Students Page
 *
 * Story 4-I: Student List Page - Room Format
 *
 * All DAEP students with expandable rows for quick note entry.
 * Quick Wins:
 * - Default to Active status filter
 * - Student count badge in header
 * - Quick stats bar with clickable chips
 * - Home campus filter
 * - Row avatars with initials
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, Users } from 'lucide-react';
import { StudentFilters } from '@/components/daep/StudentFilters';
import { StudentListTable } from '@/components/daep/StudentListTable';
import { cn } from '@/lib/utils';
import {
  getDAEPStudents,
  getDAEPRoomsForFilter,
  type DAEPStudent,
  type DAEPStudentListResult,
} from '@/app/actions/daep/students';
import { getBehaviorCategories, type BehaviorCategory } from '@/app/actions/daep/behavior-categories';
import type { PlacementStatus } from '@/lib/validation/schemas';

type SortKey = 'name' | 'school_id' | 'status' | 'home_campus' | 'days_remaining' | 'room';

// Story 4-I: Status counts for quick stats bar
interface StatusCounts {
  active: number;
  pending: number;
  met: number;
  complete: number;
  total: number;
}

export default function DAEPStudentsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Data state
  const [students, setStudents] = useState<DAEPStudent[]>([]);
  const [rooms, setRooms] = useState<{ id: string; room_number: string; room_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  // Story 4-I: Behavior categories for expansion panel
  const [behaviorCategories, setBehaviorCategories] = useState<BehaviorCategory[]>([]);
  // Story 4-I: Status counts for quick stats
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    active: 0,
    pending: 0,
    met: 0,
    complete: 0,
    total: 0,
  });

  // Filter state - Story 4-I: Default to 'active' status
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlacementStatus | 'all'>('active');
  const [roomFilter, setRoomFilter] = useState<string | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  // Sort state
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  });

  // Debounce search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch rooms and behavior categories for filter dropdown and expansion panel
  const fetchInitialData = useCallback(async () => {
    try {
      const [roomsData, categoriesData] = await Promise.all([
        getDAEPRoomsForFilter(),
        getBehaviorCategories(),
      ]);
      setRooms(roomsData);
      setBehaviorCategories(categoriesData);
    } catch (error: any) {
      console.error('Failed to fetch initial data:', error);
    }
  }, []);

  // Story 4-I: Fetch status counts for quick stats bar (all statuses, no filter)
  const fetchStatusCounts = useCallback(async () => {
    try {
      // Fetch all students without status filter to get accurate counts
      const [activeResult, pendingResult, metResult, completeResult] = await Promise.all([
        getDAEPStudents({ status: 'active', per_page: 1 }),
        getDAEPStudents({ status: 'pending', per_page: 1 }),
        getDAEPStudents({ status: 'met', per_page: 1 }),
        getDAEPStudents({ status: 'complete', per_page: 1 }),
      ]);
      setStatusCounts({
        active: activeResult.total,
        pending: pendingResult.total,
        met: metResult.total,
        complete: completeResult.total,
        total: activeResult.total + pendingResult.total + metResult.total + completeResult.total,
      });
    } catch (error: any) {
      console.error('Failed to fetch status counts:', error);
    }
  }, []);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const result: DAEPStudentListResult = await getDAEPStudents({
        query: debouncedSearchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        room_id: roomFilter !== 'all' ? roomFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        per_page: perPage,
      });

      // Sort locally since API doesn't support all sort keys
      const sorted = sortStudents(result.students, sortConfig);
      setStudents(sorted);
      setTotal(result.total);
      setTotalPages(result.total_pages);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, statusFilter, roomFilter, dateFrom, dateTo, page, sortConfig, toast]);

  // Initial load
  useEffect(() => {
    fetchInitialData();
    fetchStatusCounts();
  }, [fetchInitialData, fetchStatusCounts]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Sort students locally
  const sortStudents = (
    studentList: DAEPStudent[],
    config: { key: SortKey; direction: 'asc' | 'desc' }
  ): DAEPStudent[] => {
    return [...studentList].sort((a, b) => {
      const multiplier = config.direction === 'asc' ? 1 : -1;

      switch (config.key) {
        case 'name':
          const nameA = `${a.last_name}, ${a.first_name}`.toLowerCase();
          const nameB = `${b.last_name}, ${b.first_name}`.toLowerCase();
          return nameA.localeCompare(nameB) * multiplier;

        case 'school_id':
          return a.school_id.localeCompare(b.school_id) * multiplier;

        case 'status':
          const statusOrder: Record<string, number> = { pending: 1, active: 2, met: 3, complete: 4 };
          const statusA = a.placement?.status ? (statusOrder[a.placement.status] ?? 5) : 5;
          const statusB = b.placement?.status ? (statusOrder[b.placement.status] ?? 5) : 5;
          return (statusA - statusB) * multiplier;

        case 'home_campus':
          const campusA = (
            a.placement?.home_campus?.name ||
            a.current_school ||
            ''
          ).toLowerCase();
          const campusB = (
            b.placement?.home_campus?.name ||
            b.current_school ||
            ''
          ).toLowerCase();
          return campusA.localeCompare(campusB) * multiplier;

        case 'days_remaining':
          const daysA = a.placement?.days_remaining ?? 9999;
          const daysB = b.placement?.days_remaining ?? 9999;
          return (daysA - daysB) * multiplier;

        case 'room':
          const roomA = a.placement?.room?.room_number || 'zzz';
          const roomB = b.placement?.room?.room_number || 'zzz';
          return roomA.localeCompare(roomB) * multiplier;

        default:
          return 0;
      }
    });
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRoomFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  // Story 4-I: hasActiveFilters - default status is 'active', so only count as active filter if not 'active' or 'all'
  const hasActiveFilters =
    searchQuery.length > 0 ||
    (statusFilter !== 'all' && statusFilter !== 'active') ||
    roomFilter !== 'all' ||
    dateFrom.length > 0 ||
    dateTo.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5" />
            DAEP Students
            {/* Story 4-I: Student count badge */}
            <Badge variant="secondary" className="ml-2 text-xs font-normal">
              {statusCounts.active} Active / {statusCounts.total} Total
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage students with DAEP placements
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStudents();
              fetchStatusCounts();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => router.push('/daep/placements/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Placement
          </Button>
        </div>
      </div>

      {/* Story 4-I: Quick Stats Bar - clickable status chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setStatusFilter('active');
            setPage(1);
          }}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            statusFilter === 'active'
              ? 'bg-[rgb(var(--daep-success))]/15 text-[rgb(var(--daep-success))] ring-1 ring-[rgb(var(--daep-success))]/30'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          Active ({statusCounts.active})
        </button>
        <button
          type="button"
          onClick={() => {
            setStatusFilter('pending');
            setPage(1);
          }}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            statusFilter === 'pending'
              ? 'bg-[rgb(var(--daep-warning))]/15 text-[rgb(var(--daep-warning))] ring-1 ring-[rgb(var(--daep-warning))]/30'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          Pending ({statusCounts.pending})
        </button>
        <button
          type="button"
          onClick={() => {
            setStatusFilter('met');
            setPage(1);
          }}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            statusFilter === 'met'
              ? 'bg-[rgb(var(--daep-info))]/15 text-[rgb(var(--daep-info))] ring-1 ring-[rgb(var(--daep-info))]/30'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          Met ({statusCounts.met})
        </button>
        <button
          type="button"
          onClick={() => {
            setStatusFilter('complete');
            setPage(1);
          }}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            statusFilter === 'complete'
              ? 'bg-muted/80 text-foreground ring-1 ring-border'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          Complete ({statusCounts.complete})
        </button>
        <button
          type="button"
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            statusFilter === 'all'
              ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          All ({statusCounts.total})
        </button>
      </div>

      {/* Filters */}
      <StudentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={(status) => {
          setStatusFilter(status);
          setPage(1);
        }}
        roomFilter={roomFilter}
        onRoomChange={(roomId) => {
          setRoomFilter(roomId);
          setPage(1);
        }}
        dateFrom={dateFrom}
        onDateFromChange={(date) => {
          setDateFrom(date);
          setPage(1);
        }}
        dateTo={dateTo}
        onDateToChange={(date) => {
          setDateTo(date);
          setPage(1);
        }}
        rooms={rooms}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Student List Table */}
      <StudentListTable
        students={students}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={handlePageChange}
        sortConfig={sortConfig}
        onSort={handleSort}
        behaviorCategories={behaviorCategories}
      />
    </div>
  );
}
