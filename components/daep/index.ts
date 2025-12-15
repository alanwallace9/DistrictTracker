/**
 * DAEP Component Library
 *
 * Themed wrappers for Radix portal components that add `daep-theme` class
 * to ensure DAEP theming works correctly in portals (dialogs, popovers, etc.)
 *
 * Usage:
 * import { DAEPDialogContent, DAEPPopoverContent } from '@/components/daep';
 */

// Dialog
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
} from './DAEPDialog';

// Popover
export {
  DAEPPopover,
  DAEPPopoverTrigger,
  DAEPPopoverContent,
  DAEPPopoverAnchor,
} from './DAEPPopover';

// Dropdown Menu
export {
  DAEPDropdownMenu,
  DAEPDropdownMenuTrigger,
  DAEPDropdownMenuContent,
  DAEPDropdownMenuItem,
  DAEPDropdownMenuCheckboxItem,
  DAEPDropdownMenuRadioItem,
  DAEPDropdownMenuLabel,
  DAEPDropdownMenuSeparator,
  DAEPDropdownMenuShortcut,
  DAEPDropdownMenuGroup,
  DAEPDropdownMenuPortal,
  DAEPDropdownMenuSub,
  DAEPDropdownMenuSubContent,
  DAEPDropdownMenuSubTrigger,
  DAEPDropdownMenuRadioGroup,
} from './DAEPDropdownMenu';

// Sheet (side panel)
export {
  DAEPSheet,
  DAEPSheetPortal,
  DAEPSheetOverlay,
  DAEPSheetTrigger,
  DAEPSheetClose,
  DAEPSheetContent,
  DAEPSheetHeader,
  DAEPSheetFooter,
  DAEPSheetTitle,
  DAEPSheetDescription,
} from './DAEPSheet';

// Alert Dialog
export {
  DAEPAlertDialog,
  DAEPAlertDialogPortal,
  DAEPAlertDialogOverlay,
  DAEPAlertDialogTrigger,
  DAEPAlertDialogContent,
  DAEPAlertDialogHeader,
  DAEPAlertDialogFooter,
  DAEPAlertDialogTitle,
  DAEPAlertDialogDescription,
  DAEPAlertDialogAction,
  DAEPAlertDialogCancel,
} from './DAEPAlertDialog';
