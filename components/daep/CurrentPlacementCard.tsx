'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleableProgressBar } from './shared/ToggleableProgressBar';
import { AttendanceRateProgress } from './shared/AttendanceRateProgress';
import { MilestoneBadges } from './shared/MilestoneBadges';
import { PlacementStatusBadge } from './shared/PlacementStatusBadge';
import { PlacementActivityPreview, PlacementAuditLog } from './audit';
import type { MilestoneRule, MilestoneAchievement } from '@/app/actions/daep/milestones';
import type { StudentAttendanceRates } from '@/lib/validation/schemas';
import { StatusTransitionActions } from './placements/StatusTransitionActions';
import {
  Calendar,
  Clock,
  Building,
  DoorOpen,
  AlertTriangle,
  AlertCircle,
  FileText,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { RoomAssignmentDialog } from './RoomAssignmentDialog';
import type { PlacementDetail } from '@/app/actions/daep/students';
import type { PlacementStatus } from '@/lib/validation/schemas';

interface Props {
  placement: PlacementDetail;
  schoolId: string;
  studentName: string;
  // Story 3-7: Cumulative Points & Milestones
  milestoneRules?: MilestoneRule[];
  milestoneAchievements?: MilestoneAchievement[];
  cumulativePoints?: {
    totalPointsEarned: number;
    totalPointsPossible: number;
    periodsPerDay: number;
  };
  /** IDs of badges newly earned this session (for glow animation) */
  newlyEarnedBadgeIds?: string[];
  // Story 3-11: Attendance Rates
  attendanceRates?: StudentAttendanceRates;
  attendanceThreshold?: number;
}

export function CurrentPlacementCard({
  placement,
  schoolId,
  studentName,
  milestoneRules = [],
  milestoneAchievements = [],
  cumulativePoints,
  newlyEarnedBadgeIds = [],
  attendanceRates,
  attendanceThreshold = 85,
}: Props) {
  const router = useRouter();
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);

  // Format dates
  const formatDate = (dateStr: string | null) =>
    dateStr ? format(new Date(dateStr), 'MMM d, yyyy') : '—';

  // Check if 90-day assessment is due
  const needs90DayAssessment =
    placement.assessment_90day_required && !placement.assessment_90day_date;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-medium">Current Placement</CardTitle>
          {/* Story 3-7: Milestone Badges */}
          {milestoneRules.length > 0 && (
            <MilestoneBadges
              rules={milestoneRules}
              achievements={milestoneAchievements}
              currentPoints={cumulativePoints?.totalPointsEarned || 0}
              newlyEarnedIds={newlyEarnedBadgeIds}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <PlacementStatusBadge status={placement.status as PlacementStatus} />
          {/* Edit Button - Story 2-8: AC 2.8.1 */}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/daep/placements/${placement.id}/edit`}>
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Link>
          </Button>
        </div>
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

        {/* Days/Points Progress - Story 3-7: Toggleable view */}
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">Progress</span>
          <ToggleableProgressBar
            daysServed={placement.days_served}
            daysAssigned={placement.days_assigned}
            daysRemaining={placement.days_remaining}
            pointsEarned={cumulativePoints?.totalPointsEarned || 0}
            pointsPossible={cumulativePoints?.totalPointsPossible || 0}
          />
        </div>

        {/* Attendance Rate - Story 3-11 */}
        {attendanceRates && (
          <AttendanceRateProgress
            dailyRate={attendanceRates.daily?.rate ?? null}
            cumulativeRate={attendanceRates.cumulative.rate}
            cumulativeCategory={attendanceRates.cumulative.rateCategory}
            cumulativeData={{
              periodsPresent: attendanceRates.cumulative.periodsPresent,
              totalPeriods: attendanceRates.cumulative.totalPeriods,
              daysWithAttendance: attendanceRates.cumulative.daysWithAttendance,
            }}
            threshold={attendanceThreshold}
          />
        )}

        {/* Consecutive Absence Warning - Story 3-11 (show at 3+ days) */}
        {attendanceRates && attendanceRates.cumulative.consecutiveAbsentDays >= 3 && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {attendanceRates.cumulative.consecutiveAbsentDays} consecutive absent days
            </AlertDescription>
          </Alert>
        )}

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

        {/* Status Transition Actions - Story 2-6 */}
        <div className="pt-2 border-t">
          <StatusTransitionActions
            placementId={placement.id}
            currentStatus={placement.status as PlacementStatus}
            daysRemaining={placement.days_remaining}
            onTransitionComplete={() => router.refresh()}
          />
        </div>

        {/* Story 3-8: Recent Activity Preview */}
        <Separator className="my-2" />
        <PlacementActivityPreview
          placementId={placement.id}
          maxItems={3}
          onViewAll={() => setAuditSheetOpen(true)}
        />
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

      {/* Story 3-8: Full Audit Log Sheet */}
      <PlacementAuditLog
        placementId={placement.id}
        placementLabel={`#${placement.incident_number || 'N/A'} (${placement.status})`}
        open={auditSheetOpen}
        onOpenChange={setAuditSheetOpen}
      />
    </Card>
  );
}
