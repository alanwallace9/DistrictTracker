'use client';

/**
 * Rollover Candidates Table Component
 * Story 2-11: AC 2.11.1 - Display rollover candidates
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, MoreHorizontal, Eye, History, ClipboardList } from 'lucide-react';
import { RolloverDecisionDialog } from './RolloverDecisionDialog';
import { DecisionHistoryPanel } from './DecisionHistoryPanel';
import type { RolloverCandidate, RolloverDecision } from '@/app/actions/daep/rollover';

interface RolloverCandidatesTableProps {
  candidates: RolloverCandidate[];
  loading: boolean;
  schoolDaysRemaining: number | null;
  onDecisionRecorded: () => void;
}

type SortKey = 'student_name' | 'days_remaining' | 'home_campus' | 'decision';

const DECISION_BADGE_CLASSES: Record<RolloverDecision, string> = {
  continue_daep: 'bg-[rgb(var(--daep-info))]/15 text-[rgb(var(--daep-info))]',
  return_home: 'bg-[rgb(var(--daep-success))]/15 text-[rgb(var(--daep-success))]',
};

const DECISION_LABELS: Record<RolloverDecision, string> = {
  continue_daep: 'Continue DAEP',
  return_home: 'Return Home',
};

export function RolloverCandidatesTable({
  candidates,
  loading,
  schoolDaysRemaining,
  onDecisionRecorded,
}: RolloverCandidatesTableProps) {
  const router = useRouter();

  // Sort state
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'days_remaining',
    direction: 'desc',
  });

  // Dialog state
  const [selectedCandidate, setSelectedCandidate] = useState<RolloverCandidate | null>(null);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Sort logic
  const sortedCandidates = [...candidates].sort((a, b) => {
    const multiplier = sortConfig.direction === 'asc' ? 1 : -1;

    switch (sortConfig.key) {
      case 'student_name':
        return multiplier * a.student_name.localeCompare(b.student_name);
      case 'days_remaining':
        return multiplier * (a.days_remaining - b.days_remaining);
      case 'home_campus':
        return multiplier * a.home_campus_name.localeCompare(b.home_campus_name);
      case 'decision':
        const aDecision = a.current_decision || '';
        const bDecision = b.current_decision || '';
        return multiplier * aDecision.localeCompare(bDecision);
      default:
        return 0;
    }
  });

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const renderSortableHeader = (label: string, key: SortKey) => {
    const isActive = sortConfig.key === key;
    return (
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="flex items-center gap-1 text-left text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <span>{label}</span>
        {isActive ? (
          <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-50" />
        )}
      </button>
    );
  };

  const handleDecisionClick = (candidate: RolloverCandidate) => {
    setSelectedCandidate(candidate);
    setShowDecisionDialog(true);
  };

  const handleHistoryClick = (candidate: RolloverCandidate) => {
    setSelectedCandidate(candidate);
    setShowHistoryPanel(true);
  };

  const handleViewStudent = (studentId: string) => {
    router.push(`/daep/students/${studentId}`);
  };

  const handleDecisionComplete = () => {
    setShowDecisionDialog(false);
    setSelectedCandidate(null);
    onDecisionRecorded();
  };

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">Loading rollover candidates...</p>
      </div>
    );
  }

  // Empty state
  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg bg-muted/50">
        <p className="text-muted-foreground">No rollover candidates found</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {schoolDaysRemaining === null
            ? 'School calendar not configured'
            : 'All active students can complete their placement before end of year'
          }
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">
                {renderSortableHeader('Student', 'student_name')}
              </TableHead>
              <TableHead>{renderSortableHeader('Home Campus', 'home_campus')}</TableHead>
              <TableHead className="text-center">
                {renderSortableHeader('Days Remaining', 'days_remaining')}
              </TableHead>
              <TableHead className="text-center">Days Over</TableHead>
              <TableHead>{renderSortableHeader('Decision', 'decision')}</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCandidates.map((candidate) => {
              const daysOver = schoolDaysRemaining !== null
                ? candidate.days_remaining - schoolDaysRemaining
                : null;

              return (
                <TableRow
                  key={candidate.placement_id}
                  className={!candidate.current_decision ? 'bg-[rgb(var(--daep-warning))]/5' : ''}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{candidate.student_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {candidate.student_id} • Grade {candidate.grade_level || '?'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{candidate.home_campus_name}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono text-lg font-bold text-[rgb(var(--daep-danger))]">
                      {candidate.days_remaining}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {daysOver !== null && (
                      <Badge variant="destructive" className="font-mono">
                        +{daysOver}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {candidate.current_decision ? (
                      <Badge className={DECISION_BADGE_CLASSES[candidate.current_decision]}>
                        {DECISION_LABELS[candidate.current_decision]}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[rgb(var(--daep-warning))] border-[rgb(var(--daep-warning))]/40">
                        Undecided
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDecisionClick(candidate)}>
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Record Decision
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleHistoryClick(candidate)}>
                          <History className="h-4 w-4 mr-2" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewStudent(candidate.student_id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Decision Dialog */}
      {selectedCandidate && showDecisionDialog && (
        <RolloverDecisionDialog
          candidate={selectedCandidate}
          open={showDecisionDialog}
          onOpenChange={setShowDecisionDialog}
          onComplete={handleDecisionComplete}
        />
      )}

      {/* History Panel */}
      {selectedCandidate && showHistoryPanel && (
        <DecisionHistoryPanel
          candidate={selectedCandidate}
          open={showHistoryPanel}
          onOpenChange={setShowHistoryPanel}
        />
      )}
    </>
  );
}
