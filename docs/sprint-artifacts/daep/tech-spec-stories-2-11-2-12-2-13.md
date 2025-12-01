# Technical Specification: Stories 2-11, 2-12, 2-13

**Date:** 2025-11-28
**Author:** Bob (SM Agent)
**Epic:** 2 - Placement Management
**Status:** Draft

> **Theme Requirement:** All UI components must follow the [Theme & Styling Guidelines](./0-x-theme-foundation.md). Never hardcode colors.

---

## Overview

This document provides technical specifications for three related Epic 2 stories that handle edge cases and system synchronization:

| Story | Name | Points | FRs |
|-------|------|--------|-----|
| 2-11 | Rollover Student Handling | 2 | FR25 |
| 2-12 | No-Show Student Tracking | 2 | FR26 |
| 2-13 | TrespassTracker Sync | 2 | FR74, FR77 |

**Total Points:** 6

**Recommended Implementation Order:** 2-13 → 2-12 → 2-11

- Story 2-13 creates sync utility used by other stories
- Story 2-12 adds no-show/early termination handling
- Story 2-11 adds end-of-year rollover workflow

---

## Story 2-11: Rollover Student Handling

### Goal

Identify students who will not complete their DAEP placement before the end of the current school year, generate rollover reports grouped by home campus, and capture decisions from home campus administrators about whether each student should continue at DAEP or return to their home campus for the following school year.

### Scope

**In-Scope:**
- Rollover candidate identification (days_remaining > school_days_left)
- Rollover report generation grouped by home campus
- DAEP admin view: district-wide report with campus filtering
- Home campus admin view: campus-specific report (their students only)
- Decision capture: "Continue at DAEP" or "Return to Home Campus"
- Decision history log (track all decisions, not just latest)
- Review eligibility calculation displayed with each candidate
- Incident number link for admin context
- Pending rollover placement creation (for "Continue at DAEP" decisions)
- DAEP admin approval queue before batch rollover processing
- Guard check for school calendar existence
- Pagination on all report views

**Out-of-Scope:**
- Notification delivery to home campus (Epic 7)
- Email generation (Epic 7)
- Batch rollover processing (separate admin action, may be Epic 7 or manual)
- Automatic activation of rollover placements (happens on first attendance day)
- Intake process for rollover students (not required)

### Rollover Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROLLOVER PROCESS TIMELINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MAY (Last Week of School)                                                  │
│  ├─ System identifies rollover candidates (shortfall > 0)                   │
│  ├─ Reports generated per home campus                                       │
│  ├─ Home campus admins make decisions while students still at DAEP          │
│  └─ Decisions communicated to parents for planning                          │
│                                                                             │
│  JUNE - JULY                                                                │
│  ├─ Decisions can still be updated                                          │
│  ├─ DAEP admin reviews approval queue                                       │
│  └─ Pending rollover placements created for "Continue at DAEP" students     │
│                                                                             │
│  AUGUST (Before School Starts)                                              │
│  ├─ Final decision updates possible through mid-August                      │
│  ├─ Batch rollover processing finalizes placements                          │
│  └─ Rollover placements go "active" when student attends first day          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Decision Options

| Decision | Label | What Happens |
|----------|-------|--------------|
| `continue_daep` | "Continue at DAEP" | Student finishes current year. New rollover placement created for next year with remaining days. Does NOT count as new placement for recidivism. Review eligibility carries over. |
| `return_home` | "Return to Home Campus" | Student finishes remaining days THIS year at DAEP, then starts fresh at home campus next year. Placement marked complete after days served. |

**Rollover Placement Identity:**
- Rollover placements receive a **NEW `incident_number`** (distinct from original)
- The `is_rollover_placement = true` flag excludes them from recidivism counts
- `original_placement_id` links back to the original placement for audit/history
- Reporting queries filter: `WHERE is_rollover_placement = false` for recidivism metrics

**Review Eligibility Example:**
- Original: 40-day placement with review at 30 days
- Days remaining at EOY: 13 days
- Review eligibility next year: Day 3 (30 - 17 days already served = 13 remaining, review at 30 means 3 more days)

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.11.1 | Report shows students with shortfall > 0 (days_remaining > school_days_left) | Only candidates with shortfall displayed |
| 2.11.2 | Decision options: "Continue at DAEP" or "Return to Home Campus" | Both options available per student |
| 2.11.3 | Decision captured with timestamp, user, and campus | Decision logged to history table |
| 2.11.4 | Decision history preserved (not overwritten) | Multiple decisions visible in log |
| 2.11.5 | Notes field for rollover decisions | Notes saved with each decision |
| 2.11.6 | Dashboard indicator for pending rollover decisions | KPI card shows count |
| 2.11.7 | DAEP admin sees district-wide report with campus filter | Filterable/sortable view |
| 2.11.8 | Home campus admin sees only their students | Campus-scoped report |
| 2.11.9 | Review eligibility displayed per candidate | Days until review shown |
| 2.11.10 | Incident number displayed for context | Clickable link to placement |
| 2.11.11 | Guard warns if school calendar not configured | Error message if no calendar |
| 2.11.12 | "Continue at DAEP" creates pending rollover placement | New placement in pending status |
| 2.11.13 | DAEP admin approval queue for rollover placements | Audit list before batch processing |

### Risks & Assumptions

