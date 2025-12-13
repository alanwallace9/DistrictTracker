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
} from 'lucide-react';
import { toast } from 'sonner';
import { resolveDiscrepancy, bulkAcceptMatches } from '@/app/actions/daep/reconciliation';
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

  // Filter to pending discrepancies only (exclude matched)
  const pendingDiscrepancies = useMemo(
    () => discrepancies.filter((d) => d.type !== 'matched' && d.resolution === 'pending'),
    [discrepancies]
  );

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

  // Completion state
  if (isComplete) {
    return (
      <div className="space-y-6">
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <PartyPopper className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200 text-lg">
            All Discrepancies Resolved!
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            {stats.matched} records matched, {stats.fieldConflicts + stats.newInSis + stats.missingFromSis} discrepancies resolved.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => router.push('/daep/reconciliation')}>
            Back to Reconciliation
          </Button>
          <Button variant="outline" onClick={() => router.push('/daep/reconciliation')}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Another CSV
          </Button>
        </div>
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

  // Get smart button labels
  const getButtonLabels = () => {
    if (!currentDiscrepancy) return { left: 'Accept SIS', right: 'Keep DAEP' };

    if (currentDiscrepancy.type === 'new_in_sis') {
      return { left: 'Create Placement', right: 'Dismiss' };
    }
    if (currentDiscrepancy.type === 'missing_from_sis') {
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
            {stats.matched} matched • {totalPending} discrepancies to review
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

            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* SIS Column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {sisName} Export
                  </Badge>
                </div>
                {currentDiscrepancy.type === 'missing_from_sis' ? (
                  <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg text-muted-foreground">
                    <div className="text-center">
                      <MinusCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                      <p>Not in SIS Export</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {renderFieldRows(currentDiscrepancy, 'sis')}
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
                {currentDiscrepancy.type === 'new_in_sis' ? (
                  <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg text-muted-foreground">
                    <div className="text-center">
                      <MinusCircle className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                      <p>Not in DAEP</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {renderFieldRows(currentDiscrepancy, 'daep')}
                  </div>
                )}
              </div>
            </div>

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
        <SummaryCard icon={CheckCircle} label="Matched" count={stats.matched} color="green" />
        <SummaryCard icon={AlertTriangle} label="Conflicts" count={stats.fieldConflicts} color="yellow" />
        <SummaryCard icon={PlusCircle} label="New in SIS" count={stats.newInSis} color="blue" />
        <SummaryCard icon={MinusCircle} label="Missing" count={stats.missingFromSis} color="red" />
      </div>
    </div>
  );
}

// Helper to render field rows
function renderFieldRows(discrepancy: ComparisonRecord, side: 'sis' | 'daep') {
  const data = side === 'sis' ? discrepancy.sisRecord : discrepancy.daepPlacement;
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

  return fields.map(({ key, label }) => {
    const value = data?.[key as keyof typeof data];
    const isConflict = conflictFields.has(key);
    const displayValue = value != null ? String(value) : '—';

    return (
      <div
        key={key}
        className={cn(
          'flex justify-between p-2 rounded text-sm',
          isConflict && 'bg-yellow-50 border border-yellow-200'
        )}
      >
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium', isConflict && 'text-yellow-700')}>{displayValue}</span>
      </div>
    );
  });
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
