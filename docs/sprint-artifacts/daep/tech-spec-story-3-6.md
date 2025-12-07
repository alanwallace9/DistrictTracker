# Tech Spec: Story 3.6 - Pending Approval Workflow

**Story:** 3-6
**Points:** 3
**FRs:** FR32, FR33
**Dependencies:** Story 3.5 (Approved Teacher Auto-Finalize)

---

## Overview

This story provides the **admin experience** for reviewing and approving point entries from non-approved staff members. Story 3.5 creates entries with `approval_status = 'pending'` - this story provides the queue UI and actions to process them.

**Key Flows:**
1. Admin sees pending count badge in navigation
2. Admin opens `/daep/approvals` queue page
3. Admin reviews entries: student, points, reason, notes
4. Admin takes action: Approve, Reject, or Edit & Approve
5. Entry status updated, audit logged

---

## User Workflow

### Scenario: Admin Reviews Pending Entries

```
Admin logs in
→ Navigation shows "Approvals (3)" badge indicating 3 pending entries
→ Admin clicks to open /daep/approvals
→ Queue table shows pending entries grouped by date
→ Admin sees: Carlos Martinez | Period 2 | +5 | "Good participation" | Ms. Johnson
→ Admin clicks "Approve" ✓
→ Entry moves to approved, public = true
→ Badge updates to (2)
→ Success toast: "Entry approved"
```

### Scenario: Admin Rejects Entry

```
Admin sees entry: David Lee | Period 4 | -10 | "Disrespectful" | Mr. Smith
→ Admin clicks "Reject" ✗
→ Confirmation dialog: "Reject this entry? The staff member will be notified."
→ Admin confirms
→ Entry marked rejected, remains private
→ (Future: notification sent to original staff member)
```

### Scenario: Admin Edits Before Approving

```
Admin sees entry: Maria Garcia | Period 1 | -15 | "Critical behavior" | Ms. Johnson
→ Admin thinks -15 is too harsh, wants to change to -10
→ Admin clicks "Edit"
→ Edit dialog opens with current values
→ Admin changes adjustment from -15 to -10
→ Admin changes student_action to "Minor disruption"
→ Admin clicks "Save & Approve"
→ Entry updated and approved in one action
```

---

## Data Model

### Existing Fields (No Schema Changes)

The `daep_daily_points` table already has:

```sql
-- Approval status: 'approved', 'pending', 'rejected'
approval_status TEXT DEFAULT 'pending'

-- Public visibility flag (to students/parents)
public BOOLEAN DEFAULT false

-- Who entered the points
entered_by UUID REFERENCES auth.users(id)
```

### Query for Pending Entries

```sql
SELECT
  dp.id,
  dp.placement_id,
  dp.date,
  dp.period,
  dp.points_earned,
  dp.student_action,
  dp.teacher_action,
  dp.notes,
  dp.entered_by,
  dp.created_at,
  dp.is_base_points,
  -- Student info via placement
  p.school_id,
  s.first_name,
  s.last_name,
  -- Staff info
  u.display_name as entered_by_name
FROM daep_daily_points dp
JOIN daep_placements p ON dp.placement_id = p.id
JOIN students s ON p.school_id = s.school_id AND p.tenant_id = s.tenant_id
LEFT JOIN user_profiles u ON dp.entered_by = u.id
WHERE dp.tenant_id = $1
  AND dp.approval_status = 'pending'
ORDER BY dp.date DESC, dp.created_at DESC;
```

---

## UI Components

### 1. Navigation Badge

Add pending count badge to the DAEP navigation sidebar.

**Location:** `components/daep/DAEPSidebar.tsx`

```tsx
// Add "Approvals" nav item with badge
{
  name: 'Approvals',
  href: '/daep/approvals',
  icon: CheckCircle,
  badge: pendingCount > 0 ? pendingCount : undefined,
  roles: ['super_admin', 'district_admin', 'daep_admin_l1'], // Only admins see this
}
```

**Badge Styling:**
- Red/orange background for urgency
- Shows count (max display: "99+")
- Hidden when count is 0

### 2. Approvals Queue Page

