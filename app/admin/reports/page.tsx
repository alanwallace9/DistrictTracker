'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  FileBarChart,
  Eye,
  Activity,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  Download,
  Clock,
  X,
  Table,
  FileText,
} from 'lucide-react';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';
import { getAuditLogs, type AuditLogFilters } from '@/app/actions/admin/audit-logs';
import { searchRecords, type RecordSearchResult } from '@/app/actions/admin/search-records';
import { getCampusesWithCounts } from '@/app/actions/admin/campuses';
import { getUsersForAdmin, type AdminUserListItem } from '@/app/actions/admin/users';
import { getDAEPRecords, type DAEPRecord } from '@/app/actions/admin/daep-records';
import { useAdminTenant } from '@/contexts/AdminTenantContext';
import { Campus } from '@/lib/supabase';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType =
  | 'ferpa_access'
  | 'user_activity'
  | 'record_frequency'
  | 'campus_activity'
  | 'modification_history'
  | 'daep_students'
  | 'custom';

export default function ReportsPage() {
  const { selectedTenantId } = useAdminTenant();
  const fieldClasses = 'bg-white border border-slate-300 shadow-sm text-slate-900 placeholder:text-slate-500';
  const selectClasses = 'bg-white border border-slate-300 shadow-sm text-slate-900 focus:ring-2 focus:ring-slate-200';
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dateRange, setDateRange] = useState('last_7_days');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetRecordId, setTargetRecordId] = useState('');

  // Quick Lookup state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RecordSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordSearchResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewReport, setPreviewReport] = useState<ReportType | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Custom report filters
  const [customActorEmail, setCustomActorEmail] = useState('');
  const [customRecordName, setCustomRecordName] = useState('');
  const [customRecordId, setCustomRecordId] = useState('');
  const [customCampusId, setCustomCampusId] = useState('');
  const [customEventTypes, setCustomEventTypes] = useState<string[]>([]);

  // Campus selection
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState('');

  // User selection
  const [users, setUsers] = useState<AdminUserListItem[]>([]);

  // Anomalies
  const [anomalies, setAnomalies] = useState<any[]>([]);

  // Ref for scrolling to report cards section
  const reportCardsRef = useRef<HTMLDivElement>(null);

  // Load campuses and users when tenant changes
  useEffect(() => {
    if (!selectedTenantId) return;

    const loadData = async () => {
      try {
        const [campusesData, usersData] = await Promise.all([
          getCampusesWithCounts(selectedTenantId),
          getUsersForAdmin(selectedTenantId)
        ]);
        setCampuses(campusesData);
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, [selectedTenantId]);

  const reports = [
    {
      id: 'ferpa_access' as ReportType,
      title: 'FERPA Access Report',
      description: 'Who viewed which records and when (FERPA compliance)',
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'user_activity' as ReportType,
      title: 'User Activity Summary',
      description: 'All actions performed by specific users',
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      id: 'record_frequency' as ReportType,
      title: 'Record Access Frequency',
      description: 'Most viewed records and access patterns',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'campus_activity' as ReportType,
      title: 'Campus Activity Report',
      description: 'All activity for specific campus locations',
      icon: Building2,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      id: 'modification_history' as ReportType,
      title: 'Modification History',
      description: 'All edits with before/after values',
      icon: Clock,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      id: 'daep_students' as ReportType,
      title: 'DAEP Students',
      description: 'All DAEP placements (active & expired) with incident counts',
      icon: FileBarChart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      id: 'custom' as ReportType,
      title: 'Custom Report',
      description: 'Build a custom report with your own filters',
      icon: FileBarChart,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  ];

  // Helper function to format modification details
  const formatModificationDetails = (log: any): string => {
    if (log.event_type === 'record.updated' && log.details?.changes) {
      const changes = Object.entries(log.details.changes)
        .map(([field, value]: [string, any]) => {
          return `${field}: "${value.from}" → "${value.to}"`;
        })
        .join('; ');
      return changes || log.action;
    } else if (log.event_type === 'record.deleted' && log.details?.deletedRecord) {
      const deleted = log.details.deletedRecord;
      return `Deleted record: ${deleted.first_name} ${deleted.last_name}`;
    }
    return log.action;
  };

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'last_7_days':
        return {
          from: startOfDay(subDays(now, 7)).toISOString(),
          to: endOfDay(now).toISOString(),
        };
      case 'last_30_days':
        return {
          from: startOfDay(subDays(now, 30)).toISOString(),
          to: endOfDay(now).toISOString(),
        };
      case 'last_90_days':
        return {
          from: startOfDay(subDays(now, 90)).toISOString(),
          to: endOfDay(now).toISOString(),
        };
      case 'last_6_months':
        return {
          from: startOfDay(subMonths(now, 6)).toISOString(),
          to: endOfDay(now).toISOString(),
        };
      case 'custom':
        return {
          from: customDateFrom ? startOfDay(new Date(customDateFrom)).toISOString() : undefined,
          to: customDateTo ? endOfDay(new Date(customDateTo)).toISOString() : undefined,
        };
      default:
        return {};
    }
  };

  const generatePreview = async (reportType: ReportType) => {
    setPreviewLoading(true);
    setPreviewReport(reportType);
    setPreviewOpen(true);
    setPreviewData([]);

    try {
      console.log('[Preview] Generating report:', reportType);

      const dates = getDateRange();
      console.log('[Preview] Date range:', dates);

      let filters: AuditLogFilters = {
        dateFrom: dates.from,
        dateTo: dates.to,
      };

      // Apply report-specific filters
      switch (reportType) {
        case 'ferpa_access':
          filters.eventTypes = ['record.viewed'];
          break;
        case 'user_activity':
          if (targetUserId) {
            filters.actorEmail = targetUserId;
          }
          break;
        case 'record_frequency':
          filters.eventTypes = ['record.viewed'];
          // Will need to aggregate in post-processing
          break;
        case 'campus_activity':
          if (selectedCampusId) {
            filters.campusId = selectedCampusId;
          }
          break;
        case 'modification_history':
          filters.eventTypes = ['record.created', 'record.updated', 'record.deleted'];
          break;
        case 'custom':
          // Apply all custom filters
          if (customActorEmail) filters.actorEmail = customActorEmail;
          if (customRecordName) filters.recordSubjectName = customRecordName;
          if (customCampusId) filters.campusId = customCampusId;
          if (customEventTypes.length > 0) filters.eventTypes = customEventTypes;
          break;
      }

      // Fetch data (limited to 100 for preview)
      const response = await getAuditLogs(selectedTenantId || undefined, filters, { page: 1, limit: 100 });
      console.log('[Preview] Audit logs response:', response);

      let csvData: any[];

      switch (reportType) {
        case 'ferpa_access':
          csvData = response.logs.map(log => ({
            Timestamp: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
            'Accessed By': log.actor_email || log.actor_id,
            'User Role': log.actor_role || 'N/A',
            'Student Name': log.record_subject_name || 'N/A',
            'Student ID': log.record_school_id || 'N/A',
            Action: formatModificationDetails(log),
          }));
          break;

        case 'user_activity':
          csvData = response.logs.map(log => ({
            Timestamp: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
            'Event Type': log.event_type,
            'Actor': log.actor_email || log.actor_id,
            'Record/Subject': log.record_subject_name || 'N/A',
            Action: log.action,
            'Target ID': log.target_id || 'N/A',
          }));
          break;

        case 'record_frequency':
          // Aggregate by record
          const recordAccess = response.logs.reduce((acc, log) => {
            const key = log.target_id || 'Unknown';
            if (!acc[key]) {
              acc[key] = {
                recordId: key,
                recordName: log.record_subject_name || 'N/A',
                accessCount: 0,
                uniqueUsers: new Set<string>(),
                lastAccessed: log.created_at,
              };
            }
            acc[key].accessCount++;
            if (log.actor_email) {
              acc[key].uniqueUsers.add(log.actor_email);
            }
            return acc;
          }, {} as Record<string, any>);

          csvData = Object.values(recordAccess)
            .sort((a: any, b: any) => b.accessCount - a.accessCount)
            .map((record: any) => ({
              'Record ID': record.recordId,
              'Record/Student Name': record.recordName,
              'Total Access Count': record.accessCount,
              'Unique Users': record.uniqueUsers.size,
              'Last Accessed': format(new Date(record.lastAccessed), 'yyyy-MM-dd HH:mm:ss'),
            }));
          break;

        case 'campus_activity':
          csvData = response.logs.map(log => ({
            Timestamp: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
            'Event Type': log.event_type,
            'User': log.actor_email || log.actor_id,
            'User Role': log.actor_role || 'N/A',
            'Student Name': log.record_subject_name || 'N/A',
            Action: formatModificationDetails(log),
          }));
          break;

        case 'modification_history':
          csvData = response.logs.map(log => ({
            Timestamp: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
            'Event Type': log.event_type,
            'Modified By': log.actor_email || log.actor_id,
            'User Role': log.actor_role || 'N/A',
            'Student Name': log.record_subject_name || 'N/A',
            'Student ID': log.record_school_id || 'N/A',
            'Fields Changed': log.details?.fieldsUpdated?.join(', ') || 'N/A',
            'Changes (Before → After)': formatModificationDetails(log),
          }));
          break;

        case 'daep_students':
          // Fetch DAEP records directly from trespass_records table
          const daepRecords = await getDAEPRecords(selectedTenantId || undefined);

          // Get campus names
          const campusMap = new Map(campuses.map(c => [c.id, c.name]));

          csvData = daepRecords.map(record => ({
            'Student Name': `${record.first_name} ${record.last_name}`,
            'School ID': record.school_id,
            'Home Campus': record.campus_id ? (campusMap.get(record.campus_id) || record.campus_id) : 'Not Assigned',
            'Placement Date': format(new Date(record.created_at), 'yyyy-MM-dd'),
            'Expiration Date': record.daep_expiration_date ? format(new Date(record.daep_expiration_date), 'yyyy-MM-dd') : 'No Expiration',
            'Total DAEP Incidents': record.incident_count,
          }));
          break;

        default:
          csvData = response.logs.map(log => ({
            Timestamp: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
            Event: log.event_type,
            Actor: log.actor_email || log.actor_id,
            Role: log.actor_role || 'N/A',
            'Record/Subject': log.record_subject_name || 'N/A',
            Action: log.action,
            'Target ID': log.target_id || 'N/A',
          }));
      }

      // Set preview data
      console.log('[Preview] CSV data generated:', csvData.length, 'rows');
      console.log('[Preview] Sample row:', csvData[0]);
      setPreviewData(csvData);

    } catch (error) {
      console.error('[Preview] Error generating report:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const exportPreviewAs = (exportFormat: 'csv' | 'pdf') => {
    if (!previewData || previewData.length === 0) return;

    const reportName = reports.find(r => r.id === previewReport)?.title || 'Report';
    const filename = `${reportName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}`;

    if (exportFormat === 'csv') {
      const csv = Papa.unparse(previewData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
    } else if (exportFormat === 'pdf') {
      const doc = new jsPDF('l', 'mm', 'a4');

      // Add title
      doc.setFontSize(16);
      doc.text(reportName, 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, 22);

      // Extract headers and data
      const headers = previewData[0] ? Object.keys(previewData[0]) : [];
      const rows = previewData.map(row => Object.values(row)) as any;

      // Create table
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      doc.save(`${filename}.pdf`);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        try {
          const results = await searchRecords(searchQuery, selectedTenantId || undefined);
          setSearchResults(results);
          setShowDropdown(results.length > 0);
        } catch (error) {
          console.error('Search error:', error);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRecord = (record: RecordSearchResult) => {
    setSelectedRecord(record);
    setSearchQuery(`${record.first_name} ${record.last_name} (ID: ${record.school_id})`);
    setShowDropdown(false);
  };

  const handleQuickLookup = async () => {
    if (!selectedRecord) return;

    setLookupLoading(true);
    setLookupResults([]);
    setAnomalies([]);

    try {
      console.log('[Quick Lookup] Searching for record:', selectedRecord);

      const filters: AuditLogFilters = {
        eventTypes: ['record.viewed', 'record.updated', 'record.created'],
        recordId: selectedRecord.id,
      };

      const response = await getAuditLogs(selectedTenantId || undefined, filters, { page: 1, limit: 1000 });
      console.log('[Quick Lookup] Response:', response);

      setLookupResults(response.logs);

      // Detect anomalies
      const accessCount = response.logs.filter(l => l.event_type === 'record.viewed').length;
      const uniqueUsers = new Set(response.logs.map(l => l.actor_email)).size;

      const detectedAnomalies: any[] = [];

      if (accessCount > 20) {
        detectedAnomalies.push({
          type: 'high_access',
          message: `High access frequency: Record viewed ${accessCount} times`,
          severity: 'warning',
        });
      }

      if (uniqueUsers > 10) {
        detectedAnomalies.push({
          type: 'many_users',
          message: `Record accessed by ${uniqueUsers} different users`,
          severity: 'warning',
        });
      }

      // Check for after-hours access (before 6am or after 10pm)
      const afterHoursAccess = response.logs.filter(log => {
        const hour = new Date(log.created_at).getHours();
        return hour < 6 || hour > 22;
      });

      if (afterHoursAccess.length > 0) {
        detectedAnomalies.push({
          type: 'after_hours',
          message: `${afterHoursAccess.length} after-hours access detected (before 6am or after 10pm)`,
          severity: 'alert',
        });
      }

      setAnomalies(detectedAnomalies);
    } catch (error) {
      console.error('Error in quick lookup:', error);
    } finally {
      setLookupLoading(false);
    }
  };

  const toggleCustomEventType = (eventType: string) => {
    setCustomEventTypes(prev =>
      prev.includes(eventType)
        ? prev.filter(t => t !== eventType)
        : [...prev, eventType]
    );
  };

  const EVENT_TYPE_OPTIONS = [
    { value: 'record.viewed', label: 'Record Viewed' },
    { value: 'record.created', label: 'Record Created' },
    { value: 'record.updated', label: 'Record Updated' },
    { value: 'record.deleted', label: 'Record Deleted' },
    { value: 'user.created', label: 'User Created' },
    { value: 'user.updated', label: 'User Updated' },
    { value: 'user.deleted', label: 'User Deleted' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Pre-built compliance reports and analytics
        </p>
      </div>

      {/* Quick Lookup Section */}
      <Card className="bg-blue-50 border border-blue-200 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Quick Lookup: Who Viewed This Record?
          </CardTitle>
          <CardDescription>
            Search by Record ID or Student Name to see all access history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 relative" ref={searchRef}>
              <Label htmlFor="quickSearch">Search by Student Name or Student ID</Label>
              <div className="relative">
                <Input
                  id="quickSearch"
                  placeholder="Type at least 3 characters to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  autoComplete="off"
                  className={fieldClasses}
                />
                {selectedRecord && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => {
                      setSelectedRecord(null);
                      setSearchQuery('');
                      setLookupResults([]);
                      setAnomalies([]);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                  {searchResults.map((record) => (
                    <button
                      key={record.id}
                      className="w-full text-left px-4 py-3 hover:bg-accent hover:text-accent-foreground border-b last:border-b-0 transition-colors text-foreground"
                      onClick={() => handleSelectRecord(record)}
                    >
                      <div className="font-medium">
                        {record.first_name} {record.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Student ID: {record.school_id} • Status: {record.status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleQuickLookup}
                disabled={lookupLoading || !selectedRecord}
                className="w-full"
              >
                {lookupLoading ? 'Searching...' : 'View Access History'}
              </Button>
            </div>
          </div>

          {/* Anomaly Alerts */}
          {anomalies.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">⚠️ Unusual Activity Detected:</h4>
              {anomalies.map((anomaly, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg text-sm ${
                    anomaly.severity === 'alert'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}
                >
                  {anomaly.message}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!lookupLoading && selectedRecord && lookupResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                No access history found for this record. This could mean:
              </p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• The record has not been viewed yet</li>
                <li>• Audit logging was not enabled when the record was accessed</li>
                <li>• The database migration for FERPA logging needs to be applied</li>
              </ul>
            </div>
          )}

          {/* Lookup Results */}
          {lookupResults.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">
                Access History ({lookupResults.length} events found)
              </h4>
              <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Timestamp</th>
                      <th className="text-left p-3 font-medium">Event</th>
                      <th className="text-left p-3 font-medium">User</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {lookupResults.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/50">
                        <td className="p-3 whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            log.event_type === 'record.viewed'
                              ? 'bg-purple-100 text-purple-800'
                              : log.event_type === 'record.updated'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {log.event_type}
                          </span>
                        </td>
                        <td className="p-3">{log.actor_email || log.actor_id}</td>
                        <td className="p-3">{log.actor_role || 'N/A'}</td>
                        <td className="p-3">{log.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-50"
                  onClick={async () => {
                    const csv = Papa.unparse(lookupResults.map(log => ({
                      Timestamp: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
                      Event: log.event_type,
                      User: log.actor_email || log.actor_id,
                      Role: log.actor_role || 'N/A',
                      Action: log.action,
                    })));
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `record-access-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                    link.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export This History
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div ref={reportCardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all hover:shadow-md bg-white border border-slate-200 shadow-sm rounded-2xl ${
                selectedReport === report.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => {
                setSelectedReport(report.id);
                // Scroll to top of report cards section
                setTimeout(() => {
                  reportCardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-lg ${report.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${report.color}`} />
                  </div>
                </div>
                <CardTitle className="text-lg mt-4">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Report Configuration */}
      {selectedReport && (
        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle>Configure Report</CardTitle>
            <CardDescription>
              Set parameters for your {reports.find(r => r.id === selectedReport)?.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Range */}
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className={selectClasses}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateFrom">From</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className={fieldClasses}
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo">To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className={fieldClasses}
                  />
                </div>
              </div>
            )}

            {/* User Activity Specific */}
            {selectedReport === 'user_activity' && (
              <div>
                <Label htmlFor="targetUser">User (Optional)</Label>
                <Select value={targetUserId || 'all'} onValueChange={(value) => setTargetUserId(value === 'all' ? '' : value)}>
                  <SelectTrigger className={selectClasses}>
                    <SelectValue placeholder="All users..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {users.filter(user => !user.deleted_at && user.email).map((user) => (
                      <SelectItem key={user.id} value={user.email || ''}>
                        {user.display_name} ({user.email})
                        {user.campus_name && ` - ${user.campus_name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Campus Activity Specific */}
            {selectedReport === 'campus_activity' && (
              <div>
                <Label htmlFor="campusSelect">Campus (Required)</Label>
                <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
                  <SelectTrigger className={selectClasses}>
                    <SelectValue placeholder="Select a campus..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Report Filters */}
            {selectedReport === 'custom' && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-sm">Custom Filters</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customActorEmail">User Email</Label>
                    <Input
                      id="customActorEmail"
                      placeholder="Filter by user email..."
                      value={customActorEmail}
                      onChange={(e) => setCustomActorEmail(e.target.value)}
                      className={fieldClasses}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customRecordName">Record/Student Name</Label>
                    <Input
                      id="customRecordName"
                      placeholder="Filter by record name..."
                      value={customRecordName}
                      onChange={(e) => setCustomRecordName(e.target.value)}
                      className={fieldClasses}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customCampus">Campus (Optional)</Label>
                    <Select value={customCampusId || 'all'} onValueChange={(value) => setCustomCampusId(value === 'all' ? '' : value)}>
                      <SelectTrigger className={selectClasses}>
                        <SelectValue placeholder="All campuses..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All campuses</SelectItem>
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
                  <Label>Event Types (Select Multiple)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {EVENT_TYPE_OPTIONS.map((type) => (
                      <label
                        key={type.value}
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-accent border"
                      >
                        <input
                          type="checkbox"
                          checked={customEventTypes.includes(type.value)}
                          onChange={() => toggleCustomEventType(type.value)}
                          className="rounded"
                        />
                        <span className="text-sm">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => generatePreview(selectedReport)}
                disabled={generating || (selectedReport === 'campus_activity' && !selectedCampusId)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Report
              </Button>
              {selectedReport === 'campus_activity' && !selectedCampusId && (
                <p className="text-sm text-muted-foreground self-center">
                  Please select a campus
                </p>
              )}
              <Button variant="outline" className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300" onClick={() => setSelectedReport(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Access Guide */}
      {!selectedReport && (
        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle>Report Types</CardTitle>
            <CardDescription>Select a report type above to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li>
                <strong>FERPA Access Report:</strong> Track who viewed what records for FERPA compliance audits
              </li>
              <li>
                <strong>User Activity Summary:</strong> See all actions taken by a specific user
              </li>
              <li>
                <strong>Record Access Frequency:</strong> Identify most-accessed records and potential anomalies
              </li>
              <li>
                <strong>Campus Activity Report:</strong> Review all activity at specific campus locations
              </li>
              <li>
                <strong>Modification History:</strong> Audit trail of all changes with before/after values
              </li>
              <li>
                <strong>DAEP Students:</strong> All DAEP placements (active and expired) with placement dates, expiration dates, and incident counts per student
              </li>
              <li>
                <strong>Custom Report:</strong> Build your own report with flexible filters
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Report Preview: {reports.find(r => r.id === previewReport)?.title}
            </DialogTitle>
            <DialogDescription>
              Showing first 100 results. Export to download full report.
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Generating preview...</p>
            </div>
          ) : previewData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No data found for this report with the selected date range.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try selecting a different date range or check if audit logs are being recorded.
              </p>
              <Button variant="outline" className="mt-4 bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-y-auto max-h-[50vh] border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {previewData[0] && Object.keys(previewData[0]).map((header) => (
                        <th key={header} className="text-left p-3 font-medium whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/50">
                        {Object.values(row).map((cell: any, cellIdx) => (
                          <td key={cellIdx} className="p-3 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button variant="outline" className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300" onClick={() => setPreviewOpen(false)}>
                  Close
                </Button>
                <Button variant="outline" className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300" onClick={() => exportPreviewAs('csv')}>
                  <Table className="w-4 h-4 mr-2" />
                  Export as CSV
                </Button>
                <Button onClick={() => exportPreviewAs('pdf')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
