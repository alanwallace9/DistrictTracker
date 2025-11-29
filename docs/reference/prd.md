# DAEPManagement - Product Requirements Document

**Author:** Alan
**Date:** 2025-11-24
**Version:** 1.0

---

## Executive Summary

DAEPManagement is the second module for DistrictTracker.com, providing a comprehensive management system for Disciplinary Alternative Education Programs (DAEP). The platform replaces manual Excel spreadsheets, paper binders, and fragmented communication channels with a single source of truth that DAEP administrators can trust for stakeholder presentations and daily operations.

The system serves Texas school districts managing alternative education placements, addressing the critical gap where no dedicated DAEP software exists despite 75,000+ students in Texas DAEP programs annually.

### What Makes This Special

**Data Accuracy Through Reconciliation:** The core differentiator is banking-style CSV reconciliation that flags discrepancies between DAEP records and the district's Student Information System (SIS). This eliminates the "is this number right?" question that plagues current manual processes, enabling administrators to present data with confidence and catch operational gaps (like a registrar being out sick causing enrollment delays) before they become problems.

---

## Project Classification

**Technical Type:** SaaS B2B
**Domain:** EdTech (K-12 Education)
**Complexity:** Medium

This is a multi-tenant SaaS platform with role-based access control, designed for school district deployment. The EdTech domain brings specific compliance requirements (FERPA, COPPA considerations) and integration needs (SIS platforms like Skyward, PowerSchool, Focus).

### Domain Context

**Key EdTech Compliance Considerations:**
- **FERPA Compliance:** All student data must be protected per federal privacy requirements
- **Texas TEC Chapter 37:** DAEP-specific regulations including 90-day assessment requirements
- **PEIMS Reporting:** Texas state reporting for disciplinary actions (Submission 3)
- **Multi-Campus Data Isolation:** Users should only see students relevant to their role/campus

---

## Success Criteria

### Primary Success Metrics

1. **Data Trust Score:** 95%+ of administrator queries result in confident data presentation (no manual verification needed)
2. **Reconciliation Accuracy:** CSV imports flag 100% of discrepancies vs. SIS data within 24 hours
3. **Operational Gap Detection:** System catches 90%+ of process failures (unenrolled students, missing registrations) before stakeholder discovery
4. **Time Savings:** Reduce weekly administrative overhead from 10+ hours to under 2 hours
5. **Teacher Adoption:** 80%+ of DAEP staff using system daily within 30 days of deployment

### Business Metrics

1. **District Retention:** 90%+ annual renewal rate
2. **Expansion Revenue:** 40%+ of districts add TrespassTracker within 12 months
3. **Reference Customers:** 3+ districts willing to provide testimonials by end of Year 1
4. **Compliance Zero-Events:** Zero PEIMS submission failures due to DistrictTracker data

---

## Product Scope

### MVP - Minimum Viable Product

**Core Capabilities for Initial Launch:**

1. **Student & Placement Management**
   - Student profile with demographics, home campus, current placement
   - Placement lifecycle tracking (intake → active → transition → complete)
   - Days-in-placement monitoring with countdown to milestones

2. **Daily Operations**
   - Period-by-period attendance tracking (P/A/T with timestamps)
   - Point system entry (0-10 scale per period)
   - Quick behavior note entry (30-second workflow)
   - Room/roster management

3. **Data Reconciliation**
   - CSV upload from SIS (daily/weekly)
   - Discrepancy flagging with manual override capability
   - Audit trail for all reconciliation decisions

4. **TrespassTracker Integration**
   - Shared student lookup
   - Coordinated expiration dates
   - Parent contact synchronization

5. **Reporting & Compliance**
   - Real-time dashboard with KPIs
   - PEIMS Submission 3 export
   - 90-day assessment tracking alerts

6. **User & Access Management**
   - Role-based permissions (District Admin, DAEP Admin, Staff, etc.)
   - Campus-scoped data access
   - Magic link authentication

### Growth Features (Post-MVP)

