'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import type { PlacementDetail } from '@/app/actions/daep/students';

interface Props {
  placements: PlacementDetail[];
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  transition: 'bg-blue-100 text-blue-800 border-blue-200',
  complete: 'bg-gray-100 text-gray-800 border-gray-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  active: 'Active',
  transition: 'Transition',
  complete: 'Complete',
  closed: 'Closed',
};

export function PlacementHistoryTable({ placements }: Props) {
  if (placements.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No placement history found
        </CardContent>
      </Card>
    );
  }

  // Determine outcome badge
  const getOutcome = (placement: PlacementDetail): string | null => {
    if (placement.no_show) return 'No Show';
    if (placement.rollover_student) return 'Rollover';
    if (placement.status === 'complete') return 'Completed';
    return null;
  };

  const getOutcomeStyle = (outcome: string | null): string => {
    if (!outcome) return '';
    switch (outcome) {
      case 'No Show':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Rollover':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visit #</TableHead>
              <TableHead>Incident #</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Offense</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {placements.map((placement) => {
              const outcome = getOutcome(placement);

              return (
                <TableRow
                  key={placement.id}
                  className="cursor-pointer hover:bg-muted/50"
                  title="Click to view details (coming soon)"
                >
                  <TableCell>
                    {placement.visit_number ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Visit #{placement.visit_number}</span>
                        {placement.is_repeat && (
                          <Badge
                            variant="outline"
                            className="bg-purple-100 text-purple-800 border-purple-200"
                          >
                            Repeat
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {placement.incident_number}
                  </TableCell>
                  <TableCell>
                    {format(new Date(placement.start_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{placement.days_served}</span>
                    <span className="text-muted-foreground">
                      /{placement.days_assigned}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-sm">{placement.offense_code}</span>
                      {placement.offense_label && (
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {placement.offense_label}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={STATUS_STYLES[placement.status] || ''}
                    >
                      {STATUS_LABELS[placement.status] || placement.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {outcome && (
                      <Badge variant="outline" className={getOutcomeStyle(outcome)}>
                        {outcome}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
