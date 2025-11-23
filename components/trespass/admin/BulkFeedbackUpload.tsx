'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { bulkUploadFeedback } from '@/app/actions/feedback';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BulkFeedbackUploadProps {
  categories: Array<{ id: string; name: string; slug: string }>;
  onSuccess: () => void;
}

interface UploadResult {
  success: boolean;
  successCount?: number;
  errorCount?: number;
  errors?: Array<{ row: number; error: string }>;
}

export function BulkFeedbackUpload({ categories, onSuccess }: BulkFeedbackUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = [
      'title',
      'description',
      'type',
      'status',
      'product',
      'roadmap_notes',
      'planned_release',
      'created_date',
    ];

    const exampleRows = [
      [
        'Add dark mode to dashboard',
        'Users want a dark theme option for better visibility at night',
        'feature_request',
        'planned',
        'Trespass',
        'Will be part of Q1 2025 release',
        'Q1 2025',
        '2024-10-15',
      ],
      [
        'Fix date picker not showing on mobile',
        'The date picker component does not display properly on iOS devices',
        'bug',
        'in progress',
        'DAEP Dashboard',
        'Working on mobile responsive fix',
        '',
        '2024-11-01',
      ],
      [
        'Improved report generation',
        'Add ability to export reports in multiple formats',
        'feature_request',
        'done',
        'Attendance',
        'Completed and deployed in Q4 2024',
        'Q4 2024',
        '2024-09-20',
      ],
    ];

    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row =>
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      const result = await bulkUploadFeedback(text, categories);

      setUploadResult(result as UploadResult);

      if (result.success) {
        setTimeout(() => {
          setIsOpen(false);
          setUploadResult(null);
          onSuccess();
        }, 3000);
      }
    } catch (error) {
      setUploadResult({
        success: false,
        errorCount: 1,
        errors: [{ row: 0, error: 'Failed to read file' }],
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      await processFile(file);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="gap-2 bg-white border-slate-300 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300">
        <Upload className="w-4 h-4" />
        Bulk Upload CSV
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl bg-[#F9FAFB]">
          <DialogHeader>
            <DialogTitle>Bulk Upload Feedback</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple feature requests and bug reports at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Download Template */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Download className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Download Template</p>
                <p className="text-xs text-blue-700">Get a pre-formatted CSV with examples</p>
              </div>
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                Download
              </Button>
            </div>

            {/* Upload Area with Drag & Drop */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
              />
              <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
              <p className="text-sm font-medium text-slate-700 mb-1">
                {isUploading ? 'Uploading...' : 'Drag & drop CSV file or click to browse'}
              </p>
              <p className="text-xs text-slate-500 mb-3">
                Columns: title, description, type, status (under review, planned, in progress, done), product, roadmap_notes, planned_release, created_date (YYYY-MM-DD)
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
                size="sm"
              >
                {isUploading ? 'Processing...' : 'Select File'}
              </Button>
            </div>

            {/* Upload Results */}
            {uploadResult && (
              <div className="space-y-3">
                {uploadResult.success ? (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">Success!</AlertTitle>
                    <AlertDescription className="text-green-800">
                      Successfully imported {uploadResult.successCount} feedback items.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Upload Failed</AlertTitle>
                    <AlertDescription>
                      {uploadResult.errorCount} error(s) found. Please fix and try again.
                    </AlertDescription>
                  </Alert>
                )}

                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto bg-red-50 border border-red-200 rounded p-4">
                    <p className="text-sm font-semibold text-red-900 mb-2">Errors:</p>
                    <ul className="space-y-1 text-xs text-red-800">
                      {uploadResult.errors.map((error, idx) => (
                        <li key={idx}>
                          Row {error.row}: {error.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
