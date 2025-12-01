# Technical Specification: Stories 2-6, 2-7

**Date:** 2025-11-29
**Author:** Bob (SM Agent)
**Epic:** 2 - Placement Management
**Status:** VALIDATED

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-28 | Bob | Initial draft |
| 2025-11-29 | Bob + Alan | Applied corrections from PO review session |

### Key Changes (2025-11-29)

1. **Status enum simplified:** `pending`, `active`, `met`, `complete` (4 statuses only)
2. **Removed:** `cancelled`, `no_show`, `appealed` - these are workflow states, not placement statuses
3. **Auto-start trigger:** Attendance (present/tardy) transitions `pending → active` and sets `start_date`
4. **Manual override:** "Start Placement" button kept for edge cases
5. **Days color coding:** ON HOLD - keeping existing progress bar design
6. **Kanban/Intake Pipeline:** Moved to Epic 2B (out of scope for 2-6/2-7)
7. **Renamed:** `transition` → `met` (triggers notifications)

---

> **Theme Requirement:** All UI components must follow the [Theme & Styling Guidelines](./tech-spec-epic-2-part1.md#theme--styling-guidelines). Never hardcode colors.

---

## Overview

This document provides detailed technical specifications for two related Epic 2 stories that manage placement lifecycle and scheduling:

| Story | Name | Points | FRs |
|-------|------|--------|-----|
| 2-6 | Placement Lifecycle State Machine | 5 | FR21 |
| 2-7 | Days Remaining Calculation | 3 | FR20 |

**Total Points:** 8

**Recommended Implementation Order:** 2-7 → 2-6

- Story 2-7 creates the days calculation utility needed by placement cards
- Story 2-6 uses days remaining for `met` status eligibility checks

---

## Status Definitions

| Status | Meaning | Terminal? |
|--------|---------|-----------|
| `pending` | Approved, awaiting first day at DAEP | No |
| `active` | Currently attending DAEP | No |
| `met` | Review met, preparing to return to home campus | No |
| `complete` | Placement ended (with optional notes) | Yes |

**Notes field:** Optional text for context (e.g., "Appeal granted - reduced to 10 days", "Time served per campus decision")

### What's NOT a Status

These are handled elsewhere:

| Concept | Where It Lives |
|---------|----------------|
| No-show | Kanban column position (Epic 2B) |
| Appealed | Workflow process - student stays pending/active during appeal |
| Cancelled | Use `complete` with notes |
| Intake stage | `intake_stage` field for Kanban (Epic 2B) |

---

## Status Badge Colors

| Status | Color | Meaning |
|--------|-------|---------|
| Pending | Yellow | Awaiting first day |
| Active | Green | Currently at DAEP |
| Met | Blue | Review met, returning to campus |
| Complete | Gray | Placement closed |

---

## Story 2-7: Days Remaining Calculation

### Goal

Create utility functions that calculate expected end date and days remaining based on the school calendar, accounting for non-school days (holidays, weather days, teacher workdays).

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.7.1 | Calculate expected end date from start date + days assigned | Returns correct date using school calendar |
| 2.7.2 | Only count school days (from `daep_school_calendar`) | Skips holidays, weather days |
| 2.7.3 | Exclude teacher workdays and bad weather days | Non-school days not counted |
| 2.7.4 | Handle missing school calendar gracefully | Falls back to Mon-Fri business days |
| 2.7.5 | Recalculate when calendar is updated | Manual trigger function exists |
| 2.7.6 | Display days remaining on placement cards | Text display (no color coding for now) |
| 2.7.7 | Show expected end date on placement cards | Date formatted as "MMM d, yyyy" (e.g., "Nov 29, 2025") |

### Data Sources

| Data | Table | Query |
|------|-------|-------|
| School Days | `daep_school_calendar` | `WHERE is_school_day = true AND date >= start_date` |
| Placement Info | `daep_placements` | `days_assigned`, `days_served`, `start_date` |
| Bell Schedule | `daep_bell_schedules` | For current period calculation |

### Utility Functions

```typescript
// lib/daep/days-remaining.ts

import { addDays, format, parseISO, isWeekend } from 'date-fns';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Calculate expected end date based on school calendar.
 * Only counts days where is_school_day = true.
 *
 * @param tenantId - Tenant for calendar lookup
 * @param startDate - Placement start date (YYYY-MM-DD)
 * @param daysAssigned - Number of DAEP days assigned
 * @returns Expected end date (YYYY-MM-DD)
 */
export async function calculateExpectedEndDate(
  tenantId: string,
  startDate: string,
  daysAssigned: number
): Promise<string> {
  const supabase = await createServerClient();

  // Determine school year from start date
  const startDateObj = parseISO(startDate);
  const startYear = startDateObj.getFullYear();
  const startMonth = startDateObj.getMonth();
  // School year starts in August (month 7)
  const schoolYear = startMonth >= 7
    ? `${startYear}-${startYear + 1}`
    : `${startYear - 1}-${startYear}`;

  // Query school days from calendar
  const { data: calendarDays, error } = await supabase
    .from('daep_school_calendar')
    .select('date')
    .eq('tenant_id', tenantId)
    .eq('school_year', schoolYear)
    .eq('is_school_day', true)
    .gte('date', startDate)
    .order('date', { ascending: true })
    .limit(daysAssigned + 30); // Buffer for calculation

  if (error || !calendarDays || calendarDays.length === 0) {
    console.warn('[DAEP Days] No school calendar found, using business days fallback');
    return calculateBusinessDaysFallback(startDate, daysAssigned);
  }

  // Not enough days in calendar
  if (calendarDays.length < daysAssigned) {
    console.warn('[DAEP Days] Insufficient school days in calendar');
    // Return last available day
    return calendarDays[calendarDays.length - 1].date;
  }

  // Return the date of the last assigned day (1-indexed)
  return calendarDays[daysAssigned - 1].date;
}

/**
 * Fallback calculation using Mon-Fri as school days.
 * Used when no school calendar exists.
 */
function calculateBusinessDaysFallback(startDate: string, daysAssigned: number): string {
  let currentDate = parseISO(startDate);
  let daysRemaining = daysAssigned;

  while (daysRemaining > 0) {
    if (!isWeekend(currentDate)) {
      daysRemaining--;
    }
    if (daysRemaining > 0) {
      currentDate = addDays(currentDate, 1);
    }
  }

  return format(currentDate, 'yyyy-MM-dd');
}

/**
 * Calculate days served based on school calendar.
 * Counts school days between start_date and today.
 */
export async function calculateDaysServed(
  tenantId: string,
  startDate: string
): Promise<number> {
  const supabase = await createServerClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Count school days from start to today
  const { count, error } = await supabase
    .from('daep_school_calendar')
    .select('date', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_school_day', true)
    .gte('date', startDate)
    .lte('date', today);

  if (error) {
    console.error('[DAEP Days] Error counting days served:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Calculate complete days info for a placement.
 * NOTE: No color coding - that's handled separately by at-risk system
 */
export async function calculateDaysInfo(
  tenantId: string,
  startDate: string,
  daysAssigned: number,
  daysServed: number
): Promise<{
  days_remaining: number;
  expected_end_date: string;
  is_complete: boolean;
  progress_percent: number;
}> {
  const daysRemaining = Math.max(0, daysAssigned - daysServed);
  const isComplete = daysRemaining === 0;
  const progressPercent = Math.round((daysServed / daysAssigned) * 100);

  // Calculate expected end date from current position
  const today = format(new Date(), 'yyyy-MM-dd');
  const expectedEndDate = await calculateExpectedEndDate(tenantId, today, daysRemaining);

  return {
    days_remaining: daysRemaining,
    expected_end_date: expectedEndDate,
    is_complete: isComplete,
    progress_percent: progressPercent,
  };
}
```

### Server Action: Recalculate Placement Days

```typescript
// app/actions/daep/placements.ts - ADD

import { calculateDaysInfo } from '@/lib/daep/days-remaining';

/**
 * Recalculate and update days remaining for a placement.
 * Called after calendar updates or manual trigger.
 */
export async function recalculatePlacementDays(placementId: string): Promise<void> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Get placement
  const { data: placement, error: fetchError } = await supabase
    .from('daep_placements')
    .select('id, school_id, start_date, days_assigned, days_served')
    .eq('id', placementId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !placement) {
    throw new Error('Placement not found');
  }

  // Recalculate
  const daysInfo = await calculateDaysInfo(
    tenantId,
    placement.start_date,
    placement.days_assigned,
    placement.days_served
  );

  // Update placement
  const { error: updateError } = await supabase
    .from('daep_placements')
    .update({
      days_remaining: daysInfo.days_remaining,
      expected_end_date: daysInfo.expected_end_date,
    })
    .eq('id', placementId);

  if (updateError) {
    throw new Error('Failed to update placement days');
  }

  // Audit log
  await logAuditEvent({
    eventType: 'placement.days_recalculated',
    module: 'daep_management',
    actorId: user.id,
    targetId: placementId,
    action: 'Recalculated placement days',
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      days_remaining: daysInfo.days_remaining,
      expected_end_date: daysInfo.expected_end_date,
    },
  });

  revalidatePath('/daep/students');
  revalidatePath('/daep/placements');
}

/**
 * Batch recalculate all active placements.
 * Called after school calendar changes.
 */
export async function recalculateAllActivePlacements(): Promise<{ updated: number }> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get all non-complete placements
  const { data: placements } = await supabase
    .from('daep_placements')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'active', 'met']);

  if (!placements) return { updated: 0 };

  let updated = 0;
  for (const p of placements) {
    try {
      await recalculatePlacementDays(p.id);
      updated++;
    } catch (error) {
      console.error(`Failed to recalculate placement ${p.id}:`, error);
    }
  }

  return { updated };
}
```

### UI Component: Days Progress Bar

```typescript
// components/daep/shared/DaysProgressBar.tsx

import { cn } from '@/lib/utils';

interface DaysProgressBarProps {
  daysServed: number;
  daysAssigned: number;
  daysRemaining: number;
  showLabels?: boolean;
}

export function DaysProgressBar({
  daysServed,
  daysAssigned,
  daysRemaining,
  showLabels = true,
}: DaysProgressBarProps) {
  const progressPercent = Math.round((daysServed / daysAssigned) * 100);

  return (
    <div className="space-y-1">
      {showLabels && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{daysServed} served</span>
          <span>{daysRemaining} remaining</span>
        </div>
      )}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 bg-primary"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {showLabels && (
        <div className="text-xs text-center text-muted-foreground">
          {progressPercent}% complete ({daysAssigned} days total)
        </div>
      )}
    </div>
  );
}
```

---

## Story 2-6: Placement Lifecycle State Machine

### Goal

Implement the placement state machine that tracks student progress through DAEP: Pending → Active → Met → Complete.

### State Machine Diagram

```
┌─────────────┐   attendance    ┌─────────────┐    days met     ┌─────────────┐   meeting +    ┌─────────────┐
│   PENDING   │────────────────▶│   ACTIVE    │────────────────▶│     MET     │───first day───▶│  COMPLETE   │
│ (scheduled) │  (present/tardy)│ (at DAEP)   │                 │  (review)   │    back        │  (closed)   │
└─────────────┘   OR manual btn └─────────────┘                 └─────────────┘               └─────────────┘
       │                               │                               │
       │                               │                               │
       │                               │                               │
       └───────────────────────────────┴───────────────────────────────┘
                                    │
                             appeal/early term
                             (update days or
                              mark complete
                              with notes)
```

### Auto-Start Trigger

When attendance is recorded:

```typescript
// Trigger logic (in attendance recording action)
IF placement.status === 'pending'
AND attendance.status IN ['present', 'tardy']  // NOT 'absent'
THEN
  placement.status = 'active'
  placement.start_date = today
  // Log transition
```

**Note:** `intake_date` is set earlier during scheduling. `start_date` is their first actual day at DAEP.

### Valid Transitions

| From | To | Trigger | Sets Field |
|------|----|---------|------------|
| pending | active | Attendance (present/tardy) OR manual button | `start_date = today` |
| pending | complete | Appeal granted (0 days) | `notes` |
| active | met | Days complete (days_remaining = 0) | `review_met_date = today` |
| active | complete | Early termination / appeal | `notes` |
| met | complete | Meeting + first day back confirmed | `transition_meeting_date`, `first_day_back_date` |
| met | active | Revert (meeting failed, more days needed) | `notes` |

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.6.1 | Placement states: Pending, Active, Met, Complete | All 4 states exist |
| 2.6.2 | Visual state indicator on placement card | Status badge with correct color |
| 2.6.3 | State transition buttons based on current state | Only valid transitions shown |
| 2.6.4 | Pending → Active: Auto on attendance OR manual button | Status changes, start_date set |
| 2.6.5 | Active → Met: "Review Met" button (days complete) | review_met_date recorded |
| 2.6.6 | Met → Complete: Requires meeting + first day back | Both fields validated |
| 2.6.7 | All transitions logged to `daep_placement_transitions` | Audit trail complete |
| 2.6.8 | Invalid transitions rejected with error | Error message shows valid options |
| 2.6.9 | TrespassTracker sync on completion | is_daep flag updated |
| 2.6.10 | Met status triggers notifications | Parent email, staff notifications |

### Button Matrix (Role-Based)

| Status | Buttons | Visible To |
|--------|---------|------------|
| Pending | Start Placement, Edit | Admin, DAEP Staff |
| Active | Edit, Review Met | Admin, DAEP Staff (Edit hidden from teachers) |
| Met | Edit, Complete, Revert | Admin only |
| Complete | Edit (notes only) | Admin only |

### Server Actions

```typescript
// app/actions/daep/placements.ts - ADD

import { PlacementTransitionSchema, type PlacementTransitionInput } from '@/lib/validation/schemas';

/**
 * Valid state transitions map
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'complete'],
  active: ['met', 'complete'],
  met: ['complete', 'active'],
  complete: [], // Terminal state
};

/**
 * Get valid next states for a placement
 */
export function getValidTransitions(currentStatus: string): string[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Transition a placement to a new status
 */
export async function transitionPlacement(
  input: PlacementTransitionInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Validate input
  const validation = PlacementTransitionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  // Get current placement
  const { data: placement, error: fetchError } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      status,
      days_served,
      days_assigned,
      days_remaining
    `)
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !placement) {
    return { success: false, error: 'Placement not found' };
  }

  // Validate transition
  const validNextStates = VALID_TRANSITIONS[placement.status] || [];
  if (!validNextStates.includes(input.to_status)) {
    return {
      success: false,
      error: `Cannot transition from ${placement.status} to ${input.to_status}. Valid options: ${validNextStates.join(', ') || 'none'}`,
    };
  }

  // Build update data based on target status
  const updateData: Record<string, any> = {
    status: input.to_status,
  };

  // Status-specific updates
  switch (input.to_status) {
    case 'active':
      updateData.start_date = new Date().toISOString().split('T')[0];
      break;

    case 'met':
      updateData.review_met_date = new Date().toISOString().split('T')[0];
      break;

    case 'complete':
      updateData.actual_end_date = new Date().toISOString().split('T')[0];
      if (input.transition_meeting_date) {
        updateData.transition_meeting_date = input.transition_meeting_date;
      }
      if (input.first_day_back_date) {
        updateData.first_day_back_date = input.first_day_back_date;
      }
      if (input.notes) {
        updateData.completion_notes = input.notes;
      }
      break;
  }

  // Update placement
  const { error: updateError } = await supabase
    .from('daep_placements')
    .update(updateData)
    .eq('id', input.placement_id);

  if (updateError) {
    return { success: false, error: 'Failed to update placement' };
  }

  // Create transition log
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

  // Trigger notifications on 'met' status
  if (input.to_status === 'met') {
    // TODO: Epic 7 - Send parent email, staff notifications
    console.log('[DAEP] Placement met - notifications would be sent here');
  }

  // Sync TrespassTracker on completion
  if (input.to_status === 'complete') {
    await syncTrespassTrackerStatus(tenantId, placement.school_id);
  }

  // Audit log
  await logAuditEvent({
    eventType: 'placement.status_changed',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: `Changed placement status: ${placement.status} → ${input.to_status}`,
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      from_status: placement.status,
      to_status: input.to_status,
      reason: input.transition_reason,
    },
  });

  revalidatePath('/daep/students');
  revalidatePath('/daep/placements');
  revalidatePath(`/daep/students/${placement.school_id}`);

  return { success: true };
}

