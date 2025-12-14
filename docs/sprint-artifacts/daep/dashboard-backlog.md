# Dashboard Feature Backlog

**Created:** 2024-12-13
**Epic:** 6 - Dashboard & Reporting
**Source:** Story 6-1 planning session

---

## Deferred from Story 6-1

These features were discussed during 6-1 planning and deferred to future stories.

### Story 6-2: Dashboard Drill-Downs & Campus Filter

| Feature | Description | Priority |
|---------|-------------|----------|
| Campus filter dropdown | Filter all KPIs/charts by campus in header | High |
| KPI card drill-downs | Click any KPI → filtered detail view | High |
| Recidivism drill-down | Click → list view with offense breakdown | High |
| Recidivism by campus | Toggle district vs campus breakdown | Medium |

### Story 6-3: Morning Briefing & Smart Prompts

| Feature | Description | Priority |
|---------|-------------|----------|
| "Start My Day" button | One-click morning briefing modal | Medium |
| "You Might Have Missed" | Show changes since last login | Medium |
| Predictive alerts | "2 students trending below 85%" | Medium |
| End of day checklist | "Before You Leave" section | Low |

### Story 6-4: Advanced Action Items

| Feature | Description | Priority |
|---------|-------------|----------|
| Time-aware action items | Different prompts by time of day (9am attendance warning) | High |
| Role-specific deep actions | Staff → upload grades, Admin → review record | High |
| Mark action as completed | Dismiss/complete action items | Medium |
| Action item history | View completed/dismissed actions | Low |

### Story 6-5: Student Quick Preview

| Feature | Description | Priority |
|---------|-------------|----------|
| Hover/click popover | Quick student info on any name | Medium |
| Mini progress bar | Days/points progress in popover | Medium |
| Quick actions in popover | "View Profile", "Add Note" buttons | Medium |

### Story 6-6: Year-Over-Year Comparison

| Feature | Description | Priority |
|---------|-------------|----------|
| Attendance trend YoY | Compare to same period in previous years | Medium |
| Enrollment trend YoY | Historical enrollment comparison | Low |
| Recidivism trend YoY | Track improvement over years | Medium |

### Future Enhancements (Unassigned)

| Feature | Description | Priority |
|---------|-------------|----------|
| Keyboard shortcuts | Cmd+K search, navigation shortcuts | Low |
| Dashboard settings | Toggle charts on/off in settings | Medium |
| Enrollment Flow chart | Intakes vs Completions over time | Medium |
| Days to Completion chart | Distribution histogram | Low |
| Attendance by Day heatmap | Mon-Fri pattern analysis | Low |
| Export dashboard PDF | Full dashboard snapshot export | Low |
| Digest email | Morning email with action items | Low |
| Saved filter views | Remember commonly used filters | Low |

---

## Chart Toggle Settings (Future)

Users should be able to enable/disable charts in Settings → Dashboard:

| Chart | Default |
|-------|---------|
| Attendance Trend | On |
| Discipline Overview | On |
| Enrollment Flow | Off |
| Points Trend | Off |
| Days to Completion | Off |
| Attendance by Day | Off |
| Recidivism Breakdown | On |

---

## Action Items by Role (Reference)

### L1 Admin Sees:
- No-shows needing reschedule → Click to reschedule
- Point entries awaiting approval → Click to approve
- CSV reconciliation ready → Click to review
- Student record reviews (attendance, points, grades)

### L2 Admin Sees:
- No-shows needing reschedule → Click to reschedule
- Teacher comments to review
- Student record reviews

### DAEP Staff Sees:
- Attendance not submitted warning (after 9am)
- Students ready for daily review → Click to review
- No-shows (view only, or reschedule if permitted)
- Student returning today → Click to upload grades

### Everyone Sees:
- KPI cards
- Today's intakes
- Intake pipeline counts

---

## UX Principles (from planning session)

> "Its simplicity and effectiveness should allow the user to walk away with a sense that using it was effortless."

1. **Professional appearance** - Solid, polished build
2. **Helpful UI** - Confirmations for actions without being intrusive
3. **Not overly busy** - Clean, focused layout
4. **Anticipatory** - Show what users need before they ask
5. **Role-aware** - Surface relevant info per role
6. **Time-aware** - Different prompts based on time of day
7. **Visual feedback** - Animations for actions (fade, slide)
8. **Effortless** - Minimal clicks to accomplish tasks

---

## References

- Story 6-1: Dashboard Page with KPI Cards
- User mockups: Dashboard designs (Dec 13, 2024)
- Kanban mockup: Intake Pipeline board design
