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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
              />
            ) : (
              <div className="p-6 border rounded-lg bg-card">
                <p className="text-muted-foreground">No active DAEP placement</p>
              </div>
            )}

            {/* Tabs: History, Separations, Activity */}
            <Tabs defaultValue="history">
              <TabsList>
                <TabsTrigger value="history">Placement History</TabsTrigger>
                <TabsTrigger value="separations">Separations</TabsTrigger>
                <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
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
            </Tabs>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
