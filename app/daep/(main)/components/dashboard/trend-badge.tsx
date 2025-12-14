'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendBadgeProps {
  value: number;
  direction: 'up' | 'down' | 'neutral';
  label: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'attention';
}

export function TrendBadge({ value, direction, label, sentiment }: TrendBadgeProps) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        sentiment === 'positive' && 'text-green-600',
        sentiment === 'negative' && 'text-red-600',
        sentiment === 'attention' && 'text-orange-600',
        sentiment === 'neutral' && 'text-gray-500'
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
}
