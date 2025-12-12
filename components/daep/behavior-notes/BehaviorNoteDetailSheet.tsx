'use client';

/**
 * BehaviorNoteDetailSheet
 *
 * Story 4-3: Behavior Notes List View
 * Story 4-4: Added placement context section showing linked incident
 *
 * Slide-out sheet showing full details of a behavior note:
 * - Student info with link to profile
 * - Date/time
 * - Placement/incident context (Story 4-4)
 * - Category with type badge
 * - Full description
 * - Action taken
 * - Staff member
 * - Verified status
 * - Timestamps
 */

import Link from 'next/link';
import { CheckCircle, User, Calendar, Clock, Building2, Tag, FileText, MessageSquare, AlertCircle, Link2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { BehaviorNoteListItem } from '@/lib/validation/schemas';

interface BehaviorNoteDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: BehaviorNoteListItem | null;
}

const CATEGORY_TYPE_STYLES: Record<string, string> = {
  positive: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  negative: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  neutral: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

// Story 4-4: Placement status badge styles
const PLACEMENT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  met: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  complete: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return 'Not recorded';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'Not recorded';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

export function BehaviorNoteDetailSheet({
  open,
  onOpenChange,
  note,
}: BehaviorNoteDetailSheetProps) {
  if (!note) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            Behavior Note Details
          </SheetTitle>
          <SheetDescription>
            {formatDate(note.incident_date)} at {formatTime(note.incident_time)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Student Info */}
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              {note.student_photo_url && (
                <AvatarImage
                  src={note.student_photo_url}
                  alt={`${note.student_first_name} ${note.student_last_name}`}
                />
              )}
              <AvatarFallback className="bg-muted text-muted-foreground">
                {getInitials(note.student_first_name, note.student_last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Link
                href={`/daep/students/${note.student_school_id}`}
                className="text-lg font-semibold hover:underline text-primary"
              >
                {note.student_last_name}, {note.student_first_name}
              </Link>
              <div className="text-sm text-muted-foreground">
                ID: {note.student_school_id}
              </div>
              {note.home_campus_name && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Building2 className="w-3 h-3" />
                  {note.home_campus_name}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Story 4-4: Placement Context */}
          {note.placement_id && note.incident_number ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Link2 className="w-4 h-4" />
                Linked Placement
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Incident:</span>
                  <Link
                    href={`/daep/students/${note.student_school_id}?tab=history&placement=${note.placement_id}`}
                    className="font-mono text-sm text-primary hover:underline"
                  >
                    {note.incident_number}
                  </Link>
                </div>
                {note.placement_status && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs capitalize',
                        PLACEMENT_STATUS_STYLES[note.placement_status] || 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {note.placement_status}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">No active placement when note was created</span>
            </div>
          )}

          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Tag className="w-4 h-4" />
              Category
            </div>
            {note.category ? (
              <Badge
                variant="outline"
                className={cn(
                  'text-sm',
                  note.category_type
                    ? CATEGORY_TYPE_STYLES[note.category_type]
                    : 'bg-gray-100 text-gray-700'
                )}
              >
                {note.category}
                {note.category_type && (
                  <span className="ml-1 opacity-70">({note.category_type})</span>
                )}
              </Badge>
            ) : (
              <span className="text-muted-foreground">No category assigned</span>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              Description
            </div>
            <div className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
              {note.description || 'No description provided'}
            </div>
          </div>

          {/* Action Taken */}
          {note.action_taken && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="w-4 h-4" />
                Action Taken
              </div>
              <div className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                {note.action_taken}
              </div>
            </div>
          )}

          <Separator />

          {/* Staff & Verification */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="w-4 h-4" />
                Staff Member
              </div>
              <div className="text-sm">{note.staff_name}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CheckCircle className="w-4 h-4" />
                Verified
              </div>
              <div className="text-sm">
                {note.is_verified ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Yes
                  </span>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )}
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Created: {formatDateTime(note.created_at)}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Updated: {formatDateTime(note.updated_at)}
            </div>
            {note.verified_at && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                Verified: {formatDateTime(note.verified_at)}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
