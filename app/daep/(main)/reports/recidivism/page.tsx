import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getUserProfile } from '@/app/actions/users';
import {
  getRecidivismBreakdown,
  getCampuses,
} from '@/app/actions/daep/dashboard';
import { RecidivismDrillDown } from './recidivism-drill-down';

/**
 * Recidivism Drill-Down Page
 * Story 6-2: Clickable KPIs & Drill-Down
 *
 * Full recidivism breakdown with:
 * - Summary stats (rate, counts)
 * - By Offense distribution chart
 * - Time to Return distribution chart
 * - Returning Students table with profile links
 *
 * Access: L1+ Admin only (super_admin, district_admin, daep_admin_l1, daep_admin_l2)
 */

// Roles allowed to access this page
const ALLOWED_ROLES = ['super_admin', 'district_admin', 'daep_admin_l1', 'daep_admin_l2'];

interface PageProps {
  searchParams: Promise<{ campus?: string }>;
}

export default async function RecidivismPage({ searchParams }: PageProps) {
  // Role check
  const user = await currentUser();
  if (!user) {
    redirect('/daep');
  }

  const profile = await getUserProfile(user.id);
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    redirect('/daep');
  }

  // Get campus filter from URL
  const params = await searchParams;
  const campusId = params.campus;

  // Fetch data in parallel
  const [data, campuses] = await Promise.all([
    getRecidivismBreakdown(campusId),
    getCampuses(),
  ]);

  return (
    <RecidivismDrillDown
      data={data}
      campuses={campuses}
      campusId={campusId}
    />
  );
}