/**
 * Auto-activate placement on attendance.
 * Called from attendance recording action.
 */
export async function autoActivatePlacementOnAttendance(
  tenantId: string,
  studentSchoolId: string,
  attendanceStatus: 'present' | 'tardy' | 'absent'
): Promise<void> {
  // Only activate on present or tardy
  if (attendanceStatus === 'absent') return;

  const supabase = await createServerClient();

  // Find pending placement for this student
  const { data: placement } = await supabase
    .from('daep_placements')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('school_id', studentSchoolId)
    .eq('status', 'pending')
    .single();

  if (!placement) return;

  // Transition to active
  await transitionPlacement({
    placement_id: placement.id,
    to_status: 'active',
    transition_reason: `Auto-activated on attendance: ${attendanceStatus}`,
  });
}

/**
 * Sync TrespassTracker is_daep flag after placement changes
 */
async function syncTrespassTrackerStatus(
  tenantId: string,
  schoolId: string
): Promise<void> {
  const supabase = await createServerClient();

  // Check if student has any non-complete placements
  const { count } = await supabase
    .from('daep_placements')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .in('status', ['pending', 'active', 'met']);

  const hasActive = (count || 0) > 0;

  // Update trespass_records
  await supabase
    .from('trespass_records')
    .update({ is_daep: hasActive })
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId);
}
```

### UI Component: Placement Status Badge

```typescript
// components/daep/shared/PlacementStatusBadge.tsx

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PlacementStatus = 'pending' | 'active' | 'met' | 'complete';

