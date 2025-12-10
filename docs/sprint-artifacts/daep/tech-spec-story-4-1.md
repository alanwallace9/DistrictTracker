# Tech Spec: Story 4-1 - Quick Behavior Note Entry

**Story:** 4-1
**Epic:** 4 - Behavior Documentation
**Points:** ~3
**FRs:** FR45, FR46, FR48

---

## Overview

Create an inline expandable row system for the room roster that allows DAEP staff to:
1. **Quick-enter** point adjustments with student action, teacher action, and notes
2. **View recent notes** for each student in a compact format
3. **Bulk-apply** points to multiple selected students

**Design Philosophy:** Match teacher workflow - fast entry, minimal friction, see history at a glance.

---

## UX Specification

### Click Zone Behavior

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ ☐ │      STUDENT NAME (click → profile)         │ ... │ Today's │ Adjust │
│   │                                              │     │  Total  │   ▼    │
├───┴──────────────────────────────────────────────┴─────┴─────────┴────────┤
│ ☐ │ Smiley, Sara        9   Pending   P▾   67%   30d    28/28   │   ▼    │
│   │ ID: 7654321                                                  │        │
│   │ ←────── Click = Go to profile ──────→                        │ Expand │
└──────────────────────────────────────────────────────────────────┴────────┘
```

| Click Zone | Action |
|------------|--------|
| Checkbox | Select for bulk actions |
| Student name/row | Navigate to student profile page |
| ▼ Chevron (Adjust column) | Expand/collapse inline panel |

---

### Expanded Inline Panel

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ ☐ │ Smiley, Sara        9   Pending   P▾   67%   30d    28/28   │   ▲    │
├───┴──────────────────────────────────────────────────────────────┴────────┤
│                                                                            │
│   ┌─ Add Entry ────────────────────────────────────────────────────────┐  │
│   │ Points [10▾]  Student [None▾]  Teacher [None▾]  Notes [________] [Save]│
│   └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│   ┌─ Recent Activity (3)                                    View All → ┐  │
│   │  ✎ -2 pts • Off Task • Redirect                          10:32 AM │  │
│   │  ✎ +10 pts • On Task                                      9:15 AM │  │
│   │  ○ Attendance changed                                    Yesterday │  │
│   └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
│ ☐ │ Jones, Mike         10  Active    P▾   92%   15d    30/30   │   ▼    │
```

**Recent Activity Section:**
- Shows last 5 entries (points, notes, attendance)
- Compact single-line format like Recent Activity widget
- Icon + summary + timestamp
- "View All →" links to student profile Activity Timeline tab

---

### Bulk Selection + Quick Actions Toolbar

When 1+ students selected, floating toolbar appears:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ☑ │ Smiley, Sara        ...    28/28   │   ▼    │
│ ☑ │ Jones, Mike         ...    30/30   │   ▼    │
│ ☐ │ Williams, Alex      ...    25/28   │   ▼    │
└────────────────────────────────────────────────────────────────────────────┘

╔════════════════════════════════════════════════════════════════════════════╗
║  2 selected   │  [-15] [-10] [-5] [0] [+5]  │  [+ Detailed...]  │  [Clear] ║
╚════════════════════════════════════════════════════════════════════════════╝
```

| Button | Action |
|--------|--------|
| Quick point buttons | Apply points to all selected (values from settings) |
| `[+ Detailed...]` | Open modal for bulk entry with actions & notes |
| `[Clear]` | Deselect all |

**Note:** Quick point button values come from settings (future story). For now, use: `-15`, `-10`, `-5`, `0`, `+5`

---

### Compact Recent Activity Item Styling

```tsx
// Single line: Icon + summary + right-aligned timestamp
┌────────────────────────────────────────────────────────────────┐
│  ✎  -2 pts • Off Task • Redirect                    10:32 AM  │
│  ✎  +10 pts • On Task                                9:15 AM  │
│  ○  Attendance override                            Yesterday  │
│  ○  Attendance changed                             Yesterday  │
└────────────────────────────────────────────────────────────────┘
```

**Styling Rules:**
- Point badge: Green for positive, red for negative, gray for zero
- Icon: `✎` (pencil) for notes/points, `○` for attendance
- Text: `{points} • {student_action} • {teacher_action}` (omit if "None")
- Timestamp: Right-aligned, relative time (Today: time, else: "Yesterday", "Dec 5")

---

## Dynamic Data Sources

### Point Adjustment Values

**Source:** Settings page (future story adds `/daep/settings/points`)

**For now, use hardcoded values:**
```typescript
const POINT_ADJUSTMENTS = [
  { value: 10, label: '+10' },
  { value: 5, label: '+5' },
  { value: 0, label: '0 (Note Only)' },
  { value: -5, label: '-5' },
  { value: -10, label: '-10' },
  { value: -15, label: '-15' },
];
```

**Future:** Query from `daep_point_adjustment_options` table (to be created in settings story).

### Student & Teacher Actions

**Source:** Behavior Categories from `/daep/settings/behaviors` (existing)

```typescript
// Fetch from existing behavior categories
const categories = await getActiveBehaviorCategories();