| Type | Item | Mitigation |
|------|------|------------|
| **Assumption** | School calendar for current year exists | Guard check with user warning if missing |
| **Assumption** | School calendar for next year loaded before July rollover | Document as prerequisite; warn if missing |
| **Assumption** | Home campus admin has access to their students only | Enforced by restrictive RLS policies |
| **Risk** | Two admins make conflicting decisions | Decision history log captures all; DAEP admin can see conflicts and follow up |
| **Risk** | Decision made after batch rollover processed | Allow updates through mid-August; manual correction if needed |
| **Risk** | Review eligibility calculation complex with multiple placements | Calculate based on original placement terms; carry over remaining review days |
| **Question** | What if student has multiple active placements? | Use primary/most recent placement for rollover; edge case - manual review |

### Data Model

#### New Table: `daep_rollover_decisions`

Tracks decision history for rollover candidates. Multiple decisions per placement allowed.

```sql
CREATE TABLE daep_rollover_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  placement_id UUID NOT NULL REFERENCES daep_placements(id),
  student_id UUID NOT NULL,  -- For display: student name, ID number
  school_id TEXT NOT NULL,   -- Incident number link
  home_campus_id UUID NOT NULL REFERENCES campuses(tenant_id, id),

  -- Decision
  decision TEXT NOT NULL CHECK (decision IN ('continue_daep', 'return_home')),
  days_remaining INTEGER NOT NULL,
  review_eligible_day INTEGER,  -- Days until review eligibility in next year

  -- Audit
  decided_by UUID NOT NULL REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: Restrictive policy
ALTER TABLE daep_rollover_decisions ENABLE ROW LEVEL SECURITY;

-- Home campus admin sees their campus decisions only
CREATE POLICY "home_campus_admin_view" ON daep_rollover_decisions
  FOR SELECT USING (
    home_campus_id IN (
      SELECT campus_id FROM user_campus_assignments
      WHERE user_id = auth.uid() AND tenant_id = daep_rollover_decisions.tenant_id
    )
  );

-- DAEP admin sees all decisions in tenant
CREATE POLICY "daep_admin_view" ON daep_rollover_decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tenant_id = daep_rollover_decisions.tenant_id
      AND role IN ('daep_admin', 'district_admin', 'super_admin')
    )
  );

-- Insert policy for authorized users
CREATE POLICY "authorized_insert" ON daep_rollover_decisions
  FOR INSERT WITH CHECK (
    -- Home campus admin for their campus OR DAEP/district admin
    home_campus_id IN (
      SELECT campus_id FROM user_campus_assignments
      WHERE user_id = auth.uid() AND tenant_id = daep_rollover_decisions.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND tenant_id = daep_rollover_decisions.tenant_id
      AND role IN ('daep_admin', 'district_admin', 'super_admin')
    )
  );

-- Index for performance
CREATE INDEX idx_rollover_decisions_placement ON daep_rollover_decisions(placement_id);
CREATE INDEX idx_rollover_decisions_campus ON daep_rollover_decisions(home_campus_id);
CREATE INDEX idx_rollover_decisions_tenant ON daep_rollover_decisions(tenant_id);
```

#### Updates to `daep_placements`

```sql
-- Add rollover-related fields
ALTER TABLE daep_placements ADD COLUMN IF NOT EXISTS is_rollover_candidate BOOLEAN DEFAULT FALSE;
ALTER TABLE daep_placements ADD COLUMN IF NOT EXISTS rollover_decision TEXT CHECK (rollover_decision IN ('continue_daep', 'return_home', NULL));
ALTER TABLE daep_placements ADD COLUMN IF NOT EXISTS is_rollover_placement BOOLEAN DEFAULT FALSE;  -- For next-year placements; excludes from recidivism counts
ALTER TABLE daep_placements ADD COLUMN IF NOT EXISTS original_placement_id UUID REFERENCES daep_placements(id);  -- Links rollover to original placement
```

#### Data Model Diagram

```
┌─────────────────────────┐         ┌─────────────────────────┐
│    daep_placements      │         │ daep_rollover_decisions │
├─────────────────────────┤         ├─────────────────────────┤
│ id ─────────────────────┼────────►│ placement_id            │
│ tenant_id               │         │ tenant_id               │
│ school_id (incident#) ──┼────────►│ school_id               │
│ days_assigned           │         │ student_id              │
│ days_served             │         │ home_campus_id          │
│ days_remaining          │         │ decision                │
│ review_at_days          │         │ days_remaining          │
│ is_rollover_candidate ◄─┼─────────│ review_eligible_day     │
│ rollover_decision ◄─────┼─────────│ decided_by              │
│ is_rollover_placement   │         │ decided_at              │
│ original_placement_id     │         │ notes                   │
└─────────────────────────┘         └─────────────────────────┘
         │                                     │
         │ (if continue_daep)                  │
         ▼                                     │
┌─────────────────────────┐                    │
│ NEW rollover placement  │                    │
├─────────────────────────┤                    │
│ is_rollover_placement=T │                    │
│ original_placement_id ────┼────────────────────┘
│ status = 'pending'      │
│ days_assigned = remaining│
│ school_year = next      │
└─────────────────────────┘
```

### Server Actions

