'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ArrowRight, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import {
  getPlacementTransitions,
  type PlacementTransition,
} from '@/app/actions/daep/placements';
import { getStatusDescription } from '@/lib/daep/placement-state-machine';

interface TransitionHistoryProps {
  placementId: string;
}

/**
 * Transition History Component
 * Story 2-9: AC 2.9.9
 *
 * Displays timeline of status changes for a placement.
 */
export function TransitionHistory({ placementId }: TransitionHistoryProps) {
  const [transitions, setTransitions] = useState<PlacementTransition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTransitions() {
      try {
        setIsLoading(true);
        const data = await getPlacementTransitions(placementId);
        setTransitions(data);
        setError(null);
      } catch (err) {
        console.error('Error loading transitions:', err);
        setError('Failed to load transition history');
      } finally {
        setIsLoading(false);
      }
    }

    loadTransitions();
  }, [placementId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (transitions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Transition History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No transitions recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Transition History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

          <div className="space-y-4">
            {transitions.map((transition, index) => (
              <div key={transition.id} className="relative pl-8">
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center ${
                    index === 0
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted border border-border'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-current" />
                </div>

                <div className="flex flex-col gap-1">
                  {/* Status transition */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {transition.from_status && (
                      <>
                        <Badge variant="outline" className="text-xs">
                          {getStatusDescription(transition.from_status)}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      </>
                    )}
                    <Badge
                      variant={transition.to_status === 'complete' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {getStatusDescription(transition.to_status)}
                    </Badge>
                  </div>

                  {/* Reason */}
                  {transition.transition_reason && (
                    <p className="text-sm text-foreground">
                      {transition.transition_reason}
                    </p>
                  )}

                  {/* Notes */}
                  {transition.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      {transition.notes}
                    </p>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(transition.transitioned_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
