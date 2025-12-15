'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

/**
 * DAEP-themed AlertDialog components
 *
 * Wraps shadcn AlertDialog with `daep-theme` class on portal content
 * so that DAEP theming works correctly in Radix portals.
 */

// Re-export base components unchanged
export {
  AlertDialog as DAEPAlertDialog,
  AlertDialogPortal as DAEPAlertDialogPortal,
  AlertDialogOverlay as DAEPAlertDialogOverlay,
  AlertDialogTrigger as DAEPAlertDialogTrigger,
  AlertDialogHeader as DAEPAlertDialogHeader,
  AlertDialogFooter as DAEPAlertDialogFooter,
  AlertDialogTitle as DAEPAlertDialogTitle,
  AlertDialogDescription as DAEPAlertDialogDescription,
  AlertDialogAction as DAEPAlertDialogAction,
  AlertDialogCancel as DAEPAlertDialogCancel,
};

// Themed content wrapper
export const DAEPAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogContent>,
  React.ComponentPropsWithoutRef<typeof AlertDialogContent>
>(({ className, ...props }, ref) => (
  <AlertDialogContent
    ref={ref}
    className={cn('daep-theme', className)}
    {...props}
  />
));
DAEPAlertDialogContent.displayName = 'DAEPAlertDialogContent';
