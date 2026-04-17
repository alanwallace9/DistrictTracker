'use client';

/**
 * Student Profile Content Component
 *
 * Story 4-G: Add Note from Profile
 *
 * Client wrapper for the student profile page that manages:
 * - Add Note inline form state
 * - Page refresh on note save
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StudentProfileHeader } from './StudentProfileHeader';
import { StudentDemographicsCard } from './StudentDemographicsCard';
import { StudentAttendanceCard } from './StudentAttendanceCard';
import { CurrentPlacementCard } from './CurrentPlacementCard';
import { TrespassTrackerStatus } from './TrespassTrackerStatus';
import { StudentProfileTabs } from './StudentProfileTabs';
import { AddNoteInlineForm } from './AddNoteInlineForm';
import type { StudentProfile, PlacementDetail } from '@/app/actions/daep/students';
import type { MilestoneRule, MilestoneAchievement } from '@/app/actions/daep/milestones';
import type { StudentAttendanceRates } from '@/lib/validation/schemas';

interface Placement {
  id: string;
  incident_number: string | null;
  start_date: string;
  expected_end_date: string | null;
  status: string;
}

interface StudentProfileContentProps {
  profile: {
    student: StudentProfile;
    currentPlacement: PlacementDetail | null;
    placementHistory: PlacementDetail[];
  };
  placements: Placement[];
  schoolId: string;
  currentUserId?: string;
  userRole?: string;
  milestoneRules: MilestoneRule[];
  milestoneAchievements: MilestoneAchievement[];
  cumulativePoints?: {
    totalPointsEarned: number;
    totalPointsPossible: number;
    periodsPerDay: number;
  };
  attendanceRates?: StudentAttendanceRates;
  attendanceThreshold: number;
}

export function StudentProfileContent({
  profile,
  placements,
  schoolId,
  currentUserId,
  userRole,
  milestoneRules,
  milestoneAchievements,
  cumulativePoints,
  attendanceRates,
  attendanceThreshold,
}: StudentProfileContentProps) {
  const router = useRouter();
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  const studentName = `${profile.student.first_name} ${profile.student.last_name}`;

  // Handle toggle of Add Note form
  const handleToggleAddNote = useCallback(() => {
    setIsAddNoteOpen((prev) => !prev);
  }, []);

  // Handle successful note save
  const handleNoteSaved = useCallback(() => {
    // Refresh the page to update activity timeline
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Header: Photo, Name, ID, Grade, Flags, Actions */}
      <StudentProfileHeader
        student={profile.student}
        onAddNote={handleToggleAddNote}
        isAddNoteOpen={isAddNoteOpen}
      />

      {/* Add Note Inline Form - Story 4-G */}
      {isAddNoteOpen && (
        <AddNoteInlineForm
          schoolId={schoolId}
          studentName={studentName}
          placements={placements}
          currentPlacementId={profile.currentPlacement?.id}
          onClose={() => setIsAddNoteOpen(false)}
          onSuccess={handleNoteSaved}
        />
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Demographics + Attendance + TT Status */}
        <div className="space-y-6">
          <StudentDemographicsCard student={profile.student} schoolId={schoolId} />
          {attendanceRates && profile.currentPlacement && (
            <StudentAttendanceCard
              attendanceRates={attendanceRates}
              daysAssigned={profile.currentPlacement.days_assigned}
            />
          )}
          <TrespassTrackerStatus schoolId={schoolId} />
        </div>

        {/* Right column (2 cols wide): Placement info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Placement Card */}
          {profile.currentPlacement ? (
            <CurrentPlacementCard
              placement={profile.currentPlacement}
              schoolId={schoolId}
              studentName={studentName}
              milestoneRules={milestoneRules}
              milestoneAchievements={milestoneAchievements}
              cumulativePoints={cumulativePoints}
              attendanceRates={attendanceRates}
              attendanceThreshold={attendanceThreshold}
            />
          ) : (
            <div className="p-6 border rounded-lg bg-card">
              <p className="text-muted-foreground">No active DAEP placement</p>
            </div>
          )}

          {/* Manila Folder Tabs: History, Activity, Separations (staff), Audit Log (staff) */}
          <StudentProfileTabs
            schoolId={schoolId}
            studentName={studentName}
            homeCampus={profile.student.current_school || undefined}
            placementHistory={profile.placementHistory}
            placements={placements}
            currentUserId={currentUserId}
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  );
}
