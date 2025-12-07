'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  CheckCircle,
  XCircle,
  Edit,
  Check,
  Clock,
  User,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile } from '@/app/actions/users';
import {
  getPendingApprovals,
  approvePointEntry,
  bulkApproveEntries,
  type PendingApprovalEntry,
} from '@/app/actions/daep/points';
import { EditApproveDialog } from '@/components/daep/approvals/EditApproveDialog';
import { RejectConfirmDialog } from '@/components/daep/approvals/RejectConfirmDialog';
import { cn } from '@/lib/utils';

const ADMIN_ROLES = ['super_admin', 'district_admin', 'daep_admin_l1'];

// Group entries by date
function groupEntriesByDate(entries: PendingApprovalEntry[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; date: string; entries: PendingApprovalEntry[] }[] = [];
  const dateMap = new Map<string, PendingApprovalEntry[]>();

  entries.forEach((entry) => {
    const dateStr = entry.date;
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, []);
    }
    dateMap.get(dateStr)!.push(entry);
  });

  // Sort dates descending and create groups
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  sortedDates.forEach((dateStr) => {
    const entryDate = new Date(dateStr + 'T00:00:00');
    let label: string;

    if (entryDate.getTime() === today.getTime()) {
      label = 'Today';
    } else if (entryDate.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else {
      label = entryDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }

    groups.push({
      label,
      date: dateStr,
      entries: dateMap.get(dateStr)!,
    });
  });

  return groups;
}

