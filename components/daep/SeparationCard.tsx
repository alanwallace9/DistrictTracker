'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Users, Calendar, Clock, Trash2, Loader2 } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { toast } from 'sonner';
import { removeSeparation, type StudentSeparation } from '@/app/actions/daep/rooms';

interface Props {
  separation: StudentSeparation;
  onRemove?: () => void;
}

export function SeparationCard({ separation, onRemove }: Props) {
  const [removing, setRemoving] = useState(false);

  const isExpired = separation.expires_at
    ? isPast(new Date(separation.expires_at))
    : false;

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const result = await removeSeparation(separation.id);
      if (result.success) {
        toast.success('Separation removed');
        onRemove?.();
      } else {
        toast.error(result.error || 'Failed to remove separation');
      }
    } catch (err) {
      console.error('Error removing separation:', err);
      toast.error('An error occurred');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card className={isExpired ? 'opacity-60 bg-muted/30' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            {/* Other Student */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{separation.other_student_name}</span>
              <span className="text-xs text-muted-foreground">
                ({separation.other_student_id})
              </span>
              {isExpired && (
                <Badge variant="secondary" className="text-xs">
                  Expired
                </Badge>
              )}
            </div>

            {/* Reason */}
            <p className="text-sm text-muted-foreground ml-6">
              {separation.reason}
            </p>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground ml-6">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created {format(new Date(separation.created_at), 'MMM d, yyyy')}
              </span>
              {separation.expires_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {isExpired ? 'Expired' : 'Expires'}{' '}
                  {format(new Date(separation.expires_at), 'MMM d, yyyy')}
                </span>
              )}
              <span>by {separation.created_by_name}</span>
            </div>
          </div>

          {/* Remove Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={removing}
              >
                {removing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Separation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the separation between this student and{' '}
                  <strong>{separation.other_student_name}</strong>. They will be
                  able to be assigned to the same building section.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove Separation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
