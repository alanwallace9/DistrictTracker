'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  History,
  ArrowLeft,
  Loader2,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ReconciliationSummary, DiscrepancyType } from '@/lib/validation/schemas';

interface Props {
  summary: ReconciliationSummary;
  sessionId: string;
}

// Inline helper for discrepancy type badges
function getTypeBadge(type: DiscrepancyType) {
  const config: Record<
    DiscrepancyType,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    matched: { label: 'Matched', variant: 'default' },
    field_conflict: { label: 'Conflict', variant: 'secondary' },
    new_in_sis: { label: 'New in SIS', variant: 'outline' },
    missing_from_sis: { label: 'Missing', variant: 'destructive' },
  };
  const { label, variant } = config[type] || { label: type, variant: 'secondary' };
  return <Badge variant={variant}>{label}</Badge>;
}

export function SummaryReport({ summary, sessionId }: Props) {
  const [downloading, setDownloading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      // Dynamic import PDF generator (29MB library - only load on demand)
      const { generateReconciliationPDF } = await import('@/lib/daep/pdf-generator');
      const blob = await generateReconciliationPDF(summary);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `reconciliation-summary-${dateStr}-${summary.sessionId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'PDF Downloaded',
        description: 'Reconciliation summary report saved successfully.',
      });
    } catch (error) {
      console.error('[PDF] Generation failed:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleViewAuditLog = () => {
    // Navigate to session page with audit panel open
    router.push(`/daep/reconciliation/${sessionId}?audit=true`);
  };

  const handleBackToReconciliation = () => {
    router.push('/daep/reconciliation');
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
        <h1 className="text-2xl font-bold text-green-800 mb-2">Reconciliation Complete!</h1>
        <p className="text-green-700">All discrepancies have been resolved.</p>
      </div>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Session Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">File</p>
            <p className="font-medium truncate" title={summary.fileName}>
              {summary.fileName}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="font-medium">{formatDateTime(summary.completedAt)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Completed By</p>
            <p className="font-medium">{summary.completedByEmail || summary.completedBy}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-medium">{summary.durationFormatted}</p>
          </div>
        </CardContent>
      </Card>

      {/* Overall Results */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Overall Results</h2>
        <p className="text-muted-foreground mb-4">
          Total Records: <span className="font-semibold text-foreground">{summary.totalRecords}</span>
        </p>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Matched</p>
                  <p className="text-2xl font-bold text-green-600">{summary.matchedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Conflicts Resolved</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.conflictCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <PlusCircle className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">New Created</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.newPlacementsCreated}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MinusCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Missing Reviewed</p>
                  <p className="text-2xl font-bold text-red-600">{summary.missingReviewed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resolution Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Accept SIS</p>
              <p className="text-3xl font-bold text-blue-700">{summary.acceptedSISCount}</p>
              <p className="text-sm text-blue-600">records updated from SIS data</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Keep DAEP</p>
              <p className="text-3xl font-bold text-green-700">{summary.keptDAEPCount}</p>
              <p className="text-sm text-green-600">records retained DAEP values</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discrepancies Resolved Table */}
      {summary.resolutions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Discrepancies Resolved ({summary.resolutions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>SIS Value</TableHead>
                    <TableHead>DAEP Value</TableHead>
                    <TableHead>Accepted</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.resolutions.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {r.studentName}
                        <span className="block text-xs text-muted-foreground">{r.studentId}</span>
                      </TableCell>
                      <TableCell>{getTypeBadge(r.discrepancyType)}</TableCell>
                      <TableCell className="text-sm">{r.field || '—'}</TableCell>
                      <TableCell className="text-sm">{r.sisValue || '—'}</TableCell>
                      <TableCell className="text-sm">{r.daepValue || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={r.resolution === 'accept_sis' ? 'default' : 'secondary'}>
                          {r.accepted}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                        {r.note || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matched Records Table */}
      {summary.matchedRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Matched Records ({summary.matchedRecords.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Campus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.matchedRecords.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.studentName}</TableCell>
                      <TableCell>{r.homeCampus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
        <Button onClick={handleDownloadPDF} disabled={downloading}>
          {downloading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {downloading ? 'Generating PDF...' : 'Download PDF'}
        </Button>
        <Button variant="outline" onClick={handleViewAuditLog}>
          <History className="h-4 w-4 mr-2" />
          View Audit Log
        </Button>
        <Button variant="ghost" onClick={handleBackToReconciliation}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reconciliation
        </Button>
      </div>
    </div>
  );
}

// Helper to format date/time
function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}
