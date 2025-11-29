# DAEP Epic & Story Breakdown

**Generated:** 2025-11-28
**Total Epics:** 7 (1a, 1b, 2, 3, 4, 5, 6, 7)
**Total Stories:** 70

---

## Epic 1a: Core Schema & Security (5 stories, 21 pts) ✅ COMPLETE

| Story | Title | Pts | Complexity | Status |
|-------|-------|-----|------------|--------|
| 1.0 | TrespassTracker Schema Update | 3 | Medium | ✅ done |
| 1.1 | DAEP Database Schema | 5 | High | ✅ done |
| 1.2 | Module Access & RLS | 5 | High | ✅ done |
| 1.3 | Add New Roles | 3 | Medium | ✅ done |
| 1.4 | Approved Teacher Flag | 5 | High | ✅ done |

**FRs:** FR3, FR4, FR4a, FR4b, FR5 + Schema foundation

---

## Epic 1b: Configuration UI (6 stories, 18 pts) ✅ COMPLETE

| Story | Title | Pts | Complexity | Status |
|-------|-------|-----|------------|--------|
| 1.5 | Room Management | 3 | Medium | ✅ done |
| 1.6 | Bell Schedule Configuration | 3 | Medium | ✅ done |
| 1.7 | Discipline Code Management | 3 | Medium | ✅ done |
| 1.8 | School Calendar Configuration | 3 | Medium | ✅ done |
| 1.9 | District/Campus DAEP Settings | 3 | Medium | ✅ done |
| 1.10 | Behavior Categories Configuration | 3 | Medium | ✅ done |

**FRs:** FR63-FR72, FR99-FR104

---

## Epic 2: Placement Management (13 stories, 38 pts) - IN PROGRESS

| Story | Title | Pts | Complexity | Status |
|-------|-------|-----|------------|--------|
| 2.1 | Student Search List View | 3 | Medium | ✅ done |
| 2.2 | Student Profile Page | 3 | Medium | drafted |
| 2.3 | Trespass Records Integration | 2 | Low | drafted |
| 2.4 | Placement Creation Form | 5 | High | in-progress |
| 2.5 | Placement Intake Process | 3 | Medium | backlog |
| 2.6 | Room Assignment + Separation | 5 | High | backlog |
| 2.7 | Days Calculation Utility | 3 | Medium | backlog |
| 2.8 | Placement Status Transitions | 3 | Medium | backlog |
| 2.9 | Transition Workflow | 3 | Medium | backlog |
| 2.10 | No-Show / Early Termination | 2 | Low | drafted |
| 2.11 | Rollover Students | 2 | Low | backlog |
| 2.12 | TrespassTracker Sync | 2 | Low | backlog |
| 2.13 | 90-Day Assessment Tracking | 2 | Low | backlog |

**FRs:** FR9-FR26, FR73-FR77

### Session Batching (Epic 2)

| Session | Stories | Pts | Status |
|---------|---------|-----|--------|
| 1 | 2.1 | 3 | ✅ Done |
| 2 | 2.2, 2.3, 2.10 | 7 | Drafted |
| 3 | 2.4, 2.5 | 8 | In Progress |
| 4 | 2.6, 2.7 | 8 | Backlog |
| 5 | 2.8, 2.9 | 6 | Backlog |
| 6 | 2.11, 2.12, 2.13 | 6 | Backlog |

---

## Epic 3: Daily Operations - Points & Attendance (12 stories, 34 pts)

| Story | Title | Pts | Complexity | Status |
|-------|-------|-----|------------|--------|
| 3.1 | Room Roster View | 3 | Medium | backlog |
| 3.2 | Point Entry Grid | 5 | High | backlog |
| 3.3 | Bulk Point Entry | 3 | Medium | backlog |
| 3.4 | Point Notes/Comments | 2 | Low | backlog |
| 3.5 | Approved Teacher Auto-Finalize | 2 | Low | backlog |
| 3.6 | Pending Approval Workflow | 5 | High | backlog |
| 3.7 | Cumulative Points & Milestones | 3 | Medium | backlog |
| 3.8 | Point Audit Trail | 2 | Low | backlog |
| 3.9 | Attendance Entry | 3 | Medium | backlog |
| 3.10 | Excused vs Unexcused Absences | 2 | Low | backlog |
| 3.11 | Attendance Rate Calculations | 2 | Low | backlog |
| 3.12 | Attendance Override with Audit | 2 | Low | backlog |

**FRs:** FR27-FR44

### Session Batching (Epic 3)

| Session | Stories | Pts | Focus |
|---------|---------|-----|-------|
| 1 | 3.1, 3.2 | 8 | Room View + Point Grid |
| 2 | 3.3, 3.4, 3.5 | 7 | Bulk Entry + Notes |
| 3 | 3.6, 3.7 | 8 | Approval Workflow |
| 4 | 3.8, 3.9 | 5 | Audit + Attendance |
| 5 | 3.10, 3.11, 3.12 | 6 | Absence Handling |

---

## Epic 4: Behavior Documentation (5 stories, 13 pts)

| Story | Title | Pts | Complexity | Status |
|-------|-------|-----|------------|--------|
| 4.1 | Quick Behavior Note Modal | 3 | Medium | backlog |
| 4.2 | Predefined Behavior Categories | 2 | Low | backlog |
| 4.3 | Behavior Notes List View | 3 | Medium | backlog |
| 4.4 | Attach Notes to Incidents | 2 | Low | backlog |
| 4.5 | Student Profile Timeline | 3 | Medium | backlog |

**FRs:** FR45-FR51

### Session Batching (Epic 4)

| Session | Stories | Pts | Focus |
|---------|---------|-----|-------|
| 1 | 4.1, 4.2 | 5 | Note Entry |
| 2 | 4.3, 4.4, 4.5 | 8 | List + Timeline |

