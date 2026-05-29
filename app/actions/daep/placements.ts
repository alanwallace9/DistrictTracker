'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { logAuditEvent } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import {
  CreatePlacementSchema,
  type CreatePlacementInput,
  QuickStudentSchema,
  type QuickStudentInput,
  CheckActivePlacementSchema,
  ValidatePlacementSchema,
  PlacementTransitionSchema,
  type PlacementTransitionInput,
  UpdatePlacementSchema,
  type UpdatePlacementInput,
  InitiateTransitionSchema,
  type InitiateTransitionInput,
  CompleteTransitionSchema,
  type CompleteTransitionInput,
  MarkNoShowSchema,
  type MarkNoShowInput,
  type PlacementStatus,
  PLACEMENT_STATUSES,
} from '@/lib/validation/schemas';
import { calculateExpectedEndDate, calculateDaysInfo, type DaysInfo } from '@/lib/daep/days-remaining';
import { isValidTransition, getValidTransitions } from '@/lib/daep/placement-state-machine';
import { getTenantId } from '@/lib/tenant';

// ========== TYPES ==========

export interface DisciplineCodeOption {
  code: string;
  label: string;
  mandatory_placement: boolean;
}

// New types for offense/location combo
export interface OffenseCodeOption {
  behavior_code: string;
  behavior_label: string;
}

export interface LocationCodeOption {
  location_code: string;
  location_description: string;
  mandatory_daep: boolean;
  discretionary_daep: boolean;
}

export interface CampusOption {
  id: string;
  name: string;
  is_daep: boolean;
}

export interface StudentSearchResult {
  school_id: string;
  first_name: string;
  last_name: string;
  grade_level: number | null;
  current_school: string | null;
  has_active_placement: boolean;
}

export interface CreatePlacementResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ========== HELPER ==========
// getTenantId imported from @/lib/tenant (centralized tenant resolution)

// ========== GET DISCIPLINE CODES FOR FORM ==========

export async function getDisciplineCodesForForm(): Promise<DisciplineCodeOption[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_discipline_codes')
    .select('code, label, mandatory_placement')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('code');

  if (error) {
    console.error('Error fetching discipline codes:', error);
    throw new Error('Failed to fetch discipline codes');
  }

  return data || [];
}

// ========== GET OFFENSE CODES FOR FORM (NEW) ==========

export async function getOffenseCodesForForm(): Promise<OffenseCodeOption[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get unique behavior codes with their labels
  const { data, error } = await supabase
    .from('daep_offense_location_rules')
    .select('behavior_code, behavior_label')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('behavior_code');

  if (error) {
    console.error('Error fetching offense codes:', error);
    throw new Error('Failed to fetch offense codes');
  }

  // Deduplicate by behavior_code (same code may have multiple locations)
  const uniqueCodes = new Map<string, OffenseCodeOption>();
  for (const row of data || []) {
    if (!uniqueCodes.has(row.behavior_code)) {
      uniqueCodes.set(row.behavior_code, {
        behavior_code: row.behavior_code,
        behavior_label: row.behavior_label,
      });
    }
  }

  return Array.from(uniqueCodes.values());
}

// ========== GET LOCATION CODES FOR OFFENSE (NEW) ==========

export async function getLocationCodesForOffense(
  behaviorCode: string
): Promise<LocationCodeOption[]> {
  if (!behaviorCode) {
    return [];
  }

  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_offense_location_rules')
    .select('location_code, location_description, mandatory_daep, discretionary_daep')
    .eq('tenant_id', tenantId)
    .eq('behavior_code', behaviorCode)
    .eq('active', true)
    .order('location_code');

  if (error) {
    console.error('Error fetching location codes:', error);
    throw new Error('Failed to fetch location codes');
  }

  return data || [];
}

// ========== GET CAMPUSES FOR FORM ==========

export async function getCampusesForForm(): Promise<CampusOption[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('campuses')
    .select('id, name, is_daep')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('name');

  if (error) {
    console.error('Error fetching campuses:', error);
    throw new Error('Failed to fetch campuses');
  }

  return data || [];
}

// ========== SEARCH STUDENTS FOR FORM ==========

export async function searchStudentsForPlacement(
  query: string
): Promise<StudentSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const supabase = await createServerClient();
  const tenantId = await getTenantId();
  const searchTerm = query.trim().toLowerCase();

  // Search trespass_records for students
  const { data: students, error } = await supabase
    .from('trespass_records')
    .select('school_id, first_name, last_name, grade_level, current_school')
    .eq('tenant_id', tenantId)
    .or(
      `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,school_id.ilike.%${searchTerm}%`
    )
    .order('last_name')
    .limit(20);

  if (error) {
    console.error('Error searching students:', error);
    throw new Error('Failed to search students');
  }

  if (!students || students.length === 0) {
    return [];
  }

  // Check for active placements
  const schoolIds = students.map((s) => s.school_id);
  const { data: activePlacements } = await supabase
    .from('daep_placements')
    .select('school_id')
    .eq('tenant_id', tenantId)
    .in('school_id', schoolIds)
    .in('status', ['pending', 'active', 'met']);

  const activeStudentIds = new Set(activePlacements?.map((p) => p.school_id) || []);

  return students.map((s) => ({
    school_id: s.school_id,
    first_name: s.first_name,
    last_name: s.last_name,
    grade_level: s.grade_level,
    current_school: s.current_school,
    has_active_placement: activeStudentIds.has(s.school_id),
  }));
}

// ========== FIND POSSIBLE DUPLICATE STUDENTS (intake guardrail) ==========

/**
 * Find existing students whose name matches the one being entered in the
 * quick-create dialog. Used to warn staff before they create a duplicate
 * student record, so repeat placements stay linked to the same school_id
 * (which is what makes recidivism tracking work).
 */
export async function findPossibleStudentMatches(
  firstName: string,
  lastName: string
): Promise<StudentSearchResult[]> {
  const first = firstName.trim();
  const last = lastName.trim();
  if (first.length < 2 || last.length < 2) {
    return [];
  }

  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data: students, error } = await supabase
    .from('trespass_records')
    .select('school_id, first_name, last_name, grade_level, current_school')
    .eq('tenant_id', tenantId)
    .ilike('first_name', first)
    .ilike('last_name', last)
    .order('last_name')
    .limit(10);

  if (error) {
    console.error('Error finding possible student matches:', error);
    return [];
  }

  if (!students || students.length === 0) {
    return [];
  }

  // Flag which matches already have an active placement
  const schoolIds = students.map((s) => s.school_id);
  const { data: activePlacements } = await supabase
    .from('daep_placements')
    .select('school_id')
    .eq('tenant_id', tenantId)
    .in('school_id', schoolIds)
    .in('status', ['pending', 'active', 'met']);

  const activeStudentIds = new Set(activePlacements?.map((p) => p.school_id) || []);

  return students.map((s) => ({
    school_id: s.school_id,
    first_name: s.first_name,
    last_name: s.last_name,
    grade_level: s.grade_level,
    current_school: s.current_school,
    has_active_placement: activeStudentIds.has(s.school_id),
  }));
}

