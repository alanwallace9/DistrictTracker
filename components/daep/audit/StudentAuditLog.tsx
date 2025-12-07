'use client';

/**
 * Student Audit Log Component
 *
 * Story 3-8: Point Audit Trail
 *
 * Full audit log for a student profile tab.
 * Features:
 * - Full filter controls
 * - Pagination with "Load More"
 * - Summary stats
 * - Expand/Collapse all
 * - Keyboard navigation
 * - Admin-only access
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronUp,
  History,
  AlertCircle,
} from 'lucide-react';
import {
  getStudentAuditLog,
  getAuditLogUsers,
  getAuditSummaryStats,
  type AuditEntry,
  type AuditFilterOptions,
  type AuditUser,
} from '@/app/actions/daep/audit';
import { AuditEntryCard } from './AuditEntryCard';
import { AuditLogFilters } from './AuditLogFilters';

interface Placement {
  id: string;
  incident_number: string | null;
  status: string;
}

interface StudentAuditLogProps {
  studentId: string;
  placements: Placement[];
}

export function StudentAuditLog({ studentId, placements }: StudentAuditLogProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<AuditFilterOptions>({});
  const [stats, setStats] = useState({ points: 0, attendance: 0, placement: 0, total: 0 });

  // Expand/collapse state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Placement IDs for queries
  const placementIds = placements.map((p) => p.id);

  // Format placements for filter dropdown
  const placementOptions = placements.map((p) => ({
    id: p.id,
    label: `#${p.incident_number || 'N/A'} (${p.status})`,
  }));

  // Load initial data
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
        const result = await getStudentAuditLog(studentId, placementIds, {
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
        console.error('Error loading audit log:', error);
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
    [studentId, placementIds, filters, entries.length, toast]
  );

  // Load users for filter
  const loadUsers = useCallback(async () => {
    try {
      const data = await getAuditLogUsers(studentId, placementIds);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, [studentId, placementIds]);

  // Load summary stats
  const loadStats = useCallback(async () => {
    try {
      const data = await getAuditSummaryStats(studentId, placementIds);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [studentId, placementIds]);

  // Initial load
  useEffect(() => {
    loadData(true);
    loadUsers();
    loadStats();
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadData(true);
  }, [filters]);

  // Handle filter change
  const handleFilterChange = (newFilters: AuditFilterOptions) => {
    setFilters(newFilters);
    setSelectedIndex(-1);
  };

  // Toggle entry expansion
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand/collapse all
  const expandAll = () => {
    setExpandedIds(new Set(entries.map((e) => e.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when container is focused or entry is selected
      if (entries.length === 0) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(entries.length - 1, prev + 1));
          break;
        case 'e':
        case 'E':
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < entries.length) {
            toggleExpanded(entries[selectedIndex].id);
          }
          break;
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [entries, selectedIndex]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Permission denied state
  if (entries.length === 0 && !loading && total === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            No audit entries found or you don&apos;t have permission to view audit logs.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Only administrators can view full audit logs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className="space-y-4 focus:outline-none"
      tabIndex={0}
    >
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Student Audit Trail</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {stats.total} total: {stats.points} points, {stats.attendance} attendance,{' '}
          {stats.placement} placement
        </div>
      </div>

      {/* Filters */}
      <AuditLogFilters
        placements={placementOptions}
        users={users}
        showCategoryToggle
        showPlacementFilter
        showSearch
        onFilterChange={handleFilterChange}
      />

      {/* Expand/collapse controls */}
      {entries.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            <ChevronDown className="h-4 w-4 mr-1" />
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            <ChevronUp className="h-4 w-4 mr-1" />
            Collapse All
          </Button>
          <span className="text-muted-foreground ml-auto">
            Use ↑/↓ or W/S to navigate, E to expand
          </span>
        </div>
      )}

      {/* Entries list */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>No entries match your filters.</p>
            <Button variant="link" onClick={() => handleFilterChange({})}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <AuditEntryCard
              key={entry.id}
              entry={entry}
              showPlacement
              expanded={expandedIds.has(entry.id)}
              onToggle={() => toggleExpanded(entry.id)}
              selected={selectedIndex === index}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => loadData(false)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : `Load More (${total - entries.length} remaining)`}
          </Button>
        </div>
      )}

      {/* Entry count */}
      {entries.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {entries.length} of {total} entries
        </div>
      )}
    </div>
  );
}
