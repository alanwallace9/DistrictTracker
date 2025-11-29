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
  type PlacementStatus,
} from '@/lib/validation/schemas';
import { calculateExpectedEndDate } from '@/lib/daep/days-remaining';
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
    .in('status', ['pending', 'active', 'transition']);

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
    .single();

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
    .in('status', ['pending', 'active', 'transition']);

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
      .limit(1)
      .single();

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

    // 7. Update trespass_record is_daep flag
    await supabase
      .from('trespass_records')
      .update({
        is_daep: true,
        daep_expiration_date: expectedEndDate,
      })
      .eq('tenant_id', tenantId)
      .eq('school_id', data.school_id);

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
      .single();

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
