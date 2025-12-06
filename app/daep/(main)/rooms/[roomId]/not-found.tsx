/**
 * Room Not Found Page
 *
 * Story 3-1: Room Roster View
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, ArrowLeft } from 'lucide-react';

export default function RoomNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        Room Not Found
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        The room you're looking for doesn't exist or you don't have access to it.
        It may have been deleted or deactivated.
      </p>
      <Button asChild>
        <Link href="/daep/rooms">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Rooms
        </Link>
      </Button>
    </div>
  );
}
