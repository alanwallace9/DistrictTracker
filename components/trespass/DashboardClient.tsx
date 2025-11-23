'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { RecordsTable } from '@/components/RecordsTable';
import { RecordCard } from '@/components/RecordCard';
import { RecordDetailDialog } from '@/components/RecordDetailDialog';
import { TrespassRecord } from '@/lib/supabase';
import { useDebounce } from '@/hooks/useDebounce';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type DashboardClientProps = {
  initialRecords: TrespassRecord[];
  onRefresh: () => Promise<void>;
};

export function DashboardClient({ initialRecords, onRefresh }: DashboardClientProps) {
  const [selectedRecord, setSelectedRecord] = useState<TrespassRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('card');
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce search query with 300ms delay
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter, showExpiringOnly, pageSize]);

  const handleViewRecord = (record: TrespassRecord) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);
  };

  const isExpired = (record: TrespassRecord) => {
    return record.expiration_date && new Date(record.expiration_date) < new Date();
  };

  const isExpiringWithinWeek = (record: TrespassRecord) => {
    if (!record.expiration_date || record.status !== 'active') return false;
    const now = new Date();
    const expirationDate = new Date(record.expiration_date);
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);
    return expirationDate > now && expirationDate <= oneWeekFromNow;
  };

  // Step 1: Group records by school_id and get most recent incident per person
  const groupedRecords = initialRecords.reduce((acc, record) => {
    const key = record.school_id || `no-id-${record.id}`; // Use unique key if no school_id

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(record);
    return acc;
  }, {} as Record<string, TrespassRecord[]>);

  // Step 2: Get most recent incident for each person (NO merging of data)
  const deduplicatedRecords = Object.values(groupedRecords).map((incidents) => {
    // Sort incidents by created_at DESC to get most recent first
    const sorted = incidents.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // Most recent first
    });

    // Return ONLY the most recent incident with incident count
    // NO data merging - each incident shows its own data
    return {
      ...sorted[0],
      incident_count: incidents.length, // Add incident count for badge
    };
  });

  // Step 3: Apply filters and sorting to deduplicated records
  const filteredRecords = deduplicatedRecords
    .filter((record) => {
      // Filter by expiring warnings if that view is active
      if (showExpiringOnly && !isExpiringWithinWeek(record)) {
        return false;
      }

      // Only search if query is empty or has 4+ characters
      const matchesSearch =
        debouncedSearchQuery.length === 0 ||
        debouncedSearchQuery.length >= 4
          ? record.first_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            record.last_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            record.school_id?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            (record.incident_location?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ?? false)
          : true; // Show all records if less than 4 characters

      const recordStatus = isExpired(record) ? 'inactive' : record.status;
      const matchesStatus = statusFilter === 'all' || recordStatus === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // If showing expiring only, sort by expiration date (earliest first)
      if (showExpiringOnly) {
        const dateA = a.expiration_date ? new Date(a.expiration_date).getTime() : Infinity;
        const dateB = b.expiration_date ? new Date(b.expiration_date).getTime() : Infinity;
        return dateA - dateB;
      }

      // Otherwise sort alphabetically by last name, then first name
      const lastNameCompare = a.last_name.toLowerCase().localeCompare(b.last_name.toLowerCase());
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.first_name.toLowerCase().localeCompare(b.first_name.toLowerCase());
    });

  // Pagination calculations
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  const stats = {
    total: initialRecords.length,
    active: initialRecords.filter((r) => r.status === 'active' && !isExpired(r)).length,
    inactive: initialRecords.filter((r) => r.status === 'inactive' || isExpired(r)).length,
  };

  const handleShowExpiring = () => {
    setShowExpiringOnly(!showExpiringOnly);
    // Reset other filters and switch to list view when viewing expiring warnings
    if (!showExpiringOnly) {
      setSearchQuery('');
      setStatusFilter('active');
      setViewMode('list');
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5; // Maximum number of page buttons to show

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <DashboardLayout
      onRefresh={onRefresh}
      stats={stats}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      filteredCount={filteredRecords.length}
      records={initialRecords}
      onShowExpiring={handleShowExpiring}
      showExpiringOnly={showExpiringOnly}
    >
      <div className="space-y-6">
        {/* Records Display */}
        {viewMode === 'list' ? (
          <RecordsTable records={paginatedRecords} onViewRecord={handleViewRecord} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedRecords.map((record) => (
              <RecordCard key={record.id} record={record} onViewRecord={handleViewRecord} />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalRecords > 0 && (
          <div className="flex items-center justify-between border-t pt-4">
            {/* Left: Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Show</span>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-[70px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="75">75</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-600">
                per page • Showing {startIndex + 1}-{Math.min(endIndex, totalRecords)} of {totalRecords}
              </span>
            </div>

            {/* Right: Page Numbers */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {getPageNumbers().map((page, index) =>
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-slate-400">
                    ...
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page as number)}
                    className="h-9 min-w-[36px]"
                  >
                    {page}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <RecordDetailDialog
        record={selectedRecord}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onRecordUpdated={onRefresh}
      />
    </DashboardLayout>
  );
}
