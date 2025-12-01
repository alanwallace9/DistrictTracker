'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowRight, Loader2, CalendarDays, User, Mail } from 'lucide-react';

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

import { initiateTransition } from '@/app/actions/daep/placements';

// Client-side validation schema
const FormSchema = z.object({
  transition_meeting_date: z.string().min(1, 'Meeting date is required'),
  campus_contact_name: z.string().min(1, 'Contact name is required'),
  campus_contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

interface InitiateTransitionDialogProps {
  placementId: string;
  daysRemaining: number;
  onSuccess?: () => void;
}

/**
 * Initiate Transition Dialog Component
 * Story 2-9: AC 2.9.1, AC 2.9.2, AC 2.9.3
 *
 * Allows DAEP admin to schedule transition meeting and notify home campus.
 */
export function InitiateTransitionDialog({
  placementId,
  daysRemaining,
  onSuccess,
}: InitiateTransitionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      transition_meeting_date: '',
      campus_contact_name: '',
      campus_contact_email: '',
      notes: '',
    },
  });

  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      const result = await initiateTransition({
        placement_id: placementId,
        transition_meeting_date: data.transition_meeting_date,
        campus_contact_name: data.campus_contact_name,
        campus_contact_email: data.campus_contact_email || undefined,
        notes: data.notes || undefined,
      });

      if (result.success) {
        toast.success('Transition initiated successfully', {
          description: 'Home campus admins have been notified.',
        });
        setOpen(false);
        form.reset();
        onSuccess?.();
      } else {
        toast.error('Failed to initiate transition', {
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Error initiating transition:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Warn if days remaining > 0
  const showDaysWarning = daysRemaining > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <ArrowRight className="w-4 h-4 mr-2" />
          Initiate Transition
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <DialogHeader>
              <DialogTitle>Initiate Transition to Home Campus</DialogTitle>
              <DialogDescription>
                Schedule the transition meeting and notify the home campus administration.
              </DialogDescription>
            </DialogHeader>

            {showDaysWarning && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Student has {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining.
                  You can still initiate transition if requirements have been met.
                </p>
              </div>
            )}

            <div className="space-y-4 py-4">
              {/* Meeting Date (AC 2.9.2) */}
              <FormField
                control={form.control}
                name="transition_meeting_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      Transition Meeting Date *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={today}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Date of the scheduled meeting with home campus
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campus Contact Name (AC 2.9.3) */}
              <FormField
                control={form.control}
                name="campus_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Campus Contact Person *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Assistant Principal Smith"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Primary contact at the home campus for this transition
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campus Contact Email (optional) */}
              <FormField
                control={form.control}
                name="campus_contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Contact Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@school.edu"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes (optional) */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special considerations for the transition..."
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Initiate Transition'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
