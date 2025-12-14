'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileSpreadsheet, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { getAgeColorClasses, getAgeBadgeVariant } from '@/lib/daep/session-age';
import { resumeAbandonedSession } from '@/app/actions/daep/reconciliation';
import { useToast } from '@/hooks/use-toast';
import type { UnresolvedSession } from '@/lib/validation/schemas';

interface IncompleteSessionsProps {
  sessions: UnresolvedSession[];
  onRefresh?: () => void;
}

export function IncompleteSessions({ sessions, onRefresh }: IncompleteSessionsProps) {
  const router = useRouter();
  const { toast } = useToast();

  if (sessions.length === 0) return null;

  const handleResume = async (sessionId: string, isAbandoned: boolean) => {
    if (isAbandoned) {
      // Resume abandoned session first
      const result = await resumeAbandonedSession(sessionId);
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to resume session',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Session resumed',
        description: 'The session has been reactivated for review.',
      });
      onRefresh?.();
    }
    router.push(`/daep/reconciliation/${sessionId}`);
  };

  const formatSubtitle = (session: UnresolvedSession): string => {
    const daysSince = Math.floor(
      (Date.now() - new Date(session.uploadDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const ageText = daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`;
    return `${session.unresolvedCount} of ${session.totalDiscrepancies} unresolved • ${ageText}`;
  };

  const getStatusBadge = (session: UnresolvedSession) => {
    if (session.status === 'abandoned') {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Abandoned
        </Badge>
      );
    }
    if (session.ageCategory === 'critical') {
      return (
        <Badge variant="default" className="text-xs bg-orange-500">
          Overdue
        </Badge>
      );
    }
    if (session.ageCategory === 'warning') {
      return (
        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
          Pending
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-yellow-600" />
          Incomplete Sessions
          <Badge variant="secondary" className="ml-auto">
            {sessions.length}
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          These sessions have unresolved discrepancies that need review
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`flex items-center justify-between p-4 rounded-lg border ${getAgeColorClasses(session.ageCategory)}`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{session.fileName}</p>
                  {getStatusBadge(session)}
                </div>
                <p className="text-sm text-muted-foreground">{formatSubtitle(session)}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant={session.status === 'abandoned' ? 'outline' : 'default'}
              onClick={() => handleResume(session.id, session.status === 'abandoned')}
              className="flex-shrink-0 ml-4"
            >
              {session.status === 'abandoned' ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reactivate
                </>
              ) : (
                <>
                  Resume
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
