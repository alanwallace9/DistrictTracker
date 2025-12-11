# Tech Spec: Story 4-3 - Behavior Notes List View

**Story:** 4-3
**Epic:** 4 - Behavior Documentation
**Points:** ~3
**FRs:** FR49

---

## Overview

Create a dedicated behavior notes list page at `/daep/behavior-notes` that allows DAEP administrators to:
1. **View all behavior notes** across all students in a searchable, filterable, sortable list
2. **Filter by** student, category type, staff member, home campus, and date range
3. **Sort by** any column (date, student name, campus, staff, category)
4. **Click to view** full note details
5. **Export to CSV** with comprehensive data for reporting
6. **Future-ready** with "Verified by Admin" indicator support

**Design Philosophy:** Provide administrators with a bird's eye view of behavior documentation across the DAEP program for monitoring, analysis, and accountability.

---

## UX Specification

### Page Layout

```
/daep/behavior-notes
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🗒️ Behavior Notes  [12 new]                                        [Refresh] [Export CSV] │
│ Review all behavior notes across DAEP students                                             │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ 142 total • 23 today • 45 negative • 12 unverified                                         │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Today] [This Week] [Negative] [My Notes]                                                  │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 [Search by student name, ID, or description...                                       ]  │
│                                                                                            │
│ Category: [All ▾]  Campus: [All ▾]  Staff: [All ▾]  From: [____] To: [____]  [Clear]      │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ │ Date/Time ↕│ 👤 Student ↕  │ Campus ↕  │ Category ↕ │ Description    │ Staff ↕│ ✓  │
│ ├────────────┼───────────────┼───────────┼────────────┼────────────────┼────────┼────┤
│ │ Dec 9 3:45p│ [📷] Smiley, S│ Central HS│ 🔴 Negative│ Student was d… │ J.Doe  │    │
│ │ Dec 9 2:30p│ [📷] Jones, M │ North HS  │ 🟢 Positive│ Helped anothe… │ A.Smith│ ✓  │
│ │ Dec 9 11:15│ [JW] Williams │ Central HS│ 🟡 Neutral │ Conference wi… │ J.Doe  │    │
│ │ Dec 8 4:00p│ [📷] Smiley, S│ South HS  │ 🔴 Negative│ Off task, nee… │ M.Lee  │ ✓  │
│ │ ...        │ ...           │ ...       │ ...        │ ...            │ ...    │    │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Showing 1-25 of 142                                   [◀ Prev] [1] [2] [3] [Next ▶]       │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Layout Elements:**
- **[12 new] badge** - Shows notes added since user's last visit
- **Summary stats bar** - Quick counts: total, today, negative, unverified
- **Quick filter chips** - One-click presets for common filters
- **[📷] or [JW]** - Student photo thumbnail or initials fallback
- **↕** - Sortable columns (click header to toggle asc/desc)
- **Description hover** - Full text shown in tooltip on hover

### Table Columns

| Column | Width | Sortable | Description |
|--------|-------|----------|-------------|
| Date/Time | 100px | ✅ | Incident date + time, formatted (Dec 9 3:45p) |
| Student | 120px | ✅ | "Last, First" linked to student profile |
| Campus | 90px | ✅ | Home campus short name |
| Category | 100px | ✅ | Category badge with color: 🟢 Positive, 🔴 Negative, 🟡 Neutral |
| Description | flex | ❌ | Truncated description (40 chars) with "..." |
| Staff | 80px | ✅ | Staff last name |
| ✓ (Verified) | 40px | ✅ | Checkmark if verified by admin (future feature) |

### Filter Options

| Filter | Type | Options |
|--------|------|---------|
| Search | Text input | Searches student name, school ID, or description |
| Category Type | Select | All Types, Positive, Negative, Neutral |
| Campus | Select | All Campuses + list of home campuses |
| Staff | Select | All Staff + list of staff who have created notes |
| Date From | Date picker | Start date (inclusive) |
| Date To | Date picker | End date (inclusive) |

### Sorting

- **Default sort:** Date (newest first)
- **Click column header** to sort by that column
- **Click again** to toggle ascending/descending
- **Visual indicator:** ↑ or ↓ arrow in sorted column header

### Row Click Behavior

Clicking a row opens a **slide-out detail panel** (or modal) showing:

```
┌────────────────────────────────────────────────────┐
│ Behavior Note Detail                          [X]  │
├────────────────────────────────────────────────────┤
│ Student: Smiley, Sara (7654321)         [Profile →]│
│ Date: December 9, 2025 at 3:45 PM                  │
│ Category: 🔴 Disruptive (Negative)                 │
│ Staff: John Doe                                    │
├────────────────────────────────────────────────────┤
│ Description:                                       │
│ Student was disruptive during independent work     │
│ time, talking loudly with other students and       │
│ refusing to return to assigned seat when asked.    │
├────────────────────────────────────────────────────┤
│ Action Taken:                                      │
│ Conference with student, parent contact scheduled  │
├────────────────────────────────────────────────────┤
│ Recorded: Dec 9, 2025 at 3:50 PM                   │
│ Last Updated: Dec 9, 2025 at 3:50 PM               │
└────────────────────────────────────────────────────┘
```

---

## Database Changes

### Schema Enhancement: Verified by Admin

Add `verified_by` and `verified_at` columns to support future admin verification workflow:

```sql
-- Migration: add_behavior_notes_verification.sql
-- Story 4-3: Behavior Notes List View - Admin verification support

ALTER TABLE daep_behavior_notes
ADD COLUMN IF NOT EXISTS verified_by TEXT, -- Clerk user_id of verifying admin
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

COMMENT ON COLUMN daep_behavior_notes.verified_by IS 'Admin who verified this note';
COMMENT ON COLUMN daep_behavior_notes.verified_at IS 'When the note was verified';
```

### Existing Table Structure (from migration 20251124221840)

```sql
CREATE TABLE IF NOT EXISTS daep_behavior_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  category TEXT,
  description TEXT NOT NULL,
  action_taken TEXT,
  staff_member TEXT NOT NULL, -- Clerk user_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional columns from Story 4-1 migration
