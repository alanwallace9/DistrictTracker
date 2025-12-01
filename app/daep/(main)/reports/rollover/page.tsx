'use client';

/**
 * Rollover Student Report Page
 * Story 2-11: FR25 - End-of-year rollover student handling
 * AC 2.11.1: Report listing students who won't complete DAEP before EOY
 */

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, Calendar, Users, CheckCircle2 } from 'lucide-react';
import { RolloverCandidatesTable } from '@/components/daep/rollover/RolloverCandidatesTable';
import { ApprovalQueueView } from '@/components/daep/rollover/ApprovalQueueView';
import {
  getRolloverCandidates,
  getPendingRolloverApprovals,
  shouldShowRolloverTab,
  type RolloverCandidate,
  type PendingRolloverPlacement,
} from '@/app/actions/daep/rollover';

export default function RolloverReportPage() {
  const { toast } = useToast();

  // Data state
  const [candidates, setCandidates] = useState<RolloverCandidate[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingRolloverPlacement[]>([]);
  const [schoolDaysRemaining, setSchoolDaysRemaining] = useState<number | null>(null);
  const [lastSchoolDay, setLastSchoolDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<'candidates' | 'approvals'>('candidates');

  // Stats
  const undecidedCount = candidates.filter(c => !c.current_decision).length;
  const continueCount = candidates.filter(c => c.current_decision === 'continue_daep').length;
  const returnCount = candidates.filter(c => c.current_decision === 'return_home').length;

  // Fetch candidates
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Check if tab should be visible (AC 2.11.11)
      const visible = await shouldShowRolloverTab();
      setTabVisible(visible);

      // Fetch candidates even if not in last month (for testing)
      const result = await getRolloverCandidates();

      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }

      setCandidates(result.candidates);
      setSchoolDaysRemaining(result.schoolDaysRemaining);
      setLastSchoolDay(result.lastSchoolDay);

      // Fetch pending approvals
      const approvals = await getPendingRolloverApprovals();
      setPendingApprovals(approvals);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch rollover data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle decision recorded
  const handleDecisionRecorded = () => {
    fetchData();
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not configured';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-[rgb(var(--daep-warning))]" />
            End-of-Year Rollover Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Students whose DAEP placement extends beyond the school year
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Calendar Info Banner */}
      {schoolDaysRemaining !== null && (
        <Card className="mb-6 border-[rgb(var(--daep-warning))]/20 bg-[rgb(var(--daep-warning))]/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[rgb(var(--daep-warning))]" />
                  <div>
                    <span className="text-sm text-muted-foreground">School Days Remaining</span>
                    <p className="text-2xl font-bold text-foreground">{schoolDaysRemaining}</p>
                  </div>
                </div>
                <div className="h-10 border-l border-border" />
                <div>
                  <span className="text-sm text-muted-foreground">Last School Day</span>
                  <p className="font-medium text-foreground">{formatDate(lastSchoolDay)}</p>
                </div>
              </div>
              {!tabVisible && (
                <Badge variant="secondary" className="bg-muted">
                  Report available in last month of school year
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Candidates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{candidates.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card className={undecidedCount > 0 ? 'border-[rgb(var(--daep-warning))]/40' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Undecided</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${undecidedCount > 0 ? 'text-[rgb(var(--daep-warning))]' : 'text-muted-foreground'}`} />
              <span className="text-3xl font-bold">{undecidedCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Continue DAEP</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-[rgb(var(--daep-info))]/10 text-[rgb(var(--daep-info))] border-[rgb(var(--daep-info))]/20">
                {continueCount}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Return Home</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-[rgb(var(--daep-success))]/10 text-[rgb(var(--daep-success))] border-[rgb(var(--daep-success))]/20">
                {returnCount}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Candidates | Pending Approvals */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'candidates' | 'approvals')}>
        <TabsList className="mb-4">
          <TabsTrigger value="candidates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Rollover Candidates
            {undecidedCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-[rgb(var(--daep-warning))]/15 text-[rgb(var(--daep-warning))]">
                {undecidedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Pending Approvals
            {pendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="candidates">
          <Card>
            <CardHeader>
              <CardTitle>Students Requiring Rollover Decision</CardTitle>
              <CardDescription>
                These students have more days remaining than school days left in the year.
                Record a decision for each student: continue DAEP next year or return to home campus.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolloverCandidatesTable
                candidates={candidates}
                loading={loading}
                schoolDaysRemaining={schoolDaysRemaining}
                onDecisionRecorded={handleDecisionRecorded}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Rollover Placements</CardTitle>
              <CardDescription>
                Review and approve rollover placements for the next school year.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApprovalQueueView
                pendingApprovals={pendingApprovals}
                loading={loading}
                onApprovalComplete={fetchData}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
