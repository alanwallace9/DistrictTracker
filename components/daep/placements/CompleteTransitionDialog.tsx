'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle, Loader2, CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

import { completeTransition } from '@/app/actions/daep/placements';

// Client-side validation schema
const FormSchema = z.object({
  first_day_back_date: z.string().min(1, 'First day back date is required'),
  meeting_confirmed: z.boolean().refine(val => val === true, {
    message: 'You must confirm the meeting occurred',
  }),
  completion_notes: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface CompleteTransitionDialogProps {
  placementId: string;
  meetingDate: string | null;
  onSuccess?: () => void;
}

/**
 * Complete Transition Dialog Component
 * Story 2-9: AC 2.9.5, AC 2.9.6, AC 2.9.7
 *
 * Confirms transition meeting occurred and student returned to home campus.
 */
export function CompleteTransitionDialog({
  placementId,
  meetingDate,
  onSuccess,
}: CompleteTransitionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      first_day_back_date: '',
      meeting_confirmed: false,
      completion_notes: '',
    },
  });

  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      const result = await completeTransition({
        placement_id: placementId,
        first_day_back_date: data.first_day_back_date,
        meeting_confirmed: data.meeting_confirmed,
        completion_notes: data.completion_notes || undefined,
      });

      if (result.success) {
        toast.success('Placement completed successfully', {
          description: 'Student has been transitioned back to home campus.',
        });
        setOpen(false);
        form.reset();
        onSuccess?.();
      } else {
        toast.error('Failed to complete transition', {
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error completing transition:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format meeting date for display
  const formattedMeetingDate = meetingDate
    ? format(new Date(meetingDate), 'MMMM d, yyyy')
    : 'Scheduled date';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CheckCircle className="w-4 h-4 mr-2" />
          Complete Transition
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>Complete Placement Transition</DialogTitle>
              <DialogDescription>
                Confirm the transition meeting occurred and record the student&apos;s return to their home campus.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Meeting Confirmation (AC 2.9.5) */}
              <FormField
                control={form.control}
                name="meeting_confirmed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/50">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        I confirm the transition meeting on{' '}
                        <strong>{formattedMeetingDate}</strong> occurred
                      </FormLabel>
                      <FormDescription>
                        This confirms the meeting with home campus took place
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* First Day Back Date (AC 2.9.6) */}
              <FormField
                control={form.control}
                name="first_day_back_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      First Day Back at Home Campus *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The date the student returns to their home campus
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Completion Notes (optional) */}
              <FormField
                control={form.control}
                name="completion_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any final notes about this placement..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !form.watch('meeting_confirmed')}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete Placement'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
