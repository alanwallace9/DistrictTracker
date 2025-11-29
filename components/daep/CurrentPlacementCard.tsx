'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Clock,
  Building,
  DoorOpen,
  AlertTriangle,
  FileText,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { RoomAssignmentDialog } from './RoomAssignmentDialog';
import type { PlacementDetail } from '@/app/actions/daep/students';

interface Props {
  placement: PlacementDetail;
  schoolId: string;
  studentName: string;
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
  transition: 'In Transition',
  complete: 'Complete',
  closed: 'Closed',
};

export function CurrentPlacementCard({ placement, schoolId, studentName }: Props) {
  const router = useRouter();
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);

  // Calculate progress percentage
  const progressPercent =
    placement.days_assigned > 0
      ? Math.min(100, Math.round((placement.days_served / placement.days_assigned) * 100))
      : 0;

  // Format dates
  const formatDate = (dateStr: string | null) =>
    dateStr ? format(new Date(dateStr), 'MMM d, yyyy') : '—';

  // Check if 90-day assessment is due
  const needs90DayAssessment =
    placement.assessment_90day_required && !placement.assessment_90day_date;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Current Placement</CardTitle>
        <Badge
          variant="outline"
          className={STATUS_STYLES[placement.status] || 'bg-gray-100'}
        >
          {STATUS_LABELS[placement.status] || placement.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 90-Day Assessment Alert */}
        {needs90DayAssessment && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              90-day assessment required but not yet completed
            </AlertDescription>
          </Alert>
        )}

        {/* Days Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Days Progress</span>
            <span className="font-medium">
              {placement.days_served} of {placement.days_assigned} days
              {placement.days_remaining > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({placement.days_remaining} remaining)
                </span>
              )}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Offense Code */}
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="text-sm">
            <span className="font-mono font-medium">{placement.offense_code}</span>
            {placement.offense_label && (
              <span className="text-muted-foreground ml-2">
                - {placement.offense_label}
              </span>
            )}
            {placement.mandatory_placement && (
              <Badge variant="destructive" className="ml-2 text-xs">
                Mandatory
              </Badge>
            )}
          </div>
        </div>

        {/* Grid of details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Home Campus */}
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Home Campus</p>
              <p>{placement.home_campus?.name || '—'}</p>
            </div>
          </div>

          {/* Assigned Room - Clickable to change (AC: 6.2) */}
          <div
            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
            onClick={() => setRoomDialogOpen(true)}
            title="Click to change room"
          >
            <DoorOpen className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Assigned Room</p>
              <p className="flex items-center gap-1">
                {placement.assigned_room
                  ? `${placement.assigned_room.room_number}${
                      placement.assigned_room.room_name
                        ? ` (${placement.assigned_room.room_name})`
                        : ''
                    }`
                  : 'Not assigned'}
                <Edit className="w-3 h-3 text-muted-foreground" />
              </p>
            </div>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p>{formatDate(placement.start_date)}</p>
            </div>
          </div>

          {/* Expected End Date */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Expected End</p>
              <p>{formatDate(placement.expected_end_date)}</p>
            </div>
          </div>
        </div>

        {/* Incident Number */}
        <div className="pt-2 border-t text-sm">
          <span className="text-muted-foreground">Incident #: </span>
          <span className="font-mono">{placement.incident_number}</span>
        </div>

        {/* Flags */}
        {(placement.rollover_student || placement.no_show) && (
          <div className="flex gap-2 pt-2 border-t">
            {placement.rollover_student && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Rollover Student
              </Badge>
            )}
            {placement.no_show && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                No Show
              </Badge>
            )}
          </div>
        )}

        {/* Intake Notes */}
        {placement.intake_notes && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Intake Notes
            </p>
            <p className="text-sm whitespace-pre-wrap">{placement.intake_notes}</p>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 border-t">
          <Button variant="outline" size="sm" disabled title="Coming in Story 2-8">
            <Edit className="w-4 h-4 mr-2" />
            Edit Placement
          </Button>
        </div>
      </CardContent>

      {/* Room Assignment Dialog (AC: 6.2) */}
      <RoomAssignmentDialog
        open={roomDialogOpen}
        onOpenChange={setRoomDialogOpen}
        placementId={placement.id}
        schoolId={schoolId}
        studentName={studentName}
        currentRoomId={placement.assigned_room?.id}
        onSuccess={() => router.refresh()}
      />
    </Card>
  );
}
