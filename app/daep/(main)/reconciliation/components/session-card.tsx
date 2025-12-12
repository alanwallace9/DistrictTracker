'use client';

import Link from 'next/link';
import { FileText, CheckCircle, AlertCircle, Clock, Loader2, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReconciliationSession, ReconciliationStatus } from '@/lib/validation/schemas';

interface SessionCardProps {
  session: ReconciliationSession;
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

export function SessionCard({ session }: SessionCardProps) {
  const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.uploading;
  const StatusIcon = statusConfig.icon;
  const isClickable = ['in_review', 'completed', 'mapping_required'].includes(session.status);

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

  const getHref = () => {
    if (session.status === 'mapping_required') {
      return `/daep/reconciliation/mapping?session=${session.id}${session.detected_sis ? `&detected_sis=${session.detected_sis}` : ''}`;
    }
    return `/daep/reconciliation/${session.id}`;
  };

  const content = (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3',
        isClickable && 'hover:bg-muted/50 cursor-pointer transition-colors'
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

      {/* Arrow for clickable items */}
      {isClickable && (
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );

  if (isClickable) {
    return <Link href={getHref()}>{content}</Link>;
  }

  return content;
}
