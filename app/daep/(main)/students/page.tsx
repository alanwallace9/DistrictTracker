'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, Users } from 'lucide-react';
import { StudentFilters } from '@/components/daep/StudentFilters';
import { StudentListTable } from '@/components/daep/StudentListTable';
import {
  getDAEPStudents,
  getDAEPRoomsForFilter,
  type DAEPStudent,
  type DAEPStudentListResult,
} from '@/app/actions/daep/students';
import type { PlacementStatus } from '@/lib/validation/schemas';

type SortKey = 'name' | 'school_id' | 'status' | 'home_campus' | 'days_remaining' | 'room';

export default function DAEPStudentsPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Data state
  const [students, setStudents] = useState<DAEPStudent[]>([]);
  const [rooms, setRooms] = useState<{ id: string; room_number: string; room_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlacementStatus | 'all'>('all');
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

  // Fetch rooms for filter dropdown
  const fetchRooms = useCallback(async () => {
    try {
      const data = await getDAEPRoomsForFilter();
      setRooms(data);
    } catch (error: any) {
      console.error('Failed to fetch rooms:', error);
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
    fetchRooms();
  }, [fetchRooms]);

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
          const statusOrder = { pending: 1, active: 2, transition: 3, complete: 4 };
          const statusA = a.placement?.status ? statusOrder[a.placement.status] : 5;
          const statusB = b.placement?.status ? statusOrder[b.placement.status] : 5;
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

  const hasActiveFilters =
    searchQuery.length > 0 ||
    statusFilter !== 'all' ||
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
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage students with DAEP placements
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStudents}
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
      />
    </div>
  );
}
