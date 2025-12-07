'use client';

/**
 * Audit Entry Card Component
 *
 * Story 3-8: Point Audit Trail
 *
 * Displays a single audit log entry with:
 * - Event type icon and color
 * - Action description
 * - Actor name and timestamp
 * - Expandable details section
 * - Before/after diff for edits
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  User,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AuditEntry } from '@/app/actions/daep/audit';
import {
  getEventIcon,
  getEventColors,
  getEventTypeLabel,
  formatRelativeTime,
  formatFullDateTime,
  truncateText,
} from './audit-utils';

interface AuditEntryCardProps {
  entry: AuditEntry;
  showPlacement?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onJumpToEntry?: (entryId: string) => void;
  selected?: boolean;
}

export function AuditEntryCard({
  entry,
  showPlacement = false,
  expanded: controlledExpanded,
  onToggle,
  onJumpToEntry,
  selected = false,
}: AuditEntryCardProps) {
  const { toast } = useToast();
  const [internalExpanded, setInternalExpanded] = useState(false);

  // Use controlled or internal state
  const isExpanded = controlledExpanded ?? internalExpanded;
  const toggleExpanded = onToggle ?? (() => setInternalExpanded(!internalExpanded));

  const Icon = getEventIcon(entry.event_type);
  const colors = getEventColors(entry.event_type);
  const typeLabel = getEventTypeLabel(entry.event_type);

  // Copy entry ID to clipboard
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(entry.id);
      toast({ title: 'Entry ID copied to clipboard' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  // Extract relevant details for display
  const details = entry.details || {};
  const hasBeforeAfter = Boolean(details.before && details.after);
  const hasSensitiveDetails = Boolean(
    details.notes ||
    details.student_action ||
    details.teacher_action ||
    details.rejection_reason ||
    hasBeforeAfter
  );

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        colors.border,
        colors.bg,
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <CardContent className="p-4">
        <Collapsible open={isExpanded} onOpenChange={toggleExpanded}>
          {/* Main content row */}
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn('p-2 rounded-lg shrink-0', colors.iconBg)}>
              <Icon className={cn('h-4 w-4', colors.text)} />
            </div>

            <div className="flex-1 min-w-0">
              {/* Header: Type label and placement */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn('text-xs', colors.text, colors.border)}>
                  {typeLabel}
                </Badge>
                {showPlacement && entry.placement_label && (
                  <span className="text-xs text-muted-foreground">
                    {entry.placement_label}
                  </span>
                )}
              </div>

              {/* Action description */}
              <p className={cn('mt-1 text-sm font-medium', colors.text)}>
                {entry.action}
              </p>

              {/* Meta: Actor and time */}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {entry.actor_name}
                </span>
                <span className="flex items-center gap-1" title={formatFullDateTime(entry.created_at)}>
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(entry.created_at)}
                </span>
              </div>
            </div>

            {/* Expand button */}
            {hasSensitiveDetails && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="sr-only">Toggle details</span>
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          {/* Expanded details */}
          <CollapsibleContent className="mt-3">
            <div className="pt-3 border-t space-y-3 text-sm">
              {/* Event details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Event Type:</span>
                  <span className="ml-1 font-mono">{entry.event_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Time:</span>
                  <span className="ml-1">{formatFullDateTime(entry.created_at)}</span>
                </div>
              </div>

              {/* Student/Teacher actions */}
              {Boolean(details.student_action) && (
                <div>
                  <span className="text-xs text-muted-foreground">Student Action:</span>
                  <p className="text-sm">{String(details.student_action)}</p>
                </div>
              )}

              {Boolean(details.teacher_action) && (
                <div>
                  <span className="text-xs text-muted-foreground">Teacher Action:</span>
                  <p className="text-sm">{String(details.teacher_action)}</p>
                </div>
              )}

              {Boolean(details.notes) && (
                <div>
                  <span className="text-xs text-muted-foreground">Notes:</span>
                  <p className="text-sm italic">&ldquo;{String(details.notes)}&rdquo;</p>
                </div>
              )}

              {/* Rejection reason */}
              {Boolean(details.rejection_reason) && (
                <div>
                  <span className="text-xs text-muted-foreground">Rejection Reason:</span>
                  <p className="text-sm text-red-600">{String(details.rejection_reason)}</p>
                </div>
              )}

              {/* Before/After diff */}
              {hasBeforeAfter && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Changes:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded text-xs">
                      <span className="font-medium text-red-700 dark:text-red-300">Before:</span>
                      <pre className="mt-1 text-red-600 dark:text-red-400 whitespace-pre-wrap">
                        {formatDetailsObject(details.before as Record<string, unknown>)}
                      </pre>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded text-xs">
                      <span className="font-medium text-green-700 dark:text-green-300">After:</span>
                      <pre className="mt-1 text-green-600 dark:text-green-400 whitespace-pre-wrap">
                        {formatDetailsObject(details.after as Record<string, unknown>)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Bulk action info */}
              {Boolean(details.affected_count) && (
                <div>
                  <span className="text-xs text-muted-foreground">Affected Students:</span>
                  <span className="ml-1">{String(details.affected_count)}</span>
                </div>
              )}

              {/* Original entry info */}
              {Boolean(details.original_entered_by) && (
                <div>
                  <span className="text-xs text-muted-foreground">Originally entered by:</span>
                  <span className="ml-1">{String(details.entered_by_name || 'Unknown')}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleCopyId}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy ID
                </Button>
                {onJumpToEntry && entry.target_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onJumpToEntry(entry.id)}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Jump to Entry
                  </Button>
                )}
              </div>

              {/* Entry ID (truncated) */}
              <div className="text-xs text-muted-foreground font-mono">
                ID: {truncateText(entry.id, 20)}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// Helper to format details object for display
function formatDetailsObject(obj: Record<string, unknown>): string {
  if (!obj) return '-';

  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      const displayKey = key.replace(/_/g, ' ');
      lines.push(`${displayKey}: ${value}`);
    }
  }
  return lines.join('\n') || '-';
}
