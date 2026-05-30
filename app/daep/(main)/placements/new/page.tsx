'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Search, CalendarDays, AlertCircle, Loader2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import {
  getDisciplineCodesForForm,
  getCampusesForForm,
  searchStudentsForPlacement,
  lookupStudentForIntake,
  checkDuplicatePlacement,
  createPlacement,
  getExpectedEndDatePreview,
  createDaepStudent,
  findPossibleStudentMatches,
  getOffenseCodesForForm,
  getLocationCodesForOffense,
  type DisciplineCodeOption,
  type CampusOption,
  type StudentSearchResult,
  type IntakeStudentLookup,
  type OffenseCodeOption,
  type LocationCodeOption,
} from '@/app/actions/daep/placements';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, UserCheck } from 'lucide-react';
import {
  getIntakeQueueEntry,
  promoteIntakeQueueEntry,
  type IntakeQueueEntry,
} from '@/app/actions/daep/intake-queue';

function NewPlacementForm() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const queueId = searchParams.get('queueId');

  // Form options
  const [disciplineCodes, setDisciplineCodes] = useState<DisciplineCodeOption[]>([]);
  const [offenseCodes, setOffenseCodes] = useState<OffenseCodeOption[]>([]);
  const [locationCodes, setLocationCodes] = useState<LocationCodeOption[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Student search
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<StudentSearchResult[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // Form state
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [incidentNumber, setIncidentNumber] = useState('');
  const [placementDate, setPlacementDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [startDate, setStartDate] = useState('');
  const [daysAssigned, setDaysAssigned] = useState<number>(30);
  const [offenseCode, setOffenseCode] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [homeCampusId, setHomeCampusId] = useState('');
  const [placementReason, setPlacementReason] = useState('');
  const [mandatoryPlacement, setMandatoryPlacement] = useState(false);
  const [intakeNotes, setIntakeNotes] = useState('');

  // Calculated values
  const [expectedEndDate, setExpectedEndDate] = useState<string | null>(null);
  const [isEstimate, setIsEstimate] = useState(false);
  const [calculatingEndDate, setCalculatingEndDate] = useState(false);

  // Validation
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Form submission
  const [submitting, setSubmitting] = useState(false);

  // Intake-queue completion (prefill source)
  const [queueEntry, setQueueEntry] = useState<IntakeQueueEntry | null>(null);
  const prefilledRef = useRef(false);
  // Student identity entered inline when completing a queued intake. The
  // placement creates the trespass record from these on submit.
  const [queueStudentId, setQueueStudentId] = useState('');
  const [queueFirstName, setQueueFirstName] = useState('');
  const [queueLastName, setQueueLastName] = useState('');
  const [queueGrade, setQueueGrade] = useState('');
  // Existing-student detection for the queue Student ID (repeat placements).
  const [existingMatch, setExistingMatch] = useState<IntakeStudentLookup | null>(null);
  const [lookingUpStudent, setLookingUpStudent] = useState(false);

  // Parent contact info corrections (Phase B). One open/value pair per field.
  // The "open" flag tracks whether the inline correction input is visible.
  // The "value" is what we send to *_intake on submit. Empty + open = cancel
  // (no write). Empty + had-prior = revert (NULL out _intake).
  type ContactField =
    | 'parent_email'
    | 'guardian_phone'
    | 'emergency_contact_name'
    | 'emergency_contact_phone';
  const [contactOpen, setContactOpen] = useState<Record<ContactField, boolean>>({
    parent_email: false,
    guardian_phone: false,
    emergency_contact_name: false,
    emergency_contact_phone: false,
  });
  const [contactValues, setContactValues] = useState<Record<ContactField, string>>({
    parent_email: '',
    guardian_phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  // New student dialog
  const [showNewStudentDialog, setShowNewStudentDialog] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    school_id: '',
    first_name: '',
    last_name: '',
    grade_level: '' as string,
    campus_id: '',
  });
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [possibleDuplicates, setPossibleDuplicates] = useState<StudentSearchResult[]>([]);

  // Load form options on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const [codes, offenses, campusList] = await Promise.all([
          getDisciplineCodesForForm(),
          getOffenseCodesForForm(),
          getCampusesForForm(),
        ]);
        setDisciplineCodes(codes);
        setOffenseCodes(offenses);
        setCampuses(campusList);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load form options',
          variant: 'destructive',
        });
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, [toast]);

  // Prefill student identity from an intake-queue entry. The placement itself
  // creates the trespass record on submit, so there is no student search here.
  useEffect(() => {
    if (loadingOptions || !queueId || prefilledRef.current) return;
    prefilledRef.current = true;

    (async () => {
      try {
        const entry = await getIntakeQueueEntry(queueId);
        if (!entry) return;
        setQueueEntry(entry);
        setQueueStudentId(entry.student_id || '');
        setQueueFirstName(entry.first_name || '');
        setQueueLastName(entry.last_name || '');
        if (entry.special_notes) setIntakeNotes(entry.special_notes);
        if (entry.home_campus_id) setHomeCampusId(entry.home_campus_id);
        if (entry.scheduled_intake_date) setStartDate(entry.scheduled_intake_date);
      } catch (error) {
        console.error('Error prefilling from intake queue:', error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingOptions, queueId]);

  // Detect an existing student by the entered Student ID so a repeat placement
  // attaches to that record (debounced; mirrors the student-search pattern).
  useEffect(() => {
    if (!queueId || !queueStudentId.trim()) {
      setExistingMatch(null);
      setContactOpen({
        parent_email: false,
        guardian_phone: false,
        emergency_contact_name: false,
        emergency_contact_phone: false,
      });
      setContactValues({
        parent_email: '',
        guardian_phone: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
      });
      return;
    }
    setLookingUpStudent(true);
    const timer = setTimeout(async () => {
      try {
        const result = await lookupStudentForIntake(queueStudentId);
        const match = result.exists ? result : null;
        setExistingMatch(match);
        // Auto-expand any field that already has a captured correction so the
        // coordinator sees prior _intake values without an extra click.
        const open = {
          parent_email: !!match?.parent_email_intake,
          guardian_phone: !!match?.guardian_phone_intake,
          emergency_contact_name: !!match?.emergency_contact_name_intake,
          emergency_contact_phone: !!match?.emergency_contact_phone_intake,
        };
        setContactOpen(open);
        setContactValues({
          parent_email: match?.parent_email_intake ?? '',
          guardian_phone: match?.guardian_phone_intake ?? '',
          emergency_contact_name: match?.emergency_contact_name_intake ?? '',
          emergency_contact_phone: match?.emergency_contact_phone_intake ?? '',
        });
      } catch (error) {
        console.error('Error looking up student:', error);
        setExistingMatch(null);
      } finally {
        setLookingUpStudent(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [queueId, queueStudentId]);

  // In queue mode, derive selectedStudent so the rest of the form (duplicate
  // check, submit) works without a student search. An existing match uses that
  // record's identity; otherwise the inline fields create a new record.
  useEffect(() => {
    if (!queueId) return;
    const sid = queueStudentId.trim();
    if (!sid) {
      setSelectedStudent(null);
      return;
    }
    if (existingMatch?.exists) {
      setSelectedStudent({
        school_id: sid,
        first_name: existingMatch.first_name || '',
        last_name: existingMatch.last_name || '',
        grade_level: existingMatch.grade_level,
        current_school: existingMatch.current_school,
        has_active_placement: existingMatch.has_active_placement,
      });
      return;
    }
    const first = queueFirstName.trim();
    const last = queueLastName.trim();
    if (!first || !last) {
      setSelectedStudent(null);
      return;
    }
    const campusName = campuses.find((c) => c.id === homeCampusId)?.name || null;
    setSelectedStudent({
      school_id: sid,
      first_name: first,
      last_name: last,
      grade_level: queueGrade ? parseInt(queueGrade) : null,
      current_school: campusName,
      has_active_placement: false,
    });
  }, [queueId, queueStudentId, queueFirstName, queueLastName, queueGrade, homeCampusId, campuses, existingMatch]);

  // Load location codes when offense code changes
  useEffect(() => {
    async function loadLocationCodes() {
      if (!offenseCode) {
        setLocationCodes([]);
        setLocationCode('');
        return;
      }

      setLoadingLocations(true);
      try {
        const locations = await getLocationCodesForOffense(offenseCode);
        setLocationCodes(locations);
        // Reset location code when offense changes
        setLocationCode('');
        setMandatoryPlacement(false);
      } catch (error: any) {
        console.error('Error loading location codes:', error);
        setLocationCodes([]);
      } finally {
        setLoadingLocations(false);
      }
    }
    loadLocationCodes();
  }, [offenseCode]);

  // Debounced student search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (studentQuery.length >= 2) {
        setSearchingStudents(true);
        try {
          const results = await searchStudentsForPlacement(studentQuery);
          setStudentResults(results);
          setShowStudentDropdown(true);
        } catch (error) {
          console.error('Student search error:', error);
        } finally {
          setSearchingStudents(false);
        }
      } else {
        setStudentResults([]);
        setShowStudentDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [studentQuery]);

  // Check for duplicate when student + incident number change
  useEffect(() => {
    const checkDuplicate = async () => {
      if (selectedStudent && incidentNumber.trim()) {
        setCheckingDuplicate(true);
        try {
          const result = await checkDuplicatePlacement(
            selectedStudent.school_id,
            incidentNumber.trim()
          );
          if (result.exists) {
            setDuplicateError(
              `A placement already exists for ${selectedStudent.first_name} ${selectedStudent.last_name} with incident #${incidentNumber}`
            );
          } else {
            setDuplicateError(null);
          }
        } catch (error) {
          console.error('Duplicate check error:', error);
        } finally {
          setCheckingDuplicate(false);
        }
      } else {
        setDuplicateError(null);
      }
    };

    const timer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timer);
  }, [selectedStudent, incidentNumber]);

  // Calculate expected end date when start date or days change
  useEffect(() => {
    const calculateEndDate = async () => {
      if (startDate && daysAssigned > 0) {
        setCalculatingEndDate(true);
        try {
          const result = await getExpectedEndDatePreview(startDate, daysAssigned);
          setExpectedEndDate(result.date);
          setIsEstimate(result.isEstimate);
        } catch (error) {
          console.error('End date calculation error:', error);
          setExpectedEndDate(null);
        } finally {
          setCalculatingEndDate(false);
        }
      }
    };

    const timer = setTimeout(calculateEndDate, 500);
    return () => clearTimeout(timer);
  }, [startDate, daysAssigned]);

  // Auto-set mandatory based on offense + location combo
  useEffect(() => {
    if (locationCode && locationCodes.length > 0) {
      const selectedLocation = locationCodes.find((loc) => loc.location_code === locationCode);
      if (selectedLocation) {
        setMandatoryPlacement(selectedLocation.mandatory_daep);
      }
    }
  }, [locationCode, locationCodes]);

  // Warn if a student with the same name already exists (avoid duplicate records)
  useEffect(() => {
    if (!showNewStudentDialog) {
      setPossibleDuplicates([]);
      return;
    }
    const first = newStudentForm.first_name.trim();
    const last = newStudentForm.last_name.trim();
    if (first.length < 2 || last.length < 2) {
      setPossibleDuplicates([]);
      return;
    }
    const timer = setTimeout(async () => {
      const matches = await findPossibleStudentMatches(first, last);
      setPossibleDuplicates(matches);
    }, 400);
    return () => clearTimeout(timer);
  }, [showNewStudentDialog, newStudentForm.first_name, newStudentForm.last_name]);

  const handleSelectStudent = (student: StudentSearchResult) => {
    setSelectedStudent(student);
    setStudentQuery(`${student.first_name} ${student.last_name} (${student.school_id})`);
    setShowStudentDropdown(false);

    // Set home campus if we can match it
    if (student.current_school) {
      const matchingCampus = campuses.find(
        (c) => c.name.toLowerCase() === student.current_school?.toLowerCase()
      );
      if (matchingCampus) {
        setHomeCampusId(matchingCampus.id);
      }
    }
  };

  const handleCreateNewStudent = async () => {
    setCreatingStudent(true);
    try {
      const result = await createDaepStudent({
        school_id: newStudentForm.school_id,
        first_name: newStudentForm.first_name,
        last_name: newStudentForm.last_name,
        grade_level: newStudentForm.grade_level ? parseInt(newStudentForm.grade_level) : null,
        campus_id: newStudentForm.campus_id || null,
        current_school: campuses.find((c) => c.id === newStudentForm.campus_id)?.name || null,
      });

      if (result.success && result.student) {
        toast({
          title: 'Student Created',
          description: `Created record for ${result.student.first_name} ${result.student.last_name}`,
        });
        handleSelectStudent(result.student);
        setShowNewStudentDialog(false);
        setNewStudentForm({
          school_id: '',
          first_name: '',
          last_name: '',
          grade_level: '',
          campus_id: '',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create student',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setCreatingStudent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) {
      toast({
        title: 'Validation Error',
        description: 'Please select a student',
        variant: 'destructive',
      });
      return;
    }

    if (duplicateError) {
      toast({
        title: 'Duplicate Placement',
        description: duplicateError,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    // Resolve each *_intake field per Phase B routing rules:
    //   - input not open, no prior _intake          → undefined (no write)
    //   - input open, has value                     → the value (new _intake)
    //   - input open, empty, prior _intake exists   → null (revert to SIS)
    //   - input open, empty, no prior _intake       → undefined (cancel)
    const resolveIntake = (
      field: ContactField,
      prior: string | null
    ): string | null | undefined => {
      if (!contactOpen[field]) {
        return prior ? prior : undefined;
      }
      const trimmed = contactValues[field].trim();
      if (trimmed) return trimmed;
      return prior ? null : undefined;
    };

    try {
      const result = await createPlacement({
        school_id: selectedStudent.school_id,
        incident_number: incidentNumber,
        placement_date: placementDate,
        start_date: startDate,
        days_assigned: daysAssigned,
        offense_code: offenseCode,
        location_code: locationCode,
        placement_reason: placementReason,
        mandatory_placement: mandatoryPlacement,
        home_campus_id: homeCampusId,
        intake_notes: intakeNotes || undefined,
        // Identity for creating the daep_records row if one doesn't exist yet
        // (ignored when the student already exists).
        student_first_name: selectedStudent.first_name,
        student_last_name: selectedStudent.last_name,
        student_grade_level: selectedStudent.grade_level ?? undefined,
        student_current_school: selectedStudent.current_school ?? undefined,
        parent_email_intake: resolveIntake('parent_email', existingMatch?.parent_email_intake ?? null),
        guardian_phone_intake: resolveIntake('guardian_phone', existingMatch?.guardian_phone_intake ?? null),
        emergency_contact_name_intake: resolveIntake(
          'emergency_contact_name',
          existingMatch?.emergency_contact_name_intake ?? null
        ),
        emergency_contact_phone_intake: resolveIntake(
          'emergency_contact_phone',
          existingMatch?.emergency_contact_phone_intake ?? null
        ),
      });

      if (result.success) {
        // Completing a scheduled intake: link the queue entry to the placement.
        if (queueId && result.id) {
          await promoteIntakeQueueEntry(queueId, result.id);
        }
        toast({
          title: 'Placement Created',
          description: `Successfully created placement for ${selectedStudent.first_name} ${selectedStudent.last_name}`,
        });
        router.push(queueId ? '/daep/intake-queue' : '/daep/students');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create placement',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={queueId ? '/daep/intake-queue' : '/daep/students'}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New DAEP Placement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new placement assignment for a student
          </p>
        </div>
      </div>

      {/* Intake-queue completion banner */}
      {queueEntry && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-700 shrink-0" />
          <span className="text-blue-800">
            Completing scheduled intake for{' '}
            <span className="font-medium">
              {queueEntry.first_name} {queueEntry.last_name}
            </span>
            {queueEntry.home_campus_name ? ` · ${queueEntry.home_campus_name}` : ''}. Fill in the
            required placement details below.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student identity (intake-queue completion) */}
        {queueId && (
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
              <CardDescription>
                From the intake queue. Submitting the placement creates the student record (an
                existing student with this ID is reused).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="queue-student-id">Student ID *</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="queue-student-id"
                    value={queueStudentId}
                    onChange={(e) => setQueueStudentId(e.target.value)}
                    placeholder="District student ID"
                    required
                  />
                  {lookingUpStudent && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {existingMatch?.exists ? (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-blue-900">
                    <UserCheck className="h-4 w-4" />
                    Existing student: {existingMatch.first_name} {existingMatch.last_name}
                  </div>
                  <p className="mt-1 text-blue-800">
                    {existingMatch.prior_placement_count > 0
                      ? `${existingMatch.prior_placement_count} prior DAEP placement(s). This intake adds a new incident to their record.`
                      : 'This intake adds a placement to their existing record.'}
                  </p>
                  {existingMatch.has_active_placement && (
                    <p className="mt-1 flex items-center gap-1 font-medium text-amber-700">
                      <AlertCircle className="h-4 w-4" />
                      Student already has an active placement — resolve it before adding another.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="queue-first-name">First Name *</Label>
                      <Input
                        id="queue-first-name"
                        value={queueFirstName}
                        onChange={(e) => setQueueFirstName(e.target.value)}
                        className="mt-1.5"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="queue-last-name">Last Name *</Label>
                      <Input
                        id="queue-last-name"
                        value={queueLastName}
                        onChange={(e) => setQueueLastName(e.target.value)}
                        className="mt-1.5"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="queue-grade">Grade Level</Label>
                      <Select value={queueGrade} onValueChange={setQueueGrade}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(12)].map((_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              Grade {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {queueStudentId.trim() && !lookingUpStudent && (
                    <p className="text-xs text-muted-foreground">
                      No existing record for this ID — a new student record is created on submit.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Parent contact info (Phase B). Always shown in queue-mode. Each
            field has a read-only SIS row and an inline +/× DAEP correction
            input that writes to <field>_intake. SIS columns are never
            edited from this form. */}
        {queueId && queueStudentId.trim() && (
          <Card>
            <CardHeader>
              <CardTitle>Parent contact info</CardTitle>
              <CardDescription>
                Click <Plus className="inline h-3 w-3" /> to add a DAEP correction. SIS values are
                never overwritten; any divergence is surfaced on the reconciliation review page
                after the next import.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  {
                    field: 'parent_email' as const,
                    label: 'Parent email',
                    type: 'email',
                    placeholder: 'parent@example.com',
                  },
                  {
                    field: 'guardian_phone' as const,
                    label: 'Guardian phone',
                    type: 'tel',
                    placeholder: '(555) 123-4567',
                  },
                  {
                    field: 'emergency_contact_name' as const,
                    label: 'Emergency contact name',
                    type: 'text',
                    placeholder: 'Full name',
                  },
                  {
                    field: 'emergency_contact_phone' as const,
                    label: 'Emergency contact phone',
                    type: 'tel',
                    placeholder: '(555) 123-4567',
                  },
                ] as const
              ).map(({ field, label, type, placeholder }) => {
                const sisValue =
                  (existingMatch?.[`${field}_sis` as keyof IntakeStudentLookup] as
                    | string
                    | null) ?? null;
                const isOpen = contactOpen[field];
                return (
                  <div key={field} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                          {label}
                        </Label>
                        <p className="truncate text-sm">
                          <span className="text-muted-foreground">From SIS:</span>{' '}
                          <span className={sisValue ? '' : 'italic text-muted-foreground'}>
                            {sisValue || '—'}
                          </span>
                        </p>
                      </div>
                      {!isOpen && (
                        <button
                          type="button"
                          onClick={() =>
                            setContactOpen((prev) => ({ ...prev, [field]: true }))
                          }
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          aria-label={`Add DAEP correction for ${label}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {isOpen && (
                      <div className="flex items-center gap-2 pl-3">
                        <Label className="shrink-0 text-xs text-muted-foreground">
                          DAEP correction:
                        </Label>
                        <Input
                          type={type}
                          value={contactValues[field]}
                          onChange={(e) =>
                            setContactValues((prev) => ({ ...prev, [field]: e.target.value }))
                          }
                          placeholder={placeholder}
                          className="h-8 flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setContactOpen((prev) => ({ ...prev, [field]: false }));
                            setContactValues((prev) => ({ ...prev, [field]: '' }));
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          aria-label={`Discard DAEP correction for ${label}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Student Selection */}
        {!queueId && (
        <Card>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
            <CardDescription>Search for and select a student</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Student Search */}
            <div className="relative">
              <Label htmlFor="student-search">Student *</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="student-search"
                  placeholder="Search by name or student ID..."
                  value={studentQuery}
                  onChange={(e) => {
                    setStudentQuery(e.target.value);
                    if (selectedStudent) {
                      setSelectedStudent(null);
                    }
                  }}
                  className="pl-10"
                />
                {searchingStudents && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Student Dropdown */}
              {showStudentDropdown && studentResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
                  {studentResults.map((student) => (
                    <button
                      key={student.school_id}
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      className={`w-full px-4 py-2 text-left hover:bg-accent flex justify-between items-center ${
                        student.has_active_placement ? 'opacity-60' : ''
                      }`}
                      disabled={student.has_active_placement}
                    >
                      <div>
                        <span className="font-medium">
                          {student.last_name}, {student.first_name}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          ({student.school_id})
                        </span>
                        {student.current_school && (
                          <span className="text-sm text-muted-foreground block">
                            {student.current_school}
                            {student.grade_level && ` - Grade ${student.grade_level}`}
                          </span>
                        )}
                      </div>
                      {student.has_active_placement && (
                        <span className="text-xs text-[rgb(var(--daep-warning))] bg-[rgb(var(--daep-warning))]/10 px-2 py-0.5 rounded">
                          Active Placement
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {showStudentDropdown && studentResults.length === 0 && studentQuery.length >= 2 && !searchingStudents && (
                <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg p-4">
                  <p className="text-center text-muted-foreground mb-3">
                    No students found matching "{studentQuery}"
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setShowStudentDropdown(false);
                      setShowNewStudentDialog(true);
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create New Student Record
                  </Button>
                </div>
              )}
            </div>

            {/* Selected Student Info */}
            {selectedStudent && (
              <div className="bg-muted border rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Student ID:</span>{' '}
                    <span className="font-medium">{selectedStudent.school_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="font-medium">
                      {selectedStudent.first_name} {selectedStudent.last_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Grade:</span>{' '}
                    <span className="font-medium">
                      {selectedStudent.grade_level || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Home Campus:</span>{' '}
                    <span className="font-medium">
                      {selectedStudent.current_school || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Placement Details */}
        <Card>
          <CardHeader>
            <CardTitle>Placement Details</CardTitle>
            <CardDescription>Configure the placement parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Incident Number */}
              <div>
                <Label htmlFor="incident-number">Incident Number *</Label>
                <Input
                  id="incident-number"
                  value={incidentNumber}
                  onChange={(e) => setIncidentNumber(e.target.value)}
                  placeholder="e.g., INC-2024-001"
                  className="mt-1.5"
                  required
                />
                {checkingDuplicate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Checking for duplicates...
                  </p>
                )}
                {duplicateError && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {duplicateError}
                  </p>
                )}
              </div>

              {/* Offense Code */}
              <div>
                <Label htmlFor="offense-code">Offense Code *</Label>
                <Select value={offenseCode} onValueChange={setOffenseCode} required>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select offense code" />
                  </SelectTrigger>
                  <SelectContent>
                    {offenseCodes.map((code) => (
                      <SelectItem key={code.behavior_code} value={code.behavior_code}>
                        <span className="font-mono">{code.behavior_code}</span> - {code.behavior_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Location Code */}
              <div>
                <Label htmlFor="location-code">Location *</Label>
                <Select
                  value={locationCode}
                  onValueChange={setLocationCode}
                  disabled={!offenseCode || loadingLocations}
                  required
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder={loadingLocations ? "Loading..." : offenseCode ? "Select location" : "Select offense first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {locationCodes.map((loc) => (
                      <SelectItem key={loc.location_code} value={loc.location_code}>
                        <span className="font-mono">{loc.location_code}</span> - {loc.location_description}
                        {loc.mandatory_daep && (
                          <span className="text-[rgb(var(--daep-warning))] ml-1">(Mandatory)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Home Campus */}
              <div>
                <Label htmlFor="home-campus">Home Campus *</Label>
                <Select value={homeCampusId} onValueChange={setHomeCampusId} required>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select home campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses
                      .filter((c) => !c.is_daep)
                      .map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Placement Date */}
              <div>
                <Label htmlFor="placement-date">Placement Date *</Label>
                <Input
                  id="placement-date"
                  type="date"
                  value={placementDate}
                  onChange={(e) => setPlacementDate(e.target.value)}
                  className="mt-1.5"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Start Date */}
              <div>
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5"
                  required
                />
              </div>

              {/* Days Assigned */}
              <div>
                <Label htmlFor="days-assigned">Days Assigned *</Label>
                <Input
                  id="days-assigned"
                  type="number"
                  min={1}
                  max={365}
                  value={daysAssigned}
                  onChange={(e) => setDaysAssigned(parseInt(e.target.value) || 0)}
                  className="mt-1.5"
                  required
                />
              </div>

              {/* Expected End Date (Calculated) */}
              <div>
                <Label>Expected End Date</Label>
                <div className="mt-1.5 h-10 px-3 border rounded-md bg-card flex items-center">
                  {calculatingEndDate ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : expectedEndDate ? (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(expectedEndDate).toLocaleDateString()}</span>
                      {isEstimate && (
                        <span className="text-xs text-[rgb(var(--daep-warning))]">(Est.)</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Enter start date
                    </span>
                  )}
                </div>
                {isEstimate && expectedEndDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on estimated school days (calendar not fully configured)
                  </p>
                )}
              </div>
            </div>

            {/* Mandatory Placement Checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="mandatory"
                checked={mandatoryPlacement}
                disabled={!!locationCode} // Disabled when location is selected (auto-set)
                onCheckedChange={(checked) => setMandatoryPlacement(checked === true)}
              />
              <Label htmlFor="mandatory" className={`font-normal ${locationCode ? 'text-muted-foreground' : 'cursor-pointer'}`}>
                Mandatory DAEP placement (required by law based on offense)
                {locationCode && mandatoryPlacement && (
                  <span className="text-[rgb(var(--daep-warning))] ml-1">(Auto-set based on offense/location)</span>
                )}
              </Label>
            </div>

            {/* Placement Reason */}
            <div>
              <Label htmlFor="reason">Placement Reason *</Label>
              <Textarea
                id="reason"
                value={placementReason}
                onChange={(e) => setPlacementReason(e.target.value)}
                placeholder="Describe the reason for this DAEP placement (minimum 10 characters)..."
                className="mt-1.5 min-h-[100px]"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {placementReason.length}/10 characters minimum
              </p>
            </div>

            {/* Intake Notes (Optional) */}
            <div>
              <Label htmlFor="notes">Intake Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
                placeholder="Any additional notes for the intake process..."
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/daep/students">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={
              submitting ||
              !selectedStudent ||
              !!duplicateError ||
              !incidentNumber ||
              !offenseCode ||
              !locationCode ||
              !homeCampusId ||
              !startDate ||
              !daysAssigned ||
              placementReason.length < 10
            }
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Placement'
            )}
          </Button>
        </div>
      </form>

      {/* New Student Dialog */}
      <Dialog open={showNewStudentDialog} onOpenChange={setShowNewStudentDialog}>
        <DialogContent className="sm:max-w-md daep-theme">
          <DialogHeader>
            <DialogTitle>Create New Student Record</DialogTitle>
            <DialogDescription>
              Enter the student&apos;s basic information to create a record for this placement.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-school-id">Student ID *</Label>
              <Input
                id="new-school-id"
                placeholder="e.g., 123456"
                value={newStudentForm.school_id}
                onChange={(e) =>
                  setNewStudentForm({ ...newStudentForm, school_id: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="new-first-name">First Name *</Label>
                <Input
                  id="new-first-name"
                  placeholder="First name"
                  value={newStudentForm.first_name}
                  onChange={(e) =>
                    setNewStudentForm({ ...newStudentForm, first_name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-last-name">Last Name *</Label>
                <Input
                  id="new-last-name"
                  placeholder="Last name"
                  value={newStudentForm.last_name}
                  onChange={(e) =>
                    setNewStudentForm({ ...newStudentForm, last_name: e.target.value })
                  }
                />
              </div>
            </div>
            {possibleDuplicates.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-amber-800">
                  <AlertCircle className="w-4 h-4" />
                  Possible existing student{possibleDuplicates.length > 1 ? 's' : ''} found
                </div>
                <p className="mt-1 text-amber-700">
                  A record with this name already exists. Use it instead of creating a
                  duplicate so the placement links to the same student.
                </p>
                <ul className="mt-2 space-y-1">
                  {possibleDuplicates.map((match) => (
                    <li
                      key={match.school_id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-amber-900">
                        {match.first_name} {match.last_name} ({match.school_id})
                        {match.grade_level ? ` · Grade ${match.grade_level}` : ''}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleSelectStudent(match);
                          setShowNewStudentDialog(false);
                          setNewStudentForm({
                            school_id: '',
                            first_name: '',
                            last_name: '',
                            grade_level: '',
                            campus_id: '',
                          });
                        }}
                      >
                        Use this student
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="new-grade">Grade Level</Label>
                <Select
                  value={newStudentForm.grade_level}
                  onValueChange={(value) =>
                    setNewStudentForm({ ...newStudentForm, grade_level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(12)].map((_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        Grade {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-campus">Home Campus</Label>
                <Select
                  value={newStudentForm.campus_id}
                  onValueChange={(value) =>
                    setNewStudentForm({ ...newStudentForm, campus_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses
                      .filter((c) => !c.is_daep)
                      .map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewStudentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                creatingStudent ||
                !newStudentForm.school_id ||
                !newStudentForm.first_name ||
                !newStudentForm.last_name
              }
              onClick={handleCreateNewStudent}
            >
              {creatingStudent ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Student'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NewPlacementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewPlacementForm />
    </Suspense>
  );
}
