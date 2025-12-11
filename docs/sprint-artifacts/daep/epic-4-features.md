# Epic 4: Behavior Documentation - Customer Features

**For use on the Feedback/Changelog page**

---

## v0.4.2 - Behavior Notes List View

**Category:** DAEP Management
**Status:** Completed

### What's New

Administrators now have a dedicated page to review all behavior notes across students. Get instant situational awareness with summary stats, quick filters, and a searchable list.

### Key Features

- **Dedicated Notes Page**: New `/daep/behavior-notes` page in the sidebar navigation
- **Summary Stats Bar**: See total notes, today's count, negative incidents, and unverified items at a glance
- **Quick Filters**: One-click presets for Today, This Week, Negative, and My Notes
- **Advanced Filters**: Search by description, filter by category type, campus, staff, or date range
- **Sortable Table**: 7 columns (Date/Time, Student, Campus, Category, Description, Staff, Verified)
- **Detail Panel**: Click any row to see the full note in a slide-out sheet
- **CSV Export**: Download notes with 19 comprehensive columns for reporting
- **Student Avatars**: Visual thumbnails with initials fallback
- **"X New" Badge**: See how many notes have been added since your last visit

### Admin Workflow

Perfect for morning check-ins: Open the notes page, tap "Negative" to see incidents requiring attention, review details, and plan your day.

---

## v0.4.1 - Roster UI Improvements

**Category:** DAEP Management
**Status:** Completed

### What's New

The room roster is now more intuitive and easier to navigate. Click anywhere on a student row to jump directly to their profile - no more hunting for the right link.

### Key Improvements

- **Click-to-Navigate**: Click any student row to open their full profile page instantly
- **Visual Feedback**: Rows highlight with your theme color when you hover, so you always know what's clickable
- **Smarter Layout**: The "Expand" column now has a header, and we've tightened up spacing so everything feels more connected
- **Cleaner Labels**: "Adjust" column renamed to "Comments" for clarity
- **Protected Actions**: Attendance buttons, comment buttons, checkboxes, and expand arrows still work normally - they won't accidentally navigate you away

---

## v0.4.0 - Quick Behavior Notes & Point Entry

**Category:** DAEP Management
**Status:** Completed

### What's New

Add behavior notes and point adjustments directly from the room roster without navigating away. Our goal: complete an entry in under 30 seconds.

### Key Features

- **Quick Point Buttons**: Select students and tap [-15] [-10] [-5] [0] [+5] to apply points instantly
- **Inline Entry Panel**: Click the expand arrow next to any student to open a quick entry form right in the roster
- **Recent Activity**: See the last 5 activities (points, notes, attendance) for each student without leaving the page
- **Color-Coded Categories**: Behavior categories are now grouped (Positive/Negative/Neutral) with color-coded badges for instant recognition
- **Timestamps**: Activity items show when they happened and who made them (e.g., "Dec 10 @ 1:35pm - Wallace")

### Workflow Improvement

Before: Navigate to student profile → Find Activity tab → Add entry → Navigate back to roster
Now: Click expand → Fill form → Save → Done (stay in roster)

---

## Coming Soon in Epic 4

- Attach Notes to Incidents (Story 4-4)
- Student Profile Timeline (Story 4-5)