```typescript
// app/actions/daep/placements.ts - ADD

export interface RolloverCandidate {
  placement_id: string;
  school_id: string;         // Incident number
  student_id: string;
  student_name: string;
  student_number: string;    // SIS ID for display
  days_assigned: number;
  days_served: number;
  days_remaining: number;
  school_days_left: number;
  shortfall: number;         // days_remaining - school_days_left
  home_campus_id: string;
  home_campus_name: string;
  start_date: string;
  review_at_days: number | null;
  review_eligible_day: number | null;  // Days until review in next year
  current_decision: 'continue_daep' | 'return_home' | null;
  decision_count: number;    // How many decisions made (for conflict detection)
}

/**
 * Check if school calendar exists for current year
 * Guard function to warn users if calendar not configured
 */
export async function checkSchoolCalendarExists(): Promise<{
  exists: boolean;
  schoolYear: string;
  daysRemaining: number;
}> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const today = new Date();
  const schoolYear = today.getMonth() >= 7
    ? `${today.getFullYear()}-${today.getFullYear() + 1}`
    : `${today.getFullYear() - 1}-${today.getFullYear()}`;

  const { count } = await supabase
    .from('daep_school_calendar')
    .select('date', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('school_year', schoolYear)
    .eq('is_school_day', true)
    .gte('date', today.toISOString().split('T')[0]);

  return {
    exists: (count || 0) > 0,
    schoolYear,
    daysRemaining: count || 0,
  };
}

/**
 * Get rollover candidates with full details
 * Groups by home campus for report generation
 * @param campusFilter - Optional campus ID for home campus admin view
 */
export async function getRolloverCandidates(
  campusFilter?: string
): Promise<{ candidates: RolloverCandidate[]; calendarWarning: boolean }> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Check calendar first
  const calendarCheck = await checkSchoolCalendarExists();
  if (!calendarCheck.exists) {
    return { candidates: [], calendarWarning: true };
  }

  const remainingDays = calendarCheck.daysRemaining;

  // Build query
  let query = supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      days_assigned,
      days_served,
      days_remaining,
      start_date,
      review_at_days,
      is_rollover_candidate,
      rollover_decision,
      home_campus_id,
      home_campus:campuses!fk_daep_placements_home_campus(id, name),
      student:trespass_records!inner(id, first_name, last_name, student_number)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .gt('days_remaining', remainingDays);

  // Apply campus filter for home campus admin view
  if (campusFilter) {
    query = query.eq('home_campus_id', campusFilter);
  }

  const { data: placements, error } = await query;

  if (error || !placements) return { candidates: [], calendarWarning: false };

  // Get decision counts for conflict detection
  const placementIds = placements.map(p => p.id);
  const { data: decisionCounts } = await supabase
    .from('daep_rollover_decisions')
    .select('placement_id')
    .in('placement_id', placementIds);

  const countMap = new Map<string, number>();
  decisionCounts?.forEach(d => {
    countMap.set(d.placement_id, (countMap.get(d.placement_id) || 0) + 1);
  });

  const candidates = placements.map(p => {
    const daysServed = p.days_served || 0;
    const reviewAtDays = p.review_at_days;
    // Calculate review eligibility for next year
    // If review_at_days = 30 and days_served = 17, then review_eligible_day = 30 - 17 = 13
    // But if they have 13 days remaining, review is at day 3 of next year (13 - 10 = 3)
    const reviewEligibleDay = reviewAtDays
      ? Math.max(0, reviewAtDays - daysServed)
      : null;

    return {
      placement_id: p.id,
      school_id: p.school_id,
      student_id: (p.student as any).id,
      student_name: `${(p.student as any).first_name} ${(p.student as any).last_name}`,
      student_number: (p.student as any).student_number || '',
      days_assigned: p.days_assigned,
      days_served: daysServed,
      days_remaining: p.days_remaining,
      school_days_left: remainingDays,
      shortfall: p.days_remaining - remainingDays,
      home_campus_id: p.home_campus_id,
      home_campus_name: (p.home_campus as any)?.name || 'Unknown',
      start_date: p.start_date,
      review_at_days: reviewAtDays,
      review_eligible_day: reviewEligibleDay,
      current_decision: p.rollover_decision as 'continue_daep' | 'return_home' | null,
      decision_count: countMap.get(p.id) || 0,
    };
  });

  return { candidates, calendarWarning: false };
}

export interface RolloverDecisionInput {
  placement_id: string;
  decision: 'continue_daep' | 'return_home';
  notes?: string;
}

/**
 * Record rollover decision for a placement
 * Creates entry in decision history table (doesn't overwrite)
 * If 'continue_daep', creates pending rollover placement for next year
 */
export async function recordRolloverDecision(
  input: RolloverDecisionInput
): Promise<{ success: boolean; error?: string; rollover_placement_id?: string }> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();
  const profile = await getProfile();

  // Get placement with full details
  const { data: placement, error: fetchError } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      days_assigned,
      days_served,
      days_remaining,
      review_at_days,
      home_campus_id,
      student:trespass_records!inner(id, first_name, last_name)
    `)
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !placement) {
    return { success: false, error: 'Placement not found' };
  }

  // Calculate review eligibility
  const daysServed = placement.days_served || 0;
  const reviewEligibleDay = placement.review_at_days
    ? Math.max(0, placement.review_at_days - daysServed)
    : null;

  // Insert into decision history (never overwrites)
  const { error: insertError } = await supabase
    .from('daep_rollover_decisions')
    .insert({
      tenant_id: tenantId,
      placement_id: input.placement_id,
      student_id: (placement.student as any).id,
      school_id: placement.school_id,
      home_campus_id: placement.home_campus_id,
      decision: input.decision,
      days_remaining: placement.days_remaining,
      review_eligible_day: reviewEligibleDay,
      decided_by: user.id,
      notes: input.notes,
    });

  if (insertError) {
    return { success: false, error: 'Failed to record decision' };
  }

  // Update placement with current decision
  await supabase
    .from('daep_placements')
    .update({
      is_rollover_candidate: true,
      rollover_decision: input.decision,
    })
    .eq('id', input.placement_id);

  let rolloverPlacementId: string | undefined;

  // If continue_daep, create pending rollover placement for next year
  if (input.decision === 'continue_daep') {
    const nextSchoolYear = getNextSchoolYear();

    const { data: newPlacement, error: createError } = await supabase
      .from('daep_placements')
      .insert({
        tenant_id: tenantId,
        school_id: placement.school_id,
        home_campus_id: placement.home_campus_id,
        days_assigned: placement.days_remaining,
        days_served: 0,
        days_remaining: placement.days_remaining,
        review_at_days: reviewEligibleDay,  // Carry over remaining review days
        status: 'pending',
        school_year: nextSchoolYear,
        is_rollover_placement: true,
        original_placement_id: input.placement_id,
      })
      .select('id')
      .single();

    if (!createError && newPlacement) {
      rolloverPlacementId = newPlacement.id;
    }
  }

  // Audit log
  const studentName = `${(placement.student as any).first_name} ${(placement.student as any).last_name}`;
  await logAuditEvent({
    eventType: 'placement.rollover_decision',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: `Recorded rollover decision: ${input.decision} for ${studentName}`,
    recordSubjectName: studentName,
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      decision: input.decision,
      days_remaining: placement.days_remaining,
      review_eligible_day: reviewEligibleDay,
      notes: input.notes,
      rollover_placement_id: rolloverPlacementId,
      decided_by_name: profile?.full_name,
    },
  });

  revalidatePath('/daep/reports/rollover');
  revalidatePath('/daep/students');

  return { success: true, rollover_placement_id: rolloverPlacementId };
}