// ========== CHECK DUPLICATE PLACEMENT ==========

export async function checkDuplicatePlacement(
  school_id: string,
  incident_number: string
): Promise<{ exists: boolean; placement_id?: string }> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data: existing } = await supabase
    .from('daep_placements')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('school_id', school_id)
    .eq('incident_number', incident_number)
    .maybeSingle();

  return {
    exists: !!existing,
    placement_id: existing?.id,
  };
}

// ========== CHECK ACTIVE PLACEMENT (Story 2-10) ==========

export interface ActivePlacementInfo {
  id: string;
  incident_number: string;
  status: PlacementStatus;
  start_date: string;
}

export interface CheckActivePlacementResult {
  hasActive: boolean;
  activePlacement: ActivePlacementInfo | null;
}

/**
 * Check if a student has an active placement
 * FR24: Prevent duplicate active placements
 */
export async function checkActivePlacement(
  schoolId: string,
  excludePlacementId?: string
): Promise<CheckActivePlacementResult> {
  // Validate input
  const parsed = CheckActivePlacementSchema.safeParse({ schoolId, excludePlacementId });
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0].message);
  }

  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  let query = supabase
    .from('daep_placements')
    .select('id, incident_number, status, start_date')
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .in('status', ['pending', 'active', 'met']);

  // Only exclude current placement if editing (avoids matching all when undefined)
  if (excludePlacementId) {
    query = query.neq('id', excludePlacementId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    console.error('Error checking active placements:', error);
    throw new Error('Failed to check active placements');
  }

  if (data) {
    return {
      hasActive: true,
      activePlacement: {
        id: data.id,
        incident_number: data.incident_number,
        status: data.status as PlacementStatus,
        start_date: data.start_date,
      },
    };
  }

  return { hasActive: false, activePlacement: null };
}

// ========== VALIDATE PLACEMENT (Story 2-10) ==========

export interface ValidatePlacementResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate placement creation/update
 * Called before insert or status change
 * FR24: Prevent duplicate active placements
 */
export async function validatePlacement(
  schoolId: string,
  incidentNumber: string,
  excludePlacementId?: string
): Promise<ValidatePlacementResult> {
  // Validate input
  const parsed = ValidatePlacementSchema.safeParse({ schoolId, incidentNumber, excludePlacementId });
  if (!parsed.success) {
    return { valid: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Check 1: Duplicate incident number
  let incidentQuery = supabase
    .from('daep_placements')
    .select('id, incident_number')
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .eq('incident_number', incidentNumber);

  // Only exclude current placement if editing (avoids matching all when undefined)
  if (excludePlacementId) {
    incidentQuery = incidentQuery.neq('id', excludePlacementId);
  }

  const { data: existingIncident } = await incidentQuery.maybeSingle();

  if (existingIncident) {
    return {
      valid: false,
      error: `Placement with incident #${incidentNumber} already exists for this student`,
    };
  }

  // Check 2: Active placement exists
  const { hasActive, activePlacement } = await checkActivePlacement(schoolId, excludePlacementId);

  if (hasActive && activePlacement) {
    return {
      valid: false,
      error: `Student already has an active placement (Incident #${activePlacement.incident_number}, Status: ${activePlacement.status})`,
    };
  }

  return { valid: true };
}

// ========== CREATE PLACEMENT ==========

export async function createPlacement(
  input: CreatePlacementInput
): Promise<CreatePlacementResult> {
  const supabase = await createServerClient();
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // 1. Validate input
  const validation = CreatePlacementSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0].message,
    };
  }

  const data = validation.data;
  const tenantId = await getTenantId();

  try {
    // 2. Validate placement (checks duplicate incident + active placement)
    const placementValidation = await validatePlacement(
      data.school_id,
      data.incident_number
    );

    if (!placementValidation.valid) {
      return {
        success: false,
        error: placementValidation.error,
      };
    }

    // 2b. Ensure a student (trespass) record exists. In DAEP, the placement is
    // what brings the student into the system, so create the record here when
    // it does not exist yet. Returning students keep their existing school_id.
    const { data: existingStudent } = await supabase
      .from('trespass_records')
      .select('school_id')
      .eq('tenant_id', tenantId)
      .eq('school_id', data.school_id)
      .maybeSingle();

    if (!existingStudent) {
      if (!data.student_first_name || !data.student_last_name) {
        return {
          success: false,
          error: 'Student name is required to create the placement record',
        };
      }
      const createdStudent = await createQuickStudent({
        school_id: data.school_id,
        first_name: data.student_first_name,
        last_name: data.student_last_name,
        grade_level: data.student_grade_level ?? null,
        current_school: data.student_current_school ?? null,
        campus_id: data.home_campus_id || null,
      });
      if (!createdStudent.success) {
        return {
          success: false,
          error: createdStudent.error || 'Failed to create student record',
        };
      }
    }

    // 3. Check if offense + location combo requires mandatory placement
    const { data: offenseRule } = await supabase
      .from('daep_offense_location_rules')
      .select('mandatory_daep')
      .eq('tenant_id', tenantId)
      .eq('behavior_code', data.offense_code)
      .eq('location_code', data.location_code)
      .single();

    const isMandatory = offenseRule?.mandatory_daep || data.mandatory_placement;

    // 4. Calculate expected end date based on school calendar
    const expectedEndDate = await calculateExpectedEndDate(
      tenantId,
      data.start_date,
      data.days_assigned
    );

    // 5. Get student name for audit log
    const { data: student } = await supabase
      .from('trespass_records')
      .select('first_name, last_name')
      .eq('tenant_id', tenantId)
      .eq('school_id', data.school_id)
      .maybeSingle();

    const studentName = student
      ? `${student.first_name} ${student.last_name}`
      : `Student ${data.school_id}`;

    // 6. Create placement
    const { data: placement, error } = await supabase
      .from('daep_placements')
      .insert({
        tenant_id: tenantId,
        school_id: data.school_id,
        incident_number: data.incident_number,
        placement_date: data.placement_date,
        start_date: data.start_date,
        days_assigned: data.days_assigned,
        days_served: 0,
        days_remaining: data.days_assigned,
        expected_end_date: expectedEndDate,
        offense_code: data.offense_code,
        location_code: data.location_code,
        placement_reason: data.placement_reason,
        mandatory_placement: isMandatory,
        home_campus_id: data.home_campus_id,
        assigning_campus_id: data.assigning_campus_id || data.home_campus_id,
        intake_notes: data.intake_notes || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating placement:', error);
      return { success: false, error: 'Failed to create placement' };
    }

    // 7. Sync TrespassTracker (AC 2.13.1, 2.13.2)
    await syncTrespassTrackerExpiration(data.school_id);

    // 8. Log audit event
    await logAuditEvent({
      eventType: 'placement.created',
      module: 'daep_management',
      actorId: user.id,
      targetId: placement.id,
      action: `Created DAEP placement for ${studentName}`,
      recordSubjectName: studentName,
      recordSchoolId: data.school_id,
      tenantId,
      details: {
        days_assigned: data.days_assigned,
        offense_code: data.offense_code,
        mandatory_placement: isMandatory,
        start_date: data.start_date,
        expected_end_date: expectedEndDate,
        incident_number: data.incident_number,
      },
    });

    // 9. Revalidate paths
    revalidatePath('/daep/students');
    revalidatePath('/daep/placements');
    revalidatePath(`/daep/students/${data.school_id}`);

    return { success: true, id: placement.id };
  } catch (err) {
    console.error('Error in createPlacement:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// ========== GET EXPECTED END DATE PREVIEW ==========

export async function getExpectedEndDatePreview(
  start_date: string,
  days_assigned: number
): Promise<{ date: string; isEstimate: boolean }> {
  const tenantId = await getTenantId();

  const { previewExpectedEndDate } = await import('@/lib/daep/days-remaining');
  const result = await previewExpectedEndDate(tenantId, start_date, days_assigned);

  return {
    date: result.expectedEndDate,
    isEstimate: result.isEstimate,
  };
}

// ========== CREATE QUICK STUDENT (AC 2.4.10) ==========

export interface QuickStudentResult {
  success: boolean;
  student?: StudentSearchResult;
  error?: string;
  errorCode?: string;
}

export async function createQuickStudent(
  input: QuickStudentInput
): Promise<QuickStudentResult> {
  const supabase = await createServerClient();
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized', errorCode: 'DM-00601' };
  }

  // Validate input
  const validation = QuickStudentSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0].message,
      errorCode: 'DM-00702',
    };
  }

  const data = validation.data;
  const tenantId = await getTenantId();

  try {
    // Check if student ID already exists
    const { data: existing } = await supabase
      .from('trespass_records')
      .select('school_id')
      .eq('tenant_id', tenantId)
      .eq('school_id', data.school_id)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `Student ID ${data.school_id} already exists in the system`,
        errorCode: 'DM-00102',
      };
    }

    // Create minimal trespass record for this student
    const { data: newStudent, error } = await supabase
      .from('trespass_records')
      .insert({
        tenant_id: tenantId,
        user_id: user.id, // Required: Clerk ID of admin who created the record (audit trail)
        school_id: data.school_id,
        first_name: data.first_name,
        last_name: data.last_name,
        grade_level: data.grade_level || null,
        current_school: data.current_school || null,
        campus_id: data.campus_id || null,
        is_current_student: true, // This is a current district student
        is_daep: false, // Not in DAEP yet - placement creation will set this
        status: 'active',
        created_via: 'manual', // Audit: created via admin UI
        // Set a far-future expiration so they show in searches
        expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('school_id, first_name, last_name, grade_level, current_school')
      .single();

    if (error) {
      console.error('Error creating student (DM-00101):', error);
      return {
        success: false,
        error: 'Failed to create student record. If this persists, contact support with code DM-00101.',
        errorCode: 'DM-00101',
      };
    }

    // Log audit event
    await logAuditEvent({
      eventType: 'student.quick_created',
      module: 'daep_management',
      actorId: user.id,
      targetId: newStudent.school_id,
      action: `Created student record for ${data.first_name} ${data.last_name} via placement form`,
      recordSubjectName: `${data.first_name} ${data.last_name}`,
      recordSchoolId: data.school_id,
      tenantId,
    });

    return {
      success: true,
      student: {
        school_id: newStudent.school_id,
        first_name: newStudent.first_name,
        last_name: newStudent.last_name,
        grade_level: newStudent.grade_level,
        current_school: newStudent.current_school,
        has_active_placement: false,
      },
    };
  } catch (err) {
    console.error('Error in createQuickStudent (SY-00001):', err);
    return {
      success: false,
      error: 'An unexpected error occurred. If this persists, contact support with code SY-00001.',
      errorCode: 'SY-00001',
    };
  }
}

