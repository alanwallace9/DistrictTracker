'use client';

/**
 * Placement Audit Log Component
 *
 * Story 3-8: Point Audit Trail
 *
 * Full audit log for a single placement, displayed in a Sheet.
 * Features:
 * - Slide-in panel (Sheet)
 * - Date and user filters
 * - Pagination
 * - Admin-only access
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { History, AlertCircle } from 'lucide-react';
import {
  getPlacementAuditLog,
  getAuditLogUsers,
  type AuditEntry,
  type AuditFilterOptions,
  type AuditUser,
} from '@/app/actions/daep/audit';
import { AuditEntryCard } from './AuditEntryCard';
import { AuditLogFilters } from './AuditLogFilters';

interface PlacementAuditLogProps {
  placementId: string;
  placementLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlacementAuditLog({
  placementId,
  placementLabel,
  open,
  onOpenChange,
}: PlacementAuditLogProps) {
  const { toast } = useToast();

  // State
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<AuditFilterOptions>({});

  // Load data
  const loadData = useCallback(
    async (reset: boolean = true) => {
      if (reset) {
        setLoading(true);
        setEntries([]);
      } else {
        setLoadingMore(true);
      }

      try {
        const offset = reset ? 0 : entries.length;
        const result = await getPlacementAuditLog(placementId, {
          ...filters,
          limit: 20,
          offset,
        });

        if (reset) {
          setEntries(result.entries);
        } else {
          setEntries((prev) => [...prev, ...result.entries]);
        }
        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (error) {
        console.error('Error loading placement audit log:', error);
        toast({
          title: 'Error',
          description: 'Failed to load audit log. You may not have permission to view this data.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [placementId, filters, entries.length, toast]
  );

  // Load users for filter
  const loadUsers = useCallback(async () => {
    try {
      const data = await getAuditLogUsers(undefined, [placementId]);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, [placementId]);

  // Load when sheet opens
  useEffect(() => {
    if (open) {
      loadData(true);
      loadUsers();
    }
  }, [open, placementId]);

  // Reload when filters change
  useEffect(() => {
    if (open) {
      loadData(true);
    }
  }, [filters]);

  // Handle filter change
  const handleFilterChange = (newFilters: AuditFilterOptions) => {
    setFilters(newFilters);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Placement Audit Log
          </SheetTitle>
          <SheetDescription>
            Activity history for {placementLabel}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {/* Filters (simplified for placement view) */}
        <AuditLogFilters
          users={users}
          showCategoryToggle
          showPlacementFilter={false}
          showSearch={false}
          onFilterChange={handleFilterChange}
        />

        <Separator className="my-4" />

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {/* Empty/Permission denied state */}
        {!loading && entries.length === 0 && (
          <div className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              {total === 0
                ? 'No audit entries found for this placement.'
                : "You don't have permission to view audit logs."}
            </p>
          </div>
        )}

        {/* Entries list */}
        {!loading && entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry) => (
              <AuditEntryCard
                key={entry.id}
                entry={entry}
                showPlacement={false}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadData(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : `Load More (${total - entries.length})`}
                </Button>
              </div>
            )}

            {/* Entry count */}
            <div className="text-center text-xs text-muted-foreground pt-2">
              Showing {entries.length} of {total} entries
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
