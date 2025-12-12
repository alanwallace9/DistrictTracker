'use client';

import { RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionCard } from './session-card';
import type { ReconciliationSession } from '@/lib/validation/schemas';

interface SessionListProps {
  sessions: ReconciliationSession[];
  loading: boolean;
  onRefresh: () => void;
}

export function SessionList({ sessions, loading, onRefresh }: SessionListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(var(--daep-primary))]"></div>
          <p className="text-sm text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="p-4 rounded-full bg-muted mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No Previous Sessions</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Upload your first SIS export to start reconciling placement data.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
        <span className="text-sm text-muted-foreground">
          Showing {sessions.length} recent session{sessions.length !== 1 ? 's' : ''}
        </span>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
