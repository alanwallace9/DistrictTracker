import { getStudentProfile } from '@/app/actions/daep/students';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { StudentProfileHeader } from '@/components/daep/StudentProfileHeader';
import { StudentDemographicsCard } from '@/components/daep/StudentDemographicsCard';
import { CurrentPlacementCard } from '@/components/daep/CurrentPlacementCard';
import { PlacementHistoryTable } from '@/components/daep/PlacementHistoryTable';
import { TrespassTrackerStatus } from '@/components/daep/TrespassTrackerStatus';
import { StudentSeparationsTab } from '@/components/daep/StudentSeparationsTab';
import { StudentPointsLog } from '@/components/daep/StudentPointsLog';
import { StudentAuditLog } from '@/components/daep/audit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getMilestoneRules,
  getStudentMilestones,
  getCumulativePoints,
} from '@/app/actions/daep/milestones';
import {
  getStudentAttendanceRates,
  getAttendanceThreshold,
} from '@/app/actions/daep/attendance';

interface Props {
  params: Promise<{ school_id: string }>;
}

export default async function StudentProfilePage({ params }: Props) {
  const { school_id } = await params;

  try {
    const profile = await getStudentProfile(school_id);

    // Get current user info for permissions
    const user = await currentUser();
    let currentUserId: string | undefined;
    let userRole: string | undefined;

    if (user) {
      currentUserId = user.id;
      // Get user role from database
      const supabase = await createServerClient();
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      userRole = userProfile?.role;
    }

    // Transform placements for StudentPointsLog
    const placements = profile.placementHistory.map((p) => ({
      id: p.id,
      incident_number: p.incident_number,
      start_date: p.start_date,
      expected_end_date: p.expected_end_date,
      status: p.status,
    }));

    // Story 3-7: Fetch milestone data for current placement
    // Story 3-11: Fetch attendance rates for current placement
    let milestoneRules: Awaited<ReturnType<typeof getMilestoneRules>> = [];
    let milestoneAchievements: Awaited<ReturnType<typeof getStudentMilestones>> = [];
    let cumulativePoints: Awaited<ReturnType<typeof getCumulativePoints>> | null = null;
    let attendanceRates: Awaited<ReturnType<typeof getStudentAttendanceRates>> | null = null;
    let attendanceThreshold = 85;

    if (profile.currentPlacement) {
      try {
        // Fetch milestone rules, achievements, cumulative points, and attendance rates in parallel
        const [rulesResult, achievementsResult, pointsResult, attendanceResult, thresholdResult] = await Promise.all([
          getMilestoneRules(),
          getStudentMilestones(profile.currentPlacement.id),
          getCumulativePoints(profile.currentPlacement.id),
          getStudentAttendanceRates(profile.currentPlacement.id),
          getAttendanceThreshold(),
        ]);
        milestoneRules = rulesResult;
        milestoneAchievements = achievementsResult;
        cumulativePoints = pointsResult;
        attendanceRates = attendanceResult;
        attendanceThreshold = thresholdResult;
      } catch (error) {
        // Non-fatal - milestones/attendance just won't display
        console.error('Error fetching placement data:', error);
      }
    }

    return (
      <div className="space-y-6">
        {/* Header: Photo, Name, ID, Grade, Flags, Actions */}
        <StudentProfileHeader student={profile.student} />

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Demographics + TT Status */}
          <div className="space-y-6">
            <StudentDemographicsCard student={profile.student} />
            <TrespassTrackerStatus schoolId={school_id} />
          </div>

          {/* Right column (2 cols wide): Placement info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Placement Card */}
            {profile.currentPlacement ? (
              <CurrentPlacementCard
                placement={profile.currentPlacement}
                schoolId={school_id}
                studentName={`${profile.student.first_name} ${profile.student.last_name}`}
                milestoneRules={milestoneRules}
                milestoneAchievements={milestoneAchievements}
                cumulativePoints={cumulativePoints || undefined}
                attendanceRates={attendanceRates || undefined}
                attendanceThreshold={attendanceThreshold}
              />
            ) : (
              <div className="p-6 border rounded-lg bg-card">
                <p className="text-muted-foreground">No active DAEP placement</p>
              </div>
            )}

            {/* Tabs: History, Separations, Activity, Audit Log (admin only) */}
            <Tabs defaultValue="history">
              <TabsList>
                <TabsTrigger value="history">Placement History</TabsTrigger>
                <TabsTrigger value="separations">Separations</TabsTrigger>
                <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
                {/* Story 3-8: Audit Log tab - admin only */}
                {userRole && ['super_admin', 'district_admin', 'daep_admin_l1'].includes(userRole) && (
                  <TabsTrigger value="audit">Audit Log</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="history" className="mt-4">
                <PlacementHistoryTable placements={profile.placementHistory} />
              </TabsContent>

              <TabsContent value="separations" className="mt-4">
                <StudentSeparationsTab
                  schoolId={school_id}
                  studentName={`${profile.student.first_name} ${profile.student.last_name}`}
                />
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <StudentPointsLog
                  placements={placements}
                  studentName={`${profile.student.first_name} ${profile.student.last_name}`}
                  currentUserId={currentUserId}
                  userRole={userRole}
                />
              </TabsContent>

              {/* Story 3-8: Audit Log tab content - admin only */}
              {userRole && ['super_admin', 'district_admin', 'daep_admin_l1'].includes(userRole) && (
                <TabsContent value="audit" className="mt-4">
                  <StudentAuditLog
                    studentId={school_id}
                    placements={profile.placementHistory.map((p) => ({
                      id: p.id,
                      incident_number: p.incident_number,
                      status: p.status,
                    }))}
                  />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
