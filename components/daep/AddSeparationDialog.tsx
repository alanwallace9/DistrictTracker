'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DAEPDialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/daep/DAEPDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  createSeparation,
  searchStudentsForSeparation,
  type StudentSearchResultForSeparation,
} from '@/app/actions/daep/rooms';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  onSuccess?: () => void;
}

export function AddSeparationDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  onSuccess,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentSearchResultForSeparation[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResultForSeparation | null>(null);
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setSearching(true);
        setShowDropdown(true);
        searchStudentsForSeparation(searchQuery, studentId)
          .then((results) => {
            setSearchResults(results);
            setShowDropdown(true);
          })
          .catch((err) => {
            console.error('Search error:', err);
            setSearchResults([]);
          })
          .finally(() => setSearching(false));
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, studentId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedStudent(null);
      setReason('');
      setExpiresAt(undefined);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedStudent || !reason) return;

    setSubmitting(true);
    try {
      const result = await createSeparation({
        student_a_id: studentId,
        student_b_id: selectedStudent.school_id,
        reason,
        expires_at: expiresAt?.toISOString(),
      });

      if (result.success) {
        toast.success(`Separation created with ${selectedStudent.first_name} ${selectedStudent.last_name}`);
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to create separation');
      }
    } catch (err) {
      console.error('Error creating separation:', err);
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = selectedStudent && reason.length >= 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DAEPDialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Add Separation
          </DialogTitle>
          <DialogDescription>
            Create a separation rule for <strong>{studentName}</strong>.
            Both students will not be allowed in the same building section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Student Search */}
          <div className="space-y-2">
            <Label htmlFor="student-search">
              Separate From Student <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="student-search"
                  placeholder={
                    selectedStudent
                      ? `${selectedStudent.first_name} ${selectedStudent.last_name} (${selectedStudent.school_id})`
                      : 'Search by name or ID...'
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedStudent) {
                      setSelectedStudent(null);
                    }
                  }}
                  className="pl-10"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Student Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((student) => (
                    <button
                      key={student.school_id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowDropdown(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-2"
                    >
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">
                          {student.first_name} {student.last_name}
                        </span>
                        <span className="text-muted-foreground ml-2 text-sm">
                          ID: {student.school_id}
                          {student.grade_level && ` | Grade ${student.grade_level}`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {showDropdown && searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg p-4">
                  <p className="text-center text-muted-foreground">
                    No students found matching "{searchQuery}"
                  </p>
                </div>
              )}
            </div>

            {/* Selected Student Indicator */}
            {selectedStudent && !searchQuery && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                <Users className="w-4 h-4" />
                <span>
                  Selected: <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong> ({selectedStudent.school_id})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="ml-auto text-xs hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why these students must be separated..."
              rows={3}
              minLength={5}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/500 characters (minimum 5)
            </p>
          </div>

          {/* Expiration Date (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="expires-at"
                type="date"
                value={expiresAt ? format(expiresAt, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setExpiresAt(new Date(e.target.value + 'T00:00:00'));
                  } else {
                    setExpiresAt(undefined);
                  }
                }}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="flex-1"
              />
              {expiresAt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpiresAt(undefined)}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              If set, the separation will automatically expire on this date.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Separation
          </Button>
        </DialogFooter>
      </DAEPDialogContent>
    </Dialog>
  );
}
