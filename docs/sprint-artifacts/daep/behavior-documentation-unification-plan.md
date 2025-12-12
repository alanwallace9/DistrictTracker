# Behavior Documentation Unification Plan

**Created:** 2025-12-10
**Context:** Story 4-4 implementation revealed fragmentation in behavior/activity entry and display

---

## Problem Statement

The current DAEP behavior documentation system has multiple entry points and display locations that create confusion:

1. **Fragmented Entry Points:**
   - InlineStudentPanel (chevron expansion in room roster) - points + behavior notes
   - Behavior Notes page (admin view) - view only, no add
   - Student profile page - "Add Note" button (mentioned but not fully implemented)
   - Activity Timeline tab - shows StudentPointsLog (points history only)

2. **Fragmented Display Locations:**
   - `/daep/behavior-notes` - Admin-focused table view with slide-in detail sheet
   - Room roster inline panel - CompactActivityItem (condensed single-line)
   - Student profile Activity tab - StudentPointsLog (points-focused cards)
   - Current Placement Card - PlacementActivityPreview (abbreviated)

3. **UX Issues:**
   - Teachers enter data in roster, admins review in separate page
   - Parents/students viewing profile see different format than teachers see
   - Audit process requires cross-referencing multiple locations
   - Slide-in detail sheet may not be optimal for quick scanning

---

## Current Components Analysis

### Entry Components

| Component | Location | Purpose | Data Created |
|-----------|----------|---------|--------------|
| `InlineStudentPanel` | Room roster (chevron) | Quick entry during class | Points + behavior notes |
| `PointAdjustmentDialog` | StudentPointsLog edit | Edit existing points | Updates point entries |
| (Missing) | Student profile | Add note without placement | Behavior notes only |

### Display Components

| Component | Location | Target User | Format |
|-----------|----------|-------------|--------|
| `BehaviorNotesTable` | /behavior-notes | Admin | Full table, paginated |
| `BehaviorNoteDetailSheet` | /behavior-notes click | Admin | Slide-in panel |
| `CompactActivityItem` | Roster inline panel | Teacher | Single-line condensed |
| `StudentPointsLog` | Profile Activity tab | All | Card list with filters |
| `PlacementActivityPreview` | Profile placement card | All | Preview cards |

---

## User Personas & Requirements

### 1. Teachers (Primary Data Entry)
**Needs:**
- Fast entry during active class period
- See recent activity at a glance
- Minimal clicks to log behavior
- Don't need to navigate away from roster

**Current UX:** ✅ InlineStudentPanel meets needs well
- Points + category + notes in one view
- Recent activity visible
- Stays in roster context

### 2. Parents/Students (View Only)
**Needs:**
- Clear timeline of student's behavior
- Positive and negative entries visible
- Easy to understand format
- No clutter from internal admin data

**Current UX:** ⚠️ Mixed
- Activity Timeline shows only points log
- Behavior notes NOT visible on student profile
- Format (card list) is good but incomplete data

### 3. Administrators (Oversight & Audit)
**Needs:**
- Campus-wide view of all behavior
- Filter/search across students and dates
- Drill down to specific incidents
- Export for reports/documentation
- Quick verification of entries

**Current UX:** ⚠️ Fragmented
- Behavior Notes page is good for oversight
- But separate from points data
- Slide-in sheet requires extra click for each note
- No unified "student day" view

---

## Proposed Architecture

### Core Principle: Unified Activity Model

**Instead of:**
- Points entries (daep_point_entries)
- Behavior notes (daep_behavior_notes)
- Attendance records (daep_attendance)

**Create unified view:**
- All activity types in one timeline
- Consistent display component
- Single source of truth for "what happened to this student"

### Recommended Component Structure

