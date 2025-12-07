# Tech Spec: Story 3.5 - Approved Teacher Auto-Finalize

**Story:** 3-5
**Points:** 2
**FRs:** FR31
**Dependencies:** Story 1.4 (approved_teacher flag), Story 3-2 (Point Entry Grid), Story 3-3 (Bulk Point Entry)

---

## Overview

This story introduces the **approval workflow** for point entries based on the `approved_teacher` flag on user profiles.

**Current State:** All point entries are saved with `approval_status = 'approved'` and `public = true` immediately - no distinction based on who entered them.

**Target State:**
- **Approved teachers** (`approved_teacher = true`) → Points auto-finalize immediately
- **Non-approved staff** (`approved_teacher = false`) → Points go to pending approval queue

This enables quality control for new or probationary staff while allowing experienced teachers to work without delay.

---

## User Workflow

### Scenario A: Approved Teacher (Auto-Finalize)

```
Teacher (approved_teacher = true) enters +5 adjustment for Carlos
→ Entry saved with approval_status = 'approved', public = true
→ Points immediately visible on student profile
→ Points immediately visible to parents (when portal exists)
→ Audit log: "points.auto_approved"
→ No notification to admins
```

### Scenario B: Non-Approved Staff (Pending Approval)

```
New Staff (approved_teacher = false) enters +5 adjustment for Carlos
→ Entry saved with approval_status = 'pending', public = false
→ Points visible to staff in roster (with "pending" indicator)
→ Points NOT visible to students/parents
→ Notification sent to DAEP admins (Story 3.6)
→ Audit log: "points.pending_approval"
→ Admin reviews and approves/rejects (Story 3.6)
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
```

### User Profile Field (Already Exists)

From Story 1.4:

```sql
-- user_profiles table
approved_teacher BOOLEAN DEFAULT false
```

---

## Technical Implementation

### 1. Update checkDAEPStaffRole Helper

Add `approved_teacher` to the returned staff info:

```typescript
// app/actions/daep/points.ts

interface DAEPStaffInfo {
  userId: string;
  role: string;
  tenantId: string;
  displayName: string;
  isApprovedTeacher: boolean;  // NEW
}

async function checkDAEPStaffRole(): Promise<DAEPStaffInfo> {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, active_tenant_id, display_name, approved_teacher')  // Add approved_teacher
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  const daepRoles = [
    'super_admin',
    'district_admin',
    'daep_admin_l1',
    'daep_admin_l2',
    'daep_staff',
  ];

  if (!daepRoles.includes(profile.role)) {
    throw new Error('Insufficient permissions. Only DAEP staff can manage points.');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  // Admin roles are always considered "approved" for point entry
  const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
  const isApprovedTeacher = adminRoles.includes(profile.role) || profile.approved_teacher === true;

  return {
    userId: user.id,
    role: profile.role,
    tenantId: effectiveTenantId,
    displayName: profile.display_name || user.firstName || 'Staff',
    isApprovedTeacher,
  };
}
```

### 2. Update createPointAdjustment

Modify to use conditional approval status:

```typescript
export async function createPointAdjustment(
  input: PointAdjustmentInput
): Promise<{ success: boolean; error?: string; entryId?: string; isPending?: boolean }> {
  try {
    const { userId, tenantId, displayName, isApprovedTeacher } = await checkDAEPStaffRole();

    // ... validation code ...

    const supabase = await createServerClient();

    // ... placement verification ...

    // Determine approval status based on approved_teacher flag
    const approvalStatus = isApprovedTeacher ? 'approved' : 'pending';
    const isPublic = isApprovedTeacher;

    // Create adjustment entry
    const { data: entry, error } = await supabase
      .from('daep_daily_points')
      .insert({
        tenant_id: tenantId,
        placement_id,
        date,
        period,
        points_earned: adjustment_value,
        is_base_points: false,
        student_action: student_action || null,
        teacher_action: teacher_action || null,
        notes: notes || null,
        entered_by: userId,
        approval_status: approvalStatus,  // Conditional
        public: isPublic,                  // Conditional
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating point adjustment:', error);
      return { success: false, error: 'Failed to save adjustment. Please try again.' };
    }

    // Audit log - different event type based on approval status
    const eventType = isApprovedTeacher ? 'points.auto_approved' : 'points.pending_approval';
    await logPointsAuditEvent(
      supabase,
      eventType,
      userId,
      placement_id,
      `Added ${adjustment_value >= 0 ? '+' : ''}${adjustment_value} point adjustment (${approvalStatus})`,
      tenantId,
      {
        date,
        period,
        adjustment: adjustment_value,
        student_action,
        teacher_action,
        notes,
        entered_by_name: displayName,
        approval_status: approvalStatus,
        is_approved_teacher: isApprovedTeacher,
      }
    );

    revalidatePath('/daep/rooms');
    return {
      success: true,
      entryId: entry.id,
      isPending: !isApprovedTeacher,
    };
  } catch (error) {
    console.error('createPointAdjustment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save adjustment',
    };
  }
}
```

