# Tech Spec - Epic 2: Placement Management (Part 2)

**Epic:** 2 - Placement Management
**Stories:** 13 (2.1-2.13)
**Points:** 34
**FRs:** FR9-FR26, FR73-FR77
**Date:** 2025-11-26

> **Document Split:** This is Part 2 covering Stories 2.7-2.13 and Integration Patterns.
> See [tech-spec-epic-2-part1.md](./tech-spec-epic-2-part1.md) for Overview, Data Models, and Stories 2.1-2.6.

---

## Story 2.7: Days Calculation Utility (3 pts)

**FR References:** FR20
**Route:** Utility function (no direct UI)

### Acceptance Criteria

- [ ] **2.7.1:** Calculate expected end date from start date + days assigned
- [ ] **2.7.2:** Only count school days (from `daep_school_calendar`)
- [ ] **2.7.3:** Exclude holidays, teacher workdays, bad weather days
- [ ] **2.7.4:** Handle school calendar not existing (graceful error)
- [ ] **2.7.5:** Recalculate when school calendar is updated (manual trigger)
- [ ] **2.7.6:** Display "Days Remaining" badge on student cards

### Utility Function: `calculateExpectedEndDate`

```typescript
// lib/utils/daep/days-remaining.ts

import { addDays, format, parseISO, isSameDay } from 'date-fns';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Calculate expected end date based on school calendar.
 * Only counts days where is_school_day = true.
 */
export async function calculateExpectedEndDate(
  tenantId: string,
  startDate: string,
  daysAssigned: number
): Promise<string> {
  const supabase = await createServerClient();

  // Get school year from start date
  const startYear = new Date(startDate).getFullYear();
  const startMonth = new Date(startDate).getMonth();
  const schoolYear = startMonth >= 7 ? `${startYear}-${startYear + 1}` : `${startYear - 1}-${startYear}`;

  // Get school days from calendar
  const { data: calendarDays, error } = await supabase
    .from('daep_school_calendar')
    .select('date')
    .eq('tenant_id', tenantId)
    .eq('school_year', schoolYear)
    .eq('is_school_day', true)
    .gte('date', startDate)
    .order('date', { ascending: true });

  if (error || !calendarDays || calendarDays.length === 0) {
    // Fallback: use business days (Mon-Fri) if no calendar
    console.warn('[DAEP Days] No school calendar found, using business days fallback');
    return calculateBusinessDaysFallback(startDate, daysAssigned);
  }

  // Count through school days
  if (calendarDays.length < daysAssigned) {
    // Not enough school days in calendar
    console.warn('[DAEP Days] Not enough school days in calendar');
    return calendarDays[calendarDays.length - 1].date;
  }

  // Return the date after serving all assigned days
  return calendarDays[daysAssigned - 1].date;
}

/**
 * Fallback when no school calendar exists.
 * Uses Mon-Fri as school days.
 */
function calculateBusinessDaysFallback(startDate: string, daysAssigned: number): string {
  let currentDate = parseISO(startDate);
  let daysRemaining = daysAssigned;

  while (daysRemaining > 0) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysRemaining--;
    }
    if (daysRemaining > 0) {
      currentDate = addDays(currentDate, 1);
    }
  }

  return format(currentDate, 'yyyy-MM-dd');
}

/**
 * Calculate days remaining for a placement.
 * Uses school calendar if available.
 */
export async function calculateDaysRemaining(
  tenantId: string,
  startDate: string,
  daysAssigned: number,
  daysServed: number
): Promise<{
  days_remaining: number;
  expected_end_date: string;
  is_complete: boolean;
}> {
  const daysRemaining = Math.max(0, daysAssigned - daysServed);
  const isComplete = daysRemaining === 0;

  // Calculate expected end date from today
  const today = format(new Date(), 'yyyy-MM-dd');
  const expectedEndDate = await calculateExpectedEndDate(tenantId, today, daysRemaining);

  return {
    days_remaining: daysRemaining,
    expected_end_date: expectedEndDate,
    is_complete: isComplete,
  };
}

/**
 * Get current period based on bell schedule and current time.
 */
export async function getCurrentPeriod(
  tenantId: string,
  campusId?: string
): Promise<{ period: string; schedule_name: string } | null> {
  const supabase = await createServerClient();

  // Get today's date
  const today = format(new Date(), 'yyyy-MM-dd');

  // Get today's bell schedule from calendar
  const { data: calendarDay } = await supabase
    .from('daep_school_calendar')
    .select('bell_schedule_id')
    .eq('tenant_id', tenantId)
    .eq('date', today)
    .single();

  let scheduleId = calendarDay?.bell_schedule_id;

  // Fallback to default schedule if no specific schedule for today
  if (!scheduleId) {
    const { data: defaultSchedule } = await supabase
      .from('daep_bell_schedules')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_default', true)
      .single();

    scheduleId = defaultSchedule?.id;
  }

  if (!scheduleId) return null;

  // Get schedule details
  const { data: schedule } = await supabase
    .from('daep_bell_schedules')
    .select('schedule_name, periods')
    .eq('id', scheduleId)
    .single();

  if (!schedule) return null;

  // Parse current time
  const now = new Date();
  const currentTime = format(now, 'HH:mm');

  // Find current period
  const periods = schedule.periods as Array<{
    period: string;
    start_time: string;
    end_time: string;
  }>;

  for (const p of periods) {
    if (currentTime >= p.start_time && currentTime <= p.end_time) {
      return {
        period: p.period,
        schedule_name: schedule.schedule_name,
      };
    }
  }

  return null; // Outside school hours
}
```

