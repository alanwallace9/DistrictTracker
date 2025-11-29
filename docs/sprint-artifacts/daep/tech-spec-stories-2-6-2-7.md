# Technical Specification: Stories 2-6, 2-7

**Date:** 2025-11-28
**Author:** Bob (SM Agent)
**Epic:** 2 - Placement Management
**Status:** Draft - NEEDS REVISION

---

## ⚠️ CORRECTIONS FROM DEV REVIEW (2025-11-28)

**Reviewer:** Amelia (Dev Agent) + Alan (Product Owner)

### Critical Corrections Required

#### 1. Story 2-6: Auto-Start NOT Manual Button
- **Tech spec says:** Manual "Start Placement" button to transition pending → active
- **Correct behavior:** Placement auto-transitions to `active` when **first attendance is recorded**
- **Impact:** Remove "Start Placement" button logic, add attendance trigger

#### 2. Story 2-6: Button Set Revised
| Button | When Available | Action |
|--------|----------------|--------|
| Edit | Always | Modify placement details |
| Review Met | Days complete (days_remaining = 0) | Mark ready for transition meeting |
| Complete | After transition meeting | Finalize placement with meeting date + first day back |
| Cancel | Admin only | Requires notes |

**Removed:** "Start Placement" button (auto-triggers on attendance)

#### 3. Story 2-7: Color Logic INVERTED
- **Tech spec says:** < 5 days = red (danger)
- **Correct behavior:** < 5 days = GREEN (almost done, good!)
- **Color should indicate:** At-risk of NOT completing on time (attendance issues, falling behind)
- **NOT:** Simple countdown where low = bad

#### 4. Missing: Intake Pipeline (Separate Story Needed)
UX mockup shows Kanban-style intake workflow:
- Columns: Approved → Scheduled → Arrived Today → No-Show
- Drag students through stages
- "Needs Scheduling", "Today", "Processing", "Reschedule" badges
- **This is NOT in current tech spec - needs separate story**

### Already Implemented (Verified via Screenshots)
- Days Progress bar: "7 of 45 days (38 remaining)" ✓
- Days Remaining column in student list ✓
- Status badges (Active/green) ✓
- Expected End date display ✓
- Placement History table ✓

### Schema Fix Required
```typescript
// lib/validation/schemas.ts line 307
// ADD 'cancelled' to status enum
export const PLACEMENT_STATUSES = ['pending', 'active', 'transition', 'complete', 'cancelled'] as const;
```

### Migration Required
- `daep_placement_transitions` table needs to be created before Story 2-6

---

