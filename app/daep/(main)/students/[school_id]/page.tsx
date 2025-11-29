import { getStudentProfile } from '@/app/actions/daep/students';
import { notFound } from 'next/navigation';
import { StudentProfileHeader } from '@/components/daep/StudentProfileHeader';
import { StudentDemographicsCard } from '@/components/daep/StudentDemographicsCard';
import { CurrentPlacementCard } from '@/components/daep/CurrentPlacementCard';
import { PlacementHistoryTable } from '@/components/daep/PlacementHistoryTable';
import { TrespassTrackerStatus } from '@/components/daep/TrespassTrackerStatus';
import { StudentSeparationsTab } from '@/components/daep/StudentSeparationsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  params: Promise<{ school_id: string }>;
}

export default async function StudentProfilePage({ params }: Props) {
  const { school_id } = await params;

  try {
    const profile = await getStudentProfile(school_id);

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
                <div className="p-6 border rounded-lg bg-card text-muted-foreground">
                  Activity timeline coming in Epic 4 (Story 4.5)
                </div>
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
