'use client';

import { TrespassRecord } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

type RecordsTableProps = {
  records: TrespassRecord[];
  onViewRecord: (record: TrespassRecord) => void;
};

/**
 * Format a date string from the database for display
 * Handles date-only strings (YYYY-MM-DD) without timezone conversion
 */
function formatDateForDisplay(dateString: string | null | undefined, formatString: string = 'MMM d, yyyy'): string {
  if (!dateString) return 'N/A';

  // Parse the date as-is without timezone conversion
  // For YYYY-MM-DD strings, treat them as local dates
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return format(date, formatString);
}

export function RecordsTable({ records, onViewRecord }: RecordsTableProps) {
  const exportToCSV = () => {
    // Create CSV headers
    const headers = ['Name', 'ID Number', 'Expiration Date', 'Birth Date', 'Trespassed From', 'Status', 'Incident Date'];

    // Create CSV rows
    const rows = records.map((record) => {
      const expired = isExpired(record);
      const displayStatus = expired ? 'inactive' : record.status;

      return [
        `"${record.first_name} ${record.last_name}"`,
        record.school_id || 'N/A',
        record.expiration_date ? format(new Date(record.expiration_date), 'MM/dd/yyyy') : 'N/A',
        record.date_of_birth ? format(new Date(record.date_of_birth), 'MM/dd/yyyy') : 'N/A',
        `"${record.trespassed_from || 'N/A'}"`,
        displayStatus,
        record.incident_date ? format(new Date(record.incident_date), 'MM/dd/yyyy') : 'N/A',
      ].join(',');
    });

    // Combine headers and rows
    const csv = [headers.join(','), ...rows].join('\n');

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trespass-records-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    // Create worksheet data
    const data = records.map((record) => {
      const expired = isExpired(record);
      const displayStatus = expired ? 'inactive' : record.status;

      return {
        'Name': `${record.first_name} ${record.last_name}`,
        'School ID': record.school_id || 'N/A',
        'Expiration Date': record.expiration_date ? format(new Date(record.expiration_date), 'MM/dd/yyyy') : 'N/A',
        'Birth Date': record.date_of_birth ? format(new Date(record.date_of_birth), 'MM/dd/yyyy') : 'N/A',
        'Trespassed From': record.trespassed_from || 'N/A',
        'Status': displayStatus,
        'Incident Date': record.incident_date ? format(new Date(record.incident_date), 'MM/dd/yyyy') : 'N/A',
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trespass Records');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Name
      { wch: 12 }, // School ID
      { wch: 15 }, // Expiration Date
      { wch: 15 }, // Birth Date
      { wch: 20 }, // Trespassed From
      { wch: 10 }, // Status
      { wch: 15 }, // Incident Date
    ];

    // Generate file and download
    XLSX.writeFile(workbook, `trespass-records-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };
  const isExpired = (record: TrespassRecord) => {
    return record.expiration_date && new Date(record.expiration_date) < new Date();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-status-success text-white hover:bg-status-success/90';
      case 'expired':
        return 'bg-status-error/10 text-status-error hover:bg-status-error/20';
      case 'inactive':
        return 'bg-status-error/10 text-status-error hover:bg-status-error/20';
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted';
    }
  };

  return (
    <div className="space-y-4">
      {/* Export buttons and count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{records.length}</span> record{records.length !== 1 ? 's' : ''}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={records.length === 0}
            className="gap-2"
          >
            <FileDown className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={records.length === 0}
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export XLSX
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground">Name</TableHead>
                <TableHead className="text-foreground">ID Number</TableHead>
                <TableHead className="text-foreground hidden md:table-cell">Expiration Date</TableHead>
                <TableHead className="text-foreground">Trespassed From</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => {
                  const expired = isExpired(record);
                  const displayStatus = expired ? 'inactive' : record.status;
                  const displayStatusText = displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);

                  return (
                    <TableRow key={record.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewRecord(record)}>
                      <TableCell className="font-medium text-foreground">
                        {record.first_name.charAt(0).toUpperCase() + record.first_name.slice(1).toLowerCase()} {record.last_name.charAt(0).toUpperCase() + record.last_name.slice(1).toLowerCase()}
                      </TableCell>
                      <TableCell className="text-foreground font-mono text-sm">{record.school_id || 'N/A'}</TableCell>
                      <TableCell className="text-foreground hidden md:table-cell">{formatDateForDisplay(record.expiration_date)}</TableCell>
                      <TableCell className="text-foreground">{record.trespassed_from || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(displayStatus)}>{displayStatusText}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
