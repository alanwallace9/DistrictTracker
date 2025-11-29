'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Users, Calendar as CalendarIcon, Loader2, Search } from 'lucide-react';
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
  const [searchOpen, setSearchOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setSearching(true);
        searchStudentsForSeparation(searchQuery, studentId)
          .then(setSearchResults)
          .catch((err) => {
            console.error('Search error:', err);
            setSearchResults([]);
          })
          .finally(() => setSearching(false));
      } else {
        setSearchResults([]);
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
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={searchOpen}
                  className="w-full justify-between"
                >
                  {selectedStudent ? (
                    <span>
                      {selectedStudent.first_name} {selectedStudent.last_name} (
                      {selectedStudent.school_id})
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Search for a student...
                    </span>
                  )}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search by name or ID..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    {searching && (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                    {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                      <CommandEmpty>No students found.</CommandEmpty>
                    )}
                    {!searching && searchResults.length > 0 && (
                      <CommandGroup>
                        {searchResults.map((student) => (
                          <CommandItem
                            key={student.school_id}
                            value={student.school_id}
                            onSelect={() => {
                              setSelectedStudent(student);
                              setSearchOpen(false);
                              setSearchQuery('');
                            }}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            <span>
                              {student.first_name} {student.last_name}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ID: {student.school_id}
                              {student.grade_level && ` | Grade ${student.grade_level}`}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
            <Label>Expiration Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !expiresAt && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, 'PPP') : 'No expiration'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={setExpiresAt}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
                {expiresAt && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setExpiresAt(undefined)}
                    >
                      Clear expiration
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
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