> ⚠️ **Theme Requirement:** All UI components must follow the [Theme & Styling Guidelines](./tech-spec-epic-2-part1.md#theme--styling-guidelines). Never hardcode colors.

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
- Story 2-6 uses days remaining for transition eligibility checks

---

## UX Design Reference

Per `docs/sessions/ux-design-specification.md`:

### Color Coding (Days Remaining)
| Days Remaining | Color | CSS Variable |
|----------------|-------|--------------|
| > 10 days | Green | `--daep-success` (`#10B981`) |
| 5-10 days | Yellow/Warning | `--daep-warning` (`#F59E0B`) |
| < 5 days | Red | `--daep-danger` (`#EF4444`) |

### Status Badge Colors
| Status | Color | Meaning |
|--------|-------|---------|
| Pending | Yellow | Awaiting intake |
| Active | Green | Currently at DAEP |
| Transition | Blue | Ready to return |
| Complete | Gray | Placement closed |
| Cancelled | Red | Administratively cancelled |

### Component Patterns
- Cards: Shadcn Card with `p-4` or `p-6` padding
- Badges: Shadcn Badge with theme-aware variants
- Progress bars: Tailwind with theme primary color
- Touch targets: Minimum 44x44px for iPad use

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
| 2.7.6 | Display days remaining badge with color coding | Green >10, Yellow 5-10, Red <5 |
| 2.7.7 | Show expected end date on placement cards | Date formatted as "MMM d, yyyy" |

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
 * Calculate days served based on attendance records.
 * Counts school days between start_date and today where student was present.
 */
export async function calculateDaysServed(
  tenantId: string,
  placementId: string,
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
 */
export async function calculateDaysInfo(
  tenantId: string,
  placementId: string,
  startDate: string,
  daysAssigned: number,
  daysServed: number
): Promise<{
  days_remaining: number;
  expected_end_date: string;
  is_complete: boolean;
  progress_percent: number;
  color: 'success' | 'warning' | 'danger';
}> {
  const daysRemaining = Math.max(0, daysAssigned - daysServed);
  const isComplete = daysRemaining === 0;
  const progressPercent = Math.round((daysServed / daysAssigned) * 100);

  // Calculate expected end date from current position
  const today = format(new Date(), 'yyyy-MM-dd');
  const expectedEndDate = await calculateExpectedEndDate(tenantId, today, daysRemaining);

  // Color coding per UX spec
  let color: 'success' | 'warning' | 'danger';
  if (daysRemaining > 10) {
    color = 'success';
  } else if (daysRemaining >= 5) {
    color = 'warning';
  } else {
    color = 'danger';
  }

  return {
    days_remaining: daysRemaining,
    expected_end_date: expectedEndDate,
    is_complete: isComplete,
    progress_percent: progressPercent,
    color,
  };
}

/**
 * Get current period based on bell schedule and current time.
 */
export async function getCurrentPeriod(
  tenantId: string
): Promise<{ period: string; schedule_name: string } | null> {
  const supabase = await createServerClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const now = format(new Date(), 'HH:mm');

  // Get today's bell schedule from calendar
  const { data: calendarDay } = await supabase
    .from('daep_school_calendar')
    .select('bell_schedule_id')
    .eq('tenant_id', tenantId)
    .eq('date', today)
    .single();

  let scheduleId = calendarDay?.bell_schedule_id;

  // Fall back to default schedule
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

  // Get schedule periods
  const { data: schedule } = await supabase
    .from('daep_bell_schedules')
    .select('schedule_name, periods')
    .eq('id', scheduleId)
    .single();

  if (!schedule) return null;

  // Find current period
  const periods = schedule.periods as Array<{
    period: string;
    start_time: string;
    end_time: string;
  }>;

  for (const p of periods) {
    if (now >= p.start_time && now <= p.end_time) {
      return {
        period: p.period,
        schedule_name: schedule.schedule_name,
      };
    }
  }

  return null; // Outside school hours
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
    placementId,
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

  // Get all active placements
  const { data: placements } = await supabase
    .from('daep_placements')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'active', 'transition']);

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

### UI Component: Days Remaining Badge

```typescript
// components/daep/shared/DaysRemainingBadge.tsx

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DaysRemainingBadgeProps {
  daysRemaining: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const COLOR_MAP = {
  success: 'bg-[rgb(var(--daep-success))]/10 text-[rgb(var(--daep-success))] border-[rgb(var(--daep-success))]/20',
  warning: 'bg-[rgb(var(--daep-warning))]/10 text-[rgb(var(--daep-warning))] border-[rgb(var(--daep-warning))]/20',
  danger: 'bg-[rgb(var(--daep-danger))]/10 text-[rgb(var(--daep-danger))] border-[rgb(var(--daep-danger))]/20',
};

export function DaysRemainingBadge({
  daysRemaining,
  showLabel = true,
  size = 'md',
}: DaysRemainingBadgeProps) {
  // Determine color based on days remaining
  let color: 'success' | 'warning' | 'danger';
  if (daysRemaining > 10) {
    color = 'success';
  } else if (daysRemaining >= 5) {
    color = 'warning';
  } else {
    color = 'danger';
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-semibold',
        COLOR_MAP[color],
        sizeClasses[size]
      )}
    >
      {daysRemaining} {showLabel && (daysRemaining === 1 ? 'day' : 'days')}
    </Badge>
  );
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

  // Color based on remaining
  let barColor: string;
  if (daysRemaining > 10) {
    barColor = 'bg-[rgb(var(--daep-success))]';
  } else if (daysRemaining >= 5) {
    barColor = 'bg-[rgb(var(--daep-warning))]';
  } else {
    barColor = 'bg-[rgb(var(--daep-danger))]';
  }

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
          className={cn('h-full transition-all duration-300', barColor)}
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

Implement the placement state machine that tracks student progress through DAEP: Pending → Active → Transition → Complete.

### State Machine Diagram

```
┌─────────────┐    intake     ┌─────────────┐    requirements    ┌─────────────┐    meeting +    ┌─────────────┐
│   PENDING   │───────────────│   ACTIVE    │────────────────────│ TRANSITION  │────first day────│  COMPLETE   │
│ (approved)  │               │ (at DAEP)   │       met          │ (returning) │     back        │  (closed)   │
└─────────────┘               └─────────────┘                    └─────────────┘                 └─────────────┘
       │                             │                                  │                              │
       │                             │                                  │                              │
       │                        ┌────┴────┐                             │                              │
       │                        │  mark   │                             │                              │
       │                        │ no-show │                             │                              │
       │                        └────┬────┘                             │                              │
       │                             │                                  │                              │
       └────────────────────────────┼──────────────────────────────────┼──────────────────────────────┘
           appeal granted           │    early termination              │    revert (meeting failed)
                                    ▼                                   │
                            ┌─────────────┐                             │
                            │ CANCELLED   │◄────────────────────────────┘
                            │ (terminated)│     administrative cancel
                            └─────────────┘
```

### Valid Transitions

| From | To | Trigger | Validation |
|------|----|---------|------------|
| pending | active | Intake processed | Room assigned |
| pending | complete | Appeal granted | Notes required |
| pending | cancelled | Administrative | Notes required |
| active | transition | Days complete OR manual | days_remaining <= 0 OR admin override |
| active | cancelled | Early termination | Notes required |
| transition | complete | Meeting + first day confirmed | Both dates required |
| transition | active | Meeting failed, return to DAEP | Notes required |
| transition | cancelled | Administrative | Notes required |

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.6.1 | Placement states: Pending, Active, Transition, Complete, Cancelled | All 5 states exist |
| 2.6.2 | Visual state indicator on placement card | Status badge with correct color |
| 2.6.3 | State transition buttons based on current state | Only valid transitions shown |
| 2.6.4 | Pending → Active: "Start Placement" sets intake_date | Status changes, date recorded |
| 2.6.5 | Active → Transition: "Ready for Transition" (days met) | Transition date recorded |
| 2.6.6 | Transition → Complete: Requires meeting + first day back | Both fields validated |
| 2.6.7 | All transitions logged to `daep_placement_transitions` | Audit trail complete |
| 2.6.8 | Invalid transitions rejected with error | Error message shows valid options |
| 2.6.9 | TrespassTracker sync on completion | is_daep flag updated |

### Server Actions

```typescript
// app/actions/daep/placements.ts - ADD

import { PlacementTransitionSchema, type PlacementTransitionInput } from '@/lib/validation/schemas';

/**
 * Valid state transitions map
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'complete', 'cancelled'],
  active: ['transition', 'cancelled'],
  transition: ['complete', 'active', 'cancelled'],
  complete: [], // Terminal state
  cancelled: [], // Terminal state
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
      updateData.intake_date = new Date().toISOString().split('T')[0];
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
      updateData.transition_complete = true;
      break;

    case 'cancelled':
      updateData.actual_end_date = new Date().toISOString().split('T')[0];
      updateData.completion_notes = input.notes || 'Placement cancelled';
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

  // Sync TrespassTracker on completion/cancellation
  if (input.to_status === 'complete' || input.to_status === 'cancelled') {
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
 * Sync TrespassTracker is_daep flag after placement changes
 */
async function syncTrespassTrackerStatus(
  tenantId: string,
  schoolId: string
): Promise<void> {
  const supabase = await createServerClient();

  // Check if student has any active placements
  const { data: activePlacements, count } = await supabase
    .from('daep_placements')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .in('status', ['pending', 'active', 'transition']);

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

type PlacementStatus = 'pending' | 'active' | 'transition' | 'complete' | 'cancelled';

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
  transition: {
    label: 'Transition',
    className: 'bg-[rgb(var(--daep-info))]/10 text-[rgb(var(--daep-info))] border-[rgb(var(--daep-info))]/20',
  },
  complete: {
    label: 'Complete',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-[rgb(var(--daep-danger))]/10 text-[rgb(var(--daep-danger))] border-[rgb(var(--daep-danger))]/20',
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
import { Play, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

type PlacementStatus = 'pending' | 'active' | 'transition' | 'complete' | 'cancelled';

interface StatusTransitionActionsProps {
  placementId: string;
  currentStatus: PlacementStatus;
  daysRemaining: number;
  onTransition?: () => void;
}

const TRANSITION_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'secondary' | 'destructive';
  requiresNotes?: boolean;
  requiresMeetingDate?: boolean;
  requiresFirstDayBack?: boolean;
}> = {
  active: {
    label: 'Start Placement',
    icon: <Play className="h-4 w-4 mr-2" />,
    variant: 'default',
  },
  transition: {
    label: 'Ready for Transition',
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
  cancelled: {
    label: 'Cancel Placement',
    icon: <XCircle className="h-4 w-4 mr-2" />,
    variant: 'destructive',
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

  const config = targetStatus ? TRANSITION_CONFIG[targetStatus] : null;

  return (
    <>
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {validTransitions.map((status) => {
          const btnConfig = TRANSITION_CONFIG[status];
          if (!btnConfig) return null;

          // Disable "transition" if days not complete (unless admin override)
          const disabled = status === 'transition' && daysRemaining > 0;

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
                Notes {config?.requiresNotes && '*'}
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
              disabled={loading || (config?.requiresNotes && !notes)}
              variant={config?.variant || 'default'}
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
// lib/validation/schemas.ts - ADD

// Placement transition
export const PlacementTransitionSchema = z.object({
  placement_id: z.string().uuid(),
  to_status: z.enum(['pending', 'active', 'transition', 'complete', 'cancelled']),
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
    └── schemas.ts                      # Add PlacementTransitionSchema

app/actions/daep/
└── placements.ts                       # Add transition actions

components/daep/
├── shared/
│   ├── DaysRemainingBadge.tsx         # Story 2-7
│   ├── DaysProgressBar.tsx            # Story 2-7
│   └── PlacementStatusBadge.tsx       # Story 2-6
└── placements/
    └── StatusTransitionActions.tsx     # Story 2-6
```

---

## Integration Points

### With Story 2-2 (Student Profile)
- `DaysRemainingBadge` displays in `CurrentPlacementCard`
- `DaysProgressBar` shows placement progress
- `PlacementStatusBadge` shows current status

### With Story 2-4 (Create Placement)
- `calculateExpectedEndDate()` called on placement creation
- Initial status set to `pending`

### With Story 2-8 (Edit Placement)
- Days recalculated when `days_assigned` changes
- Status can be changed via transition actions

### With School Calendar (Story 1-8)
- Calendar changes trigger `recalculateAllActivePlacements()`
- Weather day additions update expected end dates

---

## Test Strategy

### Unit Tests

| Test | Story | Assertion |
|------|-------|-----------|
| `calculateExpectedEndDate` with calendar | 2-7 | Returns correct date from calendar |
| `calculateExpectedEndDate` without calendar | 2-7 | Falls back to Mon-Fri |
| `calculateDaysInfo` color coding | 2-7 | Returns correct color by threshold |
| `getValidTransitions('pending')` | 2-6 | Returns ['active', 'complete', 'cancelled'] |
| `getValidTransitions('complete')` | 2-6 | Returns [] (terminal) |
| `transitionPlacement` invalid | 2-6 | Returns error with valid options |
| `transitionPlacement` valid | 2-6 | Updates status, creates log |

### Integration Tests

| Test | Story | Steps |
|------|-------|-------|
| Placement lifecycle flow | 2-6 | Create → Start → Transition → Complete |
| Days badge updates | 2-7 | Create placement → Verify badge color |
| Calendar recalculation | 2-7 | Add weather day → Verify dates update |
| TT sync on complete | 2-6 | Complete placement → Verify is_daep = false |

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| No school calendar exists | Medium | Medium | Fallback to Mon-Fri with warning |
| Large batch recalculation slow | Low | Low | Background job with progress indicator |
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

### Migration: Placement Transitions Table

```sql
-- If not already created in Epic 2 Part 1 migration
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
```

---

*Tech Spec generated by Bob (SM Agent)*
*Date: 2025-11-28*