### Server Action: `recalculatePlacementDays`

```typescript
// app/actions/daep/placements.ts

export async function recalculatePlacementDays(placementId: string): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Get placement
  const { data: placement } = await supabase
    .from('daep_placements')
    .select('id, start_date, days_assigned, days_served')
    .eq('id', placementId)
    .eq('tenant_id', tenantId)
    .single();

  if (!placement) throw new Error('Placement not found');

  // Recalculate
  const result = await calculateDaysRemaining(
    tenantId,
    placement.start_date,
    placement.days_assigned,
    placement.days_served
  );

  // Update placement
  await supabase
    .from('daep_placements')
    .update({
      days_remaining: result.days_remaining,
      expected_end_date: result.expected_end_date,
    })
    .eq('id', placementId);

  revalidatePath('/daep/students');
}
```

---

## Story 2.8: Placement Status Transitions (3 pts)

**FR References:** FR21
**Route:** Component in placement detail / student profile

### Acceptance Criteria

- [ ] **2.8.1:** Visual state machine showing current status
- [ ] **2.8.2:** Transition buttons based on current state
- [ ] **2.8.3:** Validation of valid transitions only
- [ ] **2.8.4:** Transition log created for each change
- [ ] **2.8.5:** Notes required for certain transitions
- [ ] **2.8.6:** Audit trail updated on each transition
- [ ] **2.8.7:** Email notification triggers (future - logged for now)

### Server Action: `transitionPlacement`