// Format time from ISO string
function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function ApprovalsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { toast } = useToast();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<PendingApprovalEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Dialog state
  const [editDialogEntry, setEditDialogEntry] = useState<PendingApprovalEntry | null>(null);
  const [rejectDialogEntry, setRejectDialogEntry] = useState<PendingApprovalEntry | null>(null);

  // Fetch user role and check authorization
  useEffect(() => {
    async function checkAuth() {
      if (!isLoaded || !user) return;

      try {
        const profile = await getUserProfile(user.id);
        const role = profile?.role || 'viewer';

        if (ADMIN_ROLES.includes(role)) {
          setIsAuthorized(true);
        } else {
          router.push('/daep');
        }
      } catch (error) {
        console.error('[Approvals] Error checking auth:', error);
        router.push('/daep');
      }
    }

    checkAuth();
  }, [user, isLoaded, router]);

  // Fetch pending entries
  const fetchEntries = useCallback(async () => {
    if (!isAuthorized) return;

    try {
      setIsLoading(true);
      const data = await getPendingApprovals();
      setEntries(data);
    } catch (error) {
      // Log error but don't show toast - empty state handles this gracefully
      console.error('[Approvals] Error fetching entries:', error);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Handle single approve
  const handleApprove = async (entryId: string) => {
    setProcessingIds((prev) => new Set(prev).add(entryId));

    try {
      const result = await approvePointEntry(entryId);
      if (result.success) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(entryId);
          return next;
        });
        toast({
          title: 'Approved',
          description: 'Point entry approved and published.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to approve entry.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[Approvals] Error approving:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve entry.',
        variant: 'destructive',
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkProcessing(true);
    const ids = Array.from(selectedIds);

    try {
      const result = await bulkApproveEntries(ids);
      if (result.success) {
        setEntries((prev) => prev.filter((e) => !selectedIds.has(e.id)));
        setSelectedIds(new Set());
        toast({
          title: 'Bulk Approved',
          description: `${result.count} entries approved and published.`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to approve entries.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[Approvals] Error bulk approving:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve entries.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Handle checkbox toggle
  const toggleSelect = (entryId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  // Dialog callbacks
  const handleEditApproveComplete = () => {
    setEditDialogEntry(null);
    fetchEntries();
  };

  const handleRejectComplete = () => {
    setRejectDialogEntry(null);
    fetchEntries();
  };

  // Loading state
  if (!isLoaded || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--daep-primary))]" />
          <p className="text-sm text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  const groupedEntries = groupEntriesByDate(entries);
  const allSelected = entries.length > 0 && selectedIds.size === entries.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < entries.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Point Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve point entries from staff awaiting approval
          </p>
        </div>

        {/* Bulk approve button */}
        {selectedIds.size > 0 && (
          <Button
            onClick={handleBulkApprove}
            disabled={isBulkProcessing}
            className="bg-[rgb(var(--daep-success))] hover:bg-[rgb(var(--daep-success))]/90"
          >
            {isBulkProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Approve Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                  }
                }}
                onCheckedChange={toggleSelectAll}
              />
              <CardTitle className="text-base">
                {entries.length} pending {entries.length === 1 ? 'entry' : 'entries'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {groupedEntries.map((group) => (
              <div key={group.date}>
                {/* Date header */}
                <div className="px-6 py-2 bg-muted/50 border-y text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {group.label}
                </div>

                {/* Entries */}
                {group.entries.map((entry) => (
                  <PendingEntryRow
                    key={entry.id}
                    entry={entry}
                    selected={selectedIds.has(entry.id)}
                    processing={processingIds.has(entry.id)}
                    onSelect={() => toggleSelect(entry.id)}
                    onApprove={() => handleApprove(entry.id)}
                    onEdit={() => setEditDialogEntry(entry)}
                    onReject={() => setRejectDialogEntry(entry)}
                  />
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {editDialogEntry && (
        <EditApproveDialog
          entry={editDialogEntry}
          open={!!editDialogEntry}
          onOpenChange={(open) => !open && setEditDialogEntry(null)}
          onComplete={handleEditApproveComplete}
        />
      )}

      {rejectDialogEntry && (
        <RejectConfirmDialog
          entry={rejectDialogEntry}
          open={!!rejectDialogEntry}
          onOpenChange={(open) => !open && setRejectDialogEntry(null)}
          onComplete={handleRejectComplete}
        />
      )}
    </div>
  );
}

// Pending entry row component
interface PendingEntryRowProps {
  entry: PendingApprovalEntry;
  selected: boolean;
  processing: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onEdit: () => void;
  onReject: () => void;
}

function PendingEntryRow({
  entry,
  selected,
  processing,
  onSelect,
  onApprove,
  onEdit,
  onReject,
}: PendingEntryRowProps) {
  const isPositive = entry.points_earned >= 0;

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-6 py-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors',
        selected && 'bg-[rgb(var(--daep-primary))]/5'
      )}
    >
      {/* Checkbox */}
      <Checkbox checked={selected} onCheckedChange={onSelect} disabled={processing} />

      {/* Student info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {entry.student_last_name}, {entry.student_first_name}
          </span>
          <Badge variant="outline" className="text-xs">
            Period {entry.period}
          </Badge>
        </div>
        {entry.student_action && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{entry.student_action}</p>
        )}
      </div>

      {/* Points */}
      <div
        className={cn(
          'text-lg font-semibold tabular-nums min-w-[60px] text-right',
          isPositive ? 'text-[rgb(var(--daep-success))]' : 'text-[rgb(var(--daep-danger))]'
        )}
      >
        {isPositive ? '+' : ''}
        {entry.points_earned}
      </div>

      {/* Entered by */}
      <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground min-w-[140px]">
        <User className="h-3.5 w-3.5" />
        <span className="truncate">{entry.entered_by_name}</span>
      </div>

      {/* Time */}
      <div className="hidden sm:block text-sm text-muted-foreground min-w-[80px] text-right">
        {formatTime(entry.created_at)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          disabled={processing}
          title="Edit & Approve"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[rgb(var(--daep-success))] hover:text-[rgb(var(--daep-success))] hover:bg-[rgb(var(--daep-success))]/10"
          onClick={onApprove}
          disabled={processing}
          title="Approve"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[rgb(var(--daep-danger))] hover:text-[rgb(var(--daep-danger))] hover:bg-[rgb(var(--daep-danger))]/10"
          onClick={onReject}
          disabled={processing}
          title="Reject"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-6 py-2 bg-muted/50 border-y">
          <Skeleton className="h-4 w-20" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0">
            <Skeleton className="h-4 w-4" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-4 w-24 hidden md:block" />
            <Skeleton className="h-4 w-16 hidden sm:block" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Empty state
function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-[rgb(var(--daep-success))]/10 p-4 mb-4">
          <CheckCircle className="h-12 w-12 text-[rgb(var(--daep-success))]" />
        </div>
        <CardTitle className="text-xl mb-2">All caught up!</CardTitle>
        <CardDescription className="text-center max-w-md">
          There are no point entries waiting for approval. When staff members submit
          entries, they&apos;ll appear here for your review.
        </CardDescription>
      </CardContent>
    </Card>
  );
}