1. **Parent Portal** - Read-only access for parents to view student progress
2. **Advanced Analytics** - Recidivism prediction, intervention recommendations
3. **Behavioral Agreements** - Digital signature workflow for student/parent contracts
4. **Multi-Language Support** - Spanish interface for staff and parents
5. **Mobile App** - Native iOS/Android for teachers (offline-capable)
6. **SIS Real-Time Sync** - OneRoster API bi-directional sync (vs. CSV import)

### Vision (Future)

1. **Multi-State Expansion** - California Community Day Schools, Florida Alternative Programs
2. **Predictive Intervention Engine** - ML-powered early warning for at-risk students
3. **District Benchmarking** - Anonymous cross-district comparison metrics
4. **Acquisition-Ready Architecture** - White-label capability for SIS vendor integration

---

## EdTech Domain-Specific Requirements

### Student Privacy (FERPA Compliance)

- All student PII encrypted at rest and in transit
- Access logs for every student record view
- Data retention policies aligned with district requirements
- Parent consent tracking where required
- No student data shared with third parties without explicit authorization

### Accessibility Requirements

- WCAG 2.1 AA compliance for web interface
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode option
- Mobile-responsive design for iPad use in classrooms

### Data Governance

- District owns all data; exportable at any time
- 7-year retention for discipline records (Texas requirement)
- Automated PII redaction in exports where appropriate
- Clear data deletion process upon contract termination

---

## SaaS B2B Specific Requirements

### Multi-Tenancy Architecture

**Tenant Model:** District-level isolation with campus-level data scoping

- Each school district is a separate tenant with complete data isolation
- Districts cannot see or access other districts' data under any circumstances
- Within a district, data is scoped by campus for non-admin roles
- Shared configuration (discipline codes, bell schedules) at district level
- Per-campus customization where needed (room assignments, staff)

### Permissions & Roles (RBAC Matrix)

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| **District Admin** | All campuses | Full system access, user management, configuration, all reports |
| **DAEP Admin (Level 1)** | DAEP campus | Full DAEP operations, point approval, staff management, reports |
| **DAEP Admin (Level 2)** | DAEP campus | Daily operations, point entry, attendance, limited reports |
| **Campus Admin** | Home campus | View students from their campus, placement requests, reports |
| **DAEP Staff** | Assigned rooms | Point entry, attendance, behavior notes for assigned students |
| **Parent** | Own child | Read-only view of student progress (Growth feature) |
| **Student** | Self | Read-only view of own progress (Growth feature) |

**Permission Inheritance:**
- District Admin inherits all lower-level permissions
- DAEP Admin Level 1 inherits Level 2 permissions
- Staff permissions are room-scoped within their campus

**Approved Teacher Flag:**
- Staff with "approved teacher" designation can post points immediately
- Non-approved staff points require admin approval before finalization

### Integration Requirements

| System | Integration Type | Priority | Purpose |
|--------|------------------|----------|---------|
| **TrespassTracker** | Internal module | MVP | Shared student lookup, expiration sync, parent contacts |
| **District SIS** | CSV import | MVP | Student enrollment reconciliation |
| **Skyward/PowerSchool/Focus** | OneRoster API | Growth | Real-time bi-directional sync |
| **Email (SMTP)** | Outbound | MVP | Notifications, magic links, alerts |
| **PEIMS** | Export format | MVP | Texas state reporting compliance |

---

## User Experience Principles

### Design Philosophy

**"Trust Through Transparency"** - Every data point should be traceable to its source, with clear indication of reconciliation status and last update time.

**Visual Personality:**
- Professional, institutional aesthetic (not consumer/playful)
- Clean data tables with clear hierarchy
- Status indicators using consistent color coding (green/yellow/red)
- Minimal clicks for common workflows

### Key Interactions

1. **30-Second Behavior Note:** Teacher sees student roster → taps student → types note → submits. No navigation required.