**Route:** `/daep/approvals`
**Access:** `super_admin`, `district_admin`, `daep_admin_l1` only

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Point Approvals                                         [Approve All (3)]  │
│  Review and approve point entries from staff                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─── Today (Dec 7, 2025) ────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ☐  Martinez, Carlos    P2    +5    Good participation    Ms. Johnson  │ │
│  │     8:42 AM                                              [Edit] [✓] [✗] │ │
│  │                                                                         │ │
│  │  ☐  Lee, David          P4    -10   Disruptive behavior   Mr. Smith    │ │
│  │     10:15 AM                                             [Edit] [✓] [✗] │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─── Yesterday (Dec 6, 2025) ────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ☐  Garcia, Maria       P1    -15   Critical behavior     Ms. Johnson  │ │
│  │     2:30 PM                                              [Edit] [✓] [✗] │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  No more pending entries                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Grouped by date (Today, Yesterday, older dates)
- Checkbox for bulk selection
- "Approve All" button for bulk approve
- Each row shows: Student name, Period, Points, Student action, Entered by, Time
- Action buttons: Edit, Approve (✓), Reject (✗)
- Click student name to view profile (optional)
- Empty state when no pending entries

### 3. Edit Before Approve Dialog

When admin clicks "Edit", open a dialog similar to `PointAdjustmentDialog` but:
- Pre-filled with current values
- "Save & Approve" button instead of just "Save"
- On save: updates entry AND sets approved

```
┌─────────────────────────────────────────────────────────────────┐
│  Edit & Approve                                                 │
│  Martinez, Carlos • Period 2 • Dec 7, 2025                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Adjustment *                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ +5                                                   ▼  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Student Action                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Good participation                                   ▼  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Teacher Action                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Verbal praise                                        ▼  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Notes                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Actively engaged in group work                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Original entry by: Ms. Johnson at 8:42 AM                      │
│                                                                 │
│                              [Cancel]    [Save & Approve]       │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Reject Confirmation Dialog

Simple confirmation before rejecting:

```
┌─────────────────────────────────────────────────────────────────┐
│  Reject Entry?                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  This will reject the point entry for:                          │
│                                                                 │
│  Martinez, Carlos • Period 2 • +5 points                        │
│                                                                 │
│  The entry will be marked as rejected and will not count        │
│  toward the student's points.                                   │
│                                                                 │
│  Reason (optional):                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                              [Cancel]    [Reject Entry]         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Server Actions

### 1. getPendingApprovals

