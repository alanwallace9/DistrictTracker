'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Users } from 'lucide-react';

interface Props {
  blockedStudents: string[];
  blockedSections: string[];
  className?: string;
}

export function SeparationWarning({
  blockedStudents,
  blockedSections,
  className,
}: Props) {
  if (blockedStudents.length === 0) return null;

  return (
    <Alert className={`bg-amber-50 border-amber-200 ${className || ''}`}>
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Student Separation Active</AlertTitle>
      <AlertDescription className="text-amber-700">
        <p className="mb-2">
          This student must be kept separate from the following students:
        </p>
        <ul className="list-disc list-inside space-y-1">
          {blockedStudents.map((name, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <Users className="w-3 h-3 inline" />
              <span>{name}</span>
              {blockedSections[idx] && (
                <span className="text-xs text-amber-600">
                  (in {blockedSections[idx]})
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">
          Rooms in the same building section as these students are blocked.
        </p>
      </AlertDescription>
    </Alert>
  );
}