2. **Banking-Style Reconciliation:** Import screen shows side-by-side comparison with discrepancies highlighted. Administrator reviews each flag, clicks "Accept SIS" or "Keep DAEP" with optional note.

3. **Point Entry Grid:** Period-based grid view showing all students in room. Default to 10 points, click to modify. Visual indicator for students requiring attention.

4. **Dashboard Drill-Down:** KPI cards are clickable, leading directly to filtered student lists. "Students Enrolled Today (5)" → click → see those 5 students.

---

## Functional Requirements

> **CRITICAL:** These FRs define the complete capability contract. UX designers will design for these capabilities. Architects will support these capabilities. Epic breakdown will implement these capabilities. If a capability is not listed here, it will not exist in the product.

### User Management & Authentication

- **FR1:** Users can authenticate via magic link email (passwordless)
- **FR2:** Users can create a password after initial magic link authentication
- **FR3:** Administrators can create, edit, and deactivate user accounts
- **FR4:** Administrators can assign roles and permissions to users
- **FR5:** Administrators can designate teachers as "approved" for immediate point posting
- **FR6:** Users can only access data within their assigned scope (district/campus/room)
- **FR7:** System maintains session with automatic logout after inactivity period
- **FR8:** System logs all authentication events for security audit

### Student Management

- **FR9:** Users can view student profiles with demographics and contact information
- **FR10:** Users can search students by name, ID, home campus, or current status
- **FR11:** Users can filter student lists by placement status, campus, room, or date range
- **FR12:** Administrators can create student records manually
- **FR13:** Administrators can edit student demographic information
- **FR14:** System displays student's current placement status prominently on profile
- **FR15:** System shows TrespassTracker status for students with active trespass records
- **FR16:** Users can view student's placement history across all DAEP assignments

### Placement Management

- **FR17:** Administrators can create new placements with intake information
- **FR18:** Administrators can assign students to specific DAEP rooms
- **FR19:** System captures placement details: incident number, discipline code, start date, days assigned
- **FR20:** System calculates and displays days remaining in placement
- **FR21:** System tracks placement lifecycle: Pending → Active → Transition → Complete
- **FR22:** Administrators can modify placement details (extend/reduce days, change room)
- **FR23:** Administrators can process student transition back to home campus
- **FR24:** System prevents duplicate active placements for the same student
- **FR25:** System handles rollover students (placement spanning school years)
- **FR26:** System handles no-show students (assigned but never attended)

### Daily Point Tracking

- **FR27:** Staff can enter points (0-10) for each student per period
- **FR28:** System defaults point entry to 10 (full points) for efficiency
- **FR29:** Staff can enter points for multiple students in a grid view
- **FR30:** System supports bulk point entry for common scenarios
- **FR31:** Approved teachers' points are immediately finalized
- **FR32:** Non-approved staff points require administrator approval
- **FR33:** Administrators can approve or reject pending point entries
- **FR34:** System calculates cumulative points toward placement goals
- **FR35:** System displays progress toward point milestones (e.g., 500 points, 200 remaining)
- **FR36:** Staff can add notes/comments to individual point entries
- **FR37:** System maintains complete audit trail of all point changes

### Attendance Tracking

- **FR38:** Staff can record attendance status per student per period (Present/Absent/Tardy)
- **FR39:** System captures timestamps for tardy arrivals
- **FR40:** System captures timestamps for early dismissals
- **FR41:** Staff can record attendance for multiple periods simultaneously
- **FR42:** System distinguishes between excused and unexcused absences
- **FR43:** System calculates daily and cumulative attendance rates
- **FR44:** Administrators can override or correct attendance records with audit trail

### Behavior Documentation

- **FR45:** Staff can create behavior notes for any student in their scope
- **FR46:** Behavior notes capture: date, time, category, description, staff member
- **FR47:** System supports predefined behavior categories (positive and negative)
- **FR48:** Staff can complete behavior note entry in under 30 seconds
- **FR49:** Administrators can review all behavior notes for students
- **FR50:** System supports attaching behavior notes to specific incidents
- **FR51:** Behavior notes are visible on student profile timeline

