'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { checkActivePlacement, type ActivePlacementInfo } from '@/app/actions/daep/placements';
import Link from 'next/link';

interface Props {
  schoolId: string;
  excludePlacementId?: string;
}

/**
 * Warning component that displays when a student already has an active placement
 * Used in placement creation/edit forms to prevent duplicates
 * Story 2-10: Prevent Duplicate Active Placements (FR24)
 */
export function ActivePlacementWarning({ schoolId, excludePlacementId }: Props) {
  const [activePlacement, setActivePlacement] = useState<ActivePlacementInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function check() {
      if (!schoolId) {
        setActivePlacement(null);
        return;
      }

      setLoading(true);
      try {
        const result = await checkActivePlacement(schoolId, excludePlacementId);
        if (result.hasActive) {
          setActivePlacement(result.activePlacement);
        } else {
          setActivePlacement(null);
        }
      } catch (error) {
        // Silent fail - server-side validation will catch at submit
        console.error('Error checking active placement:', error);
        setActivePlacement(null);
      } finally {
        setLoading(false);
      }
    }

    check();
  }, [schoolId, excludePlacementId]);

  if (loading || !activePlacement) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Active Placement Exists</AlertTitle>
      <AlertDescription>
        This student already has an active placement (Incident #{activePlacement.incident_number},
        Status: {activePlacement.status}).{' '}
        <Link
          href={`/daep/students/${schoolId}`}
          className="underline font-medium hover:no-underline"
        >
          View student profile
        </Link>
        {' '}to manage the existing placement before creating a new one.
      </AlertDescription>
    </Alert>
  );
}
