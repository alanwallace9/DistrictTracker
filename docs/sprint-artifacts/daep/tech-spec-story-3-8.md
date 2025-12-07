# Tech Spec: Story 3.8 - Point Audit Trail

**Story:** 3-8
**Points:** 3
**FRs:** FR37
**Dependencies:** Stories 3-2 through 3-6 (all already logging to audit trail)

---

## Overview

Add **comprehensive audit trail visibility** via UI components at two levels:
1. **Student-level:** All changes across all placements (Audit Log tab on profile)
2. **Placement-level:** Changes specific to one placement (on each PlacementCard)

The logging infrastructure already exists in `points.ts` - this story creates the UI to view, filter, and navigate audit entries.

**Key Insight:** All point actions (entered, approved, rejected, edited, deleted) are ALREADY being logged to `admin_audit_log` with `module = 'daep_management'`. This story is primarily UI work.

---

## Current Audit Event Types (Already Implemented)

### Point Events (from `points.ts`)

| Event Type | Trigger | Details Logged |
|------------|---------|----------------|
| `points.base_auto_approved` | Base points by approved teacher | date, period, points, approval_status |
| `points.base_pending_approval` | Base points by non-approved staff | date, period, points, approval_status |
| `points.base_removed` | Attendance changed to absent | date, period |
| `points.auto_approved` | Adjustment by approved teacher | date, period, adjustment, student_action, teacher_action, notes |
| `points.pending_approval` | Adjustment by non-approved staff | date, period, adjustment, student_action, teacher_action, notes |
| `points.adjustment_deleted` | User/admin deletes adjustment | entry_id, period, points |
| `points.adjustment_edited` | User/admin edits adjustment | before/after values |
| `points.bulk_auto_approved` | Bulk entry by approved teacher | affected_count, placement_ids |
| `points.bulk_pending_approval` | Bulk entry by non-approved staff | affected_count, placement_ids |
| `points.approved_by_admin` | Admin approves pending entry | original_entered_by, approved_by_name |
| `points.rejected_by_admin` | Admin rejects pending entry | rejection_reason |
| `points.bulk_approved_by_admin` | Admin bulk approves | entry_ids, approved_count |
| `points.edited_and_approved` | Admin edits & approves | before/after values |

### Placement Events (from `placements.ts`)

| Event Type | Trigger | Details Logged |
|------------|---------|----------------|
| `placement.created` | New placement created | offense_code, days_assigned, room_id |
| `placement.updated` | Placement edited | before/after values |
| `placement.intake_processed` | Status → active | intake_date |
| `placement.transitioned` | Status change | from_status, to_status |
| `placement.cancelled` | Placement cancelled | reason |
| `placement.no_show` | Marked as no-show | no_show_date |
| `placement.rollover_decision` | Rollover handled | decision (continue/complete) |
| `room.assignment_changed` | Room reassignment | old_room, new_room |
| `student.separation_added` | Separation created | other_student, reason |
| `student.separation_removed` | Separation removed | other_student |

### Future: Attendance Events (Story 3.12)

| Event Type | Trigger | Details Logged |
|------------|---------|----------------|
| `attendance.marked` | Attendance recorded | status, period |
| `attendance.override` | Admin overrides | before/after, reason |

---

## UI/UX Design

### 1. Student Profile - Audit Log Tab

Full audit history across ALL placements for this student:

