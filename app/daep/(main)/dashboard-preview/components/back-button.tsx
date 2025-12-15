'use client';

/**
 * Back Button Component
 * Story 6-2: Clickable KPIs & Drill-Down
 *
 * "Back to Dashboard" button that preserves campus filter.
 */

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

export function BackButton({
  href = '/daep/dashboard-preview',
  label = 'Back to Dashboard',
  className,
}: BackButtonProps) {
  const searchParams = useSearchParams();
  const campusId = searchParams.get('campus');

  // Preserve campus filter in back navigation
  const backUrl = campusId ? `${href}?campus=${campusId}` : href;

  return (
    <Link href={backUrl}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100',
          className
        )}
      >
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}
