# Behavior Documentation Unification Plan - FINAL

**Created:** 2025-12-10
**Version:** 3.0 (Final before implementation)
**Status:** Approved for implementation

---

## Executive Summary

Unify the behavior/activity documentation system across DAEP with consistent UX patterns:
- **Tabbed sub-views** in roster inline panel (Activity, Attendance, Behavior)
- **Manila folder tab styling** across the app
- **Collapsible cards** on student profile with animated expand/collapse
- **Condensed single-line format** for all activity displays
- **Exportable timeline** with WYSIWYG preview modal

---

## User Decisions (Confirmed)

| Question | Decision |
|----------|----------|
| Priority order | Yes, the proposed order makes sense |
| Roster tabs location | Above the entry form (like profile tabs) |
| Full timeline modal | **NO** - Instead, collapsible cards on profile with "View All" expanding inline |
| Manila folder tabs | **Mock-up first** before implementing |
| Story 4-4 first? | Need reminder of what 4-4 is to decide |

---

## Story 4-4 Reminder

**Story 4-4: Attach Notes to Incidents** was about:
- Making `placement_id` nullable in behavior notes (for notes without active placement)
- Adding `student_school_id` column for fallback
- Adding "Incident" column to behavior notes table
- Showing placement context in note detail sheet
- Handling "no active placement" case when adding notes

**Current Status:** Core implementation complete (DB migration, schemas, server actions, UI columns). Testing was interrupted by this planning discussion.

---

## Student Profile Page - Collapsible Card Vision

### Current State
- Current Placement Card is always fully expanded
- Takes up significant vertical space
- User must scroll to see tabs below

### New Vision (User's Idea)

```
┌─────────────────────────────────────────────────────────────────┐
│ Current Placement                    [Pending] [Edit] [▼]       │
│ Days: 0/30 served | 30 remaining                                │
│ (Condensed view - just highlights, card collapsed)              │
└─────────────────────────────────────────────────────────────────┘

     ↓ Click chevron to expand ↓

┌─────────────────────────────────────────────────────────────────┐
│ Current Placement                    [Pending] [Edit] [▲]       │
├─────────────────────────────────────────────────────────────────┤
│ Progress: 0/30 days served                         30 remaining │
│ ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% complete  │
│                                                                 │
│ Attendance: Overall 67%                                         │
│ ████████████████████░░░░░░░░░░░░ 2/3 periods present            │
│                                                                 │
│ Offense: 22                                                     │
│ Home Campus: South Middle School    Assigned Room: 501 (Beakley)│
│ Start Date: Nov 30, 2025            Expected End: Jan 16, 2026  │
│ Incident #: 45258749                                            │
│ [Rollover Student]                                              │
│ INTAKE NOTES: Intake notes again                                │
│                                                                 │
│ [Activate Placement] [Mark No-Show]                             │
│                                                                 │
│ Recent Activity (3)                              [View All →]   │
│ + Adjustment approved (-5 pts)                          7h ago  │
│ ⓘ attendance bulk marked                               11h ago  │
│ + Base points added                                    11h ago  │
└─────────────────────────────────────────────────────────────────┘
```

### Tab Behavior with Collapsible Cards

```
Default state: Current Placement card collapsed, tabs visible below

┌─ Current Placement (collapsed) ──────────────────── [▼] ────────┐
│ Days: 0/30 | Pending | Incident #45258749                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ Placement Hist. │ ← Active tab (white bg, overlaps)
└─────────────────┴────────────────┬────────────────┬─────────────┐
                   │ Separations    │Activity Timeline│ Audit Log  │
                   └────────────────┴────────────────┴─────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ (Tab content here - condensed format)                           │
│                                                                 │
│ Incident #    Start Date    Days    Offense    Status    Outcome│
│ 45258749     Nov 30, 2025   0/30      21      Pending   Rollover│
└─────────────────────────────────────────────────────────────────┘
```

### "View All" Behavior

When user clicks "View All" on Activity Timeline:
1. **All other cards/sections collapse** with smooth animation
2. **Activity Timeline expands** to show full content
3. **Export button appears** in expanded view
4. Content slides up as other sections collapse

```
┌─ Current Placement (auto-collapsed) ─────────────── [▼] ────────┐
│ Days: 0/30 | Pending | Incident #45258749                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐ ┌────────────┐ ┌─────────────────┐
│ Placement Hist. │ │ Separations│ │Activity Timeline│ ← ACTIVE
└─────────────────┘ └────────────┘ └─────────────────┴─────────────┐
┌─────────────────────────────────────────────────────────────────┐
│ Activity Timeline (EXPANDED - View All mode)      [Export ▼]    │
├─────────────────────────────────────────────────────────────────┤
│ Filter: [All ▼] [Points] [Attendance] [Behavior]                │
├─────────────────────────────────────────────────────────────────┤
│ Dec 10, 2025                                                    │
│   -5 | Off Task | Period 6 | 1:35 PM (Wallace)                  │
│   +5 | On Task  | Period 1 | 4:46 AM (Wallace)                  │
│   ✓  | Present  | All periods                                   │
│                                                                 │
│ Dec 9, 2025                                                     │
│   +3 | Helpful  | Period 4 | 11:20 AM (Smith)                   │
│   ✓  | Present  | Early dismissal P6                            │
│                                                                 │
│ (continues with all activity...)                                │
└─────────────────────────────────────────────────────────────────┘
```

