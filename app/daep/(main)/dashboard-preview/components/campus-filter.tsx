'use client';

/**
 * Campus Filter Component
 * Story 6-2: Clickable KPIs & Drill-Down
 *
 * Dropdown for filtering dashboard by campus.
 * - Uses URL search params for state (bookmarkable, SSR-friendly)
 * - Auto-hides for single-campus tenants
 * - Preserves filter across navigation
 */

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Campus {
  id: string;
  name: string;
}

interface CampusFilterProps {
  campuses: Campus[];
  className?: string;
}

export function CampusFilter({ campuses, className }: CampusFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Auto-hide for single-campus tenants
  if (campuses.length <= 1) {
    return null;
  }

  const currentCampus = searchParams.get('campus') || 'all';

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('campus');
    } else {
      params.set('campus', value);
    }
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`);
  };

  // Find current campus name for display
  const currentCampusName =
    currentCampus === 'all'
      ? 'All Campuses'
      : campuses.find((c) => c.id === currentCampus)?.name || 'All Campuses';

  return (
    <Select value={currentCampus} onValueChange={handleChange}>
      <SelectTrigger
        className={cn(
          'w-[200px] bg-white/80 border-slate-200 shadow-sm',
          'hover:bg-white hover:border-slate-300 transition-colors',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-500" />
          <SelectValue placeholder="All Campuses">{currentCampusName}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            All Campuses
          </div>
        </SelectItem>
        {campuses.map((campus) => (
          <SelectItem key={campus.id} value={campus.id}>
            {campus.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Helper to build URL with campus filter preserved
 */
export function buildUrlWithCampusFilter(
  basePath: string,
  campusId: string | null
): string {
  if (!campusId || campusId === 'all') {
    return basePath;
  }
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}campus=${campusId}`;
}