// ========== RECALCULATE PLACEMENT DAYS (Story 2-7, AC 2.7.5) ==========

export interface RecalculatePlacementResult {
  success: boolean;
  daysInfo?: DaysInfo;
  error?: string;
}

/**
 * Recalculate days remaining and expected end date for a single placement
 * Called when school calendar is updated or manually triggered
 * FR20: Days tracking and calculation
 */
export async function recalculatePlacementDays(
  placementId: string
): Promise<RecalculatePlacementResult> {
  const supabase = await createServerClient();
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const tenantId = await getTenantId();

  try {
    // 1. Get the placement
    const { data: placement, error: fetchError } = await supabase
      .from('daep_placements')
      .select('id, school_id, start_date, days_assigned, days_served, status')
      .eq('id', placementId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !placement) {
      return { success: false, error: 'Placement not found' };
    }

    // 2. Skip if already complete
    if (placement.status === 'complete') {
      return {
        success: true,
        daysInfo: {
          daysServed: placement.days_served || 0,
          daysRemaining: 0,
          daysAssigned: placement.days_assigned,
          progressPercent: 100,
          expectedEndDate: null,
          isComplete: true,
          isEstimate: false,
        },
      };
    }

    // 3. Calculate new days info
    const daysInfo = await calculateDaysInfo(
      tenantId,
      placement.start_date,
      placement.days_assigned,
      placement.days_served
    );

    // 4. Update placement with new values
    const { error: updateError } = await supabase
      .from('daep_placements')
      .update({
        days_remaining: daysInfo.daysRemaining,
        expected_end_date: daysInfo.expectedEndDate,
      })
      .eq('id', placementId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error updating placement days:', updateError);
      return { success: false, error: 'Failed to update placement' };
    }

    // 5. Log audit event (uses placement.updated as that's an allowed AuditEventType)
    await logAuditEvent({
      eventType: 'placement.updated',
      module: 'daep_management',
      actorId: user.id,
      targetId: placementId,
      action: `Recalculated days for placement`,
      recordSchoolId: placement.school_id,
      tenantId,
      details: {
        recalculation: true,
        days_assigned: daysInfo.daysAssigned,
        days_served: daysInfo.daysServed,
        days_remaining: daysInfo.daysRemaining,
        expected_end_date: daysInfo.expectedEndDate,
      },
    });

    // 6. Sync TrespassTracker after expected_end_date recalc (AC 2.13.2)
    await syncTrespassTrackerExpiration(placement.school_id);

    return { success: true, daysInfo };
  } catch (err) {
    console.error('Error in recalculatePlacementDays:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Recalculate days for all active (non-complete) placements
 * Called after school calendar changes (Story 1-8 integration)
 * FR20: Batch recalculation
 */
export async function recalculateAllActivePlacements(): Promise<{
  success: boolean;
  updated: number;
  failed: number;
  error?: string;
}> {
  const supabase = await createServerClient();
  const user = await currentUser();

  if (!user) {
    return { success: false, updated: 0, failed: 0, error: 'Unauthorized' };
  }

  const tenantId = await getTenantId();

  try {
    // 1. Get all non-complete placements
    const { data: placements, error: fetchError } = await supabase
      .from('daep_placements')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'active', 'met']);

    if (fetchError) {
      console.error('Error fetching placements for recalculation:', fetchError);
      return { success: false, updated: 0, failed: 0, error: 'Failed to fetch placements' };
    }

    if (!placements || placements.length === 0) {
      return { success: true, updated: 0, failed: 0 };
    }

    // 2. Recalculate each placement
    let updated = 0;
    let failed = 0;

    for (const placement of placements) {
      const result = await recalculatePlacementDays(placement.id);
      if (result.success) {
        updated++;
      } else {
        failed++;
        console.warn(`Failed to recalculate placement ${placement.id}:`, result.error);
      }
    }

    // 3. Log batch audit event (uses placement.updated as that's an allowed AuditEventType)
    await logAuditEvent({
      eventType: 'placement.updated',
      module: 'daep_management',
      actorId: user.id,
      targetId: 'batch',
      action: `Batch recalculated days for ${updated} placements`,
      tenantId,
      details: {
        batch_recalculation: true,
        total: placements.length,
        updated,
        failed,
      },
    });

    // 4. Revalidate paths
    revalidatePath('/daep/students');
    revalidatePath('/daep/placements');

    return { success: true, updated, failed };
  } catch (err) {
    console.error('Error in recalculateAllActivePlacements:', err);
    return {
      success: false,
      updated: 0,
      failed: 0,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// ========== TRANSITION PLACEMENT (Story 2-6, AC 2.6.3-2.6.8) ==========
// State machine functions imported from @/lib/daep/placement-state-machine

export interface TransitionPlacementResult {
  success: boolean;
  error?: string;
  newStatus?: PlacementStatus;
}

/**
 * Transition a placement to a new status
 * FR21: Placement lifecycle state machine
 *
 * AC 2.6.4: pending → active (manual or auto on attendance)
 * AC 2.6.5: active → met (when days complete)
 * AC 2.6.6: met → complete (requires meeting date + first day back)
 * AC 2.6.7: All transitions logged to daep_placement_transitions
 * AC 2.6.8: Invalid transitions rejected with error
 */
export async function transitionPlacement(
  input: PlacementTransitionInput
): Promise<TransitionPlacementResult> {
  const supabase = await createServerClient();
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate input
  const validation = PlacementTransitionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const { placement_id, to_status, transition_reason, notes, transition_meeting_date, first_day_back_date } = validation.data;
  const tenantId = await getTenantId();

  try {
    // 1. Get current placement
    const { data: placement, error: fetchError } = await supabase
      .from('daep_placements')
      .select('id, school_id, status, days_served, days_assigned, days_remaining')
      .eq('id', placement_id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !placement) {
      return { success: false, error: 'Placement not found' };
    }

    const fromStatus = placement.status as PlacementStatus;

    // 2. Validate transition
    if (!isValidTransition(fromStatus, to_status)) {
      const validOptions = getValidTransitions(fromStatus);
      const optionsText = validOptions.length > 0
        ? validOptions.join(', ')
        : 'none (terminal state)';
      return {
        success: false,
        error: `Cannot transition from ${fromStatus} to ${to_status}. Valid options: ${optionsText}`,
      };
    }

    // 3. Additional validation for specific transitions
    if (to_status === 'met') {
      // AC 2.6.5: Should have completed days (warning only, not blocking)
      if (placement.days_remaining > 0) {
        console.warn(`[DAEP] Transitioning to 'met' with ${placement.days_remaining} days remaining`);
      }
    }

    if (to_status === 'complete') {
      // AC 2.6.6: Requires meeting date and first day back
      if (!transition_meeting_date) {
        return { success: false, error: 'Transition meeting date is required for completion' };
      }
      if (!first_day_back_date) {
        return { success: false, error: 'First day back date is required for completion' };
      }
    }

    // 4. Build update object
    const updateData: Record<string, unknown> = {
      status: to_status,
      updated_at: new Date().toISOString(),
    };

    // Set specific fields based on transition
    if (to_status === 'active' && fromStatus === 'pending') {
      // First day active - don't change start_date (already set at creation)
    }

    if (to_status === 'met') {
      updateData.review_met_date = new Date().toISOString().split('T')[0];
    }

    if (to_status === 'complete') {
      updateData.transition_meeting_date = transition_meeting_date;
      updateData.first_day_back_date = first_day_back_date;
      updateData.actual_end_date = new Date().toISOString().split('T')[0];
    }

    // 5. Update placement
    const { error: updateError } = await supabase
      .from('daep_placements')
      .update(updateData)
      .eq('id', placement_id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error updating placement status:', updateError);
      return { success: false, error: 'Failed to update placement status' };
    }

    // 6. Log transition to daep_placement_transitions (AC 2.6.7)
    const { error: transitionLogError } = await supabase
      .from('daep_placement_transitions')
      .insert({
        tenant_id: tenantId,
        placement_id,
        from_status: fromStatus,
        to_status,
        transition_reason: transition_reason || `Manual transition by user`,
        transitioned_by: user.id,
        notes,
      });

    if (transitionLogError) {
      console.error('Error logging transition:', transitionLogError);
      // Don't fail the whole operation, just log warning
    }

    // 7. Sync TrespassTracker on complete (AC 2.13.4)
    if (to_status === 'complete') {
      await syncTrespassTrackerExpiration(placement.school_id);
    }

    // 8. Log audit event
    await logAuditEvent({
      eventType: 'placement.updated',
      module: 'daep_management',
      actorId: user.id,
      targetId: placement_id,
      action: `Transitioned placement from ${fromStatus} to ${to_status}`,
      recordSchoolId: placement.school_id,
      tenantId,
      details: {
        from_status: fromStatus,
        to_status,
        transition_reason,
        transition_meeting_date,
        first_day_back_date,
      },
    });

    // 9. Revalidate paths
    revalidatePath('/daep/students');
    revalidatePath('/daep/placements');
    revalidatePath(`/daep/students/${placement.school_id}`);

    return { success: true, newStatus: to_status };
  } catch (err) {
    console.error('Error in transitionPlacement:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// ========== AUTO-ACTIVATE ON ATTENDANCE (Story 2-6, AC 2.6.4) ==========

/**
 * Auto-activate a pending placement when first attendance is recorded
 * Called from Epic 3 attendance recording
 *
 * @param tenantId - The tenant ID
 * @param studentSchoolId - The student's school ID
 * @param attendanceStatus - The attendance status being recorded
 */
export async function autoActivatePlacementOnAttendance(
  tenantId: string,
  studentSchoolId: string,
  attendanceStatus: 'present' | 'tardy' | 'absent'
): Promise<void> {
  // Only auto-activate on present or tardy, not absent
  if (attendanceStatus === 'absent') {
    return;
  }

  const supabase = await createServerClient();
  const user = await currentUser();

  if (!user) {
    console.warn('[DAEP] No user context for auto-activation');
    return;
  }

  try {
    // Find pending placement for this student
    const { data: placement, error: fetchError } = await supabase
      .from('daep_placements')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('school_id', studentSchoolId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('[DAEP] Error checking pending placement:', fetchError);
      return;
    }

    if (!placement) {
      // No pending placement, nothing to activate
      return;
    }

    // Auto-activate the placement
    const { error: updateError } = await supabase
      .from('daep_placements')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', placement.id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('[DAEP] Error auto-activating placement:', updateError);
      return;
    }

    // Log the transition
    await supabase
      .from('daep_placement_transitions')
      .insert({
        tenant_id: tenantId,
        placement_id: placement.id,
        from_status: 'pending',
        to_status: 'active',
        transition_reason: `Auto-activated on first ${attendanceStatus} attendance`,
        transitioned_by: user.id,
      });

    // Log audit event
    await logAuditEvent({
      eventType: 'placement.updated',
      module: 'daep_management',
      actorId: user.id,
      targetId: placement.id,
      action: `Auto-activated placement on first attendance`,
      recordSchoolId: studentSchoolId,
      tenantId,
      details: {
        auto_activation: true,
        attendance_status: attendanceStatus,
      },
    });

    console.log(`[DAEP] Auto-activated placement ${placement.id} for student ${studentSchoolId}`);
  } catch (err) {
    console.error('[DAEP] Error in autoActivatePlacementOnAttendance:', err);
  }
}

// ========== TRESPASSTRACKER SYNC (Story 2-13) ==========

export interface SyncTrespassTrackerResult {
  synced: boolean;
  is_daep: boolean;
  expiration_date: string | null;
}

/**
 * Sync TrespassTracker status for a student based on their placements
 * AC 2.13.1: Sets is_daep = true when active placements exist
 * AC 2.13.2: Syncs expected_end_date to daep_expiration_date
 * AC 2.13.3: Uses MAX(expected_end_date) when multiple placements exist
 * AC 2.13.4: Clears is_daep when all placements are complete/cancelled
 */
export async function syncTrespassTrackerExpiration(
  schoolId: string
): Promise<SyncTrespassTrackerResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  try {
    // Get all active/pending/met placements for this student
    const { data: placements, error } = await supabase
      .from('daep_placements')
      .select('id, expected_end_date, status')
      .eq('tenant_id', tenantId)
      .eq('school_id', schoolId)
      .in('status', ['pending', 'active', 'met']);

    if (error) {
      console.error('[TT Sync] Error fetching placements:', error);
      throw new Error('Failed to sync TrespassTracker');
    }

    if (!placements || placements.length === 0) {
      // No active placements - clear DAEP status (AC 2.13.4)
      const { error: updateError } = await supabase
        .from('trespass_records')
        .update({
          is_daep: false,
          daep_expiration_date: null,
        })
        .eq('tenant_id', tenantId)
        .eq('school_id', schoolId);

      if (updateError) {
        console.error('[TT Sync] Error clearing DAEP status:', updateError);
        throw new Error('Failed to update TrespassTracker');
      }

      console.log(`[TT Sync] Cleared DAEP status for student ${schoolId}`);
      return { synced: true, is_daep: false, expiration_date: null };
    }

    // Find farthest expected end date (AC 2.13.3)
    const validDates = placements
      .filter(p => p.expected_end_date)
      .map(p => p.expected_end_date as string)
      .sort()
      .reverse();

    const farthestDate = validDates[0] || null;

    // Update trespass_records (AC 2.13.1, 2.13.2)
    const { error: updateError } = await supabase
      .from('trespass_records')
      .update({
        is_daep: true,
        daep_expiration_date: farthestDate,
      })
      .eq('tenant_id', tenantId)
      .eq('school_id', schoolId);

    if (updateError) {
      console.error('[TT Sync] Error updating DAEP status:', updateError);
      throw new Error('Failed to update TrespassTracker');
    }

    console.log(`[TT Sync] Synced DAEP status for student ${schoolId}: is_daep=true, expiration=${farthestDate}`);
    return { synced: true, is_daep: true, expiration_date: farthestDate };
  } catch (err) {
    console.error('[TT Sync] Error in syncTrespassTrackerExpiration:', err);
    throw err;
  }
}

export interface BatchSyncResult {
  success: boolean;
  synced_count: number;
  errors: string[];
}

/**
 * Batch sync all students with placements (admin action)
 * AC 2.13.5: Manual sync action available
 * AC 2.13.6: Sync logged to audit trail
 */
export async function batchSyncTrespassTracker(): Promise<BatchSyncResult> {
  const supabase = await createServerClient();
  const user = await currentUser();

  if (!user) {
    return { success: false, synced_count: 0, errors: ['Unauthorized'] };
  }

  const tenantId = await getTenantId();

  try {
    // Get all unique school_ids from placements
    const { data: placements, error } = await supabase
      .from('daep_placements')
      .select('school_id')
      .eq('tenant_id', tenantId);

    if (error || !placements) {
      return { success: false, synced_count: 0, errors: ['Failed to fetch placements'] };
    }

    const uniqueSchoolIds = Array.from(new Set(placements.map(p => p.school_id)));
    let syncedCount = 0;
    const errors: string[] = [];

    // Process each student sequentially (continue-on-error pattern)
    for (const schoolId of uniqueSchoolIds) {
      try {
        await syncTrespassTrackerExpiration(schoolId);
        syncedCount++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to sync ${schoolId}: ${errorMsg}`);
        console.warn(`[TT Batch Sync] Error syncing ${schoolId}:`, err);
      }
    }

    // Audit log (AC 2.13.6)
    await logAuditEvent({
      eventType: 'system.batch_sync',
      module: 'daep_management',
      actorId: user.id,
      action: `Batch synced TrespassTracker for ${syncedCount} students`,
      tenantId,
      details: {
        synced_count: syncedCount,
        error_count: errors.length,
        total_students: uniqueSchoolIds.length,
      },
    });

    // Revalidate paths
    revalidatePath('/daep/students');

    console.log(`[TT Batch Sync] Complete: ${syncedCount}/${uniqueSchoolIds.length} synced, ${errors.length} errors`);

    return {
      success: errors.length === 0,
      synced_count: syncedCount,
      errors,
    };
  } catch (err) {
    console.error('[TT Batch Sync] Error:', err);
    return {
      success: false,
      synced_count: 0,
      errors: [err instanceof Error ? err.message : 'An unexpected error occurred'],
    };
  }
}

// ========== GET PLACEMENT TRANSITIONS HISTORY ==========

export interface PlacementTransition {
  id: string;
  from_status: PlacementStatus | null;
  to_status: PlacementStatus;
  transition_reason: string | null;
  transitioned_by: string;
  transitioned_at: string;
  notes: string | null;
}

/**
 * Get transition history for a placement
 */
export async function getPlacementTransitions(
  placementId: string
): Promise<PlacementTransition[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_placement_transitions')
    .select('id, from_status, to_status, transition_reason, transitioned_by, transitioned_at, notes')
    .eq('tenant_id', tenantId)
    .eq('placement_id', placementId)
    .order('transitioned_at', { ascending: false });

  if (error) {
    console.error('Error fetching transitions:', error);
    return [];
  }

  return (data || []) as PlacementTransition[];
}

// ========== GET PLACEMENT FOR EDIT (Story 2-8) ==========

export interface PlacementForEdit {
  id: string;
  school_id: string;
  student_name: string;
  status: PlacementStatus;
  days_assigned: number;
  days_served: number;
  days_remaining: number;
  start_date: string | null;
  expected_end_date: string | null;
  placement_date: string;
  placement_reason: string | null;
  offense_code: string | null;
  assigned_room_id: string | null;
  intake_notes: string | null;
  completion_notes: string | null;
  transition_meeting_date: string | null; // Story 2-9: for transition workflow
  home_campus: {
    id: string;
    name: string;
  } | null;
  assigned_room: {
    id: string;
    room_number: string;
    room_name: string | null;
  } | null;
}

/**
 * Get placement details for editing
 * Story 2-8: AC 2.8.1
 */
export async function getPlacementForEdit(
  placementId: string
): Promise<PlacementForEdit | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Fetch placement with correct FK hint syntax for ambiguous relations
  const { data, error } = await supabase
    .from('daep_placements')
    .select(`
      id,
      school_id,
      status,
      days_assigned,
      days_served,
      days_remaining,
      start_date,
      expected_end_date,
      placement_date,
      placement_reason,
      offense_code,
      assigned_room_id,
      intake_notes,
      completion_notes,
      transition_meeting_date,
      home_campus:campuses!fk_daep_placements_home_campus(id, name),
      assigned_room:daep_rooms!daep_placements_assigned_room_id_fkey(id, room_number, room_name)
    `)
    .eq('id', placementId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    console.error('Error fetching placement for edit:', error);
    return null;
  }

  // Fetch student name separately (no FK relationship exists)
  const { data: studentData } = await supabase
    .from('trespass_records')
    .select('first_name, last_name')
    .eq('school_id', data.school_id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const studentName = studentData
    ? `${studentData.first_name} ${studentData.last_name}`
    : 'Unknown Student';

  // Extract nested relations (handle potential array from Supabase)
  const homeCampusRaw = data.home_campus as { id: string; name: string } | { id: string; name: string }[] | null;
  const homeCampus = Array.isArray(homeCampusRaw) ? homeCampusRaw[0] || null : homeCampusRaw;

  const assignedRoomRaw = data.assigned_room as { id: string; room_number: string; room_name: string | null } | { id: string; room_number: string; room_name: string | null }[] | null;
  const assignedRoom = Array.isArray(assignedRoomRaw) ? assignedRoomRaw[0] || null : assignedRoomRaw;

  return {
    id: data.id,
    school_id: data.school_id,
    student_name: studentName,
    status: data.status as PlacementStatus,
    days_assigned: data.days_assigned,
    days_served: data.days_served || 0,
    days_remaining: data.days_remaining || 0,
    start_date: data.start_date,
    expected_end_date: data.expected_end_date,
    placement_date: data.placement_date,
    placement_reason: data.placement_reason,
    offense_code: data.offense_code,
    assigned_room_id: data.assigned_room_id,
    intake_notes: data.intake_notes,
    completion_notes: data.completion_notes,
    transition_meeting_date: data.transition_meeting_date || null,
    home_campus: homeCampus || null,
    assigned_room: assignedRoom || null,
  };
}

// ========== UPDATE PLACEMENT (Story 2-8) ==========

export interface UpdatePlacementResult {
  success: boolean;
  error?: string;
}

/**
 * Update placement details
 * Story 2-8: AC 2.8.2, 2.8.3, 2.8.4, 2.8.6, 2.8.7
 */
export async function updatePlacement(
  input: UpdatePlacementInput
): Promise<UpdatePlacementResult> {
  const user = await currentUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate input (AC 2.8.7)
  const validation = UpdatePlacementSchema.safeParse(input);
  if (!validation.success) {
    const firstError = validation.error.errors[0];
    return { success: false, error: firstError.message };
  }

  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  try {
    // 1. Get current placement
    const { data: placement, error: fetchError } = await supabase
      .from('daep_placements')
      .select('id, school_id, status, days_assigned, days_served, start_date, assigned_room_id, expected_end_date')
      .eq('id', input.id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !placement) {
      return { success: false, error: 'Placement not found' };
    }

    // 2. Build update object only for changed fields
    const updates: Record<string, unknown> = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    // Check days_assigned change (AC 2.8.3)
    if (input.days_assigned !== undefined && input.days_assigned !== placement.days_assigned) {
      updates.days_assigned = input.days_assigned;
      changes.days_assigned = { from: placement.days_assigned, to: input.days_assigned };

      // Recalculate days_remaining and expected_end_date
      const newDaysRemaining = Math.max(0, input.days_assigned - (placement.days_served || 0));
      updates.days_remaining = newDaysRemaining;

      // Recalculate expected end date if start_date exists
      if (placement.start_date) {
        const newEndDate = await calculateExpectedEndDate(
          tenantId,
          placement.start_date,
          input.days_assigned
        );
        updates.expected_end_date = newEndDate;
        changes.expected_end_date = { from: placement.expected_end_date, to: newEndDate };
      }
    }

    // Check room assignment change (AC 2.8.4)
    if (input.assigned_room_id !== undefined && input.assigned_room_id !== placement.assigned_room_id) {
      // Validate room availability using separation constraints
      if (input.assigned_room_id) {
        const { getAvailableRoomsForStudent } = await import('./rooms');
        const availableRooms = await getAvailableRoomsForStudent(placement.school_id, placement.id);
        const selectedRoom = availableRooms.find(r => r.id === input.assigned_room_id);

        if (!selectedRoom) {
          return { success: false, error: 'Selected room is not available' };
        }
        if (!selectedRoom.is_available) {
          // Check if blocked due to separation
          if (selectedRoom.blocked_reason?.startsWith('Separation:')) {
            return { success: false, error: 'Cannot assign to this room due to student separation conflict' };
          }
          return { success: false, error: selectedRoom.blocked_reason || 'Room is not available' };
        }
      }

      updates.assigned_room_id = input.assigned_room_id;
      changes.assigned_room_id = { from: placement.assigned_room_id, to: input.assigned_room_id };
    }

    // Check other fields
    if (input.intake_notes !== undefined && input.intake_notes !== null) {
      updates.intake_notes = input.intake_notes;
      changes.intake_notes = { from: 'previous', to: 'updated' };
    }

    if (input.completion_notes !== undefined && input.completion_notes !== null) {
      updates.completion_notes = input.completion_notes;
      changes.completion_notes = { from: 'previous', to: 'updated' };
    }

    if (input.placement_reason !== undefined) {
      updates.placement_reason = input.placement_reason;
      changes.placement_reason = { from: 'previous', to: 'updated' };
    }

    if (input.offense_code !== undefined) {
      updates.offense_code = input.offense_code;
      changes.offense_code = { from: 'previous', to: input.offense_code };
    }

    // 3. Skip if no changes
    if (Object.keys(updates).length === 0) {
      return { success: true };
    }

    // 4. Update placement
    const { error: updateError } = await supabase
      .from('daep_placements')
      .update(updates)
      .eq('id', input.id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error updating placement:', updateError);
      return { success: false, error: 'Failed to update placement' };
    }

    // 5. Log audit event (AC 2.8.6)
    await logAuditEvent({
      eventType: 'placement.updated',
      module: 'daep_management',
      actorId: user.id,
      targetId: input.id,
      action: 'Updated placement details',
      recordSchoolId: placement.school_id,
      tenantId,
      details: {
        changes,
        fields_updated: Object.keys(changes),
      },
    });

    // 6. Sync TrespassTracker if expected_end_date changed (AC 2.13.2)
    if (changes.expected_end_date) {
      await syncTrespassTrackerExpiration(placement.school_id);
    }

    // 7. Revalidate paths
    revalidatePath(`/daep/students/${placement.school_id}`);
    revalidatePath(`/daep/placements/${input.id}`);
    revalidatePath('/daep/students');

    return { success: true };
  } catch (err) {
    console.error('Error in updatePlacement:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// ========== INITIATE TRANSITION (Story 2-9, AC 2.9.1-2.9.4) ==========

export interface InitiateTransitionResult {
  success: boolean;
  error?: string;
}

/**
 * Initiate transition process - schedules meeting, creates notifications
 * AC 2.9.1: Available when status = 'met'
 * AC 2.9.2: Captures meeting date
 * AC 2.9.3: Captures campus contact person
 * AC 2.9.4: Creates in-app notification for home campus admins
 */
export async function initiateTransition(
  input: InitiateTransitionInput
): Promise<InitiateTransitionResult> {
  const supabase = await createServerClient();
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate input
  const validation = InitiateTransitionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const tenantId = await getTenantId();

  try {
    // 1. Get placement with student info
    const { data: placement, error: fetchError } = await supabase
      .from('daep_placements')
      .select('id, school_id, status, home_campus_id')
      .eq('id', input.placement_id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !placement) {
      return { success: false, error: 'Placement not found' };
    }

    // 2. Validate placement is in 'met' status (AC 2.9.1)
    if (placement.status !== 'met') {
      return { success: false, error: 'Can only initiate transition for placements in met status' };
    }

    // 3. Validate meeting date is in the future (AC 2.9.2)
    const meetingDate = new Date(input.transition_meeting_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (meetingDate < today) {
      return { success: false, error: 'Meeting date must be today or in the future' };
    }

    // 4. Get student name for notifications
    const { data: student } = await supabase
      .from('trespass_records')
      .select('first_name, last_name')
      .eq('school_id', placement.school_id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const studentName = student
      ? `${student.first_name} ${student.last_name}`
      : `Student ${placement.school_id}`;

    // 5. Update placement with transition meeting info (status stays 'met')
    const { error: updateError } = await supabase
      .from('daep_placements')
      .update({
        transition_requested_date: new Date().toISOString().split('T')[0],
        transition_meeting_date: input.transition_meeting_date,
      })
      .eq('id', input.placement_id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error updating placement for transition:', updateError);
      return { success: false, error: 'Failed to initiate transition' };
    }

    // 6. Log transition event (meeting scheduled, not status change)
    await supabase
      .from('daep_placement_transitions')
      .insert({
        tenant_id: tenantId,
        placement_id: input.placement_id,
        from_status: 'met',
        to_status: 'met', // Status unchanged, logging meeting scheduled
        transition_reason: `Transition meeting scheduled for ${input.transition_meeting_date}`,
        transitioned_by: user.id,
        notes: `Contact: ${input.campus_contact_name}${input.campus_contact_email ? ` (${input.campus_contact_email})` : ''}${input.notes ? `. Notes: ${input.notes}` : ''}`,
      });

    // 7. Create notifications for HOME CAMPUS ADMINS ONLY (AC 2.9.4)
    // MVP: Hardcoded to 'campus_admin' role. Future: configurable per-campus.
    const { data: homeCampusAdmins } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('campus_id', placement.home_campus_id) // CRITICAL: Only this campus
      .eq('role', 'campus_admin')               // MVP: hardcoded role
      .is('deleted_at', null);

    if (homeCampusAdmins && homeCampusAdmins.length > 0) {
      const notifications = homeCampusAdmins.map((admin) => ({
        tenant_id: tenantId,
        user_id: admin.id, // Recipient (NOT created_by)
        notification_type: 'transition_meeting',
        title: 'DAEP Transition Meeting Scheduled',
        message: `Transition meeting for ${studentName} scheduled for ${input.transition_meeting_date}. Contact: ${input.campus_contact_name}`,
        related_school_id: placement.school_id,
        related_placement_id: placement.id,
        action_url: `/daep/students/${placement.school_id}`,
      }));

      const { error: notifError } = await supabase
        .from('daep_notifications')
        .insert(notifications);

      if (notifError) {
        // Don't fail the operation, just log warning (per NFR: notification failure doesn't block)
        console.warn('Failed to create transition notifications:', notifError);
      }
    }

    // 8. Audit log
    await logAuditEvent({
      eventType: 'placement.updated',
      module: 'daep_management',
      actorId: user.id,
      targetId: input.placement_id,
      action: `Initiated transition for ${studentName}`,
      recordSubjectName: studentName,
      recordSchoolId: placement.school_id,
      tenantId,
      details: {
        transition_meeting_date: input.transition_meeting_date,
        campus_contact: input.campus_contact_name,
        campus_contact_email: input.campus_contact_email,
      },
    });

    // 9. Revalidate paths
    revalidatePath('/daep/students');
    revalidatePath(`/daep/students/${placement.school_id}`);
    revalidatePath(`/daep/placements/${input.placement_id}`);

    return { success: true };
  } catch (err) {
    console.error('Error in initiateTransition:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// ========== COMPLETE TRANSITION (Story 2-9, AC 2.9.5-2.9.8) ==========

export interface CompleteTransitionResult {
  success: boolean;
  error?: string;
}

/**
 * Complete transition - confirms meeting occurred and student returned
 * AC 2.9.5: Requires meeting confirmation
 * AC 2.9.6: Requires first day back date
 * AC 2.9.7: Status moves to 'complete'
 * AC 2.9.8: TrespassTracker is_daep flag updated
 */
export async function completeTransition(
  input: CompleteTransitionInput
): Promise<CompleteTransitionResult> {
  const supabase = await createServerClient();
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate input
  const validation = CompleteTransitionSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const tenantId = await getTenantId();

  try {
    // 1. Get placement
    const { data: placement, error: fetchError } = await supabase
      .from('daep_placements')
      .select('id, school_id, status, transition_meeting_date')
      .eq('id', input.placement_id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !placement) {
      return { success: false, error: 'Placement not found' };
    }

    // 2. Validate placement is in 'met' status
    if (placement.status !== 'met') {
      return { success: false, error: 'Can only complete transition for placements in met status' };
    }

    // 3. Validate meeting confirmation (AC 2.9.5)
    if (!input.meeting_confirmed) {
      return { success: false, error: 'Must confirm transition meeting occurred' };
    }

    // 4. Get student name for audit
    const { data: student } = await supabase
      .from('trespass_records')
      .select('first_name, last_name')
      .eq('school_id', placement.school_id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const studentName = student
      ? `${student.first_name} ${student.last_name}`
      : `Student ${placement.school_id}`;

    // 5. Update placement to complete (AC 2.9.7)
    const { error: updateError } = await supabase
      .from('daep_placements')
      .update({
        status: 'complete',
        first_day_back_date: input.first_day_back_date,
        actual_end_date: new Date().toISOString().split('T')[0],
        completion_notes: input.completion_notes || null,
      })
      .eq('id', input.placement_id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error completing transition:', updateError);
      return { success: false, error: 'Failed to complete transition' };
    }

    // 6. Log transition (met → complete)
    await supabase
      .from('daep_placement_transitions')
      .insert({
        tenant_id: tenantId,
        placement_id: input.placement_id,
        from_status: 'met',
        to_status: 'complete',
        transition_reason: 'Student returned to home campus',
        transitioned_by: user.id,
        notes: `First day back: ${input.first_day_back_date}${input.completion_notes ? `. Notes: ${input.completion_notes}` : ''}`,
      });

    // 7. Sync TrespassTracker (AC 2.9.8, AC 2.13.4)
    await syncTrespassTrackerExpiration(placement.school_id);

    // 8. Audit log
    await logAuditEvent({
      eventType: 'placement.updated',
      module: 'daep_management',
      actorId: user.id,
      targetId: input.placement_id,
      action: `Completed placement for ${studentName}`,
      recordSubjectName: studentName,
      recordSchoolId: placement.school_id,
      tenantId,
      details: {
        first_day_back_date: input.first_day_back_date,
        meeting_confirmed: true,
        transition_meeting_date: placement.transition_meeting_date,
      },
    });

    // 9. Revalidate paths
    revalidatePath('/daep/students');
    revalidatePath(`/daep/students/${placement.school_id}`);
    revalidatePath(`/daep/placements/${input.placement_id}`);

    return { success: true };
  } catch (err) {
    console.error('Error in completeTransition:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

// ========== GET PLACEMENT WITH TRANSITION INFO ==========

export interface PlacementTransitionInfo {
  id: string;
  status: PlacementStatus;
  days_remaining: number;
  transition_meeting_date: string | null;
  transition_requested_date: string | null;
}

/**
 * Get placement info needed for transition workflow
 * Used by StatusTransitionActions to determine which buttons to show
 */
export async function getPlacementTransitionInfo(
  placementId: string
): Promise<PlacementTransitionInfo | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_placements')
    .select('id, status, days_remaining, transition_meeting_date, transition_requested_date')
    .eq('id', placementId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    status: data.status as PlacementStatus,
    days_remaining: data.days_remaining || 0,
    transition_meeting_date: data.transition_meeting_date,
    transition_requested_date: data.transition_requested_date,
  };
}

// ========== NO-SHOW FLAG (Story 2-12) ==========

export interface MarkNoShowResult {
  success: boolean;
  error?: string;
}

/**
 * Mark a placement as no-show - student hasn't shown up yet
 * Sets no_show flag for reporting/Kanban board, status stays unchanged
 * Student can be rescheduled while flagged as no-show
 */
export async function markNoShow(
  input: MarkNoShowInput
): Promise<MarkNoShowResult> {
  const supabase = await createServerClient();
  const user = await currentUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate input
  const validation = MarkNoShowSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const tenantId = await getTenantId();

  try {
    // 1. Get placement
    const { data: placement, error: fetchError } = await supabase
      .from('daep_placements')
      .select('id, school_id, status')
      .eq('id', input.placement_id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !placement) {
      return { success: false, error: 'Placement not found' };
    }

    // 2. Validate placement is in pending or active status
    if (placement.status !== 'pending' && placement.status !== 'active') {
      return { success: false, error: 'Can only mark no-show for pending or active placements' };
    }

    // 3. Get student name for audit
    const { data: student } = await supabase
      .from('trespass_records')
      .select('first_name, last_name')
      .eq('school_id', placement.school_id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const studentName = student
      ? `${student.first_name} ${student.last_name}`
      : `Student ${placement.school_id}`;

    // 4. Update placement - only set no_show flag, keep status unchanged
    const { error: updateError } = await supabase
      .from('daep_placements')
      .update({
        no_show: true,
      })
      .eq('id', input.placement_id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error marking no-show:', updateError);
      return { success: false, error: 'Failed to mark as no-show' };
    }

    // 5. Audit log
    await logAuditEvent({
      eventType: 'placement.no_show',
      module: 'daep_management',
      actorId: user.id,
      targetId: input.placement_id,
      action: `Marked placement as no-show for ${studentName}`,
      recordSubjectName: studentName,
      recordSchoolId: placement.school_id,
      tenantId,
      details: {
        reason: input.reason || null,
        status: placement.status,
      },
    });

    // 6. Revalidate paths
    revalidatePath('/daep/students');
    revalidatePath(`/daep/students/${placement.school_id}`);
    revalidatePath(`/daep/placements/${input.placement_id}`);

    return { success: true };
  } catch (err) {
    console.error('Error in markNoShow:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}


/**
 * Get count of no-show placements for dashboard indicator
 * Returns count of placements where no_show=true and status='complete'
 */
export async function getNoShowCount(): Promise<number> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { count, error } = await supabase
    .from('daep_placements')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'complete')
    .eq('no_show', true);

  if (error) {
    console.error('Error getting no-show count:', error);
    return 0;
  }

  return count || 0;
}
