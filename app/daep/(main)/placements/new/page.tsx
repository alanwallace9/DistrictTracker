'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, Search, CalendarDays, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  getDisciplineCodesForForm,
  getCampusesForForm,
  searchStudentsForPlacement,
  checkDuplicatePlacement,
  createPlacement,
  getExpectedEndDatePreview,
  createQuickStudent,
  type DisciplineCodeOption,
  type CampusOption,
  type StudentSearchResult,
} from '@/app/actions/daep/placements';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';

export default function NewPlacementPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Form options
  const [disciplineCodes, setDisciplineCodes] = useState<DisciplineCodeOption[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

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

  // Load form options on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const [codes, campusList] = await Promise.all([
          getDisciplineCodesForForm(),
          getCampusesForForm(),
        ]);
        setDisciplineCodes(codes);
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

  // Auto-set mandatory based on offense code
  useEffect(() => {
    if (offenseCode) {
      const code = disciplineCodes.find((c) => c.code === offenseCode);
      if (code?.mandatory_placement) {
        setMandatoryPlacement(true);
      }
    }
  }, [offenseCode, disciplineCodes]);

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
      const result = await createQuickStudent({
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

    try {
      const result = await createPlacement({
        school_id: selectedStudent.school_id,
        incident_number: incidentNumber,
        placement_date: placementDate,
        start_date: startDate,
        days_assigned: daysAssigned,
        offense_code: offenseCode,
        placement_reason: placementReason,
        mandatory_placement: mandatoryPlacement,
        home_campus_id: homeCampusId,
        intake_notes: intakeNotes || undefined,
      });

      if (result.success) {
        toast({
          title: 'Placement Created',
          description: `Successfully created placement for ${selectedStudent.first_name} ${selectedStudent.last_name}`,
        });
        router.push('/daep/students');
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
          <Link href="/daep/students">
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Selection */}
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
                    {disciplineCodes.map((code) => (
                      <SelectItem key={code.code} value={code.code}>
                        <span className="font-mono">{code.code}</span> - {code.label}
                        {code.mandatory_placement && (
                          <span className="text-[rgb(var(--daep-warning))] ml-1">(Mandatory)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                onCheckedChange={(checked) => setMandatoryPlacement(checked === true)}
              />
              <Label htmlFor="mandatory" className="font-normal cursor-pointer">
                Mandatory DAEP placement (required by law based on offense)
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
