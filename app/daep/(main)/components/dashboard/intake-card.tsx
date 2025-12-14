'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { markIntakeNoShow, markIntakeArrived } from '@/app/actions/daep/dashboard';
import type { TodayIntake } from '@/app/actions/daep/dashboard';
import { itemVariants } from '@/lib/constants/animations';

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-800',
  arrived: 'bg-green-100 text-green-800',
  processing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-500',
  'no-show': 'bg-red-100 text-red-800',
};

interface IntakeCardProps {
  intake: TodayIntake;
  onStatusChange: () => void;
}

export function IntakeCard({ intake, onStatusChange }: IntakeCardProps) {
  const [isLoadingNoShow, setIsLoadingNoShow] = useState(false);
  const [isLoadingArrived, setIsLoadingArrived] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleNoShow = async () => {
    setIsLoadingNoShow(true);
    const result = await markIntakeNoShow(intake.placementId);

    if (result.success) {
      setIsExiting(true);
      toast.success(`${intake.studentName} marked as No-Show`);
      setTimeout(() => onStatusChange(), 400);
    } else {
      setIsLoadingNoShow(false);
      toast.error(result.error || 'Failed to mark as no-show');
    }
  };

  const handleArrived = async () => {
    setIsLoadingArrived(true);
    const result = await markIntakeArrived(intake.placementId);

    if (result.success) {
      toast.success(`${intake.studentName} marked as Arrived`);
      onStatusChange();
    } else {
      setIsLoadingArrived(false);
      toast.error(result.error || 'Failed to mark as arrived');
    }
  };

  const isDisabled = intake.status !== 'scheduled';

  return (
    <motion.div
      variants={itemVariants}
      initial="initial"
      animate={isExiting ? 'exit' : 'animate'}
      exit="exit"
      layout
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-card',
        intake.status === 'no-show' && 'opacity-60'
      )}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {intake.studentInitials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {intake.scheduledTime}
          </span>
          <Badge variant="outline" className={cn('text-xs', statusColors[intake.status])}>
            {intake.status}
          </Badge>
        </div>
        <p className="font-medium text-sm truncate">{intake.studentName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {intake.campusName}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNoShow}
          disabled={isDisabled || isLoadingNoShow || isLoadingArrived}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
        >
          {isLoadingNoShow ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            'No Show'
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleArrived}
          disabled={isDisabled || isLoadingNoShow || isLoadingArrived}
          className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8"
        >
          {isLoadingArrived ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      </div>
    </motion.div>
  );
}