### Data Reconciliation (Core Differentiator)

- **FR52:** Administrators can upload CSV files from district SIS
- **FR53:** System parses CSV and maps fields to internal data model
- **FR54:** System compares uploaded data against existing DAEP records
- **FR55:** System flags discrepancies between SIS and DAEP data
- **FR56:** System categorizes discrepancies: new students, missing students, data conflicts
- **FR57:** Administrators can review each discrepancy with side-by-side comparison
- **FR58:** Administrators can accept SIS data, keep DAEP data, or merge manually
- **FR59:** Administrators can add notes explaining reconciliation decisions
- **FR60:** System maintains audit trail of all reconciliation actions
- **FR61:** System generates reconciliation summary report
- **FR62:** System alerts administrators to unresolved discrepancies

### Room & Schedule Management

- **FR63:** Administrators can create and configure DAEP rooms
- **FR64:** Administrators can assign staff to rooms
- **FR65:** Administrators can configure bell schedules per campus
- **FR66:** System supports multiple bell schedule variations (regular, early release, etc.)
- **FR67:** Staff can view roster of students assigned to their room
- **FR68:** System displays current period based on bell schedule

### Discipline Code Management

- **FR69:** Administrators can configure discipline codes with labels and categories
- **FR70:** System supports mandatory vs. discretionary placement flags
- **FR71:** Discipline codes include behavior location classification
- **FR72:** System validates placement entries against configured codes

### TrespassTracker Integration

- **FR73:** System shares student lookup across DAEP and TrespassTracker modules
- **FR74:** System synchronizes expiration dates between modules
- **FR75:** System shares parent/guardian contact information
- **FR76:** Users can view TrespassTracker status from DAEP student profile
- **FR77:** System prevents conflicting data between modules

### Reporting & Analytics

- **FR78:** Dashboard displays real-time KPI cards (enrollment, attendance, points)
- **FR79:** KPI cards are clickable, drilling down to filtered student lists
- **FR80:** System generates attendance reports by date range
- **FR81:** System generates discipline reports by code, campus, or date range
- **FR82:** System generates point progress reports
- **FR83:** System generates placement length reports
- **FR84:** Administrators can export reports in PDF and Excel formats
- **FR85:** System tracks recidivism (same-year re-placements)
- **FR86:** Dashboard displays recidivism rate metrics

### Compliance & State Reporting

- **FR87:** System tracks 90-day assessment requirements per TEC §37.0082
- **FR88:** System generates alerts for upcoming 90-day assessment deadlines
- **FR89:** System tracks 120-day status review requirements
- **FR90:** System generates PEIMS Submission 3 export in TEA-required format
- **FR91:** System validates PEIMS export data against TEA requirements
- **FR92:** System maintains discipline action records (Code 425) per PEIMS standards

### Notifications & Alerts

- **FR93:** System sends email notifications for pending approvals
- **FR94:** System sends alerts for compliance deadlines (90-day, 120-day)
- **FR95:** System sends notifications for point milestones achieved
- **FR96:** Administrators can configure notification preferences
- **FR97:** System displays in-app notification bell with unread count
- **FR98:** Users can dismiss or mark notifications as read

### Configuration & Settings

- **FR99:** Administrators can configure district-wide settings
- **FR100:** Administrators can configure campus-specific settings
- **FR101:** Administrators can configure point bonus rules
- **FR102:** Administrators can customize email notification templates
- **FR103:** Administrators can manage distribution lists for notifications
- **FR104:** System supports district calendar configuration (school days, holidays)

### Audit & History

- **FR105:** System logs all data changes with user, timestamp, and before/after values
- **FR106:** Administrators can view audit history for any record
- **FR107:** System maintains immutable audit trail for compliance
- **FR108:** Administrators can generate audit reports by user or date range

---

## Non-Functional Requirements

### Performance

