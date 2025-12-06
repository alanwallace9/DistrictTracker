'use client';

/**
 * Point Adjustment Cell Component
 *
 * Story 3-2: Point Entry Grid
 *
 * Compact button in the roster table that opens the point adjustment dialog.
 * Shows a subtle indicator when adjustments exist for the current period.
 */

import { useState } from 'react';
import { TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PlusCircle, MessageSquarePlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { PointAdjustmentDialog } from './PointAdjustmentDialog';
import type { DailyPointsSummary, DailyPointEntry } from '@/lib/validation/schemas';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';

interface PointAdjustmentCellProps {
  placementId: string;
  date: string;
  period: string;
  summary: DailyPointsSummary | null;
  studentName: string;
  behaviorCategories: BehaviorCategory[];
  onAdjustmentAdded?: () => void;
  className?: string;
}

export function PointAdjustmentCell({
  placementId,
  date,
  period,
  summary,
  studentName,
  behaviorCategories,
  onAdjustmentAdded,
  className,
}: PointAdjustmentCellProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  // Count adjustments for this period (not including base points)
  const periodAdjustments = summary?.entries.filter(
    (e) => e.period === period && !e.is_base_points
  ) || [];
  const adjustmentCount = periodAdjustments.length;
  const hasAdjustments = adjustmentCount > 0;

  // Calculate net adjustment for this period
  const netAdjustment = periodAdjustments.reduce((sum, e) => sum + e.points_earned, 0);

  // Handle successful adjustment
  const handleSuccess = () => {
    // Show save indicator
    setShowSaveIndicator(true);

    // Call parent callback
    onAdjustmentAdded?.();

    // Hide indicator after delay
    setTimeout(() => {
      setShowSaveIndicator(false);
    }, 2000);
  };

  return (
    <TableCell className={cn('text-center', className)}>
      <div className="flex items-center justify-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={hasAdjustments ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 w-8 p-0 relative',
                  hasAdjustments && 'bg-secondary/80'
                )}
                onClick={() => setIsDialogOpen(true)}
              >
                {hasAdjustments ? (
                  <MessageSquarePlus className="h-4 w-4" />
                ) : (
                  <PlusCircle className="h-4 w-4 text-muted-foreground" />
                )}
                {hasAdjustments && (
                  <Badge
                    variant="default"
                    className={cn(
                      'absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px]',
                      netAdjustment > 0 && 'bg-emerald-500',
                      netAdjustment < 0 && 'bg-red-500',
                      netAdjustment === 0 && 'bg-gray-500'
                    )}
                  >
                    {adjustmentCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-sm">
              {hasAdjustments ? (
                <div className="space-y-1">
                  <div>{adjustmentCount} adjustment{adjustmentCount !== 1 ? 's' : ''} this period</div>
                  <div className={cn(
                    'font-medium',
                    netAdjustment > 0 && 'text-green-400',
                    netAdjustment < 0 && 'text-red-400'
                  )}>
                    Net: {netAdjustment > 0 ? '+' : ''}{netAdjustment} pts
                  </div>
                </div>
              ) : (
                <span>Add adjustment</span>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Save success indicator - subtle checkmark that fades */}
        {showSaveIndicator && (
          <div className="absolute animate-in fade-in slide-in-from-left-2 duration-200">
            <div className="flex items-center gap-1 bg-emerald-500/90 text-white text-xs px-2 py-1 rounded-full shadow-sm animate-pulse">
              <Check className="h-3 w-3" />
              <span>Saved</span>
            </div>
          </div>
        )}
      </div>

      {/* Point Adjustment Dialog */}
      <PointAdjustmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        placementId={placementId}
        date={date}
        period={period}
        studentName={studentName}
        behaviorCategories={behaviorCategories}
        existingAdjustments={periodAdjustments}
        currentUserId={user?.id}
        onSuccess={handleSuccess}
      />
    </TableCell>
  );
}

// Standalone button version for use outside table
export function PointAdjustmentButton({
  placementId,
  date,
  period,
  summary,
  studentName,
  behaviorCategories,
  onAdjustmentAdded,
  className,
}: PointAdjustmentCellProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  const periodAdjustments = summary?.entries.filter(
    (e) => e.period === period && !e.is_base_points
  ) || [];
  const adjustmentCount = periodAdjustments.length;
  const hasAdjustments = adjustmentCount > 0;
  const netAdjustment = periodAdjustments.reduce((sum, e) => sum + e.points_earned, 0);

  const handleSuccess = () => {
    setShowSaveIndicator(true);
    onAdjustmentAdded?.();
    setTimeout(() => setShowSaveIndicator(false), 2000);
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      <Button
        variant={hasAdjustments ? 'secondary' : 'outline'}
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="gap-1"
      >
        {hasAdjustments ? (
          <>
            <MessageSquarePlus className="h-4 w-4" />
            <span>{adjustmentCount}</span>
          </>
        ) : (
          <>
            <PlusCircle className="h-4 w-4" />
            <span>Adjust</span>
          </>
        )}
      </Button>

      {showSaveIndicator && (
        <div className="absolute -right-2 -top-2 animate-in fade-in zoom-in duration-200">
          <div className="bg-emerald-500 text-white rounded-full p-1 shadow-sm">
            <Check className="h-3 w-3" />
          </div>
        </div>
      )}

      <PointAdjustmentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        placementId={placementId}
        date={date}
        period={period}
        studentName={studentName}
        behaviorCategories={behaviorCategories}
        existingAdjustments={periodAdjustments}
        currentUserId={user?.id}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
