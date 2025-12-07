'use client';

/**
 * Placement Activity Preview Component
 *
 * Story 3-8: Point Audit Trail
 *
 * Compact preview of recent activity on a placement card.
 * Shows 3 most recent entries with "View All" button.
 * Accessible by all DAEP staff (limited data).
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { History, ChevronRight } from 'lucide-react';
import {
  getRecentPlacementActivity,
  type AuditEntry,
} from '@/app/actions/daep/audit';
import {
  getEventIcon,
  getEventColors,
  formatRelativeTime,
  getEventTypeLabel,
} from './audit-utils';

interface PlacementActivityPreviewProps {
  placementId: string;
  maxItems?: number;
  onViewAll?: () => void;
}

export function PlacementActivityPreview({
  placementId,
  maxItems = 3,
  onViewAll,
}: PlacementActivityPreviewProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      setLoading(true);
      try {
        const data = await getRecentPlacementActivity(placementId, maxItems);
        setEntries(data);
      } catch (error) {
        console.error('Error loading activity:', error);
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, [placementId, maxItems]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <History className="h-3 w-3" />
            Recent Activity
          </span>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <History className="h-3 w-3" />
            Recent Activity
          </span>
        </div>
        <p className="text-xs text-muted-foreground italic">
          No activity recorded
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <History className="h-3 w-3" />
          Recent Activity ({entries.length})
        </span>
        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onViewAll}
          >
            View All
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      {/* Activity list */}
      <div className="space-y-1">
        {entries.map((entry) => {
          const Icon = getEventIcon(entry.event_type);
          const colors = getEventColors(entry.event_type);

          return (
            <div
              key={entry.id}
              className={cn(
                'flex items-center gap-2 py-1 px-2 rounded text-xs',
                colors.bg,
                colors.border,
                'border'
              )}
            >
              <Icon className={cn('h-3 w-3 shrink-0', colors.text)} />
              <span className={cn('flex-1 truncate', colors.text)}>
                {formatActivityText(entry)}
              </span>
              <span className="text-muted-foreground shrink-0">
                {formatRelativeTime(entry.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Format activity text for compact display
function formatActivityText(entry: AuditEntry): string {
  const typeLabel = getEventTypeLabel(entry.event_type);

  // Extract key info from action
  const action = entry.action;

  // For points, try to extract the value
  const pointsMatch = action.match(/([+-]?\d+)\s*point/i);
  if (pointsMatch) {
    return `${typeLabel} (${pointsMatch[1]} pts)`;
  }

  // For room changes
  if (entry.event_type === 'room.assignment_changed') {
    const roomMatch = action.match(/Room\s+(\w+)\s*→?\s*Room\s+(\w+)/i) ||
                      action.match(/to\s+Room\s+(\w+)/i);
    if (roomMatch) {
      return `Room changed → ${roomMatch[roomMatch.length - 1]}`;
    }
  }

  // For status changes
  if (entry.event_type === 'placement.transitioned') {
    const statusMatch = action.match(/to\s+(\w+)/i);
    if (statusMatch) {
      return `Status → ${statusMatch[1]}`;
    }
  }

  // Default: use type label
  return typeLabel;
}