### Export Modal (WYSIWYG Preview)

When user clicks "Export":

```
┌─────────────────────────────────────────────────────────────────┐
│ Export Activity Report                    [Copy Link] [Export ▼]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ STUDENT ACTIVITY REPORT                                   │  │
│  │                                                           │  │
│  │ Student: Sara Smiley (7654321)                            │  │
│  │ Home Campus: South Middle School                          │  │
│  │ Report Date: December 10, 2025                            │  │
│  │                                                           │  │
│  │ Placement: #45258749 | 0/30 days | Pending                │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Date       Period  Points  Action      Staff    Time      │  │
│  │ Dec 10     P6      -5      Off Task    Wallace  1:35 PM   │  │
│  │ Dec 10     P1      +5      On Task     Wallace  4:46 AM   │  │
│  │ Dec 9      P4      +3      Helpful     Smith    11:20 AM  │  │
│  │ ...                                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  (This is exactly what the PDF will look like)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Export dropdown options:
- PDF
- Excel
- Copy Link (for authenticated users)
```

---

## Roster Inline Panel - Tabbed Views

### Current State
```
┌─────────────────────────────────────────────────────────────────┐
│ Left side: Entry form          │ Right side: Recent Activity    │
│ Points, Student Action, etc.   │ (condensed list)               │
│                                │                      View All → │
└─────────────────────────────────────────────────────────────────┘
```

### New Vision
```
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│ │ Activity │ │Attendance│ │ Behavior │  ← Tabs ABOVE entry form │
│ └──────────┘ └──────────┘ └──────────┘    (like profile tabs)   │
├─────────────────────────────────────────────────────────────────┤
│ Left side: Entry form          │ Right side: Tab content        │
│ Points, Student Action, etc.   │ (changes based on active tab)  │
│                                │                                │
│ [Save Entry]                   │ Behavior tab (DEFAULT):        │
│                                │ 📋 Off Task | Dec 10 (Wallace) │
│                                │ 📋 Sleeping | Dec 9 (Smith)    │
│                                │                     View All → │
└─────────────────────────────────────────────────────────────────┘
```

### Tab Content

**Activity Tab:** All activity (points + behavior + attendance) in condensed format

**Attendance Tab:** Final state per day only
```
Dec 10 - Present (all periods)
Dec 9  - Present (early dismissal P6)
Dec 8  - Absent (unexcused)
```
(NOT every period change, just daily summary)

**Behavior Tab (DEFAULT for teachers):**
```
📋 Off Task | Verbal warning | Dec 10, P6 (Wallace)
📋 Sleeping | Conference | Dec 9, P3 (Smith)
📋 On Task  | Positive | Dec 8, P1 (Wallace)
```
Teachers care about: "Is this an ongoing issue or something new?"

---

## Manila Folder Tab Styling

### Current Tab Style (Button-like)
```
┌──────────────────┐ ┌────────────┐ ┌─────────────────┐ ┌───────────┐
│ Placement History│ │ Separations│ │ Activity Timeline│ │ Audit Log │
└──────────────────┘ └────────────┘ └─────────────────┘ └───────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Desired Tab Style (Manila Folders)
```
         ╭──────────────────╮
         │ Placement History│  ← Active: white bg, extends down
─────────╯                  ╰─────╮────────────╮─────────────────╮───
                                  │ Separations│ Activity Timeline│...
                                  ╰────────────╯─────────────────╯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│ Tab content area (white background, connected to active tab)    │
