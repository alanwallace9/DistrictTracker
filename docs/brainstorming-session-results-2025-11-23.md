# Brainstorming Session Results

**Session Date:** 2025-11-23
**Facilitator:** AI Brainstorming Facilitator
**Participant:** Alan

## Session Start

**Approach:** Starting broad, narrowing to specific problem areas
**Scope:** Features, user workflows, and integration architecture

### Context
- Project: DAEP Module for DistrictTracker (existing TrespassTracker module)
- Foundation: Bolt.new UI mockup analyzed and documented
- Critical requirement: Seamless integration with TrespassTracker (shared tables, no duplication)

### Key Focus Areas
1. **Features** - Beyond mockup, comprehensive functionality
2. **User Workflows** - Intakes → Reviews → Return to home campus
3. **Communication** - Parents, campus admins, district stakeholders
4. **SIS Integration** - Focus SIS CSV upload, daily sync, duplicate prevention
5. **Data Integration** - Single source of truth, linked records across modules

### Constraints Acknowledged
- Timeline: Fast but thorough
- Regulatory: Texas DAEP compliance mandatory
- Technical: Excel/PDF export working, email automation (future phase)
- Integration: **CRITICAL** - Changes in DAEP must sync to TrespassTracker, no duplicate tables

## Executive Summary

**Topic:** DAEP Module - Features, Workflows, and Integration Architecture

**Session Goals:**
- Comprehensively explore DAEP features beyond the UI mockup
- Map complete user workflows (intake → review → return to home campus)
- Solve critical integration challenges (TrespassTracker sync, SIS integration, duplicate prevention)
- Design communication flows (parents, admins, campus staff)
- Ensure Texas DAEP regulatory compliance

**Approach Selected:** Progressive Technique Flow (Broad → Focused → Convergent)

**Techniques Used:**
1. **Mind Mapping** (15 min) - Divergent exploration of all DAEP features and workflows
2. **Five Whys** (15 min) - Deep dive into integration challenges and root problems
3. **What If Scenarios** (15 min) - Explore SIS sync, communication, and edge cases
4. **SCAMPER** (15 min) - Systematically enhance and refine features

**Total Ideas Generated:** 100+ features and requirements captured

**Session Status:** ALL ROUNDS COMPLETED ✅
- ✅ Round 1: Mind Mapping (8 major branches mapped)
- ✅ Round 2: Five Whys (2 critical problems solved to root cause)
- ✅ Round 3: What If Scenarios (6 edge case categories explored, 20+ scenarios analyzed)
- ✅ Round 4: SCAMPER (6 feature areas systematically enhanced)

### Key Themes Identified:

From our 4-round brainstorming session, these major themes emerged:

1. **Integration Complexity is Critical** - Seamless TrespassTracker integration (no duplicate tables), Focus SIS CSV reconciliation, and single source of truth for expiration dates are foundational requirements

2. **Operational Efficiency Over Manual Processes** - Replace manual CSV checking, Excel spreadsheets, paper binders, and Teams chat with centralized dashboard ("command central")

3. **Teacher Burden Reduction** - Quick-tap interfaces, automatic calculations, dropdown selections instead of typing - if teachers find it tedious, adoption fails

4. **Predictive Intervention > Reactive Response** - Pattern detection (3 bad periods → alert admin) to intervene BEFORE Code Yellow, not after

5. **Student Transparency = Motivation** - Clear visibility into points, days remaining, review criteria empowers students and enables motivational conversations

6. **Data Integrity Through Reconciliation** - "Looking for that penny" mindset - flag discrepancies, allow manual override, trust but verify

7. **Digital Guides, Human Decides** - Checklists and rubrics structure conversations, but in-person connection remains essential for reviews and interventions

8. **Rollover Students are the Exception That Breaks Rules** - Year-end continuations affect recidivism counting, CSV imports, and placement tracking - must be handled explicitly

## Technique Sessions

### Technique 1: Mind Mapping (Divergent Exploration)

**Branch 1: Student Management**

**Referral & Intake Workflow:**
- Home campus submits referral
- Central Office approves referral
- **Upon approval:** Auto-appear on DAEP dashboard + notification in Focus SIS
- Registrar schedules intake appointment
- **During intake:**
  - Student assigned to room
  - Conflict management: Flag students who need separation
  - Room assignment considers: hallway side, lunch period, student conflicts
  - System blocks problematic room assignments

**Room Management Intelligence:**
- Room leveling/balancing functionality
- Student separation rules: "Student A can't be in Room 503 because of Student B"
- Conflict tracking across: rooms, hallways, lunch periods

**Monitoring & Alerts:**
- **Absence tracking:** Notification after 3 consecutive absences (to teacher and admin)
- **Progress tracking:** Alert if student doesn't earn 100 points for 3+ consecutive days
- **Review eligibility:** Notification when student nearing return-to-campus review
- **Role-based notifications:**
  - Teachers see: attendance, behavior, points
  - Admins/Registrars see: reviews, placements, compliance
  - Campus admins see: their students only
- **Notification preferences:** Configurable 3, 5, or 7 days advance notice
- **UI:** Notification bell (top/sidebar) with role-filtered pending actions

**Incident Tracking at a Glance:**
- Offense codes: 21 (Code of Conduct), 43, nicotine vape, THC vape, fighting, etc.
- First-time vs repeat visit indicator
- Quick mobile view (iPad mini in hallway)
- **Mobile dashboard:** Attendance + Discipline + Behavior + Visit history in one screen

**Branch 2: Placement & Review Process**

**Placement Structure:**
- Format: "30 days with 15-day review" (review eligibility at 15 days)
- Or: "30 days with 20-day review" (review eligibility at 20 days)
- Review days = when student becomes eligible to return (not automatic)

**Review Eligibility Criteria (3 pillars):**
1. **Attendance** - Present, on-time, minimal absences
2. **Academics** - Completing work, grade reports from teachers
3. **Behavior/Discipline** - Point balance, behavior notes clean
- **Decision:** Subjective but objective - DAEP admin makes final call
- **Not involved:** Home campus, parents (optional)

**Review Meeting Workflow:**
- **Current process:** Print CSV files, review student academic binder
- **Review components:**
  - Discipline notes
  - Behavior issues
  - Attendance record
  - Academic progress
- **If passed:** "Today is your last day" + explain transition steps
- **Output:** Need to digitize this process, store review documentation

**Post-Review Return Process:**
1. Teachers submit grade reports to registrar
2. Registrar sends campus notification email (includes parents)
3. "Student has met successful review" notification
4. Student returns to home campus **next school day**
5. **Transition meeting** at home campus on return day
6. **Feature request:** Store transition document digitally, track meeting completion

**Success Tracking:**
- Primary metric: Student doesn't return to DAEP
- **Future:** Could track post-return incidents (if they stay out of trouble)

**Branch 3: Points & Credit System**

**Daily Points System:**
- **Target:** 100 points per day
- **Flexibility:** Partial credit allowed
- **Example:** Student has "off days" but earned 50 points/day → still counts toward progress
- **Philosophy:** Day doesn't have to be all-or-nothing
- **Impact:** Affects days served calculation

**Community Service/Rehabilitation Program:**
- **Frequency:** Once a month opportunity
- **Activities:** Roadside cleanup, park cleanup, food bank volunteering
- **Incentive:** Can **earn a day** toward placement (reduces total days)
- **Purpose:** Community involvement, rehabilitation, motivation
- **Tracking needed:** Document service completion, apply credit to placement

**Branch 4: Mobile Operations (iPad Mini - Code Yellow Response)**

**Hallway Management Use Case:**
- **Scenario:** "Code Yellow" call (student not doing what they should)
- **Need:** Quick access without returning to office
- **Lookup:** By room number OR student name

**Critical Mobile Info:**
- Placement info (offense, days assigned, days remaining)
- Attendance status (present/absent, pattern)
- Discipline/behavior notes (recent history)
- **Days remaining** (motivation: "You have 3 days left!" vs "30 days left")
- **Current point balance** (200/day target, actual progress)
- Recent behavior note history (context for intervention)
- ~~Parent contact info~~ (not needed - students go to office)

