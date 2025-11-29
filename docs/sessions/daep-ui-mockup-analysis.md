# DAEP Module UI Mockup Analysis

**Source:** bolt.new mockup (dap-student-dashboar-k5ih.bolt.host)
**Date Analyzed:** 2025-11-23
**Status:** Initial mockup - starting point for development

---

## Executive Summary

This document analyzes the DAEP (Disciplinary Alternative Education Program) student dashboard UI mockup created in bolt.new. The design provides a comprehensive foundation for managing DAEP student placements, attendance, behavior tracking, and reporting.

**Key Focus Area:** The incident tracking system is **critical** for integration with TrespassTracker, as incident codes/numbers drive recidivism calculations and placement expiration dates.

---

## Screen-by-Screen Analysis

### 1. Dashboard Overview

**Purpose:** Executive dashboard for monitoring key program metrics and daily operations

**Layout:**
- Dark sidebar navigation (left)
- Main content area with KPI cards and activity sections
- Light background (#F9FAFB or similar)

**KPI Cards (4 metrics):**

| Metric | Value | Trend | Icon |
|--------|-------|-------|------|
| Student Enrollment | 247 | +12% ↗ | Users icon (blue) |
| Discipline Cases | 34 | -8% ↘ | Warning triangle (yellow) |
| Attendance Rate | 92.4% | +2.1% ↗ | Calendar (green) |
| Recidivism Rate | 15.3% | -3.2% ↘ | Trending down (red) |

**Design Pattern:** Cards with light background, large numbers, trend indicators (green=up/good, red=down/bad)

**Scheduled Intakes Section:**
- Date display: "Sunday, November 23"
- Primary action: "Add Student" button (blue)
- Tab navigation: Today / Tomorrow
- Intake list showing:
  - Time (9:00 AM, 10:30 AM, 1:00 PM)
  - Student name
  - Student ID (format: STU-2024-001)
  - School name
  - **Incident Code** (Inc: INC-2024-045)
  - "No Show" status button (red, outlined)

**Pending Actions Panel:**
- Alert cards with color-coded icons:
  - Red circle-x: No-show needs reschedule (2 entries)
  - Orange clock: Review date approaching
  - Blue calendar: Intake scheduled

**Integration Point #1:**
- **Incident Code (Inc: INC-2024-045)** appears in scheduled intakes
- This likely references `trespass_records.id` or a separate incident tracking system
- **CRITICAL:** Must establish data model linking incidents to DAEP placements

---

### 2. Room Rosters

**Purpose:** Manage student assignments by classroom and track daily progress

**Layout:**
- Room selector dropdown (currently: 501)
- Room summary card: "Room 501 - 5 students assigned - Average Points: 80"
- Student cards in vertical list

**Student Card Components:**
- Left side:
  - Avatar (initials, colored circle: blue, orange, teal)
  - Student name (bold)
  - Student ID (STU-0001 format)
- Middle columns:
  - **Days Served:** 45
  - **Days Remaining:** 135
  - **Current Points:** 85, 72, 95 (color-coded)
- Right side:
  - **Behavior Note** section with "Add Note" button (blue)
  - Recent note display: "+5 pts - On Task" / "Positive Recognition"
- Bottom actions:
  - "View Details" (gray text)
  - "Attendance" (blue link)
- Status badge: "Excellent" (green), "Good" (orange)

**Points System:**
- Color coding: Green (85+), Orange (70-84), likely Red (<70)
- Displayed prominently as a key performance indicator
- Tied to behavior notes

**Integration Point #2:**
- **Days Served / Days Remaining** calculation critical for:
  - Placement expiration dates
  - Determining when student returns to home campus
  - Recidivism tracking (time between placements)

---

### 3. Add Behavior Note Modal

**Purpose:** Record behavior incidents and rewards with points

**Form Fields:**
1. **Points** (dropdown, default: 0)
   - Positive values for rewards
   - Negative values for infractions

2. **Student Action** (dropdown: "Select action...")
   - Likely options: On Task, Helping Others, Disruption, etc.

3. **Teacher Action** (dropdown: "Select action...")
   - Likely options: Verbal Warning, Parent Contact, Positive Recognition, etc.

4. **Visibility Toggle**
   - Checkbox: "Make visible to students and parents"
   - Privacy control for sensitive notes

**Actions:**
- Cancel (gray)
- Save Note (blue, primary)

**Design Pattern:**
- Clean modal overlay with white background
- Standard form layout
- Dropdowns for consistency
- Clear privacy control

**Integration Point #3:**
- Behavior notes should create audit log entries
- Integrate with notification system (parents, admin)
- Tie into `admin_audit_log` table pattern from TrespassTracker

---

### 4. Students List View

**Purpose:** Searchable, filterable master list of all DAEP students

**Header Actions:**
- Search bar: "Search by name, student ID, or roster..."
- Filter button (funnel icon)
- Export button (download icon)
- "Add Student" button (blue, primary)

**Table Columns:**

| Column | Data Type | Example | Notes |
|--------|-----------|---------|-------|
| Student | Name + Avatar + Date | Jordan Mitchell<br/>Enrolled 1/14/2024 | Initials in colored circle |
| Student ID | Text | STU-2024-001 | Year-based ID format |
| Grade | Text | 10th, 11th, 9th | Grade level |
| Roster | Text | Morning Session A | Room assignment |
| Attendance | Percentage | 94%, 88%, 96% | Color-coded (green=good) |
| Discipline | Number | 2, 1, 0, 3 | **Incident count** |
| Status | Badge | Active, At Risk | Color-coded status |

**Pagination:**
- "Showing 6 of 247 students"
- Previous / Next buttons

**Design Pattern:**
- Clean table with alternating row colors
- Avatar + text combination
- Color-coded status badges
- Responsive layout

**Integration Point #4:**
- **Discipline column** shows incident count
- This is **KEY** for recidivism calculation
- Must query both:
  - Historical trespass_records where `is_daep = true`
  - DAEP placement records
- **CRITICAL:** Need to track incident numbers across both systems

---

### 5. Student Detail Panel - Overview

**Purpose:** Comprehensive student profile with personal info and contact details

**Layout:** Right-side drawer/panel overlay on students list

**Header:**
- Large avatar (initials)
- Student name (bold, large)
- Student ID (STU-2024-001)

**Student Information Section:**
- Date of Birth: 5/11/2008
- Gender: Male
- Race/Ethnicity: African American
- Grade: 10th

**Contact Information Section:**
- Address: 1234 Oak Street, Austin, TX 78701

**Guardian Information Section:**
- **Primary Guardian:**
  - Name: Patricia Mitchell
  - Relationship: Mother
  - Phone: (512) 555-0123
  - Email: patricia.mitchell@email.com

- **Secondary Contact:**
  - Name: Marcus Mitchell
  - Phone: (512) 555-0124

**Performance Metrics Section:** (Partially visible)
- Attendance Rate: 94% (with progress bar, green)
- Discipline Incidents: 2 (orange)
- Status: Active (green badge)

**Actions:**
- "Edit Student" button (bottom left)
- "Add New Placement" button (bottom right, blue, primary)

---

### 6. Student Detail Panel - Placement History

**Purpose:** Track all DAEP placements for a student (critical for recidivism)

**Placement Overview Card:**
- **Badge:** "2nd Time" (indicates repeat offender)
- **Metrics:**
  - Total Placements: **2**
  - Active: **1**
  - Days Owed: **30**

**Current Placement Card (ACTIVE badge):**
- **Title:** Code 02 - Insubordination
- **Dates:** 1/14/2024 • 15/45 days **(30 remaining)** in red
- **Details:**
  - Start Date: 1/14/2024
  - **Offense Code: 02** ← **CRITICAL FIELD**
  - Days Served: **15/45**
  - Days Remaining: **30** ← **CRITICAL for expiration**
  - Placement Reason: "Repeated disruption in classroom"
  - Home Campus: Lincoln High School
  - **Progress: 33%** (progress bar, blue)

**Previous Placement Card (#1):**
- **Title:** Code 04 - Fighting/Physical Altercation
- **Dates:** 9/14/2023 • 20/20 days
- **Badge:** Complete (green)
- **Collapsible:** Can expand to see details

**Expanded Previous Placement Details:**
- Start Date: 9/14/2023
- End Date: 10/4/2023
- **Offense Code: 04** ← **CRITICAL FIELD**
- Days Served: **20/20**
- **Final Status: Complete** (green)
- Placement Reason: "Physical altercation with another student"
- Home Campus: Lincoln High School

**Recent Behavior Notes:**
- Date: 1/19/2024
- Points: +5 pts (green)
- Action: On Task
- Category: Positive Recognition
- Visibility: Public

**Design Patterns:**
- Accordion-style placement history
- Active placements prominently displayed
- Color-coded status badges
- Progress bars for active placements
- Chronological ordering (newest first)

**Integration Point #5 - MOST CRITICAL:**

This section contains the **KEY integration points** with TrespassTracker:

1. **Offense Codes (02, 04):**
   - These must map to incident types from TrespassTracker
   - Need mapping table: offense_code → incident_description
   - Should reference `trespass_records.incident_description` or create code system

2. **Days Served / Days Remaining:**
   - **Formula for Days Remaining:** `placement_end_date - current_date`
   - **Days Owed** (30) suggests penalties/extensions
   - **CRITICAL:** This determines when student returns to home campus
   - Must handle:
     - Attendance-based adjustments (absences extend placement)
     - Behavior-based adjustments (incidents extend placement)
     - Court-ordered vs school-determined durations

3. **Recidivism Calculation:**
   - **Total Placements: 2** = This student has been in DAEP twice
   - "2nd Time" badge calculated from placement count
   - **Recidivism Rate (15.3% on dashboard)** likely calculated as:
     ```
     (Students with > 1 placement) / (Total students ever in DAEP) * 100
     ```
   - **Time Between Placements** important metric:
     - Placement 1 ended: 10/4/2023
     - Placement 2 started: 1/14/2024
     - Gap: ~3.5 months
   - **CRITICAL:** Must track:
     - First offense date
     - Subsequent offense dates
     - Time intervals between offenses
     - Whether offenses occurred before/during/after DAEP

4. **Incident Number Tracking:**
   - Each placement references an **Offense Code**
   - This should link to `trespass_records.id` or similar
   - **Data Model Needs:**
     ```sql
     daep_placements
       ├─ placement_id (PK)
       ├─ student_id (FK → students)
       ├─ trespass_record_id (FK → trespass_records.id) ← CRITICAL
       ├─ offense_code (e.g., '02', '04')
       ├─ offense_description
       ├─ start_date
       ├─ planned_end_date
       ├─ actual_end_date
       ├─ days_assigned (e.g., 45, 20)
       ├─ days_served (calculated from attendance)
       ├─ days_remaining (calculated)
       ├─ placement_reason (text)
       ├─ home_campus_id (FK)
       ├─ current_roster_room
       ├─ status ('active', 'completed', 'terminated')
       └─ placement_number (for this student, e.g., 1, 2)
     ```

5. **Expiration Date Calculation:**
   - **Formula:** `start_date + days_assigned + days_owed - days_served`
   - Must account for:
     - Weekends (don't count toward days served)
     - School holidays (don't count)
     - Absences (extend placement)
     - Behavioral incidents (may add days)
   - Links to `trespass_records.daep_expiration_date` field

---

### 7. Reports Page

**Purpose:** Generate and download comprehensive program reports

**Layout:** Grid of report categories with expandable sections

**Custom Report Builder:**
- Card at top
- "Build Custom Report" button (blue)
- Description: "Create a custom report with specific date ranges and metrics"

**Report Categories (4 sections):**

**1. Enrollment Reports (Blue icon - trending up):**
- Monthly Enrollment Summary
- Grade Level Distribution
- New Enrollment Trends
- Enrollment by Program
- "View All Reports" button (light blue)

**2. Attendance Reports (Green icon - calendar):**
- Daily Attendance Summary
- Weekly Attendance Trends
- Student Attendance Records
- Chronic Absence Report
- "View All Reports" button (light green)

**3. Discipline Reports (Yellow icon - document):**
- Incident Summary Report
- Incident Type Breakdown
- Student Discipline History
- Intervention Effectiveness
- "View All Reports" button (light yellow)

**4. Recidivism Reports (Pink/Red icon - pie chart):**
- Recidivism Rate Analysis ← **CRITICAL**
- Program Success Metrics
- Long-term Student Outcomes
- Comparison by Demographics
- "View All Reports" button (light pink)

**Recent Reports Section:**
- List of generated reports with:
  - Report name
  - Category tag (Enrollment, Attendance, Discipline)
  - Date generated
  - File size
  - "Download" button

**Examples:**
- Monthly Enrollment Summary - January 2024 (1/24/2024, 2.4 MB)
- Weekly Attendance Report - Week 3 (1/21/2024, 1.8 MB)
- Discipline Incident Analysis - Q1 (1/19/2024, 3.1 MB)

**Integration Point #6:**
- **Recidivism Rate Analysis** report is critical
- Must calculate:
  - Total unique students in DAEP (historical)
  - Students with multiple placements
  - Time between placements (recidivism window)
  - Recidivism rate by demographics, offense type, home campus
- Should export to Excel/PDF (like TrespassTracker)

---

### 8. Settings Page

**Purpose:** System configuration and user preferences

**Layout:** Vertical sections with form controls

**Profile Settings:**
- Full Name: Administrator (read-only or editable)
- Email Address: admin@dap.edu
- Role: System Administrator (likely read-only)

**Notification Preferences:**
- Email Notifications (toggle: ON)
- Student Intake Alerts (toggle: ON)
- Attendance Alerts (toggle: OFF)
- Discipline Incident Alerts (toggle: ON)

**Security & Privacy:**
- Two-Factor Authentication (toggle: ON)
- Session Timeout: 30 minutes (dropdown)
- Data Export Permissions (toggle: ON)

**System Configuration:**
- Academic Year: 2023-2024 (dropdown)
- Default Roster Capacity: 30 (number input)
- Attendance Threshold: 85% (percentage input)

**Email Integration:**
- SMTP Server: smtp.example.com
- SMTP Port: 587
- Use TLS/SSL (toggle: ON)

**Regional Settings:**
- Time Zone: Eastern Time (ET) (dropdown)
- Date Format: MM/DD/YYYY (dropdown)
- Language: English (dropdown)

**Actions:**
- Cancel (gray)
- Save Changes (blue, primary)

**Integration Point #7:**
- Should sync with TrespassTracker settings
- Multi-tenant considerations (settings per tenant)
- SMTP configuration for notifications

---

## Navigation Structure

**Sidebar Menu (Dark background - #1E293B or similar):**

| Icon | Label | Route | Purpose |
|------|-------|-------|---------|
| Grid | Dashboard | `/daep/dashboard` | KPI overview |
| Users | Rosters | `/daep/rosters` | Room assignments |
| User | Students | `/daep/students` | Student list |
| Document | Reports | `/daep/reports` | Reporting |
| Gear | Settings | `/daep/settings` | Configuration |

**Design Pattern:**
- Active state: Bright blue background (#3B82F6)
- Inactive: Light gray text
- Icons aligned left with labels
- Clean, minimal design

---

## Design System Analysis

### Color Palette

**Primary Colors:**
- **Blue (Primary):** #3B82F6 (buttons, active states, links)
- **Dark Navy (Sidebar):** #1E293B
- **Background Gray:** #F9FAFB

**Status Colors:**
- **Green (Success/Good):** #10B981 (Active status, good attendance)
- **Orange (Warning):** #F59E0B (At Risk status, moderate attendance)
- **Red (Danger/Alert):** #EF4444 (No Show, critical alerts)
- **Yellow (Caution):** #FCD34D (Discipline cases icon)

**Semantic Usage:**
- Attendance: Green (94%+), Orange (85-93%), Red (<85%)
- Status: Green (Active), Orange (At Risk), Red (Suspended)
- Trends: Green arrow up (good), Red arrow down (bad)

### Typography

**Hierarchy:**
- **Page Headers:** ~32px, bold (e.g., "Dashboard Overview")
- **Section Headers:** ~20px, semi-bold (e.g., "Scheduled Intakes")
- **Card Titles:** ~16px, semi-bold
- **Body Text:** ~14px, regular
- **Labels/Metadata:** ~12px, regular, gray

**Font Family:** Likely Inter, SF Pro, or similar modern sans-serif

### Component Patterns

**Cards:**
- White background
- Subtle shadow (shadow-sm)
- Rounded corners (8px)
- 16px padding
- Border: None or 1px light gray

**Buttons:**
- **Primary:** Blue background, white text, rounded
- **Secondary:** White background, gray border, gray text
- **Danger:** Red outline, red text (e.g., "No Show")
- **Sizes:** Regular (~40px height), Small (~32px)

**Badges:**
- Rounded corners (full rounded)
- Color-coded backgrounds
- White or colored text
- Small padding (4px 12px)

**Avatars:**
- Circular
- Colored backgrounds (blue, orange, teal, purple, etc.)
- White initials (2 letters)
- Consistent size (40px typical)

**Form Controls:**
- Standard height (~40px)
- Light gray border
- Rounded corners (6px)
- Focus state: Blue border

**Tables:**
- Alternating row colors (white/light gray)
- Header row: Bold, slightly darker background
- Left-aligned text (except numbers: right-aligned)
- 12-16px row padding

---

## Critical Integration Requirements

### 1. Incident Tracking Integration

**Problem Statement:**
The DAEP system must accurately track incident numbers/codes to:
- Link DAEP placements to originating trespass incidents
- Calculate recidivism rates (students with multiple incidents)
- Determine placement expiration dates
- Generate accurate reporting

**Data Model Requirements:**

```sql
-- New DAEP tables needed:

CREATE TABLE daep_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL, -- FK to students table (new)
  trespass_record_id uuid NULL, -- FK to trespass_records.id (CRITICAL LINK)
  offense_code text NOT NULL, -- e.g., '02', '04' (code system)
  offense_description text NOT NULL, -- e.g., 'Insubordination'
  start_date date NOT NULL,
  planned_end_date date NOT NULL, -- Calculated at placement
  actual_end_date date NULL, -- Set when placement completes
  days_assigned integer NOT NULL, -- e.g., 45 days
  days_served integer DEFAULT 0, -- Calculated from attendance
  days_owed integer DEFAULT 0, -- Additional days from incidents
  placement_reason text NOT NULL,
  home_campus_id uuid NOT NULL, -- FK to campuses
  current_roster_room text NULL, -- e.g., '501'
  placement_number integer NOT NULL, -- 1, 2, 3... (for recidivism)
  status text NOT NULL DEFAULT 'active', -- 'active', 'completed', 'terminated'
  progress_percentage integer DEFAULT 0, -- 0-100
  tenant_id text NOT NULL, -- FK to tenants
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (trespass_record_id) REFERENCES trespass_records(id),
  FOREIGN KEY (home_campus_id) REFERENCES campuses(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE daep_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id_number text NOT NULL, -- e.g., 'STU-2024-001'
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text,
  race_ethnicity text,
  grade text NOT NULL, -- '9th', '10th', etc.
  home_campus_id uuid NOT NULL,
  address text,
  tenant_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (home_campus_id) REFERENCES campuses(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(student_id_number, tenant_id)
);

CREATE TABLE daep_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL, -- FK to daep_students
  guardian_name text NOT NULL,
  relationship text NOT NULL, -- 'Mother', 'Father', etc.
  phone text,
  email text,
  is_primary boolean DEFAULT false,
  tenant_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (student_id) REFERENCES daep_students(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE daep_behavior_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL, -- FK to daep_students
  placement_id uuid NOT NULL, -- FK to daep_placements
  points integer NOT NULL, -- Positive or negative
  student_action text, -- e.g., 'On Task', 'Disruption'
  teacher_action text, -- e.g., 'Positive Recognition'
  note_text text,
  is_visible_to_parents boolean DEFAULT false,
  recorded_by text NOT NULL, -- User ID
  tenant_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (student_id) REFERENCES daep_students(id) ON DELETE CASCADE,
  FOREIGN KEY (placement_id) REFERENCES daep_placements(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE daep_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  placement_id uuid NOT NULL,
  attendance_date date NOT NULL,
  status text NOT NULL, -- 'present', 'absent', 'tardy', 'excused'
  roster_room text,
  notes text,
  tenant_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (student_id) REFERENCES daep_students(id) ON DELETE CASCADE,
  FOREIGN KEY (placement_id) REFERENCES daep_placements(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(student_id, attendance_date, tenant_id)
);

CREATE TABLE daep_offense_codes (
  code text PRIMARY KEY, -- e.g., '02', '04'
  description text NOT NULL, -- e.g., 'Insubordination'
  default_days integer, -- Default placement duration
  category text, -- e.g., 'Disruption', 'Violence', 'Substance'
  severity text, -- 'Minor', 'Moderate', 'Severe'
  tenant_id text NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

**Key Relationships:**

```
trespass_records (TrespassTracker)
    ├─ is_daep = true (flag)
    ├─ daep_expiration_date (calculated)
    └─ Links to → daep_placements.trespass_record_id

daep_students
    └─ Multiple placements → daep_placements
        ├─ Linked to trespass_records
        ├─ Multiple behavior notes
        └─ Daily attendance records

Recidivism Calculation:
    - Count placements per student (placement_number)
    - Track time between placements
    - Link back to original trespass incidents
```

### 2. Expiration Date Calculation

**Algorithm:**

```typescript
function calculateDAEPExpirationDate(
  startDate: Date,
  daysAssigned: number,
  attendanceRecords: AttendanceRecord[]
): Date {
  let daysServed = 0;
  let currentDate = new Date(startDate);

  // Count school days only (M-F, excluding holidays)
  while (daysServed < daysAssigned) {
    currentDate.setDate(currentDate.getDate() + 1);

    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Skip school holidays (check district calendar)
    if (isSchoolHoliday(currentDate)) continue;

    // Check attendance for this date
    const attendance = attendanceRecords.find(
      r => isSameDay(r.attendance_date, currentDate)
    );

    // Only count present/tardy days
    if (attendance && ['present', 'tardy'].includes(attendance.status)) {
      daysServed++;
    }
    // Absent days extend the placement
  }

  return currentDate;
}

// Update trespass_records.daep_expiration_date
async function syncExpirationToTrespassTracker(
  placementId: string,
  expirationDate: Date
) {
  const placement = await getPlacement(placementId);

  if (placement.trespass_record_id) {
    await supabase
      .from('trespass_records')
      .update({ daep_expiration_date: expirationDate })
      .eq('id', placement.trespass_record_id);
  }
}
```

### 3. Recidivism Rate Calculation

**Algorithm:**

```typescript
interface RecidivismMetrics {
  totalStudents: number; // All-time unique students
  studentsWithMultiplePlacements: number;
  recidivismRate: number; // Percentage
  averageTimeBetweenPlacements: number; // Days
  recidivismByDemographic: {
    grade: Record<string, number>;
    offenseType: Record<string, number>;
    campus: Record<string, number>;
  };
}

async function calculateRecidivismMetrics(
  tenantId: string
): Promise<RecidivismMetrics> {
  // Get all students who have ever been in DAEP
  const allStudents = await supabase
    .from('daep_students')
    .select('id')
    .eq('tenant_id', tenantId);

  const totalStudents = allStudents.data?.length || 0;

  // Get students with multiple placements
  const studentsWithPlacements = await supabase
    .from('daep_placements')
    .select('student_id, start_date')
    .eq('tenant_id', tenantId)
    .order('student_id, start_date');

  // Group by student and count placements
  const placementsByStudent = groupBy(
    studentsWithPlacements.data,
    'student_id'
  );

  let studentsWithMultiplePlacements = 0;
  let totalTimeBetweenPlacements = 0;
  let placementPairs = 0;

  Object.values(placementsByStudent).forEach(placements => {
    if (placements.length > 1) {
      studentsWithMultiplePlacements++;

      // Calculate time between placements
      for (let i = 1; i < placements.length; i++) {
        const daysBetween = daysBetweenDates(
          placements[i - 1].start_date,
          placements[i].start_date
        );
        totalTimeBetweenPlacements += daysBetween;
        placementPairs++;
      }
    }
  });

  const recidivismRate = totalStudents > 0
    ? (studentsWithMultiplePlacements / totalStudents) * 100
    : 0;

  const averageTimeBetweenPlacements = placementPairs > 0
    ? totalTimeBetweenPlacements / placementPairs
    : 0;

  return {
    totalStudents,
    studentsWithMultiplePlacements,
    recidivismRate: Math.round(recidivismRate * 10) / 10, // 15.3%
    averageTimeBetweenPlacements: Math.round(averageTimeBetweenPlacements),
    recidivismByDemographic: {
      // Additional queries for demographic breakdown
      grade: {},
      offenseType: {},
      campus: {}
    }
  };
}
```

### 4. TrespassTracker Integration Points

**Workflow:**

1. **Incident Occurs in TrespassTracker:**
   - Admin creates `trespass_record`
   - Sets `is_daep = true`
   - Leaves `daep_expiration_date` NULL initially

2. **DAEP Intake Scheduled:**
   - Admin schedules intake in DAEP system
   - Links to `trespass_record_id`
   - Student appears in "Scheduled Intakes" on dashboard

3. **DAEP Placement Created:**
   - Student intake occurs
   - Create `daep_placements` record:
     - Set `trespass_record_id`
     - Calculate `planned_end_date` from `days_assigned`
     - Set `placement_number` (1 for first placement, 2 for second, etc.)
   - Update `trespass_records.daep_expiration_date`

4. **Daily Attendance Tracking:**
   - Record attendance in `daep_attendance`
   - Recalculate `days_served` and `days_remaining`
   - Update `daep_expiration_date` if absences extend placement
   - Sync to `trespass_records.daep_expiration_date`

5. **Behavior Notes:**
   - Record in `daep_behavior_notes`
   - If severe incident, may add `days_owed` to placement
   - Update expiration date accordingly
   - Create `admin_audit_log` entry

6. **Placement Completion:**
   - Set `daep_placements.status = 'completed'`
   - Set `actual_end_date`
   - Keep `trespass_records.daep_expiration_date` for historical record
   - Student returns to home campus

7. **Recidivism Detection:**
   - If student gets new trespass incident with `is_daep = true`
   - Create new `daep_placements` record
   - Increment `placement_number`
   - Calculate time since last placement
   - Update dashboard "2nd Time" badges

**Shared Data Elements:**

| TrespassTracker Field | DAEP Field | Sync Direction |
|-----------------------|------------|----------------|
| `trespass_records.id` | `daep_placements.trespass_record_id` | TT → DAEP (reference) |
| `trespass_records.is_daep` | N/A | TT sets flag |
| `trespass_records.daep_expiration_date` | Calculated from `daep_placements` | DAEP → TT (sync) |
| `trespass_records.incident_description` | `daep_offense_codes.description` | Mapping required |
| `trespass_records.first_name, last_name` | `daep_students.first_name, last_name` | May need sync |
| `trespass_records.campus_id` | `daep_students.home_campus_id` | Should match |

---

## Feature Gaps & Enhancements

### Missing from Mockup:

1. **Intake Workflow:**
   - No intake form shown
   - Need student information capture
   - Guardian information input
   - Placement details (offense code, days assigned)

2. **Attendance Taking Interface:**
   - "Attendance" link in rosters, but no attendance UI shown
   - Need daily attendance capture interface
   - Bulk attendance (take whole roster at once)

3. **Room Management:**
   - No interface to create/edit rooms
   - Room capacity management
   - Room assignment workflow

4. **Notification System:**
   - Settings show notifications enabled
   - No notification UI shown
   - Need parent notifications (email/SMS)

5. **Export Functionality:**
   - "Export" button on students list
   - No export configuration shown
   - Should support Excel/PDF like TrespassTracker

6. **Filter Interface:**
   - "Filter" button on students list
   - No filter panel shown
   - Need filters for: status, grade, roster, date range

7. **Custom Report Builder:**
   - Button shown but no interface
   - Need form to select metrics, date ranges, filters

8. **User Management:**
   - No admin user management interface
   - Need to assign DAEP staff roles

### Recommended Additions:

1. **Calendar View:**
   - Visual calendar for intakes
   - Attendance calendar per student
   - Expiration date calendar

2. **Parent Portal:**
   - Parents view student progress
   - View behavior notes (if marked visible)
   - View attendance
   - Cannot edit anything

3. **Student Portal:** (Optional)
   - Students view their own points
   - View visible behavior notes
   - View days remaining

4. **Placement Timeline:**
   - Visual timeline of student's placement history
   - Shows gaps between placements
   - Highlights recidivism patterns

5. **Alerts Dashboard:**
   - Students nearing expiration
   - Students with low attendance
   - Students with declining behavior points
   - Students at risk of extension

6. **Mobile App/Responsive:**
   - Mockup is desktop-focused
   - Need mobile views for:
     - Attendance taking (tablets in classroom)
     - Behavior note entry
     - Dashboard viewing

---

## Component Library Mapping

**Map to Radix UI + Tailwind (matching TrespassTracker):**

| Mockup Component | Radix UI Component | Custom Styling |
|------------------|-------------------|----------------|
| Modal (Add Behavior Note) | Dialog | Standard modal |
| Dropdown (Points, Actions) | Select | Custom trigger |
| Student Detail Panel | Sheet | Right-side drawer |
| Status Badges | Badge | Color variants |
| Buttons | Button | Variants: primary, secondary, danger |
| Avatar Circles | Avatar | With fallback initials |
| Data Table | Table | Custom sorting/pagination |
| Cards (KPI, Placement) | Card | Shadow + border |
| Tabs (Today/Tomorrow) | Tabs | Underline style |
| Toggle Switches | Switch | Settings page |
| Progress Bars | Progress | Linear progress |
| Alerts (Pending Actions) | Alert | Color variants |

---

## Responsive Design Considerations

**Breakpoints:**
- Desktop: 1280px+ (shown in mockup)
- Tablet: 768-1279px (need to design)
- Mobile: < 768px (need to design)

**Mobile Adaptations Needed:**
- Collapse sidebar to hamburger menu
- Stack KPI cards vertically
- Convert table to card list
- Reduce padding/spacing
- Simplify student detail panel

---

## Performance Considerations

**Large Data Sets:**
- 247 students shown in pagination
- Need efficient querying:
  - Index on `student_id`, `tenant_id`, `status`
  - Index on `placement_id`, `start_date`
  - Index on `attendance_date` for date range queries

**Real-time Updates:**
- Attendance changes affect days remaining
- Behavior notes change points
- Need efficient recalculation triggers

**Caching:**
- Cache dashboard KPIs (refresh every 5 minutes)
- Cache student list (refresh on mutation)
- Cache report results

---

## Accessibility (WCAG 2.1 AA)

**Requirements:**
- Color contrast ratios: 4.5:1 for text
- Keyboard navigation for all interactive elements
- ARIA labels for icons
- Focus indicators
- Screen reader support
- Form labels and error messages

**Current Mockup:**
- Good color contrast (dark text on light background)
- Status colors may need testing for color-blind users
- Need keyboard shortcuts for common actions

---

## Next Steps for Development

### Phase 1: Foundation
1. Create database schema (tables above)
2. Set up RLS policies (follow TrespassTracker patterns)
3. Create API contracts (Server Actions)
4. Build shared UI components

### Phase 2: Core Features
1. Dashboard with KPI cards
2. Students list with search/filter
3. Student detail panel with placement history
4. Intake workflow

### Phase 3: Daily Operations
1. Room rosters interface
2. Attendance taking
3. Behavior notes
4. Points tracking

### Phase 4: Reporting
1. Reports page
2. Custom report builder
3. Export functionality
4. Recidivism analysis

### Phase 5: Integration
1. Link to TrespassTracker incidents
2. Sync expiration dates
3. Cross-module reporting
4. Unified audit logging

---

## Summary

This bolt.new mockup provides an **excellent foundation** for the DAEP module. The design is clean, professional, and aligns well with modern SaaS patterns.

**Strengths:**
- Comprehensive feature coverage
- Clear information hierarchy
- Good use of color coding
- Professional aesthetic
- Integration thinking (incident codes, placement history)

**Critical Development Focus:**
- **Incident tracking integration** with TrespassTracker
- **Expiration date calculation** with attendance and behavior adjustments
- **Recidivism calculation** with placement history tracking
- **Data model** linking DAEP placements to trespass incidents

**Key Metrics to Track:**
- Days Served / Days Remaining (per placement)
- Total Placements (per student) → Recidivism
- Offense Codes → Link to TrespassTracker
- Behavior Points → Placement extensions
- Attendance Rate → Days served calculation

This mockup should be used as the **visual and functional spec** for DAEP module development, with careful attention to the incident tracking integration points highlighted throughout this document.
