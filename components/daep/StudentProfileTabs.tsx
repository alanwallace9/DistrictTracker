'use client';

/**
 * Student Profile Tabs Component
 *
 * Story 4-C: Manila folder tabs for student profile
 *
 * Features:
 * - Manila folder tab styling
 * - Role-based tab visibility:
 *   - All users: Placement History, Activity Timeline
 *   - Staff only: Separations, Audit Log
 * - Staff roles: super_admin, district_admin, daep_admin_l1, daep_admin_l2, campus_admin, daep_staff
 */

import { useState, useMemo } from 'react';
import { ManilaFolderTabs, ManilaFolderTabPanel } from '@/components/ui/manila-folder-tabs';
import { PlacementHistoryTable } from '@/components/daep/PlacementHistoryTable';
import { StudentSeparationsTab } from '@/components/daep/StudentSeparationsTab';
import { StudentActivityTimeline } from '@/components/daep/StudentActivityTimeline';
import { StudentAuditLog } from '@/components/daep/audit';
import { History, GitBranch, Activity, FileSearch } from 'lucide-react';
import type { PlacementDetail } from '@/app/actions/daep/students';

// Staff roles that can see Separations and Audit Log
const STAFF_ROLES = [
  'super_admin',
  'district_admin',
  'daep_admin_l1',
  'daep_admin_l2',
  'campus_admin',
  'daep_staff',
];

interface Placement {
  id: string;
  incident_number: string | null;
  start_date: string;
  expected_end_date: string | null;
  status: string;
}

interface StudentProfileTabsProps {
  schoolId: string;
  studentName: string;
  homeCampus?: string;
  placementHistory: PlacementDetail[];
  placements: Placement[];
  currentUserId?: string;
  userRole?: string;
}

export function StudentProfileTabs({
  schoolId,
  studentName,
  homeCampus,
  placementHistory,
  placements,
  currentUserId,
  userRole,
}: StudentProfileTabsProps) {
  const [activeTab, setActiveTab] = useState('history');

  // Check if user is staff (can see Separations and Audit Log)
  const isStaff = userRole && STAFF_ROLES.includes(userRole);

  // Build tabs based on role
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'history', label: 'Placement History', icon: <History className="w-4 h-4" /> },
      { id: 'activity', label: 'Activity Timeline', icon: <Activity className="w-4 h-4" /> },
    ];

    // Staff-only tabs
    if (isStaff) {
      baseTabs.push(
        { id: 'separations', label: 'Separations', icon: <GitBranch className="w-4 h-4" /> },
        { id: 'audit', label: 'Audit Log', icon: <FileSearch className="w-4 h-4" /> }
      );
    }

    return baseTabs;
  }, [isStaff]);

  return (
    <ManilaFolderTabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <ManilaFolderTabPanel tabId="history" activeTab={activeTab}>
        <PlacementHistoryTable placements={placementHistory} />
      </ManilaFolderTabPanel>

      <ManilaFolderTabPanel tabId="activity" activeTab={activeTab}>
        <StudentActivityTimeline
          placements={placements}
          studentName={studentName}
          schoolId={schoolId}
          homeCampus={homeCampus}
          currentUserId={currentUserId}
          userRole={userRole}
        />
      </ManilaFolderTabPanel>

      {isStaff && (
        <ManilaFolderTabPanel tabId="separations" activeTab={activeTab}>
          <StudentSeparationsTab
            schoolId={schoolId}
            studentName={studentName}
          />
        </ManilaFolderTabPanel>
      )}

      {isStaff && (
        <ManilaFolderTabPanel tabId="audit" activeTab={activeTab}>
          <StudentAuditLog
            studentId={schoolId}
            placements={placementHistory.map((p) => ({
              id: p.id,
              incident_number: p.incident_number,
              status: p.status,
            }))}
          />
        </ManilaFolderTabPanel>
      )}
    </ManilaFolderTabs>
  );
}
