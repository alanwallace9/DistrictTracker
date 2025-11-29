'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import {
  StudentSearchSchema,
  type StudentSearchInput,
  type PlacementStatus,
} from '@/lib/validation/schemas';

// ========== TYPES FOR STUDENT LIST ==========

export interface DAEPStudent {
  school_id: string;
  first_name: string;
  last_name: string;
  current_school: string | null;
  grade_level: number | null;
  is_daep: boolean;
  placement?: DAEPPlacementSummary | null;
}

export interface DAEPPlacementSummary {
  id: string;
  status: PlacementStatus;
  days_assigned: number;
  days_served: number;
  days_remaining: number | null;
  start_date: string;
  expected_end_date: string | null;
  room?: { id: string; room_number: string; room_name: string | null } | null;
  home_campus?: { id: string; name: string } | null;
}

export interface DAEPStudentListResult {
  students: DAEPStudent[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ========== TYPES FOR STUDENT PROFILE (Story 2-2) ==========

export interface StudentProfile {
  // Demographics (from trespass_records)
  school_id: string;
  first_name: string;
  last_name: string;
  aka: string | null; // Also Known As / nickname
  date_of_birth: string | null;
  grade_level: number | null;
  current_school: string | null;

  // Contact info
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  parent_email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;

  // Special flags
  is_current_student: boolean;
  is_daep: boolean;
  special_education: boolean;
  plan_504: boolean;
  ell_status: boolean;

  // Photo (future)
  photo_url: string | null;
}

export interface PlacementDetail {
  id: string;
  incident_number: string;
  placement_date: string;
  start_date: string;
  days_assigned: number;
  days_served: number;
  days_remaining: number;
  expected_end_date: string | null;
  actual_end_date: string | null;
  status: PlacementStatus;
  offense_code: string;
  offense_label: string | null;
  placement_reason: string;
  mandatory_placement: boolean;

  // Relations
  home_campus: { id: string; name: string } | null;
  assigned_room: { id: string; room_number: string; room_name: string | null } | null;

  // Transition info
  transition_requested_date: string | null;
  transition_meeting_date: string | null;
  first_day_back_date: string | null;
  transition_complete: boolean;

  // Flags
  rollover_student: boolean;
  no_show: boolean;
  assessment_90day_required: boolean;
  assessment_90day_date: string | null;

  // Notes
  intake_notes: string | null;
  completion_notes: string | null;

  created_at: string;
}

export interface StudentProfileResult {
  student: StudentProfile;
  currentPlacement: PlacementDetail | null;
  placementHistory: PlacementDetail[];
}

// ========== TYPES FOR TRESPASSTRACKER STATUS (Story 2-3) ==========

export interface TrespassTrackerStatusResult {
  hasRecord: boolean;
  recordCount: number;
  isDAEP: boolean;
  daepExpirationDate: string | null;
  trespassStatus: 'active' | 'inactive' | 'expired' | null;
  trespassExpirationDate: string | null;
  mostRecentIncident: {
    id: string;
    description: string | null;
    incident_date: string | null;
    created_at: string;
  } | null;
}

// ========== HELPER ==========

// Helper to get effective tenant_id from database (matches RLS get_my_tenant_id())
async function getTenantId(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('tenant_id, active_tenant_id')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  return effectiveTenantId;
}

// ========== GET DAEP STUDENTS ==========

export async function getDAEPStudents(
  input: Partial<StudentSearchInput> = {}
): Promise<DAEPStudentListResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Validate and set defaults
  const validation = StudentSearchSchema.safeParse({
    ...input,
    page: input.page ?? 1,
    per_page: input.per_page ?? 25,
  });

  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.errors[0].message}`);
  }

  const { query, status, room_id, date_from, date_to, page, per_page } = validation.data;
  const offset = (page - 1) * per_page;

  // Build the query for placements with joins
  let placementsQuery = supabase
    .from('daep_placements')
    .select(
      `
      id,
      school_id,
      status,
      days_assigned,
      days_served,
      days_remaining,
      start_date,
      expected_end_date,
      assigned_room_id,
      home_campus_id,
      room:daep_rooms(id, room_number, room_name),
      home_campus:campuses!fk_daep_placements_home_campus(id, name)
    `,
      { count: 'exact' }
    )
    .eq('tenant_id', tenantId);

  // Apply filters
  if (status) {
    placementsQuery = placementsQuery.eq('status', status);
  }

  if (room_id) {
    placementsQuery = placementsQuery.eq('assigned_room_id', room_id);
  }

  if (date_from) {
    placementsQuery = placementsQuery.gte('start_date', date_from);
  }

  if (date_to) {
    placementsQuery = placementsQuery.lte('start_date', date_to);
  }

  // Execute placements query
  const { data: placements, error: placementsError, count } = await placementsQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  if (placementsError) {
    console.error('Error fetching DAEP placements:', placementsError);
    throw new Error('Failed to fetch student placements');
  }

  if (!placements || placements.length === 0) {
    return {
      students: [],
      total: 0,
      page,
      per_page,
      total_pages: 0,
    };
  }

  // Get unique school_ids from placements
  const schoolIds = Array.from(new Set(placements.map((p) => p.school_id)));

  // Fetch student demographics from trespass_records
  let studentsQuery = supabase
    .from('trespass_records')
    .select('school_id, first_name, last_name, current_school, grade_level, is_daep')
    .eq('tenant_id', tenantId)
    .in('school_id', schoolIds);

  // Apply search query if provided
  if (query && query.trim()) {
    const searchTerm = query.trim().toLowerCase();
    // Search by name or school_id
    studentsQuery = studentsQuery.or(
      `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,school_id.ilike.%${searchTerm}%,current_school.ilike.%${searchTerm}%`
    );
  }

  const { data: students, error: studentsError } = await studentsQuery;

  if (studentsError) {
    console.error('Error fetching student records:', studentsError);
    throw new Error('Failed to fetch student records');
  }

  // Create a map of school_id to student
  const studentMap = new Map(students?.map((s) => [s.school_id, s]) || []);

  // Helper to extract single relation from Supabase array result
  const extractRelation = <T>(rel: T | T[] | null): T | null => {
    if (Array.isArray(rel)) return rel[0] || null;
    return rel;
  };

  // Combine placements with student data
  const result: DAEPStudent[] = [];
  for (const placement of placements) {
    const student = studentMap.get(placement.school_id);
    if (!student) continue;

    const room = extractRelation(placement.room);
    const homeCampus = extractRelation(placement.home_campus);

    result.push({
      school_id: student.school_id,
      first_name: student.first_name,
      last_name: student.last_name,
      current_school: student.current_school,
      grade_level: student.grade_level,
      is_daep: student.is_daep,
      placement: {
        id: placement.id,
        status: placement.status as PlacementStatus,
        days_assigned: placement.days_assigned,
        days_served: placement.days_served,
        days_remaining: placement.days_remaining,
        start_date: placement.start_date,
        expected_end_date: placement.expected_end_date,
        room: room as DAEPPlacementSummary['room'],
        home_campus: homeCampus as DAEPPlacementSummary['home_campus'],
      },
    });
  }

  // If search query was applied, we need to filter again and recalculate counts
  let filteredResult = result;
  if (query && query.trim()) {
    const searchTerm = query.trim().toLowerCase();
    filteredResult = result.filter(
      (s) =>
        s.first_name.toLowerCase().includes(searchTerm) ||
        s.last_name.toLowerCase().includes(searchTerm) ||
        s.school_id.toLowerCase().includes(searchTerm) ||
        s.current_school?.toLowerCase().includes(searchTerm)
    );
  }

  const total = count || 0;

  return {
    students: filteredResult,
    total,
    page,
    per_page,
    total_pages: Math.ceil(total / per_page),
  };
}

// ========== SEARCH STUDENTS ==========

export async function searchStudents(searchQuery: string): Promise<DAEPStudent[]> {
  if (!searchQuery || searchQuery.trim().length < 2) {
    return [];
  }

  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const searchTerm = searchQuery.trim().toLowerCase();

  // Search trespass_records for students
  const { data: students, error } = await supabase
    .from('trespass_records')
    .select('school_id, first_name, last_name, current_school, grade_level, is_daep')
    .eq('tenant_id', tenantId)
    .or(
      `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,school_id.ilike.%${searchTerm}%`
    )
    .limit(20);

  if (error) {
    console.error('Error searching students:', error);
    throw new Error('Failed to search students');
  }

  if (!students || students.length === 0) {
    return [];
  }

  // Get active placements for these students
  const schoolIds = students.map((s) => s.school_id);
  const { data: placements } = await supabase
    .from('daep_placements')
    .select(
      `
      id,
      school_id,
      status,
      days_assigned,
      days_served,
      days_remaining,
      start_date,
      expected_end_date,
      room:daep_rooms(id, room_number, room_name),
      home_campus:campuses!fk_daep_placements_home_campus(id, name)
    `
    )
    .eq('tenant_id', tenantId)
    .in('school_id', schoolIds)
    .in('status', ['pending', 'active', 'transition']);

  // Helper to extract single relation from Supabase array result
  const extractRelation = <T>(rel: T | T[] | null): T | null => {
    if (Array.isArray(rel)) return rel[0] || null;
    return rel;
  };

  // Create placement map
  const placementMap = new Map(placements?.map((p) => [p.school_id, p]) || []);

  return students.map((student) => {
    const placement = placementMap.get(student.school_id);

    if (!placement) {
      return {
        school_id: student.school_id,
        first_name: student.first_name,
        last_name: student.last_name,
        current_school: student.current_school,
        grade_level: student.grade_level,
        is_daep: student.is_daep,
        placement: null,
      };
    }

    const room = extractRelation(placement.room);
    const homeCampus = extractRelation(placement.home_campus);

    return {
      school_id: student.school_id,
      first_name: student.first_name,
      last_name: student.last_name,
      current_school: student.current_school,
      grade_level: student.grade_level,
      is_daep: student.is_daep,
      placement: {
        id: placement.id,
        status: placement.status as PlacementStatus,
        days_assigned: placement.days_assigned,
        days_served: placement.days_served,
        days_remaining: placement.days_remaining,
        start_date: placement.start_date,
        expected_end_date: placement.expected_end_date,
        room: room as DAEPPlacementSummary['room'],
        home_campus: homeCampus as DAEPPlacementSummary['home_campus'],
      },
    };
  });
}

// ========== GET AVAILABLE ROOMS FOR FILTER ==========

export async function getDAEPRoomsForFilter(): Promise<
  { id: string; room_number: string; room_name: string | null }[]
> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_rooms')
    .select('id, room_number, room_name')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('room_number');

  if (error) {
    console.error('Error fetching rooms for filter:', error);
    throw new Error('Failed to fetch rooms');
  }

  return data || [];
}

// ========== GET STUDENT PROFILE (Story 2-2) ==========

/**
 * Get complete student profile with demographics, current placement, and history
 * FR9: View student profiles with demographics
 * FR14: Display current placement status
 * FR16: View placement history
 */
export async function getStudentProfile(schoolId: string): Promise<StudentProfileResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // 1. Get student demographics from trespass_records
  const { data: student, error: studentError } = await supabase
    .from('trespass_records')
    .select(`
      school_id,
      first_name,
      last_name,
      aka,
      date_of_birth,
      grade_level,
      current_school,
      guardian_first_name,
      guardian_last_name,
      guardian_phone,
      parent_email,
      emergency_contact_name,
      emergency_contact_phone,
      is_current_student,
      is_daep,
      special_education,
      plan_504,
      ell_status
    `)
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .is('deleted_at', null)
    .single();

  if (studentError || !student) {
    throw new Error('Student not found');
  }

  // 2. Get all placements for this student
  const { data: placements, error: placementsError } = await supabase
    .from('daep_placements')
    .select(`
      id,
      incident_number,
      placement_date,
      start_date,
      days_assigned,
      days_served,
      days_remaining,
      expected_end_date,
      actual_end_date,
      status,
      offense_code,
      placement_reason,
      mandatory_placement,
      home_campus_id,
      assigned_room_id,
      transition_requested_date,
      transition_meeting_date,
      first_day_back_date,
      rollover_student,
      no_show,
      assessment_90day_required,
      assessment_90day_date,
      intake_notes,
      completion_notes,
      created_at,
      home_campus:campuses!fk_daep_placements_home_campus(id, name),
      assigned_room:daep_rooms(id, room_number, room_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .order('start_date', { ascending: false });

  if (placementsError) {
    throw new Error('Failed to fetch placements');
  }

  // 3. Get discipline code labels for all offense codes
  const offenseCodes = Array.from(new Set(placements?.map((p) => p.offense_code) || []));
  let codeMap = new Map<string, string>();

  if (offenseCodes.length > 0) {
    const { data: codes } = await supabase
      .from('daep_discipline_codes')
      .select('code, label')
      .eq('tenant_id', tenantId)
      .in('code', offenseCodes);

    codeMap = new Map(codes?.map((c) => [c.code, c.label]) || []);
  }

  // 4. Transform placements
  const extractRelation = <T>(rel: T | T[] | null): T | null => {
    if (Array.isArray(rel)) return rel[0] || null;
    return rel;
  };

  const transformedPlacements: PlacementDetail[] = (placements || []).map((p) => ({
    id: p.id,
    incident_number: p.incident_number,
    placement_date: p.placement_date,
    start_date: p.start_date,
    days_assigned: p.days_assigned,
    days_served: p.days_served,
    days_remaining: p.days_remaining,
    expected_end_date: p.expected_end_date,
    actual_end_date: p.actual_end_date,
    status: p.status as PlacementStatus,
    offense_code: p.offense_code,
    offense_label: codeMap.get(p.offense_code) || null,
    placement_reason: p.placement_reason,
    mandatory_placement: p.mandatory_placement,
    home_campus: extractRelation(p.home_campus) as PlacementDetail['home_campus'],
    assigned_room: extractRelation(p.assigned_room) as PlacementDetail['assigned_room'],
    transition_requested_date: p.transition_requested_date,
    transition_meeting_date: p.transition_meeting_date,
    first_day_back_date: p.first_day_back_date,
    transition_complete: !!p.first_day_back_date,
    rollover_student: p.rollover_student,
    no_show: p.no_show,
    assessment_90day_required: p.assessment_90day_required,
    assessment_90day_date: p.assessment_90day_date,
    intake_notes: p.intake_notes,
    completion_notes: p.completion_notes,
    created_at: p.created_at,
  }));

  // 5. Identify current placement (first non-complete)
  const currentPlacement =
    transformedPlacements.find((p) =>
      ['pending', 'active', 'transition'].includes(p.status)
    ) || null;

  // 6. History is all placements (including current for display in history tab)
  const placementHistory = transformedPlacements;

  return {
    student: {
      ...student,
      photo_url: null, // Future: photo storage
    },
    currentPlacement,
    placementHistory,
  };
}

// ========== GET TRESPASSTRACKER STATUS (Story 2-3) ==========

/**
 * Get TrespassTracker status for a student
 * FR15: Show TrespassTracker status for students with active trespass records
 * FR76: View TT status from DAEP profile
 */
export async function getTrespassTrackerStatus(
  schoolId: string
): Promise<TrespassTrackerStatusResult> {
  if (!schoolId || schoolId.trim().length === 0) {
    throw new Error('Student ID is required');
  }

  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get all trespass records for student
  const { data: records, error } = await supabase
    .from('trespass_records')
    .select(`
      id,
      is_daep,
      daep_expiration_date,
      status,
      expiration_date,
      description,
      incident_date,
      created_at
    `)
    .eq('tenant_id', tenantId)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching TrespassTracker status:', error);
    throw new Error('Failed to fetch TrespassTracker status');
  }

  if (!records || records.length === 0) {
    return {
      hasRecord: false,
      recordCount: 0,
      isDAEP: false,
      daepExpirationDate: null,
      trespassStatus: null,
      trespassExpirationDate: null,
      mostRecentIncident: null,
    };
  }

  // Most recent record
  const latest = records[0];

  return {
    hasRecord: true,
    recordCount: records.length,
    isDAEP: latest.is_daep || false,
    daepExpirationDate: latest.daep_expiration_date,
    trespassStatus: latest.status as 'active' | 'inactive' | 'expired',
    trespassExpirationDate: latest.expiration_date,
    mostRecentIncident: {
      id: latest.id,
      description: latest.description,
      incident_date: latest.incident_date,
      created_at: latest.created_at,
    },
  };
}
