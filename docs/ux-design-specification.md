# DAEPManagement UX Design Specification

_Created on 2025-11-24 by Alan_
_Generated using BMad Method - Create UX Design Workflow v1.0_

---

## Executive Summary

**Project:** DAEPManagement - DAEP (Disciplinary Alternative Education Program) management system for Texas school districts.

**Vision:** Replace manual Excel spreadsheets, paper binders, and fragmented communication with a single source of truth that administrators can trust for stakeholder presentations.

**Core Differentiator:** Banking-style CSV reconciliation that flags discrepancies between DAEP records and district SIS, enabling confident data reporting.

**Target Users:**
- **DAEP Administrators** - Manage placements, approve points, run reports, reconcile data
- **DAEP Staff/Teachers** - Enter attendance, award points (0-10), write behavior notes
- **Campus Administrators** - View home-campus students in DAEP, track progress
- **District Administrators** - System configuration, user management, PEIMS compliance

**Platform:** Web application (Next.js 14, Shadcn/ui, Tailwind CSS) with responsive design for iPad classroom use. Integrates with TrespassTracker module.

---

## 1. Discovery & Understanding

### 1.1 Core Experience Priorities

| Priority | Action | User | Why Critical |
|----------|--------|------|--------------|
| **#1** | Point entry, attendance, behaviors | Teachers | Done constantly throughout the day |
| **#1** | CSV reconciliation | Admins | Foundation of data trust - wrong kids = nothing works |
| **#2** | Intake workflow | Admins | Central office CSV → Scheduled → Today's arrivals → No-show handling |
| **#2** | Return-to-campus review | Admins | Seamless transition with notifications |
| **#3** | At-a-glance student health | Teachers | Instantly see who needs intervention (avg daily points < 85%) |

### 1.2 Desired Emotional Response

| User | Feeling | Design Implication |
|------|---------|-------------------|
| **Admin** | "It's already done" | Proactive system - reconciliation status visible on arrival |
| **Teacher** | "Natural as checking a box" | Minimal friction - tap and done, no navigation maze |
| **Everyone** | "This moves the needle" | Tool, not burden - purposeful interactions |

**Design Philosophy:** *"This software is a tool that helps manage and improve outcomes for students, not one more thing to do."*

### 1.3 Inspiration Analysis

**UX Principles Extracted from User-Loved Apps:**

