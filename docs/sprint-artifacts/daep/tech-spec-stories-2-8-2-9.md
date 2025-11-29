# Technical Specification: Stories 2-8, 2-9

**Date:** 2025-11-28
**Author:** Bob (SM Agent)
**Epic:** 2 - Placement Management
**Status:** Draft

> **Theme Requirement:** All UI components must follow the [Theme & Styling Guidelines](./0-x-theme-foundation.md). Never hardcode colors.

---

## Overview

This document provides technical specifications for two related Epic 2 stories that manage placement editing and transition workflows:

| Story | Name | Points | FRs |
|-------|------|--------|-----|
| 2-8 | Edit Placement | 3 | FR18, FR21 |
| 2-9 | Transition Workflow | 3 | FR21, FR22 |

**Total Points:** 6

**Recommended Implementation Order:** 2-8 → 2-9

- Story 2-8 creates the edit form and status transitions
- Story 2-9 extends with full transition workflow (meeting scheduling, completion)

**Dependencies:**
- Story 2-6 (State Machine) - defines valid transitions
- Story 2-7 (Days Calculation) - recalculates on edits

---

## Story 2-8: Edit Placement

### Goal

Create an edit placement form allowing administrators to modify placement details, change assigned room, update days, and trigger status transitions.

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.8.1 | Edit form accessible from placement card/profile | Button navigates to edit form |
| 2.8.2 | Editable fields: days_assigned, assigned_room_id, intake_notes, completion_notes | Form fields update correctly |
| 2.8.3 | Days recalculated on days_assigned change | Expected end date updates |
| 2.8.4 | Room assignment validates separation constraints | Error on conflict |
| 2.8.5 | Status transition buttons based on current state | Only valid transitions shown |
| 2.8.6 | All changes logged to audit trail | Audit entries created |
| 2.8.7 | Validation prevents invalid data | Form shows errors |
| 2.8.8 | Cancel returns to profile without saving | No changes persisted |

### Data Model Updates

```typescript
// lib/validation/schemas.ts - ADD

export const UpdatePlacementSchema = z.object({
  id: z.string().uuid(),
  days_assigned: z.number().int().min(1).max(365).optional(),
  assigned_room_id: z.string().uuid().nullable().optional(),
  intake_notes: z.string().max(2000).optional(),
  completion_notes: z.string().max(2000).optional(),
  placement_reason: z.string().min(10).max(1000).optional(),
  offense_code: z.string().optional(),
});
export type UpdatePlacementInput = z.infer<typeof UpdatePlacementSchema>;
```

### Server Actions

```typescript
// app/actions/daep/placements.ts - ADD

import { calculateExpectedEndDate } from '@/lib/daep/days-remaining';
import { getAvailableRoomsForStudent } from '@/app/actions/daep/rooms';

/**
 * Get placement details for editing
 */
export async function getPlacementForEdit(placementId: string): Promise<PlacementDetail> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data: placement, error } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      incident_number,
      placement_date,
      start_date,
      days_assigned,
      days_served,
      days_remaining,
      expected_end_date,
      actual_end_date,
      status,
      offense_code,
      placement_reason,
      mandatory_placement,
      home_campus_id,
      assigned_room_id,
      intake_notes,
      completion_notes,
      rollover_student,
      no_show,
      transition_requested_date,
      transition_meeting_date,
      first_day_back_date,
      created_at,
      home_campus:campuses!fk_daep_placements_home_campus(id, name),
      assigned_room:daep_rooms(id, room_number, room_name),
      discipline_code:daep_discipline_codes!fk_placement_offense(code, label)
    `)
    .eq('id', placementId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !placement) {
    throw new Error('Placement not found');
  }

  // Transform relations
  const extractRelation = <T>(rel: T | T[] | null): T | null => {
    if (Array.isArray(rel)) return rel[0] || null;
    return rel;
  };

  return {
    ...placement,
    home_campus: extractRelation(placement.home_campus) as PlacementDetail['home_campus'],
    assigned_room: extractRelation(placement.assigned_room) as PlacementDetail['assigned_room'],
    offense_label: (placement.discipline_code as any)?.label || null,
  } as PlacementDetail;
}

/**
 * Update placement details
 */
