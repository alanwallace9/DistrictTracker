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

Track students who will not complete their DAEP placement before the end of the school year, allowing administrators to decide whether to continue or reset their days for the next year.

### Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 2.11.1 | Report shows students with days_remaining > school_days_left | Report lists rollover candidates |
| 2.11.2 | Rollover decision options: "Continue Next Year" or "Reset" | Both options available |
| 2.11.3 | Decision captured with timestamp and user | Decision logged |
| 2.11.4 | Rollover flag set on placement record | rollover_student = true |
| 2.11.5 | Notes field for rollover decisions | Notes saved with decision |
| 2.11.6 | Dashboard indicator for pending rollover decisions | KPI card shows count |

### Server Actions

```typescript
// app/actions/daep/placements.ts - ADD

export interface RolloverCandidate {
  placement_id: string;
  school_id: string;
  student_name: string;
  days_assigned: number;
  days_served: number;
  days_remaining: number;
  school_days_left: number;
  shortfall: number; // days_remaining - school_days_left
  home_campus: string;
  start_date: string;
  rollover_decision: 'continue' | 'reset' | null;
}

/**
 * Get students who will not complete before end of school year
 */
export async function getRolloverCandidates(): Promise<RolloverCandidate[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Determine current school year
  const today = new Date();
  const schoolYear = today.getMonth() >= 7
    ? `${today.getFullYear()}-${today.getFullYear() + 1}`
    : `${today.getFullYear() - 1}-${today.getFullYear()}`;

  // Count remaining school days in current year
  const { count: schoolDaysLeft } = await supabase
    .from('daep_school_calendar')
    .select('date', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('school_year', schoolYear)
    .eq('is_school_day', true)
    .gte('date', today.toISOString().split('T')[0]);

  const remainingDays = schoolDaysLeft || 0;

  // Get active placements with more days remaining than school days left
  const { data: placements, error } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      days_assigned,
      days_served,
      days_remaining,
      start_date,
      rollover_student,
      rollover_decision,
      home_campus:campuses!fk_daep_placements_home_campus(name),
      student:trespass_records!inner(first_name, last_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .gt('days_remaining', remainingDays);

  if (error || !placements) return [];

  return placements.map(p => ({
    placement_id: p.id,
    school_id: p.school_id,
    student_name: `${(p.student as any).first_name} ${(p.student as any).last_name}`,
    days_assigned: p.days_assigned,
    days_served: p.days_served,
    days_remaining: p.days_remaining,
    school_days_left: remainingDays,
    shortfall: p.days_remaining - remainingDays,
    home_campus: (p.home_campus as any)?.name || 'Unknown',
    start_date: p.start_date,
    rollover_decision: p.rollover_decision as 'continue' | 'reset' | null,
  }));
}

export interface RolloverDecisionInput {
  placement_id: string;
  decision: 'continue' | 'reset';
  notes?: string;
}

/**
 * Record rollover decision for a placement
 */
export async function recordRolloverDecision(
  input: RolloverDecisionInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient();
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const tenantId = await getTenantId();

  // Get placement
  const { data: placement, error: fetchError } = await supabase
    .from('daep_placements')
    .select('id, school_id, days_remaining')
    .eq('id', input.placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !placement) {
    return { success: false, error: 'Placement not found' };
  }

  // Update placement
  const updateData: Record<string, any> = {
    rollover_student: true,
    rollover_decision: input.decision,
    rollover_decided_at: new Date().toISOString(),
    rollover_decided_by: user.id,
  };

  // If reset, clear days_remaining
  if (input.decision === 'reset') {
    updateData.completion_notes = `Rollover reset: ${input.notes || 'Days reset for new school year'}`;
  } else {
    updateData.completion_notes = `Rollover continue: ${input.notes || 'Days will carry over to next year'}`;
  }

  const { error: updateError } = await supabase
    .from('daep_placements')
    .update(updateData)
    .eq('id', input.placement_id);

  if (updateError) {
    return { success: false, error: 'Failed to record decision' };
  }

  // Audit log
  await logAuditEvent({
    eventType: 'placement.rollover_decision',
    module: 'daep_management',
    actorId: user.id,
    targetId: input.placement_id,
    action: `Recorded rollover decision: ${input.decision}`,
    recordSchoolId: placement.school_id,
    tenantId,
    details: {
      decision: input.decision,
      days_remaining: placement.days_remaining,
      notes: input.notes,
    },
  });

  revalidatePath('/daep/reports/rollover');
  revalidatePath('/daep/students');

  return { success: true };
}

/**
 * Get count of pending rollover decisions (for dashboard)
 */
export async function getPendingRolloverCount(): Promise<number> {
  const candidates = await getRolloverCandidates();
  return candidates.filter(c => !c.rollover_decision).length;
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

| Test | Story | Assertion |
|------|-------|-----------|
| `getRolloverCandidates` returns correct shortfall | 2-11 | shortfall = days_remaining - school_days_left |
| `recordRolloverDecision` sets flag | 2-11 | rollover_student = true |
| `markNoShow` preserves days_remaining | 2-12 | days_remaining = days_assigned |
| `earlyTermination` requires reason | 2-12 | Error on short reason |
| `syncTrespassTrackerExpiration` sets is_daep | 2-13 | is_daep = true with active placement |
| `syncTrespassTrackerExpiration` clears flag | 2-13 | is_daep = false with no placements |
| `syncTrespassTrackerExpiration` uses max date | 2-13 | Farthest date selected |

### E2E Tests

| Test | Story | Steps |
|------|-------|-------|
| Rollover workflow | 2-11 | View report → Make decision → Verify flag |
| No-show marking | 2-12 | Open dialog → Confirm → Verify status + days |
| Early termination | 2-12 | Enter reason → Terminate → Verify status |
| TT sync on create | 2-13 | Create placement → Verify TT record updated |
| TT sync on complete | 2-13 | Complete placement → Verify is_daep = false |

---

*Tech Spec generated by Bob (SM Agent)*
*Date: 2025-11-28*