```
┌──────────────────────────────────────────────────────────────┐
│ UnifiedActivityEntry (replaces InlineStudentPanel)           │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Points: [▼] │ Student Action: [▼] │ Teacher Action: [▼]  │ │
│ │ Notes: [________________________]     [Save Entry]        │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Creates: point_entry OR behavior_note OR BOTH                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ UnifiedActivityList (replaces multiple display components)    │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Filter: [All ▼] │ [Points] [Notes] [Attendance]        │   │
│ └────────────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ 📝 +2 | On Task | Good focus | Dec 10, 2:30p (Smith)   │   │
│ │ 📋 -1 | Disruptive | Verbal warning | Dec 10, 1:15p    │   │
│ │ ✓ Present | All periods | Dec 10                        │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Options

### Option A: Keep Separate, Display Together (Recommended - Lower Risk)

**Approach:**
- Keep existing `daep_point_entries` and `daep_behavior_notes` tables
- Create `getUnifiedActivityForPlacement()` that joins both
- Create `UnifiedActivityItem` component that renders both types
- Replace `StudentPointsLog` with `StudentActivityTimeline` that shows both

**Pros:**
- Minimal database changes
- Backward compatible
- Can roll out incrementally

**Cons:**
- Two tables to query
- Potential data model complexity

**Effort:** Medium (2-3 stories)

### Option B: Merge Tables (Higher Risk, Cleaner Long-term)

**Approach:**
- Create `daep_activity_entries` table with `entry_type` enum
- Migrate existing data
- Update all entry points to use new table
- Sunset old tables

**Pros:**
- Single source of truth
- Simpler queries
- Cleaner audit trail

**Cons:**
- Risky migration
- Breaks existing code
- Requires thorough testing

**Effort:** High (Epic-level)

### Option C: Hybrid - Unified View + Keep Entry Points (Pragmatic)

**Approach:**
1. Keep InlineStudentPanel exactly as-is (teachers love it)
2. Create `StudentActivityTimeline` for profile view (unified display)
3. Keep `/behavior-notes` as admin oversight tool
4. Add "Add Note" capability to student profile for notes-without-placement
5. Eventually deprecate slide-in detail sheet in favor of inline expansion

**Pros:**
- Teachers keep familiar workflow
- Parents get unified timeline view
- Admins keep oversight tools
- Incremental improvement

**Cons:**
- Some redundancy remains
- Need to maintain consistency

**Effort:** Medium (3-4 stories)

---

## Recommended Path: Option C

### Phase 1: Unify Student Profile Display (Story 4-X)
**Goal:** Parents/students see complete activity timeline

1. Create `StudentActivityTimeline` component:
   - Combines points, behavior notes, attendance
   - Uses CompactActivityItem styling (condensed, scannable)
   - Placement filter dropdown (default: current)
   - Type filter chips (Points, Notes, Attendance)

2. Replace `StudentPointsLog` in Activity tab with `StudentActivityTimeline`

3. Add "Behavior Notes" section to timeline with toggle

### Phase 2: Add Note from Student Profile (Story 4-Y)
**Goal:** Allow adding notes when viewing student profile

1. Create `AddActivityButton` on student profile:
   - Opens inline entry form (similar to roster)
   - Pre-selects student and current placement
   - If no active placement, prompts for placement selection or "student only"

2. Entry form matches roster styling for consistency

### Phase 3: Enhance Admin Overview (Story 4-Z)
**Goal:** Admin can see unified campus activity

1. Update `/behavior-notes` to include point entries with behavior context
2. Replace slide-in detail sheet with inline expansion (like roster)
3. Add "View in Student Profile" link for full context

### Phase 4: Audit Trail Consolidation (Future)
**Goal:** Single timeline for audit purposes

1. Create `PlacementAuditTimeline` showing:
   - All activity entries (points + notes)
   - All attendance records
   - Status changes
   - Edit history

2. Use for compliance reporting

---

## Component Comparison

### Current vs Proposed: Display

| Current | Proposed | Notes |
|---------|----------|-------|
| `StudentPointsLog` | `StudentActivityTimeline` | Adds behavior notes |
| `CompactActivityItem` | (Keep) | Already well-designed |
| `BehaviorNoteDetailSheet` | Inline expansion | Less modal, more contextual |
| `PlacementActivityPreview` | (Keep/enhance) | Add behavior notes |

### Current vs Proposed: Entry

| Current | Proposed | Notes |
|---------|----------|-------|
| `InlineStudentPanel` | (Keep) | Works great for teachers |
| (None) | `ProfileNoteEntry` | Add on student profile |
| `PointAdjustmentDialog` | (Keep) | Edit functionality |

---

## Addressing Your Specific Concerns

### 1. "Points here, behavior over there"
**Solution:** Unified `StudentActivityTimeline` shows BOTH in one chronological view

### 2. "Small condensed display is good"
**Solution:** Keep `CompactActivityItem` styling for all unified displays

### 3. "Inline chevron view on room page is good"
**Solution:** Keep `InlineStudentPanel` for teacher entry (don't change what works)

### 4. "Easy for teachers to enter"
**Solution:** Don't change roster workflow - it's already optimized

### 5. "Simple for parents/students to view"
**Solution:** `StudentActivityTimeline` with type filters, condensed format

### 6. "Easy for admin to get campus overview"
**Solution:** Keep `/behavior-notes` but enhance with inline expansion

### 7. "Slide-in view concern"
**Solution:** Replace with inline expansion in behavior notes table (like roster)

---

## Priority Order

1. **Story 4-A: StudentActivityTimeline** (3 pts)
   - Unified activity display for student profile
   - Replace `StudentPointsLog` in Activity tab
   - Shows points + behavior notes + attendance in one timeline

2. **Story 4-B: Profile Note Entry** (2 pts)
   - "Add Note" button on student profile
   - Inline entry form (not modal)
   - Handles no-active-placement case

3. **Story 4-C: Inline Expansion for Notes List** (2 pts)
   - Replace slide-in detail sheet
   - Row expansion shows full note (like roster)
   - Faster scanning for admins

4. **Story 4-D: Enhanced Admin Overview** (3 pts)
   - Include point entries in behavior notes view
   - Add "View Full Timeline" link to student profile
   - Export includes both types

---

## Technical Considerations

### Server Action: `getUnifiedActivityForPlacement`

```typescript
type UnifiedActivityItem = {
  id: string;
  type: 'point_entry' | 'behavior_note' | 'attendance';
  date: string;
  time: string | null;
  period?: string;

  // Point entry fields (if type === 'point_entry')
  points?: number;
  student_action?: string;
  teacher_action?: string;

  // Behavior note fields (if type === 'behavior_note')
  category?: string;
  category_type?: 'positive' | 'negative' | 'neutral';
  description?: string;

  // Attendance fields (if type === 'attendance')
  status?: 'present' | 'absent' | 'tardy';

  // Common fields
  notes?: string;
  staff_name: string;
  staff_id: string;
  created_at: string;
};
```

### Database Query Strategy

```sql
-- Unified activity query (combined via UNION)
SELECT
  id, 'point_entry' as type, date, period, ...
FROM daep_point_entries
WHERE placement_id = ?

UNION ALL

SELECT
  id, 'behavior_note' as type, incident_date as date, ...
FROM daep_behavior_notes
WHERE placement_id = ?

UNION ALL

SELECT
  id, 'attendance' as type, date, period, ...
FROM daep_attendance
WHERE placement_id = ?

ORDER BY date DESC, time DESC
```

---

## Questions for User

1. Should the unified timeline default to "current placement" or "all time"?
2. For admin overview, do you want to keep separate pages or merge points + notes?
3. Should inline expansion replace slide-in everywhere, or just behavior notes list?
4. Priority: Fix display first (parents see unified view) or entry first (add from profile)?

---

## Next Steps

1. Review this plan and provide feedback
2. Confirm priority order (display vs entry)
3. Create stories for Phase 1
4. Implement `StudentActivityTimeline` component
5. Test with representative users (teacher, parent, admin)

---

_Plan Version: 1.0_
_Author: Claude_
_Date: 2025-12-10_
