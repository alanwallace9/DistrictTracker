'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { ParseResults } from './components/parse-results';
import { ComparisonResults } from './components/comparison-results';
import { DiscrepancyReview } from './components/discrepancy-review';
import { SummaryReport } from './components/summary-report';
import {
  getReconciliationSession,
  parseCSVFile,
  runComparison,
  getSessionDiscrepancies,
  getFieldMapping,
  getReconciliationSummary,
} from '@/app/actions/daep/reconciliation';
import type { ReconciliationSession, ParseResult, ComparisonResult, ComparisonRecord, ReconciliationSummary } from '@/lib/validation/schemas';

export default function ReconciliationSessionPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<ReconciliationSession | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [discrepancies, setDiscrepancies] = useState<ComparisonRecord[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [sisName, setSisName] = useState<string>('SIS');
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session data
  const loadSession = useCallback(async () => {
    try {
      const data = await getReconciliationSession(sessionId);
      if (!data) {
        setError('Session not found');
        return null;
      }
      setSession(data);
      return data;
    } catch (err) {
      console.error('[Session] Error loading:', err);
      setError('Failed to load session');
      return null;
    }
  }, [sessionId]);

  // Load discrepancies and SIS name
  const loadDiscrepancies = useCallback(async () => {
    try {
      const [discData, mappingData] = await Promise.all([
        getSessionDiscrepancies(sessionId),
        getFieldMapping(),
      ]);
      setDiscrepancies(discData);
      if (mappingData?.sis_name) {
        setSisName(mappingData.sis_name === 'Other' && mappingData.sis_name_other
          ? mappingData.sis_name_other
          : mappingData.sis_name);
      }
    } catch (err) {
      console.error('[Session] Error loading discrepancies:', err);
    }
  }, [sessionId]);

  // Load summary for completed sessions
  const loadSummary = useCallback(async () => {
    try {
      const summaryData = await getReconciliationSummary(sessionId);
      setSummary(summaryData);
    } catch (err) {
      console.error('[Session] Error loading summary:', err);
    }
  }, [sessionId]);

  // Run comparison engine
  const runComparisonAction = useCallback(async () => {
    setComparing(true);
    try {
      const result = await runComparison(sessionId);
      setComparisonResult(result);

      // Reload session to get updated status
      await loadSession();

      if (!result.success) {
        toast({
          title: 'Comparison Failed',
          description: result.errors.length > 0 ? result.errors[0] : 'An error occurred during comparison',
          variant: 'destructive',
        });
      } else {
        const totalDiscrepancies = result.stats.fieldConflicts + result.stats.newInSis + result.stats.missingFromSis;
        if (totalDiscrepancies === 0) {
          toast({
            title: 'All Records Match!',
            description: `${result.stats.matched} records matched perfectly. No discrepancies found.`,
          });
        } else {
          toast({
            title: 'Comparison Complete',
            description: `Found ${totalDiscrepancies} discrepancies requiring review`,
          });
        }
      }
    } catch (err) {
      console.error('[Session] Comparison error:', err);
      toast({
        title: 'Error',
        description: 'Failed to compare records',
        variant: 'destructive',
      });
    } finally {
      setComparing(false);
    }
  }, [sessionId, loadSession, toast]);

  // Parse the CSV file
  const runParsing = useCallback(async () => {
    setParsing(true);
    try {
      const result = await parseCSVFile(sessionId);
      setParseResult(result);

      // Reload session to get updated status
      const updatedSession = await loadSession();

      if (!result.success) {
        toast({
          title: 'Parsing Failed',
          description: 'No records could be parsed. Check the errors below.',
          variant: 'destructive',
        });
      } else if (result.errors.length > 0) {
        toast({
          title: 'Parsing Complete with Errors',
          description: `${result.stats.parsedRows} records parsed, ${result.errors.length} errors`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Parsing Complete',
          description: `Successfully parsed ${result.stats.parsedRows} records`,
        });
      }

      // Auto-start comparison if parsing was successful and status is 'comparing'
      if (result.success && updatedSession?.status === 'comparing') {
        await runComparisonAction();
      }
    } catch (err) {
      console.error('[Session] Parsing error:', err);
      toast({
        title: 'Error',
        description: 'Failed to parse CSV file',
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  }, [sessionId, loadSession, toast, runComparisonAction]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const sessionData = await loadSession();

      // Auto-start parsing if status is 'parsing' (just came from mapping)
      if (sessionData && sessionData.status === 'parsing') {
        await runParsing();
      }
      // Auto-start comparison if status is 'comparing' (parsing complete, ready to compare)
      else if (sessionData && sessionData.status === 'comparing') {
        await runComparisonAction();
      }
      // Auto-load discrepancies if status is 'in_review'
      else if (sessionData && sessionData.status === 'in_review') {
        await loadDiscrepancies();
      }
      // Auto-load summary if status is 'completed'
      else if (sessionData && sessionData.status === 'completed') {
        await loadSummary();
      }

      setLoading(false);
    };

    init();
  }, [loadSession, runParsing, runComparisonAction, loadDiscrepancies, loadSummary]);

  // Handle continue to comparison
  const handleContinue = async () => {
    await runComparisonAction();
  };

  // Handle review discrepancies button - now loads discrepancies inline
  const handleReviewDiscrepancies = async () => {
    await loadDiscrepancies();
  };

  // Handle refresh after resolution
  const handleRefresh = async () => {
    const updatedSession = await loadSession();
    // If session is now completed, load summary instead of discrepancies
    if (updatedSession?.status === 'completed') {
      await loadSummary();
    } else {
      await loadDiscrepancies();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/daep/reconciliation')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reconciliation
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Session not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Mapping required state
  if (session.status === 'mapping_required') {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/daep/reconciliation')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reconciliation
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Field Mapping Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Before we can parse your CSV file, you need to configure how your SIS columns map to
              DAEP fields. This is a one-time setup.
            </p>
            <Button
              onClick={() =>
                router.push(
                  `/daep/settings/csv-mapping?session=${sessionId}${session.detected_sis ? `&detected_sis=${session.detected_sis}` : ''}`
                )
              }
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Field Mapping
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/daep/reconciliation')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {session.file_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Uploaded {new Date(session.upload_date).toLocaleDateString()}
              {session.detected_sis && ` | Detected: ${session.detected_sis}`}
            </p>
          </div>
        </div>
      </div>

      {/* Parsing in progress */}
      {parsing && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Parsing CSV file...</p>
                <p className="text-sm text-muted-foreground">
                  Applying field mapping and validating records
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparing in progress */}
      {comparing && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Comparing Records...</p>
                <p className="text-sm text-muted-foreground">
                  Matching SIS records against DAEP placements
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Results */}
      {!comparing && comparisonResult && (
        <ComparisonResults result={comparisonResult} onReview={handleReviewDiscrepancies} />
      )}

      {/* Parse Results (only show if no comparison result yet) */}
      {!parsing && !comparing && parseResult && !comparisonResult && (
        <ParseResults result={parseResult} onContinue={handleContinue} />
      )}

      {/* No results yet - offer to parse */}
      {!parsing &&
        !comparing &&
        !parseResult &&
        !comparisonResult &&
        session.status === 'uploading' && (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center gap-4">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">Ready to Parse</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click the button below to parse this CSV file using your saved field mapping.
                  </p>
                  <Button onClick={runParsing}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Parse CSV File
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Session in review status - show discrepancy review or prompt to load */}
      {!parsing &&
        !comparing &&
        session.status === 'in_review' && (
          discrepancies.length > 0 ? (
            <DiscrepancyReview
              sessionId={sessionId}
              discrepancies={discrepancies}
              sisName={sisName}
              stats={{
                matched: session.matched_count || 0,
                fieldConflicts: session.discrepancy_count || 0,
                newInSis: session.new_in_sis_count || 0,
                missingFromSis: session.missing_from_sis_count || 0,
              }}
              onRefresh={handleRefresh}
            />
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center gap-4">
                  <AlertCircle className="h-12 w-12 text-yellow-500" />
                  <div className="text-center">
                    <p className="font-medium">Discrepancies Found</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      This session has discrepancies that require review.
                    </p>
                    <Button onClick={handleReviewDiscrepancies}>
                      Review Discrepancies
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        )}

      {/* Session completed - show summary report */}
      {!parsing && !comparing && session.status === 'completed' && summary && (
        <SummaryReport summary={summary} sessionId={sessionId} />
      )}

      {/* Session completed but no summary loaded yet - show loading */}
      {!parsing && !comparing && session.status === 'completed' && !summary && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Loading Summary...</p>
                <p className="text-sm text-muted-foreground">
                  Preparing reconciliation summary report
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session failed */}
      {!parsing && !parseResult && session.status === 'failed' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Parsing Failed</AlertTitle>
          <AlertDescription>
            This session failed to parse. You may need to upload a new file or check your field
            mapping configuration.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
