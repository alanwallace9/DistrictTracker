'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  PartyPopper,
  Loader2,
  Upload,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { resolveDiscrepancy, bulkAcceptMatches, flagForLater } from '@/app/actions/daep/reconciliation';
import type { ComparisonRecord, FieldConflict } from '@/lib/validation/schemas';
import { cn } from '@/lib/utils';

interface DiscrepancyReviewProps {
  sessionId: string;
  discrepancies: ComparisonRecord[];
  sisName: string;
  stats: {
    matched: number;
    fieldConflicts: number;
    newInSis: number;
    missingFromSis: number;
  };
  onRefresh: () => void;
}

const TYPE_CONFIG = {
  field_conflict: {
    label: 'Field Conflict',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: AlertTriangle,
  },
  new_in_sis: {
    label: 'New in SIS',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: PlusCircle,
  },
  missing_from_sis: {
    label: 'Missing from SIS',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: MinusCircle,
  },
  matched: {
    label: 'Matched',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
  },
};

export function DiscrepancyReview({
  sessionId,
  discrepancies,
  sisName,
  stats,
  onRefresh,
}: DiscrepancyReviewProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [isBulkAccepting, setIsBulkAccepting] = useState(false);
  const [note, setNote] = useState('');
  // Track per-field selections for field conflicts: { fieldName: 'sis' | 'daep' }
  const [fieldSelections, setFieldSelections] = useState<Record<string, 'sis' | 'daep'>>({});

  // Filter to pending discrepancies only (exclude matched)
  const pendingDiscrepancies = useMemo(
    () => discrepancies.filter((d) => d.type !== 'matched' && d.resolution === 'pending'),
    [discrepancies]
  );

  // Calculate live stats from discrepancies array (auto-updates when discrepancies change)
  const liveStats = useMemo(() => {
    const pending = discrepancies.filter((d) => d.resolution === 'pending');
    const resolved = discrepancies.filter((d) => d.resolution !== 'pending');

    return {
      // Matched = original matched + resolved discrepancies
      matched: stats.matched + resolved.length,
      // Count remaining pending by type
      fieldConflicts: pending.filter((d) => d.type === 'field_conflict').length,
      newInSis: pending.filter((d) => d.type === 'new_in_sis').length,
      missingFromSis: pending.filter((d) => d.type === 'missing_from_sis').length,
    };
  }, [discrepancies, stats.matched]);

  const currentDiscrepancy = pendingDiscrepancies[currentIndex];
  const totalPending = pendingDiscrepancies.length;
  const isComplete = totalPending === 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isResolving || isBulkAccepting) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
          break;
        case 'ArrowRight':
          if (currentIndex < totalPending - 1) setCurrentIndex(currentIndex + 1);
          break;
        case 's':
        case 'S':
          if (currentDiscrepancy) handleResolve('accept_sis');
          break;
        case 'd':
        case 'D':
          if (currentDiscrepancy) handleResolve('keep_daep');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalPending, currentDiscrepancy, isResolving, isBulkAccepting]);

  const handleResolve = useCallback(
    async (resolution: 'accept_sis' | 'keep_daep') => {
      if (!currentDiscrepancy?.id) return;

      setIsResolving(true);
      try {
        const result = await resolveDiscrepancy(
          sessionId,
          currentDiscrepancy.id,
          resolution,
          note || undefined
        );

        if (!result.success) {
          toast.error(result.error || 'Failed to resolve');
          return;
        }

        toast.success(resolution === 'accept_sis' ? 'SIS data applied' : 'DAEP data kept');
        setNote('');
        onRefresh();
      } catch (err) {
        console.error('[Resolution] Error:', err);
        toast.error('Failed to resolve discrepancy');
      } finally {
        setIsResolving(false);
      }
    },
    [sessionId, currentDiscrepancy?.id, note, onRefresh]
  );

  const handleBulkAccept = async () => {
    setIsBulkAccepting(true);
    try {
      const result = await bulkAcceptMatches(sessionId);
      if (!result.success) {
        toast.error(result.error || 'Failed to accept matches');
        return;
      }
      toast.success(`${result.count} matched records accepted`);
      onRefresh();
    } catch (err) {
      console.error('[BulkAccept] Error:', err);
      toast.error('Failed to accept matches');
    } finally {
      setIsBulkAccepting(false);
    }
  };

  const handleFlag = useCallback(async () => {
    if (!currentDiscrepancy?.id) return;

    setIsResolving(true);
    try {
      const result = await flagForLater(currentDiscrepancy.id, note || undefined);
      if (!result.success) {
        toast.error(result.error || 'Failed to flag');
        return;
      }
      toast.success('Added to pending actions');
      setNote('');
      onRefresh();
    } catch (err) {
      console.error('[Flag] Error:', err);
      toast.error('Failed to flag for later');
    } finally {
      setIsResolving(false);
    }
  }, [currentDiscrepancy?.id, note, onRefresh]);

  // Completion state - show summary of resolved records
  if (isComplete) {
    const resolvedRecords = discrepancies.filter((d) => d.resolution !== 'pending');
    const resolvedByType = {
      field_conflict: resolvedRecords.filter((d) => d.type === 'field_conflict'),
      new_in_sis: resolvedRecords.filter((d) => d.type === 'new_in_sis'),
      missing_from_sis: resolvedRecords.filter((d) => d.type === 'missing_from_sis'),
    };

    return (
      <div className="space-y-6">
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <PartyPopper className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200 text-lg">
            All Discrepancies Resolved!
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            {stats.matched} records matched, {resolvedRecords.length} discrepancies resolved.
          </AlertDescription>
        </Alert>

        {/* Summary of resolved records */}
        <Card>
          <CardHeader className="pb-3">
            <div className="text-sm font-medium">Resolution Summary</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {resolvedByType.field_conflict.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Field Conflicts Resolved ({resolvedByType.field_conflict.length})
                </div>
                <div className="space-y-1 ml-6">
                  {resolvedByType.field_conflict.map((r) => (
                    <div key={r.id} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{r.studentName}</span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', r.resolution === 'flagged' && 'border-orange-300 text-orange-700 bg-orange-50')}
                      >
                        {r.resolution === 'accept_sis' ? 'Used SIS' : r.resolution === 'flagged' ? 'Flagged' : 'Kept DAEP'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resolvedByType.new_in_sis.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-2">
                  <PlusCircle className="h-4 w-4" />
                  New in SIS ({resolvedByType.new_in_sis.length})
                </div>
                <div className="space-y-1 ml-6">
                  {resolvedByType.new_in_sis.map((r) => (
                    <div key={r.id} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{r.studentName}</span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', r.resolution === 'flagged' && 'border-orange-300 text-orange-700 bg-orange-50')}
                      >
                        {r.resolution === 'accept_sis' ? 'Created' : r.resolution === 'flagged' ? 'Flagged' : 'Dismissed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resolvedByType.missing_from_sis.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
                  <MinusCircle className="h-4 w-4" />
                  Missing from SIS ({resolvedByType.missing_from_sis.length})
                </div>
                <div className="space-y-1 ml-6">
                  {resolvedByType.missing_from_sis.map((r) => (
                    <div key={r.id} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{r.studentName}</span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', r.resolution === 'flagged' && 'border-orange-300 text-orange-700 bg-orange-50')}
                      >
                        {r.resolution === 'accept_sis' ? 'Used SIS' : r.resolution === 'flagged' ? 'Flagged' : 'Kept DAEP'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-center">
          <Button onClick={() => router.push('/daep/reconciliation')}>
            Back to Reconciliation
          </Button>
          <Button variant="outline" onClick={() => router.push('/daep/reconciliation')}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Another CSV
          </Button>
        </div>

        {/* Demo Reset - only show for sample sessions */}
        {sessionId.startsWith('sample') && (
          <div className="pt-4 border-t mt-6">
            <p className="text-xs text-muted-foreground text-center mb-2">Demo Mode</p>
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  const { resetDemoSession } = await import('@/app/actions/daep/reconciliation');
                  const result = await resetDemoSession(sessionId);
                  if (result.success) {
                    onRefresh();
                  }
                }}
              >
                Reset Demo
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const config = TYPE_CONFIG[currentDiscrepancy?.type || 'field_conflict'];
  const Icon = config.icon;

  // Get conflict badge text
  const getBadgeText = () => {
    if (!currentDiscrepancy) return '';
    if (currentDiscrepancy.type === 'new_in_sis') return 'New Student';
    if (currentDiscrepancy.type === 'missing_from_sis') return 'Missing from SIS';
    if (currentDiscrepancy.conflicts?.length === 1) {
      return `${currentDiscrepancy.conflicts[0].fieldLabel} Mismatch`;
    }
    return 'Multiple Conflicts';
  };

  // Get smart button labels based on data availability
  const getButtonLabels = () => {
    if (!currentDiscrepancy) return { left: 'Accept SIS', right: 'Keep DAEP' };

    const hasSisData = currentDiscrepancy.sisRecord && Object.keys(currentDiscrepancy.sisRecord).length > 0;
    const hasDaepData = currentDiscrepancy.daepPlacement && Object.keys(currentDiscrepancy.daepPlacement).length > 0;

    if (currentDiscrepancy.type === 'new_in_sis') {
      return { left: 'Create Placement', right: hasDaepData ? 'Dismiss' : null };
    }
    if (currentDiscrepancy.type === 'missing_from_sis') {
      // Show both buttons if SIS data exists (for comparison demo)
      if (hasSisData) {
        return { left: 'Accept SIS', right: 'Keep DAEP' };
      }
      return { left: null, right: 'Keep Record' };
    }
    // Field conflict - show values
    const conflict = currentDiscrepancy.conflicts?.[0];
    if (conflict) {
      return {
        left: `Accept SIS (${conflict.sisValue})`,
        right: `Keep DAEP (${conflict.daepValue})`,
      };
    }
    return { left: 'Accept SIS', right: 'Keep DAEP' };
  };

  const buttonLabels = getButtonLabels();

  return (
    <div className="space-y-6">
      {/* Header with Accept All Matches */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {liveStats.matched} matched • {totalPending} discrepancies to review
          </p>
        </div>
        {stats.matched > 0 && (
          <Button variant="outline" onClick={handleBulkAccept} disabled={isBulkAccepting}>
            {isBulkAccepting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Accept All Matches
          </Button>
        )}
      </div>

      {/* Current Discrepancy Card */}
      {currentDiscrepancy && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold">
                  Discrepancy {currentIndex + 1} of {totalPending}
                </span>
                <Badge className={cn('flex items-center gap-1', config.color)}>
                  <Icon className="h-3 w-3" />
                  {getBadgeText()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(Math.min(totalPending - 1, currentIndex + 1))}
                  disabled={currentIndex >= totalPending - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Student Info */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold">
                {currentDiscrepancy.studentName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
              </div>
              <div>
                <div className="font-semibold text-lg">{currentDiscrepancy.studentName}</div>
                <div className="text-sm text-muted-foreground">
                  {currentDiscrepancy.studentId} • {currentDiscrepancy.incidentNumber}
                </div>
              </div>
            </div>

            {/* Comparison View - Table style for field conflicts, side-by-side for new/missing */}
            {currentDiscrepancy.type === 'field_conflict' ? (
              /* Table-style view for field conflicts with per-field selection */
              <FieldConflictTable
                discrepancy={currentDiscrepancy}
                sisName={sisName}
                fieldSelections={fieldSelections}
                onFieldSelectionChange={(field, source) => {
                  setFieldSelections(prev => ({ ...prev, [field]: source }));
                }}
              />
            ) : (
              /* Side-by-Side for new_in_sis and missing_from_sis */
              <div className="grid grid-cols-2 gap-4">
                {/* SIS Column */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {sisName} Export
                    </Badge>
                  </div>
                  {currentDiscrepancy.sisRecord && Object.keys(currentDiscrepancy.sisRecord).length > 0 ? (
                    <div className="space-y-2">
                      {renderFieldRows(currentDiscrepancy, 'sis')}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg text-muted-foreground">
                      <div className="text-center">
                        <MinusCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                        <p>Not in SIS Export</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* DAEP Column */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      DAEP Data
                    </Badge>
                  </div>
                  {currentDiscrepancy.daepPlacement && Object.keys(currentDiscrepancy.daepPlacement).length > 0 ? (
                    <div className="space-y-2">
                      {renderFieldRows(currentDiscrepancy, 'daep')}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg text-muted-foreground">
                      <div className="text-center">
                        <MinusCircle className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                        <p>Not in DAEP</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resolution Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              {buttonLabels.left && (
                <Button
                  onClick={() => handleResolve('accept_sis')}
                  disabled={isResolving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isResolving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {buttonLabels.left}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => handleResolve('keep_daep')}
                disabled={isResolving}
              >
                {isResolving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {buttonLabels.right}
              </Button>
              {/* Flag for Later - only for missing_from_sis with DAEP data */}
              {currentDiscrepancy.type === 'missing_from_sis' && currentDiscrepancy.daepPlacement && (
                <Button
                  variant="ghost"
                  onClick={handleFlag}
                  disabled={isResolving}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  {isResolving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flag className="h-4 w-4 mr-2" />}
                  Flag for Later
                </Button>
              )}
              <Input
                placeholder="Add note (optional)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex-1 max-w-xs"
              />
            </div>

            {/* Keyboard shortcuts hint */}
            <p className="text-xs text-muted-foreground">
              Keyboard: S = Accept SIS, D = Keep DAEP, ← → = Navigate
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards at Bottom */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard icon={CheckCircle} label="Matched" count={liveStats.matched} color="green" />
        <SummaryCard icon={AlertTriangle} label="Conflicts" count={liveStats.fieldConflicts} color="yellow" />
        <SummaryCard icon={PlusCircle} label="New in SIS" count={liveStats.newInSis} color="blue" />
        <SummaryCard icon={MinusCircle} label="Missing" count={liveStats.missingFromSis} color="red" />
      </div>
    </div>
  );
}

// Table-style component for field conflicts with per-field selection
function FieldConflictTable({
  discrepancy,
  sisName,
  fieldSelections,
  onFieldSelectionChange,
}: {
  discrepancy: ComparisonRecord;
  sisName: string;
  fieldSelections: Record<string, 'sis' | 'daep'>;
  onFieldSelectionChange: (field: string, source: 'sis' | 'daep') => void;
}) {
  const sisData = discrepancy.sisRecord || {};
  const daepData = discrepancy.daepPlacement || {};
  const conflicts = discrepancy.conflicts || [];
  const conflictFields = new Set(conflicts.map((c) => c.field));

  const fields = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'days_assigned', label: 'Days Assigned' },
    { key: 'offense_code', label: 'Offense Code' },
  ];

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[1fr,1fr,1fr,auto,auto] gap-0 bg-muted/50 border-b border-border/50 text-sm font-medium">
        <div className="px-3 py-2 text-muted-foreground">Field</div>
        <div className="px-3 py-2 text-blue-700 border-l border-border/30">{sisName}</div>
        <div className="px-3 py-2 text-green-700 border-l border-border/30">DAEP</div>
        <div className="px-3 py-2 text-center border-l border-border/30 w-16">
          <span className="text-blue-600 text-xs">Use SIS</span>
        </div>
        <div className="px-3 py-2 text-center border-l border-border/30 w-16">
          <span className="text-green-600 text-xs">Use DAEP</span>
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-border/30">
        {fields.map(({ key, label }, index) => {
          const sisValue = sisData[key as keyof typeof sisData];
          const daepValue = daepData[key as keyof typeof daepData];
          const isConflict = conflictFields.has(key);
          const sisDisplay = sisValue != null ? String(sisValue) : '—';
          const daepDisplay = daepValue != null ? String(daepValue) : '—';
          const selected = fieldSelections[key] || (isConflict ? undefined : 'daep'); // Default non-conflicts to DAEP

          return (
            <div
              key={key}
              className={cn(
                'grid grid-cols-[1fr,1fr,1fr,auto,auto] gap-0 text-sm',
                index % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                isConflict && 'bg-yellow-50/50 dark:bg-yellow-950/20'
              )}
            >
              <div className="px-3 py-2.5 text-muted-foreground flex items-center gap-2">
                {label}
                {isConflict && (
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                )}
              </div>
              <div className={cn(
                'px-3 py-2.5 border-l border-border/30 tabular-nums',
                isConflict && selected === 'sis' && 'bg-blue-100/50 font-medium text-blue-800',
                isConflict && selected !== 'sis' && 'text-muted-foreground'
              )}>
                {sisDisplay}
              </div>
              <div className={cn(
                'px-3 py-2.5 border-l border-border/30 tabular-nums',
                isConflict && selected === 'daep' && 'bg-green-100/50 font-medium text-green-800',
                isConflict && selected !== 'daep' && 'text-muted-foreground'
              )}>
                {daepDisplay}
              </div>
              <div className="px-3 py-2.5 border-l border-border/30 flex items-center justify-center w-16">
                {isConflict && (
                  <button
                    onClick={() => onFieldSelectionChange(key, 'sis')}
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center transition-all',
                      selected === 'sis'
                        ? 'bg-blue-600 text-white'
                        : 'bg-muted hover:bg-blue-100 text-muted-foreground hover:text-blue-600'
                    )}
                  >
                    {selected === 'sis' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border-2 border-current" />
                    )}
                  </button>
                )}
              </div>
              <div className="px-3 py-2.5 border-l border-border/30 flex items-center justify-center w-16">
                {isConflict && (
                  <button
                    onClick={() => onFieldSelectionChange(key, 'daep')}
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center transition-all',
                      selected === 'daep'
                        ? 'bg-green-600 text-white'
                        : 'bg-muted hover:bg-green-100 text-muted-foreground hover:text-green-600'
                    )}
                  >
                    {selected === 'daep' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border-2 border-current" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to render field rows with difference highlighting
function renderFieldRows(discrepancy: ComparisonRecord, side: 'sis' | 'daep') {
  const sisData = discrepancy.sisRecord || {};
  const daepData = discrepancy.daepPlacement || {};
  const data = side === 'sis' ? sisData : daepData;
  const conflicts = discrepancy.conflicts || [];
  const conflictFields = new Set(conflicts.map((c) => c.field));

  const fields = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'days_assigned', label: 'Days Assigned' },
    { key: 'offense_code', label: 'Offense Code' },
  ];

  // Check if values differ between SIS and DAEP
  const hasBothSides = Object.keys(sisData).length > 0 && Object.keys(daepData).length > 0;

  return (
    <div className="divide-y divide-border/50 border border-border/30 rounded-lg overflow-hidden">
      {fields.map(({ key, label }, index) => {
        const value = data?.[key as keyof typeof data];
        const sisValue = sisData[key as keyof typeof sisData];
        const daepValue = daepData[key as keyof typeof daepData];
        const isConflict = conflictFields.has(key);
        // Check if values differ (normalize to string for comparison)
        const isDifferent = hasBothSides && String(sisValue ?? '') !== String(daepValue ?? '');
        const needsAttention = isConflict || isDifferent;
        const displayValue = value != null ? String(value) : '—';

        return (
          <div
            key={key}
            className={cn(
              'flex justify-between items-center px-3 py-2.5 text-sm',
              // Subtle alternating row backgrounds
              index % 2 === 0 ? 'bg-muted/20' : 'bg-background',
              // Highlight styling for differences
              needsAttention && 'bg-yellow-50 dark:bg-yellow-950/30'
            )}
          >
            <span className="text-muted-foreground flex items-center gap-1.5">
              {label}
              {needsAttention && (
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
              )}
            </span>
            <span className={cn('font-medium tabular-nums', needsAttention && 'text-yellow-700 dark:text-yellow-400')}>
              {displayValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Summary card component
function SummaryCard({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: typeof CheckCircle;
  label: string;
  count: number;
  color: 'green' | 'yellow' | 'blue' | 'red';
}) {
  const colors = {
    green: 'text-green-600 border-green-200',
    yellow: 'text-yellow-600 border-yellow-200',
    blue: 'text-blue-600 border-blue-200',
    red: 'text-red-600 border-red-200',
  };

  return (
    <Card className={count > 0 ? colors[color] : ''}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', count > 0 ? colors[color].split(' ')[0] : 'text-muted-foreground')} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className={cn('text-2xl font-bold mt-1', count > 0 ? colors[color].split(' ')[0] : 'text-muted-foreground')}>
          {count}
        </div>
      </CardContent>
    </Card>
  );
}
