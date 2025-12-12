'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { uploadReconciliationCSV } from '@/app/actions/daep/reconciliation';
import { useToast } from '@/hooks/use-toast';

interface CSVDropzoneProps {
  onUploadSuccess?: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UploadProgress {
  percent: number;
  bytesUploaded: number;
  totalBytes: number;
  startTime: number;
  speed: string;
  eta: string;
}

export function CSVDropzone({ onUploadSuccess }: CSVDropzoneProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '--:--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const simulateProgress = (file: File) => {
    const startTime = Date.now();
    const totalBytes = file.size;
    let bytesUploaded = 0;

    // Simulate upload speed between 500KB/s and 2MB/s
    const baseSpeed = 500 * 1024 + Math.random() * 1.5 * 1024 * 1024;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const increment = (baseSpeed / 10) * (0.8 + Math.random() * 0.4);
      bytesUploaded = Math.min(bytesUploaded + increment, totalBytes * 0.95); // Cap at 95%

      const percent = Math.round((bytesUploaded / totalBytes) * 100);
      const speed = bytesUploaded / elapsed;
      const remainingBytes = totalBytes - bytesUploaded;
      const eta = remainingBytes / speed;

      setProgress({
        percent,
        bytesUploaded,
        totalBytes,
        startTime,
        speed: formatBytes(speed) + '/s',
        eta: formatTime(eta),
      });
    }, 100);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);
    setUploadState('uploading');
    simulateProgress(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadReconciliationCSV(formData);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      if (!result.success) {
        setUploadState('error');
        setErrorMessage(result.error || 'Upload failed');
        setProgress(null);
        return;
      }

      // Complete the progress
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              percent: 100,
              bytesUploaded: prev.totalBytes,
              eta: '0s',
            }
          : null
      );
      setUploadState('success');

      toast({
        title: 'Upload Complete',
        description: result.requiresMapping
          ? 'Redirecting to field mapping...'
          : 'Processing your file...',
      });

      onUploadSuccess?.();

      // Redirect after brief delay
      setTimeout(() => {
        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
      }, 1500);
    } catch (error) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setUploadState('error');
      setErrorMessage('An unexpected error occurred');
      setProgress(null);
    }
  }, [router, toast, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.csv'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    disabled: uploadState === 'uploading',
  });

  const handleReset = () => {
    setUploadState('idle');
    setSelectedFile(null);
    setErrorMessage(null);
    setProgress(null);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragActive && !isDragReject && 'border-[rgb(var(--daep-primary))] bg-[rgb(var(--daep-primary))]/5',
          isDragReject && 'border-[rgb(var(--daep-danger))] bg-[rgb(var(--daep-danger))]/5',
          uploadState === 'error' && 'border-[rgb(var(--daep-danger))]',
          uploadState === 'success' && 'border-[rgb(var(--daep-success))]',
          uploadState === 'uploading' && 'cursor-not-allowed opacity-75',
          !isDragActive && uploadState === 'idle' && 'border-border hover:border-[rgb(var(--daep-primary))]/50 hover:bg-muted/50'
        )}
      >
        <input {...getInputProps()} />

        {uploadState === 'idle' && (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-muted">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your SIS export'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse (CSV files up to 10MB)
              </p>
            </div>
          </div>
        )}

        {uploadState === 'uploading' && selectedFile && progress && (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-[rgb(var(--daep-primary))]/10">
              <Loader2 className="h-8 w-8 text-[rgb(var(--daep-primary))] animate-spin" />
            </div>
            <div className="w-full max-w-md space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {selectedFile.name}
                </span>
                <span className="text-muted-foreground">{progress.percent}%</span>
              </div>
              <Progress value={progress.percent} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatBytes(progress.bytesUploaded)} / {formatBytes(progress.totalBytes)}
                </span>
                <span className="flex items-center gap-3">
                  <span>{progress.speed}</span>
                  <span>ETA: {progress.eta}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {uploadState === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-[rgb(var(--daep-success))]/10">
              <CheckCircle className="h-8 w-8 text-[rgb(var(--daep-success))]" />
            </div>
            <div>
              <p className="text-lg font-medium text-[rgb(var(--daep-success))]">
                Upload Complete!
              </p>
              <p className="text-sm text-muted-foreground mt-1">Redirecting...</p>
            </div>
          </div>
        )}

        {uploadState === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-[rgb(var(--daep-danger))]/10">
              <AlertCircle className="h-8 w-8 text-[rgb(var(--daep-danger))]" />
            </div>
            <div>
              <p className="text-lg font-medium text-[rgb(var(--daep-danger))]">Upload Failed</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <X className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* File type hints */}
      {uploadState === 'idle' && (
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Supported formats: .csv</span>
          <span>|</span>
          <span>Max size: 10MB</span>
        </div>
      )}
    </div>
  );
}
