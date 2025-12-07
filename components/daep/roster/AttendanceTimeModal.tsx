'use client';

/**
 * Attendance Time Modal
 *
 * Story 3-9: Attendance Entry
 *
 * Simple modal for entering tardy arrival time or early dismissal time.
 * Opens when selecting T or ED status.
 */

import { useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';

export interface AttendanceTimeModalProps {
  open: boolean;
  status: 'T' | 'ED' | null;
  onSave: (time: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AttendanceTimeModal({
  open,
  status,
  onSave,
  onCancel,
  isSubmitting = false,
}: AttendanceTimeModalProps) {
  const [time, setTime] = useState('');

  const title = status === 'T' ? 'Enter Tardy Time' : 'Enter Early Dismissal Time';
  const description =
    status === 'T'
      ? 'What time did the student arrive?'
      : 'What time was the student dismissed?';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!time) return;
    onSave(time);
    setTime('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTime('');
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="time">{description}</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              autoFocus
              className="text-lg"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTime('');
                onCancel();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!time || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
