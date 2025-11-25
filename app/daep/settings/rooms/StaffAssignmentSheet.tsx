'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  assignStaffToRoom,
  removeStaffFromRoom,
  getRoomStaff,
  getAvailableStaff,
  type DAEPRoom,
  type DAEPRoomStaff,
} from '@/app/actions/daep/rooms';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, UserPlus, Users } from 'lucide-react';

interface StaffAssignmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: DAEPRoom | null;
  onSuccess: () => void;
}

interface StaffMember {
  id: string;
  display_name: string | null;
  email: string;
  role: string;
}

export function StaffAssignmentSheet({
  open,
  onOpenChange,
  room,
  onSuccess,
}: StaffAssignmentSheetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<DAEPRoomStaff[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignmentType, setAssignmentType] = useState<'homeroom' | 'rotational'>('homeroom');

  useEffect(() => {
    if (open && room) {
      fetchData();
    }
  }, [open, room]);

  const fetchData = async () => {
    if (!room) return;

    setLoading(true);
    try {
      const [staffData, available] = await Promise.all([
        getRoomStaff(room.id),
        getAvailableStaff(),
      ]);
      setCurrentStaff(staffData);
      setAvailableStaff(available);
    } catch (error) {
      console.error('Failed to fetch staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!room || !selectedStaffId) return;

    setSubmitting(true);
    try {
      await assignStaffToRoom({
        room_id: room.id,
        user_id: selectedStaffId,
        assignment_type: assignmentType,
      });
      toast({
        title: 'Success',
        description: 'Staff member assigned to room',
      });
      setSelectedStaffId('');
      fetchData();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign staff',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      await removeStaffFromRoom(assignmentId);
      toast({
        title: 'Success',
        description: 'Staff member removed from room',
      });
      fetchData();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove staff',
        variant: 'destructive',
      });
    }
  };

  // Filter out already assigned staff
  const unassignedStaff = availableStaff.filter(
    (staff) => !currentStaff.some((cs) => cs.user_id === staff.id)
  );

  // Helper to get staff display name
  const getStaffName = (userId: string): string => {
    const staff = availableStaff.find((s) => s.id === userId);
    return staff?.display_name || staff?.email || 'Unknown';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Staff Assignment - Room {room?.room_number}
          </SheetTitle>
          <SheetDescription>
            Assign staff members to this room. Homeroom staff are the primary teacher,
            rotational staff cover during periods.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Assign New Staff */}
          <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
            <h3 className="font-medium text-sm">Assign Staff Member</h3>

            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedStaff.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No available staff
                    </SelectItem>
                  ) : (
                    unassignedStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.display_name || staff.email}
                        <span className="text-muted-foreground ml-2">
                          ({staff.role.replace('_', ' ')})
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignment Type</Label>
              <Select
                value={assignmentType}
                onValueChange={(v) => setAssignmentType(v as 'homeroom' | 'rotational')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homeroom">
                    Homeroom (Primary Teacher)
                  </SelectItem>
                  <SelectItem value="rotational">
                    Rotational (Period Coverage)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAssign}
              disabled={!selectedStaffId || submitting}
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {submitting ? 'Assigning...' : 'Assign to Room'}
            </Button>
          </div>

          {/* Current Staff */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Current Staff ({currentStaff.length})</h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : currentStaff.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-slate-300 rounded-lg">
                No staff assigned to this room
              </div>
            ) : (
              <div className="space-y-2">
                {currentStaff.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{getStaffName(assignment.user_id)}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {assignment.assignment_type}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(assignment.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
