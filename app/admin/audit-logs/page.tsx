'use client';

import { useEffect, useState } from 'react';
import { getAuditLogs, type AuditLog, type AuditLogFilters } from '@/app/actions/admin/audit-logs';
import { getCampuses, type Campus } from '@/app/actions/campuses';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Download, FileText, Table, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

const EVENT_TYPES = [
  { value: 'record.viewed', label: 'Record Viewed' },
  { value: 'record.created', label: 'Record Created' },
  { value: 'record.updated', label: 'Record Updated' },
  { value: 'record.deleted', label: 'Record Deleted' },
  { value: 'user.created', label: 'User Created' },
  { value: 'user.updated', label: 'User Updated' },
  { value: 'user.deleted', label: 'User Deleted' },
  { value: 'user.invited', label: 'User Invited' },
  { value: 'user.bulk_invited', label: 'Users Bulk Invited' },
];

export default function AuditLogsPage() {
  const { selectedTenantId } = useAdminTenant();
  const fieldClasses = 'bg-white border border-slate-300 shadow-sm text-slate-900 placeholder:text-slate-500';
  const selectClasses = 'bg-white border border-slate-300 shadow-sm text-slate-900 focus:ring-2 focus:ring-slate-200';
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [actorEmailInput, setActorEmailInput] = useState('');
  const [recordNameInput, setRecordNameInput] = useState('');
  const [recordIdInput, setRecordIdInput] = useState('');
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');

  useEffect(() => {
    if (selectedTenantId) {
      fetchCampuses();
    }
  }, [selectedTenantId]);

  useEffect(() => {
    if (selectedTenantId) {
      fetchLogs();
    }
  }, [selectedTenantId, filters, page, limit]);

  const fetchCampuses = async () => {
    try {
      const data = await getCampuses();
      setCampuses(data);
    } catch (error) {
      console.error('Error fetching campuses:', error);
    }
  };

  const fetchLogs = async () => {
    if (!selectedTenantId) return;

    setLoading(true);
    try {
      const response = await getAuditLogs(selectedTenantId, filters, { page, limit });
      setLogs(response.logs);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const newFilters: AuditLogFilters = {};

    if (actorEmailInput) newFilters.actorEmail = actorEmailInput;
    if (recordNameInput) newFilters.recordSubjectName = recordNameInput;
    if (recordIdInput) newFilters.recordId = recordIdInput;
    if (selectedEventTypes.length > 0) newFilters.eventTypes = selectedEventTypes;
    if (dateFrom) newFilters.dateFrom = new Date(dateFrom).toISOString();
    if (dateTo) newFilters.dateTo = new Date(dateTo).toISOString();
    if (selectedCampus && selectedCampus !== 'all') newFilters.campusId = selectedCampus;

    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setActorEmailInput('');
    setRecordNameInput('');
    setRecordIdInput('');
    setSelectedEventTypes([]);
    setDateFrom('');
    setDateTo('');
    setSelectedCampus('');
    setFilters({});
    setPage(1);
  };

  const toggleEventType = (eventType: string) => {
    setSelectedEventTypes(prev =>
      prev.includes(eventType)
        ? prev.filter(t => t !== eventType)
        : [...prev, eventType]
    );
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      // Fetch all logs with current filters (no pagination)
      const response = await getAuditLogs(undefined, filters, { page: 1, limit: 10000 });

      const csvData = response.logs.map(log => ({
        Timestamp: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        Event: log.event_type,
        Actor: log.actor_email || log.actor_id,
        Role: log.actor_role || 'N/A',
        'Record/Subject': log.record_subject_name || 'N/A',
        Action: log.action,
        'Target ID': log.target_id || 'N/A',
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      // Fetch all logs with current filters (no pagination)
      const response = await getAuditLogs(undefined, filters, { page: 1, limit: 10000 });

      const excelData = response.logs.map(log => ({
        Timestamp: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        Event: log.event_type,
        Actor: log.actor_email || log.actor_id,
        Role: log.actor_role || 'N/A',
        'Record/Subject': log.record_subject_name || 'N/A',
        Action: log.action,
        'Target ID': log.target_id || 'N/A',
        Details: log.details ? JSON.stringify(log.details) : '',
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');

      // Auto-size columns
      const maxWidth = excelData.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
      ws['!cols'] = Array(maxWidth).fill({ wch: 20 });

      XLSX.writeFile(wb, `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      // Fetch all logs with current filters (no pagination)
      const response = await getAuditLogs(undefined, filters, { page: 1, limit: 10000 });

      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

      // Header
      doc.setFontSize(16);
      doc.text('Audit Log Report', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, 22);
      doc.text(`Total Records: ${response.total}`, 14, 28);

      // Table
      const tableData = response.logs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm'),
        log.event_type,
        log.actor_email || log.actor_id.substring(0, 8),
        log.actor_role || 'N/A',
        log.record_subject_name || 'N/A',
        log.action,
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['Timestamp', 'Event', 'Actor', 'Role', 'Subject', 'Action']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }, // Blue header
      });

      doc.save(`audit-logs-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('created') || eventType.includes('invited')) {
      return 'bg-green-100 text-green-800';
    }
    if (eventType.includes('updated')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (eventType.includes('deleted')) {
      return 'bg-red-100 text-red-800';
    }
    if (eventType.includes('viewed')) {
      return 'bg-purple-100 text-purple-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            FERPA-compliant activity tracking and compliance reports
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm space-y-4">
        <h3 className="font-semibold text-foreground">Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="actorEmail">User Email</Label>
            <Input
              id="actorEmail"
              placeholder="Search by user email..."
              value={actorEmailInput}
              onChange={(e) => setActorEmailInput(e.target.value)}
              className={fieldClasses}
            />
          </div>

          <div>
            <Label htmlFor="recordName">Record/Student Name</Label>
            <Input
              id="recordName"
              placeholder="Search by record name..."
              value={recordNameInput}
              onChange={(e) => setRecordNameInput(e.target.value)}
              className={fieldClasses}
            />
          </div>

          <div>
            <Label htmlFor="recordId">Record ID</Label>
            <Input
              id="recordId"
              placeholder="Exact record ID..."
              value={recordIdInput}
              onChange={(e) => setRecordIdInput(e.target.value)}
              className={fieldClasses}
            />
          </div>

          <div>
            <Label htmlFor="dateFrom">Date From</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={fieldClasses}
            />
          </div>

          <div>
            <Label htmlFor="dateTo">Date To</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={fieldClasses}
            />
          </div>

          <div>
            <Label htmlFor="campus">Campus</Label>
            <Select value={selectedCampus} onValueChange={setSelectedCampus}>
              <SelectTrigger className={selectClasses}>
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
        </div>

        <div>
          <Label>Event Types</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {EVENT_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={selectedEventTypes.includes(type.value)}
                  onChange={() => toggleEventType(type.value)}
                  className="rounded"
                />
                <span className="text-sm">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={applyFilters}>Apply Filters</Button>
          <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={exporting || logs.length === 0}
          >
            <Table className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={exporting || logs.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={exporting || logs.length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card">
          <p className="text-muted-foreground">No audit logs found</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto overflow-y-auto max-h-[680px]">
            <table className="w-full">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="text-left p-4 font-medium">Timestamp</th>
                  <th className="text-left p-4 font-medium">Event</th>
                  <th className="text-left p-4 font-medium">Actor</th>
                  <th className="text-left p-4 font-medium">Record/Subject</th>
                  <th className="text-left p-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log, index) => {
                  const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                  return (
                    <tr key={log.id} className={`${rowBg} hover:bg-slate-100`}>
                    <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(log.event_type)}`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <div>{log.actor_email || log.actor_id}</div>
                      {log.actor_role && (
                        <div className="text-xs text-muted-foreground">{log.actor_role}</div>
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      {log.record_subject_name || '—'}
                    </td>
                    <td className="p-4 text-sm">{log.action}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="pageSize">Show:</Label>
          <Select value={limit.toString()} onValueChange={(val) => setLimit(Number(val))}>
            <SelectTrigger className={`w-[120px] ${selectClasses}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-sm">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
