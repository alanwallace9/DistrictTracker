'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { importSchoolCalendarCSV, type CSVImportResult } from '@/app/actions/daep/school-calendar';
import { DAY_TYPES } from '@/lib/validation/schemas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface CSVUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolYear: string;
  onSuccess: () => void;
}

export function CSVUploadDialog({
  open,
  onOpenChange,
  schoolYear,
  onSuccess,
}: CSVUploadDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CSVImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Invalid file',
          description: 'Please select a CSV file',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({
          title: 'Empty file',
          description: 'The CSV file contains no data rows',
          variant: 'destructive',
        });
        setUploading(false);
        return;
      }

      // Validate required columns
      const firstRow = rows[0];
      if (!('date' in firstRow)) {
        toast({
          title: 'Missing column',
          description: 'CSV must have a "date" column',
          variant: 'destructive',
        });
        setUploading(false);
        return;
      }

      // Transform rows
      const transformedRows = rows.map((row) => ({
        date: row.date,
        is_school_day: row.is_school_day || 'true',
        day_type: row.day_type || null,
      }));

      const importResult = await importSchoolCalendarCSV(transformedRows, schoolYear);
      setResult(importResult);

      if (importResult.success > 0) {
        toast({
          title: 'Import completed',
          description: `${importResult.success} entries imported successfully`,
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message || 'Failed to import CSV',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setFile(null);
      setResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import School Calendar</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import calendar entries for {schoolYear}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* CSV Format Info */}
          <div className="p-4 bg-slate-50 rounded-lg text-sm">
            <p className="font-medium mb-2">CSV Format:</p>
            <code className="text-xs bg-slate-200 p-2 rounded block">
              date,is_school_day,day_type
              <br />
              2024-08-19,true,Regular
              <br />
              2024-09-02,false,Holiday
              <br />
              2024-11-27,false,Holiday
            </code>
            <p className="mt-2 text-muted-foreground">
              Valid day types: {DAY_TYPES.join(', ')}
            </p>
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="csv_file">Select CSV File</Label>
            <Input
              ref={fileInputRef}
              id="csv_file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>

          {/* Selected File */}
          {file && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}

          {/* Import Result */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {result.success > 0 && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">{result.success} imported</span>
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{result.failed} failed</span>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto p-2 bg-red-50 rounded text-xs text-red-700">
                  {result.errors.slice(0, 10).map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                  {result.errors.length > 10 && (
                    <div className="mt-1 font-medium">
                      ...and {result.errors.length - 10} more errors
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={handleUpload} disabled={!file || uploading}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Importing...' : 'Import'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
