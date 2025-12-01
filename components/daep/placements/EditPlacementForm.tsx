'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, ArrowLeft, Save, Calendar, Building, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

import { PlacementStatusBadge } from '@/components/daep/shared/PlacementStatusBadge';
import { DaysProgressBar } from '@/components/daep/shared/DaysProgressBar';
import { StatusTransitionActions } from '@/components/daep/placements/StatusTransitionActions';
import { TransitionHistory } from '@/components/daep/placements/TransitionHistory';

import { UpdatePlacementSchema, type UpdatePlacementInput } from '@/lib/validation/schemas';
import { updatePlacement, type PlacementForEdit, type OffenseCodeOption } from '@/app/actions/daep/placements';
import type { RoomAvailability } from '@/app/actions/daep/rooms';

interface EditPlacementFormProps {
  placement: PlacementForEdit;
  availableRooms: RoomAvailability[];
  offenseCodes: OffenseCodeOption[];
}

/**
 * Edit Placement Form Component
 * Story 2-8: AC 2.8.2, 2.8.3, 2.8.4, 2.8.7, 2.8.8
 */
export function EditPlacementForm({
  placement,
  availableRooms,
  offenseCodes,
}: EditPlacementFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdatePlacementInput>({
    resolver: zodResolver(UpdatePlacementSchema),
    defaultValues: {
      id: placement.id,
      days_assigned: placement.days_assigned,
      assigned_room_id: placement.assigned_room_id || undefined,
      intake_notes: placement.intake_notes || '',
      completion_notes: placement.completion_notes || '',
      placement_reason: placement.placement_reason || '',
      offense_code: placement.offense_code || '',
    },
  });

  const handleSubmit = async (data: UpdatePlacementInput) => {
    setIsSubmitting(true);

    try {
      const result = await updatePlacement(data);

      if (result.success) {
        toast.success('Placement updated successfully');
        router.push(`/daep/students/${placement.school_id}`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update placement');
      }
    } catch (error) {
      console.error('Error updating placement:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel handler (AC 2.8.8)
  const handleCancel = () => {
    router.back();
  };

  // Refresh page after status transition
  const handleTransitionComplete = () => {
    router.refresh();
  };

  const formatDate = (dateStr: string | null) =>
    dateStr ? format(new Date(dateStr), 'MMM d, yyyy') : '—';

  return (
    <div className="space-y-6">
      {/* Header with Status and Student Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{placement.student_name}</CardTitle>
              <CardDescription>
                Edit Placement Details
              </CardDescription>
            </div>
            <PlacementStatusBadge status={placement.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Home Campus:</span>
              <p className="font-medium">{placement.home_campus?.name || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Placement Date:</span>
              <p className="font-medium">{formatDate(placement.placement_date)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Start Date:</span>
              <p className="font-medium">{formatDate(placement.start_date)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Expected End:</span>
              <p className="font-medium">{formatDate(placement.expected_end_date)}</p>
            </div>
          </div>

          {/* Days Progress */}
          <div className="mt-4">
            <DaysProgressBar
              daysServed={placement.days_served}
              daysAssigned={placement.days_assigned}
              daysRemaining={placement.days_remaining}
              showLabels={true}
            />
          </div>

          {/* Status Transition Actions (AC 2.8.5, Story 2-9, Story 2-12) */}
          <div className="mt-4 pt-4 border-t">
            <Label className="text-sm text-muted-foreground mb-2 block">Status Actions</Label>
            <StatusTransitionActions
              placementId={placement.id}
              currentStatus={placement.status}
              daysRemaining={placement.days_remaining}
              daysAssigned={placement.days_assigned}
              daysServed={placement.days_served}
              studentName={placement.student_name}
              transitionMeetingDate={placement.transition_meeting_date}
              onTransitionComplete={handleTransitionComplete}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transition History (Story 2-9: AC 2.9.9) */}
      <TransitionHistory placementId={placement.id} />

      {/* Edit Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Days and Room Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Placement Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Days Assigned (AC 2.8.2, 2.8.3) */}
                <FormField
                  control={form.control}
                  name="days_assigned"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Assigned</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Changing days will recalculate expected end date
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Offense Code (AC 2.8.2) */}
                <FormField
                  control={form.control}
                  name="offense_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offense Code</FormLabel>
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select offense code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {offenseCodes.map((code) => (
                            <SelectItem key={code.behavior_code} value={code.behavior_code}>
                              {code.behavior_code} - {code.behavior_label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Room Assignment (AC 2.8.2, 2.8.4) */}
              <FormField
                control={form.control}
                name="assigned_room_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Assigned Room
                    </FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a room" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Room Assigned</SelectItem>
                        {availableRooms.map((room) => (
                          <SelectItem
                            key={room.id}
                            value={room.id}
                            disabled={!room.is_available && room.id !== placement.assigned_room_id}
                          >
                            {room.room_number}
                            {room.room_name && ` - ${room.room_name}`}
                            {room.building_section && ` (${room.building_section})`}
                            {!room.is_available && room.id !== placement.assigned_room_id && (
                              <span className="text-destructive ml-2">
                                {room.blocked_reason}
                              </span>
                            )}
                            {room.id === placement.assigned_room_id && ' (Current)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Rooms with separation conflicts are disabled
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Placement Reason (AC 2.8.2) */}
              <FormField
                control={form.control}
                name="placement_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placement Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the reason for placement..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 10 characters if provided
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Intake Notes (AC 2.8.2) */}
              <FormField
                control={form.control}
                name="intake_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intake Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes from the intake process..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Completion Notes (AC 2.8.2) */}
              <FormField
                control={form.control}
                name="completion_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes for placement completion..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-between">
            {/* Cancel Button (AC 2.8.8) */}
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>

            {/* Save Button */}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