```
┌─────────────────────────────────────────────────────────────────┐
│ [Overview] [Placement] [Activity] [Audit Log]                   │
├─────────────────────────────────────────────────────────────────┤
│ Student Audit Trail                           [Export CSV ▼]    │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Filters: [Date Range ▼] [User ▼] [Type ▼] [Placement ▼]    │ │
│ │          ○ Points  ○ Attendance  ○ Placement  ● All         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ✅ Dec 7, 2025 10:32 AM              Placement #2 (Current) │ │
│ │ John Smith approved +5 points for Period 3                  │ │
│ │ Original entry by: Jane Doe                                 │ │
│ │ [View Details]                            [Jump to Entry →] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📍 Dec 5, 2025 8:00 AM               Placement #2 (Current) │ │
│ │ System: Room assignment changed                             │ │
│ │ From: Room 101 → Room 203 (Separation conflict)             │ │
│ │ [View Details]                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ➕ Nov 28, 2025 9:15 AM              Placement #1 (Complete) │ │
│ │ Jane Doe created placement                                  │ │
│ │ Code 42 - Fighting | 20 days assigned                       │ │
│ │ [View Details]                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Showing 20 of 47 entries                     [Load More (27)]   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Placement Card - Mini Audit Log

Compact audit view on each placement card (in placement history):

```
┌─────────────────────────────────────────────────────────────────┐
│ Placement #2 - Active                                    [···]  │
│ Code 42 - Fighting | 15/20 days | Room 203                      │
├─────────────────────────────────────────────────────────────────┤
│ Recent Activity (3)                           [View All →]      │
│ ────────────────────────────────────────────────────────────── │
│ ✅ 10:32 AM - Points approved (+5, Period 3)                    │
│ ✏️  9:15 AM - Points edited (-5 → -10)                          │
│ 📍 Yesterday - Room changed (101 → 203)                         │
└─────────────────────────────────────────────────────────────────┘
```

Click "View All →" opens a sheet/modal with full placement-specific audit log.

### 3. Event Type Icons & Colors

| Category | Event Types | Icon | Color |
|----------|-------------|------|-------|
| Created | `*.created`, `points.*_approved` (new) | ➕ | Green |
| Approved | `points.approved_*`, `points.edited_and_approved` | ✅ | Green |
| Rejected | `points.rejected_*` | ❌ | Red |
| Edited | `*.edited`, `*.updated` | ✏️ | Amber |
| Deleted/Removed | `*.deleted`, `*.removed`, `*.cancelled` | 🗑️ | Red |
| Bulk Action | `*.bulk_*` | 📦 | Blue |
| Status Change | `placement.transitioned`, `placement.intake_*` | 🔄 | Purple |
| Room/Assignment | `room.*`, `student.separation_*` | 📍 | Slate |
| Attendance | `attendance.*` | 📋 | Teal |

### 4. Expanded Detail View

Click "View Details" to expand:

```
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Dec 7, 2025 10:32 AM                                         │
│ John Smith approved +5 points for Period 3                      │
│ ────────────────────────────────────────────────────────────── │
│ Event Type: points.approved_by_admin                            │
│ Placement: #2 (Active)                                          │
│ ────────────────────────────────────────────────────────────── │
│ Student Action: Disruptive Behavior                             │
│ Teacher Action: Redirected                                      │
│ Notes: "Disrupted class during reading time"                    │
│ ────────────────────────────────────────────────────────────── │
│ Original Entry By: Jane Doe (9:15 AM)                           │
│ Approved By: John Smith                                         │
│ Entry ID: 550e8400-e29b-41d4...              [📋 Copy ID]       │
│                                                                 │
│                                    [Close]  [Jump to Entry →]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model

**No new tables needed.** Uses existing `admin_audit_log` table:

```sql
-- Existing table structure
admin_audit_log (
  id UUID PRIMARY KEY,
  event_type TEXT,           -- 'points.approved_by_admin', etc.
  actor_id TEXT,             -- User who performed action
  target_id TEXT,            -- placement_id
  action TEXT,               -- Human-readable action description
  details JSONB,             -- All event-specific details
  tenant_id TEXT,
  module TEXT,               -- 'daep_management'
  record_school_id TEXT,     -- Student school_id (for student-level queries)
  created_at TIMESTAMPTZ
)
```

### Query Patterns

**Student-level (all placements):**
```sql
SELECT * FROM admin_audit_log
WHERE tenant_id = $1
  AND module = 'daep_management'
  AND (target_id = ANY($2) OR record_school_id = $3)  -- placement IDs or student ID
ORDER BY created_at DESC
LIMIT 20 OFFSET $4;
```

**Placement-level:**
```sql
SELECT * FROM admin_audit_log
WHERE tenant_id = $1
  AND module = 'daep_management'
  AND target_id = $2  -- specific placement_id
ORDER BY created_at DESC
LIMIT 20 OFFSET $3;
```

---

## Server Actions

### `app/actions/daep/audit.ts`

```typescript
// Types
export interface AuditEntry {
  id: string;
  event_type: string;
  actor_id: string;
  actor_name: string;
  target_id: string;        // placement_id
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  placement_label?: string; // "Placement #2 (Active)"
}

export interface AuditFilterOptions {
  // Scope
  studentId?: string;       // All placements for student
  placementId?: string;     // Single placement
  placementIds?: string[];  // Multiple placements

  // Filters
  userId?: string;          // Filter by acting user
  eventCategory?: 'points' | 'attendance' | 'placement' | 'all';
  eventType?: string;       // Specific event type
  startDate?: string;
  endDate?: string;

  // Pagination
  limit?: number;           // Default 20
  offset?: number;
}

export interface AuditLogResult {
  entries: AuditEntry[];
  total: number;
  hasMore: boolean;
}

// Server Actions
getStudentAuditLog(studentId: string, options?: AuditFilterOptions): Promise<AuditLogResult>
getPlacementAuditLog(placementId: string, options?: AuditFilterOptions): Promise<AuditLogResult>
getAuditLogUsers(studentId?: string): Promise<{ id: string; name: string }[]>
getRecentPlacementActivity(placementId: string, limit?: number): Promise<AuditEntry[]>
```

