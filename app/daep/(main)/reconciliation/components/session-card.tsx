'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReconciliationSession, ReconciliationStatus } from '@/lib/validation/schemas';
import type { AuditEvent } from '@/app/actions/daep/reconciliation';
import { getSessionAuditEvents } from '@/app/actions/daep/reconciliation';

interface SessionCardProps {
  session: ReconciliationSession;
  auditCount?: number;
}

const STATUS_CONFIG: Record<
  ReconciliationStatus,
  { label: string; icon: typeof CheckCircle; color: string; bgColor: string }
> = {
  uploading: {
    label: 'Uploading',
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  mapping_required: {
    label: 'Needs Mapping',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  parsing: {
    label: 'Parsing',
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  comparing: {
    label: 'Comparing',
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  in_review: {
    label: 'Ready for Review',
    icon: Clock,
    color: 'text-[rgb(var(--daep-warning))]',
    bgColor: 'bg-[rgb(var(--daep-warning))]/10',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-[rgb(var(--daep-success))]',
    bgColor: 'bg-[rgb(var(--daep-success))]/10',
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    color: 'text-[rgb(var(--daep-danger))]',
    bgColor: 'bg-[rgb(var(--daep-danger))]/10',
  },
};

// Event type display configuration
const EVENT_DISPLAY: Record<
  string,
  { label: string; icon: string }
> = {
  'reconciliation.session_created': { label: 'Session Created', icon: '📄' },
  'reconciliation.mapping_saved': { label: 'Mapping Applied', icon: '🔗' },
  'reconciliation.session_completed': { label: 'Comparison Done', icon: '✅' },
  'reconciliation.discrepancy_resolved': { label: 'Resolved', icon: '🔧' },
  'reconciliation.bulk_accept': { label: 'Bulk Accepted', icon: '✓✓' },
  'reconciliation.upload_failed': { label: 'Upload Failed', icon: '❌' },
};

export function SessionCard({ session, auditCount = 0 }: SessionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = statusConfig.icon;
  const isClickable = ['in_review', 'completed', 'mapping_required'].includes(session.status);
  const hasAuditHistory = auditCount > 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getHref = () => {
    if (session.status === 'mapping_required') {
      return `/daep/reconciliation/mapping?session=${session.id}${session.detected_sis ? `&detected_sis=${session.detected_sis}` : ''}`;
    }
    return `/daep/reconciliation/${session.id}`;
  };

  const handleExpand = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasAuditHistory) return;

    if (!isExpanded && auditEvents.length === 0) {
      setIsLoading(true);
      const events = await getSessionAuditEvents(session.id);
      setAuditEvents(events);
      setIsLoading(false);
    }

    setIsExpanded(!isExpanded);
  };

  const renderEventDetails = (event: AuditEvent) => {
    const eventConfig = EVENT_DISPLAY[event.event_type] || { label: event.event_type, icon: '📝' };
    const details = event.details || {};

    // Build detail string based on event type
    let detailText = '';
    if (event.event_type === 'reconciliation.session_created') {
      detailText = details.fileName ? `${details.fileName}` : '';
    } else if (event.event_type === 'reconciliation.session_completed') {
      const total = details.totalSisRecords || 0;
      const matched = details.matched || 0;
      detailText = `${total} records, ${matched} matched`;
    } else if (event.event_type === 'reconciliation.discrepancy_resolved') {
      const name = details.studentName || 'Unknown';
      const resolution = details.resolution === 'accept_sis' ? '→ SIS' : '→ Keep DAEP';
      const changes = (details.changes as Array<{ fieldLabel: string; before: string; after: string }>) || [];
      if (changes.length > 0) {
        const fieldNames = changes.map((c) => c.fieldLabel).join(', ');
        detailText = `${name} ${resolution} • ${fieldNames}`;
      } else {
        detailText = `${name} ${resolution}`;
      }
    } else if (event.event_type === 'reconciliation.bulk_accept') {
      detailText = `${details.count || 0} matches accepted`;
    } else if (event.event_type === 'reconciliation.mapping_saved') {
      detailText = `${details.sisName || 'Unknown'} SIS, ${details.fieldCount || 0} fields`;
    }

    return (
      <div className="flex items-start gap-3 py-2 px-3 text-sm">
        <span className="text-muted-foreground shrink-0 w-28">
          {formatShortDate(event.created_at)}
        </span>
        <span className="shrink-0">{eventConfig.icon}</span>
        <span className="font-medium shrink-0">{eventConfig.label}</span>
        {detailText && (
          <span className="text-muted-foreground truncate">{detailText}</span>
        )}
        {event.actor_email && (
          <span className="text-muted-foreground text-xs ml-auto shrink-0">
            {event.actor_email.split('@')[0]}
          </span>
        )}
      </div>
    );
  };

  const renderBeforeAfter = (event: AuditEvent) => {
    if (event.event_type !== 'reconciliation.discrepancy_resolved') return null;

    const changes = (event.details?.changes as Array<{ fieldLabel: string; before: string; after: string }>) || [];
    if (changes.length === 0) return null;

    return (
      <div className="ml-[7.5rem] pl-6 pb-2 text-xs text-muted-foreground border-l-2 border-muted">
        {changes.map((change, idx) => (
          <div key={idx} className="flex gap-2">
            <span className="font-medium">{change.fieldLabel}:</span>
            <span className="line-through">{change.before || '(empty)'}</span>
            <span>→</span>
            <span className="text-foreground">{change.after || '(empty)'}</span>
          </div>
        ))}
      </div>
    );
  };

  const mainContent = (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3',
        isClickable && !isExpanded && 'hover:bg-muted/50 cursor-pointer transition-colors'
      )}
    >
      {/* File icon */}
      <div className="p-2 rounded-lg bg-muted">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{session.file_name}</span>
          {session.detected_sis && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {session.detected_sis}
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {formatDate(session.upload_date)}
        </div>
      </div>

      {/* Stats */}
      {session.total_records > 0 && (
        <div className="hidden sm:flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium">{session.total_records}</div>
            <div className="text-xs text-muted-foreground">Records</div>
          </div>
          {session.matched_count !== undefined && (
            <div className="text-center">
              <div className="font-medium text-[rgb(var(--daep-success))]">
                {session.matched_count}
              </div>
              <div className="text-xs text-muted-foreground">Matched</div>
            </div>
          )}
          {session.discrepancy_count !== undefined && session.discrepancy_count > 0 && (
            <div className="text-center">
              <div className="font-medium text-[rgb(var(--daep-warning))]">
                {session.discrepancy_count}
              </div>
              <div className="text-xs text-muted-foreground">Discrepancies</div>
            </div>
          )}
        </div>
      )}

      {/* Audit count badge */}
      {hasAuditHistory && (
        <button
          onClick={handleExpand}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
            'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground',
            'transition-colors'
          )}
          title="View audit history"
        >
          <History className="h-3 w-3" />
          <span>{auditCount}</span>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      )}

      {/* Status badge */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
          statusConfig.bgColor,
          statusConfig.color
        )}
      >
        <StatusIcon
          className={cn('h-4 w-4', session.status.includes('ing') && 'animate-spin')}
        />
        <span className="hidden sm:inline">{statusConfig.label}</span>
      </div>

      {/* Arrow for clickable items (when not expanded) */}
      {isClickable && !isExpanded && (
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      {isClickable && !isExpanded ? (
        <Link href={getHref()}>{mainContent}</Link>
      ) : (
        mainContent
      )}

      {/* Expanded audit history section */}
      {isExpanded && (
        <div className="border-t bg-muted/30">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
            <span className="text-sm font-medium">Audit History</span>
            {isClickable && (
              <Link
                href={getHref()}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Open Session <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : auditEvents.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No audit events found
            </div>
          ) : (
            <div className="divide-y max-h-64 overflow-y-auto">
              {auditEvents.map((event) => (
                <div key={event.id}>
                  {renderEventDetails(event)}
                  {renderBeforeAfter(event)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