/**
 * Get decision history for a placement (for conflict review)
 */
export async function getRolloverDecisionHistory(
  placementId: string
): Promise<Array<{
  decision: string;
  decided_by_name: string;
  decided_at: string;
  notes: string | null;
}>> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_rollover_decisions')
    .select(`
      decision,
      decided_at,
      notes,
      decided_by_user:profiles!decided_by(full_name, email)
    `)
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .order('decided_at', { ascending: false });

  if (error || !data) return [];

  return data.map(d => ({
    decision: d.decision,
    decided_by_name: (d.decided_by_user as any)?.full_name || (d.decided_by_user as any)?.email || 'Unknown',
    decided_at: d.decided_at,
    notes: d.notes,
  }));
}

/**
 * Get pending rollover placements for DAEP admin approval queue
 */
export async function getPendingRolloverPlacements(): Promise<Array<{
  id: string;
  student_name: string;
  days_remaining: number;
  home_campus: string;
  original_placement_id: string;
  created_at: string;
}>> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_placements')
    .select(`
      id,
      days_remaining,
      original_placement_id,
      created_at,
      home_campus:campuses!fk_daep_placements_home_campus(name),
      student:trespass_records!inner(first_name, last_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_rollover_placement', true)
    .eq('status', 'pending');

  if (error || !data) return [];

  return data.map(p => ({
    id: p.id,
    student_name: `${(p.student as any).first_name} ${(p.student as any).last_name}`,
    days_remaining: p.days_remaining,
    home_campus: (p.home_campus as any)?.name || 'Unknown',
    original_placement_id: p.original_placement_id,
    created_at: p.created_at,
  }));
}

/**
 * Get count of pending rollover decisions (for dashboard)
 */
export async function getPendingRolloverCount(): Promise<number> {
  const { candidates } = await getRolloverCandidates();
  return candidates.filter(c => !c.current_decision).length;
}

/**
 * Helper: Get next school year string
 */
function getNextSchoolYear(): string {
  const today = new Date();
  const currentYear = today.getFullYear();
  // If we're in fall semester (Aug-Dec), next year is currentYear+1 to currentYear+2
  // If we're in spring semester (Jan-Jul), next year is currentYear to currentYear+1
  if (today.getMonth() >= 7) {
    return `${currentYear + 1}-${currentYear + 2}`;
  } else {
    return `${currentYear}-${currentYear + 1}`;
  }
}
```

### UI Components

#### Rollover Report Page

```typescript
// app/daep/reports/rollover/page.tsx

import { getRolloverCandidates } from '@/app/actions/daep/placements';
import { RolloverCandidatesTable } from '@/components/daep/reports/RolloverCandidatesTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default async function RolloverReportPage() {
  const candidates = await getRolloverCandidates();
  const pendingCount = candidates.filter(c => !c.rollover_decision).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rollover Students</h1>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 text-[rgb(var(--daep-warning))]">
            <AlertTriangle className="h-5 w-5" />
            <span>{pendingCount} pending decisions</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Students with days remaining exceeding school days left
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-muted-foreground">
              No students require rollover decisions at this time.
            </p>
          ) : (
            <RolloverCandidatesTable candidates={candidates} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Rollover Decision Dialog

```typescript
// components/daep/reports/RolloverDecisionDialog.tsx

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { recordRolloverDecision, type RolloverCandidate } from '@/app/actions/daep/placements';
import { useRouter } from 'next/navigation';

interface RolloverDecisionDialogProps {
  candidate: RolloverCandidate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RolloverDecisionDialog({
  candidate,
  open,
  onOpenChange,
}: RolloverDecisionDialogProps) {
  const [decision, setDecision] = useState<'continue' | 'reset'>('continue');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await recordRolloverDecision({
        placement_id: candidate.placement_id,
        decision,
        notes: notes || undefined,
      });

      if (result.success) {
        toast({ title: 'Decision recorded successfully' });
        onOpenChange(false);
        router.refresh();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to record decision', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rollover Decision</DialogTitle>
          <DialogDescription>
            {candidate.student_name} has {candidate.days_remaining} days remaining
            but only {candidate.school_days_left} school days left this year.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Shortfall info */}
          <div className="p-3 bg-[rgb(var(--daep-warning))]/10 border border-[rgb(var(--daep-warning))]/20 rounded-lg">
            <p className="text-sm font-medium text-[rgb(var(--daep-warning))]">
              Shortfall: {candidate.shortfall} days
            </p>
          </div>

          {/* Decision options */}
          <RadioGroup value={decision} onValueChange={(v) => setDecision(v as 'continue' | 'reset')}>
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <RadioGroupItem value="continue" id="continue" />
              <div className="flex-1">
                <Label htmlFor="continue" className="font-medium">
                  Continue Next Year
                </Label>
                <p className="text-sm text-muted-foreground">
                  Student will resume with {candidate.days_remaining} days remaining when school resumes.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 border rounded-lg">
              <RadioGroupItem value="reset" id="reset" />
              <div className="flex-1">
                <Label htmlFor="reset" className="font-medium">
                  Reset Days
                </Label>
                <p className="text-sm text-muted-foreground">
                  Student's remaining days will be cleared. A new placement may be created if needed.
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Decision Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for this decision..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Record Decision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### NFRs: Story 2-11

#### Performance

| Concern | Requirement | Guidance |
|---------|-------------|----------|
| Report Load | < 2 seconds | Seamless - no visible delay, flash, or spinner for typical loads |
| Pagination | Required | All report views (DAEP admin, home campus admin) must paginate |
| Default Page Size | 25 records | With options for 50, 100 |
| Large Districts | 200+ candidates | Must handle without timeout; use server-side pagination |

#### Security

| Concern | Requirement |
|---------|-------------|
| Authorization | Home campus admin, DAEP admin (level 1+), District admin |
| RLS Policy | **Restrictive** - deny by default, explicit grants |
| Campus Isolation | Home campus admin sees ONLY their campus students |
| Tenant Isolation | All queries filtered by tenant_id |
| Audit Trail | All decisions logged with user, timestamp, campus |

#### Reliability

| Concern | Requirement | Guidance |
|---------|-------------|----------|
| Calendar Guard | Warn if no calendar | Display error message, don't show empty report |
| Decision Conflicts | Log all decisions | Decision history table preserves all entries |
| Failure Notification | Super admin alerted | On critical failures (DB errors, RLS violations) |
| Data Integrity | FK constraints | Rollover placements linked to parent placement |

---

## Story 2-12: No-Show Student Tracking

### Goal

Handle students who never attend their DAEP placement (no-show) or leave before completion (early termination), tracking owed days for potential future placements.

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.12.1 | "Mark No-Show" action on pending/active placements | Button visible and functional |
| 2.12.2 | No-show sets status to complete with no_show flag | Flag set, days_remaining preserved |
| 2.12.3 | "Early Termination" action on active placements | Button visible and functional |
| 2.12.4 | Early termination captures reason | Reason required and saved |
| 2.12.5 | Days remaining tracked for future reference | days_remaining preserved in record |
| 2.12.6 | Both actions logged to audit trail | Audit entries created |
| 2.12.7 | Dashboard indicator for no-show students | Count visible on dashboard |

### Server Actions

```typescript
// app/actions/daep/placements.ts - ADD

/**
 * Mark a placement as no-show (student never attended)
 */
export async function markNoShow(
  placementId: string,
  reason?: string
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
      days_assigned,
      student:trespass_records!inner(first_name, last_name)
    `)
    .eq('id', placementId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !placement) {
    return { success: false, error: 'Placement not found' };
  }

  if (placement.status !== 'pending' && placement.status !== 'active') {
    return { success: false, error: 'Can only mark no-show for pending or active placements' };
  }

  // Update placement
  const { error: updateError } = await supabase
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

  if (updateError) {
    return { success: false, error: 'Failed to mark as no-show' };
  }

  // Create transition log
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

  // Sync TrespassTracker
  await syncTrespassTrackerExpiration(placement.school_id);

  // Audit log
  const studentName = `${(placement.student as any).first_name} ${(placement.student as any).last_name}`;
  await logAuditEvent({
    eventType: 'placement.no_show',
    module: 'daep_management',
    actorId: user.id,
    targetId: placementId,
    action: `Marked placement as no-show for ${studentName}`,
    recordSubjectName: studentName,
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      days_owed: placement.days_assigned,
      reason,
    },
  });

  revalidatePath('/daep/students');
  revalidatePath(`/daep/students/${placement.school_id}`);

  return { success: true };
}

