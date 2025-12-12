'use client';

/**
 * Add Note Inline Form Component
 *
 * Story 4-G: Add Note from Profile
 *
 * Inline form for adding behavior notes from the student profile page.
 * Features:
 * - Placement selector dropdown (Current | Previous placements | Student only)
 * - Matches roster inline entry form styling
 * - Handles no active placement case
 * - Success refreshes activity timeline
 */

import { useState, useCallback, useEffect, useTransition } from 'react';
import { Loader2, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CategorySelect } from './roster/CategorySelect';
import { PointsSelect } from './roster/PointsSelect';
import { createBehaviorNote } from '@/app/actions/daep/behavior-notes';
import { getBehaviorCategories } from '@/app/actions/daep/behavior-categories';
import type { BehaviorCategory } from '@/app/actions/daep/behavior-categories';

// ========== TYPES ==========

interface Placement {
  id: string;
  incident_number: string | null;
  start_date: string;
  expected_end_date: string | null;
  status: string;
}

interface AddNoteInlineFormProps {
  schoolId: string;
  studentName: string;
  placements: Placement[];
  currentPlacementId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

// ========== COMPONENT ==========

export function AddNoteInlineForm({
  schoolId,
  studentName,
  placements,
  currentPlacementId,
  onClose,
  onSuccess,
}: AddNoteInlineFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [selectedPlacementId, setSelectedPlacementId] = useState<string>(
    currentPlacementId || 'student_only'
  );
  const [points, setPoints] = useState<number>(0);
  const [studentAction, setStudentAction] = useState<string>('');
  const [teacherAction, setTeacherAction] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Categories state
  const [categories, setCategories] = useState<BehaviorCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const cats = await getBehaviorCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Build placement options
  const placementOptions = [
    // Current placement first (if exists)
    ...placements
      .filter((p) => p.status === 'active' || p.status === 'pending')
      .map((p) => ({
        value: p.id,
        label: `Current: #${p.incident_number || 'N/A'} (${p.status})`,
        isCurrent: true,
      })),
    // Previous placements
    ...placements
      .filter((p) => p.status !== 'active' && p.status !== 'pending')
      .map((p) => ({
        value: p.id,
        label: `#${p.incident_number || 'N/A'} - ${p.status}`,
        isCurrent: false,
      })),
    // Student only option
    {
      value: 'student_only',
      label: 'Student only (no placement)',
      isCurrent: false,
    },
  ];

  // Handle save
  const handleSave = useCallback(() => {
    startTransition(async () => {
      try {
        // For "student_only", we don't pass a placement_id
        const placementId = selectedPlacementId === 'student_only' ? undefined : selectedPlacementId;

        const result = await createBehaviorNote({
          placement_id: placementId,
          student_school_id: placementId ? undefined : schoolId, // Only pass student_school_id if no placement
          incident_date: today,
          points: points !== 0 ? points : undefined,
          student_action: studentAction || undefined,
          teacher_action: teacherAction || undefined,
          notes: notes || undefined,
          description: notes || undefined,
        });

        if (result.success) {
          toast({
            title: 'Note saved',
            description: `${points !== 0 ? `${points > 0 ? '+' : ''}${points} points` : 'Note'} added for ${studentName}`,
          });

          // Reset form and close
          setPoints(0);
          setStudentAction('');
          setTeacherAction('');
          setNotes('');

          onSuccess?.();
          onClose();
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to save note',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error saving note:', error);
        toast({
          title: 'Error',
          description: 'Failed to save note',
          variant: 'destructive',
        });
      }
    });
  }, [selectedPlacementId, schoolId, today, points, studentAction, teacherAction, notes, studentName, toast, onSuccess, onClose]);

  return (
    <div className="bg-muted/30 border rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Add Note for {studentName}</h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Placement Selector */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Link to Placement
          </label>
          <Select value={selectedPlacementId} onValueChange={setSelectedPlacementId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select placement..." />
            </SelectTrigger>
            <SelectContent>
              {placementOptions.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className={cn(opt.isCurrent && 'font-medium')}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Points + Actions row */}
        <div className="grid grid-cols-3 gap-2">
          {/* Points selector */}
          <PointsSelect
            value={points}
            onValueChange={setPoints}
            placeholder="Points"
          />

          {/* Student Action */}
          <CategorySelect
            categories={categories}
            value={studentAction}
            onValueChange={setStudentAction}
            placeholder="Student Action"
            variant="student"
            disabled={isLoadingCategories}
          />

          {/* Teacher Action */}
          <CategorySelect
            categories={categories}
            value={teacherAction}
            onValueChange={setTeacherAction}
            placeholder="Teacher Action"
            variant="teacher"
            disabled={isLoadingCategories}
          />
        </div>

        {/* Notes */}
        <Textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-16 text-sm resize-none"
        />

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || (points === 0 && !notes.trim() && !studentAction && !teacherAction)}
            className="flex-1"
            size="sm"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Note'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
