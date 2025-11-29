'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * DAEP-themed DialogContent
 *
 * Wraps the standard DialogContent with the `daep-theme` class
 * to ensure portal-rendered dialogs inherit DAEP theme variables.
 *
 * Use this instead of DialogContent in all DAEP module dialogs.
 */
const DAEPDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, children, ...props }, ref) => (
  <DialogContent
    ref={ref}
    className={cn('daep-theme', className)}
    {...props}
  >
    {children}
  </DialogContent>
));
DAEPDialogContent.displayName = 'DAEPDialogContent';

// Re-export everything for convenience
export {
  Dialog,
  DAEPDialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
};