```typescript
// app/actions/daep/points.ts

export interface PendingApprovalEntry {
  id: string;
  placement_id: string;
  school_id: string;
  student_first_name: string;
  student_last_name: string;
  date: string;
  period: string;
  points_earned: number;
  is_base_points: boolean;
  student_action: string | null;
  teacher_action: string | null;
  notes: string | null;
  entered_by: string;
  entered_by_name: string;
  created_at: string;
}

export async function getPendingApprovals(): Promise<PendingApprovalEntry[]> {
  const { tenantId, role } = await checkDAEPStaffRole();

  // Only admins can view pending approvals
  const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
  if (!adminRoles.includes(role)) {
    throw new Error('Only administrators can view pending approvals');
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('daep_daily_points')
    .select(`
      id,
      placement_id,
      date,
      period,
      points_earned,
      is_base_points,
      student_action,
      teacher_action,
      notes,
      entered_by,
      created_at,
      daep_placements!inner (
        school_id,
        students!inner (
          first_name,
          last_name
        )
      ),
      user_profiles!entered_by (
        display_name
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('approval_status', 'pending')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending approvals:', error);
    throw new Error('Failed to fetch pending approvals');
  }

  return (data || []).map(entry => ({
    id: entry.id,
    placement_id: entry.placement_id,
    school_id: entry.daep_placements.school_id,
    student_first_name: entry.daep_placements.students.first_name,
    student_last_name: entry.daep_placements.students.last_name,
    date: entry.date,
    period: entry.period,
    points_earned: entry.points_earned,
    is_base_points: entry.is_base_points,
    student_action: entry.student_action,
    teacher_action: entry.teacher_action,
    notes: entry.notes,
    entered_by: entry.entered_by,
    entered_by_name: entry.user_profiles?.display_name || 'Unknown',
    created_at: entry.created_at,
  }));
}
```

### 2. getPendingApprovalsCount

For the navigation badge:

```typescript
export async function getPendingApprovalsCount(): Promise<number> {
  const { tenantId, role } = await checkDAEPStaffRole();

  // Only admins see the count
  const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
  if (!adminRoles.includes(role)) {
    return 0;
  }

  const supabase = await createServerClient();

  const { count, error } = await supabase
    .from('daep_daily_points')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('approval_status', 'pending');

  if (error) {
    console.error('Error fetching pending count:', error);
    return 0;
  }

  return count || 0;
}
```

### 3. approvePointEntry

```typescript
export async function approvePointEntry(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId, role, displayName } = await checkDAEPStaffRole();

    // Only admins can approve
    const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
    if (!adminRoles.includes(role)) {
      return { success: false, error: 'Only administrators can approve entries' };
    }

    const supabase = await createServerClient();

    // Get entry details for audit
    const { data: entry, error: fetchError } = await supabase
      .from('daep_daily_points')
      .select('placement_id, date, period, points_earned, entered_by')
      .eq('id', entryId)
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Entry not found or already processed' };
    }

    // Update to approved
    const { error: updateError } = await supabase
      .from('daep_daily_points')
      .update({
        approval_status: 'approved',
        public: true,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error approving entry:', updateError);
      return { success: false, error: 'Failed to approve entry' };
    }

    // Audit log
    await logPointsAuditEvent(
      supabase,
      'points.approved_by_admin',
      userId,
      entry.placement_id,
      `Approved ${entry.points_earned >= 0 ? '+' : ''}${entry.points_earned} point entry`,
      tenantId,
      {
        entry_id: entryId,
        date: entry.date,
        period: entry.period,
        points: entry.points_earned,
        original_entered_by: entry.entered_by,
        approved_by_name: displayName,
      }
    );

    revalidatePath('/daep/approvals');
    revalidatePath('/daep/rooms');
    return { success: true };
  } catch (error) {
    console.error('approvePointEntry error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve entry',
    };
  }
}
```

### 4. rejectPointEntry

```typescript
export async function rejectPointEntry(
  entryId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId, role, displayName } = await checkDAEPStaffRole();

    // Only admins can reject
    const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
    if (!adminRoles.includes(role)) {
      return { success: false, error: 'Only administrators can reject entries' };
    }

    const supabase = await createServerClient();

    // Get entry details for audit
    const { data: entry, error: fetchError } = await supabase
      .from('daep_daily_points')
      .select('placement_id, date, period, points_earned, entered_by')
      .eq('id', entryId)
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Entry not found or already processed' };
    }

    // Update to rejected
    const { error: updateError } = await supabase
      .from('daep_daily_points')
      .update({
        approval_status: 'rejected',
        public: false,  // Ensure it stays private
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq('id', entryId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error rejecting entry:', updateError);
      return { success: false, error: 'Failed to reject entry' };
    }

    // Audit log
    await logPointsAuditEvent(
      supabase,
      'points.rejected_by_admin',
      userId,
      entry.placement_id,
      `Rejected ${entry.points_earned >= 0 ? '+' : ''}${entry.points_earned} point entry`,
      tenantId,
      {
        entry_id: entryId,
        date: entry.date,
        period: entry.period,
        points: entry.points_earned,
        original_entered_by: entry.entered_by,
        rejected_by_name: displayName,
        rejection_reason: reason,
      }
    );

    revalidatePath('/daep/approvals');
    return { success: true };
  } catch (error) {
    console.error('rejectPointEntry error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject entry',
    };
  }
}
```

### 5. bulkApproveEntries

```typescript
export async function bulkApproveEntries(
  entryIds: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { userId, tenantId, role, displayName } = await checkDAEPStaffRole();

    // Only admins can approve
    const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
    if (!adminRoles.includes(role)) {
      return { success: false, count: 0, error: 'Only administrators can approve entries' };
    }

    if (!entryIds || entryIds.length === 0) {
      return { success: false, count: 0, error: 'No entries selected' };
    }

    const supabase = await createServerClient();

    // Update all to approved
    const { error: updateError, count } = await supabase
      .from('daep_daily_points')
      .update({
        approval_status: 'approved',
        public: true,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .in('id', entryIds);

    if (updateError) {
      console.error('Error bulk approving entries:', updateError);
      return { success: false, count: 0, error: 'Failed to approve entries' };
    }

    // Audit log
    await logPointsAuditEvent(
      supabase,
      'points.bulk_approved_by_admin',
      userId,
      entryIds[0],
      `Bulk approved ${count} point entries`,
      tenantId,
      {
        entry_ids: entryIds,
        approved_count: count,
        approved_by_name: displayName,
      }
    );

    revalidatePath('/daep/approvals');
    revalidatePath('/daep/rooms');
    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('bulkApproveEntries error:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to approve entries',
    };
  }
}
```

### 6. editAndApproveEntry

```typescript
export interface EditAndApproveInput {
  entryId: string;
  adjustment_value: number;
  student_action?: string | null;
  teacher_action?: string | null;
  notes?: string | null;
}

export async function editAndApproveEntry(
  input: EditAndApproveInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, tenantId, role, displayName } = await checkDAEPStaffRole();

    // Only admins can edit and approve
    const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
    if (!adminRoles.includes(role)) {
      return { success: false, error: 'Only administrators can edit and approve entries' };
    }

    const { entryId, adjustment_value, student_action, teacher_action, notes } = input;

    // Validate adjustment value
    const allowedValues = [10, 5, 0, -5, -10, -15];
    if (!allowedValues.includes(adjustment_value)) {
      return { success: false, error: 'Invalid adjustment value' };
    }

    const supabase = await createServerClient();

    // Get entry details for audit (before values)
    const { data: entry, error: fetchError } = await supabase
      .from('daep_daily_points')
      .select('*')
      .eq('id', entryId)
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Entry not found or already processed' };
    }

    // Update and approve in one operation
    const { error: updateError } = await supabase
      .from('daep_daily_points')
      .update({
        points_earned: adjustment_value,
        student_action: student_action ?? entry.student_action,
        teacher_action: teacher_action ?? entry.teacher_action,
        notes: notes ?? entry.notes,
        approval_status: 'approved',
        public: true,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error editing and approving entry:', updateError);
      return { success: false, error: 'Failed to save changes' };
    }

    // Audit log with before/after
    await logPointsAuditEvent(
      supabase,
      'points.edited_and_approved',
      userId,
      entry.placement_id,
      `Edited and approved point entry`,
      tenantId,
      {
        entry_id: entryId,
        date: entry.date,
        period: entry.period,
        before: {
          points: entry.points_earned,
          student_action: entry.student_action,
          teacher_action: entry.teacher_action,
          notes: entry.notes,
        },
        after: {
          points: adjustment_value,
          student_action: student_action ?? entry.student_action,
          teacher_action: teacher_action ?? entry.teacher_action,
          notes: notes ?? entry.notes,
        },
        original_entered_by: entry.entered_by,
        edited_by_name: displayName,
      }
    );

    revalidatePath('/daep/approvals');
    revalidatePath('/daep/rooms');
    return { success: true };
  } catch (error) {
    console.error('editAndApproveEntry error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save changes',
    };
  }
}
```

---

## Database Migration

Add columns to track approval/rejection metadata:

```sql
-- Migration: add_approval_metadata_columns
ALTER TABLE daep_daily_points
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for pending approvals query
CREATE INDEX IF NOT EXISTS idx_daep_daily_points_pending
ON daep_daily_points(tenant_id, approval_status)
WHERE approval_status = 'pending';

