# Behavior Documentation Unification Plan v2

**Created:** 2025-12-10
**Updated:** 2025-12-10
**Context:** User feedback on v1 plan with annotated screenshots

---

## User Feedback Summary

### Key Insights from Screenshots

1. **Roster Chevron Inline Panel** - Works great, keep the condensed format
2. **Student Profile Tabs** - Want them styled more like manila folder tabs (overlapping, active has white bg)
3. **Recent Activity Preview** - Good format, but should add tabs for different activity types
4. **Activity Timeline Tab** - Should use the condensed inline format, not the card format currently there
5. **View All** - Should go to student profile (single destination) not slide-in sheet
6. **Exportable Timeline** - PDF/Excel with header showing student info, placement summary

### Specific UI Direction

**Roster Inline Panel Enhancement:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│ │ Activity │ │Attendance│ │ Behavior │  ← Manila folder tabs    │
│ └──────────┘ └──────────┘ └──────────┘                          │
├─────────────────────────────────────────────────────────────────┤
│ (Content changes based on active tab)                           │
│                                                                 │
│ Behavior tab (DEFAULT for teachers):                            │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ 📋 Off Task | Verbal warning | Dec 10, P6 (Wallace)          ││
│ │ 📋 Sleeping | Conference | Dec 9, P3 (Smith)                 ││
│ │ 📋 On Task  | Positive | Dec 8, P1 (Wallace)                 ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ Attendance tab:                                                 │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ Dec 10 - Present (all periods)                               ││
│ │ Dec 9  - Present (early dismissal P6)                        ││
│ │ Dec 8  - Absent (unexcused)                                  ││
│ └──────────────────────────────────────────────────────────────┘│
│ (Just final state per day, not every period change)            │
│                                                                 │
│                                          [View All →]           │
│ (View All goes to student profile, NOT slide-in)               │
└─────────────────────────────────────────────────────────────────┘
```

**Student Profile - Tab Styling:**
```
Current tabs (button-style):
┌──────────────────┐ ┌────────────┐ ┌─────────────────┐ ┌───────────┐
│ Placement History│ │ Separations│ │ Activity Timeline│ │ Audit Log │
└──────────────────┘ └────────────┘ └─────────────────┘ └───────────┘

Desired tabs (manila folder-style, like in screenshot):
     ┌──────────────────┐
     │ Placement History│ ← Active: white bg, overlaps content
─────┘                  └─────┬────────────┬─────────────────┬───────────┐
                              │ Separations│ Activity Timeline│ Audit Log │
                              └────────────┴─────────────────┴───────────┘
                                ↑ Inactive: muted bg, behind active