| Principle | Source | Application to DAEP |
|-----------|--------|---------------------|
| Big, obvious action buttons | Amazon (Fitts's Law) | "Save Points", "Approve", "Mark Present" are unmissable |
| Simplified choices | Amazon (Hick's Law) | Clean room/period selection despite many students |
| "Continue where you left off" | Netflix | Dashboard shows pending actions, incomplete tasks |
| Role-based personalization | Netflix | Teachers see their rooms; Admins see district health |
| Contextual relevance | Instagram/Facebook | Morning shows intakes; End of day shows completion |
| Simple, clean, modern | Social media | Uncluttered interface, clear visual hierarchy |
| Purpose-driven, step-by-step | Uber | User visits with intent → guided flow → outcome delivered |
| Anticipate the question | Uber | Parent/Student portal: show the answer before they search |

### 1.4 Complexity Assessment

| Factor | Level | Notes |
|--------|-------|-------|
| User Roles | Medium | 4 distinct roles with different views |
| Primary Journeys | Medium | ~5 critical flows |
| Interaction Complexity | Low-Medium | Mostly data entry with workflow states |
| Platform | Low | Web-first with responsive iPad |
| Real-time Needs | Low | Notifications important, no live collaboration |
| Novel Patterns | Medium | Reconciliation UI is unique |

---

## 2. Design System Foundation

### 2.1 Design System Choice

**Selected:** Shadcn/ui with Tailwind CSS

**Rationale:**
- Accessibility built-in (WCAG compliant, WAI-ARIA) - critical for education compliance
- Copy-paste components - own your code, full customization control
- Tailwind CSS integration - consistent with tech stack
- Lightweight & modular - fast load times on classroom iPads
- Pre-built dashboard patterns for admin interfaces, data tables, forms

**Components from Shadcn/ui:**
- Buttons, Forms, Inputs (with validation states)
- Data Tables (sortable, filterable - for student lists)
- Cards, Dialogs, Sheets (slide-out panels)
- Tabs, Accordions (organizing information)
- Toast notifications (feedback)
- Command palette (quick search/actions)
- Calendar/Date pickers

### 2.2 Custom Components Required

**Point Entry Grid (Table-based Quick Entry)**

Roster table with up to 15 students per classroom. Quick entry modal triggered from far right column.

```
Quick Entry Modal Flow (3 taps):
1. Points: [5] [6] [7] [8] [9] [10] - tap one
2. Student Action: [On Task] [Off Task] [Helped] [Talk Back] [Great Job] [Other]
3. Teacher Action: [None] [Redirected] [Called Home] [Conference] [Note Added]
→ [Save & Next] or [More Details...] for expanded form
```

**Student Health Indicator**

Simple numeric average displayed in roster (e.g., `8.5` or `85%`).
- Below threshold (7.0) = visual emphasis (bold, accent color)
- No traffic lights - just the number, intuitively understood
- Shows: average since placement or last week

**Reconciliation Comparison View**

Side-by-side SIS vs DAEP data with discrepancy highlighting. To be designed during user journey mapping.

**Intake Status Pipeline**

Workflow stages visualization: Approved → Scheduled → Today → Active. To be designed during user journey mapping.

**Theme Picker Component**

User preference for visual theme selection in Settings → Appearance.

---

## 3. Visual Foundation

### 3.1 Color System

**Theme Strategy:** User-selectable themes with sensible default

| Setting | Value |
|---------|-------|
| Default Theme | Trustworthy Blue |
| Available Themes | 4 options (see below) |
| Preference Scope | User-level (each user chooses) |
| Future Expansion | District-level branding, custom themes |

**Theme 1: Trustworthy Blue (Default)**
- Primary: `#3B82F6`
- Sidebar: `#1E293B`
- Background: `#F9FAFB`
- Personality: Professional, institutional, reliable

**Theme 2: Modern Slate**
- Primary: `#0EA5E9`
- Sidebar: `#0F172A`
- Background: `#F8FAFC`
- Personality: Sophisticated, contemporary, premium

**Theme 3: Academic Green**
- Primary: `#16A34A`
- Sidebar: `#14532D`
- Background: `#F0FDF4`
- Personality: Calming, growth-focused, educational

**Theme 4: Texas Heritage**
- Primary: `#EA580C`
- Sidebar: `#292524`
- Background: `#FEFCE8`
- Personality: Warm, approachable, regional identity

**Shared Status Colors (All Themes):**
- Success: `#10B981` / `#22C55E`
- Warning: `#F59E0B` / `#EAB308`
- Danger: `#EF4444` / `#DC2626`
- Info: `#6366F1` / `#0284C7`

**Interactive Reference:** [ux-color-themes.html](./ux-color-themes.html)

### 3.2 Typography

**Font Family:** System fonts (Inter, SF Pro, Segoe UI) - fast loading, familiar

**Type Scale:**
- Page Headers: 28-32px, bold
- Section Headers: 20px, semibold
- Card Titles: 16px, semibold
- Body Text: 14px, regular
- Labels/Metadata: 12px, regular, muted color

### 3.3 Spacing System

**Base Unit:** 4px

**Scale:**
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

**Card Padding:** 16-24px
**Section Gaps:** 24-32px

---

---

## 4. Design Direction

### 4.1 Chosen Approach

**Layout:** Sidebar navigation (left) + main content area
**Density:** Balanced - clean but information-rich
**Style:** Professional institutional (matches bolt.new mockup)

**Interactive Mockups:** [ux-design-directions.html](./ux-design-directions.html)

Screens included:
- Dashboard (KPIs, action items, today's intakes)
- Room Roster (student table with quick entry)
- Intake Pipeline (kanban-style workflow)
- CSV Reconciliation (side-by-side comparison)
- Point Entry Modal (3-tap workflow)

---

## 5. User Journey Flows

### 5.1 Daily Point Entry (Teacher)

```
Teacher opens app → Sees Room Roster (their room auto-selected)
    → Sees student list with averages (at-risk highlighted)
    → Clicks [+ Entry] on student row
    → Modal opens: 3 taps (Points → Student Action → Teacher Action)
    → [Save & Next] → Modal advances to next student OR closes
    → Toast: "Points saved for Jordan"
```

**Design Decisions:**
- Room auto-selected based on current period + bell schedule
- At-risk students (avg < 7.0) have highlighted rows
- Modal has "Save & Next" to flow through roster quickly
- Default to 10 points (change only if needed)

### 5.2 CSV Reconciliation (Admin)

```
Admin uploads CSV → System parses and compares
    → Summary shown: X matched, Y discrepancies, Z new
    → Admin clicks "Review Discrepancies"
    → Side-by-side view: SIS data vs DAEP data
    → For each discrepancy:
        → [Accept SIS] / [Keep DAEP] / [Add Note]
    → Progress through all discrepancies
    → Summary: "Reconciliation complete. 5 resolved."
    → Audit log created for all decisions
```

**Design Decisions:**
- Banking-style comparison (like bank statement reconciliation)
- Previous/Next navigation through discrepancies
- Optional notes for audit trail
- Bulk "Accept All Matches" for speed

### 5.3 Intake Pipeline (Admin)

```
Central office CSV uploaded → Students appear in "Approved" column
    → Admin schedules intake → Student moves to "Scheduled"
    → Day of intake:
        → Student arrives → Mark "Arrived" → Moves to processing
        → Student no-show → Mark "No-Show" → Goes to No-Show column
    → No-shows have "Reschedule" button → Back to "Approved"
```

**Design Decisions:**
- Kanban-style pipeline (visual workflow)
- Color-coded stages
- No-shows prominently displayed with action button
- Drag-and-drop optional enhancement

### 5.4 Return to Campus (Admin)

```
Student nears completion → Notification appears
    → Admin opens student profile → Reviews placement summary
    → Clicks "Initiate Return Process"
    → Sends notification to home campus admin
    → Home campus confirms → Student status → "Transitioning"
    → Final day → Status → "Completed"
```

---

## 6. Component Library Strategy

### 6.1 From Shadcn/ui (Use As-Is)

- Button (primary, secondary, danger variants)
- Input, Select, Textarea
- Dialog/Modal
- Sheet (slide-out panels)
- Card
- Table
- Badge
- Toast notifications
- Tabs
- Avatar
- Calendar/DatePicker

### 6.2 Custom Components

**Point Entry Modal**
- 3-section layout: Points selector, Student Action buttons, Teacher Action buttons
- Point buttons: 44x44px tap targets, selected state
- Action buttons: pill-shaped, multi-select capable
- "More Details" expansion link

**Student Health Indicator**
- Numeric display in table cell (e.g., "8.5")
- Color: green (≥7.0), orange (5.0-6.9), red (<5.0)
- Font weight: bold for emphasis

**Pipeline Stage Card**
- Kanban card with student name, meta info
- Color-coded left border by status
- Action button when applicable

**Reconciliation Comparison Panel**
- Two-column layout
- Row-by-row field comparison
- Match (green text) / Mismatch (red highlight) styling

---

## 7. UX Pattern Decisions

### 7.1 Consistency Rules

| Pattern | Decision | Rationale |
|---------|----------|-----------|
| **Primary Button** | Blue filled (#3B82F6) | Most important action |
| **Secondary Button** | White with border | Alternative actions |
| **Danger Button** | Red background or text | Destructive/urgent actions |
| **Success Feedback** | Toast notification (bottom-right) | Non-blocking confirmation |
| **Error Feedback** | Inline + toast | Show where error occurred |
| **Loading State** | Skeleton placeholders | Maintain layout during load |
| **Form Validation** | On blur + on submit | Immediate but not intrusive |
| **Required Fields** | Asterisk (*) after label | Standard convention |
| **Empty States** | Illustration + message + CTA | Guide user to action |
| **Confirmations** | Modal for destructive actions | Prevent accidents |
| **Search** | Instant filter (no submit) | Immediate feedback |
| **Dates** | Relative when recent, absolute when old | "2 hours ago" vs "Nov 20, 2025" |

### 7.2 Notification Patterns

| Type | Location | Duration | Action |
|------|----------|----------|--------|
| Success | Toast (bottom-right) | 3 seconds auto-dismiss | None needed |
| Error | Toast + inline | Persist until fixed | Dismiss or fix |
| Warning | Toast | 5 seconds | Optional action |
| Info | Toast | 4 seconds | Optional action |
| System Alert | Banner (top) | Until dismissed | Acknowledge |

---

## 8. Responsive Design & Accessibility

### 8.1 Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Desktop | 1280px+ | Full sidebar + main content |
| Tablet | 768-1279px | Collapsible sidebar, adjusted grid |
| Mobile | <768px | Bottom nav or hamburger, stacked cards |

**iPad Optimization (Primary Mobile Use Case):**
- Touch targets: minimum 44x44px
- Point entry modal: full-width on tablet
- Roster table: horizontal scroll if needed
- Sidebar: collapsible with hamburger toggle

### 8.2 Accessibility (WCAG 2.1 AA)

**Required for EdTech/Government:**
- Color contrast: 4.5:1 minimum for text
- Focus indicators: visible outline on all interactive elements
- Keyboard navigation: Tab through all actions
- Screen reader: ARIA labels on icons, buttons
- Form labels: Associated with inputs
- Error messages: Descriptive, not just "Error"
- Touch targets: 44x44px minimum

**Testing:**
- Lighthouse accessibility audit
- Keyboard-only navigation test
- Color blindness simulation (status colors work without color alone)

---

## 9. Implementation Guidance

### 9.1 Summary

**What We Created:**

| Deliverable | Description |
|-------------|-------------|
| Design System | Shadcn/ui + 4 custom components |
| Color Themes | 4 themes with user-selectable picker (default: Trustworthy Blue) |
| Typography | System fonts, 5-level type scale |
| Design Direction | Sidebar nav, balanced density, professional aesthetic |
| User Journeys | 4 critical flows designed (point entry, reconciliation, intake, return) |
| UX Patterns | 12 consistency rules documented |
| Responsive | 3 breakpoints, iPad-optimized |
| Accessibility | WCAG 2.1 AA compliance requirements |

**Interactive Deliverables:**
- [Color Theme Explorer](./ux-color-themes.html)
- [Design Direction Mockups](./ux-design-directions.html)

### 9.2 Next Steps

1. **Architecture Workflow** - Define technical decisions to support these UX patterns
2. **Epic Breakdown** - Create stories based on user journeys
3. **Implementation** - Build with Shadcn/ui following this spec

---

## Appendix

### Related Documents

- Product Requirements: `docs/prd.md`
- Product Brief: `docs/product-brief-DAEPManagement-2025-11-24.md`
- UI Mockup Analysis: `docs/daep-ui-mockup-analysis.md`

### Interactive Deliverables

- **Color Theme Visualizer:** [ux-color-themes.html](./ux-color-themes.html)
- **Design Direction Mockups:** [ux-design-directions.html](./ux-design-directions.html)

### Version History

| Date       | Version | Changes                          | Author |
|------------|---------|----------------------------------|--------|
| 2025-11-24 | 1.0     | Initial UX Design Specification  | Alan   |

---

_This UX Design Specification was created through collaborative design facilitation. All decisions were made with user input and documented with rationale._
