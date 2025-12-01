'use client';

/**
 * Rollover Decision Dialog Component
 * Story 2-11: AC 2.11.2, 2.11.3 - Record rollover decision with notes
 */

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ArrowRight, Home, School } from 'lucide-react';
import {
  recordRolloverDecision,
  type RolloverCandidate,
  type RolloverDecision,
} from '@/app/actions/daep/rollover';

interface RolloverDecisionDialogProps {
  candidate: RolloverCandidate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function RolloverDecisionDialog({
  candidate,
  open,
  onOpenChange,
  onComplete,
}: RolloverDecisionDialogProps) {
  const { toast } = useToast();

  const [decision, setDecision] = useState<RolloverDecision | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!decision) {
      toast({
        title: 'Selection Required',
        description: 'Please select a decision before saving',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const result = await recordRolloverDecision({
        placement_id: candidate.placement_id,
        decision: decision as RolloverDecision,
        notes: notes.trim() || null,
      });

      if (result.success) {
        toast({
          title: 'Decision Recorded',
          description: `Rollover decision recorded for ${candidate.student_name}`,
        });
        onComplete();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to record decision',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[rgb(var(--daep-warning))]" />
            Record Rollover Decision
          </DialogTitle>
          <DialogDescription>
            This student has {candidate.days_remaining} days remaining on their DAEP placement,
            which exceeds the school days left in the year.
          </DialogDescription>
        </DialogHeader>

        {/* Student Info Card */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium text-foreground">{candidate.student_name}</p>
              <p className="text-sm text-muted-foreground">
                ID: {candidate.student_id} • Grade {candidate.grade_level || '?'}
              </p>
            </div>
            <Badge variant="destructive" className="font-mono">
              {candidate.days_remaining} days left
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <span>Home Campus: {candidate.home_campus_name}</span>
            <span className="mx-2">•</span>
            <span>Incident: {candidate.incident_number}</span>
          </div>
        </div>

        {/* Decision Options */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Decision</Label>
          <RadioGroup
            value={decision}
            onValueChange={(v) => setDecision(v as RolloverDecision)}
            className="space-y-3"
          >
            <div
              className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                decision === 'continue_daep'
                  ? 'border-[rgb(var(--daep-info))] bg-[rgb(var(--daep-info))]/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setDecision('continue_daep')}
            >
              <RadioGroupItem value="continue_daep" id="continue" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="continue" className="flex items-center gap-2 cursor-pointer">
                  <School className="h-4 w-4 text-[rgb(var(--daep-info))]" />
                  Continue DAEP Next Year
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Student will continue their DAEP placement when school resumes.
                  Remaining days will carry over to the new school year.
                </p>
              </div>
            </div>

            <div
              className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                decision === 'return_home'
                  ? 'border-[rgb(var(--daep-success))] bg-[rgb(var(--daep-success))]/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setDecision('return_home')}
            >
              <RadioGroupItem value="return_home" id="return" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="return" className="flex items-center gap-2 cursor-pointer">
                  <Home className="h-4 w-4 text-[rgb(var(--daep-success))]" />
                  Return to Home Campus
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Student will return to their home campus next year.
                  DAEP placement will be marked complete at end of year.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes / Rationale (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any notes about this decision..."
            rows={3}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {notes.length}/2000
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!decision || saving}>
            {saving ? 'Saving...' : 'Record Decision'}
            {!saving && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