```

**Key Characteristics:**
- Active tab has white background
- Active tab visually "overlaps" the content area below
- Inactive tabs have muted/gray background
- Inactive tabs appear "behind" the active tab
- Smooth transition when switching tabs

**User Request:** Create mock-up component first before implementing on profile page.

---

## Implementation Stories (Updated)

### Priority Order

| # | Story | Points | Description |
|---|-------|--------|-------------|
| 0 | **Bug Fix** | — | Verify behavior notes admin page works after 4-4 changes |
| 1 | **4-A** | 2 | Manila Folder Tab Component (mock-up first) |
| 2 | **4-B** | 3 | Roster Inline Panel Tabs (Activity, Attendance, Behavior) |
| 3 | **4-C** | 3 | Student Profile Collapsible Cards (animated expand/collapse) |
| 4 | **4-D** | 3 | Condensed Activity Timeline (replace card format) |
| 5 | **4-E** | 2 | View All Expansion + Export Modal (WYSIWYG) |
| 6 | **4-F** | 2 | Slim Profile Header (reduce bulk) |
| 7 | **4-G** | 2 | Add Note from Profile (placement selector) |
| 8 | **4-H** | 2 | Inline Demographics Edit |
| 9 | **4-I** | 3 | Student List Page - Room Format (copy room roster layout to /students) |

**Total: ~22 points across 9 stories**

---

## Story Details

### Story 4-A: Manila Folder Tab Component (2 pts)

**Goal:** Create reusable tab component with manila folder styling

**Tasks:**
1. Create `ManilaFolderTabs` component
2. Props: tabs array, activeTab, onTabChange
3. Styling: active tab white + overlap effect, inactive muted
4. Smooth transition animations
5. Create standalone demo page for review before integration

**Acceptance Criteria:**
- [ ] Mock-up page at `/dev/manila-tabs` for review
- [ ] Active tab visually overlaps content area
- [ ] Inactive tabs appear "behind" active
- [ ] Smooth transition on tab change
- [ ] Works with 2-6 tabs
- [ ] Responsive on mobile

---

### Story 4-B: Roster Inline Panel Tabs (3 pts)

**Goal:** Add tabbed sub-views to roster chevron dropdown

**Tasks:**
1. Add tabs above entry form: Activity | Attendance | Behavior
2. Default to Behavior tab
3. Right side content changes based on active tab
4. Activity: all activity condensed
5. Attendance: final state per day only
6. Behavior: behavior notes condensed
7. View All → goes to student profile

**Acceptance Criteria:**
- [ ] Three tabs visible above entry form
- [ ] Behavior tab is default
- [ ] Tab content switches correctly
- [ ] Attendance shows daily summary only
- [ ] View All navigates to student profile
- [ ] Uses ManilaFolderTabs component

---

### Story 4-C: Student Profile Collapsible Cards (3 pts)

**Goal:** Make cards collapsible with animated expand/collapse

**Tasks:**
1. Add collapse/expand chevron to Current Placement card header
2. Collapsed state shows: Days served/remaining, Status, Incident #
3. Smooth slide animation on expand/collapse
4. State persists during session
5. Cards start collapsed by default

**Acceptance Criteria:**
- [ ] Chevron button on card header
- [ ] Collapsed view shows key highlights only
- [ ] Smooth animation (slide down/up)
- [ ] Content hidden when collapsed
- [ ] Clicking chevron toggles state

---

### Story 4-D: Condensed Activity Timeline (3 pts)

**Goal:** Replace card format with condensed single-line format

**Tasks:**
1. Replace `StudentPointsLog` card format
2. Use same condensed format as roster inline panel
3. Add filter tabs: All | Points | Attendance | Behavior
4. Group by date
5. Single line per entry with icon + points + action + timestamp

**Acceptance Criteria:**
- [ ] Condensed single-line format
- [ ] Filter tabs work correctly
- [ ] Grouped by date with date headers
- [ ] Matches roster inline panel styling
- [ ] Scrollable for long lists

---

### Story 4-E: View All Expansion + Export Modal (2 pts)

**Goal:** View All expands inline, collapses other sections, adds export

**Tasks:**
1. View All button expands Activity Timeline to full content
2. Other sections auto-collapse when View All clicked
3. Smooth animation for collapse/expand
4. Add Export button in expanded view
5. Export modal shows WYSIWYG preview
6. Export options: PDF, Excel, Copy Link

**Acceptance Criteria:**
- [ ] View All expands timeline inline
- [ ] Other sections collapse automatically
- [ ] Export button appears in expanded view
- [ ] Modal shows preview matching export format
- [ ] PDF export works
- [ ] Copy Link generates shareable URL (authenticated users only)

---

### Story 4-F: Slim Profile Header (2 pts)

**Goal:** Reduce header bulk, slide content up

**Tasks:**
1. Reduce padding/margins in header
2. Evaluate DAEP badge necessity (they're in DAEP manager)
3. Consider color ring around avatar instead of badge
4. Ensure Back, Edit Placement, Add Note buttons remain accessible

**Acceptance Criteria:**
- [ ] Header takes less vertical space
- [ ] All buttons still accessible
- [ ] Student info still readable
- [ ] Content area moves up

---

### Story 4-G: Add Note from Profile (2 pts)

**Goal:** Add Note button opens inline form with placement selector

**Tasks:**
1. Add Note button opens inline form (not modal)
2. Dropdown: Current placement | Previous placements | Student only
3. Form matches roster inline entry styling
4. Handles no active placement case
5. Success refreshes activity timeline

**Acceptance Criteria:**
- [ ] Add Note opens inline form
- [ ] Placement selector dropdown works
- [ ] Can select "Student only" for notes without placement
- [ ] Form submits successfully
- [ ] Activity timeline refreshes

---

### Story 4-H: Inline Demographics Edit (2 pts)

**Goal:** Edit demographics in-place without navigation

**Tasks:**
1. Edit button on Demographics card
2. Fields become editable in-place
3. Save/Cancel buttons appear
4. Update campus, guardian info, etc.
5. Validation and error handling

**Acceptance Criteria:**
- [ ] Edit button toggles edit mode
- [ ] Fields are editable in-place
- [ ] Save persists changes
- [ ] Cancel reverts changes
- [ ] Validation errors shown inline

---

### Story 4-I: Student List Page - Room Format (3 pts)

**Goal:** Copy room roster layout to /daep/students page for all students

**Context:** The room roster page (`/daep/rooms/[roomId]`) has a great layout with:
- Student rows with chevron expansion
- Inline entry form for points/notes
- Recent activity panel
- Condensed format

The main students list page (`/daep/students`) should use the same format, but:
- Shows ALL students (not just one room)
- Removes room column (not needed here)
- Allows searching/filtering across all students
- Enables admins to add notes at lunch without going room-by-room

**Tasks:**
1. Copy room roster table layout to students page
2. Remove room column
3. Add chevron expansion with inline entry form
4. Add recent activity panel in expansion
5. Keep existing search/filter functionality
6. Ensure works for admins at lunch (quick access to any student)

**Acceptance Criteria:**
- [ ] Student list uses room roster table format
- [ ] Chevron expansion works on each row
- [ ] Inline entry form appears on expansion
- [ ] Recent activity shows in expansion
- [ ] Search/filter works across all students
- [ ] No room column displayed
- [ ] Can add notes without navigating to profile

---

## Technical Notes

### Animation Library
Use Framer Motion or CSS transitions for smooth collapse/expand animations.

### Collapsible Card Pattern
```tsx
interface CollapsibleCardProps {
  title: string;
  summary: React.ReactNode; // Shown when collapsed
  children: React.ReactNode; // Full content when expanded
  defaultExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}
