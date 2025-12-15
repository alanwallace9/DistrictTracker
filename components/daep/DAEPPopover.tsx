'use client';

import * as React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverAnchor,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * DAEP-themed Popover components
 *
 * Wraps shadcn Popover with `daep-theme` class on portal content
 * so that DAEP theming works correctly in Radix portals.
 *
 * Usage:
 * import { DAEPPopover, DAEPPopoverTrigger, DAEPPopoverContent } from '@/components/daep/DAEPPopover';
 */

// Re-export base components unchanged
export { Popover as DAEPPopover, PopoverTrigger as DAEPPopoverTrigger, PopoverAnchor as DAEPPopoverAnchor };

// Themed content wrapper
export const DAEPPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  React.ComponentPropsWithoutRef<typeof PopoverContent>
>(({ className, ...props }, ref) => (
  <PopoverContent
    ref={ref}
    className={cn('daep-theme', className)}
    {...props}
  />
));
DAEPPopoverContent.displayName = 'DAEPPopoverContent';