---

## UI Components

### `components/daep/audit/StudentAuditLog.tsx`

Full audit log for student profile tab:

```typescript
interface Props {
  studentId: string;
  placements: { id: string; label: string }[];  // For filter dropdown
}
```

### `components/daep/audit/PlacementAuditLog.tsx`

Full audit log for single placement (sheet/modal):

```typescript
interface Props {
  placementId: string;
  placementLabel: string;
  open: boolean;
  onClose: () => void;
}
```

### `components/daep/audit/PlacementActivityPreview.tsx`

Mini audit preview on placement card:

```typescript
interface Props {
  placementId: string;
  maxItems?: number;        // Default 3
  onViewAll: () => void;
}
```

### `components/daep/audit/AuditEntryCard.tsx`

Individual audit entry display:

```typescript
interface Props {
  entry: AuditEntry;
  showPlacement?: boolean;  // Show placement label (for student-level view)
  expanded?: boolean;
  onToggle?: () => void;
  onJumpToEntry?: () => void;
}
```

### `components/daep/audit/AuditLogFilters.tsx`

Filter controls:

```typescript
interface Props {
  placements?: { id: string; label: string }[];  // For placement filter
  users: { id: string; name: string }[];
  showCategoryToggle?: boolean;  // Points/Attendance/Placement/All
  onFilterChange: (filters: AuditFilterOptions) => void;
}
```

---

## Files to Create/Modify

**Create:**
| File | Purpose |
|------|---------|
| `app/actions/daep/audit.ts` | Audit log server actions |
| `components/daep/audit/StudentAuditLog.tsx` | Full student audit log |
| `components/daep/audit/PlacementAuditLog.tsx` | Placement-specific audit (sheet) |
| `components/daep/audit/PlacementActivityPreview.tsx` | Mini preview on card |
| `components/daep/audit/AuditEntryCard.tsx` | Individual entry display |
| `components/daep/audit/AuditLogFilters.tsx` | Filter controls |
| `components/daep/audit/audit-utils.ts` | Icon/color mapping, formatters |

**Modify:**
| File | Changes |
|------|---------|
| `app/daep/(main)/students/[school_id]/page.tsx` | Add "Audit Log" tab |
| `components/daep/PlacementCard.tsx` | Add activity preview section |
| `components/daep/PlacementHistoryCard.tsx` | Add activity preview section |

---

## Access Control

- **Full audit log (student tab):** Admin roles only (`daep_admin_l1`, `district_admin`, `super_admin`)
- **Placement activity preview:** All DAEP staff (limited view, no sensitive details)
- **RLS:** Existing tenant isolation via `tenant_id` check

```typescript
// In getStudentAuditLog - admin only
const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
if (!adminRoles.includes(role)) {
  throw new Error('Only administrators can view full audit logs');
}

// In getRecentPlacementActivity - all staff, limited fields
// Returns: event_type, action, created_at (no sensitive details)
```

---

## Implementation Tasks

### Task 1: Server Actions (1.5 hours)
- [ ] Create `app/actions/daep/audit.ts`
- [ ] Implement `getStudentAuditLog()` with all filters
- [ ] Implement `getPlacementAuditLog()`
- [ ] Implement `getRecentPlacementActivity()` (limited, all staff)
- [ ] Implement `getAuditLogUsers()` for dropdown
- [ ] Add role checks (admin for full, staff for preview)

### Task 2: Utility Functions (0.5 hours)
- [ ] Create `audit-utils.ts`
- [ ] Event type → icon/color mapping
- [ ] Relative timestamp formatter
- [ ] Event type grouping for filters
- [ ] Action text formatter (make human-readable)

### Task 3: Audit Entry Card (0.5 hours)
- [ ] Create `AuditEntryCard.tsx`
- [ ] Expandable details section
- [ ] Before/after diff view for edits
- [ ] Copy ID button
- [ ] Jump to entry link (when applicable)

