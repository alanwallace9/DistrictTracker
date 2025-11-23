'use client';

import { useEffect, useState } from 'react';
import { getCampusesWithCounts, getUsersForCampus, getRecordsForCampus, activateCampus, type CampusWithCounts } from '@/app/actions/admin/campuses';
import { type AdminUserListItem } from '@/app/actions/admin/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddCampusDialog } from '@/components/AddCampusDialog';
import { EditCampusDialog } from '@/components/EditCampusDialog';
import { RecordDetailDialog } from '@/components/RecordDetailDialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import { RefreshCw, Search, Users, FileText, Plus, Pencil, CheckCircle, FileSpreadsheet, AlertTriangle, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type SortKey = 'id' | 'name' | 'status' | 'user_count' | 'record_count' | 'created_at';

export default function CampusesManagementPage() {
  const { selectedTenantId } = useAdminTenant();
  const filterFieldClasses = 'bg-white border border-slate-300 shadow-sm text-slate-900 placeholder:text-slate-500';
  const [campuses, setCampuses] = useState<CampusWithCounts[]>([]);
  const [filteredCampuses, setFilteredCampuses] = useState<CampusWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  });
  const { toast } = useToast();

  // Modal states
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [recordsModalOpen, setRecordsModalOpen] = useState(false);
  const [addCampusDialogOpen, setAddCampusDialogOpen] = useState(false);
  const [editCampusDialogOpen, setEditCampusDialogOpen] = useState(false);
  const [recordDetailOpen, setRecordDetailOpen] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<CampusWithCounts | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [modalUsers, setModalUsers] = useState<AdminUserListItem[]>([]);
  const [modalRecords, setModalRecords] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [recordsPage, setRecordsPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    if (selectedTenantId) {
      fetchCampuses();
    }
  }, [selectedTenantId]);

  useEffect(() => {
    filterCampuses();
  }, [campuses, searchQuery, sortConfig]);

  const fetchCampuses = async () => {
    if (!selectedTenantId) return;

    setLoading(true);
    try {
      const data = await getCampusesWithCounts(selectedTenantId);
      setCampuses(data);
    } catch (error) {
      console.error('Error fetching campuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCampuses = () => {
    let filtered = campuses;

    if (searchQuery) {
      filtered = filtered.filter(
        (campus) =>
          campus.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campus.id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const multiplier = direction === 'asc' ? 1 : -1;

      const valueA = a[key];
      const valueB = b[key];

      if (key === 'created_at') {
        const dateA = valueA ? new Date(valueA).getTime() : 0;
        const dateB = valueB ? new Date(valueB as string).getTime() : 0;
        return (dateA - dateB) * multiplier;
      }

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return (valueA - valueB) * multiplier;
      }

      const stringA = String(valueA ?? '').toLowerCase();
      const stringB = String(valueB ?? '').toLowerCase();
      return stringA.localeCompare(stringB) * multiplier;
    });

    setFilteredCampuses(sorted);
  };

  const handleUsersClick = async (campus: CampusWithCounts) => {
    setSelectedCampus(campus);
    setUsersModalOpen(true);
    setModalLoading(true);
    setUsersPage(1); // Reset to first page

    try {
      const users = await getUsersForCampus(campus.id);
      setModalUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleRecordsClick = async (campus: CampusWithCounts) => {
    setSelectedCampus(campus);
    setRecordsModalOpen(true);
    setModalLoading(true);
    setRecordsPage(1); // Reset to first page

    try {
      const records = await getRecordsForCampus(campus.id);
      setModalRecords(records);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleRecordClick = (record: any) => {
    setSelectedRecord(record);
    setRecordDetailOpen(true);
  };

  const handleRecordDetailClose = async (open: boolean) => {
    setRecordDetailOpen(open);
    if (!open) {
      setSelectedRecord(null);

      // Refresh the records list in case the record was edited
      if (selectedCampus) {
        setModalLoading(true);
        try {
          const records = await getRecordsForCampus(selectedCampus.id);
          setModalRecords(records);
        } catch (error) {
          console.error('Error refreshing records:', error);
        } finally {
          setModalLoading(false);
        }
      }

      // Also refresh the campus counts in case status changed
      fetchCampuses();
    }
  };

  const handleEditClick = (campus: CampusWithCounts) => {
    setSelectedCampus(campus);
    setEditCampusDialogOpen(true);
  };

  const handleActivateClick = async (campus: CampusWithCounts) => {
    try {
      await activateCampus(campus.id);
      toast({
        title: 'Success',
        description: 'Campus activated successfully',
      });
      fetchCampuses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate campus',
        variant: 'destructive',
      });
    }
  };

  const handleDialogSuccess = () => {
    fetchCampuses();
  };

  const exportRecordsToExcel = (records: any[], campusName: string) => {
    const data = records.map(r => ({
      'Student ID': r.school_id,
      'First Name': r.first_name,
      'Last Name': r.last_name,
      'Date of Birth': r.date_of_birth ? format(new Date(r.date_of_birth), 'yyyy-MM-dd') : '',
      'Incident Date': r.incident_date ? format(new Date(r.incident_date), 'yyyy-MM-dd') : '',
      'Expiration Date': format(new Date(r.expiration_date), 'yyyy-MM-dd'),
      'Status': r.status,
      'Trespassed From': r.trespassed_from,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Records');

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Student ID
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 12 }, // DOB
      { wch: 12 }, // Incident Date
      { wch: 12 }, // Expiration
      { wch: 10 }, // Status
      { wch: 25 }, // Trespassed From
    ];

    XLSX.writeFile(wb, `${campusName.replace(/\s+/g, '-')}-records-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: 'Success',
      description: `Exported ${records.length} records to Excel`,
    });
  };

  const exportRecordsToPDF = (records: any[], campusName: string) => {
    const doc = new jsPDF('landscape');

    // Add header
    doc.setFontSize(16);
    doc.text(`Trespass Records at ${campusName}`, 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38); // Red color
    doc.text('CONFIDENTIAL - FERPA PROTECTED', 14, 22);

    doc.setTextColor(0, 0, 0); // Reset to black
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 28);
    doc.text(`Total Records: ${records.length}`, 14, 34);

    // Prepare table data
    const tableData = records.map(r => [
      r.school_id,
      `${r.first_name} ${r.last_name}`,
      r.date_of_birth ? format(new Date(r.date_of_birth), 'MM/dd/yyyy') : '',
      r.incident_date ? format(new Date(r.incident_date), 'MM/dd/yyyy') : '',
      format(new Date(r.expiration_date), 'MM/dd/yyyy'),
      r.status,
    ]);

    // Add table
    autoTable(doc, {
      startY: 38,
      head: [['Student ID', 'Name', 'DOB', 'Incident Date', 'Expires', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 38, 38] }, // Red header for FERPA
    });

    // Add footer watermark
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('CONFIDENTIAL', (doc as any).internal.pageSize.width / 2, (doc as any).internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`${campusName.replace(/\s+/g, '-')}-records-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    toast({
      title: 'Success',
      description: `Exported ${records.length} records to PDF`,
    });
  };

  // Pagination calculations
  const paginatedUsers = modalUsers.slice(
    (usersPage - 1) * ITEMS_PER_PAGE,
    usersPage * ITEMS_PER_PAGE
  );
  const totalUsersPages = Math.ceil(modalUsers.length / ITEMS_PER_PAGE);

  const paginatedRecords = modalRecords.slice(
    (recordsPage - 1) * ITEMS_PER_PAGE,
    recordsPage * ITEMS_PER_PAGE
  );
  const totalRecordsPages = Math.ceil(modalRecords.length / ITEMS_PER_PAGE);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const renderSortableHeader = (label: string, key: SortKey) => {
    const isActive = sortConfig.key === key;
    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="flex items-center gap-1 text-left text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <span>{label}</span>
        {isActive ? (
          <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campus Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage campus locations and assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCampuses}
            className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddCampusDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Campus
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by campus name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`pl-10 ${filterFieldClasses}`}
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading campuses...</p>
        </div>
      ) : filteredCampuses.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <p className="text-muted-foreground">No campuses found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto overflow-y-auto max-h-[640px]">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left p-4 font-medium">{renderSortableHeader('ID', 'id')}</th>
                  <th className="text-left p-4 font-medium">{renderSortableHeader('Name', 'name')}</th>
                  <th className="text-left p-4 font-medium">{renderSortableHeader('Status', 'status')}</th>
                  <th className="text-left p-4 font-medium w-[120px]">{renderSortableHeader('Users', 'user_count')}</th>
                  <th className="text-left p-4 font-medium w-[120px]">{renderSortableHeader('Records', 'record_count')}</th>
                  <th className="text-left p-4 font-medium">{renderSortableHeader('Created', 'created_at')}</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCampuses.map((campus, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                  return (
                    <tr key={campus.id} className={`${rowBg} hover:bg-slate-100 transition-colors`}>
                      <td className="p-4 font-mono text-sm w-[120px]">{campus.id}</td>
                      <td className="p-4 font-medium w-[280px]">{campus.name}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          campus.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {campus.status}
                        </span>
                      </td>
                      <td className="p-4 w-[120px]">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
                          onClick={() => handleUsersClick(campus)}
                          disabled={campus.user_count === 0}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          {campus.user_count}
                        </Button>
                      </td>
                      <td className="p-4 w-[120px]">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
                          onClick={() => handleRecordsClick(campus)}
                          disabled={campus.record_count === 0}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          {campus.record_count}
                        </Button>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(campus.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(campus)}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {campus.status === 'inactive' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleActivateClick(campus)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Activate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Showing {filteredCampuses.length} of {campuses.length} campuses
      </div>

      {/* Users Modal */}
      <Dialog open={usersModalOpen} onOpenChange={setUsersModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Users at {selectedCampus?.name}</DialogTitle>
            <DialogDescription>
              {selectedCampus?.user_count} user{selectedCampus?.user_count !== 1 ? 's' : ''} assigned to this campus
            </DialogDescription>
          </DialogHeader>
          {modalLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="overflow-y-auto max-h-[60vh]">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="p-3">{user.display_name || '—'}</td>
                          <td className="p-3 text-sm">{user.email}</td>
                          <td className="p-3 text-sm">{user.role.replace('_', ' ')}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : user.status === 'invited'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No users assigned to this campus
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalUsersPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(usersPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(usersPage * ITEMS_PER_PAGE, modalUsers.length)} of {modalUsers.length} users
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                      disabled={usersPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {usersPage} of {totalUsersPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage(p => Math.min(totalUsersPages, p + 1))}
                      disabled={usersPage === totalUsersPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Records Modal */}
      <Dialog open={recordsModalOpen} onOpenChange={setRecordsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-end justify-between">
              <div className="flex-1">
                <DialogTitle>Trespass Records at {selectedCampus?.name}</DialogTitle>
                <DialogDescription>
                  {selectedCampus?.record_count} record{selectedCampus?.record_count !== 1 ? 's' : ''} for this campus
                </DialogDescription>
              </div>
              {/* Export Buttons */}
              {!modalLoading && (
                <div className="flex gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportRecordsToExcel(modalRecords, selectedCampus?.name || 'Campus')}
                    disabled={modalRecords.length === 0}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportRecordsToPDF(modalRecords, selectedCampus?.name || 'Campus')}
                    disabled={modalRecords.length === 0}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {modalLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <>
              {/* FERPA Warning Banner */}
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900">FERPA Protected Data</p>
                  <p className="text-xs text-yellow-800 mt-1">
                    This information contains student educational records. Handle according to FERPA guidelines and your district's privacy policies. All access is logged.
                  </p>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Incident Date</th>
                      <th className="text-left p-3 font-medium">Expiration Date</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedRecords.length > 0 ? (
                      paginatedRecords.map((record) => (
                        <tr
                          key={record.id}
                          onClick={() => handleRecordClick(record)}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-3">
                            {record.first_name} {record.last_name}
                          </td>
                          <td className="p-3">
                            {record.incident_date ? format(new Date(record.incident_date), 'MMM d, yyyy') : 'N/A'}
                          </td>
                          <td className="p-3">{format(new Date(record.expiration_date), 'MMM d, yyyy')}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'expired'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No records found for this campus
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalRecordsPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(recordsPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(recordsPage * ITEMS_PER_PAGE, modalRecords.length)} of {modalRecords.length} records
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecordsPage(p => Math.max(1, p - 1))}
                      disabled={recordsPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {recordsPage} of {totalRecordsPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecordsPage(p => Math.min(totalRecordsPages, p + 1))}
                      disabled={recordsPage === totalRecordsPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Campus Dialog */}
      <AddCampusDialog
        open={addCampusDialogOpen}
        onOpenChange={setAddCampusDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      {/* Edit Campus Dialog */}
      <EditCampusDialog
        open={editCampusDialogOpen}
        onOpenChange={setEditCampusDialogOpen}
        campus={selectedCampus}
        onSuccess={handleDialogSuccess}
      />

      {/* Record Detail Dialog */}
      <RecordDetailDialog
        record={selectedRecord}
        open={recordDetailOpen}
        onOpenChange={handleRecordDetailClose}
      />
    </div>
  );
}