### 3. Update bulkAddPoints

Same logic for bulk entries:

```typescript
export async function bulkAddPoints(
  input: BulkAddPointsInput
): Promise<{ success: boolean; count: number; error?: string; isPending?: boolean }> {
  try {
    const { userId, tenantId, displayName, isApprovedTeacher } = await checkDAEPStaffRole();
    const supabase = await createServerClient();

    // ... validation code ...

    // Determine approval status based on approved_teacher flag
    const approvalStatus = isApprovedTeacher ? 'approved' : 'pending';
    const isPublic = isApprovedTeacher;

    // Build insert records
    const defaultNote = `Bulk: ${adjustment > 0 ? '+' : ''}${adjustment} points`;
    const entries = validPlacementIds.map((placementId) => ({
      tenant_id: tenantId,
      placement_id: placementId,
      date,
      period,
      points_earned: adjustment,
      is_base_points: false,
      notes: notes || defaultNote,
      entered_by: userId,
      approval_status: approvalStatus,  // Conditional
      public: isPublic,                  // Conditional
    }));

    // ... insert and audit logging ...

    // Audit log with appropriate event type
    const eventType = isApprovedTeacher ? 'points.bulk_auto_approved' : 'points.bulk_pending_approval';
    await logPointsAuditEvent(
      supabase,
      eventType,
      userId,
      validPlacementIds[0],
      `Bulk ${adjustment >= 0 ? '+' : ''}${adjustment} to ${validPlacementIds.length} students (${approvalStatus})`,
      tenantId,
      {
        date,
        period,
        adjustment,
        notes: notes || defaultNote,
        affected_count: validPlacementIds.length,
        placement_ids: validPlacementIds,
        entered_by_name: displayName,
        approval_status: approvalStatus,
        is_approved_teacher: isApprovedTeacher,
      }
    );

    revalidatePath('/daep/rooms');
    return {
      success: true,
      count: validPlacementIds.length,
      isPending: !isApprovedTeacher,
    };
  } catch (error) {
    // ... error handling ...
  }
}
```

### 4. Update createBasePoints

Base points (attendance-triggered) should also respect approval status:

```typescript
export async function createBasePoints(
  placementId: string,
  date: string,
  period: string
): Promise<{ success: boolean; error?: string; alreadyExists?: boolean }> {
  try {
    const { userId, tenantId, isApprovedTeacher } = await checkDAEPStaffRole();
    const supabase = await createServerClient();

    // ... existing check ...

    // Determine approval status
    const approvalStatus = isApprovedTeacher ? 'approved' : 'pending';
    const isPublic = isApprovedTeacher;

    // Create base points entry
    const { error } = await supabase.from('daep_daily_points').insert({
      tenant_id: tenantId,
      placement_id: placementId,
      date,
      period,
      points_earned: 10,
      is_base_points: true,
      entered_by: userId,
      approval_status: approvalStatus,
      public: isPublic,
    });

    // ... rest of function ...
  }
}
```

---

## UI Changes

### 1. Pending Indicator on Point Cells

When displaying point entries in the roster, show a visual indicator for pending entries:

```typescript
// In PointCell or similar component
{entry.approval_status === 'pending' && (
  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
    Pending
  </Badge>
)}
```

### 2. Toast Message Update

Show different messages based on approval status:

```typescript
// After successful point entry
if (result.isPending) {
  toast({
    title: "Points submitted for approval",
    description: `${adjustment >= 0 ? '+' : ''}${adjustment} points submitted. An admin will review.`,
    variant: "default",
  });
} else {
  toast({
    title: "Points saved",
    description: `Added ${adjustment >= 0 ? '+' : ''}${adjustment} points`,
  });
}
```

### 3. Info Banner for Non-Approved Staff

Show a helpful banner when a non-approved staff member views the roster:

```typescript
// In RoomRosterView
{!isApprovedTeacher && (
  <Alert className="mb-4">
    <InfoIcon className="h-4 w-4" />
    <AlertDescription>
      Your point entries will be reviewed by an admin before students/parents can see them.
    </AlertDescription>
  </Alert>
)}
```

