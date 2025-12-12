'use client';

/**
 * Collapsible Card Component
 *
 * Story 4-C: Reusable collapsible card wrapper
 *
 * Features:
 * - Smooth expand/collapse animation (400ms)
 * - Chevron indicator rotates on state change
 * - Optional default collapsed state
 * - Remembers state in localStorage (optional)
 * - Optional collapsed summary shown when collapsed
 * - Works with any card content
 */

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface CollapsibleCardProps {
  /** Card title displayed in header */
  title: React.ReactNode;
  /** Icon to display before title */
  icon?: React.ReactNode;
  /** Content displayed when expanded */
  children: React.ReactNode;
  /** Additional content for header right side (badges, buttons) */
  headerRight?: React.ReactNode;
  /** Action button that doesn't trigger collapse (e.g., edit button) */
  headerAction?: React.ReactNode;
  /** Summary text shown next to title when collapsed */
  collapsedSummary?: React.ReactNode;
  /** Whether card starts collapsed */
  defaultOpen?: boolean;
  /** Storage key for remembering state (omit to not persist) */
  storageKey?: string;
  /** Additional className for the card */
  className?: string;
  /** Additional className for the header */
  headerClassName?: string;
  /** Additional className for the content */
  contentClassName?: string;
}

export function CollapsibleCard({
  title,
  icon,
  children,
  headerRight,
  headerAction,
  collapsedSummary,
  defaultOpen = true,
  storageKey,
  className,
  headerClassName,
  contentClassName,
}: CollapsibleCardProps) {
  // Initialize from localStorage if storageKey provided
  const [open, setOpen] = React.useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`collapsible-card-${storageKey}`);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return defaultOpen;
  });

  // Persist to localStorage when state changes
  React.useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`collapsible-card-${storageKey}`, String(open));
    }
  }, [open, storageKey]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={className}>
        <CollapsibleTrigger asChild>
          <CardHeader
            className={cn(
              'flex flex-row items-center justify-between cursor-pointer select-none hover:bg-muted/30 transition-colors',
              !open && 'pb-4',
              headerClassName
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {icon && <span className="text-muted-foreground flex-shrink-0">{icon}</span>}
              <CardTitle className="text-base font-medium flex-shrink-0">{title}</CardTitle>
              {/* Show collapsed summary when collapsed */}
              {!open && collapsedSummary && (
                <span className="text-sm text-muted-foreground truncate ml-2">
                  {collapsedSummary}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {headerRight}
              {headerAction && (
                <div onClick={(e) => e.stopPropagation()}>
                  {headerAction}
                </div>
              )}
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform duration-[400ms]',
                  open && 'rotate-180'
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className={contentClassName}>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