**Branch 5: Communication & Notifications**

**Email Automation (Current manual, future auto):**
- Review completion → Campus notification
- Include parents on return notifications
- Grade reports from teachers → Registrar workflow

**Branch 6: Focus SIS Integration (CRITICAL)**

**Current State - Manual Pain Points:**
- Registrar manually enters students
- Manually checks Focus for updates
- Manually updates BMS (Behavior Management System - Excel spreadsheet)
- Often inaccurate and time-consuming
- **This system solves this problem**

**Two Separate CSV Import Processes:**

**CSV #1: Daily DAEP Roster** (who's currently placed)
- Exported from Focus daily
- Contains: Student ID, Name, Grade, Campus, Current enrollment
- Students appear EVERY DAY they're placed (whether absent or present)
- **Purpose:** Sync current enrollment, detect students who returned home

**CSV #2: Discipline Incident Report** (with incident IDs)
- Contains: Student ID, **Incident ID Number** (unique), Offense Code, Placement days, Assigned start date
- **Incident ID is the KEY** to preventing duplicates
- Same incident ID = same placement (skip)
- Different incident ID = new placement (create new record)

**Import Logic - CSV #1 (Daily Roster):**
1. **New student NOT in system:**
   - Create student record
   - Populate: Name, ID, Grade, Campus, Parent/Guardian contact
   - **Note:** Photos added later (JWT token from Focus)
   - Awaiting intake to create placement

2. **Existing student, same placement (same incident ID):**
   - Skip creation
   - Count toward total enrollment only
   - Attendance tracked separately in DAEP system

3. **Existing student, NEW incident (different incident ID):**
   - Create new placement record
   - Increment visit count (recidivism tracking)
   - Update trespass_records (cascading sync)
   - Link to new incident ID

4. **Student in system but NOT in CSV:**
   - **Trigger:** Pending action for registrar
   - **Action needed:** Reconcile dates, confirm return, mark placement complete
   - Verify end date accuracy

**Date Management Challenges:**
- **Problem:** Home campus assigns start date, but student might not actually start then
- **Examples:** Parent can't get off work, student suspended 3+ days first, approval timing
- **Solution:** Registrar sets **actual start date** after intake via calendar picker
- **End date calculation:** Actual start date + placement days + absences (auto-extends)
- **Focus end date:** Not reliable, system calculates dynamically

**Attendance Tracking:**
- **Not synced from Focus** - tracked separately in DAEP system
- DAEP teachers take attendance daily in our system
- **Teachers of record:** Home campus teachers (not DAEP teachers)
- **DAEP teachers:** Don't have Focus access
- **Attendance impact:** Absence extends end date automatically

**Offense Codes (PEMS Codes):**
- **Managed in:** Admin panel (single panel for both modules)
- **Access:** DAEP admin only (Alan currently)
- **Update frequency:** Yearly (Texas state PEMS codes change annually)
- **Future:** Possible per-state or per-district customization
- **Source:** Texas state PEMS code list upload
- **Not synced from Focus** - managed in system

**End Date Calculation Logic:**
```
Actual End Date =
  Actual Start Date (set after intake)
  + Placement Days Assigned
  + Days Extended (absences)
  - Days Earned (community service)
```

**Integration Summary:**
- Two CSV files: Daily roster + Incident report
- Incident ID prevents duplicates
- Dates set after intake (not from Focus)
- Attendance tracked in DAEP system
- Offense codes managed yearly in admin panel

**Branch 7: TrespassTracker Integration Architecture (CRITICAL - No Duplication)**

**Shared Tables (Existing - DO NOT DUPLICATE):**
- `trespass_records` - Core incident record (parent)
- `tenants` - District/organization
- `campuses` - School locations
- `user_profiles` - Staff accounts
- Student core data: Name, ID, guardian info, demographics

**New DAEP-Specific Tables (Linked via FK):**
- `daep_placements` - Placement details, dates, room, status
- `daep_attendance` - Daily attendance tracking
- `daep_behavior_notes` - Points, teacher actions, student actions
- `daep_room_assignments` - Current room, conflicts, separation rules

**Data Model Relationship:**
```
trespass_records (existing)
  ├─ is_daep = true (checkbox flag)
  ├─ daep_expiration_date (synced from DAEP)
  └─ Links to → daep_placements (NEW)
      ├─ incident_id (from Focus CSV - deduplication key)
      ├─ start_date (actual, set after intake)
      ├─ planned_end_date (calculated)
      ├─ actual_end_date (when completed)
      ├─ days_assigned (20, 30, etc.)
      ├─ days_served (calculated from attendance)
      ├─ review_days (15, 20, etc.)
      ├─ current_roster_room
      ├─ placement_number (1st, 2nd, 3rd visit - recidivism)
      ├─ status (active, completed, returned)
      └─ Links to multiple daep_attendance records
```

**Critical Use Case - Dual Status:**
- **Scenario:** Student is TRESPASSED from home campus (1-2 year ban)
  - Can't attend after-school activities
  - Must leave campus at 3pm
  - **BUT** also receives DAEP placement
- **Result:** DAEP placement gives permission to be on DAEP campus during school day
- **Data model:**
  - One trespass_record (the ban)
  - One daep_placement (the educational program)
  - Both can exist simultaneously

**What's in daep_placements (not in trespass_records):**
- **Placement lifecycle:** Start date (actual), review eligibility, completion status
- **DAEP program tracking:** Room assignment, days served, attendance
- **Review process:** Review days, eligibility date
- **Visit counting:** Placement number (1st, 2nd, 3rd time) for recidivism
- **Focus integration:** Incident ID (from Focus CSV)
- **Different purpose:** Trespass = incident/ban, DAEP = educational program/tracking

**Bidirectional Sync Requirements:**
- DAEP date changes → Update `trespass_records.daep_expiration_date`
- Absences in DAEP → Extend `daep_expiration_date` → Sync to trespass_records
- Notification bell triggers on both sides

**Branch 8: Reporting & Analytics**

**Current Manual Processes to Automate:**
- Attendance tracking (currently by hand)
- Recidivism rate calculation (currently by hand)
- Campus performance comparisons

**Report Categories:**

**1. Exit Survey (Future - Maybe Not MVP):**
- Currently: Google Doc students fill out at completion
- Questions: How did DAEP help? Student feedback
- Metrics: Track certain measures over time
- **Ideal:** Integrated into dashboard, required before marking review complete

**2. Campus Comparison Reports:**
- **Purpose:** Track which campuses send what types of offenses
- **Metrics:**
  - Placement duration by campus (Does Campus A send 20-day vs Campus B?)
  - Offense types by campus (fights vs. substance vs. insubordination)
  - Demographic patterns (males vs. females, grade levels)
- **Use case:** Identify campus-specific trends, training needs

**3. Custom Report Builder:**
- **Features:**
  - Pop in filters (campus, offense type, date range, demographics)
  - Sort and group data
  - Generate useful insights
  - **Save reports** for reuse
  - **Share saved reports** via link
- **Use case:** Boss asks same question repeatedly → save and share report
- **Example:** "Here's the discipline rates for the campus you're monitoring"

**4. Performance Defense Reports:**
- **Scenario:** Campus blames DAEP for low attendance
- **Response:** Send report showing DAEP students outperform campus students
- **Metrics:** DAEP attendance vs. home campus attendance for same students

**Texas PEIMS Reporting:**
- **Not required** - DAEP not a campus, doesn't report test scores/attendance
- Home campuses handle all state reporting
- Students remain enrolled at home campus (teachers of record)

### Technique 2: Five Whys (Deep Dive into Root Problems)

**Problem #1: TrespassTracker Integration - No Duplicate Tables/Records**

**Why #1: Why is duplication a problem?**

**Impacts identified:**

