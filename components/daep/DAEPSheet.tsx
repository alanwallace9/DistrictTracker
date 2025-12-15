'use client';

import * as React from 'react';
import {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * DAEP-themed Sheet components
 *
 * Wraps shadcn Sheet with `daep-theme` class on portal content
 * so that DAEP theming works correctly in Radix portals.
 */

// Re-export base components unchanged
export {
  Sheet as DAEPSheet,
  SheetPortal as DAEPSheetPortal,
  SheetOverlay as DAEPSheetOverlay,
  SheetTrigger as DAEPSheetTrigger,
  SheetClose as DAEPSheetClose,
  SheetHeader as DAEPSheetHeader,
  SheetFooter as DAEPSheetFooter,
  SheetTitle as DAEPSheetTitle,
  SheetDescription as DAEPSheetDescription,
};

// Themed content wrapper
export const DAEPSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetContent>,
  React.ComponentPropsWithoutRef<typeof SheetContent>
>(({ className, ...props }, ref) => (
  <SheetContent
    ref={ref}
    className={cn('daep-theme', className)}
    {...props}
  />
));
DAEPSheetContent.displayName = 'DAEPSheetContent';