interface PlacementStatusBadgeProps {
  status: PlacementStatus;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<PlacementStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-[rgb(var(--daep-warning))]/10 text-[rgb(var(--daep-warning))] border-[rgb(var(--daep-warning))]/20',
  },
  active: {
    label: 'Active',
    className: 'bg-[rgb(var(--daep-success))]/10 text-[rgb(var(--daep-success))] border-[rgb(var(--daep-success))]/20',
  },
  met: {
    label: 'Review Met',
    className: 'bg-[rgb(var(--daep-info))]/10 text-[rgb(var(--daep-info))] border-[rgb(var(--daep-info))]/20',
  },
  complete: {
    label: 'Complete',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

export function PlacementStatusBadge({ status, size = 'md' }: PlacementStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className, sizeClasses[size])}
    >
      {config.label}
    </Badge>
  );
}
```

### UI Component: Status Transition Actions

```typescript
// components/daep/placements/StatusTransitionActions.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { transitionPlacement, getValidTransitions } from '@/app/actions/daep/placements';
import { useToast } from '@/components/ui/use-toast';
import { Play, CheckCircle, ArrowRight, RotateCcw } from 'lucide-react';

type PlacementStatus = 'pending' | 'active' | 'met' | 'complete';

interface StatusTransitionActionsProps {
  placementId: string;
  currentStatus: PlacementStatus;
  daysRemaining: number;
  onTransition?: () => void;
}