```

**Activity Timeline Content Format:**
- Should match the condensed roster inline format
- NOT the current card-based StudentPointsLog
- Each entry is a single line with icon + points + action + timestamp

**View All → Full Timeline Modal/Page:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Student Activity Report                              [Export ▼] │
├─────────────────────────────────────────────────────────────────┤
│ Student: Sara Smiley (7654321)                                  │
│ Grade: 9 | Home Campus: South Middle School                     │
│ Incident #: 45258749 | Days: 0/30 served, 30 remaining          │
│ Generated: Dec 10, 2025                                         │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌──────────┐ ┌──────────┐                         │
│ │ All       │ │Attendance│ │ Behavior │  ← Filter tabs          │
│ └───────────┘ └──────────┘ └──────────┘                         │
├─────────────────────────────────────────────────────────────────┤
│ Dec 10, 2025                                                    │
│   -5 | Off Task | Period 6 | 1:35 PM (Wallace)                  │
│   +5 | On Task  | Period 1 | 4:46 AM (Wallace)                  │
│   ✓  | Present  | All periods                                   │
│                                                                 │
│ Dec 9, 2025                                                     │
│   +3 | Helpful  | Period 4 | 11:20 AM (Smith)                   │
│   ✓  | Present  | Early dismissal P6                            │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Clarifications Requested

### Options A/B/C/D Explanation

In v1 I mentioned "Option C" without showing A/B. Here's the full comparison:

| Option | Approach | Risk | Effort |
|--------|----------|------|--------|
| **A** | Keep tables separate, create unified VIEW only | Low | 2-3 stories |
| **B** | Merge all activity into ONE table | High | Epic-level |
| **C** | Hybrid - unified display, keep entry as-is | Medium | 3-4 stories |
| **D** | (New) Your vision - tabbed views everywhere | Medium | 4-5 stories |

**Option D (Your Vision)** is what you're describing:
- Roster inline panel gets tabbed sub-views (Activity, Attendance, Behavior)
- Student profile tabs get manila-folder styling
- Activity Timeline content uses condensed format
- View All goes to exportable full timeline page/modal
- Everything consistent across the app

### "Activity Tab" Clarification

Yes, when I said "Activity tab" I meant the **Activity Timeline** tab on the student profile page. The one that currently shows `StudentPointsLog` with the card-based format.

---

## Updated Implementation Plan (Option D)

### Phase 1: Roster Inline Panel Tabs

**Story 4-A: Tabbed Activity Panel** (3 pts)
- Add manila-folder style tabs to inline panel: Activity | Attendance | Behavior
- Default to **Behavior** tab for teachers
- Keep condensed single-line format
- Attendance tab shows final state per day only (not every period change)
- View All link goes to student profile Activity Timeline tab

**UI Changes:**
- Create `TabbedActivityPanel` component
- Tab component with manila-folder styling
- Content switches based on active tab

### Phase 2: Student Profile Tab Styling + Content

**Story 4-B: Manila Folder Tab Styling** (2 pts)
- Restyle profile tabs to manila folder appearance
- Active tab: white bg, overlaps content area
- Inactive tabs: muted bg, sits behind

**Story 4-C: Condensed Activity Timeline** (3 pts)
- Replace `StudentPointsLog` card format with condensed format
- Same single-line format as roster inline panel
- Add filter tabs: All | Attendance | Behavior | Points
- Matches roster panel for consistency

### Phase 3: Full Timeline View

**Story 4-D: Exportable Full Timeline** (3 pts)
- Create `FullTimelineView` component (large modal or page)
- Header: student info, placement summary, generated date
- Filter tabs for activity types
- Grouped by date
- Export button: PDF / Excel / Copy Link
- Shareable link for home campus counselors

### Phase 4: Header Cleanup + Add Note

**Story 4-E: Slim Profile Header** (2 pts)
- Reduce header bulk (student name, ID, grade badges)
- Move or remove DAEP badge (they're in DAEP manager, it's obvious)
- Consider color ring around avatar instead
- Slide content up the page

**Story 4-F: Add Note from Profile** (2 pts)
- "Add Note" button in header opens inline form
- Dropdown: Current placement | Previous placements | Student only
- For cases like: student in treatment, info from home campus

### Phase 5: Demographics Editing

**Story 4-G: Inline Demographics Edit** (2 pts)
- Edit button makes demographics editable in-place
- Update campus, guardian info, etc.
- No navigation away from profile

---

## Current Placement Card Enhancement

From your feedback about the Current Placement Card:

**Collapsible Sections:**
- Card header with chevron to collapse/expand
- When Activity Timeline tab is active, card could collapse
- Recent Activity section could be replaced by Activity Timeline content

**Proposed Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Current Placement                        [Pending] [Edit] [▼]   │
│ (chevron to collapse whole card)                                │
├─────────────────────────────────────────────────────────────────┤
│ Progress, Attendance, Offense, Dates, Room, etc.                │
├─────────────────────────────────────────────────────────────────┤
│ Recent Activity (3)                              [View All →]   │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ + Adjustment approved (-5 pts)                      7h ago   ││
│ │ ⓘ attendance bulk marked                           11h ago   ││
│ │ + Base points added                                11h ago   ││
│ └──────────────────────────────────────────────────────────────┘│
│ (This format is already good - keep it)                         │
└─────────────────────────────────────────────────────────────────┘
```

When they click "View All" → Goes to Activity Timeline tab (scrolls down)

---

## Behavior Notes Admin Page

### Current Issue
You mentioned behavior notes aren't showing up on the admin page. Let me verify that's a bug from the Story 4-4 changes.

### Future Enhancement
Once roster inline panels and student profile are consistent:
- Admin page can use same condensed format
- Row expansion shows full note (not slide-in)
- Or: click goes to student profile timeline with note highlighted

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Default tab in roster panel? | **Behavior** (teachers care about ongoing issues) |
| Attendance tab shows what? | **Final state per day** only (Present, Absent, Tardy) |
| View All destination? | **Student profile page** (single destination) |
| Tab styling? | **Manila folder** with overlapping active tab |
| Activity Timeline format? | **Condensed single-line** like roster inline |
| Export from where? | **Full timeline modal/page** with PDF/Excel |
| Slide-in sheet? | **Replace** with full modal or inline expansion |

---

## Priority Order (Updated)

1. **Fix behavior notes admin page** (if broken from 4-4) - Bug fix
2. **Story 4-A: Tabbed Activity Panel** - Roster enhancement
3. **Story 4-B: Manila Folder Tab Styling** - Profile visual
4. **Story 4-C: Condensed Activity Timeline** - Profile content
5. **Story 4-D: Exportable Full Timeline** - View All destination
6. **Story 4-E: Slim Profile Header** - Header cleanup
7. **Story 4-F: Add Note from Profile** - Entry point
8. **Story 4-G: Inline Demographics Edit** - Edit capability

---

## Next Steps

1. Check if behavior notes admin page has a bug (you said no notes showing)
2. Verify Story 4-4 changes are working
3. Create detailed story files for Phase 1 (Tabbed Activity Panel)
4. Implement manila-folder tab component (reusable)
5. Test with Playwright

---

_Plan Version: 2.0_
_Author: Claude_
_Date: 2025-12-10_
_Based on user feedback with annotated screenshots_
