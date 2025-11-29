'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, StickyNote, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { StudentProfile } from '@/app/actions/daep/students';

interface Props {
  student: StudentProfile;
}

export function StudentProfileHeader({ student }: Props) {
  // Build full name, using aka (nickname) if available
  const fullName = [student.first_name, student.last_name]
    .filter(Boolean)
    .join(' ') + (student.aka ? ` (${student.aka})` : '');

  const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-start">
        {/* Back button (mobile: top, desktop: left) */}
        <div className="md:hidden">
          <Link href="/daep/students">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        {/* Avatar */}
        <Avatar className="h-20 w-20 shrink-0">
          <AvatarImage src={student.photo_url || undefined} alt={fullName} />
          <AvatarFallback className="text-xl bg-[rgb(var(--daep-primary))] text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name and Badges */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{fullName}</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Student ID */}
            <Badge variant="secondary" className="font-mono">
              ID: {student.school_id}
            </Badge>

            {/* Grade Level */}
            {student.grade_level && (
              <Badge variant="outline">Grade {student.grade_level}</Badge>
            )}

            {/* Home Campus */}
            {student.current_school && (
              <Badge variant="outline">{student.current_school}</Badge>
            )}
          </div>

          {/* Special Flags */}
          <div className="flex items-center gap-2 flex-wrap">
            {student.special_education && (
              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
                IEP
              </Badge>
            )}
            {student.plan_504 && (
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                504
              </Badge>
            )}
            {student.ell_status && (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                ELL
              </Badge>
            )}
            {student.is_daep && (
              <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                DAEP
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 shrink-0">
          <Link href="/daep/students" className="hidden md:block">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Button variant="outline" size="sm" disabled title="Coming in Story 2-8">
            <Edit className="w-4 h-4 mr-2" />
            Edit Placement
          </Button>
          <Button variant="outline" size="sm" disabled title="Coming in Story 4-1">
            <StickyNote className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
}