- **NFR1:** Page load time under 2 seconds for all primary views
- **NFR2:** Point entry grid updates within 500ms of user input
- **NFR3:** CSV reconciliation processes 1,000 student records in under 30 seconds
- **NFR4:** Dashboard KPIs refresh within 5 seconds of underlying data changes
- **NFR5:** System supports 100 concurrent users per district without degradation
- **NFR6:** Search results return within 1 second for queries up to 10,000 students

### Security

- **NFR7:** All data encrypted at rest using AES-256
- **NFR8:** All data encrypted in transit using TLS 1.3
- **NFR9:** Authentication tokens expire after 24 hours of inactivity
- **NFR10:** Failed login attempts trigger progressive lockout (5 attempts → 15 min lock)
- **NFR11:** All API endpoints require authentication
- **NFR12:** Row-level security enforces campus/district data isolation at database level
- **NFR13:** PII fields are masked in logs and error messages
- **NFR14:** System passes annual security penetration testing

### Scalability

- **NFR15:** Architecture supports horizontal scaling for 100+ district tenants
- **NFR16:** Database design supports 500,000+ student records across all tenants
- **NFR17:** File storage scales independently of compute resources
- **NFR18:** Real-time features (notifications, updates) scale via pub/sub architecture

### Reliability & Availability

- **NFR19:** System maintains 99.5% uptime during school hours (7am-6pm local time)
- **NFR20:** Planned maintenance windows scheduled outside school hours
- **NFR21:** Data backup performed daily with 30-day retention
- **NFR22:** Point-in-time recovery available within 7 days
- **NFR23:** Graceful degradation when external services unavailable

### Accessibility

- **NFR24:** WCAG 2.1 Level AA compliance for all user-facing interfaces
- **NFR25:** Keyboard navigation for all primary workflows
- **NFR26:** Screen reader compatibility for core features
- **NFR27:** Color contrast ratios meet accessibility standards
- **NFR28:** Touch targets minimum 44x44 pixels for mobile use

### Integration

- **NFR29:** RESTful API follows OpenAPI 3.0 specification
- **NFR30:** API rate limiting: 100 requests/minute per user
- **NFR31:** Webhook delivery retries 3 times with exponential backoff
- **NFR32:** CSV import supports common encodings (UTF-8, Windows-1252)
- **NFR33:** Export formats include PDF, XLSX, and CSV

---

## PRD Summary

This Product Requirements Document defines **108 Functional Requirements** across 14 capability areas:

| Capability Area | FR Count | Priority |
|-----------------|----------|----------|
| User Management & Auth | FR1-FR8 (8) | MVP |
| Student Management | FR9-FR16 (8) | MVP |
| Placement Management | FR17-FR26 (10) | MVP |
| Daily Point Tracking | FR27-FR37 (11) | MVP |
| Attendance Tracking | FR38-FR44 (7) | MVP |
| Behavior Documentation | FR45-FR51 (7) | MVP |
| Data Reconciliation | FR52-FR62 (11) | MVP |
| Room & Schedule Mgmt | FR63-FR68 (6) | MVP |
| Discipline Codes | FR69-FR72 (4) | MVP |
| TrespassTracker Integration | FR73-FR77 (5) | MVP |
| Reporting & Analytics | FR78-FR86 (9) | MVP |
| Compliance & Reporting | FR87-FR92 (6) | MVP |
| Notifications & Alerts | FR93-FR98 (6) | MVP |
| Configuration & Settings | FR99-FR104 (6) | MVP |
| Audit & History | FR105-FR108 (4) | MVP |

**Non-Functional Requirements:** 33 NFRs covering performance, security, scalability, reliability, accessibility, and integration.

---

_This PRD captures the essence of DAEPManagement - a trustworthy, data-accurate DAEP management platform that eliminates manual reconciliation pain and enables confident stakeholder reporting._

_Created through collaborative discovery between Alan and AI facilitator._

_Next: Architecture workflow will define technical decisions to support these capabilities._
