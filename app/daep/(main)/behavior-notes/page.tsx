'use client';

/**
 * Behavior Notes List Page
 *
 * Story 4-3: Behavior Notes List View
 *
 * Admin review page for all behavior notes with:
 * - Search and filters
 * - Quick filter chips (Today, This Week, Negative, My Notes)
 * - Summary stats bar (total, today, negative, unverified)
 * - "X new" badge for notes since last visit
 * - Sortable table with pagination
 * - Detail sheet on row click
 * - CSV export
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { Download, RefreshCw, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  BehaviorNotesFilters,
  BehaviorNotesTable,
  BehaviorNoteDetailSheet,
  QuickFilterChips,
  SummaryStatsBar,
  NewNotesBadge,
} from '@/components/daep/behavior-notes';
import type { QuickFilter } from '@/components/daep/behavior-notes';
import {
  getBehaviorNotesList,
  getBehaviorNotesStaffList,
  getBehaviorNotesCampusList,
  getBehaviorNotesStats,
  getNewNotesCountSince,
  exportBehaviorNotesToCSV,
  exportBehaviorNotesToPDF,
} from '@/app/actions/daep/behavior-notes';
import type {
  BehaviorNoteListItem,
  BehaviorNotesListQuery,
  BehaviorNotesStats,
  BehaviorNotesSortKey,
} from '@/lib/validation/schemas';

const LOCAL_STORAGE_KEY = 'daep_behavior_notes_last_visit';

export default function BehaviorNotesPage() {
  const { user } = useUser();
  const { toast } = useToast();

  // Data state
  const [notes, setNotes] = useState<BehaviorNoteListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState<BehaviorNotesStats>({ total: 0, today: 0, negative: 0, unverified: 0 });
  const [newNotesCount, setNewNotesCount] = useState(0);
  const [staffList, setStaffList] = useState<{ id: string; name: string; lastName: string }[]>([]);
  const [campusList, setCampusList] = useState<{ id: string; name: string }[]>([]);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryType, setCategoryType] = useState<'positive' | 'negative' | 'neutral' | 'all'>('all');
  const [campusId, setCampusId] = useState<string | 'all'>('all');
  const [staffId, setStaffId] = useState<string | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const perPage = 25;

  // Sort state
  const [sortConfig, setSortConfig] = useState<{ key: BehaviorNotesSortKey; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc',
  });

  // Detail sheet state
  const [selectedNote, setSelectedNote] = useState<BehaviorNoteListItem | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery !== '' ||
      categoryType !== 'all' ||
      campusId !== 'all' ||
      staffId !== 'all' ||
      dateFrom !== '' ||
      dateTo !== ''
    );
  }, [searchQuery, categoryType, campusId, staffId, dateFrom, dateTo]);

  // Build query from filter state
  const buildQuery = useCallback((): Partial<BehaviorNotesListQuery> => {
    const query: Partial<BehaviorNotesListQuery> = {
      page,
      per_page: perPage,
      sort_by: sortConfig.key,
      sort_direction: sortConfig.direction,
    };

    if (searchQuery) query.query = searchQuery;
    if (categoryType !== 'all') query.category_type = categoryType;
    if (campusId !== 'all') query.campus_id = campusId;
    if (staffId !== 'all') query.staff_id = staffId;
    if (dateFrom) query.date_from = dateFrom;
    if (dateTo) query.date_to = dateTo;

    return query;
  }, [page, perPage, sortConfig, searchQuery, categoryType, campusId, staffId, dateFrom, dateTo]);

  // Load initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [staffData, campusData] = await Promise.all([
          getBehaviorNotesStaffList(),
          getBehaviorNotesCampusList(),
        ]);
        setStaffList(staffData);
        setCampusList(campusData);

        // Check for new notes since last visit
        const lastVisit = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (lastVisit) {
          const count = await getNewNotesCountSince(lastVisit);
          setNewNotesCount(count);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    }

    loadInitialData();
  }, []);

  // Update last visit timestamp when page loads
  useEffect(() => {
    // Set a small delay to allow user to see "new" count before it updates
    const timer = setTimeout(() => {
      localStorage.setItem(LOCAL_STORAGE_KEY, new Date().toISOString());
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Load notes
  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const query = buildQuery();
      const result = await getBehaviorNotesList(query);
      setNotes(result.notes);
      setTotal(result.total);
      setTotalPages(result.total_pages);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load behavior notes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [buildQuery, toast]);

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const statsData = await getBehaviorNotesStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load notes when filters change
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Handle sort
  const handleSort = (key: BehaviorNotesSortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
    setPage(1);
  };

  // Handle quick filter
  const handleQuickFilter = (filter: QuickFilter | null) => {
    if (!filter) {
      setActiveQuickFilter(null);
      setDateFrom('');
      setDateTo('');
      setCategoryType('all');
      setStaffId('all');
      return;
    }

    setActiveQuickFilter(filter.label);

    // Apply filter values
    if (filter.filter.date_from) setDateFrom(filter.filter.date_from);
    if (filter.filter.date_to) setDateTo(filter.filter.date_to);
    if (filter.filter.category_type) setCategoryType(filter.filter.category_type);
    if (filter.filter.staff_id) setStaffId(filter.filter.staff_id);

    setPage(1);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryType('all');
    setCampusId('all');
    setStaffId('all');
    setDateFrom('');
    setDateTo('');
    setActiveQuickFilter(null);
    setPage(1);
  };

  // Handle row click
  const handleRowClick = (note: BehaviorNoteListItem) => {
    setSelectedNote(note);
    setDetailSheetOpen(true);
  };

  // Handle CSV export
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const filters = buildQuery();
      const result = await exportBehaviorNotesToCSV(filters);

      if (!result.success || !result.csv) {
        toast({
          title: 'Export Failed',
          description: result.error || 'Failed to export notes',
          variant: 'destructive',
        });
        return;
      }

      // Download CSV
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `behavior-notes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'Behavior notes exported to CSV',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'An error occurred during export',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // Handle PDF export (opens in new window for print)
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const filters = buildQuery();

      // Build filter display info for PDF header
      const filterDisplay: {
        searchQuery?: string;
        categoryType?: string;
        campusName?: string;
        staffName?: string;
        dateFrom?: string;
        dateTo?: string;
      } = {};

      if (searchQuery) filterDisplay.searchQuery = searchQuery;
      if (categoryType !== 'all') filterDisplay.categoryType = categoryType;
      if (campusId !== 'all') {
        const campus = campusList.find((c) => c.id === campusId);
        if (campus) filterDisplay.campusName = campus.name;
      }
      if (staffId !== 'all') {
        const staff = staffList.find((s) => s.id === staffId);
        if (staff) filterDisplay.staffName = staff.name;
      }
      if (dateFrom) filterDisplay.dateFrom = dateFrom;
      if (dateTo) filterDisplay.dateTo = dateTo;

      const result = await exportBehaviorNotesToPDF(filters, filterDisplay);

      if (!result.success || !result.html) {
        toast({
          title: 'Export Failed',
          description: result.error || 'Failed to generate PDF',
          variant: 'destructive',
        });
        return;
      }

      // Open HTML in new window for print/PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(result.html);
        printWindow.document.close();
        // Trigger print dialog after content loads
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        toast({
          title: 'Popup Blocked',
          description: 'Please allow popups to export PDF',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: 'An error occurred during PDF export',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    loadNotes();
    loadStats();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Behavior Notes</h1>
          <NewNotesBadge count={newNotesCount} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting || loading}>
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export'}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-muted-foreground -mt-4">
        Review all behavior notes across DAEP students
      </p>

      {/* Stats Bar */}
      <SummaryStatsBar stats={stats} loading={statsLoading} />

      {/* Quick Filter Chips */}
      <QuickFilterChips
        activeFilter={activeQuickFilter}
        onFilterSelect={handleQuickFilter}
        currentUserId={user?.id}
      />

      {/* Filters */}
      <BehaviorNotesFilters
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        categoryType={categoryType}
        onCategoryTypeChange={(value) => {
          setCategoryType(value);
          setActiveQuickFilter(null);
          setPage(1);
        }}
        campusId={campusId}
        onCampusChange={(value) => {
          setCampusId(value);
          setPage(1);
        }}
        staffId={staffId}
        onStaffChange={(value) => {
          setStaffId(value);
          setActiveQuickFilter(null);
          setPage(1);
        }}
        dateFrom={dateFrom}
        onDateFromChange={(value) => {
          setDateFrom(value);
          setActiveQuickFilter(null);
          setPage(1);
        }}
        dateTo={dateTo}
        onDateToChange={(value) => {
          setDateTo(value);
          setActiveQuickFilter(null);
          setPage(1);
        }}
        campuses={campusList}
        staffList={staffList}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Table */}
      <BehaviorNotesTable
        notes={notes}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
        sortConfig={sortConfig}
        onSort={handleSort}
        onRowClick={handleRowClick}
      />

      {/* Detail Sheet */}
      <BehaviorNoteDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        note={selectedNote}
      />
    </div>
  );
}