const TRANSITION_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'secondary' | 'outline';
  requiresNotes?: boolean;
  requiresMeetingDate?: boolean;
  requiresFirstDayBack?: boolean;
}> = {
  active: {
    label: 'Start Placement',
    icon: <Play className="h-4 w-4 mr-2" />,
    variant: 'default',
  },
  met: {
    label: 'Review Met',
    icon: <ArrowRight className="h-4 w-4 mr-2" />,
    variant: 'secondary',
  },
  complete: {
    label: 'Complete Placement',
    icon: <CheckCircle className="h-4 w-4 mr-2" />,
    variant: 'default',
    requiresMeetingDate: true,
    requiresFirstDayBack: true,
  },
  // Revert from met back to active
  'active-from-met': {
    label: 'Revert to Active',
    icon: <RotateCcw className="h-4 w-4 mr-2" />,
    variant: 'outline',
    requiresNotes: true,
  },
};

export function StatusTransitionActions({
  placementId,
  currentStatus,
  daysRemaining,
  onTransition,
}: StatusTransitionActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [firstDayBack, setFirstDayBack] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validTransitions = getValidTransitions(currentStatus);

  const handleTransition = async () => {
    if (!targetStatus) return;

    setLoading(true);
    try {
      const result = await transitionPlacement({
        placement_id: placementId,
        to_status: targetStatus as PlacementStatus,
        notes: notes || undefined,
        transition_meeting_date: meetingDate || undefined,
        first_day_back_date: firstDayBack || undefined,
        transition_reason: `User initiated: ${currentStatus} → ${targetStatus}`,
      });

      if (result.success) {
        toast({
          title: 'Status Updated',
          description: `Placement transitioned to ${targetStatus}`,
        });
        setIsOpen(false);
        onTransition?.();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update placement status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (status: string) => {
    setTargetStatus(status);
    setNotes('');
    setMeetingDate('');
    setFirstDayBack('');
    setIsOpen(true);
  };

  const getConfigKey = (status: string) => {
    // Special case: revert from met to active
    if (currentStatus === 'met' && status === 'active') {
      return 'active-from-met';
    }
    return status;
  };

  const config = targetStatus ? TRANSITION_CONFIG[getConfigKey(targetStatus)] : null;

  return (
    <>
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {validTransitions.map((status) => {
          const configKey = getConfigKey(status);
          const btnConfig = TRANSITION_CONFIG[configKey];
          if (!btnConfig) return null;

          // Disable "met" if days not complete
          const disabled = status === 'met' && daysRemaining > 0;

          return (
            <Button
              key={status}
              variant={btnConfig.variant}
              size="sm"
              onClick={() => openDialog(status)}
              disabled={disabled}
              title={disabled ? `${daysRemaining} days remaining` : undefined}
            >
              {btnConfig.icon}
              {btnConfig.label}
            </Button>
          );
        })}
      </div>

      {/* Transition Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Transitioning from <strong>{currentStatus}</strong> to{' '}
              <strong>{targetStatus}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {config?.requiresMeetingDate && (
              <div className="space-y-2">
                <Label htmlFor="meetingDate">Transition Meeting Date *</Label>
                <Input
                  id="meetingDate"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                />
              </div>
            )}

            {config?.requiresFirstDayBack && (
              <div className="space-y-2">
                <Label htmlFor="firstDayBack">First Day Back at Home Campus *</Label>
                <Input
                  id="firstDayBack"
                  type="date"
                  value={firstDayBack}
                  onChange={(e) => setFirstDayBack(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes {config?.requiresNotes ? '*' : '(optional)'}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this transition..."
                rows={3}
                required={config?.requiresNotes}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransition}
              disabled={
                loading ||
                (config?.requiresNotes && !notes) ||
                (config?.requiresMeetingDate && !meetingDate) ||
                (config?.requiresFirstDayBack && !firstDayBack)
              }
            >
              {loading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## Zod Validation Schemas

```typescript
// lib/validation/schemas.ts - ADD/UPDATE

// Placement statuses - UPDATED
export const PLACEMENT_STATUSES = ['pending', 'active', 'met', 'complete'] as const;
export type PlacementStatus = typeof PLACEMENT_STATUSES[number];

// Placement transition
export const PlacementTransitionSchema = z.object({
  placement_id: z.string().uuid(),
  to_status: z.enum(PLACEMENT_STATUSES),
  transition_reason: z.string().optional(),
  notes: z.string().optional(),
  transition_meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  first_day_back_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type PlacementTransitionInput = z.infer<typeof PlacementTransitionSchema>;
```

---

## File Structure

```
lib/
├── daep/
│   └── days-remaining.ts              # Story 2-7 utilities
└── validation/
    └── schemas.ts                      # Update PLACEMENT_STATUSES, add PlacementTransitionSchema

app/actions/daep/
└── placements.ts                       # Add transition actions, auto-activate

components/daep/
├── shared/
│   ├── DaysProgressBar.tsx            # Story 2-7 (no color coding)
│   └── PlacementStatusBadge.tsx       # Story 2-6
└── placements/
    └── StatusTransitionActions.tsx     # Story 2-6
```

---

## Integration Points

### With Story 2-2 (Student Profile)
- `DaysProgressBar` displays in `CurrentPlacementCard`
- `PlacementStatusBadge` shows current status

### With Story 2-4 (Create Placement)
- `calculateExpectedEndDate()` called on placement creation
- Initial status set to `pending`

### With Attendance Recording (Epic 3)
- Call `autoActivatePlacementOnAttendance()` when recording attendance
- Triggers `pending → active` transition

### With School Calendar (Story 1-8)
- Calendar changes trigger `recalculateAllActivePlacements()`
- Weather day additions update expected end dates

### With Epic 2B (Kanban Boards)
- Kanban column position is separate from placement status
- `intake_stage` field tracks Kanban position (not implemented in 2-6/2-7)

---

## Test Strategy

### Unit Tests

| Test | Story | Assertion |
|------|-------|-----------|
| `calculateExpectedEndDate` with calendar | 2-7 | Returns correct date from calendar |
| `calculateExpectedEndDate` without calendar | 2-7 | Falls back to Mon-Fri |
| `calculateDaysInfo` | 2-7 | Returns correct days remaining, progress % |
| `formatExpectedEndDate` | 2-7 | Returns date in "MMM d, yyyy" format (e.g., "Nov 29, 2025") |
| `getValidTransitions('pending')` | 2-6 | Returns ['active', 'complete'] |
| `getValidTransitions('active')` | 2-6 | Returns ['met', 'complete'] |
| `getValidTransitions('met')` | 2-6 | Returns ['complete', 'active'] |
| `getValidTransitions('complete')` | 2-6 | Returns [] (terminal) |
| `transitionPlacement` invalid | 2-6 | Returns error with valid options |
| `transitionPlacement` valid | 2-6 | Updates status, creates log |
| `autoActivatePlacementOnAttendance` present | 2-6 | Transitions pending → active |
| `autoActivatePlacementOnAttendance` absent | 2-6 | Does nothing |

### Integration Tests

| Test | Story | Steps |
|------|-------|-------|
| Placement lifecycle flow | 2-6 | Create → Attend → Met → Complete |
| Days progress updates | 2-7 | Create placement → Verify progress bar |
| Calendar recalculation | 2-7 | Add weather day → Verify dates update |
| TT sync on complete | 2-6 | Complete placement → Verify is_daep = false |

---

## Non-Functional Requirements

### Performance
- **Batch recalculation target:** Complete within 30s for 500 active placements
- **Single calculation:** < 100ms response time
- **Query optimization:** Index on calendar table (see Migration section)

### Security
- All tables use RLS with `tenant_id = get_my_tenant_id()`
- Role checks include `super_admin` (see `bug-room-creation-rls-policies.md` for role rename lessons)
- Verify RLS policies after any role changes:
  ```sql
  SELECT tablename, policyname FROM pg_policies
  WHERE qual LIKE '%<role_name>%' OR with_check LIKE '%<role_name>%';
  ```

### Reliability
- Fallback to Mon-Fri when no school calendar exists
- Graceful handling of insufficient calendar days
- Audit trail for all status transitions

### Observability
- Console warnings for calendar fallback scenarios
- Audit log entries for all placement changes
- Use Supabase MCP to verify actual database state during debugging

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| No school calendar exists | Medium | Medium | Fallback to Mon-Fri with warning |
| Large batch recalculation slow | Low | Low | Background job with progress indicator; 500 placement target |
| Status transition race condition | Low | Medium | Optimistic locking on status field |
| Missing transition log | Low | High | Database trigger as backup |

---

## Dependencies

### Story 2-7 requires:
- `daep_school_calendar` table (Story 1-8) - exists
- `daep_bell_schedules` table (Story 1-6) - exists

### Story 2-6 requires:
- Story 2-7 utilities (days calculation)
- `daep_placement_transitions` table (create if missing)

### Out of Scope (Epic 2B)
- Intake Pipeline Kanban board
- `intake_stage` field
- Drag-and-drop workflow
- No-show column handling

---

## Migration: Placement Transitions Table

```sql
-- Required for Story 2-6 audit trail
CREATE TABLE IF NOT EXISTS daep_placement_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  transition_reason TEXT,
  transitioned_by TEXT NOT NULL,
  transitioned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_daep_transitions_placement ON daep_placement_transitions(placement_id);
CREATE INDEX idx_daep_transitions_tenant ON daep_placement_transitions(tenant_id);

ALTER TABLE daep_placement_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their tenant's transitions"
  ON daep_placement_transitions
  FOR ALL
  USING (tenant_id = get_my_tenant_id());

-- Story 2-7: Optimize school calendar queries for days calculation
CREATE INDEX IF NOT EXISTS idx_daep_school_calendar_days_lookup
  ON daep_school_calendar(tenant_id, school_year, is_school_day, date)
  WHERE is_school_day = true;
```

---

*Tech Spec validated by Bob (SM Agent) + Alan (Product Owner)*
*Date: 2025-11-29*
*Re-validated: 2025-11-29 (NFR section added, date format confirmed as "MMM d, yyyy", calendar index added)*
