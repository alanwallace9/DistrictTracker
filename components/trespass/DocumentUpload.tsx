'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, Loader2, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RecordDocument } from '@/lib/supabase';
import {
  uploadDocument,
  deleteDocument,
  getDocumentUrl,
} from '@/lib/file-upload';

interface DocumentUploadProps {
  recordId: string;
  documents: RecordDocument[];
  userId: string;
  userRole: string;
  onDocumentsChange: (documents: RecordDocument[]) => void;
}

export function DocumentUpload({
  recordId,
  documents,
  userId,
  userRole,
  onDocumentsChange,
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<
    'trespass_warning' | 'court_order' | 'other'
  >('trespass_warning');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === 'district_admin' || userRole === 'master_admin';

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!isAdmin) {
      setError('Only administrators can upload documents');
      return;
    }

    const file = files[0]; // Only allow one document at a time
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const document = await uploadDocument(
        file,
        recordId,
        userId,
        selectedDocumentType,
        (progress) => {
          setUploadProgress(Math.round(progress.percentage));
        }
      );

      onDocumentsChange([...documents, document]);
      setUploadProgress(100);
      setSelectedDocumentType('trespass_warning'); // Reset to default
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!isAdmin) {
      setError('Only administrators can delete documents');
      return;
    }

    try {
      setError(null);
      await deleteDocument(documentId);
      onDocumentsChange(documents.filter((d) => d.id !== documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const handleDownload = (document: RecordDocument) => {
    const url = getDocumentUrl(document.storage_path);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = document.file_name;
    link.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isAdmin) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!isAdmin) return;

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocumentTypeBadge = (type: string) => {
    switch (type) {
      case 'trespass_warning':
        return <Badge variant="default">Trespass Warning</Badge>;
      case 'court_order':
        return <Badge variant="destructive">Court Order</Badge>;
      case 'other':
        return <Badge variant="secondary">Other</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-blue-500" />;
  };

  if (!isAdmin) {
    // Show read-only view for non-admins
    if (documents.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No documents uploaded yet.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {documents.map((document) => (
          <Card key={document.id} className="p-4">
            <div className="flex items-center gap-3">
              {getFileIcon(document.mime_type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{document.file_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getDocumentTypeBadge(document.document_type)}
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(document.file_size)}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(document)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Admin view with upload capability
  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Select
            value={selectedDocumentType}
            onValueChange={(value: any) => setSelectedDocumentType(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trespass_warning">Trespass Warning</SelectItem>
              <SelectItem value="court_order">Court Order</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Uploading document...</p>
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop a document here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOC, DOCX • Max 5MB • Admin only
              </p>
            </>
          )}
        </div>
      </div>

      {/* Documents List */}
      {documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((document) => (
            <Card key={document.id} className="p-4">
              <div className="flex items-center gap-3">
                {getFileIcon(document.mime_type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{document.file_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getDocumentTypeBadge(document.document_type)}
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(document.file_size)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(document.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(document)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteDocument(document.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No documents uploaded yet. Upload a document using the area above.
        </div>
      )}
    </div>
  );
}