```

### Manila Folder Tab Pattern
```tsx
interface ManilaFolderTabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode; // Tab content
}
```

### Export Service
```typescript
interface ExportOptions {
  format: 'pdf' | 'excel';
  studentId: string;
  placementId?: string;
  dateRange?: { from: string; to: string };
  activityTypes?: ('points' | 'attendance' | 'behavior')[];
}

async function exportActivityReport(options: ExportOptions): Promise<Blob>
```

---

## File Changes Summary

| File | Action | Story |
|------|--------|-------|
| `components/ui/manila-folder-tabs.tsx` | Create | 4-A |
| `components/daep/roster/TabbedActivityPanel.tsx` | Create | 4-B |
| `components/daep/roster/InlineStudentPanel.tsx` | Modify | 4-B |
| `components/ui/collapsible-card.tsx` | Create | 4-C |
| `components/daep/CurrentPlacementCard.tsx` | Modify | 4-C |
| `components/daep/StudentActivityTimeline.tsx` | Create | 4-D |
| `components/daep/StudentPointsLog.tsx` | Replace | 4-D |
| `components/daep/ExportActivityModal.tsx` | Create | 4-E |
| `components/daep/StudentProfileHeader.tsx` | Modify | 4-F |
| `components/daep/ProfileNoteEntry.tsx` | Create | 4-G |
| `components/daep/StudentDemographicsCard.tsx` | Modify | 4-H |

---

## Next Steps

1. **Decision needed:** Complete Story 4-4 first, or start fresh with this plan?
2. **First task:** Create Manila Folder Tab mock-up for user review
3. **Second task:** Implement collapsible card component
4. **Ongoing:** Check if behavior notes admin page has bug from 4-4

---

## Appendix: Story 4-4 Status

**What was Story 4-4:**
- Make `placement_id` nullable (allow notes without active placement)
- Add `student_school_id` column for fallback
- Add "Incident" column to behavior notes table
- Show placement context in note detail sheet

**What's Done:**
- ✅ Database migration applied
- ✅ Validation schemas updated
- ✅ Server actions updated (createBehaviorNote, getBehaviorNotesList, getBehaviorNoteById, getNotesForPlacement, exportBehaviorNotesToCSV)
- ✅ Incident column added to BehaviorNotesTable
- ✅ Placement context added to BehaviorNoteDetailSheet

**What's Left:**
- ⏸️ Testing with Playwright (paused for this planning)
- ❓ Verify behavior notes admin page works (user reported notes not showing)

---

_Plan Version: 3.0 FINAL_
_Author: Claude_
_Date: 2025-12-10_
_Status: Ready for implementation after user confirms Story 4-4 decision_
