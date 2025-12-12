# Tech Spec: Story 5-7 - Resolution Actions

**Epic:** 5 - CSV Reconciliation
**Points:** 5
**Status:** Drafted
**FRs:** FR58, FR59
**Dependencies:** Story 5-6 (Side-by-Side Comparison UI)

---

## Purpose

Enable administrators to resolve each discrepancy with clear actions: Accept SIS (overwrite DAEP), Keep DAEP (ignore SIS), or Add Note (explain decision). Handle special cases for new SIS records (create placement) and missing SIS records (mark for review).

---

## Acceptance Criteria Checklist

| AC | Description | Required Implementation |
|----|-------------|------------------------|
| 5.7.1 | Three action buttons | Accept SIS, Keep DAEP, Add Note per discrepancy |
| 5.7.2 | Accept SIS for new records | Creates new DAEP placement from SIS data |
| 5.7.3 | Keep DAEP for missing records | Marks as reviewed, keeps existing data |
| 5.7.4 | Confirmation dialog for Accept SIS | "Data will be overwritten" warning |
| 5.7.5 | Add Note option | Explain decision with free text |
| 5.7.6 | Auto-advance after resolution | Move to next discrepancy automatically |
| 5.7.7 | Completion summary | Show when all resolved |

---

## Resolution Actions by Category

| Category | Accept SIS | Keep DAEP | Add Note |
|----------|------------|-----------|----------|
| **Field Conflict** | Overwrite DAEP fields with SIS values | Keep existing DAEP values unchanged | Optional note explaining decision |
| **New in SIS** | Create new DAEP placement | Dismiss (mark as reviewed without action) | Note why not creating placement |
| **Missing from SIS** | N/A | Mark as reviewed (student may have left) | Note explaining why in DAEP but not SIS |

---

## UI Components

### Resolution Actions Component