export interface EarlyTerminationInput {
  placement_id: string;
  termination_reason: string;
  termination_date: string;
}

/**
 * Terminate placement early (student leaves before completion)
 */
export async function earlyTermination(
  input: EarlyTerminationInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Validate reason
  if (!input.termination_reason || input.termination_reason.length < 10) {
    return { success: false, error: 'Please provide a detailed termination reason (at least 10 characters)' };
  }

  // Get placement
  const { data: placement, error: fetchError } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      status,
      days_assigned,
      days_served,
      student:trespass_records!inner(first_name, last_name)
    `)
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !placement) {
    return { success: false, error: 'Placement not found' };
  }

  if (placement.status !== 'active') {
    return { success: false, error: 'Can only terminate active placements' };
  }

  const daysRemaining = placement.days_assigned - placement.days_served;

  // Update placement
  const { error: updateError } = await supabase
    .from('daep_placements')
    .update({
      status: 'complete',
      actual_end_date: input.termination_date,
      days_remaining: daysRemaining, // Track owed days
      completion_notes: `Early termination: ${input.termination_reason}`,
    })
    .eq('id', input.placement_id);

  if (updateError) {
    return { success: false, error: 'Failed to terminate placement' };
  }

  // Create transition log
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

  // Sync TrespassTracker
  await syncTrespassTrackerExpiration(placement.school_id);

  // Audit log
  const studentName = `${(placement.student as any).first_name} ${(placement.student as any).last_name}`;
  await logAuditEvent({
    eventType: 'placement.early_termination',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: `Early termination for ${studentName}`,
    recordSubjectName: studentName,
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      days_served: placement.days_served,
      days_remaining: daysRemaining,
      reason: input.termination_reason,
      termination_date: input.termination_date,
    },
  });

  revalidatePath('/daep/students');
  revalidatePath(`/daep/students/${placement.school_id}`);

  return { success: true };
}

/**
 * Get count of no-show placements for dashboard
 */
export async function getNoShowCount(): Promise<number> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { count } = await supabase
    .from('daep_placements')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('no_show', true)
    .eq('status', 'complete');

  return count || 0;
}
```

### UI Components

#### No-Show Dialog

```typescript
// components/daep/placements/NoShowDialog.tsx

'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { markNoShow } from '@/app/actions/daep/placements';
import { UserX } from 'lucide-react';

interface NoShowDialogProps {
  placementId: string;
  studentName: string;
  daysAssigned: number;
  onSuccess?: () => void;
}

export function NoShowDialog({
  placementId,
  studentName,
  daysAssigned,
  onSuccess,
}: NoShowDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const result = await markNoShow(placementId, reason || undefined);
      if (result.success) {
        toast({ title: 'Marked as no-show' });
        onSuccess?.();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark as no-show', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserX className="h-4 w-4 mr-2" />
          Mark No-Show
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark as No-Show?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark {studentName}'s placement as complete with no-show status.
            All {daysAssigned} days will be recorded as owed for potential future placement.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-2">
          <Label htmlFor="no_show_reason">Reason (optional)</Label>
          <Textarea
            id="no_show_reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why did the student not attend?"
            rows={3}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-[rgb(var(--daep-warning))] hover:bg-[rgb(var(--daep-warning))]/90"
          >
            {loading ? 'Processing...' : 'Confirm No-Show'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

#### Early Termination Dialog

```typescript
// components/daep/placements/EarlyTerminationDialog.tsx

'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { earlyTermination } from '@/app/actions/daep/placements';
import { XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface EarlyTerminationDialogProps {
  placementId: string;
  studentName: string;
  daysServed: number;
  daysRemaining: number;
  onSuccess?: () => void;
}

export function EarlyTerminationDialog({
  placementId,
  studentName,
  daysServed,
  daysRemaining,
  onSuccess,
}: EarlyTerminationDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [terminationDate, setTerminationDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (reason.length < 10) {
      toast({ title: 'Error', description: 'Please provide a detailed reason', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const result = await earlyTermination({
        placement_id: placementId,
        termination_reason: reason,
        termination_date: terminationDate,
      });

      if (result.success) {
        toast({ title: 'Placement terminated' });
        setOpen(false);
        onSuccess?.();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to terminate placement', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="h-4 w-4 mr-2" />
          Early Termination
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Early Termination</DialogTitle>
          <DialogDescription>
            Terminate {studentName}'s placement before completion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Days info */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p><strong>Days Served:</strong> {daysServed}</p>
            <p><strong>Days Remaining:</strong> {daysRemaining} (will be recorded as owed)</p>
          </div>

          {/* Termination Date */}
          <div className="space-y-2">
            <Label htmlFor="termination_date">Termination Date *</Label>
            <Input
              id="termination_date"
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="termination_reason">Reason for Termination *</Label>
            <Textarea
              id="termination_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a detailed reason for early termination..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={loading || reason.length < 10}
          >
            {loading ? 'Processing...' : 'Terminate Placement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Story 2-13: TrespassTracker Sync

### Goal

Automatically synchronize DAEP placement status with TrespassTracker records, ensuring `is_daep` flag and `daep_expiration_date` are always current.

### Scope

**In-Scope:**
- Sync `is_daep` boolean flag on `trespass_records`
- Sync `daep_expiration_date` field with farthest expected end date
- Single-student sync (called from placement actions)
- Batch sync (admin-triggered for all students)
- Audit logging for batch operations

**Out-of-Scope:**
- Attendance data sync (handled by Epic 3)
- Points data sync (handled by Epic 3)
- Historical placement data sync
- Real-time/webhook sync (sync is action-triggered only)
- Sync to external systems (TrespassTracker is internal)

### Data Model

```
┌─────────────────────┐         ┌─────────────────────┐
│   daep_placements   │         │   trespass_records  │
├─────────────────────┤         ├─────────────────────┤
│ id                  │         │ id                  │
│ tenant_id           │         │ tenant_id           │
│ school_id ──────────┼────────►│ school_id           │
│ status              │         │ is_daep ◄───────────┼── synced
│ expected_end_date ──┼────────►│ daep_expiration_date│
│ ...                 │         │ ...                 │
└─────────────────────┘         └─────────────────────┘

Sync Logic:
- school_id links placement to student record
- is_daep = true if ANY placement is pending/active/transition
- daep_expiration_date = MAX(expected_end_date) across all active placements
- is_daep = false when ALL placements are complete/cancelled
```

### Risks & Assumptions

| Type | Item | Mitigation |
|------|------|------------|
| **Assumption** | `school_id` uniquely identifies a student within a tenant | Enforced by existing DB constraints |
| **Assumption** | `trespass_records` always exists before placement creation | Validated in `createPlacement` action |
| **Risk** | Batch sync fails mid-operation (partial state) | Continue-on-error pattern; return error array; log all failures |
| **Risk** | Race condition if multiple placements update simultaneously | Sync uses latest DB state; last-write-wins is acceptable |
| **Risk** | Large dataset (500+ students) causes timeout | Batch processes sequentially with error isolation; consider async queue for >1000 |
| **Question** | Should batch sync be async/background job? | Deferred to Epic 7 (notifications infrastructure); current sync is sufficient for MVP |

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.13.1 | Placement creation syncs to trespass_records | is_daep = true after create |
| 2.13.2 | Expected end date syncs to daep_expiration_date | Date matches expected_end_date |
| 2.13.3 | Multiple placements use farthest date | Max date used |
| 2.13.4 | Completion clears flag if no other placements | is_daep = false when all complete |
| 2.13.5 | Manual sync action available | Admin can trigger sync |
| 2.13.6 | Sync logged to audit trail | Audit entries on sync |

### Server Actions

```typescript
// app/actions/daep/placements.ts - ADD

/**
 * Sync TrespassTracker status for a student based on their placements
 */
export async function syncTrespassTrackerExpiration(
  schoolId: string
): Promise<{ synced: boolean; is_daep: boolean; expiration_date: string | null }> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get all active/pending/transition placements for this student
  const { data: placements, error } = await supabase
    .from('daep_placements')
    .select('id, expected_end_date, status')
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .in('status', ['pending', 'active', 'transition']);

  if (error) {
    console.error('[TT Sync] Error fetching placements:', error);
    throw new Error('Failed to sync TrespassTracker');
  }

  if (!placements || placements.length === 0) {
    // No active placements - clear DAEP status
    await supabase
      .from('trespass_records')
      .update({
        is_daep: false,
        daep_expiration_date: null,
      })
      .eq('tenant_id', tenantId)
      .eq('school_id', schoolId);

    return { synced: true, is_daep: false, expiration_date: null };
  }

  // Find farthest expected end date
  const validDates = placements
    .filter(p => p.expected_end_date)
    .map(p => p.expected_end_date as string)
    .sort()
    .reverse();

  const farthestDate = validDates[0] || null;

  // Update trespass_records
  await supabase
    .from('trespass_records')
    .update({
      is_daep: true,
      daep_expiration_date: farthestDate,
    })
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId);

  return { synced: true, is_daep: true, expiration_date: farthestDate };
}

/**
 * Batch sync all students with placements (admin action)
 */
export async function batchSyncTrespassTracker(): Promise<{
  success: boolean;
  synced_count: number;
  errors: string[];
}> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Get all unique school_ids from placements
  const { data: placements, error } = await supabase
    .from('daep_placements')
    .select('school_id')
    .eq('tenant_id', tenantId);

  if (error || !placements) {
    return { success: false, synced_count: 0, errors: ['Failed to fetch placements'] };
  }

  const uniqueSchoolIds = [...new Set(placements.map(p => p.school_id))];
  let syncedCount = 0;
  const errors: string[] = [];

  for (const schoolId of uniqueSchoolIds) {
    try {
      await syncTrespassTrackerExpiration(schoolId);
      syncedCount++;
    } catch (err) {
      errors.push(`Failed to sync ${schoolId}: ${err}`);
    }
  }

  // Audit log
  await logAuditEvent({
    eventType: 'system.batch_sync',
    module: 'daep_management',
    actorId: user.id,
    action: `Batch synced TrespassTracker for ${syncedCount} students`,
    tenantId,
    details: {
      synced_count: syncedCount,
      error_count: errors.length,
    },
  });

  revalidatePath('/daep/students');

  return {
    success: errors.length === 0,
    synced_count: syncedCount,
    errors,
  };
}
```

### Integration Points

The `syncTrespassTrackerExpiration` function should be called from:

```typescript
// Integration points in other actions:

// 1. createPlacement - after insert
await syncTrespassTrackerExpiration(input.school_id);

// 2. updatePlacement - after expected_end_date changes
if (updateData.expected_end_date) {
  await syncTrespassTrackerExpiration(current.school_id);
}

// 3. transitionPlacement - on complete/cancelled
if (input.to_status === 'complete' || input.to_status === 'cancelled') {
  await syncTrespassTrackerExpiration(placement.school_id);
}

// 4. markNoShow - after marking no-show
await syncTrespassTrackerExpiration(placement.school_id);

// 5. earlyTermination - after termination
await syncTrespassTrackerExpiration(placement.school_id);

// 6. recalculatePlacementDays - after expected_end_date recalculated
await syncTrespassTrackerExpiration(placement.school_id);
```

### NFR: Performance & Reliability

| Concern | Guidance |
|---------|----------|
| **Single Sync** | O(1) per student - single query + single update. No performance concerns. |
| **Batch Sync** | Sequential processing with error isolation. For datasets >500 students, expect 10-30 seconds. |
| **Timeout** | Default 2-minute timeout is sufficient for ~1000 students. For larger districts, consider chunking. |
| **Error Handling** | Continue-on-error: partial success is acceptable. Return all errors for admin review. |
| **Retry** | No automatic retry. Admin can re-trigger batch sync if errors occur. |
| **Concurrency** | No locking required. Last-write-wins is acceptable for this use case. |

---

## File Structure

```
app/daep/
├── reports/
│   └── rollover/
│       └── page.tsx                    # Story 2-11

app/actions/daep/
└── placements.ts                       # All story actions

components/daep/
├── reports/
│   ├── RolloverCandidatesTable.tsx    # Story 2-11
│   └── RolloverDecisionDialog.tsx     # Story 2-11
└── placements/
    ├── NoShowDialog.tsx               # Story 2-12
    └── EarlyTerminationDialog.tsx     # Story 2-12
```

---

## Test Strategy

### Unit Tests

| Test | Story | AC | Assertion |
|------|-------|-----|-----------|
| `checkSchoolCalendarExists` warns if no calendar | 2-11 | 2.11.11 | Returns `{ exists: false }` when no calendar configured |
| `getRolloverCandidates` returns correct shortfall | 2-11 | 2.11.1 | shortfall = days_remaining - school_days_left; only candidates with shortfall > 0 |
| `getRolloverCandidates` filters by campus | 2-11 | 2.11.8 | With campusFilter, returns only that campus's students |
| `getRolloverCandidates` calculates review eligibility | 2-11 | 2.11.9 | review_eligible_day = review_at_days - days_served |
| `recordRolloverDecision` sets is_rollover_candidate | 2-11 | 2.11.4 | is_rollover_candidate = true on placement |
| `recordRolloverDecision` inserts to history table | 2-11 | 2.11.3, 2.11.4 | New row in daep_rollover_decisions (not overwrite) |
| `recordRolloverDecision` saves notes | 2-11 | 2.11.5 | Notes field populated in decision record |
| `recordRolloverDecision` creates pending rollover placement | 2-11 | 2.11.12 | When continue_daep, new placement with status=pending, is_rollover_placement=true |
| `getRolloverDecisionHistory` returns all decisions | 2-11 | 2.11.4 | Multiple decisions for same placement all returned |
| `getPendingRolloverPlacements` returns approval queue | 2-11 | 2.11.13 | Only placements with is_rollover_placement=true, status=pending |
| `getPendingRolloverCount` returns correct count | 2-11 | 2.11.6 | Count of candidates without current_decision |
| `markNoShow` preserves days_remaining | 2-12 | 2.12.2, 2.12.5 | days_remaining = days_assigned |
| `earlyTermination` requires reason | 2-12 | 2.12.4 | Error on short reason |
| `syncTrespassTrackerExpiration` sets is_daep | 2-13 | 2.13.1 | is_daep = true with active placement |
| `syncTrespassTrackerExpiration` syncs expected_end_date | 2-13 | 2.13.2 | daep_expiration_date matches expected_end_date |
| `syncTrespassTrackerExpiration` uses max date | 2-13 | 2.13.3 | Farthest date selected with multiple placements |
| `syncTrespassTrackerExpiration` clears flag | 2-13 | 2.13.4 | is_daep = false when all placements complete |
| `batchSyncTrespassTracker` triggers sync | 2-13 | 2.13.5 | Admin can call batch sync, returns synced_count |
| `batchSyncTrespassTracker` logs to audit | 2-13 | 2.13.6 | Audit entry created with synced_count and error_count |

### E2E Tests

| Test | Story | AC | Steps |
|------|-------|-----|-------|
| Calendar guard warning | 2-11 | 2.11.11 | Remove calendar → Load report → Verify warning message |
| Rollover report shows correct candidates | 2-11 | 2.11.1 | Create 10 students, 3 with shortfall → Report shows only 3 |
| DAEP admin district-wide view | 2-11 | 2.11.7 | Login as DAEP admin → View report → Can filter by campus |
| Home campus admin scoped view | 2-11 | 2.11.8 | Login as home campus admin → View report → Only see campus students |
| Decision workflow continue_daep | 2-11 | 2.11.2, 2.11.12 | Select "Continue at DAEP" → Verify pending rollover placement created |
| Decision workflow return_home | 2-11 | 2.11.2 | Select "Return to Home Campus" → Verify decision logged, no new placement |
| Decision history shows conflicts | 2-11 | 2.11.4 | Admin A decides continue → Admin B decides return → Both visible in history |
| Review eligibility displayed | 2-11 | 2.11.9 | View candidate with review → Verify review_eligible_day shown |
| Incident number clickable | 2-11 | 2.11.10 | Click incident number → Opens placement detail |
| Notes field persists | 2-11 | 2.11.5 | Enter notes → Save → Reload → Notes visible |
| Dashboard pending count | 2-11 | 2.11.6 | Create rollover candidates → Dashboard shows correct pending count |
| Approval queue for DAEP admin | 2-11 | 2.11.13 | Approve rollover decisions → DAEP admin sees approval queue |
| No-show marking | 2-12 | 2.12.1-2.12.6 | Open dialog → Confirm → Verify status + days |
| Early termination | 2-12 | 2.12.3-2.12.6 | Enter reason → Terminate → Verify status |
| TT sync on create | 2-13 | 2.13.1, 2.13.2 | Create placement → Verify is_daep = true, daep_expiration_date set |
| TT sync with multiple placements | 2-13 | 2.13.3 | Create 2 placements with different end dates → Verify max date used |
| TT sync on complete | 2-13 | 2.13.4 | Complete all placements → Verify is_daep = false |
| Manual batch sync | 2-13 | 2.13.5 | Admin triggers batch sync → Verify all students synced |
| Batch sync audit log | 2-13 | 2.13.6 | Trigger batch sync → Verify audit entry created |

### Notes on Dashboard Test (AC 2.11.6)

> **Dependency:** The dashboard indicator test requires a dashboard page to exist. If no dashboard story has been implemented yet, this test should be deferred until the dashboard is available. The `getPendingRolloverCount()` function can be unit tested independently.

---

*Tech Spec generated by Bob (SM Agent)*
*Date: 2025-11-28*
*Updated: 2025-11-30 (Story 2-11 validation: scope, workflow, data model, NFRs, tests)*
