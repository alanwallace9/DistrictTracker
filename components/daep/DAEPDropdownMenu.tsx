'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * DAEP-themed DropdownMenu components
 *
 * Wraps shadcn DropdownMenu with `daep-theme` class on portal content
 * so that DAEP theming works correctly in Radix portals.
 */

// Re-export base components unchanged
export {
  DropdownMenu as DAEPDropdownMenu,
  DropdownMenuTrigger as DAEPDropdownMenuTrigger,
  DropdownMenuItem as DAEPDropdownMenuItem,
  DropdownMenuCheckboxItem as DAEPDropdownMenuCheckboxItem,
  DropdownMenuRadioItem as DAEPDropdownMenuRadioItem,
  DropdownMenuLabel as DAEPDropdownMenuLabel,
  DropdownMenuSeparator as DAEPDropdownMenuSeparator,
  DropdownMenuShortcut as DAEPDropdownMenuShortcut,
  DropdownMenuGroup as DAEPDropdownMenuGroup,
  DropdownMenuPortal as DAEPDropdownMenuPortal,
  DropdownMenuSub as DAEPDropdownMenuSub,
  DropdownMenuSubTrigger as DAEPDropdownMenuSubTrigger,
  DropdownMenuRadioGroup as DAEPDropdownMenuRadioGroup,
};

// Themed content wrapper
export const DAEPDropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuContent
    ref={ref}
    className={cn('daep-theme', className)}
    {...props}
  />
));
DAEPDropdownMenuContent.displayName = 'DAEPDropdownMenuContent';

// Themed sub-content wrapper
export const DAEPDropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuSubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuSubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuSubContent
    ref={ref}
    className={cn('daep-theme', className)}
    {...props}
  />
));
DAEPDropdownMenuSubContent.displayName = 'DAEPDropdownMenuSubContent';
