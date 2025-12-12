'use client';

/**
 * Manila Folder Tabs Mock-up Page
 *
 * Story 4-A: Demo page for user review before integration
 *
 * Shows the ManilaFolderTabs component with:
 * - 4 example tabs with icons
 * - Different content for each tab
 * - Responsive behavior demo
 */

import { useState } from 'react';
import { ManilaFolderTabs, ManilaFolderTabPanel } from '@/components/ui/manila-folder-tabs';
import { ClipboardList, Calendar, FileText, History } from 'lucide-react';

const DEMO_TABS = [
  { id: 'activity', label: 'Activity', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'attendance', label: 'Attendance', icon: <Calendar className="w-4 h-4" /> },
  { id: 'behavior', label: 'Behavior', icon: <FileText className="w-4 h-4" /> },
  { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
];

export default function ManiliaTabsMockupPage() {
  const [activeTab, setActiveTab] = useState('activity');

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manila Folder Tabs</h1>
          <p className="text-muted-foreground mt-1">
            Story 4-A: Component mock-up for user review
          </p>
        </div>

        {/* Demo Component */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">4 Tab Example</h2>
          <ManilaFolderTabs
            tabs={DEMO_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          >
            <ManilaFolderTabPanel tabId="activity" activeTab={activeTab}>
              <div className="space-y-4">
                <h3 className="font-medium">Activity Timeline</h3>
                <p className="text-muted-foreground text-sm">
                  This tab shows the student&apos;s activity timeline including points,
                  attendance changes, and behavior notes.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm">+5 On Task - Period 1</span>
                    <span className="text-xs text-muted-foreground">Today, 8:30 AM</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm">-3 Off Task - Period 3</span>
                    <span className="text-xs text-muted-foreground">Today, 10:15 AM</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm">Attendance: Present</span>
                    <span className="text-xs text-muted-foreground">Today, 7:45 AM</span>
                  </div>
                </div>
              </div>
            </ManilaFolderTabPanel>

            <ManilaFolderTabPanel tabId="attendance" activeTab={activeTab}>
              <div className="space-y-4">
                <h3 className="font-medium">Attendance Summary</h3>
                <p className="text-muted-foreground text-sm">
                  Daily attendance records showing final state per day.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm">Dec 10 - Present (all periods)</span>
                    <span className="text-xs text-muted-foreground">100%</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm">Dec 9 - Present (early dismissal P6)</span>
                    <span className="text-xs text-muted-foreground">83%</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm">Dec 8 - Absent (unexcused)</span>
                    <span className="text-xs text-muted-foreground">0%</span>
                  </div>
                </div>
              </div>
            </ManilaFolderTabPanel>

            <ManilaFolderTabPanel tabId="behavior" activeTab={activeTab}>
              <div className="space-y-4">
                <h3 className="font-medium">Behavior Notes</h3>
                <p className="text-muted-foreground text-sm">
                  Recent behavior notes from staff members.
                </p>
                <div className="space-y-2">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">On Task</span>
                      <span className="text-xs text-muted-foreground">Wallace - Dec 10</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Student was focused and on task during the entire period.
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-destructive">Talk Back</span>
                      <span className="text-xs text-muted-foreground">Wallace - Dec 9</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Student was disruptive during lunch period.
                    </p>
                  </div>
                </div>
              </div>
            </ManilaFolderTabPanel>

            <ManilaFolderTabPanel tabId="history" activeTab={activeTab}>
              <div className="space-y-4">
                <h3 className="font-medium">Placement History</h3>
                <p className="text-muted-foreground text-sm">
                  Historical placements and transitions.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <span className="text-sm font-medium">Current Placement</span>
                      <p className="text-xs text-muted-foreground">Started Dec 1, 2024</p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <span className="text-sm font-medium">Previous Placement</span>
                      <p className="text-xs text-muted-foreground">Sep 15 - Oct 30, 2024</p>
                    </div>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">Completed</span>
                  </div>
                </div>
              </div>
            </ManilaFolderTabPanel>
          </ManilaFolderTabs>
        </div>

        {/* Feature Checklist */}
        <div className="border rounded-lg p-4 bg-card">
          <h2 className="text-lg font-semibold mb-4">Acceptance Criteria</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <input type="checkbox" readOnly checked className="rounded" />
              <span>AC 4.A.1: Mock-up page at /dev/manila-tabs</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" readOnly className="rounded" />
              <span>AC 4.A.2: Active tab has white/card background, overlaps content</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" readOnly className="rounded" />
              <span>AC 4.A.3: Inactive tabs have muted background</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" readOnly className="rounded" />
              <span>AC 4.A.4: Smooth transition animation on tab change</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" readOnly className="rounded" />
              <span>AC 4.A.5: Works with 2-6 tabs (showing 4)</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" readOnly className="rounded" />
              <span>AC 4.A.6: Responsive on mobile (scrolls)</span>
            </li>
            <li className="flex items-center gap-2">
              <input type="checkbox" readOnly className="rounded" />
              <span>AC 4.A.7: User approves mock-up before integration</span>
            </li>
          </ul>
        </div>

        {/* Notes */}
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Next Steps:</strong> After approval, this component will be integrated into:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Roster inline panel (Story 4-B)</li>
            <li>Student profile tabs (Story 4-C)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
