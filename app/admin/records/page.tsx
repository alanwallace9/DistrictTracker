'use client';

import { useEffect, useState } from 'react';
import { getRecordsForAdmin, deleteRecordAdmin, exportRecordsToCSV, type AdminRecordListItem } from '@/app/actions/admin/records';
import { getCampuses } from '@/app/actions/admin/campuses';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Campus } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Edit2, Trash2, Plus, RefreshCw, Download, Upload, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { AddRecordDialog } from '@/components/AddRecordDialog';
import { RecordDetailDialog } from '@/components/RecordDetailDialog';
import { CSVUploadDialog } from '@/components/CSVUploadDialog';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function RecordsManagementPage() {
  const { selectedTenantId } = useAdminTenant();
  const { user } = useAuth();
  const filterFieldClasses = 'bg-white border border-slate-300 shadow-sm text-slate-900 placeholder:text-slate-500';
  const selectFieldClasses = 'bg-white border border-slate-300 shadow-sm text-slate-900 focus:ring-2 focus:ring-slate-200';
  const [records, setRecords] = useState<AdminRecordListItem[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AdminRecordListItem[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AdminRecordListItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<'name' | 'school_id' | 'campus' | 'status' | 'expiration' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();

  const isMasterAdmin = user?.user_metadata?.role === 'master_admin';
  const isDistrictAdmin = user?.user_metadata?.role === 'district_admin';
  const hasAdminAccess = isMasterAdmin || isDistrictAdmin;

  useEffect(() => {
    if (selectedTenantId) {
      fetchData();
    }
  }, [selectedTenantId]);

  useEffect(() => {
    filterRecords();
    setCurrentPage(1); // Reset to first page when filters change
  }, [records, searchQuery, campusFilter, statusFilter, sortField, sortDirection]);

  const fetchData = async () => {
    if (!selectedTenantId) return;
    setLoading(true);
    try {
      const [recordsResult, campusesData] = await Promise.all([
        getRecordsForAdmin({ tenantId: selectedTenantId }),
        getCampuses(selectedTenantId),
      ]);
      setRecords(recordsResult.records);
      setCampuses(campusesData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (record) =>
          record.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.school_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by campus
    if (campusFilter !== 'all') {
      filtered = filtered.filter((record) => record.campus_id === campusFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((record) => {
        if (statusFilter === 'active') {
          return record.status === 'active' && (!record.expiration_date || new Date(record.expiration_date) >= now);
        } else if (statusFilter === 'inactive') {
          return record.status === 'inactive';
        } else if (statusFilter === 'expired') {
          return record.status === 'active' && record.expiration_date && new Date(record.expiration_date) < now;
        }
        return true;
      });
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'name':
            aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
            bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case 'school_id':
            aValue = a.school_id?.toLowerCase() || '';
            bValue = b.school_id?.toLowerCase() || '';
            break;
          case 'campus':
            aValue = a.campus_name?.toLowerCase() || '';
            bValue = b.campus_name?.toLowerCase() || '';
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'expiration':
            aValue = a.expiration_date ? new Date(a.expiration_date).getTime() : 0;
            bValue = b.expiration_date ? new Date(b.expiration_date).getTime() : 0;
            break;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredRecords(filtered);
  };

  const handleSort = (field: 'name' | 'school_id' | 'campus' | 'status' | 'expiration') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: 'name' | 'school_id' | 'campus' | 'status' | 'expiration') => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 ml-1 text-slate-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1" />
    );
  };

  const handleViewClick = (record: AdminRecordListItem) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);
  };

  const handleDeleteClick = (record: AdminRecordListItem) => {
    setSelectedRecord(record);
    setDeleteConfirmText('');
    setDeleteDialogOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord) return;
    if (deleteConfirmText !== 'DELETE') {
      toast({
        title: 'Error',
        description: 'Please type DELETE to confirm',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      await deleteRecordAdmin(selectedRecord.id);

      toast({
        title: 'Success',
        description: 'Record deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeleteConfirmText('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvContent = await exportRecordsToCSV({
        tenantId: selectedTenantId || undefined,
        campusId: campusFilter !== 'all' ? campusFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter as any : undefined,
        search: searchQuery || undefined,
      });

      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `trespass-records-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Success',
        description: `Exported ${filteredRecords.length} records to CSV`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getStatusBadge = (record: AdminRecordListItem) => {
    const now = new Date();
    const isExpired = record.expiration_date && new Date(record.expiration_date) < now;

    if (record.status === 'inactive' || isExpired) {
      return <Badge className="bg-status-inactive text-white">Inactive</Badge>;
    }
    return <Badge className="bg-status-active text-white">Active</Badge>;
  };

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Records Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage trespass records, bulk upload, and export data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || filteredRecords.length === 0}
            className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkUploadDialogOpen(true)}
            className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search by name or school ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 ${filterFieldClasses}`}
            />
          </div>
        </div>
        <Select value={campusFilter} onValueChange={setCampusFilter}>
          <SelectTrigger className={`w-[200px] ${selectFieldClasses}`}>
            <SelectValue placeholder="All Campuses" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-300 shadow-lg">
            <SelectItem value="all" className="hover:bg-slate-100">All Campuses</SelectItem>
            {campuses.map((campus) => (
              <SelectItem key={campus.id} value={campus.id} className="hover:bg-slate-100">
                {campus.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={`w-[200px] ${selectFieldClasses}`}>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-300 shadow-lg">
            <SelectItem value="all" className="hover:bg-slate-100">All Statuses</SelectItem>
            <SelectItem value="active" className="hover:bg-slate-100">Active</SelectItem>
            <SelectItem value="inactive" className="hover:bg-slate-100">Inactive</SelectItem>
            <SelectItem value="expired" className="hover:bg-slate-100">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400" />
            <p className="mt-2 text-slate-500">Loading records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500">No records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Photo
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('school_id')}
                  >
                    <div className="flex items-center">
                      School ID
                      {getSortIcon('school_id')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('campus')}
                  >
                    <div className="flex items-center">
                      Campus
                      {getSortIcon('campus')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                    onClick={() => handleSort('expiration')}
                  >
                    <div className="flex items-center">
                      Expiration
                      {getSortIcon('expiration')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {record.photo ? (
                        <img
                          src={record.photo}
                          alt={`${record.first_name} ${record.last_name}`}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-semibold">
                          {record.first_name.charAt(0)}{record.last_name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {record.first_name} {record.last_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {record.school_id || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {record.campus_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(record)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      {record.expiration_date ? format(new Date(record.expiration_date), 'MM/dd/yy') : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClick(record)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(record)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredRecords.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-500">
                {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8"
              >
                Previous
              </Button>
              <span className="text-sm text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Upload Dialog */}
      <CSVUploadDialog
        open={bulkUploadDialogOpen}
        onOpenChange={setBulkUploadDialogOpen}
        onRecordsUploaded={fetchData}
      />

      {/* Add Record Dialog */}
      <AddRecordDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            fetchData();
          }
        }}
        onRecordAdded={() => {
          setAddDialogOpen(false);
          fetchData();
        }}
      />

      {/* Record Detail/Edit Dialog */}
      {selectedRecord && (
        <RecordDetailDialog
          record={selectedRecord}
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open);
            if (!open) {
              setSelectedRecord(null);
              fetchData();
            }
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Delete Record</DialogTitle>
            <DialogDescription className="text-slate-600">
              This action will permanently delete this trespass record. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRecord && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Name:</span> {selectedRecord.first_name} {selectedRecord.last_name}
                </p>
                {selectedRecord.school_id && (
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="font-semibold">School ID:</span> {selectedRecord.school_id}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Type DELETE to confirm:
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className={filterFieldClasses}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmText('');
              }}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteRecord}
              disabled={deleteConfirmText !== 'DELETE' || isUpdating}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isUpdating ? 'Deleting...' : 'Delete Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