-- category_id UUID REFERENCES daep_behavior_categories(id)
-- incident_date DATE
-- incident_time TIME
```

### Required Indexes

```sql
-- Add index for list view queries (date sorting)
CREATE INDEX IF NOT EXISTS idx_daep_behavior_notes_date_desc
ON daep_behavior_notes(tenant_id, date DESC, time DESC);

-- Add index for staff filter
CREATE INDEX IF NOT EXISTS idx_daep_behavior_notes_staff
ON daep_behavior_notes(tenant_id, staff_member);

-- Add index for verified filter (future)
CREATE INDEX IF NOT EXISTS idx_daep_behavior_notes_verified
ON daep_behavior_notes(tenant_id, verified_by) WHERE verified_by IS NOT NULL;
```

---

## Validation Schema

**File:** `lib/validation/schemas.ts`

```typescript
// ============================================================================
// BEHAVIOR NOTES LIST SCHEMAS (Story 4-3)
// ============================================================================

// Sortable columns for behavior notes list
export const BEHAVIOR_NOTES_SORT_KEYS = [
  'date',
  'student_name',
  'campus',
  'category',
  'staff',
  'verified',
] as const;

export type BehaviorNotesSortKey = typeof BEHAVIOR_NOTES_SORT_KEYS[number];

export const BehaviorNotesListQuerySchema = z.object({
  // Search
  query: z.string().max(200).optional(),
  // Filters
  category_type: z.enum(['positive', 'negative', 'neutral', 'all']).optional(),
  campus_id: z.string().optional(), // Home campus filter
  staff_id: z.string().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Sorting
  sort_by: z.enum(BEHAVIOR_NOTES_SORT_KEYS).optional().default('date'),
  sort_direction: z.enum(['asc', 'desc']).optional().default('desc'),
  // Pagination
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(10).max(100).default(25),
});

export type BehaviorNotesListQuery = z.infer<typeof BehaviorNotesListQuerySchema>;

