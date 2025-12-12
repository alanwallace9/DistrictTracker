'use client';

/**
 * Student Profile Header Component
 *
 * Story 4-F: Slim Profile Header
 *
 * Features:
 * - Reduced padding and compact layout
 * - Color ring around avatar for DAEP status (instead of badge)
 * - Inline special flags (IEP, 504, ELL) as small pills
 * - All buttons remain accessible
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, StickyNote, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { StudentProfile } from '@/app/actions/daep/students';

interface Props {
  student: StudentProfile;
  onAddNote?: () => void;
  isAddNoteOpen?: boolean;
}

export function StudentProfileHeader({ student, onAddNote, isAddNoteOpen }: Props) {
  // Build full name, using aka (nickname) if available
  const fullName = [student.first_name, student.last_name]
    .filter(Boolean)
    .join(' ') + (student.aka ? ` (${student.aka})` : '');

  const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase();

  // Build special flags array for inline display
  const specialFlags = [
    student.special_education && { label: 'IEP', color: 'bg-purple-100 text-purple-700' },
    student.plan_504 && { label: '504', color: 'bg-blue-100 text-blue-700' },
    student.ell_status && { label: 'ELL', color: 'bg-amber-100 text-amber-700' },
  ].filter(Boolean) as { label: string; color: string }[];

  return (
    <div className="bg-card rounded-lg border px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Back button (mobile only) */}
        <Link href="/daep/students" className="md:hidden shrink-0">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>

        {/* Avatar with DAEP color ring */}
        <div className={cn(
          "shrink-0 rounded-full p-0.5",
          student.is_daep && "ring-2 ring-[rgb(var(--daep-primary))] ring-offset-2"
        )}>
          <Avatar className="h-12 w-12">
            <AvatarImage src={student.photo_url || undefined} alt={fullName} />
            <AvatarFallback className="text-sm bg-[rgb(var(--daep-primary))] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name, ID, and info - all on fewer lines */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold truncate">{fullName}</h1>
            {/* Inline special flags */}
            {specialFlags.map((flag) => (
              <span
                key={flag.label}
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                  flag.color
                )}
              >
                {flag.label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{student.school_id}</span>
            {student.grade_level && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>Gr {student.grade_level}</span>
              </>
            )}
            {student.current_school && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="truncate">{student.current_school}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons - compact */}
        <div className="flex items-center gap-1 shrink-0">
          <Link href="/daep/students" className="hidden md:block">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="h-8 px-2" disabled title="Coming in Story 2-8">
            <Edit className="w-4 h-4 md:mr-1" />
            <span className="hidden md:inline">Edit</span>
          </Button>
          <Button
            variant={isAddNoteOpen ? 'default' : 'outline'}
            size="sm"
            className="h-8 px-2"
            onClick={onAddNote}
            title="Add behavior note"
          >
            <StickyNote className="w-4 h-4 md:mr-1" />
            <span className="hidden md:inline">Note</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
