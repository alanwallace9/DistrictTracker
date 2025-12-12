import { getStudentProfile } from '@/app/actions/daep/students';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { StudentProfileContent } from '@/components/daep/StudentProfileContent';
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
      <StudentProfileContent
        profile={profile}
        placements={placements}
        schoolId={school_id}
        currentUserId={currentUserId}
        userRole={userRole}
        milestoneRules={milestoneRules}
        milestoneAchievements={milestoneAchievements}
        cumulativePoints={cumulativePoints || undefined}
        attendanceRates={attendanceRates || undefined}
        attendanceThreshold={attendanceThreshold}
      />
    );
  } catch (error) {
    notFound();
  }
}
