'use client';

/**
 * Decision History Panel Component
 * Story 2-11: View history of rollover decisions for a student
 */

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History, User, Calendar, FileText } from 'lucide-react';
import {
  getRolloverDecisionHistory,
  type RolloverCandidate,
  type RolloverDecisionRecord,
  type RolloverDecision,
} from '@/app/actions/daep/rollover';

interface DecisionHistoryPanelProps {
  candidate: RolloverCandidate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DECISION_LABELS: Record<RolloverDecision, string> = {
  continue_daep: 'Continue DAEP',
  return_home: 'Return Home',
};

const DECISION_COLORS: Record<RolloverDecision, string> = {
  continue_daep: 'bg-[rgb(var(--daep-info))]/15 text-[rgb(var(--daep-info))]',
  return_home: 'bg-[rgb(var(--daep-success))]/15 text-[rgb(var(--daep-success))]',
};

export function DecisionHistoryPanel({
  candidate,
  open,
  onOpenChange,
}: DecisionHistoryPanelProps) {
  const [history, setHistory] = useState<RolloverDecisionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getRolloverDecisionHistory(candidate.placement_id)
        .then(setHistory)
        .finally(() => setLoading(false));
    }
  }, [open, candidate.placement_id]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Decision History
          </SheetTitle>
          <SheetDescription>
            Rollover decisions for {candidate.student_name}
          </SheetDescription>
        </SheetHeader>

        {/* Student Info */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="font-medium">{candidate.student_name}</p>
          <p className="text-sm text-muted-foreground">
            {candidate.student_id} • {candidate.incident_number}
          </p>
        </div>

        <Separator className="my-4" />

        {/* History List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2 text-sm">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No decisions recorded yet</p>
            </div>
          ) : (
            history.map((record) => (
              <div
                key={record.id}
                className="border rounded-lg p-4 space-y-3"
              >
                {/* Decision Badge */}
                <div className="flex items-center justify-between">
                  <Badge className={DECISION_COLORS[record.decision as RolloverDecision]}>
                    {DECISION_LABELS[record.decision as RolloverDecision]}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {record.days_remaining} days
                  </Badge>
                </div>

                {/* Meta Info */}
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(record.decided_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>By: {record.decided_by}</span>
                  </div>
                </div>

                {/* Notes */}
                {record.notes && (
                  <div className="pt-2 border-t">
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="h-3 w-3 mt-1 text-muted-foreground" />
                      <p className="text-muted-foreground">{record.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
