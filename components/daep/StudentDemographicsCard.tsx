'use client';

/**
 * Student Demographics Card Component
 *
 * Story 4-H: Inline Demographics Edit
 *
 * Features:
 * - Edit button toggles edit mode
 * - Fields become editable in-place
 * - Save/Cancel buttons appear
 * - Validation and error handling
 */

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, Mail, User, AlertTriangle, Pencil, X, Loader2, Check } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { updateStudentDemographics } from '@/app/actions/daep/students';
import type { StudentProfile } from '@/app/actions/daep/students';

interface Props {
  student: StudentProfile;
  schoolId: string;
}

interface FormData {
  guardian_first_name: string;
  guardian_last_name: string;
  guardian_phone: string;
  parent_email: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export function StudentDemographicsCard({ student, schoolId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    guardian_first_name: student.guardian_first_name || '',
    guardian_last_name: student.guardian_last_name || '',
    guardian_phone: student.guardian_phone || '',
    parent_email: student.parent_email || '',
    emergency_contact_name: student.emergency_contact_name || '',
    emergency_contact_phone: student.emergency_contact_phone || '',
  });

  // Calculate age from DOB
  const age = student.date_of_birth
    ? differenceInYears(new Date(), new Date(student.date_of_birth))
    : null;

  // Format DOB for display
  const formattedDOB = student.date_of_birth
    ? format(new Date(student.date_of_birth), 'MMMM d, yyyy')
    : null;

  // Format guardian full name for display
  const guardianName = [student.guardian_first_name, student.guardian_last_name]
    .filter(Boolean)
    .join(' ');

  // Handle field change
  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handle cancel - revert to original values
  const handleCancel = useCallback(() => {
    setFormData({
      guardian_first_name: student.guardian_first_name || '',
      guardian_last_name: student.guardian_last_name || '',
      guardian_phone: student.guardian_phone || '',
      parent_email: student.parent_email || '',
      emergency_contact_name: student.emergency_contact_name || '',
      emergency_contact_phone: student.emergency_contact_phone || '',
    });
    setIsEditing(false);
  }, [student]);

  // Handle save
  const handleSave = useCallback(() => {
    startTransition(async () => {
      const result = await updateStudentDemographics({
        school_id: schoolId,
        guardian_first_name: formData.guardian_first_name || null,
        guardian_last_name: formData.guardian_last_name || null,
        guardian_phone: formData.guardian_phone || null,
        parent_email: formData.parent_email || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
      });

      if (result.success) {
        toast({
          title: 'Demographics saved',
          description: 'Contact information has been updated.',
        });
        setIsEditing(false);
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save demographics',
          variant: 'destructive',
        });
      }
    });
  }, [formData, schoolId, toast, router]);

  // Render field in view or edit mode
  const renderEditableField = (
    label: string,
    field: keyof FormData,
    icon?: React.ReactNode,
    type: 'text' | 'tel' | 'email' = 'text',
    linkPrefix?: string
  ) => {
    const value = formData[field];
    const displayValue = student[field as keyof StudentProfile] as string | null;

    if (isEditing) {
      return (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{label}</label>
          <Input
            type={type}
            value={value}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder={label}
            className="h-8 text-sm"
          />
        </div>
      );
    }

    // View mode
    if (!displayValue) return null;

    if (linkPrefix) {
      return (
        <div className="flex items-center gap-2 text-sm">
          {icon}
          <a
            href={`${linkPrefix}${displayValue}`}
            className="text-[rgb(var(--daep-primary))] hover:underline truncate"
          >
            {displayValue}
          </a>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{displayValue}</span>
      </div>
    );
  };

  return (
    <CollapsibleCard
      title="Demographics"
      icon={<User className="w-4 h-4" />}
      storageKey="student-demographics"
      headerAction={
        !isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            title="Edit demographics"
          >
            <Pencil className="w-3 h-3" />
          </Button>
        ) : null
      }
      contentClassName="space-y-4"
    >
      {/* Edit mode action buttons */}
      {isEditing && (
        <div className="flex items-center gap-2 pb-2 border-b">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleCancel}
            disabled={isPending}
          >
            <X className="w-3 h-3 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-3 h-3 mr-1" />
                Save
              </>
            )}
          </Button>
        </div>
      )}

      {/* Date of Birth - Read only */}
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

        {isEditing ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">First Name</label>
              <Input
                value={formData.guardian_first_name}
                onChange={(e) => handleChange('guardian_first_name', e.target.value)}
                placeholder="First name"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Last Name</label>
              <Input
                value={formData.guardian_last_name}
                onChange={(e) => handleChange('guardian_last_name', e.target.value)}
                placeholder="Last name"
                className="h-8 text-sm"
              />
            </div>
          </div>
        ) : (
          guardianName && (
            <div className="space-y-1">
              <p className="text-sm font-medium">{guardianName}</p>
            </div>
          )
        )}

        {renderEditableField(
          'Phone',
          'guardian_phone',
          <Phone className="w-4 h-4 text-muted-foreground" />,
          'tel',
          'tel:'
        )}

        {renderEditableField(
          'Email',
          'parent_email',
          <Mail className="w-4 h-4 text-muted-foreground" />,
          'email',
          'mailto:'
        )}

        {!isEditing && !guardianName && !student.guardian_phone && !student.parent_email && (
          <p className="text-sm text-muted-foreground">No guardian info on file</p>
        )}
      </div>

      {/* Emergency Contact */}
      <div className="space-y-2 pt-2 border-t">
        <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Emergency Contact
        </p>

        {isEditing ? (
          <>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input
                value={formData.emergency_contact_name}
                onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                placeholder="Emergency contact name"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                placeholder="Emergency contact phone"
                className="h-8 text-sm"
              />
            </div>
          </>
        ) : (
          <>
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

            {!student.emergency_contact_name && !student.emergency_contact_phone && (
              <p className="text-sm text-muted-foreground">No emergency contact on file</p>
            )}
          </>
        )}
      </div>
    </CollapsibleCard>
  );
}