---

## Acceptance Criteria Mapping

| AC from Epic | Implementation |
|--------------|----------------|
| 3.5.1: approved_teacher = true → approval_status = 'approved' | checkDAEPStaffRole returns isApprovedTeacher, used in createPointAdjustment/bulkAddPoints |
| 3.5.2: Points immediately visible on student profile | public = true when isApprovedTeacher |
| 3.5.3: No approval queue notification generated | Only Story 3.6 generates notifications for pending entries |
| 3.5.4: public = true set immediately | Set in insert statement based on isApprovedTeacher |
| 3.5.5: Audit log records direct approval | Event type: 'points.auto_approved' vs 'points.pending_approval' |

---

## Admin Roles Always Approved

To prevent workflow bottlenecks, admin roles are always considered "approved" regardless of the `approved_teacher` flag:

| Role | Always Approved? | Notes |
|------|------------------|-------|
| super_admin | Yes | Full system access |
| district_admin | Yes | District-level oversight |
| daep_admin_l1 | Yes | DAEP management |
| daep_admin_l2 | No | Uses approved_teacher flag |
| daep_staff | No | Uses approved_teacher flag |

---

## Task Breakdown

### Task 1: Update checkDAEPStaffRole Helper

- [ ] Add `approved_teacher` to the select query
- [ ] Add `isApprovedTeacher: boolean` to return type
- [ ] Compute isApprovedTeacher based on role + approved_teacher flag
- [ ] Admin roles (super_admin, district_admin, daep_admin_l1) always return true

### Task 2: Update createPointAdjustment

- [ ] Get `isApprovedTeacher` from checkDAEPStaffRole
- [ ] Set `approval_status` and `public` based on isApprovedTeacher
- [ ] Update audit event type: 'points.auto_approved' vs 'points.pending_approval'
- [ ] Return `isPending` boolean in response
- [ ] Include approval_status in audit details

### Task 3: Update bulkAddPoints

- [ ] Get `isApprovedTeacher` from checkDAEPStaffRole
- [ ] Set `approval_status` and `public` based on isApprovedTeacher
- [ ] Update audit event type
- [ ] Return `isPending` boolean in response

### Task 4: Update createBasePoints

- [ ] Get `isApprovedTeacher` from checkDAEPStaffRole
- [ ] Set `approval_status` and `public` based on isApprovedTeacher
- [ ] Update audit event type

### Task 5: UI Updates

- [ ] Update PointAdjustmentDialog to show different toast for pending
- [ ] Update BulkApplyDialog to show different toast for pending
- [ ] Add pending badge to point cells in roster (optional, can defer)
- [ ] Add info banner for non-approved staff (optional, can defer)

### Task 6: Testing

- [ ] Test approved teacher entry → immediate approval
- [ ] Test non-approved staff entry → pending status
- [ ] Test admin roles → always approved
- [ ] Test bulk entry with both user types
- [ ] Test audit log shows correct event types
- [ ] Verify pending entries have public = false
- [ ] Verify approved entries have public = true

---

## Files to Modify

| File | Action |
|------|--------|
| `app/actions/daep/points.ts` | Modify - update all point entry functions |
| `components/daep/roster/PointAdjustmentDialog.tsx` | Modify - update toast messages |
| `components/daep/roster/BulkApplyDialog.tsx` | Modify - update toast messages |

---

## Out of Scope

- Approval queue UI (Story 3.6)
- Notification to admins for pending entries (Story 3.6)
- Approve/Reject actions (Story 3.6)
- Parent portal visibility (Epic 7)

---

## Relationship to Story 3.6

Story 3.5 creates the **foundation** for the approval workflow:
- Sets approval_status to 'pending' for non-approved staff
- Sets public = false so students/parents don't see pending entries

Story 3.6 builds the **admin experience**:
- Approval queue page at `/daep/approvals`
- Notifications when pending entries exist
- Approve/Reject/Edit actions
- Bulk approval

Both stories together complete FR31-FR33 (point approval workflow).

---

## Success Metrics

After Story 3.5 is complete:

1. **Approved teacher** enters points → Saved with `approval_status = 'approved'`, `public = true`
2. **Non-approved staff** enters points → Saved with `approval_status = 'pending'`, `public = false`
3. **Admin roles** always treated as approved, regardless of flag
4. **Audit log** shows different event types for auto-approved vs pending
5. **Toast messages** inform user when entry is pending approval
