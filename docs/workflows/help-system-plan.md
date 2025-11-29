# Help System & Training Documentation Plan

**Purpose:** In-app help system with contextual documentation, tours, and training videos.
**Status:** Planning
**Last Updated:** 2025-11-29

---

## Vision

Users should get help without leaving the app. When they click a help icon or "?" button:
- Help content appears in a modal (not a new page)
- Content is context-aware (knows what page/component they're viewing)
- Tours walk them through features step-by-step
- Short videos explain workflows visually

**Design Inspiration:** CloseBot's help dropdown, Userpilot-style tooltips, Canny's changelog with screenshots.

---

## Phase 1: Foundation (MVP)

### Route Structure

```
/help                     ← Main help hub
/help/getting-started     ← Role-based onboarding
/help/[topic]             ← Individual help articles
```

### Help Hub (`/help`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Help & Documentation                                    [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Getting Started                                                │
│  ├── For DAEP Staff                                            │
│  ├── For Campus Admins                                         │
│  ├── For District Admins                                       │
│  └── For Students & Parents                                    │
│                                                                 │
│  Features                                                       │
│  ├── Student Profiles                                          │
│  ├── Placements & Assignments                                  │
│  ├── Attendance & Points                                       │
│  ├── Rooms                                                      │
│  └── Reports                                                    │
│                                                                 │
│  Common Tasks                                                   │
│  ├── Process a new intake                                      │
│  ├── Record daily attendance                                   │
│  ├── Prepare for a review meeting                              │
│  └── Export data for reports                                   │
│                                                                 │
│  Troubleshooting                                                │
│  ├── Can't find a student?                                     │
│  ├── Points not calculating correctly?                         │
│  └── Report not showing expected data?                         │
│                                                                 │
│  [Search help articles...]                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Access Points

| Location | Trigger | Behavior |
|----------|---------|----------|
| Left sidebar (bottom) | "Help" nav item | Opens /help in modal |
| Top header | "?" icon | Opens context-aware help modal |
| Settings dropdown | "Help & Support" | Opens /help in modal |

### Context-Aware Help

When user clicks "?" from a specific page, the modal pre-loads relevant content:

| Current Page | Default Help Topic |
|--------------|-------------------|
| `/daep/students` | Student list & filtering |
| `/daep/students/[id]` | Student profile overview |
| `/daep/students/[id]/placement` | Placement management |
| `/daep/settings/rooms` | Room configuration |
| `/daep/settings/calendar` | School calendar setup |

---

## Phase 2: In-App Tours

### Tour System

Use a library like:
- **React Joyride** (free, open source)
- **Intro.js** (free for personal use)
- **Userpilot** (paid, more features)

### Tour Trigger

```
Help Dropdown:
├── Help Articles
├── Tour This Page    ← Starts page-specific tour
├── Video Tutorials
└── Contact Support
```

### Tours by Role

Each role sees different tour content based on what they can do:

**DAEP Staff Tour:**
1. Dashboard overview — "Here's your daily snapshot"
2. Student list — "Find and filter students"
3. Student profile — "Everything about a student in one place"
4. Quick notes — "Record observations without leaving the page"
5. Rooms — "See who's in each room today"

**Campus Admin Tour:**
1. Dashboard — "Your campus at a glance"
2. Student search — "Find any student quickly"
3. Profile view — "What you can see (view-only for most fields)"
4. Reports — "Export data for your campus"

**District Admin Tour:**
1. All staff features, plus:
2. Settings — "Configure rooms, schedules, and calendars"
3. User management — "Invite and manage staff access"
4. Cross-campus reports — "District-wide analytics"

**Student/Parent Tour:**
1. Dashboard — "Your placement status at a glance"
2. Progress — "How you're tracking toward completion"
3. Notifications — "How we'll keep you informed"

### Tours by Page

Each page can have its own tour highlighting specific elements:

**Student Profile Page Tour:**
```javascript
const studentProfileTour = [
  {
    target: '.profile-header',
    content: 'Student photo, name, and current status',
    placement: 'bottom'
  },
  {
    target: '.demographics-card',
    content: 'Contact info and home campus details',
    placement: 'right'
  },
  {
    target: '.placement-card',
    content: 'Current placement with days remaining',
    placement: 'left'
  },
  {
    target: '.trespass-status',
    content: 'Active trespass alerts from TrespassTracker',
    placement: 'bottom'
  }
];
```

---

## Phase 3: Video Tutorials

### Video Structure (per feature)

Each help article can include a short video:

```markdown
## Room Configuration

Room configuration allows you to define the physical spaces in your DAEP facility.

**Video: Room Setup Walkthrough** (1:32)
[Embedded video player]

### Overview
Rooms represent the physical classrooms or areas where students are assigned...

### How to Add a Room
1. Navigate to Settings → Rooms
2. Click "Add Room"
3. Enter room details...

### Common Issues
- **Room not appearing?** Make sure it's marked as Active...
```

### Video Content Plan

| Feature | Video Title | Length | Content |
|---------|-------------|--------|---------|
| Overview | Platform Tour | 2:00 | High-level walkthrough for new users |
| Intake | Processing New Students | 1:30 | CSV import → scheduling → arrival |
| Attendance | Daily Attendance Entry | 1:00 | Room-by-room attendance flow |
| Points | Understanding Points | 1:30 | How points work, daily max, threshold |
| Reviews | Review Meeting Prep | 1:30 | Finding ready students, one-page view |
| Reports | Generating Reports | 1:00 | Standard reports, exports |

### Video Hosting Options

| Option | Pros | Cons |
|--------|------|------|
| **YouTube (unlisted)** | Free, reliable, analytics | Requires account, ads possible |
| **Loom** | Easy recording, embed code | Free tier limits |
| **Supabase Storage** | Self-hosted, no third party | Bandwidth costs, no analytics |
| **Cloudflare Stream** | Fast, analytics, reasonable cost | Requires setup |

**Recommendation:** Start with Loom for quick recordings, migrate to Cloudflare Stream when scaling.

---

## Help Article Template

Each help article follows this structure:

```markdown
---
title: Student Profiles
description: View and manage student information, placements, and history
roles: [daep_staff, daep_admin_l1, daep_admin_l2, campus_admin, district_admin]
page_context: /daep/students/[id]
video: student-profile-overview.mp4
last_updated: 2025-11-29
---

# Student Profiles

Student profiles provide a comprehensive view of a student's DAEP placement,
including their progress, attendance, and history.

## Video Overview

[1:30 video embed]

## What You'll See

### Profile Header
The header shows the student's photo, name, grade, and current placement status.
Status badges indicate:
- **Active** (green) — Currently in DAEP
- **Review Ready** (blue) — Approaching review threshold
- **At Risk** (yellow) — Below attendance or points threshold

### Demographics Card
Contact information pulled from the student information system...

[continue with sections]

## Common Tasks

### Update Parent Contact Info
1. Click the edit icon on the Demographics card
2. Update the phone or email field
3. Click Save

### View Placement History
1. Scroll to the Placement History section
2. Click any previous placement to expand details

## Troubleshooting

**Q: Why can't I edit certain fields?**
A: Some fields are synced from Focus SIS and can only be edited there.

**Q: Student shows wrong campus?**
A: Campus is determined by the student's home school in Focus. Contact your
registrar to update.

---

*Last updated: November 29, 2025*
```

---

## Technical Implementation

### Component Structure

```
components/
├── help/
│   ├── HelpModal.tsx           ← Main modal container
│   ├── HelpArticle.tsx         ← Article renderer
│   ├── HelpSearch.tsx          ← Search within help
│   ├── HelpTour.tsx            ← Tour wrapper (Joyride)
│   ├── HelpVideo.tsx           ← Video player component
│   └── tours/
│       ├── dashboard-tour.ts   ← Tour steps per page
│       ├── student-profile-tour.ts
│       ├── settings-tour.ts
│       └── index.ts            ← Tour registry
```

### Help Content Storage

**Option A: MDX files in codebase**
```
content/
├── help/
│   ├── getting-started/
│   │   ├── daep-staff.mdx
│   │   ├── campus-admin.mdx
│   │   └── ...
│   ├── features/
│   │   ├── student-profiles.mdx
│   │   └── ...
│   └── troubleshooting/
│       └── ...
```

**Option B: Database (for dynamic updates)**
```sql
CREATE TABLE help_articles (
  id uuid PRIMARY KEY,
  slug text UNIQUE,
  title text,
  content text,
  roles text[],
  page_context text,
  video_url text,
  updated_at timestamp
);
```

**Recommendation:** Start with MDX files (simpler), migrate to database when you need non-developer editing.

---

## Roles & Content Mapping

| Role | Can See | Special Content |
|------|---------|-----------------|
| `student` | Own profile, progress, notifications | "How to succeed in DAEP" |
| `parent` | Child's profile, progress, contacts | "Supporting your student" |
| `daep_staff` | All students, rooms, attendance | Daily workflow guides |
| `daep_admin_l1` | Staff + settings | Configuration guides |
| `daep_admin_l2` | L1 + advanced settings | Advanced administration |
| `campus_admin` | Own campus students (view) | "Working with DAEP" |
| `district_admin` | Everything | Full admin documentation |
| `super_admin` | Everything + system docs | Technical administration |

---

## Future Considerations

### AI-Powered Help (`/support`)
- Chatbot that can answer questions from help articles
- Route to human support for complex issues
- Learn from common questions to improve docs

### Contextual Tooltips
- Hover hints on complex UI elements
- "What's this?" icons on unfamiliar terms
- Progressive disclosure for power features

### Onboarding Checklist
- Track what tours user has completed
- Suggest next steps for new users
- Gamification (badges for completing training?)

### Subdomain Migration
When ready for public docs:
- `docs.districttracker.com` — Public help center
- Same content, different presentation
- SEO-friendly for prospects researching the product

---

## Implementation Priority

### MVP (Do First)
1. `/help` route with basic article structure
2. "?" icon in header opening modal
3. Getting Started guides per role (4 articles)
4. 5-10 core feature articles

### V1.5 (After MVP)
1. Page-specific tours (React Joyride)
2. Context-aware help (knows current page)
3. Search within help

### V2 (Future)
1. Video tutorials embedded in articles
2. AI chatbot for `/support`
3. Subdomain with public docs
4. Analytics (what are people searching for?)

---

*Planning document created by Paige (Tech Writer) — 2025-11-29*
