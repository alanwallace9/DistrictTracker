'use client';

/**
 * NewNotesBadge
 *
 * Story 4-3: Behavior Notes List View - UX Quick Win
 *
 * Badge showing count of notes added since user's last visit.
 * Helps admins quickly see if there are new notes to review.
 */

import { Badge } from '@/components/ui/badge';

interface NewNotesBadgeProps {
  count: number;
}

export function NewNotesBadge({ count }: NewNotesBadgeProps) {
  if (count <= 0) return null;

  return (
    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100">
      {count} new
    </Badge>
  );
}
