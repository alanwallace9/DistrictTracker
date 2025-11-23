'use client';

import { useState } from 'react';
import { X, Download, ExternalLink, FileText, File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { RecordDocument } from '@/lib/supabase';
import { getDocumentUrl, deleteDocument } from '@/lib/file-upload';

interface DocumentViewerProps {
  document: RecordDocument | null;
  isOpen: boolean;
  onClose: () => void;
  canDelete?: boolean;
  onDelete?: (documentId: string) => void;
}

export function DocumentViewer({
  document,
  isOpen,
  onClose,
  canDelete = false,
  onDelete,
}: DocumentViewerProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!document) return null;

  const documentUrl = getDocumentUrl(document.storage_path);
  const isPdf = document.mime_type === 'application/pdf';

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = documentUrl;
    link.download = document.file_name;
    link.click();
  };

  const handleOpenInNewTab = () => {
    window.open(documentUrl, '_blank');
  };

  const handleDelete = async () => {
    if (!onDelete || !canDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteDocument(document.id);
      onDelete(document.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start gap-3">
            {getFileIcon(document.mime_type)}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg truncate">{document.file_name}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                {getDocumentTypeBadge(document.document_type)}
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(document.file_size)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Uploaded {new Date(document.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <div className="px-6 pt-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Document Preview */}
        <div className="flex-1 overflow-hidden px-6 py-4">
          {isPdf ? (
            <iframe
              src={documentUrl}
              className="w-full h-full rounded border"
              title={document.file_name}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
              {getFileIcon(document.mime_type)}
              <div>
                <p className="text-lg font-medium">{document.file_name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Preview not available for this file type
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Download the file to view its contents
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleOpenInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {canDelete && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