-- Comments
COMMENT ON COLUMN daep_daily_points.approved_by IS 'Admin who approved the entry (null if auto-approved or pending)';
COMMENT ON COLUMN daep_daily_points.approved_at IS 'When the entry was approved by admin';
COMMENT ON COLUMN daep_daily_points.rejected_by IS 'Admin who rejected the entry';
COMMENT ON COLUMN daep_daily_points.rejected_at IS 'When the entry was rejected';
COMMENT ON COLUMN daep_daily_points.rejection_reason IS 'Optional reason for rejection';
```

---

## Acceptance Criteria Mapping

| AC from Epic | Implementation |
|--------------|----------------|
| 3.6.1: pending entries visible to staff but not students | Story 3.5 sets `public = false` |
| 3.6.2: Notification to admins | Deferred to Epic 7 (nav badge is interim solution) |
| 3.6.3: Approval queue at `/daep/approvals` | New page with queue table |
| 3.6.4: Queue shows student, period, date, points, entered_by, notes | PendingApprovalEntry type and table columns |
| 3.6.5: Admin can Approve | `approvePointEntry()` action |
| 3.6.6: Admin can Reject | `rejectPointEntry()` action |
| 3.6.7: Admin can Edit & Approve | `editAndApproveEntry()` action |
| 3.6.8: Edit allows changing points, verbiage, category | EditApproveDialog with all fields editable |
| 3.6.9: Approve sets approved + public | Update sets `approval_status = 'approved'`, `public = true` |
| 3.6.10: Reject sets rejected, stays private | Update sets `approval_status = 'rejected'`, `public = false` |

---

## Task Breakdown

### Task 1: Database Migration

- [ ] 1.1 Create migration `add_approval_metadata_columns`
- [ ] 1.2 Add `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason` columns
- [ ] 1.3 Add index on `(tenant_id, approval_status)` for pending query
- [ ] 1.4 Apply migration to Supabase

### Task 2: Server Actions

- [ ] 2.1 Add `PendingApprovalEntry` interface
- [ ] 2.2 Implement `getPendingApprovals()` with student/staff joins
- [ ] 2.3 Implement `getPendingApprovalsCount()` for nav badge
- [ ] 2.4 Implement `approvePointEntry(entryId)`
- [ ] 2.5 Implement `rejectPointEntry(entryId, reason?)`
- [ ] 2.6 Implement `bulkApproveEntries(entryIds[])`
- [ ] 2.7 Implement `editAndApproveEntry(input)`

### Task 3: Navigation Badge

- [ ] 3.1 Add "Approvals" nav item to DAEPSidebar
- [ ] 3.2 Fetch pending count on layout mount
- [ ] 3.3 Show badge with count (hide when 0)
- [ ] 3.4 Restrict visibility to admin roles only

### Task 4: Approvals Queue Page

- [ ] 4.1 Create `/daep/approvals/page.tsx`
- [ ] 4.2 Fetch pending entries with `getPendingApprovals()`
- [ ] 4.3 Group entries by date
- [ ] 4.4 Create `PendingEntryRow` component
- [ ] 4.5 Add action buttons: Edit, Approve, Reject
- [ ] 4.6 Add checkbox for bulk selection
- [ ] 4.7 Add "Approve All" / "Approve Selected" button
- [ ] 4.8 Add empty state when no pending entries
- [ ] 4.9 Add loading skeleton

### Task 5: Edit & Approve Dialog

- [ ] 5.1 Create `EditApproveDialog` component
- [ ] 5.2 Pre-fill with current entry values
- [ ] 5.3 Allow editing: adjustment, student_action, teacher_action, notes
- [ ] 5.4 "Save & Approve" button calls `editAndApproveEntry()`
- [ ] 5.5 Show success toast and refresh queue

### Task 6: Reject Confirmation Dialog

- [ ] 6.1 Create `RejectConfirmDialog` component
- [ ] 6.2 Show entry details being rejected
- [ ] 6.3 Optional reason text input
- [ ] 6.4 Confirm button calls `rejectPointEntry()`
- [ ] 6.5 Show success toast and refresh queue

### Task 7: Testing

- [ ] 7.1 Test approve single entry
- [ ] 7.2 Test reject single entry with reason
- [ ] 7.3 Test edit and approve
- [ ] 7.4 Test bulk approve
- [ ] 7.5 Verify nav badge updates
- [ ] 7.6 Verify entries become public after approval
- [ ] 7.7 Verify rejected entries stay private
- [ ] 7.8 Test admin-only access (non-admin gets redirected)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/YYYYMMDD_add_approval_metadata.sql` | Create |
| `app/actions/daep/points.ts` | Modify - add approval actions |
| `app/daep/(main)/approvals/page.tsx` | Create |
| `components/daep/approvals/PendingEntryRow.tsx` | Create |
| `components/daep/approvals/EditApproveDialog.tsx` | Create |
| `components/daep/approvals/RejectConfirmDialog.tsx` | Create |
| `components/daep/DAEPSidebar.tsx` | Modify - add nav item with badge |

---

## Out of Scope

- Email/push notifications to staff when entry is approved/rejected (Epic 7)
- Notification to admins about pending entries (Epic 7)
- Filtering/sorting the queue by staff member, date range, etc. (future enhancement)
- Appeal process for rejected entries (not in requirements)

---

## Success Metrics

After Story 3.6 is complete:

1. **Admin sees pending badge** in navigation with accurate count
2. **Admin opens queue** at `/daep/approvals` showing all pending entries
3. **Approve action** sets `approved`, `public = true`, logged in audit
4. **Reject action** sets `rejected`, stays private, logged in audit
5. **Edit & Approve** allows changing values before approving
6. **Bulk approve** processes multiple entries at once
7. **Queue refreshes** after each action
8. **Non-admins** cannot access the approvals page
