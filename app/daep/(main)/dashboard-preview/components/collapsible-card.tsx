'use client';

import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CollapsibleCard Component
 *
 * A card wrapper that adds collapse/expand functionality with localStorage persistence.
 * Maintains the same card styling but adds a chevron toggle in the header.
 *
 * Features:
 * - Smooth collapse/expand animation
 * - State persisted to localStorage by cardId
 * - Consistent styling with dashboard cards
 * - Optional badge count in header
 */

interface CollapsibleCardProps {
  /** Unique ID for localStorage persistence */
  cardId: string;
  /** Card title */
  title: string;
  /** Optional icon to show before title */
  icon?: ReactNode;
  /** Optional badge count */
  badgeCount?: number;
  /** Card content */
  children: ReactNode;
  /** Additional className for the card */
  className?: string;
  /** Default collapsed state (only used if no localStorage value) */
  defaultCollapsed?: boolean;
  /** Optional header actions (right side, before chevron) */
  headerActions?: ReactNode;
}

const STORAGE_KEY_PREFIX = 'daep-card-collapsed-';

export function CollapsibleCard({
  cardId,
  title,
  icon,
  badgeCount,
  children,
  className,
  defaultCollapsed = false,
  headerActions,
}: CollapsibleCardProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean | null>(null);

  // Load persisted state on mount
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${cardId}`);
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    } else {
      setIsCollapsed(defaultCollapsed);
    }
  }, [cardId, defaultCollapsed]);

  // Persist state changes
  const toggleCollapsed = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${cardId}`, String(newValue));
  };

  // Don't render until we've loaded the persisted state
  if (isCollapsed === null) {
    return (
      <Card className={cn('shadow-sm border-border', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            {icon}
            {title}
            {badgeCount !== undefined && badgeCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs bg-muted">
                {badgeCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('shadow-sm border-border overflow-hidden', className)}>
      <CardHeader
        className={cn(
          'flex flex-row items-center justify-between space-y-0 cursor-pointer select-none transition-colors hover:bg-muted/30',
          isCollapsed ? 'pb-4' : 'pb-4'
        )}
        onClick={toggleCollapsed}
      >
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
          {icon}
          {title}
          {badgeCount !== undefined && badgeCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs bg-muted">
              {badgeCount}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Header actions (stop propagation so they don't trigger collapse) */}
          {headerActions && (
            <div onClick={(e) => e.stopPropagation()}>
              {headerActions}
            </div>
          )}
          {/* Collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsed();
            }}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? -90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </Button>
        </div>
      </CardHeader>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <CardContent className="pt-0">
              {children}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/**
 * Hook to manage card collapse state globally
 * Useful for "Collapse All" / "Expand All" functionality
 */
export function useCardCollapseState(cardIds: string[]) {
  const [states, setStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadedStates: Record<string, boolean> = {};
    cardIds.forEach((id) => {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
      loadedStates[id] = stored === 'true';
    });
    setStates(loadedStates);
  }, [cardIds]);

  const collapseAll = () => {
    cardIds.forEach((id) => {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, 'true');
    });
    const newStates: Record<string, boolean> = {};
    cardIds.forEach((id) => (newStates[id] = true));
    setStates(newStates);
  };

  const expandAll = () => {
    cardIds.forEach((id) => {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, 'false');
    });
    const newStates: Record<string, boolean> = {};
    cardIds.forEach((id) => (newStates[id] = false));
    setStates(newStates);
  };

  const resetToDefaults = () => {
    cardIds.forEach((id) => {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
    });
    setStates({});
  };

  return { states, collapseAll, expandAll, resetToDefaults };
}