// Student Actions = positive + negative categories
const studentActions = categories.filter(
  c => c.category_type === 'positive' || c.category_type === 'negative'
);

// Teacher Actions = neutral categories
const teacherActions = categories.filter(c => c.category_type === 'neutral');
```

**Existing categories (from Story 1.10):**
| Type | Examples |
|------|----------|
| `positive` | On Task, Helped Peer, Showed Respect, Completed Work |
| `negative` | Talk Back, Off Task, Disruptive, Incomplete Work |
| `neutral` | Redirected, Conference, Parent Contact |

---

## Database Changes

### Schema Updates

**File:** `supabase/migrations/[timestamp]_behavior_notes_enhancements.sql`

```sql
-- Add incident timestamp fields (editable by user)
-- Keep created_at/updated_at for audit purposes
ALTER TABLE daep_behavior_notes
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES daep_behavior_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS incident_date DATE,
ADD COLUMN IF NOT EXISTS incident_time TIME;

-- Backfill: set incident_date/time from existing date/time columns
UPDATE daep_behavior_notes
SET incident_date = date, incident_time = time
WHERE incident_date IS NULL;

-- Add index for recent activity queries
CREATE INDEX IF NOT EXISTS idx_daep_behavior_notes_placement_date
ON daep_behavior_notes(placement_id, date DESC, time DESC);

CREATE INDEX IF NOT EXISTS idx_daep_behavior_notes_category
ON daep_behavior_notes(category_id);

-- RLS policies
CREATE POLICY IF NOT EXISTS "behavior_notes_tenant_read" ON daep_behavior_notes
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY IF NOT EXISTS "behavior_notes_tenant_insert" ON daep_behavior_notes
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY IF NOT EXISTS "behavior_notes_update" ON daep_behavior_notes
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND (
      staff_member = auth.uid()::text
      OR get_my_role() IN ('super_admin', 'district_admin', 'daep_admin_l1')
    )
  );
```

### Timestamp Handling

| Field | Editable | Purpose |
|-------|----------|---------|
| `incident_date` | ✅ Yes | When behavior happened (user can backdate) |
| `incident_time` | ✅ Yes | Time it happened |
| `created_at` | ❌ Auto | Audit: when note was recorded in system |
| `updated_at` | ❌ Auto | Audit: last modification |
| `staff_member` | ❌ Auto | Audit: who recorded it |

---

## Validation Schema

**File:** `lib/validation/schemas.ts`

```typescript
// ============================================================================
// BEHAVIOR NOTES SCHEMAS
// ============================================================================

export const BehaviorNoteSchema = z.object({
  placement_id: z.string().uuid('Invalid placement ID'),
  incident_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  incident_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format'),
  category_id: z.string().uuid('Invalid category').nullable().optional(),
  description: z.string().max(2000, 'Description too long').nullable().optional(),
  action_taken: z.string().max(500, 'Action taken too long').nullable().optional(),
  // Point adjustment fields (reusing existing point entry structure)
  points: z.number().int().min(0).max(10).optional(),
  student_action: z.string().nullable().optional(),
  teacher_action: z.string().nullable().optional(),
});

export type CreateBehaviorNoteInput = z.infer<typeof BehaviorNoteSchema>;

export interface BehaviorNote {
  id: string;
  tenant_id: string;
  placement_id: string;
  incident_date: string;
  incident_time: string;
  category: string | null;
  category_id: string | null;
  category_type: 'positive' | 'negative' | 'neutral' | null;
  description: string | null;
  action_taken: string | null;
  staff_member: string;
  staff_name: string;
  created_at: string;
  updated_at: string;
}