```typescript
// app/daep/reconciliation/[sessionId]/components/resolution-actions.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, X, MessageSquare, Loader2 } from 'lucide-react';
import { resolveDiscrepancy } from '@/app/actions/daep/reconciliation';
import { toast } from 'sonner';
import type { Discrepancy } from '@/lib/types/daep';

interface Props {
  discrepancy: Discrepancy;
  sessionId: string;
  onResolved: () => void;
}

export function ResolutionActions({ discrepancy, sessionId, onResolved }: Props) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [note, setNote] = useState('');
  const [pendingAction, setPendingAction] = useState<'accept_sis' | 'keep_daep' | null>(null);

  const handleAcceptSIS = () => {
    setPendingAction('accept_sis');
    setShowConfirmDialog(true);
  };

  const handleKeepDAEP = async () => {
    await executeResolution('keep_daep');
  };

  const handleAddNote = () => {
    setShowNoteDialog(true);
  };

  const executeResolution = async (
    resolution: 'accept_sis' | 'keep_daep',
    resolutionNote?: string
  ) => {
    setIsProcessing(true);

    try {
      const result = await resolveDiscrepancy({
        discrepancyId: discrepancy.id!,
        sessionId,
        resolution,
        note: resolutionNote,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to resolve discrepancy');
        return;
      }

      toast.success(
        resolution === 'accept_sis'
          ? 'SIS data applied successfully'
          : 'DAEP data retained'
      );

      router.refresh();
      onResolved();
    } catch (error) {
      console.error('[Resolution] Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
      setShowConfirmDialog(false);
      setShowNoteDialog(false);
      setNote('');
      setPendingAction(null);
    }
  };

  const confirmAcceptSIS = async () => {
    await executeResolution('accept_sis');
  };

  const submitWithNote = async () => {
    if (!note.trim()) {
      toast.error('Please enter a note');
      return;
    }
    await executeResolution(pendingAction || 'keep_daep', note);
  };

  // Customize labels based on discrepancy type
  const getLabels = () => {
    switch (discrepancy.discrepancyType) {
      case 'new_in_sis':
        return {
          acceptSIS: 'Create Placement from SIS',
          acceptSISDesc: 'This will create a new DAEP placement using the SIS data.',
          keepDAEP: 'Dismiss',
          keepDAEPDesc: 'Mark as reviewed without creating a placement.',
        };
      case 'missing_from_sis':
        return {
          acceptSIS: null, // Not applicable
          acceptSISDesc: null,
          keepDAEP: 'Mark as Reviewed',
          keepDAEPDesc: 'Acknowledge this student is in DAEP but not in the SIS export.',
        };
      case 'field_conflict':
      default:
        return {
          acceptSIS: 'Accept SIS',
          acceptSISDesc: 'Overwrite DAEP data with SIS values. This action cannot be undone.',
          keepDAEP: 'Keep DAEP',
          keepDAEPDesc: 'Keep the existing DAEP data and ignore SIS differences.',
        };
    }
  };

  const labels = getLabels();

  return (
    <>
      <div className="flex items-center justify-end gap-3 p-4 bg-muted/30 border-t">
        {/* Accept SIS Button */}
        {labels.acceptSIS && (
          <Button
            variant="default"
            onClick={handleAcceptSIS}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {labels.acceptSIS}
          </Button>
        )}

        {/* Keep DAEP Button */}
        <Button
          variant="outline"
          onClick={handleKeepDAEP}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <X className="h-4 w-4 mr-2" />
          )}
          {labels.keepDAEP}
        </Button>

        {/* Add Note Button */}
        <Button
          variant="ghost"
          onClick={handleAddNote}
          disabled={isProcessing}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      {/* Confirmation Dialog for Accept SIS */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {discrepancy.discrepancyType === 'new_in_sis'
                ? 'Create New Placement?'
                : 'Accept SIS Data?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {labels.acceptSISDesc}
              {discrepancy.discrepancyType === 'field_conflict' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-medium text-yellow-800">Fields that will be updated:</p>
                  <ul className="mt-2 space-y-1">
                    {discrepancy.conflicts.map(c => (
                      <li key={c.field} className="text-sm text-yellow-700">
                        • {c.label}: "{c.daepValue}" → "{c.sisValue}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAcceptSIS}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Resolution Note</DialogTitle>
            <DialogDescription>
              Explain your decision for audit purposes. Choose an action after adding your note.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter your note here..."
            className="min-h-[100px]"
          />

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {labels.acceptSIS && (
              <Button
                variant="default"
                onClick={() => {
                  setPendingAction('accept_sis');
                  submitWithNote();
                }}
                disabled={isProcessing || !note.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing && pendingAction === 'accept_sis' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {labels.acceptSIS} with Note
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setPendingAction('keep_daep');
                submitWithNote();
              }}
              disabled={isProcessing || !note.trim()}
            >
              {isProcessing && pendingAction === 'keep_daep' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {labels.keepDAEP} with Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## Server Actions

### File: `app/actions/daep/reconciliation.ts`

#### `resolveDiscrepancy(input: ResolveDiscrepancyInput)`

```typescript
export interface ResolveDiscrepancyInput {
  discrepancyId: string;
  sessionId: string;
  resolution: 'accept_sis' | 'keep_daep';
  note?: string;
}