export async function updatePlacement(
  input: UpdatePlacementInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Validate input
  const validation = UpdatePlacementSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  // Get current placement
  const { data: current, error: fetchError } = await supabase
    .from('daep_placements')
    .select('id, school_id, start_date, days_assigned, days_served, assigned_room_id, status')
    .eq('id', input.id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !current) {
    return { success: false, error: 'Placement not found' };
  }

  // Build update object
  const updateData: Record<string, any> = {};
  const changes: Record<string, { from: any; to: any }> = {};

  // Days assigned change
  if (input.days_assigned !== undefined && input.days_assigned !== current.days_assigned) {
    updateData.days_assigned = input.days_assigned;
    updateData.days_remaining = input.days_assigned - current.days_served;

    // Recalculate expected end date
    updateData.expected_end_date = await calculateExpectedEndDate(
      tenantId,
      current.start_date,
      input.days_assigned
    );

    changes.days_assigned = { from: current.days_assigned, to: input.days_assigned };
  }

  // Room assignment change
  if (input.assigned_room_id !== undefined && input.assigned_room_id !== current.assigned_room_id) {
    // Validate room availability if assigning new room
    if (input.assigned_room_id) {
      const availableRooms = await getAvailableRoomsForStudent(current.school_id, current.id);
      const selectedRoom = availableRooms.find(r => r.id === input.assigned_room_id);

      if (!selectedRoom) {
        return { success: false, error: 'Room not found' };
      }

      if (!selectedRoom.is_available) {
        return { success: false, error: selectedRoom.blocked_reason || 'Room not available' };
      }
    }

    updateData.assigned_room_id = input.assigned_room_id;
    changes.assigned_room_id = { from: current.assigned_room_id, to: input.assigned_room_id };
  }

  // Notes updates
  if (input.intake_notes !== undefined) {
    updateData.intake_notes = input.intake_notes;
  }
  if (input.completion_notes !== undefined) {
    updateData.completion_notes = input.completion_notes;
  }
  if (input.placement_reason !== undefined) {
    updateData.placement_reason = input.placement_reason;
  }
  if (input.offense_code !== undefined) {
    updateData.offense_code = input.offense_code;
  }

  // Skip if no changes
  if (Object.keys(updateData).length === 0) {
    return { success: true };
  }

  // Update placement
  const { error: updateError } = await supabase
    .from('daep_placements')
    .update(updateData)
    .eq('id', input.id);

  if (updateError) {
    return { success: false, error: 'Failed to update placement' };
  }

  // Sync TrespassTracker if expected_end_date changed
  if (updateData.expected_end_date) {
    await syncTrespassTrackerExpiration(current.school_id);
  }

  // Audit log
  await logAuditEvent({
    eventType: 'placement.updated',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.id,
    action: 'Updated placement details',
    recordSchoolId: current.school_id,
    tenantId,
    details: { changes },
  });

  revalidatePath('/daep/students');
  revalidatePath('/daep/placements');
  revalidatePath(`/daep/students/${current.school_id}`);

  return { success: true };
}
```

### UI Components

#### Edit Placement Page

```typescript
// app/daep/placements/[id]/edit/page.tsx

import { getPlacementForEdit } from '@/app/actions/daep/placements';
import { getAvailableRoomsForStudent } from '@/app/actions/daep/rooms';
import { getDisciplineCodesForForm } from '@/app/actions/daep/placements';
import { notFound } from 'next/navigation';
import { EditPlacementForm } from '@/components/daep/placements/EditPlacementForm';

interface Props {
  params: { id: string };
}