export interface BehaviorNoteListItem {
  id: string;
  incident_date: string;
  incident_time: string;
  category: string | null;
  category_id: string | null;
  category_type: 'positive' | 'negative' | 'neutral' | null;
  description: string;
  description_snippet: string; // Truncated to 40 chars
  action_taken: string | null;
  // Staff info
  staff_member: string;
  staff_name: string;
  staff_last_name: string;
  // Student info via placement
  placement_id: string;
  student_school_id: string;
  student_first_name: string;
  student_last_name: string;
  // Campus info
  home_campus_id: string | null;
  home_campus_name: string | null;
  // Point adjustment (if associated)
  points: number | null;
  student_action: string | null;
  teacher_action: string | null;
  // Verification (future feature)
  verified_by: string | null;
  verified_at: string | null;
  is_verified: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface BehaviorNotesListResult {
  notes: BehaviorNoteListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
```

---

## Server Actions

**File:** `app/actions/daep/behavior-notes.ts` (add to existing)

```typescript
// ========== GET BEHAVIOR NOTES LIST ==========

/**
 * Get paginated, sortable list of behavior notes with filters.
 * Joins with placements, trespass_records (students), campuses, and user_profiles (staff).
 *
 * Story 4-3: Behavior Notes List View
 */
export async function getBehaviorNotesList(
  input: BehaviorNotesListQuery
): Promise<BehaviorNotesListResult> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const {
    query,
    category_type,
    campus_id,
    staff_id,
    date_from,
    date_to,
    sort_by = 'date',
    sort_direction = 'desc',
    page,
    per_page,
  } = input;

  // Build base query with joins
  let notesQuery = supabase
    .from('daep_behavior_notes')
    .select(`
      id,
      date,
      time,
      incident_date,
      incident_time,
      category,
      category_id,
      description,
      action_taken,
      staff_member,
      verified_by,
      verified_at,
      created_at,
      updated_at,
      placement:daep_placements!inner(
        id,
        school_id,
        home_campus_id,
        home_campus:campuses(
          id,
          name
        ),
        student:trespass_records!inner(
          first_name,
          last_name,
          school_id
        )
      )
    `, { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (query) {
    // Search by student name, school ID, or description
    notesQuery = notesQuery.or(`
      description.ilike.%${query}%,
      placement.student.first_name.ilike.%${query}%,
      placement.student.last_name.ilike.%${query}%,
      placement.student.school_id.ilike.%${query}%
    `);
  }

  if (campus_id && campus_id !== 'all') {
    notesQuery = notesQuery.eq('placement.home_campus_id', campus_id);
  }

  if (staff_id && staff_id !== 'all') {
    notesQuery = notesQuery.eq('staff_member', staff_id);
  }

  if (date_from) {
    notesQuery = notesQuery.gte('incident_date', date_from);
  }

  if (date_to) {
    notesQuery = notesQuery.lte('incident_date', date_to);
  }

  // Default sort (date descending) - additional sorting done client-side for joined fields
  notesQuery = notesQuery
    .order('incident_date', { ascending: sort_by === 'date' ? sort_direction === 'asc' : false })
    .order('incident_time', { ascending: sort_by === 'date' ? sort_direction === 'asc' : false });

  // Pagination
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;
  notesQuery = notesQuery.range(from, to);

  const { data: notes, count, error } = await notesQuery;

  if (error) {
    console.error('getBehaviorNotesList error:', error);
    throw new Error('Failed to fetch behavior notes');
  }

  // Get all staff IDs (both creators and verifiers)
  const staffIds = new Set<string>();
  notes?.forEach(n => {
    if (n.staff_member) staffIds.add(n.staff_member);
    if (n.verified_by) staffIds.add(n.verified_by);
  });

  // Get staff display names and last names
  const staffMap = new Map<string, { display_name: string; last_name: string }>();
  if (staffIds.size > 0) {
    const { data: staff } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', Array.from(staffIds));

    staff?.forEach(s => {
      const lastName = s.display_name?.split(' ').pop() || 'Staff';
      staffMap.set(s.id, {
        display_name: s.display_name || 'Staff',
        last_name: lastName,
      });
    });
  }

  // Get category types
  const categoryTypeMap = new Map<string, string>();
  const { data: categories } = await supabase
    .from('daep_behavior_categories')
    .select('id, name, category_type')
    .eq('tenant_id', tenantId);

  categories?.forEach(c => categoryTypeMap.set(c.id, c.category_type));

  // Transform results
  let transformedNotes: BehaviorNoteListItem[] = (notes || [])
    .filter(note => {
      // Post-filter by category type if specified
      if (category_type && category_type !== 'all') {
        if (note.category_id) {
          return categoryTypeMap.get(note.category_id) === category_type;
        }
        return false;
      }
      return true;
    })
    .map(note => {
      const staffInfo = staffMap.get(note.staff_member) || { display_name: 'Staff', last_name: 'Staff' };

      return {
        id: note.id,
        incident_date: note.incident_date || note.date,
        incident_time: note.incident_time || note.time,
        category: note.category,
        category_id: note.category_id,
        category_type: note.category_id ? categoryTypeMap.get(note.category_id) as any : null,
        description: note.description,
        description_snippet: note.description.length > 40
          ? note.description.substring(0, 37) + '...'
          : note.description,
        action_taken: note.action_taken,
        staff_member: note.staff_member,
        staff_name: staffInfo.display_name,
        staff_last_name: staffInfo.last_name,
        placement_id: note.placement.id,
        student_school_id: note.placement.student.school_id,
        student_first_name: note.placement.student.first_name,
        student_last_name: note.placement.student.last_name,
        home_campus_id: note.placement.home_campus_id,
        home_campus_name: note.placement.home_campus?.name || null,
        // Points/actions - populated if linked to a point entry (future enhancement)
        points: null,
        student_action: null,
        teacher_action: null,
        // Verification
        verified_by: note.verified_by,
        verified_at: note.verified_at,
        is_verified: !!note.verified_by,
        // Timestamps
        created_at: note.created_at,
        updated_at: note.updated_at,
      };
    });

  // Client-side sorting for joined fields
  if (sort_by !== 'date') {
    transformedNotes = sortNotes(transformedNotes, sort_by, sort_direction);
  }

  const total = count || 0;

  return {
    notes: transformedNotes,
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
  };
}

// Helper: Sort notes by different columns
function sortNotes(
  notes: BehaviorNoteListItem[],
  sortBy: BehaviorNotesSortKey,
  direction: 'asc' | 'desc'
): BehaviorNoteListItem[] {
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...notes].sort((a, b) => {
    switch (sortBy) {
      case 'student_name':
        return a.student_last_name.localeCompare(b.student_last_name) * multiplier;
      case 'campus':
        return (a.home_campus_name || '').localeCompare(b.home_campus_name || '') * multiplier;
      case 'category':
        return (a.category_type || '').localeCompare(b.category_type || '') * multiplier;
      case 'staff':
        return a.staff_last_name.localeCompare(b.staff_last_name) * multiplier;
      case 'verified':
        return ((a.is_verified ? 1 : 0) - (b.is_verified ? 1 : 0)) * multiplier;
      default:
        return 0;
    }
  });
}

// ========== GET STAFF LIST FOR FILTER ==========

/**
 * Get list of staff members who have created behavior notes.
 * Used for the staff filter dropdown.
 *
 * Story 4-3: Behavior Notes List View
 */
export async function getBehaviorNotesStaffList(): Promise<{ id: string; name: string; lastName: string }[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get unique staff IDs from behavior notes
  const { data: staffIds } = await supabase
    .from('daep_behavior_notes')
    .select('staff_member')
    .eq('tenant_id', tenantId);

  if (!staffIds || staffIds.length === 0) return [];

  const uniqueIds = [...new Set(staffIds.map(s => s.staff_member))];

  // Get display names
  const { data: staff } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', uniqueIds);

  return (staff || [])
    .map(s => ({
      id: s.id,
      name: s.display_name || 'Staff',
      lastName: s.display_name?.split(' ').pop() || 'Staff',
    }))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}

// ========== GET CAMPUSES FOR FILTER ==========

/**
 * Get list of home campuses that have students with behavior notes.
 * Used for the campus filter dropdown.
 *
 * Story 4-3: Behavior Notes List View
 */
export async function getBehaviorNotesCampusList(): Promise<{ id: string; name: string }[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Get unique campus IDs from placements with behavior notes
  const { data: placements } = await supabase
    .from('daep_behavior_notes')
    .select('placement:daep_placements!inner(home_campus_id)')
    .eq('tenant_id', tenantId);

  if (!placements || placements.length === 0) return [];

  const uniqueCampusIds = [...new Set(
    placements
      .map(p => p.placement?.home_campus_id)
      .filter(Boolean)
  )];

  if (uniqueCampusIds.length === 0) return [];

  // Get campus names
  const { data: campuses } = await supabase
    .from('campuses')
    .select('id, name')
    .in('id', uniqueCampusIds);

  return (campuses || []).sort((a, b) => a.name.localeCompare(b.name));
}

// ========== GET SINGLE BEHAVIOR NOTE ==========

/**
 * Get full details of a single behavior note.
 *
 * Story 4-3: Behavior Notes List View
 */
export async function getBehaviorNoteById(
  noteId: string
): Promise<BehaviorNoteListItem | null> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const { data: note, error } = await supabase
    .from('daep_behavior_notes')
    .select(`
      id,
      date,
      time,
      incident_date,
      incident_time,
      category,
      category_id,
      description,
      action_taken,
      staff_member,
      verified_by,
      verified_at,
      created_at,
      updated_at,
      placement:daep_placements!inner(
        id,
        school_id,
        home_campus_id,
        home_campus:campuses(
          id,
          name
        ),
        student:trespass_records!inner(
          first_name,
          last_name,
          school_id
        )
      )
    `)
    .eq('id', noteId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !note) return null;

  // Get staff name
  const { data: staffProfile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', note.staff_member)
    .single();

  const staffLastName = staffProfile?.display_name?.split(' ').pop() || 'Staff';

  // Get category type
  let categoryType: string | null = null;
  if (note.category_id) {
    const { data: category } = await supabase
      .from('daep_behavior_categories')
      .select('category_type')
      .eq('id', note.category_id)
      .single();
    categoryType = category?.category_type || null;
  }

  return {
    id: note.id,
    incident_date: note.incident_date || note.date,
    incident_time: note.incident_time || note.time,
    category: note.category,
    category_id: note.category_id,
    category_type: categoryType as any,
    description: note.description,
    description_snippet: note.description.length > 40
      ? note.description.substring(0, 37) + '...'
      : note.description,
    action_taken: note.action_taken,
    staff_member: note.staff_member,
    staff_name: staffProfile?.display_name || 'Staff',
    staff_last_name: staffLastName,
    placement_id: note.placement.id,
    student_school_id: note.placement.student.school_id,
    student_first_name: note.placement.student.first_name,
    student_last_name: note.placement.student.last_name,
    home_campus_id: note.placement.home_campus_id,
    home_campus_name: note.placement.home_campus?.name || null,
    points: null,
    student_action: null,
    teacher_action: null,
    verified_by: note.verified_by,
    verified_at: note.verified_at,
    is_verified: !!note.verified_by,
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
}

// ========== GET BEHAVIOR NOTES STATS (UX Quick Win) ==========

/**
 * Get summary statistics for behavior notes.
 * Used for the summary stats bar at top of page.
 *
 * Story 4-3: Behavior Notes List View - UX Quick Win
 */
export async function getBehaviorNotesStats(
  filters?: Partial<BehaviorNotesListQuery>
): Promise<{
  total: number;
  today: number;
  negative: number;
  unverified: number;
  newSinceLastVisit: number;
  lastVisitTimestamp?: string;
}> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();
  const today = new Date().toISOString().split('T')[0];

  // Get total count (with filters if provided)
  let totalQuery = supabase
    .from('daep_behavior_notes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  // Apply same filters as list query
  if (filters?.campus_id && filters.campus_id !== 'all') {
    totalQuery = totalQuery.eq('placement.home_campus_id', filters.campus_id);
  }
  if (filters?.staff_id && filters.staff_id !== 'all') {
    totalQuery = totalQuery.eq('staff_member', filters.staff_id);
  }
  if (filters?.date_from) {
    totalQuery = totalQuery.gte('incident_date', filters.date_from);
  }
  if (filters?.date_to) {
    totalQuery = totalQuery.lte('incident_date', filters.date_to);
  }

  const { count: total } = await totalQuery;

  // Get today's count
  const { count: todayCount } = await supabase
    .from('daep_behavior_notes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('incident_date', today);

  // Get negative count (need to join with categories)
  const { data: negativeCategories } = await supabase
    .from('daep_behavior_categories')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('category_type', 'negative');

  const negativeCategoryIds = negativeCategories?.map(c => c.id) || [];

  let negativeCount = 0;
  if (negativeCategoryIds.length > 0) {
    const { count } = await supabase
      .from('daep_behavior_notes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('category_id', negativeCategoryIds);
    negativeCount = count || 0;
  }

  // Get unverified count
  const { count: unverifiedCount } = await supabase
    .from('daep_behavior_notes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('verified_by', null);

  return {
    total: total || 0,
    today: todayCount || 0,
    negative: negativeCount,
    unverified: unverifiedCount || 0,
    newSinceLastVisit: 0, // Calculated client-side from localStorage
  };
}

// ========== GET NEW NOTES COUNT SINCE TIMESTAMP ==========

/**
 * Get count of notes created after a specific timestamp.
 * Used for "X new" badge based on user's last visit.
 *
 * Story 4-3: Behavior Notes List View - UX Quick Win
 */
export async function getNewNotesCountSince(
  timestamp: string
): Promise<number> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const { count } = await supabase
    .from('daep_behavior_notes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gt('created_at', timestamp);

  return count || 0;
}

// ========== EXPORT BEHAVIOR NOTES TO CSV ==========

/**
 * Export behavior notes to CSV format with comprehensive columns.
 *
 * Story 4-3: Behavior Notes List View
 *
 * Columns: Student Name, Student ID, Date, Time, Campus, Category, Category Type,
 *          Student Action, Teacher Action, Points, Description, Action Taken,
 *          Staff Last Name, Staff Full Name, Verified, Recorded At
 */
export async function exportBehaviorNotesToCSV(
  filters: Omit<BehaviorNotesListQuery, 'page' | 'per_page'>
): Promise<string> {
  // Fetch all notes matching filters (no pagination)
  const result = await getBehaviorNotesList({
    ...filters,
    page: 1,
    per_page: 10000, // Max export size
  });

  // Build CSV with comprehensive columns
  const headers = [
    'Student Name',
    'Student ID',
    'Date',
    'Time',
    'Home Campus',
    'Category',
    'Category Type',
    'Student Action',
    'Teacher Action',
    'Points',
    'Description',
    'Action Taken',
    'Staff Last Name',
    'Staff Full Name',
    'Verified',
    'Verified At',
    'Recorded At',
    'Last Updated',
  ];

  const escapeCSV = (value: string | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = result.notes.map(note => [
    escapeCSV(`${note.student_last_name}, ${note.student_first_name}`),
    escapeCSV(note.student_school_id),
    escapeCSV(note.incident_date),
    escapeCSV(note.incident_time),
    escapeCSV(note.home_campus_name),
    escapeCSV(note.category),
    escapeCSV(note.category_type),
    escapeCSV(note.student_action),
    escapeCSV(note.teacher_action),
    note.points !== null ? String(note.points) : '',
    escapeCSV(note.description),
    escapeCSV(note.action_taken),
    escapeCSV(note.staff_last_name),
    escapeCSV(note.staff_name),
    note.is_verified ? 'Yes' : 'No',
    escapeCSV(note.verified_at),
    escapeCSV(note.created_at),
    escapeCSV(note.updated_at),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csv;
}
```

---

## UI Components

### 1. BehaviorNotesPage

**File:** `app/daep/(main)/behavior-notes/page.tsx`

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, FileText } from 'lucide-react';
import { BehaviorNotesFilters } from '@/components/daep/behavior-notes/BehaviorNotesFilters';
import { BehaviorNotesTable } from '@/components/daep/behavior-notes/BehaviorNotesTable';
import { BehaviorNoteDetailSheet } from '@/components/daep/behavior-notes/BehaviorNoteDetailSheet';
import {
  getBehaviorNotesList,
  getBehaviorNotesStaffList,
  getBehaviorNotesCampusList,
  getBehaviorNoteById,
  exportBehaviorNotesToCSV,
} from '@/app/actions/daep/behavior-notes';
import type { BehaviorNoteListItem, BehaviorNotesSortKey } from '@/lib/validation/schemas';

export default function BehaviorNotesPage() {
  const { toast } = useToast();

  // Data state
  const [notes, setNotes] = useState<BehaviorNoteListItem[]>([]);
  const [staffList, setStaffList] = useState<{ id: string; name: string; lastName: string }[]>([]);
  const [campusList, setCampusList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryType, setCategoryType] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sort state
  const [sortConfig, setSortConfig] = useState<{
    key: BehaviorNotesSortKey;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });

  // Pagination state
  const [page, setPage] = useState(1);
  const perPage = 25;

  // Detail sheet state
  const [selectedNote, setSelectedNote] = useState<BehaviorNoteListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Debounce search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch filter options (staff, campuses)
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [staff, campuses] = await Promise.all([
        getBehaviorNotesStaffList(),
        getBehaviorNotesCampusList(),
      ]);
      setStaffList(staff);
      setCampusList(campuses);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  }, []);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getBehaviorNotesList({
        query: debouncedSearchQuery || undefined,
        category_type: categoryType !== 'all' ? categoryType : undefined,
        campus_id: campusFilter !== 'all' ? campusFilter : undefined,
        staff_id: staffFilter !== 'all' ? staffFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: sortConfig.key,
        sort_direction: sortConfig.direction,
        page,
        per_page: perPage,
      });

      setNotes(result.notes);
      setTotal(result.total);
      setTotalPages(result.total_pages);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch behavior notes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, categoryType, campusFilter, staffFilter, dateFrom, dateTo, sortConfig, page, toast]);

  // Initial load
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Handle sort
  const handleSort = (key: BehaviorNotesSortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
    setPage(1);
  };

  // Handle row click
  const handleRowClick = async (noteId: string) => {
    try {
      const note = await getBehaviorNoteById(noteId);
      if (note) {
        setSelectedNote(note);
        setDetailOpen(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load note details',
        variant: 'destructive',
      });
    }
  };

  // Handle export
  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportBehaviorNotesToCSV({
        query: debouncedSearchQuery || undefined,
        category_type: categoryType !== 'all' ? categoryType : undefined,
        campus_id: campusFilter !== 'all' ? campusFilter : undefined,
        staff_id: staffFilter !== 'all' ? staffFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: sortConfig.key,
        sort_direction: sortConfig.direction,
      });

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `behavior-notes-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `Exported ${total} behavior notes to CSV`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export behavior notes',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryType('all');
    setCampusFilter('all');
    setStaffFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery.length > 0 ||
    categoryType !== 'all' ||
    campusFilter !== 'all' ||
    staffFilter !== 'all' ||
    dateFrom.length > 0 ||
    dateTo.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Behavior Notes
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review all behavior notes across DAEP students
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchNotes} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || notes.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <BehaviorNotesFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryType={categoryType}
        onCategoryTypeChange={(type) => {
          setCategoryType(type);
          setPage(1);
        }}
        campusFilter={campusFilter}
        onCampusChange={(campusId) => {
          setCampusFilter(campusId);
          setPage(1);
        }}
        staffFilter={staffFilter}
        onStaffChange={(staffId) => {
          setStaffFilter(staffId);
          setPage(1);
        }}
        dateFrom={dateFrom}
        onDateFromChange={(date) => {
          setDateFrom(date);
          setPage(1);
        }}
        dateTo={dateTo}
        onDateToChange={(date) => {
          setDateTo(date);
          setPage(1);
        }}
        campusList={campusList}
        staffList={staffList}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Table with sorting */}
      <BehaviorNotesTable
        notes={notes}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={perPage}
        onPageChange={setPage}
        onRowClick={handleRowClick}
        sortConfig={sortConfig}
        onSort={handleSort}
      />

      {/* Detail Sheet */}
      <BehaviorNoteDetailSheet
        note={selectedNote}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
```

### 2. BehaviorNotesFilters

**File:** `components/daep/behavior-notes/BehaviorNotesFilters.tsx`

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';

interface Staff {
  id: string;
  name: string;
  lastName: string;
}

interface Campus {
  id: string;
  name: string;
}

interface BehaviorNotesFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryType: 'all' | 'positive' | 'negative' | 'neutral';
  onCategoryTypeChange: (type: 'all' | 'positive' | 'negative' | 'neutral') => void;
  campusFilter: string;
  onCampusChange: (campusId: string) => void;
  staffFilter: string;
  onStaffChange: (staffId: string) => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  campusList: Campus[];
  staffList: Staff[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const CATEGORY_TYPE_LABELS = {
  all: 'All Types',
  positive: 'Positive',
  negative: 'Negative',
  neutral: 'Neutral',
};

export function BehaviorNotesFilters({
  searchQuery,
  onSearchChange,
  categoryType,
  onCategoryTypeChange,
  campusFilter,
  onCampusChange,
  staffFilter,
  onStaffChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  campusList,
  staffList,
  onClearFilters,
  hasActiveFilters,
}: BehaviorNotesFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by student name, ID, or description..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Category Type Filter */}
        <div className="flex-shrink-0 w-32">
          <Select
            value={categoryType}
            onValueChange={(value) => onCategoryTypeChange(value as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Campus Filter */}
        <div className="flex-shrink-0 w-40">
          <Select value={campusFilter} onValueChange={onCampusChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Campuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campuses</SelectItem>
              {campusList.map((campus) => (
                <SelectItem key={campus.id} value={campus.id}>
                  {campus.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Staff Filter */}
        <div className="flex-shrink-0 w-40">
          <Select value={staffFilter} onValueChange={onStaffChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-36"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To:</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-36"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 3. BehaviorNotesTable

**File:** `components/daep/behavior-notes/BehaviorNotesTable.tsx`

```typescript
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { cn, formatDate, formatTime } from '@/lib/utils';
import type { BehaviorNoteListItem, BehaviorNotesSortKey } from '@/lib/validation/schemas';

interface BehaviorNotesTableProps {
  notes: BehaviorNoteListItem[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onRowClick: (noteId: string) => void;
  sortConfig: { key: BehaviorNotesSortKey; direction: 'asc' | 'desc' };
  onSort: (key: BehaviorNotesSortKey) => void;
}

const CATEGORY_TYPE_STYLES = {
  positive: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  negative: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  neutral: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

// Sortable header component
function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: BehaviorNotesSortKey;
  currentSortKey: BehaviorNotesSortKey;
  direction: 'asc' | 'desc';
  onSort: (key: BehaviorNotesSortKey) => void;
  className?: string;
}) {
  const isActive = currentSortKey === sortKey;

  return (
    <TableHead
      className={cn('cursor-pointer hover:bg-muted/50 select-none', className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )
        ) : (
          <span className="w-3 h-3" /> // Placeholder for alignment
        )}
      </div>
    </TableHead>
  );
}

export function BehaviorNotesTable({
  notes,
  loading,
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  onRowClick,
  sortConfig,
  onSort,
}: BehaviorNotesTableProps) {
  const startIndex = (page - 1) * perPage + 1;
  const endIndex = Math.min(page * perPage, total);

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                label="Date/Time"
                sortKey="date"
                currentSortKey={sortConfig.key}
                direction={sortConfig.direction}
                onSort={onSort}
                className="w-[100px]"
              />
              <SortableHeader
                label="Student"
                sortKey="student_name"
                currentSortKey={sortConfig.key}
                direction={sortConfig.direction}
                onSort={onSort}
                className="w-[120px]"
              />
              <SortableHeader
                label="Campus"
                sortKey="campus"
                currentSortKey={sortConfig.key}
                direction={sortConfig.direction}
                onSort={onSort}
                className="w-[90px]"
              />
              <SortableHeader
                label="Category"
                sortKey="category"
                currentSortKey={sortConfig.key}
                direction={sortConfig.direction}
                onSort={onSort}
                className="w-[100px]"
              />
              <TableHead>Description</TableHead>
              <SortableHeader
                label="Staff"
                sortKey="staff"
                currentSortKey={sortConfig.key}
                direction={sortConfig.direction}
                onSort={onSort}
                className="w-[80px]"
              />
              <SortableHeader
                label="✓"
                sortKey="verified"
                currentSortKey={sortConfig.key}
                direction={sortConfig.direction}
                onSort={onSort}
                className="w-[40px] text-center"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <span className="text-muted-foreground">Loading...</span>
                </TableCell>
              </TableRow>
            ) : notes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <span className="text-muted-foreground">No behavior notes found</span>
                </TableCell>
              </TableRow>
            ) : (
              notes.map((note) => (
                <TableRow
                  key={note.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick(note.id)}
                >
                  <TableCell className="font-mono text-xs">
                    <div>{formatDate(note.incident_date, 'short')}</div>
                    <div className="text-muted-foreground">
                      {formatTime(note.incident_time, 'short')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/daep/students/${note.student_school_id}`}
                      className="text-primary hover:underline text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {note.student_last_name}, {note.student_first_name.charAt(0)}.
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {note.home_campus_name || '—'}
                  </TableCell>
                  <TableCell>
                    {note.category_type ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          CATEGORY_TYPE_STYLES[note.category_type]
                        )}
                      >
                        {note.category_type.charAt(0).toUpperCase() + note.category_type.slice(1)}
                      </Badge>
                    ) : note.category ? (
                      <Badge variant="outline" className="text-xs">{note.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {note.description_snippet}
                  </TableCell>
                  <TableCell className="text-sm">{note.staff_last_name}</TableCell>
                  <TableCell className="text-center">
                    {note.is_verified ? (
                      <Check className="w-4 h-4 text-green-600 mx-auto" />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {startIndex}-{endIndex} of {total}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 4. BehaviorNoteDetailSheet

**File:** `components/daep/behavior-notes/BehaviorNoteDetailSheet.tsx`

```typescript
'use client';

import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle } from 'lucide-react';
import { cn, formatDate, formatTime, formatDateTime } from '@/lib/utils';
import type { BehaviorNoteListItem } from '@/lib/validation/schemas';

interface BehaviorNoteDetailSheetProps {
  note: BehaviorNoteListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_TYPE_STYLES = {
  positive: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  negative: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  neutral: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

export function BehaviorNoteDetailSheet({
  note,
  open,
  onOpenChange,
}: BehaviorNoteDetailSheetProps) {
  if (!note) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Behavior Note Detail
            {note.is_verified && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Student Info */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Student</div>
              <div className="font-medium">
                {note.student_last_name}, {note.student_first_name}
              </div>
              <div className="text-sm text-muted-foreground">
                ID: {note.student_school_id}
              </div>
            </div>
            <Link href={`/daep/students/${note.student_school_id}`}>
              <Button variant="outline" size="sm">
                Profile
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Campus */}
          {note.home_campus_name && (
            <div>
              <div className="text-sm text-muted-foreground">Home Campus</div>
              <div className="font-medium">{note.home_campus_name}</div>
            </div>
          )}

          {/* Date/Time */}
          <div>
            <div className="text-sm text-muted-foreground">Date & Time</div>
            <div className="font-medium">
              {formatDate(note.incident_date)} at {formatTime(note.incident_time)}
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="text-sm text-muted-foreground">Category</div>
            <div className="mt-1">
              {note.category_type ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize',
                    CATEGORY_TYPE_STYLES[note.category_type]
                  )}
                >
                  {note.category || note.category_type}
                </Badge>
              ) : note.category ? (
                <Badge variant="outline">{note.category}</Badge>
              ) : (
                <span className="text-muted-foreground">No category</span>
              )}
            </div>
          </div>

          {/* Staff */}
          <div>
            <div className="text-sm text-muted-foreground">Staff Member</div>
            <div className="font-medium">{note.staff_name}</div>
          </div>

          {/* Description */}
          <div>
            <div className="text-sm text-muted-foreground">Description</div>
            <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
              {note.description}
            </div>
          </div>

          {/* Action Taken */}
          {note.action_taken && (
            <div>
              <div className="text-sm text-muted-foreground">Action Taken</div>
              <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                {note.action_taken}
              </div>
            </div>
          )}

          {/* Verification Info (future) */}
          {note.is_verified && note.verified_at && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
              <div className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Verified on {formatDateTime(note.verified_at)}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
            <div>Recorded: {formatDateTime(note.created_at)}</div>
            {note.updated_at !== note.created_at && (
              <div>Last Updated: {formatDateTime(note.updated_at)}</div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 5. QuickFilterChips (UX Quick Win)

**File:** `components/daep/behavior-notes/QuickFilterChips.tsx`

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickFilter {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

interface QuickFilterChipsProps {
  filters: QuickFilter[];
}

export function QuickFilterChips({ filters }: QuickFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Button
          key={filter.label}
          variant={filter.isActive ? 'default' : 'outline'}
          size="sm"
          onClick={filter.onClick}
          className={cn(
            'h-7 px-3 text-xs',
            filter.isActive && 'bg-primary text-primary-foreground'
          )}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

// Usage in page:
// const quickFilters = [
//   {
//     label: 'Today',
//     isActive: dateFrom === today && dateTo === today,
//     onClick: () => { setDateFrom(today); setDateTo(today); }
//   },
//   {
//     label: 'This Week',
//     isActive: dateFrom === weekStart && dateTo === today,
//     onClick: () => { setDateFrom(weekStart); setDateTo(today); }
//   },
//   {
//     label: 'Negative',
//     isActive: categoryType === 'negative',
//     onClick: () => setCategoryType('negative')
//   },
//   {
//     label: 'My Notes',
//     isActive: staffFilter === currentUserId,
//     onClick: () => setStaffFilter(currentUserId)
//   },
// ];
```

### 6. SummaryStatsBar (UX Quick Win)

**File:** `components/daep/behavior-notes/SummaryStatsBar.tsx`

```typescript
'use client';

import { Loader2 } from 'lucide-react';

interface SummaryStatsBarProps {
  total: number;
  today: number;
  negative: number;
  unverified: number;
  loading?: boolean;
}

export function SummaryStatsBar({
  total,
  today,
  negative,
  unverified,
  loading = false,
}: SummaryStatsBarProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading stats...
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="font-medium">{total.toLocaleString()} total</span>
      <span className="text-muted-foreground">•</span>
      <span className="text-blue-600 dark:text-blue-400">{today} today</span>
      <span className="text-muted-foreground">•</span>
      <span className="text-red-600 dark:text-red-400">{negative} negative</span>
      <span className="text-muted-foreground">•</span>
      <span className="text-yellow-600 dark:text-yellow-400">{unverified} unverified</span>
    </div>
  );
}
```

### 7. NewNotesBadge (UX Quick Win)

**File:** `components/daep/behavior-notes/NewNotesBadge.tsx`

```typescript
'use client';

import { Badge } from '@/components/ui/badge';

interface NewNotesBadgeProps {
  count: number;
}

export function NewNotesBadge({ count }: NewNotesBadgeProps) {
  if (count <= 0) return null;

  return (
    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
      {count} new
    </Badge>
  );
}
```

### 8. StudentAvatar (UX Quick Win)

**File:** `components/daep/behavior-notes/StudentAvatar.tsx`

```typescript
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface StudentAvatarProps {
  photoUrl?: string | null;
  firstName: string;
  lastName: string;
  size?: 'sm' | 'md';
}

export function StudentAvatar({
  photoUrl,
  firstName,
  lastName,
  size = 'sm',
}: StudentAvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const sizeClass = size === 'sm' ? 'h-6 w-6 text-xs' : 'h-8 w-8 text-sm';

  return (
    <Avatar className={sizeClass}>
      {photoUrl && <AvatarImage src={photoUrl} alt={`${firstName} ${lastName}`} />}
      <AvatarFallback className="bg-muted text-muted-foreground">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
```

### 9. Description Tooltip (integrated in table)

Add to `BehaviorNotesTable.tsx` Description cell:

```typescript
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// In the Description TableCell:
<TableCell className="max-w-[200px]">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="truncate block cursor-help text-sm">
          {note.description_snippet}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-md">
        <p className="text-sm whitespace-pre-wrap">{note.description}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</TableCell>
```

---

## Navigation Integration

Add to DAEP sidebar navigation:

**File:** `components/daep/DAEPSidebar.tsx` (or equivalent)

```typescript
// Add to navigation items:
{
  name: 'Behavior Notes',
  href: '/daep/behavior-notes',
  icon: FileText,
}
```

---

## Acceptance Criteria

### Core Features
| AC | Description | Test |
|----|-------------|------|
| 4.3.1 | Behavior notes page at `/daep/behavior-notes` | Navigate to URL, verify page renders |
| 4.3.2 | List shows: date/time, student, campus, category, description, staff, verified | Verify all 7 columns present |
| 4.3.3 | Filter by student (search) | Search "Smith", verify only Smith students |
| 4.3.4 | Filter by category type | Select "Negative", verify only negative notes |
| 4.3.5 | Filter by staff member | Select staff, verify only their notes |
| 4.3.6 | Filter by date range | Set date range, verify notes within range |
| 4.3.7 | **Filter by campus** | Select campus, verify only that campus's students |
| 4.3.8 | **Sort by any column** | Click column headers, verify ↑↓ indicator and order changes |
| 4.3.9 | Default sort by date (newest first) | Verify newest notes at top on load |
| 4.3.10 | Click to view full note detail | Click row, verify sheet opens with full details |
| 4.3.11 | Pagination (25 per page) | Verify pagination controls work, show count |
| 4.3.12 | Export to CSV (18 columns) | Click export, verify CSV with Student Name, ID, Date, Time, Campus, Category, Type, etc. |
| 4.3.13 | Student name links to profile | Click student name, verify navigation |
| 4.3.14 | **Verified indicator column** | Verify ✓ appears for verified notes |
| 4.3.15 | Admin access only | Non-admin cannot access page |

### UX Quick Wins
| AC | Description | Test |
|----|-------------|------|
| 4.3.16 | Quick filter chips: "Today", "This Week", "Negative", "My Notes" | Click each chip, verify filters apply |
| 4.3.17 | Summary stats bar: total, today, negative, unverified counts | Verify counts display and update with filters |
| 4.3.18 | Hover preview tooltip on description | Hover over truncated description, see full text |
| 4.3.19 | "X new" badge showing notes since last visit | Visit page, leave, add note, return - see badge |
| 4.3.20 | Student photo thumbnail in table | Verify avatar with photo or initials fallback |

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/*_add_behavior_notes_verification.sql` | Create | Add `verified_by`, `verified_at` columns + index |
| `lib/validation/schemas.ts` | Modify | Add BEHAVIOR_NOTES_SORT_KEYS, BehaviorNotesListQuery, BehaviorNoteListItem |
| `app/actions/daep/behavior-notes.ts` | Modify | Add 7 server actions (list, staff, campus, detail, stats, newCount, export) |
| `app/daep/(main)/behavior-notes/page.tsx` | Create | Behavior notes list page with sort/filter/stats state |
| `components/daep/behavior-notes/BehaviorNotesFilters.tsx` | Create | Filter controls (search, category, campus, staff, dates) |
| `components/daep/behavior-notes/BehaviorNotesTable.tsx` | Create | Notes table with sortable headers, pagination, verified column, tooltip |
| `components/daep/behavior-notes/BehaviorNoteDetailSheet.tsx` | Create | Detail slide-out sheet with campus, verified badge |
| `components/daep/behavior-notes/QuickFilterChips.tsx` | Create | One-click filter presets (Today, This Week, Negative, My Notes) |
| `components/daep/behavior-notes/SummaryStatsBar.tsx` | Create | Stats display (total, today, negative, unverified) |
| `components/daep/behavior-notes/NewNotesBadge.tsx` | Create | "X new" badge for notes since last visit |
| `components/daep/behavior-notes/StudentAvatar.tsx` | Create | Student photo thumbnail with initials fallback |
| `components/daep/behavior-notes/index.ts` | Create | Barrel export |
| Navigation component | Modify | Add "Behavior Notes" link |

**Total: 1 migration, 9 new files, 3 modified files**

---

## Out of Scope

| Item | Story |
|------|-------|
| Edit/delete notes | Future enhancement |
| Attach notes without placement | Story 4-4 |
| Full timeline integration | Story 4-5 |
| Bulk actions on notes | Future enhancement |
| Note templates | Future enhancement |

---

## Testing Plan

1. **TypeScript compilation** - No errors
2. **Database migration:**
   - `verified_by` and `verified_at` columns added to `daep_behavior_notes`
   - Index created on verified_by
3. **Server actions:**
   - `getBehaviorNotesList()` returns correct data with all fields
   - Filters work correctly (search, category, **campus**, staff, dates)
   - **Sorting works** for all sortable columns (date, student_name, campus, category, staff, verified)
   - Pagination works (25 per page)
   - Export generates valid CSV with **18 columns**
   - `getBehaviorNotesCampusList()` returns unique campuses
4. **UI:**
   - Table renders correctly with **7 columns** including Campus and Verified
   - **Sortable column headers** show ↑↓ indicators
   - Campus filter dropdown populated with campuses
   - Filters update results immediately
   - Detail sheet displays all fields including campus and verified badge
   - Pagination controls work
   - Student links navigate correctly
5. **Access control:**
   - Page accessible to DAEP admins
   - Staff can view their own notes
6. **Playwright MCP verification** - Visual check of page layout, sorting, filters

---

## Dependencies

- Story 4-1 (Quick Behavior Note Modal) - **DONE**
- Story 4-2 (Predefined Behavior Categories) - **DONE** (implemented as part of 4-1)
- Epic 1 (Schema, Categories) - **DONE**
- Epic 2 (Placements) - **DONE**

---

_Tech Spec Version: 1.2_
_Created: 2025-12-10_
_Updated: 2025-12-10 - v1.1: Added sortable columns, campus filter, verified indicator, CSV (18 cols)_
_Updated: 2025-12-10 - v1.2: Added UX Quick Wins (quick filters, stats bar, hover preview, new badge, student photos)_
_Author: Claude (AI Assistant)_