---

## Epic 5: CSV Reconciliation (10 stories, 32 pts)

| Story | Title | Pts | Complexity | Status |
|-------|-------|-----|------------|--------|
| 5.1 | CSV Upload | 3 | Medium | backlog |
| 5.2 | Field Mapping Setup | 3 | Medium | backlog |
| 5.3 | CSV Parsing | 3 | Medium | backlog |
| 5.4 | Comparison Engine | 5 | High | backlog |
| 5.5 | Discrepancy Categorization | 2 | Low | backlog |
| 5.6 | Side-by-Side Comparison UI | 5 | High | backlog |
| 5.7 | Resolution Actions | 3 | Medium | backlog |
| 5.8 | Reconciliation Audit Trail | 2 | Low | backlog |
| 5.9 | Reconciliation Summary Report | 3 | Medium | backlog |
| 5.10 | Unresolved Discrepancy Alerts | 3 | Medium | backlog |

**FRs:** FR52-FR62
**Note:** Core differentiator feature

### Session Batching (Epic 5)

| Session | Stories | Pts | Focus |
|---------|---------|-----|-------|
| 1 | 5.1, 5.2, 5.3 | 9 | Upload + Parse |
| 2 | 5.4, 5.5 | 7 | Comparison Engine |
| 3 | 5.6, 5.7 | 8 | UI + Resolution |
| 4 | 5.8, 5.9, 5.10 | 8 | Audit + Alerts |

---

## Epic 6: Dashboard & Reporting (12 stories, 34 pts)

| Story | Title | Pts | Complexity | Status |
|-------|-------|-----|------------|--------|
| 6.1 | Dashboard Page with KPI Cards | 3 | Medium | backlog |
| 6.2 | Clickable KPIs with Drill-Down | 3 | Medium | backlog |
| 6.3 | Attendance Reports | 3 | Medium | backlog |
| 6.4 | Discipline Reports | 3 | Medium | backlog |
| 6.5 | Point Progress Reports | 3 | Medium | backlog |
| 6.6 | Placement Length Reports | 2 | Low | backlog |
| 6.7 | PDF/Excel Export | 3 | Medium | backlog |
| 6.8 | Recidivism Tracking and KPI | 3 | Medium | backlog |
| 6.9 | 90-Day Assessment Tracking | 3 | Medium | backlog |
| 6.10 | 120-Day Status Review Tracking | 2 | Low | backlog |
| 6.11 | PEIMS Submission 3 Export | 3 | Medium | backlog |
| 6.12 | Audit Reports | 3 | Medium | backlog |

**FRs:** FR78-FR92, FR108

### Session Batching (Epic 6)

| Session | Stories | Pts | Focus |
|---------|---------|-----|-------|
| 1 | 6.1, 6.2 | 6 | Dashboard + Drill-down |
| 2 | 6.3, 6.4, 6.5 | 9 | Core Reports |
| 3 | 6.6, 6.7, 6.8 | 8 | Export + Recidivism |
| 4 | 6.9, 6.10, 6.11, 6.12 | 11 | Compliance + Audit |

---

## Epic 7: Notifications & Alerts (8 stories, 21 pts)

| Story | Title | Pts | Complexity | Status |
|-------|-------|-----|------------|--------|
| 7.1 | Notification Bell Icon | 3 | Medium | backlog |
| 7.2 | Notification Management | 2 | Low | backlog |
| 7.3 | Notification Preferences | 3 | Medium | backlog |
| 7.4 | Email Infrastructure | 3 | Medium | backlog |
| 7.5 | Point Approval Notifications | 3 | Medium | backlog |
| 7.6 | Compliance Deadline Alerts | 3 | Medium | backlog |
| 7.7 | Point Milestone Notifications | 2 | Low | backlog |
| 7.8 | Email Template Customization | 2 | Low | backlog |

**FRs:** FR93-FR98, FR102-FR103
**Decision Required:** Confirm email provider before Story 7.4

### Session Batching (Epic 7)

| Session | Stories | Pts | Focus |
|---------|---------|-----|-------|
| 1 | 7.1, 7.2, 7.3 | 8 | Bell + Preferences |
| 2 | 7.4, 7.5 | 6 | Email + Approvals |
| 3 | 7.6, 7.7, 7.8 | 7 | Alerts + Templates |

---

## Summary by Epic

| Epic | Stories | Points | Status |
|------|---------|--------|--------|
| 1a | 5 | 21 | ✅ Complete |
| 1b | 6 | 18 | ✅ Complete |
| 2 | 13 | 38 | In Progress (1 done, 3 drafted) |
| 3 | 12 | 34 | Backlog |
| 4 | 5 | 13 | Backlog |
| 5 | 10 | 32 | Backlog |
| 6 | 12 | 34 | Backlog |
| 7 | 8 | 21 | Backlog |
| **Total** | **71** | **211** | |

---

## Recommended Implementation Order

1. **Epic 1a** ✅ - Foundation (schema, roles)
2. **Epic 1b** ✅ - Configuration UI
3. **Epic 2** 🔄 - Placements (core data)
4. **Epic 3** - Daily Operations (daily workflow)
5. **Epic 5** - CSV Reconciliation (core differentiator)
6. **Epic 4** - Behavior (can parallel Epic 5)
7. **Epic 6** - Reporting (needs data from 2-5)
8. **Epic 7** - Notifications (enhancement layer)

---

## Complexity Legend

| Complexity | Points | Criteria |
|------------|--------|----------|
| Low | 2 | Simple CRUD, utility functions, minor UI |
| Medium | 3 | Moderate UI, some business logic, standard patterns |
| High | 5 | Complex UI, significant logic, multiple integrations |

---

_Updated: 2025-11-28_