// For the compact Recent Activity display
export interface RecentActivityItem {
  id: string;
  type: 'point_entry' | 'behavior_note' | 'attendance';
  timestamp: string;
  summary: string;
  points?: number;
  student_action?: string;
  teacher_action?: string;
  staff_name: string;
}
```

---

## Server Actions

**File:** `app/actions/daep/behavior-notes.ts`

```typescript
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  BehaviorNoteSchema,
  type CreateBehaviorNoteInput,
  type BehaviorNote,
  type RecentActivityItem,
} from '@/lib/validation/schemas';

// ... (standard helper functions: getTenantId, checkDAEPStaffRole, logDAEPAuditEvent)

// ========== CREATE BEHAVIOR NOTE ==========

export interface CreateBehaviorNoteResult {
  success: boolean;
  note?: BehaviorNote;
  error?: string;
}

export async function createBehaviorNote(
  input: CreateBehaviorNoteInput
): Promise<CreateBehaviorNoteResult> {
  // Validates input, creates note, logs audit event
  // See full implementation in previous spec version
}

// ========== GET RECENT ACTIVITY FOR PLACEMENT ==========

export async function getRecentActivityForPlacement(
  placementId: string,
  limit: number = 5
): Promise<RecentActivityItem[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // Fetch points, notes, and attendance in parallel
  const [pointsResult, notesResult, attendanceResult] = await Promise.all([
    // Recent point entries
    supabase
      .from('daep_daily_points')
      .select('id, date, period, points, student_action, teacher_action, notes, entered_by, created_at')
      .eq('tenant_id', tenantId)
      .eq('placement_id', placementId)
      .order('created_at', { ascending: false })
      .limit(limit),

    // Recent behavior notes
    supabase
      .from('daep_behavior_notes')
      .select('id, incident_date, incident_time, category, description, action_taken, staff_member, created_at')
      .eq('tenant_id', tenantId)
      .eq('placement_id', placementId)
      .order('created_at', { ascending: false })
      .limit(limit),

    // Recent attendance changes (overrides only for activity feed)
    supabase
      .from('daep_attendance')
      .select('id, date, period, status, excused, updated_at, created_at')
      .eq('tenant_id', tenantId)
      .eq('placement_id', placementId)
      .not('updated_at', 'eq', supabase.rpc('col', ['created_at'])) // Only show updates
      .order('updated_at', { ascending: false })
      .limit(limit),
  ]);

  // Get staff names
  const staffIds = new Set<string>();
  pointsResult.data?.forEach(p => staffIds.add(p.entered_by));
  notesResult.data?.forEach(n => staffIds.add(n.staff_member));

  const { data: staffProfiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, email')
    .in('id', Array.from(staffIds));

  const staffMap = new Map(
    staffProfiles?.map(s => [s.id, s.display_name || s.email?.split('@')[0] || 'Unknown']) || []
  );

  // Combine and format activities
  const activities: RecentActivityItem[] = [];

  // Format point entries
  pointsResult.data?.forEach(p => {
    const parts = [];
    if (p.student_action && p.student_action !== 'None') parts.push(p.student_action);
    if (p.teacher_action && p.teacher_action !== 'None') parts.push(p.teacher_action);

    activities.push({
      id: p.id,
      type: 'point_entry',
      timestamp: p.created_at,
      summary: parts.length > 0 ? parts.join(' • ') : (p.notes || 'Point entry'),
      points: p.points,
      student_action: p.student_action,
      teacher_action: p.teacher_action,
      staff_name: staffMap.get(p.entered_by) || 'Unknown',
    });
  });

  // Format behavior notes
  notesResult.data?.forEach(n => {
    activities.push({
      id: n.id,
      type: 'behavior_note',
      timestamp: n.created_at,
      summary: n.description || n.category || 'Behavior note',
      staff_name: staffMap.get(n.staff_member) || 'Unknown',
    });
  });

  // Format attendance changes
  attendanceResult.data?.forEach(a => {
    activities.push({
      id: a.id,
      type: 'attendance',
      timestamp: a.updated_at,
      summary: a.excused !== null
        ? `Attendance override`
        : `Attendance changed`,
      staff_name: 'System',
    });
  });

  // Sort by timestamp and return top N
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

// ========== BULK ADD POINTS ==========

export interface BulkAddPointsInput {
  placement_ids: string[];
  date: string;
  period: string;
  points: number;
  student_action?: string;
  teacher_action?: string;
  notes?: string;
}

export async function bulkAddBehaviorPoints(
  input: BulkAddPointsInput
): Promise<{ success: boolean; count: number; error?: string }> {
  const { userId, tenantId, displayName } = await checkDAEPStaffRole();
  const supabase = await createServerClient();

  const { placement_ids, date, period, points, student_action, teacher_action, notes } = input;

  // Upsert points for all placements
  const entries = placement_ids.map(placement_id => ({
    tenant_id: tenantId,
    placement_id,
    date,
    period,
    points,
    student_action: student_action || null,
    teacher_action: teacher_action || null,
    notes: notes || `Bulk: +${points} points`,
    entered_by: userId,
  }));

  const { error } = await supabase
    .from('daep_daily_points')
    .upsert(entries, {
      onConflict: 'tenant_id,placement_id,date,period',
    });

  if (error) {
    console.error('Bulk add points error:', error);
    return { success: false, count: 0, error: 'Failed to add points' };
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'points.bulk_added',
    userId,
    'bulk',
    `Bulk added ${points} points to ${placement_ids.length} students`,
    tenantId,
    { placement_ids, points, period, date }
  );

  revalidatePath('/daep/rooms');
  return { success: true, count: placement_ids.length };
}
```

---

## UI Components

### 1. InlineStudentPanel

**File:** `components/daep/roster/InlineStudentPanel.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Pencil, Circle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/date';
import type { RecentActivityItem } from '@/lib/validation/schemas';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';

interface InlineStudentPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  placementId: string;
  studentName: string;
  schoolId: string;
  recentActivity: RecentActivityItem[];
  categories: BehaviorCategory[];
  onSaveEntry: (data: EntryData) => Promise<void>;
}

interface EntryData {
  points: number;
  student_action: string | null;
  teacher_action: string | null;
  notes: string;
}

// Point adjustments (hardcoded for now, future: from settings)
const POINT_ADJUSTMENTS = [
  { value: 10, label: '+10' },
  { value: 5, label: '+5' },
  { value: 0, label: '0 (Note Only)' },
  { value: -5, label: '-5' },
  { value: -10, label: '-10' },
  { value: -15, label: '-15' },
];

// Point badge colors
const getPointBadgeClass = (points: number) => {
  if (points > 0) return 'bg-green-100 text-green-700';
  if (points < 0) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

// Activity icon
const ActivityIcon = ({ type }: { type: RecentActivityItem['type'] }) => {
  if (type === 'attendance') return <Circle className="h-3 w-3 text-muted-foreground" />;
  return <Pencil className="h-3 w-3 text-muted-foreground" />;
};

export function InlineStudentPanel({
  isExpanded,
  onToggle,
  placementId,
  studentName,
  schoolId,
  recentActivity,
  categories,
  onSaveEntry,
}: InlineStudentPanelProps) {
  // Entry form state
  const [points, setPoints] = useState(10);
  const [studentAction, setStudentAction] = useState<string>('');
  const [teacherAction, setTeacherAction] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSaveEntry({
        points,
        student_action: studentAction || null,
        teacher_action: teacherAction || null,
        notes,
      });
      // Reset form
      setPoints(10);
      setStudentAction('');
      setTeacherAction('');
      setNotes('');
    } finally {
      setIsSaving(false);
    }
  }, [points, studentAction, teacherAction, notes, onSaveEntry]);

  return (
    <>
      {/* Expand/Collapse Button (in Adjust column) */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="h-8 w-8 p-0"
      >
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {/* Expanded Panel */}
      {isExpanded && (
        <tr>
          <td colSpan={100} className="p-0">
            <div className="bg-muted/30 border-t border-b px-4 py-3 space-y-3">

              {/* Entry Form - Single Line */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Add:</span>

                {/* Points - from settings (hardcoded for now) */}
                <Select value={String(points)} onValueChange={(v) => setPoints(Number(v))}>
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue placeholder="Adjustment" />
                  </SelectTrigger>
                  <SelectContent>
                    {POINT_ADJUSTMENTS.map((adj) => (
                      <SelectItem key={adj.value} value={String(adj.value)}>
                        <span className={cn(
                          adj.value > 0 && 'text-green-600',
                          adj.value < 0 && 'text-red-600'
                        )}>
                          {adj.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Student Action - positive & negative from behavior categories */}
                <Select value={studentAction} onValueChange={setStudentAction}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Student Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {categories
                      .filter(c => c.category_type === 'positive' || c.category_type === 'negative')
                      .map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          <span className={cn(
                            c.category_type === 'positive' && 'text-green-600',
                            c.category_type === 'negative' && 'text-red-600'
                          )}>
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* Teacher Action - neutral from behavior categories */}
                <Select value={teacherAction} onValueChange={setTeacherAction}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Teacher Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {categories
                      .filter(c => c.category_type === 'neutral')
                      .map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* Notes */}
                <Input
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex-1 min-w-[150px] h-8"
                />

                {/* Save */}
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>

              {/* Recent Activity */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Recent Activity ({recentActivity.length})
                  </span>
                  <a
                    href={`/daep/students/${schoolId}?tab=activity`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View All <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {recentActivity.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recent activity</p>
                ) : (
                  <div className="space-y-0.5">
                    {recentActivity.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <ActivityIcon type={item.type} />
                          {item.points !== undefined && (
                            <span className={cn(
                              'px-1.5 py-0.5 rounded text-xs font-medium',
                              getPointBadgeClass(item.points)
                            )}>
                              {item.points > 0 ? `+${item.points}` : item.points}
                            </span>
                          )}
                          <span className="text-muted-foreground truncate max-w-[300px]">
                            {item.summary}
                          </span>
                        </div>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
```

### 2. BulkActionsToolbar (Update Existing)

**File:** `components/daep/roster/BulkActionsToolbar.tsx`

Add quick point buttons:

```typescript
// Add to existing BulkActionsToolbar
<div className="flex items-center gap-2">
  <span className="text-sm text-muted-foreground">
    {selectedCount} selected
  </span>
  <div className="h-4 w-px bg-border" />

  {/* Quick Point Buttons */}
  <Button size="sm" variant="outline" onClick={() => onBulkPoints(10)}>10</Button>
  <Button size="sm" variant="outline" onClick={() => onBulkPoints(8)}>8</Button>
  <Button size="sm" variant="outline" onClick={() => onBulkPoints(5)}>5</Button>
  <Button size="sm" variant="outline" onClick={() => onBulkPoints(0)}>0</Button>

  <div className="h-4 w-px bg-border" />

  {/* Detailed Entry */}
  <Button size="sm" variant="default" onClick={onOpenBulkModal}>
    + Detailed...
  </Button>

  <Button size="sm" variant="ghost" onClick={onClearSelection}>
    Clear
  </Button>
</div>
```

### 3. Compact Activity Item

**File:** `components/daep/roster/CompactActivityItem.tsx`

```typescript
'use client';

import { Pencil, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/date';
import type { RecentActivityItem } from '@/lib/validation/schemas';

const getPointBadgeClass = (points: number) => {
  if (points > 0) return 'bg-green-100 text-green-700';
  if (points < 0) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

export function CompactActivityItem({ item }: { item: RecentActivityItem }) {
  const Icon = item.type === 'attendance' ? Circle : Pencil;

  return (
    <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />

        {item.points !== undefined && (
          <span className={cn(
            'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
            getPointBadgeClass(item.points)
          )}>
            {item.points > 0 ? `+${item.points}` : item.points}
          </span>
        )}

        <span className="text-foreground truncate">
          {item.summary}
        </span>
      </div>

      <span className="text-muted-foreground whitespace-nowrap ml-2 flex-shrink-0">
        {formatRelativeTime(item.timestamp)}
      </span>
    </div>
  );
}
```

---

## Integration with Activity Timeline

Notes created via this inline panel will automatically appear in:

1. **Student Profile → Activity Timeline tab** (existing - UI update needed)
2. **Inline panel Recent Activity** (new, shows last 5)

### Activity Timeline UI Update

**Current State (Card Layout):**
```
┌────────────────────────────────────────────────────────────────────┐
│  [+5]  Dec 6, 2025 • Period 1                                  ✎  │
│        Bulk: +5 points                                            │
│        👤 Test - Wallace  ⏱ 7:00 PM                               │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│  [-10] Dec 6, 2025 • Period 1 • Disruptive                     ✎  │
│        👤 Conference  👤 Test - Wallace  ⏱ 5:24 PM                │
└────────────────────────────────────────────────────────────────────┘
```

**New State (Compact Single-Line - matches Recent Activity):**
```
┌────────────────────────────────────────────────────────────────────┐
│ Activity Timeline                              Last 30 days ▾     │
├────────────────────────────────────────────────────────────────────┤
│  ✎  +5 pts • Bulk: +5 points                          Dec 6, 7 PM │
│  ✎  0 pts • Parent called to check on progress        Dec 6, 5 PM │
│  ✎  -10 pts • Disruptive • Conference                 Dec 6, 5 PM │
│  ○  Attendance override                                 Yesterday │
│  ○  Attendance changed                                  Yesterday │
└────────────────────────────────────────────────────────────────────┘
```

**Changes to StudentPointsLog.tsx:**
1. Replace card layout with compact single-line format
2. Use same styling as `CompactActivityItem` component
3. Keep edit button (✎) on hover for admin users
4. Keep date filter dropdown (Last 30 days, etc.)
5. Keep Export button

**File:** `components/daep/StudentPointsLog.tsx` (modify)

```typescript
// Replace ActivityCard with CompactActivityItem
// Keep existing query logic, just change rendering

{entries.map((item) => (
  <CompactActivityItem
    key={item.id}
    item={item}
    showEditButton={userRole && ['super_admin', 'district_admin', 'daep_admin_l1'].includes(userRole)}
    onEdit={() => handleEdit(item)}
  />
))}
```

This creates visual consistency between:
- **Room Roster → Inline Panel → Recent Activity** (compact)
- **Student Profile → Activity Timeline tab** (compact, same style)

---

## Acceptance Criteria

| AC | Description | Test |
|----|-------------|------|
| 4.1.1 | Click ▼ chevron expands inline panel | Click chevron, verify panel slides down |
| 4.1.2 | Click ▲ chevron collapses panel | Click again, verify panel slides up |
| 4.1.3 | Click student name navigates to profile | Click name, verify navigation |
| 4.1.4 | Entry form shows Points, Student, Teacher, Notes | Expand panel, verify fields |
| 4.1.5 | Save creates point entry with actions | Save entry, verify in DB |
| 4.1.6 | Recent Activity shows last 5 items | Verify 5 items displayed |
| 4.1.7 | Recent Activity compact style (single line) | Verify styling matches spec |
| 4.1.8 | "View All" links to student profile Activity tab | Click link, verify navigation |
| 4.1.9 | Bulk selection shows quick point buttons | Select 2+, verify toolbar |
| 4.1.10 | Quick point button applies to all selected | Click [+5], verify all get 5 pts |
| 4.1.11 | Incident date/time editable | Modify date, verify saved correctly |
| 4.1.12 | Audit trail preserves created_at | Check created_at unchanged on edit |

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/[timestamp].sql` | Create | Add incident_date/time, category_id, RLS |
| `lib/validation/schemas.ts` | Modify | Add BehaviorNoteSchema, RecentActivityItem |
| `app/actions/daep/behavior-notes.ts` | Create | CRUD for behavior notes |
| `components/daep/roster/InlineStudentPanel.tsx` | Create | Expandable row panel |
| `components/daep/roster/CompactActivityItem.tsx` | Create | Single-line activity item (shared) |
| `components/daep/roster/BulkActionsToolbar.tsx` | Modify | Add quick point buttons |
| `components/daep/roster/RoomRosterTable.tsx` | Modify | Integrate inline panel |
| `components/daep/StudentPointsLog.tsx` | Modify | Change to compact layout, add behavior notes |
| `lib/utils/date.ts` | Create/Modify | Add formatRelativeTime helper |

---

## Out of Scope

| Item | Story |
|------|-------|
| Full behavior notes list page | Story 4-3 |
| Attach notes without placement | Story 4-4 |
| Full timeline integration | Story 4-5 |
| Edit/delete inline entries | Future |

---

## Testing Plan

1. **TypeScript compilation**
2. **Inline panel:**
   - Expand/collapse animation smooth
   - Form saves correctly
   - Recent activity displays
3. **Bulk actions:**
   - Selection persists across scroll
   - Quick buttons apply to all
   - Clear deselects all
4. **Click zones:**
   - Name click → profile
   - Chevron click → expand (not navigate)
5. **Activity Timeline integration:**
   - New entries appear in profile timeline
6. **Playwright MCP verification**

---

## Dependencies

- Story 1.10 (Behavior Categories) - **DONE**
- Epic 2 (Placements) - **DONE**
- Story 3-2 (Point Entry Grid) - **DONE**
- Story 3-3 (Bulk Point Entry) - **DONE**

---

_Tech Spec Version: 2.0_
_Created: 2025-12-07_
_Updated: 2025-12-08 - Inline expandable row UX, compact activity style_
_Author: Claude (AI Assistant)_