export async function resolveDiscrepancy(input: ResolveDiscrepancyInput) {
  const supabase = await createServerClient();
  const user = await currentUser();
  const tenantId = await getTenantId();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Get the discrepancy
  const { data: discrepancy, error: fetchError } = await supabase
    .from('daep_reconciliation_discrepancies')
    .select('*')
    .eq('id', input.discrepancyId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !discrepancy) {
    return { success: false, error: 'Discrepancy not found' };
  }

  // Handle based on resolution type and discrepancy type
  try {
    if (input.resolution === 'accept_sis') {
      await applyAcceptSIS(supabase, discrepancy, tenantId, user.id);
    }
    // keep_daep doesn't require data changes, just mark as resolved

    // Update discrepancy record
    const { error: updateError } = await supabase
      .from('daep_reconciliation_discrepancies')
      .update({
        resolution: input.resolution,
        resolution_note: input.note,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', input.discrepancyId);

    if (updateError) {
      throw updateError;
    }

    // Log audit event
    await logAuditEvent({
      eventType: 'reconciliation.discrepancy_resolved',
      module: 'daep_management',
      actorId: user.id,
      actorEmail: user.emailAddresses[0]?.emailAddress,
      targetId: input.discrepancyId,
      action: `Resolved discrepancy: ${input.resolution}`,
      details: {
        sessionId: input.sessionId,
        discrepancyType: discrepancy.discrepancy_type,
        resolution: input.resolution,
        hasNote: !!input.note,
        studentId: discrepancy.student_id,
        studentName: discrepancy.student_name,
      },
    });

    // Check if all discrepancies are resolved
    await checkSessionCompletion(supabase, input.sessionId, tenantId);

    return { success: true };
  } catch (error) {
    console.error('[Resolution] Error:', error);
    return { success: false, error: 'Failed to resolve discrepancy' };
  }
}

async function applyAcceptSIS(
  supabase: any,
  discrepancy: any,
  tenantId: string,
  userId: string
) {
  const sisData = discrepancy.sis_data;
  const discrepancyType = discrepancy.discrepancy_type;

  if (discrepancyType === 'new_in_sis') {
    // Create new placement from SIS data
    await createPlacementFromSIS(supabase, sisData, tenantId, userId);
  } else if (discrepancyType === 'field_conflict') {
    // Update existing placement with SIS values
    await updatePlacementFromSIS(supabase, discrepancy, tenantId);
  }
  // missing_from_sis with accept_sis shouldn't happen (button hidden)
}

async function createPlacementFromSIS(
  supabase: any,
  sisData: any,
  tenantId: string,
  userId: string
) {
  // First, ensure student exists in trespass_records
  const { data: existingStudent } = await supabase
    .from('trespass_records')
    .select('id, school_id')
    .eq('tenant_id', tenantId)
    .eq('school_id', sisData.student_id)
    .single();

  let studentSchoolId = sisData.student_id;

  if (!existingStudent) {
    // Create minimal student record
    const { error: studentError } = await supabase
      .from('trespass_records')
      .insert({
        tenant_id: tenantId,
        school_id: sisData.student_id,
        first_name: sisData.first_name,
        last_name: sisData.last_name,
        is_current_student: true,
        is_daep: true,
        trespassed_from: 'N/A', // Required field, placeholder
        incident_date: sisData.start_date,
        incident_description: `DAEP Placement - ${sisData.incident_number}`,
        police_notified: false,
      });

    if (studentError) {
      throw new Error(`Failed to create student record: ${studentError.message}`);
    }
  }

  // Look up home campus
  const { data: campus } = await supabase
    .from('campuses')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('name', `%${sisData.home_campus}%`)
    .single();

  // Create the placement
  const { error: placementError } = await supabase
    .from('daep_placements')
    .insert({
      tenant_id: tenantId,
      school_id: sisData.student_id,
      incident_number: sisData.incident_number,
      placement_date: sisData.start_date,
      start_date: sisData.start_date,
      days_assigned: sisData.days_assigned,
      days_remaining: sisData.days_assigned,
      offense_code: sisData.offense_code,
      placement_reason: sisData.placement_reason || `Imported from SIS - ${sisData.offense_code}`,
      mandatory_placement: sisData.mandatory_placement || false,
      home_campus_id: campus?.id || null,
      status: 'pending',
      intake_notes: `Created via SIS Reconciliation by ${userId}`,
    });

  if (placementError) {
    throw new Error(`Failed to create placement: ${placementError.message}`);
  }
}

async function updatePlacementFromSIS(
  supabase: any,
  discrepancy: any,
  tenantId: string
) {
  const sisData = discrepancy.sis_data;
  const daepData = discrepancy.daep_data;
  const conflicts = discrepancy.conflicts as FieldConflict[];

  // Build update object from conflicting fields
  const updates: Record<string, any> = {};

  for (const conflict of conflicts) {
    switch (conflict.field) {
      case 'start_date':
        updates.start_date = sisData.start_date;
        updates.placement_date = sisData.start_date;
        break;
      case 'days_assigned':
        updates.days_assigned = sisData.days_assigned;
        updates.days_remaining = sisData.days_assigned - (daepData.days_served || 0);
        break;
      case 'offense_code':
        updates.offense_code = sisData.offense_code;
        break;
      case 'home_campus':
        // Look up campus by name
        const { data: campus } = await supabase
          .from('campuses')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('name', `%${sisData.home_campus}%`)
          .single();
        if (campus) {
          updates.home_campus_id = campus.id;
        }
        break;
      // first_name, last_name, parent_email update trespass_records, not placements
    }
  }

  // Update placement if there are changes
  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('daep_placements')
      .update(updates)
      .eq('id', daepData.id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to update placement: ${error.message}`);
    }
  }

  // Update student record for name/email conflicts
  const studentUpdates: Record<string, any> = {};
  for (const conflict of conflicts) {
    if (conflict.field === 'first_name') {
      studentUpdates.first_name = sisData.first_name;
    }
    if (conflict.field === 'last_name') {
      studentUpdates.last_name = sisData.last_name;
    }
    if (conflict.field === 'parent_email') {
      studentUpdates.parent_email = sisData.parent_email;
    }
  }

  if (Object.keys(studentUpdates).length > 0) {
    studentUpdates.updated_at = new Date().toISOString();

    await supabase
      .from('trespass_records')
      .update(studentUpdates)
      .eq('school_id', daepData.school_id)
      .eq('tenant_id', tenantId);
  }
}

async function checkSessionCompletion(
  supabase: any,
  sessionId: string,
  tenantId: string
) {
  // Count pending discrepancies (excluding matched)
  const { count } = await supabase
    .from('daep_reconciliation_discrepancies')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('resolution', 'pending')
    .neq('discrepancy_type', 'matched');

  if (count === 0) {
    // All resolved - mark session complete
    await supabase
      .from('daep_reconciliation_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('tenant_id', tenantId);
  }
}
```

---

## Audit Events

| Event | When | Details |
|-------|------|---------|
| `reconciliation.discrepancy_resolved` | After each resolution | resolution, discrepancyType, hasNote, studentId, studentName |
| `placement.created` | When creating from SIS | via createPlacement audit |
| `placement.updated` | When updating from SIS | via updatePlacement audit |

---

## Edge Cases

1. **Campus name doesn't match:** Create placement without home_campus_id, log warning
2. **Student doesn't exist:** Create minimal student record first
3. **Placement already exists (duplicate):** Check before creating, show error if duplicate
4. **Invalid offense code:** Create anyway, validation happens at placement level
5. **Network error during resolution:** Show error, don't mark as resolved
6. **User navigates away during processing:** Transaction should complete or rollback
7. **Session marked complete mid-review:** Handle gracefully, show completion screen

---

## Testing Checklist

- [ ] Accept SIS updates DAEP data for field conflicts
- [ ] Accept SIS creates new placement for new_in_sis
- [ ] Keep DAEP marks as resolved without changes
- [ ] Confirmation dialog shows for Accept SIS
- [ ] Shows specific fields that will change in confirmation
- [ ] Add Note dialog captures and saves note
- [ ] Auto-advances to next discrepancy after resolution
- [ ] Session marked complete when all resolved
- [ ] Audit events logged for all resolutions
- [ ] Error handling for failed resolutions
- [ ] Student record created if needed for new placement
- [ ] Campus lookup works with partial matches
