'use client';

import { useEffect, useState } from 'react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ExternalLink, Shield, ShieldOff } from 'lucide-react';
import {
  getTrespassTrackerStatus,
  type TrespassTrackerStatusResult,
} from '@/app/actions/daep/students';
import { format } from 'date-fns';
import Link from 'next/link';

interface Props {
  schoolId: string;
  moduleAccess?: 'both' | 'daep_only' | 'trespass_only';
}

/**
 * TrespassTracker Status display component for student profile
 * Story 2-3: TrespassTracker Status Display
 * FR15: Show TrespassTracker status for students with active trespass records
 * FR76: View TT status from DAEP profile
 */
export function TrespassTrackerStatus({ schoolId, moduleAccess = 'both' }: Props) {
  const [status, setStatus] = useState<TrespassTrackerStatusResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      if (!schoolId) {
        setLoading(false);
        return;
      }

      try {
        const result = await getTrespassTrackerStatus(schoolId);
        setStatus(result);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch TT status:', err);
        setError('Failed to load TrespassTracker status');
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [schoolId]);

  // Can user view TrespassTracker module?
  const canViewTT = moduleAccess === 'both' || moduleAccess === 'trespass_only';

  if (loading) {
    return (
      <CollapsibleCard
        title="TrespassTracker Status"
        icon={<Shield className="w-4 h-4" />}
        storageKey="student-tt-status"
        defaultOpen={false}
      >
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-full" />
        </div>
      </CollapsibleCard>
    );
  }

  if (error) {
    return (
      <CollapsibleCard
        title="TrespassTracker Status"
        icon={<ShieldOff className="w-4 h-4" />}
        storageKey="student-tt-status"
        defaultOpen={false}
      >
        <p className="text-sm text-destructive">{error}</p>
      </CollapsibleCard>
    );
  }

  if (!status?.hasRecord) {
    return (
      <CollapsibleCard
        title="TrespassTracker Status"
        icon={<ShieldOff className="w-4 h-4" />}
        storageKey="student-tt-status"
        defaultOpen={false}
      >
        <p className="text-sm text-muted-foreground">
          No TrespassTracker records found for this student
        </p>
      </CollapsibleCard>
    );
  }

  // Theme-compliant status colors using semantic classes
  const statusColors = {
    active: 'bg-destructive/10 text-destructive border-destructive/20',
    inactive: 'bg-muted text-muted-foreground border-border',
    expired: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  };

  return (
    <CollapsibleCard
      title="TrespassTracker Status"
      icon={
        <Shield
          className={`w-4 h-4 ${
            status.trespassStatus === 'active' ? 'text-destructive' : ''
          }`}
        />
      }
      storageKey="student-tt-status"
      defaultOpen={false}
      className={status.trespassStatus === 'active' ? 'border-destructive/50' : ''}
      contentClassName="space-y-4">
        {/* Warning banner for active trespass - uses theme-compliant destructive colors */}
        {status.trespassStatus === 'active' && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">Active Trespass Record</span>
          </div>
        )}

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {status.trespassStatus && (
            <Badge variant="outline" className={statusColors[status.trespassStatus]}>
              TT: {status.trespassStatus.charAt(0).toUpperCase() + status.trespassStatus.slice(1)}
            </Badge>
          )}
          {status.isDAEP && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              DAEP Flagged
            </Badge>
          )}
          <Badge variant="secondary">
            {status.recordCount} Record{status.recordCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Expiration dates */}
        <div className="text-sm space-y-1">
          {status.trespassExpirationDate && (
            <p>
              <span className="text-muted-foreground">TT Expires:</span>{' '}
              {format(new Date(status.trespassExpirationDate), 'MMM d, yyyy')}
            </p>
          )}
          {status.daepExpirationDate && (
            <p>
              <span className="text-muted-foreground">DAEP Expires:</span>{' '}
              {format(new Date(status.daepExpirationDate), 'MMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Most recent incident */}
        {status.mostRecentIncident && (
          <div className="text-sm">
            <p className="text-muted-foreground">Most Recent Incident:</p>
            <p>
              {status.mostRecentIncident.incident_date
                ? format(new Date(status.mostRecentIncident.incident_date), 'MMM d, yyyy')
                : format(new Date(status.mostRecentIncident.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        )}

        {/* View in TrespassTracker link - hidden for daep_only users */}
        {canViewTT && status.mostRecentIncident && (
          <Link href={`/trespass/${status.mostRecentIncident.id}`} passHref>
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              View in TrespassTracker
            </Button>
          </Link>
        )}
    </CollapsibleCard>
  );
}