### Task 4: Filter Controls (0.5 hours)
- [ ] Create `AuditLogFilters.tsx`
- [ ] Date range picker
- [ ] User dropdown
- [ ] Event category toggle (Points/Attendance/Placement/All)
- [ ] Placement dropdown (student-level only)
- [ ] Clear filters button

### Task 5: Placement Activity Preview (0.5 hours)
- [ ] Create `PlacementActivityPreview.tsx`
- [ ] Compact 3-item list
- [ ] "View All" button
- [ ] Empty state

### Task 6: Full Audit Log Components (1 hour)
- [ ] Create `StudentAuditLog.tsx` with filters
- [ ] Create `PlacementAuditLog.tsx` as Sheet
- [ ] Pagination with "Load More"
- [ ] Empty state and loading states
- [ ] Total count display

### Task 7: Integration (0.5 hours)
- [ ] Add "Audit Log" tab to student profile (admin-only)
- [ ] Add activity preview to PlacementCard
- [ ] Add activity preview to PlacementHistoryCard
- [ ] Wire up "View All" to open PlacementAuditLog sheet

---

## Quick Wins (Implementing)

| Feature | Location | Effort |
|---------|----------|--------|
| ✅ Relative timestamps | `audit-utils.ts` | Low |
| ✅ Copy entry ID to clipboard | `AuditEntryCard` | Low |
| ✅ Expand/Collapse all buttons | `StudentAuditLog` | Low |
| ✅ Arrow key navigation | `StudentAuditLog` | Low |

### Keyboard Navigation
- **↑/↓ or W/S** - Move selection up/down through entries
- **E** - Expand/collapse selected entry
- Visual highlight on selected entry
- Focus trap within audit log when navigating

## Additional Quick Wins (3 More)

| Feature | Location | Effort | Description |
|---------|----------|--------|-------------|
| 🔍 Quick search | `AuditLogFilters` | Low | Search within action text |
| 📊 Summary stats | `StudentAuditLog` | Low | "47 total: 32 points, 10 attendance, 5 placement" |
| 🔗 Shareable link | `AuditEntryCard` | Low | Copy link to specific audit entry |

---

## Event Category Groups (for Filter Toggle)

```typescript
const eventCategories = {
  points: [
    'points.base_auto_approved',
    'points.base_pending_approval',
    'points.base_removed',
    'points.auto_approved',
    'points.pending_approval',
    'points.adjustment_deleted',
    'points.adjustment_edited',
    'points.bulk_auto_approved',
    'points.bulk_pending_approval',
    'points.approved_by_admin',
    'points.rejected_by_admin',
    'points.bulk_approved_by_admin',
    'points.edited_and_approved',
  ],
  attendance: [
    'attendance.marked',
    'attendance.override',
  ],
  placement: [
    'placement.created',
    'placement.updated',
    'placement.intake_processed',
    'placement.transitioned',
    'placement.cancelled',
    'placement.no_show',
    'placement.rollover_decision',
    'room.assignment_changed',
    'student.separation_added',
    'student.separation_removed',
  ],
};
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No audit entries | Show "No activity recorded" empty state |
| Student has 5+ placements | Placement filter dropdown with all options |
| Filter returns empty | Show "No entries match filters" with clear button |
| User no longer exists | Show "Unknown User" for actor_name |
| Very long notes | Truncate at 150 chars, show full in expanded |
| Bulk action with 50+ students | Show count, don't list all IDs |

---

## Out of Scope (Deferred)

| Item | Deferred To |
|------|-------------|
| Global audit page in settings | After TT/DAEP settings merge |
| CSV export of audit log | Epic 6, Story 6.12 |
| Email notifications for audit events | Epic 7 |

---

## Future: Global Audit Page

When TT/DAEP settings merge, create unified audit page at `/settings/audit`:

```
┌─────────────────────────────────────────────────────────────────┐
│ System Audit Log                                                │
├─────────────────────────────────────────────────────────────────┤
│ Module: [DAEP ▼] [Trespass Tracker ▼] [All]                     │
│ Filters: [Date Range] [User] [Event Type] [Student Search]      │
├─────────────────────────────────────────────────────────────────┤
│ ... unified audit entries from all modules ...                  │
└─────────────────────────────────────────────────────────────────┘
```

---

_Tech Spec Updated: 2025-12-07_
_For Story 3-8: Point Audit Trail_
_Incorporates: Dual-level audit, placement card preview, all student changes_
