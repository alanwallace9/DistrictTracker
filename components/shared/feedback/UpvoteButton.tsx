'use client';

import { useState, useTransition } from 'react';
import { ChevronUp } from 'lucide-react';
import { toggleUpvote } from '@/app/actions/feedback';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UpvoteButtonProps {
  feedbackId: string;
  initialCount: number;
  initialIsUpvoted: boolean;
  className?: string;
}

export function UpvoteButton({
  feedbackId,
  initialCount,
  initialIsUpvoted,
  className,
}: UpvoteButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Optimistic state
  const [count, setCount] = useState(initialCount);
  const [isUpvoted, setIsUpvoted] = useState(initialIsUpvoted);

  const handleUpvote = async () => {
    // Check if user is logged in
    if (!user) {
      // Show friendly toast instead of immediate redirect
      toast('We value your input! 💙', {
        description: 'Please sign in to vote on features.',
        action: {
          label: 'Sign In',
          onClick: () => router.push('/login?redirect=/feedback'),
        },
        duration: 5000,
      });
      return;
    }

    // Optimistic update
    const newIsUpvoted = !isUpvoted;
    const newCount = newIsUpvoted ? count + 1 : count - 1;

    setIsUpvoted(newIsUpvoted);
    setCount(newCount);

    // Server action
    startTransition(async () => {
      const result = await toggleUpvote(feedbackId);

      if (!result.success) {
        // Revert optimistic update on error
        setIsUpvoted(!newIsUpvoted);
        setCount(newIsUpvoted ? count : count + 1);
        console.error('Failed to toggle upvote:', result.error);
      }
    });
  };

  return (
    <button
      onClick={handleUpvote}
      disabled={isPending}
      className={cn(
        'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg border transition-all',
        'active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isUpvoted
          ? 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300',
        className
      )}
      aria-label={isUpvoted ? 'Remove upvote' : 'Upvote'}
    >
      <ChevronUp
        className={cn(
          'w-5 h-5 transition-transform',
          isUpvoted && 'fill-current'
        )}
      />
      <span className="text-sm font-semibold">{count}</span>
    </button>
  );
}