1. **Metrics corruption:**
   - Enrollment count inflated (10 students shows as 12 if 2 returned twice)
   - Attendance percentages off (denominator wrong)
   - Discipline percentages skewed
   - Recidivism rates inaccurate (can't track true repeat visits)
   - **Impact:** All reporting and KPIs unreliable

2. **FERPA compliance broken:**
   - Audit trail confusion: Who viewed which record?
   - Multiple records for same student makes tracking access impossible
   - Legal liability if audit trail is unclear

3. **Data sync nightmare:**
   - Expiration dates need single source of truth
   - Changes in one place don't reflect in other
   - Which record is correct?

4. **History tracking fails:**
   - Can't link multiple visits to same student
   - Recidivism tracking broken (1st, 2nd, 3rd visit)
   - Pattern analysis impossible

5. **Mixed record types:**
   - Trespass records include adults and students
   - Need clear separation and linkage

**Why #2: Why do accurate metrics matter?**

**Real-world consequences of bad data:**

1. **Funding impact (Home Campus):**
   - Attendance data affects ADA (Average Daily Attendance)
   - ADA drives funding allocation to home campuses
   - Inaccurate attendance = incorrect funding
   - **Stakes:** Financial impact to district

2. **Program effectiveness evaluation:**
   - **Recidivism rate = primary success metric**
   - How program is judged: Are kids staying out of trouble?
   - Inflated enrollment makes recidivism look worse than reality
   - **Stakes:** Program credibility, continued support

3. **State reporting & policy decisions:**
   - Data reported to Texas state education agency
   - State uses aggregate data to make policy decisions
   - Example: Nicotine placement (discretionary → mandatory → discretionary)
   - State determines which violations = mandatory vs discretionary DAEP
   - **Stakes:** Statewide DAEP policy influenced by inaccurate data

4. **Staffing & resource allocation:**
   - Ratio: 15 kids per staff member
   - Enrollment count drives staffing decisions
   - Overstated enrollment could trigger unnecessary hiring
   - Understated enrollment could leave program under-resourced
   - **Stakes:** Budget, personnel decisions

5. **Credibility for critical conversations:**
   - Need accurate data to justify program value
   - Defend DAEP performance to skeptical campus admins
   - Resource requests backed by real numbers
   - **Stakes:** Professional credibility, program sustainability

**Why #3: What causes duplication? What prevents it?**

**Root Understanding:**
- **NOT about duplicate students** - Student ID is single source of truth
- **About duplicate PLACEMENTS** - Same student, multiple discipline incidents over time

**Real-world examples:**
- Student has placement in October (Incident #1234)
- Same student has placement in January (Incident #5678)
- Same student might also be trespassed (non-DAEP violation)
- **Result:** One student, multiple records across time

**Deduplication Strategy:**

**Composite Key: Student ID + Incident Number**

```
Import Logic:
IF Student ID exists in system:
  IF Incident Number exists for this student:
    → SKIP (already imported this placement)
  ELSE:
    → CREATE new placement (different incident)
    → INCREMENT placement_number (2nd, 3rd visit)
ELSE:
  → CREATE new student
  → CREATE new placement
  → SET placement_number = 1
```

**Why CSV Import is Critical:**

**Two reconciliation purposes:**

1. **Capture pending students:**
   - Student approved by central office
   - Not yet intake scheduled
   - Shows in Focus, not yet in DAEP module
   - **CSV catches them:** Creates pending intake record

2. **Detect sync issues:**
   - **Example:** Focus shows 73 students enrolled
   - DAEP shows student released 2 days ago
   - **Discrepancy detected:** Registrar was out sick, didn't unenroll in Focus
   - **Trigger:** Pending action for staff to reconcile
   - **Fixes operational gaps**

**Why no direct API/FTP yet:**
- Focus doesn't offer secure FTP export
- No API integration available currently
- CSV is manual workaround
- **Future improvement:** Direct integration when Focus supports it

**Prevention Constraints in Data Model:**

1. **Primary constraint:** UNIQUE(student_id, incident_number) on daep_placements table
2. **Secondary check:** Date validation (optional, incident number is primary)
3. **Database-level enforcement:** Prevents duplicate placements at schema level
4. **Application-level validation:** Check before insert, user-friendly error if duplicate detected

**Why this is simple:**
- Student ID = student identity
- Incident Number = placement identity
- Combination = unique placement record
- Easy to validate, easy to change if needed

**Problem #2: Date Calculation & Attendance Impact**

**Why #1: Why can't we just use start date + placement days = end date?**

**Root cause:** Multiple factors dynamically extend or reduce placement duration.

**Absence Impact - Complex Rules:**

1. **Unexcused absence:**
   - Add 1 day to end date
   - Zero points earned for that day
   - Extends placement automatically

2. **Excused absence (doctor's note):**
   - Does NOT extend end date
   - Partial credit possible if student attended some periods
   - **Point calculation:** 10 points per period attended
   - **Example:** Present for 3-4 periods = 30-40 points earned
   - Day still counts toward days served (even if partial)

3. **Early dismissal scenarios:**
   - **With doctor's note:** Partial points for periods attended, day counts
   - **Unexcused (behavioral - "threw a fit and left"):** Zero points, day doesn't count, extends placement

**No hard cap on absences:**
- Student can keep extending indefinitely
- **Truancy becomes issue** (separate problem, different module)
- **Intervention triggers:** If pattern becomes "unruly"
- **Alternative outcomes:** Can close placement other ways (transfer, alternative program)

**Community Service - Earning Days Back:**

**How it works:**
- Complete approved activity (Saturday cleanup, food bank, etc.)
- **Credit:** 100 bonus points added to balance
- **Effect:** Equivalent to 1 full day served
- **Ratio:** 1:1 (1 service day = 1 placement day reduced)

**Limits & Rules:**
- **Frequency:** Once per month maximum (current policy)
- **Early release possible:** Yes, this is intentional incentive
- **Example:** 10-day placement + 1 service day = eligible for review on day 9

**Calculation Formula (Corrected):**

```
Days Remaining =
  Days Assigned
  - Days Served (attendance with 100+ points)
  - Days Earned (community service * 1)
  + Days Extended (unexcused absences)

Release Eligibility Date =
  Start Date
  + Days Remaining
  + School days only (skip weekends/holidays)
```

**Point Accumulation:**
- Standard day: 100 points = 1 day credit
- Partial day (excused early): 10 points/period (30-40 points common)
- Unexcused absence: 0 points, extends by 1 day
- Community service: 100 bonus points = 1 day credit

**Tricky Edge Cases Identified:**
- Student leaves early unexcused → loses entire day's progress
- Excused absence with partial attendance → still counts as day served
- Community service accelerates release → can finish before assigned days
- No maximum extensions → placement can theoretically extend forever

### Technique 3: What If Scenarios (Edge Case Exploration)

**Category 1: Focus CSV Data Quality Issues**

**What if the Focus CSV has bad or missing data?**

**Scenario 1.1: Missing Incident ID**
- **Likelihood:** Very low (Focus auto-assigns incident number on "Add Referral")
- **Business Rule:** Flag row, skip import, notify user which row failed
- **User action:** Manual review and entry for that specific record

**Scenario 1.2: Duplicate Incident IDs (across different students)**
- **Likelihood:** Low but possible (data entry error in Focus)
- **Business Rule:** Reject BOTH records, notify admin
- **Prevents:** Data corruption from invalid incident assignments

**Scenario 1.3: Date Inconsistencies**

**Start date in the past:**
- **Business Rule:** **ALLOW** - This is normal behavior
- **Reason:** Students may delay starting (parent can't get off work, student suspended first, approval timing)
- **Real example:** Incident 2 weeks ago, student starts DAEP today
- **Override:** Registrar manually sets actual start date after intake via calendar picker

**End date before start date:**
- **Business Rule:** Block with red toast notification
- **Message:** "End date must be after start date"
- **Prevention:** Client-side validation before save

**Dates on weekends/holidays:**
- **Business Rule:** Flag and require correction before proceeding
- **Reason:** DAEP only operates on school days
- **Action:** System prompts to select next school day

**Scenario 1.4: Student ID Format Mismatches**
- **Problem:** VERY COMMON - Leading zeros dropped by CSV/Excel
- **Examples:**
  - Focus shows: 0012345
  - CSV imports: 12345
  - Or hyphens added/removed
- **Business Rule:** Flag with error message
- **Message:** "ID mismatch - please check student ID number"
- **Resolution:** Manual review case-by-case (no reliable default format known)

---

**Category 2: Mid-Placement Status Changes**

**What if student circumstances change while actively placed?**

**Scenario 2.1: Student Transfers to Different District**
- **Example:** 15 days into 30-day placement, family moves to Houston
- **Placement Status:** "Withdrawn - Incomplete"
- **Track:** Days remaining (e.g., "9 days left")
- **Purpose:** If student returns or new district calls, can provide history
- **Recidivism:** Counts as a placement toward recidivism tracking

**Scenario 2.2: Student Expelled Mid-Placement**
- **Trigger:** Behavior at DAEP leads to district expulsion
- **Placement Status:** "Withdrawn" (not "Completed Successfully")
- **Track:** Days owed
- **Next Step:** Student enrolls at JJAEP (Juvenile Justice Alternative Education Program - county jail)
- **Recidivism:** Counts as a placement

**Scenario 2.3: Home Campus Changes Mid-Placement**
- **Example:** Student was at Elementary A, reassigned to Elementary B
- **Business Rule:** Update campus field to new campus
- **Return Process:** New campus gets return notification (not original campus)
- **Data Model:** Need "Assigning Campus" (original) + "Current Campus" (return destination)

**Scenario 2.4: Grade Level Changes / Rollover Students**
- **CRITICAL SCENARIO:** Student placed at end of year, doesn't complete before summer
- **Example:** 73 students rolled over at beginning of this year
- **Business Rule:**
  - Flag as "Rollover" vs "Initial Placement" for the year
  - Recidivism counting = **per school year** (not lifetime)
  - Previous year: Close with days owed (May 21st "clock out")
  - New year: Continuation placement (Aug 13th "clock in")
  - Days continue counting from where they left off
  - Home campus enters "Continuation from previous year" incident
  - **May be same OR different incident number** (system must handle both)

**8th grader → 9th grader mid-placement:**
- Update grade level, continue placement normally

**Graduating senior placed in May:**
- **Example:** Placed May 10th for 40-day placement
- **Business Rule:** Stay at DAEP until last day of school
- **Outcome:** Graduate (no walking at graduation)
- **Close Status:** "Time Served" on last day of school

**Scenario 2.5: Parent/Guardian Contact Info Changes**
- **Source:** Parent updates in Focus (primary source)
- **Problem:** Not all updates happen in Focus (disconnected phone, new number)
- **Solution:**
  - Display Focus contact info (read-only from CSV)
  - Add manual fields: "Second Phone", "Second Email"
  - Checkbox: "Primary Contact" (Focus vs manually entered)
  - **Purpose:** System has Focus data + manually collected updates

---

**Category 3: Communication & Notification Failures**

**What if communication channels break down?**

**Scenario 3.1: Email Bounces (parent or campus admin)**
- **Trigger:** Return-to-campus notification email bounces
- **Business Rule:** Does NOT block review completion
- **Fallback #1:** Registrar calls home campus admin manually
- **Fallback #2:** Have student call parent from office
- **Student still returns:** Student goes home with paper grade report

**Scenario 3.2: No Parent Contact Info**
- **Likelihood:** Rare (Focus requires contact to create account)
- **Business Rule:** **Flag at intake screen**
- **Action:** Prompt registrar to collect from parent during intake appointment
- **Student types:** Ideal - have parent type it in themselves
- **Review completion:** Does NOT block (see 3.1 fallback)

**Scenario 3.3: Campus Admin Leaves/Changes Mid-Year**
- **Problem:** Notifications sent to old principal (left in October)
- **Original plan:** Per-campus distribution lists in admin panel
- **REVISED SOLUTION (simpler):**
  - Send all notifications to **registrar only**
  - Registrar has Outlook distribution lists already built
  - Registrar forwards to appropriate campus contacts
  - **Rationale:** Building distribution lists in system = too complex

**Scenario 3.4: Transition Meeting Never Happens**
- **Problem:** Student returns to campus, but no transition meeting scheduled
- **Current:** Home campus schedules these meetings
- **Business Rule:**
  - Home campus admin/counselor logs into DAEP dashboard
  - Clicks student record
  - Enters meeting date (date picker)
  - **Uploads transition form** (PDF/document)
  - **Closes the loop:** True completion documented in system

---

**Category 4: Module Sync Issues (DAEP ↔ TrespassTracker)**

**What if the two modules get out of sync?**

**Scenario 4.1: DAEP Released, Trespass Still Active**
- **Example:** Student completes 30-day DAEP, but has 1-2 year trespass ban
- **Business Rule:** This is INTENTIONAL (two different timelines)
- **Data Model:**
  - One expiration date: **Always the furthest out**
  - `is_daep` checkbox: Toggles ON when DAEP placed, OFF when returned to campus
  - **Result:** Expiration = 2 years (trespass), `is_daep` = unchecked
- **Student status:** Can attend class, but can't attend after-school activities

**Scenario 4.2: Expiration Date Sync Failures**
- **Problem:** Absence in DAEP extends end date, but trespass_records not updated
- **ROOT CAUSE SOLUTION:** **One table, one expiration date**
- **Business Rule:**
  - Absence marked in DAEP → **Real-time update** to expiration date
  - **NOT a batch/cron job** (no overnight sync)
  - Single source of truth: `trespass_records.daep_expiration_date`
  - `is_daep` checkbox indicates if date is DAEP-related
- **Trigger:** Absence logged at 3pm or end-of-day → immediate recalculation

**Scenario 4.3: Record Exists in TrespassTracker, Not DAEP**
- **Examples:**
  - Adult trespassed (not a student)
  - Former student (withdrew to different district, still banned from games)
  - Non-DAEP student incident (fighting at game, no DAEP placement)
- **Business Rule:** **Ignore for CSV import**
- **Validation:** CSV only contains current students enrolled in Focus
- **Display:** TrespassTracker shows "Former Student" tag

**Scenario 4.4: Conflicting Statuses Across Modules**
- **Example Timeline:**
  - Student trespassed for 2 years (before DAEP)
  - Student placed at DAEP for 30 days
  - Student completes DAEP, returns to campus
  - Student goes to football game, gets in trouble
  - Student gets NEW 1-year trespass
- **Result:**
  - TrespassTracker: "Active Ban" (1 year)
  - DAEP: "Placement Completed - Returned to Campus"
  - **Both are true simultaneously**
- **Dashboard View:**
  - Shows latest expiration date (1 year trespass)
  - `is_daep` = unchecked (completed)
  - Student can go to campus (classes), but not games/activities

---

**Category 5: Workflow Edge Cases**

**What if normal workflow breaks down?**

**Scenario 5.1: Review Eligibility Reached, Registrar on Leave**
- **Trigger:** Student hits 15-day review mark, notification sent
- **Problem:** Registrar out for 2 weeks, no one schedules review
- **Business Rule:**
  - Notification bell shows pending reviews to **all admins** (not just registrar)
  - Any admin can pull student aside and conduct review
  - Student continues attending until someone acts
- **Review Process:** Informal, can happen anytime throughout the day

**Scenario 5.2: Campus Refuses to Take Student Back**
- **Answer:** This doesn't happen
- **Business Rule:** **DAEP admin sets return date** (not home campus)
- **Override capability:**
  - DAEP admin can manually extend placement if needed
  - Example: Arrest notification pending, add 2 days
  - Manual date picker: Override calculated end date

**Scenario 5.3: Attendance Marked Incorrectly (Teacher Error)**
- **Problem:** Student present, marked absent by mistake → end date extended incorrectly
- **Solution #1:** Update attendance + auto-recalculate end date
- **Solution #2:** Manual override for compassionate cases
  - Example: Student goes to grandfather's funeral, admin excuses days
  - Admin can manually set end date regardless of calculation
- **Business Rule:** Both options available (correction + override)

**Scenario 5.4: Community Service Credit Entered Twice**
- **Problem:** Admin accidentally enters service twice (200 bonus points instead of 100)
- **Prevention Strategy:**
  - **Standardized entry:** Yes/No toggle (not manual point entry)
  - **Fixed value:** 100 points applied automatically
  - **Required note:** "Attended food pantry 10/21" (documentation)
  - **No manual bonus points:** If awarding 5-10 points, use behavior notes section instead
- **Result:** Prevents duplicate/inflated entries, clear audit trail

---

**Category 6: Reporting & Data Integrity**

**What if reports show conflicting or unexpected data?**

**Scenario 6.1: Recidivism Rate Calculation Discrepancy**
- **Problem:** Manual count shows 15%, system shows 22%
- **Root Cause:** Rollover students counted twice, or withdrawn students counted
- **Business Rule:** Recidivism = **Repeat placements per student per year**
- **Calculation Logic:**
  - Use incident **placement date** (NOT start date at DAEP)
  - **Exclude rollover students** from new year count
  - Example: Student placed October + December = 1 recidivism (same year)
  - Example: Student rollover from May → August continuation = 0 recidivism (different years, same incident)
- **Counter field:** `placement_number` per year (1st, 2nd, 3rd visit)

**Scenario 6.2: Campus Comparison Report Shows 0 Placements**
- **Problem:** Report shows Campus A with 0 placements, but you know they sent 5 students
- **Root Cause:** Campus name mismatch (Focus vs system)
- **Business Rule:** Campus mapping by **PEMS codes** (state-assigned)
  - Birkville High School = 010
  - Haltham High School = 001
  - Bridgetown High School = 002
  - All elementary/middle schools have 3-digit PEMS codes
- **Data Model:**
  - Store campus PEMS code (from Focus CSV)
  - Map to campus display name
  - **Two campus fields needed:**
    - "Assigning Campus" (original campus that sent student)
    - "Current Campus" (where student will return - may change if parent moves)

**Scenario 6.3: Attendance Percentage Doesn't Match Manual Records**
- **Problem:** System shows 87%, registrar's spreadsheet shows 91%
- **Root Cause:** Partial day attendance counted differently
- **Business Rule:** **9:30am count** (or select specific period - e.g., 3rd period)
  - Present at that time = present for the day
  - Matches Texas state reporting methodology
  - **Mirrors secondary school attendance reporting**
- **Calculation:** Simple binary (present/absent at checkpoint time)

**Scenario 6.4: Export Missing Recent Data**
- **Problem:** Report generated, yesterday's intake not showing
- **Business Rule:** Exports always pull **current data** (not cached)
- **Validation:** No pending/draft data included, but all saved records up to export time

---

**Key Edge Case Insights:**

1. **Rollover students are the trickiest scenario** - affects recidivism, year-end workflows, CSV imports
2. **Manual override is critical** for compassionate cases (funerals, special circumstances)
3. **Single expiration date, multiple statuses** - `is_daep` checkbox is the key toggle
4. **PEMS codes prevent campus mapping issues** - state-assigned, reliable identifier
5. **Standardized community service entry** prevents point inflation abuse
6. **Registrar as single notification recipient** simplifies distribution (uses existing Outlook lists)
7. **Transition form upload closes the loop** - accountability for home campus follow-through

### Technique 4: SCAMPER (Systematic Feature Enhancement)

**SCAMPER Framework:** Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse

Applied to 6 critical DAEP features to systematically enhance and refine functionality.

---

### **SCAMPER #1: Dashboard/Roster View**

**Current Feature:** Daily roster showing all active students, rooms, attendance, behavior points

**Selected Enhancements:**

**S - Substitute:**
- **Card view for mobile** (iPad mini hallway use) - explore visual layout

**C - Combine:**
- **Manila folder tab metaphor:** Multiple views (Roster, Students, Attendance, Behavior) with tabs at top
  - Tap tab → view changes, other tabs go behind
  - Familiar, intuitive UI pattern
  - Same data, different perspectives

**A - Adapt:**
- **Saved views and filters** (from project management tools)
  - Save custom filtered views
  - Quick access to "at-risk kids"
  - "Prioritize my data" - focus on what matters now
- **At-risk student highlighting** (hospital patient board concept)
  - "Tap to see 3 kids to check before lunch"
  - Visual priority indicators

**M - Modify/Magnify/Minify:**
- **Reduce clutter:** Hide completed students by default
  - **But:** Toggle to view recently released (last 1-2 days) for context
  - Clean active view, historical access when needed

**P - Put to other uses:**
- **Parent portal:** Limited view (parent sees only their child)
  - Same dashboard structure, filtered data
- **Student view:** See own progress (days left, points, notes)
  - May have different level of detail than parent view
- **Gamification:** Student view could show badges, streaks
- **Teacher task management:**
  - **Announcement banner/notification:** "Hey, check on Student X in room 504 during your conference"
  - **Checkbox for completion:** Teacher marks task done → notifies admin
  - **Use case:** Operational workflow, task delegation

**E - Eliminate:**
- **Reduce CSV dependency:** Still need export capability (educational setting), but add digital historical views
  - Go back yesterday, last week, last 3 weeks
  - Pull up saved reports digitally
  - CSV as supplementary, not primary

---

### **SCAMPER #2: Review Process**

**Current Feature:** Admin pulls student aside, reviews attendance/academics/behavior, decides if eligible to return

**Current Workflow:**
- **Who conducts:** Admin (department head, counselor, or DAEP director)
- **What's reviewed:** Academic binder + attendance/behavior in system
- **Decision:** Subjective but objective (3 pillars: attendance, academics, behavior)
- **Output:** Approve return or continue placement

**Selected Enhancements:**

**S - Substitute:**
- **Digital review checklist** to guide in-person conversation
  - Not replacing conversation, enhancing it
  - Structured data capture

**C - Combine:**
- **Integrated workflow:** Review approval triggers:
  1. Grade report generation (PDF with subjects, incoming/return grades)
  2. Return notification to campus + parent
  3. All compiled and sent together
- **Academic tracking in dashboard:**
  - Teacher digitally initials assignments when submitted to home campus
  - **Format:** Checkbox + timestamp for each assignment
  - **Display:** 10 days placed = 10 assignments OR "no new assignments" entries confirmed by teacher
  - **Admin view:** See all teacher confirmations during review meeting

**A - Adapt:**
- **Student self-assessment → Teacher review → Admin decision workflow**
  - Student completes self-assessment against rubric
  - Teachers review and sign off
  - **Timeline:** Must be completed by lunch (admin reviews in afternoon)
  - Admin receives compiled package for review meeting
- **Transition checklist** (from medical discharge planning)
  - Clear steps for student, campus, and family

**M - Modify:**
- **Magnify transparency:** Make review criteria visible to students
  - **Notification bell/action list:** "X students eligible for review tomorrow"
  - Can view by date (but dates shift with absences)
  - **Pre-review academic screen:** Admin reviews what teachers already signed off
  - **"What's left" tab/toggle:** Shows student what still needs completion
    - "Here's what you need: be here on time tomorrow, complete these 3 assignments"
    - Target checklist for student to hit
- **Review eligibility indicator:**
  - Track if student meets 80% of expectations
  - Approaching review eligibility alert
  - *(Note: May be too complex, not necessarily simplifying)*

**P - Put to other uses:**
- **Predictive analytics (Future - Wave 3/4):**
  - Students who don't return: what do they have in common?
  - Data patterns: attendance, engagement, community service participation
  - "Kids who attend 3 food banks never come back" type insights
  - What works, what doesn't

**E - Eliminate:**
- **All-paper grade reports:** Transition to PDF forms (already in use)
  - Current format: Name, days assigned/served, campus, subjects table (incoming/return grades)

**R - Reverse:**
- **Home campus visibility:** Read-only access to rubric and DAEP communication
  - Can see what's needed for review
  - Can see student-teacher-admin communication
  - **NO INPUT on review decision** (would not go well - "they have no idea what's going on in our program")

**Key Decision:**
- **Both digital checklist AND in-person conversation needed**
- Digital process structures and guides the conversation
- Personal connection remains essential

---

### **SCAMPER #3: CSV Import & SIS Integration**

**Current Feature:** Manual CSV upload from Focus (daily roster + incident report), incident ID deduplication

**Selected Enhancements:**

**S - Substitute (Future):**
- **Direct API integration** with Focus (when available)
- **Secure FTP or webhook notifications** when new student approved
- **Status:** Not yet - still in pilot program, one tenant currently
- Post-pilot, multi-tenant consideration

**C - Combine:**
- **Single import workflow:** Upload → Validate → Notify discrepancies in one step

**A - Adapt:**
- **Banking reconciliation model:** "Looking for that penny"
  - Flag discrepancies (expected vs actual enrollment)
  - **Three systems showing different numbers** - need to reconcile
  - **Dashboard showing sync health**
- **Expected vs actual view:**
  - Students you expect but didn't arrive
  - Students in system but not in CSV (need reconciliation)
  - **Example:** "Registrar was out sick, didn't unenroll student in Focus" → flagged for action

**M - Modify:**
- **Magnify errors:** Import errors visible in dashboard
  - Notifications to registrar/admin
  - Don't hide sync issues

**P - Put to other uses:**
- **Focus data quality audit:** Import logs identify patterns in Focus data issues
- **Shared report links (Future):**
  - Pre-built reports, graphs, dashboards
  - Shareable link to campus users or district
  - Click link → see report without needing to build it

**E - Eliminate:**
- **Manual Focus checking:** System handles reconciliation automatically
- **Manual override capability:**
  - Correct discrepancies without being overwritten by next import
  - Registrar/admin final authority on data accuracy

---

### **SCAMPER #4: Points & Behavior Tracking**

**Current Feature:** 100 points/day target, teacher logs student actions, running balance

**Current System Issues:**
- Color-coded tier system (gold, green, pink, intervention) = **ambiguous**
- **Decision:** Keep points system (100-110 points/day) - clear, measurable

**Point System Structure:**
- **7 periods + 2 restroom breaks + lunch + morning check-in = 110 points possible**
- **Attendance-based accrual:** Present at period = automatic points earned
- **Teacher deductions:** Points removed for misbehavior during class
- **Teacher rotation:** Teachers move rooms each period (not students)
  - Need to track: Teacher + Room + Period for effectiveness analytics

**Selected Enhancements:**

**C - Combine:**
- **Teacher notes + points entry in one form**
  - **Dropdown selections** (not free text) for categorization
  - **Purpose:** Data analysis - "lots of sleeping", "lots of X behavior", system-wide patterns
  - Enables admin to identify trends and make informed decisions
- **Approval workflow for overly zealous teachers:**
  - **Default:** Teacher notes immediately visible to students/parents
  - **Override:** Admin can flag specific teachers requiring approval
  - Student/parent can't see comments from flagged teachers until admin approves
  - **Prevents:** Inflammatory or inappropriate comments reaching families

**A - Adapt:**
- **Gamification (fitness tracker concept):**
  - Badges and streaks for recognition
  - **Does NOT affect dismissal eligibility** (motivational only)
  - Example: "3-5 day perfect streak" badge
  - **Peer input for badges only** (not points)
    - Points from peers = risk of bullying/coercion ("vote for me for 5 points or else")
    - Badges from peers = recognition without stakes

**M - Modify:**
- **Magnify student visibility:**
  - Points balance **very prominent** on student dashboard
  - Behavior notes clearly visible
  - Transparency into progress
- **Minify teacher burden:**
  - **Quick-tap interface:** Buttons instead of typing
  - Minimal data entry for common behaviors
  - **100% priority:** Make it as easy on teachers as possible

**P - Put to other uses:**
- **Teacher/room effectiveness analytics:**
  - Which teachers most effective? (challenge: teachers rotate)
  - Which rooms most effective? (students stay in same room all day)
  - Period-level tracking needed: Teacher + Room + Period
- **Early intervention identification:**
  - Point patterns predict at-risk students
  - Proactive support before issues escalate

**E - Eliminate:**
- **Manual point calculation:** System auto-calculates from attendance + teacher entries
- **Negative starting balance:** Students earn up to 110 (not starting at 100 and losing)

---

### **SCAMPER #5: Notifications & Alerts**

**Current Feature:** Notification bell (top/sidebar), role-filtered pending actions, configurable advance notice (3/5/7 days)

**Selected Enhancements:**

**S - Substitute:**
- **Dashboard widget showing action items** instead of just bell
  - TrespassTracker bell works well, but DAEP is different use case
  - More prominent, integrated into workflow

**C - Combine:**
- **Notifications + quick actions:** Take action directly from notification
  - Mark review scheduled
  - Acknowledge alert
  - Assign to another admin
- **Daily meeting prep view (standup briefing):**
  - **Context:** Daily end-of-day meeting to prep for next day
  - **View shows:**
    - Students with intakes scheduled
    - Conflict/separation alerts (students who need to stay apart)
    - Medical notes/considerations
    - **Quick-tag students:** Add staff-only notes (not visible to parents/students)
  - **Purpose:** Centralized operational planning

**A - Adapt:**
- **Internal staff communication (replace Microsoft Teams):**
  - **Current problem:** Teachers use Teams for operational chat
    - "Need paper/pencil in room 504"
    - "What are y'all doing to be successful with this kid?"
    - Admin has no visibility into these conversations
  - **Solution:** In-system messaging for DAEP staff + admin only
  - **Benefit:** Admin can see all staff conversations (oversight)
  - **Result:** Everything in one system, no external tools needed

**M - Modify:**
- **Eliminate email digests:** Dashboard is "command central" - one-stop hub
  - Daily email = one more thing to check
  - Keep everything in the dashboard

**P - Put to other uses:**
- **Activity feed with task delegation:**
  - Example: "These parents need to be called"
  - Staff member marks when done
  - Logs conversation results
  - **Checkbox:** "Admin follow-up needed" → adds to admin's activity feed
  - **Full tracking:** Parent contact attempts, results, follow-up actions

**R - Reverse:**
- **Student/parent portal notifications:**
  - Upcoming review alerts
  - Important milestones
  - Progress updates
- **User notification preferences:**
  - Opt-in/follow specific types of alerts
  - Customize what you want to be notified about
  - **User control over noise level**

**Key Philosophy:**
- Dashboard as single source of truth
- Reduce external tools (Teams, email)
- Visibility and accountability for all communications

---

### **SCAMPER #6: Mobile Operations (iPad Mini - Hallway)**

**Current Feature:** Quick lookup by room or student name, see placement info, attendance, discipline notes, days remaining

**Selected Enhancements:**

**S - Substitute (Future):**
- Voice search: "Show me room 504"
- Barcode/QR code scan on student ID
  - **Status:** Students don't currently have barcodes on IDs
  - **Future consideration** when IDs updated

**C - Combine:**
- **Hallway behavior logging:**
  - Morning check-in from iPad: dress code, borrowed belt, etc.
  - Log behavior notes on the spot (don't return to office)
  - **Quick documentation** of hallway interventions
- **Parent contact tracking from mobile:**
  - Log parent calls
  - Activity feed: "Parents need to be called" → mark when done
  - Log conversation results for follow-up
  - **Admin escalation:** Checkbox adds to admin's activity feed if needed

**A - Adapt:**
- **Code Yellow workflow transition (from radios to dashboard):**
  - **Current:** Teachers use radios for Code Yellow calls
  - **Goal:** Move away from radios
  - **Future:** Log Code Yellow responses in dashboard (admin/teacher view only)
  - **Benefit:** Documentation, patterns, accountability

**M - Modify:**
- **Magnify:** Days remaining + current points **HUGE** on mobile view
  - **Purpose:** Motivational conversations in hallway
  - "You have 3 days left!" vs "30 days left"
  - Point balance for encouragement
  - Quick intervention with visible data

**P - Put to other uses:**
- **iPad form signatures (intake meetings):**
  - Acknowledgement form
  - Counseling form
  - Trespass notification form
  - **Digital signature capture** - paperless intake
  - **Note:** This is only parent meeting (intake at beginning)

**E - Eliminate:**
- **Eliminate need to return to office:** Log everything from hallway
- **Streamline input:** Minimize typing, maximize taps

**R - Reverse:**
- **Predictive Code Yellow alerts (CRITICAL ENHANCEMENT):**
  - **Pattern detection:** Student had head down for 3 periods in a row
  - **System alerts admin:** At-risk student, intervention needed
  - **Proactive vs reactive:** Intervene BEFORE Code Yellow is called
  - **Benefit:** Support student earlier, prevent escalation
  - **Priority:** Explore this option extensively - could be very impactful

**Key Mobile Priorities:**
1. **Speed and simplicity** - hallway use demands efficiency
2. **Motivational data visibility** - days remaining, points for conversations
3. **Predictive intervention** - identify at-risk students before crisis
4. **Paperless intake** - digital signatures on iPad

---

**SCAMPER Session Key Insights:**

1. **Dashboard as "command central"** - one-stop hub, eliminate external tools (Teams, excessive email)
2. **Digital + human connection** - checklists guide conversations, don't replace them
3. **Predictive intervention** - identify at-risk students early (3 bad periods → alert admin)
4. **Teacher efficiency is critical** - quick-tap interfaces, automatic calculations, minimal burden
5. **Gamification for motivation, not stakes** - badges/streaks for recognition, not dismissal criteria
6. **Internal communication transparency** - replace Teams with in-system messaging (admin visibility)
7. **Mobile for operational efficiency** - hallway logging, intake signatures, motivational conversations
8. **Student self-assessment** - involve students in review process, transparent criteria
9. **Reconciliation mindset** - "looking for that penny" - flag discrepancies, allow manual override
10. **Teacher approval workflow** - protect families from overly zealous comments, default trust with override

{{technique_sessions}}

## Idea Categorization

### Immediate Opportunities (MVP - Phase 1)

_Must-haves for launch, core functionality_

1. **Student intake workflow** - Digital intake, room assignment, conflict management
2. **CSV import with reconciliation** - Daily roster + incident report, duplicate prevention via incident ID
3. **Attendance tracking** - Period-based (9:30am count), auto-extends end dates on absences
4. **Points system (110/day)** - Attendance-based accrual, teacher deductions, auto-calculation
5. **Teacher notes dropdown** ⭐ - Categorized behavior entries for data analysis
6. **Community service tracking** ⭐ - 100-point bonus, monthly cap, documentation
7. **Review process basics** - Digital checklist, review eligibility notifications, grade report generation
8. **Dashboard core views** - Active students roster, basic filtering, role-based access
9. **Daily meeting prep view** ⭐ - Quick button, command central, conflict alerts, intake schedule (staff notes added later)
10. **Student/parent portal (basic)** ⭐ - View own points, days left, notes (motivational conversations)
11. **TrespassTracker integration** - Shared tables, `is_daep` checkbox, single expiration date
12. **Mobile-responsive layout** - Works on iPad mini for hallway use
13. **Basic reporting** - Enrollment counts, attendance %, recidivism tracking
14. **Placement lifecycle tracking** - Start date, end date calculation, days served, status (active/completed/withdrawn)

### Future Innovations (Phase 2-3)

_Enhancements after MVP proven_

15. **Admin approval workflow** - Flag teachers requiring note approval before parent/student sees
16. **Internal staff communication** - Replace Teams with in-system messaging (admin visibility)
17. **Gamification** - Badges, streaks, peer recognition (non-stakes)
18. **Academic tracking in dashboard** - Teacher digital initials on assignments
19. **Student self-assessment workflow** - Review rubric, self-eval before admin meeting
20. **Transition form upload** - Home campus documents completion
21. **Manila folder tabs UI** - Multiple view types (roster, students, attendance, behavior)
22. **Saved views/filters** - Custom dashboards, at-risk highlighting
23. **iPad digital signatures** - Intake forms (acknowledgement, counseling, trespass)
24. **Teacher task delegation** - Banner notifications, checkbox completion tracking
25. **Hallway behavior logging** - Morning check-in from iPad (dress code, etc.)
26. **Parent contact tracking** - Log calls, results, admin escalation
27. **Code Yellow dashboard logging** - Move from radios to system (future)
28. **Home campus read-only access** - View rubric and communication (no input on decisions)

### Moonshots (Long-term Vision)

_Ambitious, transformative features_

29. **Predictive Code Yellow alerts** ⭐⭐⭐ - Pattern detection (3 bad periods → admin intervention) - HIGHEST IMPACT POTENTIAL
30. **Predictive analytics** - Which students likely to succeed/return based on patterns
31. **Teacher/room effectiveness analytics** - Period-level tracking, impact measurement
32. **API integration with Focus** - Replace CSV with real-time sync
33. **Shareable report links** - Pre-built reports accessible to campus users
34. **Voice search on mobile** - "Show me room 504"
35. **Student ID barcode scanning** - Quick lookup (requires ID cards with barcodes)
36. **Exit survey integration** - Required before review completion, track metrics over time

### Insights and Learnings

_Key realizations from the session_

**Critical Realizations:**

1. **One expiration date solves sync problems** - `is_daep` checkbox as toggle, always show furthest date, real-time updates (not batch)

2. **Incident ID is the deduplication key** - Student ID + Incident Number = unique placement, prevents double-counting

3. **PEMS codes prevent campus mapping chaos** - State-assigned codes more reliable than campus names

4. **Points from attendance, not from zero** - Students earn up to 110 points automatically by being present, teachers deduct for behavior (not earning up from zero)

5. **Registrar as single recipient simplifies** - Building distribution lists in-system = too complex, let registrar use existing Outlook lists

6. **Community service must be standardized** - Yes/No toggle (not manual points entry) prevents inflation/abuse

7. **Teacher approval workflow protects families** - Default trust, but admin can flag "overly zealous" teachers requiring approval before parent sees notes

8. **Predictive Code Yellow has highest impact potential** - Early intervention before crisis could transform student outcomes

9. **Rollover students break standard rules** - Must be handled explicitly: year-end "clock out", new year "clock in", recidivism per school year

10. **Manual override is non-negotiable** - Compassionate cases (funerals, special circumstances) require admin discretion regardless of calculated dates

## Action Planning

### Top 3 Priority Ideas

#### #1 Priority: CSV Import with Banking Reconciliation

**Rationale:**
- Foundation for all other features - can't track students without reliable data sync
- Solves current pain point: registrar manually checking Focus, updating Excel, often inaccurate
- Incident ID deduplication prevents metrics corruption (enrollment, recidivism, attendance %)
- "Expected vs actual" view catches operational gaps (registrar out sick, student not unenrolled)
- Single source of truth for enrollment data

**Next Steps:**
1. Design reconciliation dashboard showing discrepancies
2. Build import validation logic (Student ID + Incident Number unique constraint)
3. Create error notification system (flag bad rows, don't block entire import)
4. Implement manual override capability (corrections not overwritten by next import)
5. Map PEMS codes to campus names

**Resources Needed:**
- Sample CSV files from Focus (daily roster + incident report)
- PEMS code list (campus mapping)
- Database schema for daep_placements table
- Business rules documentation for import validation

**Timeline:** MVP Phase 1 - Week 1-2

---

#### #2 Priority: Points System (110/day) with Teacher Notes Dropdown

**Rationale:**
- Core daily operation for all staff (teachers, admin, students)
- Replaces ambiguous color-coded tiers with clear, measurable system
- Quick-tap dropdown reduces teacher burden (critical for adoption)
- Categorized notes enable data analysis ("lots of sleeping" trends)
- Auto-calculation from attendance prevents errors
- Teacher approval workflow protects families from inappropriate comments

**Next Steps:**
1. Design period structure (7 periods + 2 breaks + lunch + check-in = 110 points)
2. Create teacher quick-tap interface (buttons, not typing)
3. Build behavior note dropdown taxonomy (categorize common behaviors)
4. Implement admin approval workflow (flag specific teachers)
5. Design student-facing points dashboard (prominent, motivational)
6. Build auto-calculation engine (attendance → points)

**Resources Needed:**
- Current behavior categories list
- Teacher workflow observation (what do they need to log?)
- Point calculation business rules documentation
- Period schedule (timing, breaks, lunch)

**Timeline:** MVP Phase 1 - Week 2-3

---

#### #3 Priority: Review Process with Student Self-Assessment

**Rationale:**
- High-impact workflow - determines when students return home
- Currently paper-based (academic binder, CSV exports) - ripe for digitization
- Student involvement increases buy-in and transparency
- Automated workflow (review approval → grade report → notification) saves hours
- Digital academic tracking (teacher initials) eliminates paper binders
- "What's left" visibility helps students understand path to completion

**Next Steps:**
1. Design student self-assessment rubric (3 pillars: attendance, academics, behavior)
2. Create teacher review workflow (sign off on student self-assessment by lunch)
3. Build admin review screen (pre-populated data, "what's left" toggle)
4. Implement academic tracking (teacher checkbox + timestamp per assignment)
5. Automate grade report generation + notification on review approval
6. Design review eligibility notification system

**Resources Needed:**
- Current review criteria documentation
- Grade report PDF template (current format)
- Timeline requirements (student by lunch, admin by afternoon)
- Academic rubric used by teachers

**Timeline:** MVP Phase 1 - Week 3-4

## Reflection and Follow-up

### What Worked Well

- **Progressive technique flow** - Mind Mapping (broad) → Five Whys (deep) → What If Scenarios (edge cases) → SCAMPER (enhancement) provided comprehensive coverage without redundancy

- **Voice-to-text real-world examples** - Hearing actual operational challenges (73 rollover students, "looking for that penny", registrar out sick scenarios) grounded features in reality

- **Edge case exploration was critical** - Rollover students, manual override workflows, teacher approval process emerged as must-haves, not nice-to-haves. Would have missed these without structured "What If" prompts

- **SCAMPER forced systematic thinking** - Wouldn't have surfaced predictive Code Yellow alerts, teacher approval workflow, or internal staff communication replacement without structured enhancement prompts

- **Incremental categorization** - Starting with "everything is possible" then narrowing to MVP vs Future vs Moonshots helped prioritize without losing ideas

### Areas for Further Exploration

**High Priority (Before Development Starts):**

1. **Predictive Code Yellow alerts** - Pattern detection logic, what triggers alert, how admin responds, how to avoid false positives
2. **Teacher rotation tracking** - Teacher + Room + Period for effectiveness analytics (teachers move rooms, students don't)
3. **Rollover student workflow mechanics** - "Clock out/clock in" technical implementation, same vs different incident number handling
4. **Manual override rules** - When should system allow vs block? Compassionate cases vs data integrity boundaries

**Medium Priority (During MVP Development):**

5. **Gamification taxonomy** - Which badges make sense? Which streaks? Peer input mechanics without enabling bullying
6. **At-risk student algorithms** - What patterns = intervention needed? (head down 3 periods, point trends, absence patterns)
7. **Behavior note dropdown categories** - Build comprehensive taxonomy with teachers, ensure it covers 90% of cases

**Future Waves (Post-MVP):**

8. **Predictive recidivism analytics** - What predicts success? (community service participation, attendance patterns, engagement metrics)
9. **API integration with Focus** - When available, replace CSV with real-time sync, webhook notifications
10. **Shared report links** - Technical implementation, permission model, link expiration

### Recommended Follow-up Techniques

**For next session (Product Brief or PRD):**
- **User journey mapping** - Walk through registrar, teacher, admin, student, parent flows end-to-end
- **Technical deep-dive on TrespassTracker integration** - Database schema, foreign key relationships, sync triggers
- **Data model workshop** - Design tables, relationships, constraints for rollover students, attendance, behavior notes

**For architecture session:**
- **Database schema design** - Tables, indexes, foreign keys, constraints
- **Sync mechanism design** - Real-time vs batch, triggers vs polling
- **Mobile responsiveness strategy** - Responsive web vs native app considerations

**For implementation planning:**
- **Sprint planning** - Break MVP into 2-week sprints
- **Dependency mapping** - Which features block others? (CSV import blocks everything else)
- **Testing strategy** - How to validate with real data without disrupting current operations?

### Questions That Emerged

**Data & Integration:**
1. How often are CSV files available from Focus? Daily? Weekly? Affects reconciliation frequency
2. What's in the Focus CSV columns exactly? Need sample data for import validation
3. Which PEMS codes are used in your district? Need to build campus mapping table
4. Are there any existing APIs or webhooks available from Focus (even if not ready to use yet)?

**User Workflows:**
5. What's the current behavior note taxonomy/categories? Build teacher dropdown options
6. How many teachers/rooms/periods are there? Scope the teacher rotation tracking
7. What does the current grade report PDF template look like? Need to replicate format
8. What are the exact review criteria (the rubric)? Need for student self-assessment design

**Technical Infrastructure:**
9. Do students have any existing digital access? Portal infrastructure already exists or build from scratch?
10. What authentication system is used for TrespassTracker? Can DAEP piggyback on same system?
11. What's the hosting environment? Cloud, on-prem, hybrid?
12. Are there any compliance requirements beyond FERPA? (Texas-specific education regulations)

**Operational Readiness:**
13. Who will train teachers on the new system? Timeline for training?
14. Is there a pilot group willing to test before full rollout?
15. What's the fallback plan if system goes down? (Keep Excel BMS as backup initially?)

### Next Session Planning

**Suggested topics (in order):**

1. **Product Brief** (`/bmad:bmm:workflows:product-brief`)
   - Vision, goals, success metrics
   - MVP scope definition
   - User personas and use cases
   - Estimated 45-60 minutes

2. **Technical Architecture** (`/bmad:bmm:workflows:architecture`)
   - Database schema design
   - TrespassTracker integration architecture
   - Sync mechanisms (CSV import, real-time updates)
   - Mobile responsiveness strategy
   - Estimated 60-90 minutes

3. **PRD - Product Requirements Document** (`/bmad:bmm:workflows:prd`)
   - Detailed feature specifications
   - User stories with acceptance criteria
   - Edge cases and error handling
   - Estimated 90-120 minutes

**Recommended timeframe:** Within 1-2 days (while brainstorming insights are fresh)

**Preparation needed:**
- [ ] Sample Focus CSV files (daily roster + incident report) - send to secure location
- [ ] Current grade report PDF template
- [ ] List of PEMS codes for district campuses
- [ ] Current behavior note categories/taxonomy (if exists)
- [ ] Period schedule (timing, breaks, lunch structure)
- [ ] Teacher/admin availability for user journey validation (30 min interview)
- [ ] Access to TrespassTracker database schema documentation (if available)

---

## Session Complete ✅

**Date Completed:** 2025-11-24
**Duration:** ~2.5 hours (across multiple sessions)
**Techniques Used:** Mind Mapping, Five Whys, What If Scenarios, SCAMPER
**Total Ideas Generated:** 100+ features and requirements

**Outcome:** Comprehensive DAEP Module feature set documented with:
- 8 major workflow branches mapped
- 2 root cause problems solved
- 20+ edge cases analyzed
- 6 feature areas systematically enhanced
- 14 MVP features prioritized
- Top 3 implementation priorities identified

**Next Steps:**
1. Gather preparation materials (CSV samples, PEMS codes, templates)
2. Schedule Product Brief session within 1-2 days
3. Review this document before next session

**To start next workflow:**
- Run `/bmad:bmm:workflows:product-brief` for Product Brief
- Or `/bmad:bmm:workflows:architecture` for Technical Architecture

---

_Session facilitated using the BMAD CIS brainstorming framework_