```typescript
// app/actions/daep/placements.ts

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'complete', 'cancelled'],
  active: ['transition', 'cancelled'],
  transition: ['complete', 'active', 'cancelled'], // Can revert to active if meeting fails
  complete: [], // Terminal state
  cancelled: [], // Terminal state
};

export async function transitionPlacement(input: PlacementTransitionInput): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // 1. Get current placement
  const { data: placement } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      status,
      days_served,
      days_assigned,
      student:trespass_records!inner(first_name, last_name)
    `)
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!placement) throw new Error('Placement not found');

  // 2. Validate transition
  const validNextStates = VALID_TRANSITIONS[placement.status] || [];
  if (!validNextStates.includes(input.to_status)) {
    throw new Error(`Invalid transition: ${placement.status} → ${input.to_status}`);
  }

  // 3. Build update object based on target status
  const updateData: Record<string, any> = {
    status: input.to_status,
  };

  switch (input.to_status) {
    case 'active':
      // Intake processed
      break;

    case 'transition':
      updateData.transition_requested_date = new Date().toISOString().split('T')[0];
      break;

    case 'complete':
      updateData.actual_end_date = new Date().toISOString().split('T')[0];
      if (input.transition_meeting_date) {
        updateData.transition_meeting_date = input.transition_meeting_date;
      }
      if (input.first_day_back_date) {
        updateData.first_day_back_date = input.first_day_back_date;
      }
      break;

    case 'cancelled':
      updateData.completion_notes = input.notes || 'Placement cancelled';
      break;
  }

  // 4. Update placement
  const { error } = await supabase
    .from('daep_placements')
    .update(updateData)
    .eq('id', input.placement_id);

  if (error) throw new Error('Failed to transition placement');

  // 5. Create transition log
  await supabase
    .from('daep_placement_transitions')
    .insert({
      tenant_id: tenantId,
      placement_id: input.placement_id,
      from_status: placement.status,
      to_status: input.to_status,
      transition_reason: input.transition_reason,
      transitioned_by: user.id,
      notes: input.notes,
    });

  // 6. Update trespass_records if completing
  if (input.to_status === 'complete' || input.to_status === 'cancelled') {
    // Check if student has other active placements
    const { data: otherPlacements } = await supabase
      .from('daep_placements')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('school_id', placement.school_id)
      .in('status', ['pending', 'active', 'transition'])
      .neq('id', input.placement_id);

    if (!otherPlacements || otherPlacements.length === 0) {
      await supabase
        .from('trespass_records')
        .update({ is_daep: false })
        .eq('tenant_id', tenantId)
        .eq('school_id', placement.school_id);
    }
  }

  // 7. Audit log
  const studentName = `${(placement.student as any).first_name} ${(placement.student as any).last_name}`;
  await logAuditEvent({
    eventType: 'placement.transitioned',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: `Transitioned placement from ${placement.status} to ${input.to_status}`,
    recordSubjectName: studentName,
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      from_status: placement.status,
      to_status: input.to_status,
      transition_reason: input.transition_reason,
    },
  });

  revalidatePath('/daep/students');
  revalidatePath(`/daep/students/${placement.school_id}`);
}
```

### UI Component: `PlacementStatusBadge`

```typescript
// components/daep/shared/placement-status-badge.tsx

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    variant: 'secondary' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  active: {
    label: 'Active',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  transition: {
    label: 'Transition',
    variant: 'outline' as const,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  complete: {
    label: 'Complete',
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
};

interface PlacementStatusBadgeProps {
  status: keyof typeof STATUS_CONFIG;
  showLabel?: boolean;
}

export function PlacementStatusBadge({ status, showLabel = true }: PlacementStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <Badge variant={config.variant} className={cn('text-xs', config.className)}>
      {showLabel ? config.label : status}
    </Badge>
  );
}
```

---

## Story 2.9: Transition Workflow (3 pts)

**FR References:** FR21, FR22
**Route:** Modal or `/daep/placements/[id]/transition`

### Acceptance Criteria

- [ ] **2.9.1:** Transition form when days served = days assigned
- [ ] **2.9.2:** Capture transition meeting date (scheduled)
- [ ] **2.9.3:** Capture home campus contact person
- [ ] **2.9.4:** Notification to home campus (logged - email future)
- [ ] **2.9.5:** Confirmation of first day back at home campus
- [ ] **2.9.6:** Status → Complete after confirmation
- [ ] **2.9.7:** Days before transition reminders (7/5/3/2 days)

### Server Action: `initiateTransition`

```typescript
// app/actions/daep/placements.ts

export interface TransitionRequest {
  placement_id: string;
  transition_meeting_date: string;
  campus_contact_name: string;
  campus_contact_email?: string;
  notes?: string;
}

export async function initiateTransition(input: TransitionRequest): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Get placement
  const { data: placement } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      status,
      days_served,
      days_assigned,
      home_campus_id,
      student:trespass_records!inner(first_name, last_name)
    `)
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!placement) throw new Error('Placement not found');

  if (placement.status !== 'active') {
    throw new Error('Can only initiate transition for active placements');
  }

  // Update placement
  const { error } = await supabase
    .from('daep_placements')
    .update({
      status: 'transition',
      transition_requested_date: new Date().toISOString().split('T')[0],
      transition_meeting_date: input.transition_meeting_date,
      completion_notes: input.notes,
    })
    .eq('id', input.placement_id);

  if (error) throw new Error('Failed to initiate transition');

  // Create transition log
  await supabase
    .from('daep_placement_transitions')
    .insert({
      tenant_id: tenantId,
      placement_id: input.placement_id,
      from_status: 'active',
      to_status: 'transition',
      transition_reason: `Transition meeting scheduled for ${input.transition_meeting_date}`,
      transitioned_by: user.id,
      notes: `Campus contact: ${input.campus_contact_name}`,
    });

  // Create notification for campus (in-app)
  await supabase
    .from('daep_notifications')
    .insert({
      tenant_id: tenantId,
      user_id: user.id, // TODO: Find campus admin user_id
      notification_type: 'transition_meeting',
      title: 'Student Transition Meeting Scheduled',
      message: `Transition meeting for ${(placement.student as any).first_name} ${(placement.student as any).last_name} scheduled for ${input.transition_meeting_date}`,
      related_school_id: placement.school_id,
      related_placement_id: placement.id,
      action_url: `/daep/students/${placement.school_id}`,
    });

  // Audit log
  const studentName = `${(placement.student as any).first_name} ${(placement.student as any).last_name}`;
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
}
```

### Server Action: `completeTransition`

```typescript
// app/actions/daep/placements.ts

export interface CompleteTransitionInput {
  placement_id: string;
  first_day_back_date: string;
  completion_notes?: string;
}

export async function completeTransition(input: CompleteTransitionInput): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Get placement
  const { data: placement } = await supabase
    .from('daep_placements')
    .select('id, school_id, status')
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!placement) throw new Error('Placement not found');

  if (placement.status !== 'transition') {
    throw new Error('Can only complete transition for placements in transition status');
  }

  // Update placement to complete
  await transitionPlacement({
    placement_id: input.placement_id,
    to_status: 'complete',
    first_day_back_date: input.first_day_back_date,
    notes: input.completion_notes,
    transition_reason: 'Student returned to home campus',
  });
}
```

---

## Story 2.10: No-Show and Early Termination (2 pts)

**FR References:** FR26
**Route:** Action in placement detail

### Acceptance Criteria

- [ ] **2.10.1:** Mark placement as no-show (student never attended)
- [ ] **2.10.2:** No-show sets `days_owed = days_assigned`
- [ ] **2.10.3:** Early termination option (student leaves before completion)
- [ ] **2.10.4:** Capture early termination reason
- [ ] **2.10.5:** Days remaining tracked for potential future placement
- [ ] **2.10.6:** Audit log for both actions

### Server Action: `markNoShow`

```typescript
// app/actions/daep/placements.ts

export async function markNoShow(placementId: string, reason?: string): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  const { data: placement } = await supabase
    .from('daep_placements')
    .select('id, school_id, status, days_assigned')
    .eq('id', placementId)
    .eq('tenant_id', tenantId)
    .single();

  if (!placement) throw new Error('Placement not found');

  if (placement.status !== 'pending' && placement.status !== 'active') {
    throw new Error('Can only mark no-show for pending or active placements');
  }

  // Update placement
  await supabase
    .from('daep_placements')
    .update({
      status: 'complete',
      no_show: true,
      days_served: 0,
      days_remaining: placement.days_assigned, // All days still owed
      actual_end_date: new Date().toISOString().split('T')[0],
      completion_notes: reason || 'Student never attended - marked as no-show',
    })
    .eq('id', placementId);

  // Transition log
  await supabase
    .from('daep_placement_transitions')
    .insert({
      tenant_id: tenantId,
      placement_id: placementId,
      from_status: placement.status,
      to_status: 'complete',
      transition_reason: 'Marked as no-show',
      transitioned_by: user.id,
      notes: reason,
    });

  // Audit log
  await logAuditEvent({
    eventType: 'placement.no_show',
    module: 'daep_management',
    actorId: user.id,
    targetId: placementId,
    action: 'Marked placement as no-show',
    recordSchoolId: placement.school_id,
    tenantId,
    details: { days_owed: placement.days_assigned, reason },
  });

  revalidatePath('/daep/students');
}
```

### Server Action: `earlyTermination`

```typescript
// app/actions/daep/placements.ts

export interface EarlyTerminationInput {
  placement_id: string;
  termination_reason: string;
  termination_date: string;
}

export async function earlyTermination(input: EarlyTerminationInput): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  const { data: placement } = await supabase
    .from('daep_placements')
    .select('id, school_id, status, days_assigned, days_served')
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!placement) throw new Error('Placement not found');

  if (placement.status !== 'active') {
    throw new Error('Can only terminate active placements');
  }

  const daysRemaining = placement.days_assigned - placement.days_served;

  // Update placement
  await supabase
    .from('daep_placements')
    .update({
      status: 'complete',
      actual_end_date: input.termination_date,
      days_remaining: daysRemaining,
      completion_notes: `Early termination: ${input.termination_reason}`,
    })
    .eq('id', input.placement_id);

  // Transition log
  await supabase
    .from('daep_placement_transitions')
    .insert({
      tenant_id: tenantId,
      placement_id: input.placement_id,
      from_status: 'active',
      to_status: 'complete',
      transition_reason: 'Early termination',
      transitioned_by: user.id,
      notes: input.termination_reason,
    });

  // Audit log
  await logAuditEvent({
    eventType: 'placement.early_termination',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: 'Early termination of placement',
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      days_served: placement.days_served,
      days_remaining: daysRemaining,
      reason: input.termination_reason,
    },
  });

  revalidatePath('/daep/students');
}
```

---

## Story 2.11: Rollover Students (2 pts)

**FR References:** FR25
**Route:** Report view + action modal

### Acceptance Criteria

- [ ] **2.11.1:** Report showing students with days_remaining > school_days_left
- [ ] **2.11.2:** Rollover decision options: "Continue Next Year" or "Reset"
- [ ] **2.11.3:** Decision captured and logged
- [ ] **2.11.4:** Rollover flag set on placement
- [ ] **2.11.5:** End-of-year workflow trigger
- [ ] **2.11.6:** Notes field for rollover decisions

### Server Action: `getRolloverCandidates`

```typescript
// app/actions/daep/placements.ts

export interface RolloverCandidate {
  placement_id: string;
  school_id: string;
  student_name: string;
  days_remaining: number;
  school_days_left: number;
  home_campus: string;
  start_date: string;
}

export async function getRolloverCandidates(): Promise<RolloverCandidate[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get current date and school year end
  const today = new Date();
  const schoolYear = today.getMonth() >= 7
    ? `${today.getFullYear()}-${today.getFullYear() + 1}`
    : `${today.getFullYear() - 1}-${today.getFullYear()}`;

  // Count remaining school days in current year
  const { data: remainingDays, count } = await supabase
    .from('daep_school_calendar')
    .select('date', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('school_year', schoolYear)
    .eq('is_school_day', true)
    .gte('date', today.toISOString().split('T')[0]);

  const schoolDaysLeft = count || 0;

  // Get active placements with more days remaining than school days left
  const { data: placements } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      days_remaining,
      start_date,
      home_campus:campuses!fk_daep_placements_home_campus(name),
      student:trespass_records!inner(first_name, last_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .gt('days_remaining', schoolDaysLeft);

  if (!placements) return [];

  return placements.map(p => ({
    placement_id: p.id,
    school_id: p.school_id,
    student_name: `${(p.student as any).first_name} ${(p.student as any).last_name}`,
    days_remaining: p.days_remaining,
    school_days_left: schoolDaysLeft,
    home_campus: (p.home_campus as any)?.name || 'Unknown',
    start_date: p.start_date,
  }));
}
```

### Server Action: `recordRolloverDecision`

```typescript
// app/actions/daep/placements.ts

export interface RolloverDecision {
  placement_id: string;
  decision: 'continue' | 'reset';
  notes?: string;
}

export async function recordRolloverDecision(input: RolloverDecision): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  const { data: placement } = await supabase
    .from('daep_placements')
    .select('id, school_id')
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!placement) throw new Error('Placement not found');

  // Update placement with rollover decision
  await supabase
    .from('daep_placements')
    .update({
      rollover_student: true,
      rollover_decision: input.decision,
      completion_notes: input.notes
        ? `Rollover decision (${input.decision}): ${input.notes}`
        : `Rollover decision: ${input.decision}`,
    })
    .eq('id', input.placement_id);

  // Audit log
  await logAuditEvent({
    eventType: 'placement.rollover_decision',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: `Recorded rollover decision: ${input.decision}`,
    recordSchoolId: placement.school_id,
    tenantId,
    details: { decision: input.decision, notes: input.notes },
  });

  revalidatePath('/daep/students');
  revalidatePath('/daep/reports');
}
```

---

## Story 2.12: TrespassTracker Expiration Sync (2 pts)

**FR References:** FR74, FR77
**Route:** Background sync / utility

### Acceptance Criteria

- [ ] **2.12.1:** DAEP placement end date syncs to `trespass_records.daep_expiration_date`
- [ ] **2.12.2:** Sync occurs on placement create/update
- [ ] **2.12.3:** If student has multiple placements, use farthest date
- [ ] **2.12.4:** TrespassTracker shows DAEP status and expiration
- [ ] **2.12.5:** Auto-update `is_daep` flag when all placements complete

### Server Action: `syncTrespassTrackerExpiration`

```typescript
// app/actions/daep/placements.ts

export async function syncTrespassTrackerExpiration(school_id: string): Promise<void> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get all active/pending/transition placements for this student
  const { data: placements } = await supabase
    .from('daep_placements')
    .select('expected_end_date, status')
    .eq('tenant_id', tenantId)
    .eq('school_id', school_id)
    .in('status', ['pending', 'active', 'transition']);

  if (!placements || placements.length === 0) {
    // No active placements - clear DAEP status
    await supabase
      .from('trespass_records')
      .update({
        is_daep: false,
        daep_expiration_date: null,
      })
      .eq('tenant_id', tenantId)
      .eq('school_id', school_id);
    return;
  }

  // Find farthest expected end date
  const farthestDate = placements
    .filter(p => p.expected_end_date)
    .map(p => p.expected_end_date)
    .sort()
    .reverse()[0];

  // Update trespass_records
  await supabase
    .from('trespass_records')
    .update({
      is_daep: true,
      daep_expiration_date: farthestDate || null,
    })
    .eq('tenant_id', tenantId)
    .eq('school_id', school_id);
}
```

### Trigger Integration

```typescript
// Call syncTrespassTrackerExpiration() from:
// - createPlacement (after insert)
// - updatePlacement (after update)
// - transitionPlacement (after status change to complete/cancelled)
// - recalculatePlacementDays (after expected_end_date changes)
```

---

## Story 2.13: 90-Day Assessment Tracking (2 pts)

**FR References:** FR87, FR88
**Route:** Component in student profile / placement detail

### Acceptance Criteria

- [ ] **2.13.1:** Auto-flag when `days_assigned > 90` (TEC §37.0082)
- [ ] **2.13.2:** Assessment date field and scores (math, reading)
- [ ] **2.13.3:** Dashboard indicator for students needing assessment
- [ ] **2.13.4:** Assessment completion tracking
- [ ] **2.13.5:** 120-day follow-up assessment (if applicable)
- [ ] **2.13.6:** Report: Students requiring/completed assessments

### Server Action: `recordAssessment`

```typescript
// app/actions/daep/placements.ts

export interface AssessmentInput {
  placement_id: string;
  assessment_type: '90day' | '120day';
  assessment_date: string;
  scores: {
    math?: number;
    reading?: number;
  };
  notes?: string;
}

export async function recordAssessment(input: AssessmentInput): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  const { data: placement } = await supabase
    .from('daep_placements')
    .select('id, school_id, days_assigned')
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!placement) throw new Error('Placement not found');

  // Validate: only 90+ day placements need assessment
  if (placement.days_assigned <= 90 && input.assessment_type === '90day') {
    throw new Error('90-day assessment only required for placements > 90 days');
  }

  // Build update based on assessment type
  const updateData: Record<string, any> = {};

  if (input.assessment_type === '90day') {
    updateData.assessment_90day_date = input.assessment_date;
    updateData.assessment_90day_scores = input.scores;
  } else {
    updateData.assessment_120day_date = input.assessment_date;
  }

  // Update placement
  await supabase
    .from('daep_placements')
    .update(updateData)
    .eq('id', input.placement_id);

  // Audit log
  await logAuditEvent({
    eventType: 'placement.assessment_recorded',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: `Recorded ${input.assessment_type} assessment`,
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      assessment_type: input.assessment_type,
      scores: input.scores,
      date: input.assessment_date,
    },
  });

  revalidatePath(`/daep/students/${placement.school_id}`);
}
```

### Server Action: `getAssessmentsDue`

```typescript
// app/actions/daep/placements.ts

export interface AssessmentDue {
  placement_id: string;
  school_id: string;
  student_name: string;
  assessment_type: '90day' | '120day';
  days_assigned: number;
  days_served: number;
  due_by: string; // Calculated from start_date + 90/120 school days
}

export async function getAssessmentsDue(): Promise<AssessmentDue[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get placements requiring assessment (>90 days, no assessment recorded)
  const { data: placements } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      days_assigned,
      days_served,
      start_date,
      assessment_90day_date,
      assessment_120day_date,
      assessment_90day_required,
      student:trespass_records!inner(first_name, last_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .eq('assessment_90day_required', true);

  if (!placements) return [];

  const results: AssessmentDue[] = [];

  for (const p of placements) {
    const studentName = `${(p.student as any).first_name} ${(p.student as any).last_name}`;

    // Check if 90-day assessment is due
    if (!p.assessment_90day_date && p.days_served >= 80) {
      // Due around day 90
      const dueBy = await calculateExpectedEndDate(tenantId, p.start_date, 90);
      results.push({
        placement_id: p.id,
        school_id: p.school_id,
        student_name: studentName,
        assessment_type: '90day',
        days_assigned: p.days_assigned,
        days_served: p.days_served,
        due_by: dueBy,
      });
    }

    // Check if 120-day assessment is due
    if (p.assessment_90day_date && !p.assessment_120day_date && p.days_served >= 110) {
      const dueBy = await calculateExpectedEndDate(tenantId, p.start_date, 120);
      results.push({
        placement_id: p.id,
        school_id: p.school_id,
        student_name: studentName,
        assessment_type: '120day',
        days_assigned: p.days_assigned,
        days_served: p.days_served,
        due_by: dueBy,
      });
    }
  }

  return results;
}
```

---

## File Structure for Part 2

```
app/
├── actions/
│   └── daep/
│       ├── placements.ts               # Stories 2.7-2.13 (extended)
│       │   ├── transitionPlacement()
│       │   ├── initiateTransition()
│       │   ├── completeTransition()
│       │   ├── markNoShow()
│       │   ├── earlyTermination()
│       │   ├── getRolloverCandidates()
│       │   ├── recordRolloverDecision()
│       │   ├── syncTrespassTrackerExpiration()
│       │   ├── recordAssessment()
│       │   └── getAssessmentsDue()
│       │
│       └── rooms.ts                     # Extended in Part 1
│
├── daep/
│   ├── placements/
│   │   └── [id]/
│   │       ├── page.tsx                # Placement detail
│   │       └── components/
│   │           ├── status-timeline.tsx
│   │           ├── transition-form.tsx
│   │           ├── no-show-dialog.tsx
│   │           ├── early-termination-dialog.tsx
│   │           └── assessment-form.tsx
│   │
│   └── reports/
│       └── rollover/
│           └── page.tsx                # Story 2.11 report
│
└── lib/
    └── utils/
        └── daep/
            ├── days-remaining.ts       # Story 2.7
            └── trespass-sync.ts        # Story 2.12
```

---

## Integration Patterns

### 1. Audit Logging

Every mutation in Epic 2 uses the shared audit logging pattern:

```typescript
await logAuditEvent({
  eventType: 'placement.{action}',
  module: 'daep_management',
  actorId: user.id,
  targetId: placementId,
  action: 'Human-readable action description',
  recordSubjectName: studentName,
  recordSchoolId: school_id,
  tenantId,
  details: { /* relevant data */ },
});
```

### 2. TrespassTracker Sync

After any placement change that affects DAEP status:

```typescript
// Call after: create, update, transition, complete
await syncTrespassTrackerExpiration(school_id);
```

### 3. Path Revalidation

Always revalidate affected paths:

```typescript
revalidatePath('/daep/students');
revalidatePath('/daep/placements');
revalidatePath(`/daep/students/${school_id}`);
```

### 4. Tenant Isolation

Every query uses the helper:

```typescript
const tenantId = await getTenantId(); // Handles active_tenant_id for super_admin
```

---

## Testing Scenarios

### Story 2.4-2.5: Placement Creation and Intake

1. Create placement with valid data → Success
2. Create duplicate placement (same student + incident) → Error
3. Create placement for non-existent student → Create trespass_record first
4. Process intake for pending placement → Status changes to active
5. Process intake for already-active student → Error

### Story 2.6: Room Assignment

1. Assign to room with capacity → Success
2. Assign to full room → Error
3. Assign with separation conflict → Error with reason
4. Create separation between students → Updates room availability

### Story 2.8-2.9: Transitions

1. Pending → Active → Transition → Complete → Valid flow
2. Pending → Complete (appeal) → Valid skip
3. Active → Pending → Invalid transition
4. Complete → Active → Invalid (terminal state)

### Story 2.10-2.11: Special Cases

1. Mark active as no-show → Status complete, days_remaining = days_assigned
2. Early termination → Captures remaining days
3. Rollover candidate detection → Students with days > school days left
4. Rollover decision → Logged and flagged

### Story 2.12-2.13: Integration

1. Create placement → trespass_records.is_daep = true
2. Complete all placements → trespass_records.is_daep = false
3. 90-day placement → assessment_90day_required = true
4. Record assessment → Scores saved, audit logged

---

## Summary

**Epic 2 Placement Management** delivers:

- **13 stories** covering full placement lifecycle
- **34 story points** of functionality
- **Complete state machine** (Pending → Active → Transition → Complete)
- **Room assignment** with separation logic
- **TrespassTracker integration** for status sync
- **Compliance features** (90-day assessments, rollover handling)

**Dependencies:**
- Epic 1a: Core schema ✅
- Epic 1b: Configuration UI ✅ (rooms, schedules, discipline codes, calendar)

**Next Steps:**
1. Create database migrations (separations, transitions tables)
2. Implement stories 2.2-2.13 sequentially
3. Test multi-tenant scenarios
4. Validate TrespassTracker sync

---

**See Part 1:** [tech-spec-epic-2-part1.md](./tech-spec-epic-2-part1.md) for Stories 2.1-2.6

---

_Generated: 2025-11-26_
_Epic: 2 - Placement Management_
_Author: Claude (Dev Agent)_
