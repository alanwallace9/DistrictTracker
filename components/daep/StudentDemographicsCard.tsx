'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, User, AlertTriangle } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import type { StudentProfile } from '@/app/actions/daep/students';

interface Props {
  student: StudentProfile;
}

export function StudentDemographicsCard({ student }: Props) {
  // Calculate age from DOB
  const age = student.date_of_birth
    ? differenceInYears(new Date(), new Date(student.date_of_birth))
    : null;

  // Format DOB for display
  const formattedDOB = student.date_of_birth
    ? format(new Date(student.date_of_birth), 'MMMM d, yyyy')
    : null;

  // Format guardian full name
  const guardianName = [student.guardian_first_name, student.guardian_last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <User className="w-4 h-4" />
          Demographics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date of Birth */}
        {formattedDOB && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Date of Birth
            </p>
            <p className="text-sm">
              {formattedDOB}
              {age !== null && (
                <span className="text-muted-foreground ml-1">({age} years old)</span>
              )}
            </p>
          </div>
        )}

        {/* Guardian/Parent Info */}
        <div className="space-y-3 pt-2 border-t">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Guardian / Parent
          </p>

          {guardianName && (
            <div className="space-y-1">
              <p className="text-sm font-medium">{guardianName}</p>
            </div>
          )}

          {student.guardian_phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a
                href={`tel:${student.guardian_phone}`}
                className="text-[rgb(var(--daep-primary))] hover:underline"
              >
                {student.guardian_phone}
              </a>
            </div>
          )}

          {student.parent_email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a
                href={`mailto:${student.parent_email}`}
                className="text-[rgb(var(--daep-primary))] hover:underline truncate"
              >
                {student.parent_email}
              </a>
            </div>
          )}

          {!guardianName && !student.guardian_phone && !student.parent_email && (
            <p className="text-sm text-muted-foreground">No guardian info on file</p>
          )}
        </div>

        {/* Emergency Contact */}
        {(student.emergency_contact_name || student.emergency_contact_phone) && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Emergency Contact
            </p>

            {student.emergency_contact_name && (
              <p className="text-sm font-medium">{student.emergency_contact_name}</p>
            )}

            {student.emergency_contact_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a
                  href={`tel:${student.emergency_contact_phone}`}
                  className="text-[rgb(var(--daep-primary))] hover:underline"
                >
                  {student.emergency_contact_phone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Address - not available in current schema */}
      </CardContent>
    </Card>
  );
}