export default async function EditPlacementPage({ params }: Props) {
  const { id } = await params;

  try {
    const placement = await getPlacementForEdit(id);
    const availableRooms = await getAvailableRoomsForStudent(placement.school_id, id);
    const disciplineCodes = await getDisciplineCodesForForm();

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Edit Placement</h1>
        <EditPlacementForm
          placement={placement}
          availableRooms={availableRooms}
          disciplineCodes={disciplineCodes}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
```

#### Edit Form Component

```typescript
// components/daep/placements/EditPlacementForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdatePlacementSchema, type UpdatePlacementInput } from '@/lib/validation/schemas';
import { updatePlacement } from '@/app/actions/daep/placements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PlacementStatusBadge } from '@/components/daep/shared/PlacementStatusBadge';
import { StatusTransitionActions } from '@/components/daep/placements/StatusTransitionActions';
import type { PlacementDetail, RoomAvailability, DisciplineCodeOption } from '@/app/actions/daep/placements';

interface EditPlacementFormProps {
  placement: PlacementDetail;
  availableRooms: RoomAvailability[];
  disciplineCodes: DisciplineCodeOption[];
}

export function EditPlacementForm({
  placement,
  availableRooms,
  disciplineCodes,
}: EditPlacementFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<UpdatePlacementInput>({
    resolver: zodResolver(UpdatePlacementSchema),
    defaultValues: {
      id: placement.id,
      days_assigned: placement.days_assigned,
      assigned_room_id: placement.assigned_room?.id || null,
      intake_notes: placement.intake_notes || '',
      completion_notes: placement.completion_notes || '',
      placement_reason: placement.placement_reason,
      offense_code: placement.offense_code,
    },
  });

  const onSubmit = async (data: UpdatePlacementInput) => {
    setLoading(true);
    try {
      const result = await updatePlacement(data);
      if (result.success) {
        toast({ title: 'Placement updated successfully' });
        router.push(`/daep/students/${placement.school_id}`);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update placement', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Header with Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Placement #{placement.incident_number}</CardTitle>
            <PlacementStatusBadge status={placement.status} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Student: {placement.school_id} | Start: {placement.start_date}
          </p>
        </CardContent>
      </Card>

      {/* Status Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTransitionActions
            placementId={placement.id}
            currentStatus={placement.status}
            daysRemaining={placement.days_remaining}
            onTransition={() => router.refresh()}
          />
        </CardContent>
      </Card>

      {/* Editable Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Placement Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Days Assigned */}
          <div className="space-y-2">
            <Label htmlFor="days_assigned">Days Assigned</Label>
            <Input
              id="days_assigned"
              type="number"
              min={1}
              max={365}
              {...form.register('days_assigned', { valueAsNumber: true })}
            />
            {form.formState.errors.days_assigned && (
              <p className="text-sm text-[rgb(var(--daep-danger))]">
                {form.formState.errors.days_assigned.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Current: {placement.days_served} served, {placement.days_remaining} remaining
            </p>
          </div>

          {/* Offense Code */}
          <div className="space-y-2">
            <Label htmlFor="offense_code">Offense Code</Label>
            <Select
              value={form.watch('offense_code')}
              onValueChange={(value) => form.setValue('offense_code', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select offense code" />
              </SelectTrigger>
              <SelectContent>
                {disciplineCodes.map((code) => (
                  <SelectItem key={code.code} value={code.code}>
                    {code.code} - {code.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Room Assignment */}
          <div className="space-y-2">
            <Label htmlFor="assigned_room_id">Assigned Room</Label>
            <Select
              value={form.watch('assigned_room_id') || 'none'}
              onValueChange={(value) =>
                form.setValue('assigned_room_id', value === 'none' ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Room Assigned</SelectItem>
                {availableRooms.map((room) => (
                  <SelectItem
                    key={room.id}
                    value={room.id}
                    disabled={!room.is_available && room.id !== placement.assigned_room?.id}
                  >
                    {room.room_number} - {room.room_name || 'Unnamed'} ({room.current_count}/{room.capacity})
                    {room.blocked_reason && ` - ${room.blocked_reason}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Placement Reason */}
          <div className="space-y-2">
            <Label htmlFor="placement_reason">Placement Reason</Label>
            <Textarea
              id="placement_reason"
              rows={3}
              {...form.register('placement_reason')}
            />
          </div>

          {/* Intake Notes */}
          <div className="space-y-2">
            <Label htmlFor="intake_notes">Intake Notes</Label>
            <Textarea
              id="intake_notes"
              rows={3}
              {...form.register('intake_notes')}
            />
          </div>

          {/* Completion Notes */}
          <div className="space-y-2">
            <Label htmlFor="completion_notes">Completion Notes</Label>
            <Textarea
              id="completion_notes"
              rows={3}
              {...form.register('completion_notes')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
```

---

## Story 2-9: Transition Workflow

### Goal

Implement the full transition workflow for returning students to their home campus, including meeting scheduling, campus notification, and completion confirmation.

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.9.1 | "Initiate Transition" available when days complete or admin override | Button visible for eligible placements |
| 2.9.2 | Transition form captures meeting date | Date picker validates future date |
| 2.9.3 | Transition form captures campus contact person | Name field required |
| 2.9.4 | In-app notification created for home campus | Notification record created |
| 2.9.5 | "Complete Transition" requires meeting confirmation | Modal with meeting date display |
| 2.9.6 | "Complete Transition" requires first day back date | Date field required |
| 2.9.7 | Status moves to Complete after confirmation | Placement status updated |
| 2.9.8 | TrespassTracker is_daep flag updated on completion | Flag synced |
| 2.9.9 | Transition history visible on student profile | Timeline shows transitions |

### Server Actions

```typescript
// app/actions/daep/placements.ts - ADD

export interface InitiateTransitionInput {
  placement_id: string;
  transition_meeting_date: string;
  campus_contact_name: string;
  campus_contact_email?: string;
  notes?: string;
}

/**
 * Initiate transition process - schedules meeting, creates notification
 */
export async function initiateTransition(
  input: InitiateTransitionInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Get placement
  const { data: placement, error: fetchError } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      status,
      days_served,
      days_assigned,
      days_remaining,
      home_campus_id,
      student:trespass_records!inner(first_name, last_name)
    `)
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !placement) {
    return { success: false, error: 'Placement not found' };
  }

  if (placement.status !== 'active') {
    return { success: false, error: 'Can only initiate transition for active placements' };
  }

  // Validate meeting date is in the future
  const meetingDate = new Date(input.transition_meeting_date);
  if (meetingDate <= new Date()) {
    return { success: false, error: 'Meeting date must be in the future' };
  }

  // Update placement
  const { error: updateError } = await supabase
    .from('daep_placements')
    .update({
      status: 'transition',
      transition_requested_date: new Date().toISOString().split('T')[0],
      transition_meeting_date: input.transition_meeting_date,
    })
    .eq('id', input.placement_id);

  if (updateError) {
    return { success: false, error: 'Failed to initiate transition' };
  }

  // Create transition log
  await supabase
    .from('daep_placement_transitions')
    .insert({
      tenant_id: tenantId,
      placement_id: input.placement_id,
      from_status: 'active',
      to_status: 'transition',
      transition_reason: `Meeting scheduled for ${input.transition_meeting_date}`,
      transitioned_by: user.id,
      notes: `Contact: ${input.campus_contact_name}${input.campus_contact_email ? ` (${input.campus_contact_email})` : ''}`,
    });

  // Create in-app notification
  const studentName = `${(placement.student as any).first_name} ${(placement.student as any).last_name}`;
  await supabase
    .from('daep_notifications')
    .insert({
      tenant_id: tenantId,
      notification_type: 'transition_meeting',
      title: 'Student Transition Meeting Scheduled',
      message: `Transition meeting for ${studentName} scheduled for ${input.transition_meeting_date}. Contact: ${input.campus_contact_name}`,
      related_school_id: placement.school_id,
      related_placement_id: placement.id,
      action_url: `/daep/students/${placement.school_id}`,
      created_by: user.id,
    });

  // Audit log
  await logAuditEvent({
    eventType: 'placement.transition_initiated',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: `Initiated transition for ${studentName}`,
    recordSubjectName: studentName,
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      transition_meeting_date: input.transition_meeting_date,
      campus_contact: input.campus_contact_name,
    },
  });

  revalidatePath('/daep/students');
  revalidatePath(`/daep/students/${placement.school_id}`);

  return { success: true };
}

export interface CompleteTransitionInput {
  placement_id: string;
  first_day_back_date: string;
  meeting_confirmed: boolean;
  completion_notes?: string;
}

/**
 * Complete transition - confirms meeting occurred and student returned
 */
export async function completeTransition(
  input: CompleteTransitionInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Get placement
  const { data: placement, error: fetchError } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      status,
      transition_meeting_date,
      student:trespass_records!inner(first_name, last_name)
    `)
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !placement) {
    return { success: false, error: 'Placement not found' };
  }

  if (placement.status !== 'transition') {
    return { success: false, error: 'Can only complete transition for placements in transition status' };
  }

  if (!input.meeting_confirmed) {
    return { success: false, error: 'Must confirm transition meeting occurred' };
  }

  // Update placement to complete
  const { error: updateError } = await supabase
    .from('daep_placements')
    .update({
      status: 'complete',
      first_day_back_date: input.first_day_back_date,
      actual_end_date: new Date().toISOString().split('T')[0],
      transition_complete: true,
      completion_notes: input.completion_notes,
    })
    .eq('id', input.placement_id);

  if (updateError) {
    return { success: false, error: 'Failed to complete transition' };
  }

  // Create transition log
  await supabase
    .from('daep_placement_transitions')
    .insert({
      tenant_id: tenantId,
      placement_id: input.placement_id,
      from_status: 'transition',
      to_status: 'complete',
      transition_reason: 'Student returned to home campus',
      transitioned_by: user.id,
      notes: `First day back: ${input.first_day_back_date}`,
    });

  // Sync TrespassTracker
  await syncTrespassTrackerExpiration(placement.school_id);

  // Audit log
  const studentName = `${(placement.student as any).first_name} ${(placement.student as any).last_name}`;
  await logAuditEvent({
    eventType: 'placement.completed',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: `Completed placement for ${studentName}`,
    recordSubjectName: studentName,
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      first_day_back_date: input.first_day_back_date,
      meeting_confirmed: true,
    },
  });

  revalidatePath('/daep/students');
  revalidatePath(`/daep/students/${placement.school_id}`);

  return { success: true };
}

/**
 * Get transition history for a placement
 */
export async function getTransitionHistory(
  placementId: string
): Promise<PlacementTransition[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_placement_transitions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .order('transitioned_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch transition history');
  }

  return data || [];
}
```

### UI Components

#### Initiate Transition Dialog

```typescript
// components/daep/placements/InitiateTransitionDialog.tsx

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { initiateTransition } from '@/app/actions/daep/placements';
import { ArrowRight } from 'lucide-react';

const InitiateTransitionSchema = z.object({
  transition_meeting_date: z.string().min(1, 'Meeting date is required'),
  campus_contact_name: z.string().min(1, 'Contact name is required'),
  campus_contact_email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

interface InitiateTransitionDialogProps {
  placementId: string;
  daysRemaining: number;
  onSuccess?: () => void;
}

export function InitiateTransitionDialog({
  placementId,
  daysRemaining,
  onSuccess,
}: InitiateTransitionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(InitiateTransitionSchema),
    defaultValues: {
      transition_meeting_date: '',
      campus_contact_name: '',
      campus_contact_email: '',
      notes: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof InitiateTransitionSchema>) => {
    setLoading(true);
    try {
      const result = await initiateTransition({
        placement_id: placementId,
        ...data,
      });

      if (result.success) {
        toast({ title: 'Transition initiated successfully' });
        setOpen(false);
        onSuccess?.();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to initiate transition', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate minimum date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={daysRemaining > 0}>
          <ArrowRight className="h-4 w-4 mr-2" />
          Initiate Transition
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Initiate Transition to Home Campus</DialogTitle>
            <DialogDescription>
              Schedule the transition meeting and notify the home campus.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transition_meeting_date">Transition Meeting Date *</Label>
              <Input
                id="transition_meeting_date"
                type="date"
                min={minDateStr}
                {...form.register('transition_meeting_date')}
              />
              {form.formState.errors.transition_meeting_date && (
                <p className="text-sm text-[rgb(var(--daep-danger))]">
                  {form.formState.errors.transition_meeting_date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="campus_contact_name">Campus Contact Person *</Label>
              <Input
                id="campus_contact_name"
                placeholder="e.g., Assistant Principal Smith"
                {...form.register('campus_contact_name')}
              />
              {form.formState.errors.campus_contact_name && (
                <p className="text-sm text-[rgb(var(--daep-danger))]">
                  {form.formState.errors.campus_contact_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="campus_contact_email">Contact Email (optional)</Label>
              <Input
                id="campus_contact_email"
                type="email"
                placeholder="contact@school.edu"
                {...form.register('campus_contact_email')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special considerations for the transition..."
                {...form.register('notes')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Initiate Transition'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

#### Complete Transition Dialog

```typescript
// components/daep/placements/CompleteTransitionDialog.tsx

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { completeTransition } from '@/app/actions/daep/placements';
import { CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface CompleteTransitionDialogProps {
  placementId: string;
  meetingDate: string | null;
  onSuccess?: () => void;
}

export function CompleteTransitionDialog({
  placementId,
  meetingDate,
  onSuccess,
}: CompleteTransitionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [meetingConfirmed, setMeetingConfirmed] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      first_day_back_date: '',
      completion_notes: '',
    },
  });

  const onSubmit = async (data: { first_day_back_date: string; completion_notes: string }) => {
    if (!meetingConfirmed) {
      toast({ title: 'Error', description: 'Please confirm the meeting occurred', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const result = await completeTransition({
        placement_id: placementId,
        first_day_back_date: data.first_day_back_date,
        meeting_confirmed: true,
        completion_notes: data.completion_notes || undefined,
      });

      if (result.success) {
        toast({ title: 'Placement completed successfully' });
        setOpen(false);
        onSuccess?.();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to complete transition', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CheckCircle className="h-4 w-4 mr-2" />
          Complete Transition
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Complete Placement Transition</DialogTitle>
            <DialogDescription>
              Confirm the transition meeting occurred and the student has returned to their home campus.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Meeting Confirmation */}
            <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
              <Checkbox
                id="meeting_confirmed"
                checked={meetingConfirmed}
                onCheckedChange={(checked) => setMeetingConfirmed(!!checked)}
              />
              <Label htmlFor="meeting_confirmed" className="flex-1">
                I confirm the transition meeting on{' '}
                <strong>
                  {meetingDate ? format(new Date(meetingDate), 'MMMM d, yyyy') : 'scheduled date'}
                </strong>{' '}
                occurred
              </Label>
            </div>

            {/* First Day Back */}
            <div className="space-y-2">
              <Label htmlFor="first_day_back_date">First Day Back at Home Campus *</Label>
              <Input
                id="first_day_back_date"
                type="date"
                required
                {...form.register('first_day_back_date')}
              />
            </div>

            {/* Completion Notes */}
            <div className="space-y-2">
              <Label htmlFor="completion_notes">Completion Notes (optional)</Label>
              <Textarea
                id="completion_notes"
                placeholder="Any final notes about this placement..."
                {...form.register('completion_notes')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !meetingConfirmed}>
              {loading ? 'Processing...' : 'Complete Placement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## File Structure

```
app/daep/placements/
├── [id]/
│   └── edit/
│       └── page.tsx                    # Story 2-8

app/actions/daep/
└── placements.ts                       # Add update, transition actions

components/daep/placements/
├── EditPlacementForm.tsx              # Story 2-8
├── InitiateTransitionDialog.tsx       # Story 2-9
├── CompleteTransitionDialog.tsx       # Story 2-9
└── TransitionHistory.tsx              # Story 2-9 (optional)

lib/validation/
└── schemas.ts                          # Add UpdatePlacementSchema
```

---

## Test Strategy

### Unit Tests

| Test | Story | Assertion |
|------|-------|-----------|
| `updatePlacement` validates days range | 2-8 | Error on days < 1 or > 365 |
| `updatePlacement` recalculates end date | 2-8 | Expected date updates correctly |
| `updatePlacement` validates room availability | 2-8 | Error on blocked room |
| `initiateTransition` validates active status | 2-9 | Error on non-active placement |
| `initiateTransition` validates future date | 2-9 | Error on past meeting date |
| `completeTransition` requires confirmation | 2-9 | Error without meeting_confirmed |

### E2E Tests

| Test | Story | Steps |
|------|-------|-------|
| Edit placement days | 2-8 | Navigate → Edit → Change days → Save → Verify end date |
| Change room assignment | 2-8 | Edit → Select new room → Save → Verify room updated |
| Full transition flow | 2-9 | Initiate → Verify notification → Complete → Verify status |

---

*Tech Spec generated by Bob (SM Agent)*
*Date: 2025-11-28*
