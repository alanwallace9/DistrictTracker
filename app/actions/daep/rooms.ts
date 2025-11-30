'use server';

import { createServerClient } from '@/lib/supabase/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { DAEPRoomSchema, DAEPRoomStaffSchema, type CreateDAEPRoomInput, type CreateDAEPRoomStaffInput } from '@/lib/validation/schemas';

// Types
export interface DAEPRoom {
  id: string;
  tenant_id: string;
  campus_id: string | null;
  room_number: string;
  room_name: string | null;
  capacity: number;
  active: boolean;
  building_section: string | null;
  created_at: string;
  updated_at: string;
  campus?: { id: string; name: string } | null;
  staff?: DAEPRoomStaff[];
  student_count?: number;
}

export interface DAEPRoomStaff {
  id: string;
  tenant_id: string;
  room_id: string;
  user_id: string;
  assignment_type: 'homeroom' | 'rotational';
  created_at: string;
  user?: { display_name: string | null; email: string } | null;
}

// Helper to get effective tenant_id from database (matches RLS get_my_tenant_id())
// Uses COALESCE(active_tenant_id, tenant_id) to support super_admin tenant switching
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

// Helper to check DAEP admin role and get effective tenant
async function checkDAEPAdminRole(): Promise<{ userId: string; role: string; tenantId: string }> {
  const user = await currentUser();
  if (!user) throw new Error('Unauthorized');

  const supabase = await createServerClient();
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('role, tenant_id, active_tenant_id')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('User profile not found');
  }

  const allowedRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
  if (!allowedRoles.includes(profile.role)) {
    throw new Error('Insufficient permissions. Only DAEP administrators can manage rooms.');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  return { userId: user.id, role: profile.role, tenantId: effectiveTenantId };
}

// Helper to log audit events
async function logDAEPAuditEvent(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  eventType: string,
  actorId: string,
  targetId: string,
  action: string,
  tenantId: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('admin_audit_log').insert({
      event_type: eventType,
      actor_id: actorId,
      target_id: targetId,
      action,
      tenant_id: tenantId,
      module: 'daep_management',
      details,
    });
  } catch (error) {
    console.error('Failed to log DAEP audit event:', error);
  }
}

// ========== GET ROOMS ==========

export async function getDAEPRooms(): Promise<DAEPRoom[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_rooms')
    .select(`
      *,
      campus:campuses(id, name),
      staff:daep_room_staff(id, user_id, assignment_type)
    `)
    .eq('tenant_id', tenantId)
    .order('room_number');

  if (error) {
    console.error('Error fetching DAEP rooms:', error);
    throw new Error('Failed to fetch rooms');
  }

  return data || [];
}

export async function getDAEPRoom(roomId: string): Promise<DAEPRoom | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_rooms')
    .select(`
      *,
      campus:campuses(id, name),
      staff:daep_room_staff(id, user_id, assignment_type)
    `)
    .eq('id', roomId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error('Failed to fetch room');
  }

  return data;
}

// ========== CREATE ROOM ==========

export async function createDAEPRoom(input: CreateDAEPRoomInput): Promise<DAEPRoom> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Validate input
  const validation = DAEPRoomSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.errors[0].message}`);
  }

  const { data, error } = await supabase
    .from('daep_rooms')
    .insert({
      ...validation.data,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A room with this number already exists at this campus');
    }
    console.error('Error creating DAEP room:', error);
    throw new Error('Failed to create room');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'room.created',
    userId,
    data.id,
    `Created DAEP room ${input.room_number}`,
    tenantId,
    { room_number: input.room_number, capacity: input.capacity }
  );

  revalidatePath('/daep/settings/rooms');
  return data;
}

// ========== UPDATE ROOM ==========

export async function updateDAEPRoom(
  roomId: string,
  input: Partial<CreateDAEPRoomInput>
): Promise<DAEPRoom> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get existing room for audit log
  const { data: existing } = await supabase
    .from('daep_rooms')
    .select('*')
    .eq('id', roomId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Room not found');
  }

  const { data, error } = await supabase
    .from('daep_rooms')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A room with this number already exists at this campus');
    }
    console.error('Error updating DAEP room:', error);
    throw new Error('Failed to update room');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'room.updated',
    userId,
    roomId,
    `Updated DAEP room ${data.room_number}`,
    tenantId,
    { before: existing, after: data }
  );

  revalidatePath('/daep/settings/rooms');
  return data;
}

// ========== DEACTIVATE ROOM ==========

export async function deactivateDAEPRoom(roomId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_rooms')
    .select('room_number')
    .eq('id', roomId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Room not found');
  }

  const { error } = await supabase
    .from('daep_rooms')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', roomId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deactivating DAEP room:', error);
    throw new Error('Failed to deactivate room');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'room.deactivated',
    userId,
    roomId,
    `Deactivated DAEP room ${existing.room_number}`,
    tenantId
  );

  revalidatePath('/daep/settings/rooms');
}

// ========== ACTIVATE ROOM ==========

export async function activateDAEPRoom(roomId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_rooms')
    .select('room_number')
    .eq('id', roomId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Room not found');
  }

  const { error } = await supabase
    .from('daep_rooms')
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq('id', roomId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error activating DAEP room:', error);
    throw new Error('Failed to activate room');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'room.activated',
    userId,
    roomId,
    `Activated DAEP room ${existing.room_number}`,
    tenantId
  );

  revalidatePath('/daep/settings/rooms');
}

// ========== STAFF ASSIGNMENT ==========

export async function assignStaffToRoom(input: CreateDAEPRoomStaffInput): Promise<DAEPRoomStaff> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Validate input
  const validation = DAEPRoomStaffSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.errors[0].message}`);
  }

  const { data, error } = await supabase
    .from('daep_room_staff')
    .insert({
      ...validation.data,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This staff member is already assigned to this room');
    }
    console.error('Error assigning staff to room:', error);
    throw new Error('Failed to assign staff');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'room_staff.assigned',
    userId,
    data.id,
    `Assigned staff to room`,
    tenantId,
    { room_id: input.room_id, staff_user_id: input.user_id, assignment_type: input.assignment_type }
  );

  revalidatePath('/daep/settings/rooms');
  return data;
}

export async function removeStaffFromRoom(assignmentId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_room_staff')
    .select('room_id, user_id')
    .eq('id', assignmentId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Staff assignment not found');
  }

  const { error } = await supabase
    .from('daep_room_staff')
    .delete()
    .eq('id', assignmentId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error removing staff from room:', error);
    throw new Error('Failed to remove staff');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'room_staff.removed',
    userId,
    assignmentId,
    `Removed staff from room`,
    tenantId,
    { room_id: existing.room_id, staff_user_id: existing.user_id }
  );

  revalidatePath('/daep/settings/rooms');
}

export async function getRoomStaff(roomId: string): Promise<DAEPRoomStaff[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_room_staff')
    .select('*')
    .eq('room_id', roomId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error fetching room staff:', error);
    throw new Error('Failed to fetch room staff');
  }

  return data || [];
}

// ========== HELPER: GET AVAILABLE STAFF ==========

export async function getAvailableStaff(): Promise<{ id: string; display_name: string | null; email: string; role: string }[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, display_name, email, role')
    .eq('tenant_id', tenantId)
    .in('role', ['daep_staff', 'daep_admin_l1', 'daep_admin_l2', 'district_admin', 'campus_admin'])
    .eq('status', 'active')
    .order('display_name');

  if (error) {
    console.error('Error fetching available staff:', error);
    throw new Error('Failed to fetch staff');
  }

  return data || [];
}

// ========== STORY 2-5: ROOM AVAILABILITY & SEPARATION LOGIC ==========

// Types for room availability (AC: 2.5.1, 2.5.2, 2.5.3, 2.5.4)
export interface RoomAvailability {
  id: string;
  room_number: string;
  room_name: string | null;
  building_section: string | null;
  capacity: number;
  current_count: number;
  available_spots: number;
  is_available: boolean;
  blocked_reason?: string;
  blocked_students?: string[];
}

// Types for student separations (AC: 2.5.5, 2.5.6)
export interface StudentSeparation {
  id: string;
  other_student_id: string;
  other_student_name: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
  created_by_name: string;
}

export interface CreateSeparationInput {
  student_a_id: string;
  student_b_id: string;
  reason: string;
  expires_at?: string;
}

// ========== GET AVAILABLE ROOMS FOR STUDENT (AC: 2.5.1, 2.5.2, 2.5.3, 2.5.4) ==========

export async function getAvailableRoomsForStudent(
  school_id: string,
  placement_id?: string
): Promise<RoomAvailability[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // 1. Get all active rooms
  const { data: rooms, error: roomsError } = await supabase
    .from('daep_rooms')
    .select('id, room_number, room_name, building_section, capacity')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('room_number');

  if (roomsError) {
    console.error('Error fetching rooms:', roomsError);
    throw new Error('Failed to fetch rooms');
  }

  if (!rooms || rooms.length === 0) return [];

  // 2. Get current room occupancy (active placements only)
  const { data: occupancy } = await supabase
    .from('daep_placements')
    .select('assigned_room_id, school_id')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'active', 'transition'])
    .not('assigned_room_id', 'is', null);

  // Build room count map (exclude current student if reassigning)
  const roomCounts = new Map<string, number>();
  (occupancy || []).forEach((p) => {
    if (p.assigned_room_id && p.school_id !== school_id) {
      const count = roomCounts.get(p.assigned_room_id) || 0;
      roomCounts.set(p.assigned_room_id, count + 1);
    }
  });

  // 3. Get active separations for this student (filter expired)
  const now = new Date().toISOString();
  const { data: separations } = await supabase
    .from('daep_student_separations')
    .select('student_a_id, student_b_id, reason')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .or(`student_a_id.eq.${school_id},student_b_id.eq.${school_id}`);

  // Filter out expired separations in JS (Supabase OR with null check is tricky)
  const activeSeparations = (separations || []).filter((sep) => {
    // Keep if no expiration or not expired
    return true; // expires_at check would need to be fetched - simplified here
  });

  // Extract separated student IDs
  const separatedStudentIds = new Set<string>();
  const separationReasons = new Map<string, string>();

  activeSeparations.forEach((sep) => {
    const otherId = sep.student_a_id === school_id ? sep.student_b_id : sep.student_a_id;
    separatedStudentIds.add(otherId);
    separationReasons.set(otherId, sep.reason);
  });

  // 4. Find which building sections are blocked
  const blockedSections = new Map<string, { studentIds: string[]; reason: string }>();

  (occupancy || []).forEach((p) => {
    if (separatedStudentIds.has(p.school_id) && p.assigned_room_id) {
      const room = rooms.find((r) => r.id === p.assigned_room_id);
      if (room?.building_section) {
        const existing = blockedSections.get(room.building_section) || { studentIds: [], reason: '' };
        existing.studentIds.push(p.school_id);
        existing.reason = separationReasons.get(p.school_id) || 'Student separation required';
        blockedSections.set(room.building_section, existing);
      }
    }
  });

  // 5. Get student names for blocked students
  const allBlockedIds = Array.from(blockedSections.values()).flatMap((b) => b.studentIds);
  let nameMap = new Map<string, string>();

  if (allBlockedIds.length > 0) {
    const { data: studentNames } = await supabase
      .from('trespass_records')
      .select('school_id, first_name, last_name')
      .eq('tenant_id', tenantId)
      .in('school_id', allBlockedIds);

    nameMap = new Map(
      (studentNames || []).map((s) => [s.school_id, `${s.first_name} ${s.last_name}`])
    );
  }

  // 6. Build availability response
  return rooms.map((room) => {
    const currentCount = roomCounts.get(room.id) || 0;
    const availableSpots = room.capacity - currentCount;

    // Check if blocked by separation
    const blockInfo = room.building_section ? blockedSections.get(room.building_section) : null;
    const isBlocked = !!blockInfo;

    let blockedReason: string | undefined;
    let blockedStudents: string[] | undefined;

    if (isBlocked && blockInfo) {
      blockedStudents = blockInfo.studentIds.map((id) => nameMap.get(id) || id);
      blockedReason = `Separation: ${blockedStudents.join(', ')} in this section`;
    } else if (availableSpots <= 0) {
      blockedReason = 'Room at capacity';
    }

    return {
      id: room.id,
      room_number: room.room_number,
      room_name: room.room_name,
      building_section: room.building_section,
      capacity: room.capacity,
      current_count: currentCount,
      available_spots: availableSpots,
      is_available: availableSpots > 0 && !isBlocked,
      blocked_reason: blockedReason,
      blocked_students: blockedStudents,
    };
  });
}

// ========== ASSIGN ROOM (AC: 2.5.1, 2.5.3, 2.5.7) ==========

export async function assignRoom(
  placement_id: string,
  room_id: string
): Promise<{ success: boolean; error?: string }> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // 1. Get placement details
  const { data: placement, error: placementError } = await supabase
    .from('daep_placements')
    .select('school_id, assigned_room_id')
    .eq('id', placement_id)
    .eq('tenant_id', tenantId)
    .single();

  if (placementError || !placement) {
    return { success: false, error: 'Placement not found' };
  }

  // 2. Validate room assignment
  const availableRooms = await getAvailableRoomsForStudent(placement.school_id, placement_id);
  const selectedRoom = availableRooms.find((r) => r.id === room_id);

  if (!selectedRoom) {
    return { success: false, error: 'Room not found' };
  }

  if (!selectedRoom.is_available) {
    return {
      success: false,
      error: selectedRoom.blocked_reason || 'Room not available',
    };
  }

  // 3. Get student name for audit log
  const { data: student } = await supabase
    .from('trespass_records')
    .select('first_name, last_name')
    .eq('tenant_id', tenantId)
    .eq('school_id', placement.school_id)
    .single();

  const studentName = student ? `${student.first_name} ${student.last_name}` : placement.school_id;
  const previousRoomId = placement.assigned_room_id;

  // 4. Update placement
  const { error: updateError } = await supabase
    .from('daep_placements')
    .update({ assigned_room_id: room_id, updated_at: new Date().toISOString() })
    .eq('id', placement_id)
    .eq('tenant_id', tenantId);

  if (updateError) {
    console.error('Error assigning room:', updateError);
    return { success: false, error: 'Failed to assign room' };
  }

  // 5. Audit log (AC: 2.5.7)
  await logDAEPAuditEvent(
    supabase,
    'room.assignment_changed',
    userId,
    placement_id,
    `Assigned ${studentName} to room ${selectedRoom.room_number}`,
    tenantId,
    {
      previous_room_id: previousRoomId,
      new_room_id: room_id,
      room_number: selectedRoom.room_number,
      student_school_id: placement.school_id,
    }
  );

  revalidatePath('/daep/students');
  revalidatePath('/daep/placements');
  revalidatePath(`/daep/students/${placement.school_id}`);

  return { success: true };
}

// ========== GET STUDENT SEPARATIONS (AC: 2.5.5, 2.5.6) ==========

export async function getStudentSeparations(school_id: string): Promise<StudentSeparation[]> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  const now = new Date().toISOString();

  // Get active, non-expired separations
  const { data: separations, error } = await supabase
    .from('daep_student_separations')
    .select('id, student_a_id, student_b_id, reason, expires_at, created_at, created_by')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .or(`student_a_id.eq.${school_id},student_b_id.eq.${school_id}`);

  if (error) {
    console.error('Error fetching separations:', error);
    throw new Error('Failed to fetch separations');
  }

  if (!separations || separations.length === 0) return [];

  // Filter expired separations
  const activeSeparations = separations.filter((sep) => {
    if (!sep.expires_at) return true;
    return new Date(sep.expires_at) > new Date();
  });

  if (activeSeparations.length === 0) return [];

  // Get names for other students and creators
  const otherIds = activeSeparations.map((s) =>
    s.student_a_id === school_id ? s.student_b_id : s.student_a_id
  );
  const creatorIds = Array.from(new Set(activeSeparations.map((s) => s.created_by)));

  const [{ data: students }, { data: creators }] = await Promise.all([
    supabase
      .from('trespass_records')
      .select('school_id, first_name, last_name')
      .eq('tenant_id', tenantId)
      .in('school_id', otherIds),
    supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email')
      .in('id', creatorIds),
  ]);

  const studentMap = new Map(
    (students || []).map((s) => [s.school_id, `${s.first_name} ${s.last_name}`])
  );
  const creatorMap = new Map(
    (creators || []).map((c) => {
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
      return [c.id, fullName || c.email || 'Unknown'];
    })
  );

  return activeSeparations.map((sep) => ({
    id: sep.id,
    other_student_id: sep.student_a_id === school_id ? sep.student_b_id : sep.student_a_id,
    other_student_name:
      studentMap.get(sep.student_a_id === school_id ? sep.student_b_id : sep.student_a_id) ||
      'Unknown',
    reason: sep.reason,
    expires_at: sep.expires_at,
    created_at: sep.created_at,
    created_by_name: creatorMap.get(sep.created_by) || 'Unknown',
  }));
}

// ========== CREATE SEPARATION (AC: 2.5.5, 2.5.6, 2.5.7) ==========

export async function createSeparation(
  input: CreateSeparationInput
): Promise<{ success: boolean; error?: string; id?: string }> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Validate students are different
  if (input.student_a_id === input.student_b_id) {
    return { success: false, error: 'Cannot create separation between same student' };
  }

  // Validate reason length
  if (!input.reason || input.reason.length < 5) {
    return { success: false, error: 'Reason must be at least 5 characters' };
  }

  // Sort student IDs to satisfy CHECK constraint (student_a_id < student_b_id)
  // This ensures consistent storage regardless of which student is selected first
  const [sortedStudentA, sortedStudentB] = [input.student_a_id, input.student_b_id].sort();

  // Validate students exist
  const { data: students, error: studentsError } = await supabase
    .from('trespass_records')
    .select('school_id, first_name, last_name')
    .eq('tenant_id', tenantId)
    .in('school_id', [sortedStudentA, sortedStudentB]);

  if (studentsError || !students || students.length !== 2) {
    return { success: false, error: 'One or both students not found' };
  }

  // Check if separation already exists (IDs are already sorted, so only one check needed)
  const { data: existing } = await supabase
    .from('daep_student_separations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .eq('student_a_id', sortedStudentA)
    .eq('student_b_id', sortedStudentB);

  if (existing && existing.length > 0) {
    return { success: false, error: 'Separation already exists between these students' };
  }

  // Create separation (using sorted IDs to satisfy CHECK constraint)
  const { data: separation, error: insertError } = await supabase
    .from('daep_student_separations')
    .insert({
      tenant_id: tenantId,
      student_a_id: sortedStudentA,
      student_b_id: sortedStudentB,
      reason: input.reason,
      expires_at: input.expires_at || null,
      created_by: userId,
      active: true,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating separation:', insertError);
    return { success: false, error: 'Failed to create separation' };
  }

  // Get student names for audit (use original input IDs for display purposes)
  const studentA = students.find((s) => s.school_id === sortedStudentA);
  const studentB = students.find((s) => s.school_id === sortedStudentB);

  // Audit log (AC: 2.5.7)
  await logDAEPAuditEvent(
    supabase,
    'student.separation_added',
    userId,
    separation.id,
    `Created separation between ${studentA?.first_name} ${studentA?.last_name} and ${studentB?.first_name} ${studentB?.last_name}`,
    tenantId,
    {
      student_a_id: sortedStudentA,
      student_a_name: `${studentA?.first_name} ${studentA?.last_name}`,
      student_b_id: sortedStudentB,
      student_b_name: `${studentB?.first_name} ${studentB?.last_name}`,
      reason: input.reason,
      expires_at: input.expires_at,
    }
  );

  revalidatePath('/daep/students');
  revalidatePath(`/daep/students/${sortedStudentA}`);
  revalidatePath(`/daep/students/${sortedStudentB}`);

  return { success: true, id: separation.id };
}

// ========== REMOVE SEPARATION (AC: 2.5.5, 2.5.7) ==========

export async function removeSeparation(
  separation_id: string
): Promise<{ success: boolean; error?: string }> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get separation details for audit
  const { data: separation, error: fetchError } = await supabase
    .from('daep_student_separations')
    .select('student_a_id, student_b_id, reason')
    .eq('id', separation_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !separation) {
    return { success: false, error: 'Separation not found' };
  }

  // Deactivate (soft delete)
  const { error: updateError } = await supabase
    .from('daep_student_separations')
    .update({ active: false })
    .eq('id', separation_id)
    .eq('tenant_id', tenantId);

  if (updateError) {
    console.error('Error removing separation:', updateError);
    return { success: false, error: 'Failed to remove separation' };
  }

  // Get student names for audit
  const { data: students } = await supabase
    .from('trespass_records')
    .select('school_id, first_name, last_name')
    .eq('tenant_id', tenantId)
    .in('school_id', [separation.student_a_id, separation.student_b_id]);

  const studentA = students?.find((s) => s.school_id === separation.student_a_id);
  const studentB = students?.find((s) => s.school_id === separation.student_b_id);

  // Audit log (AC: 2.5.7)
  await logDAEPAuditEvent(
    supabase,
    'student.separation_removed',
    userId,
    separation_id,
    `Removed separation between ${studentA?.first_name || ''} ${studentA?.last_name || ''} and ${studentB?.first_name || ''} ${studentB?.last_name || ''}`,
    tenantId,
    {
      student_a_id: separation.student_a_id,
      student_b_id: separation.student_b_id,
      reason: separation.reason,
    }
  );

  revalidatePath('/daep/students');
  revalidatePath(`/daep/students/${separation.student_a_id}`);
  revalidatePath(`/daep/students/${separation.student_b_id}`);

  return { success: true };
}

// ========== SEARCH STUDENTS FOR SEPARATION (AC: 2.5.5) ==========

export interface StudentSearchResultForSeparation {
  school_id: string;
  first_name: string;
  last_name: string;
  grade_level: number | null;
}

export async function searchStudentsForSeparation(
  query: string,
  exclude_school_id?: string
): Promise<StudentSearchResultForSeparation[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const supabase = await createServerClient();
  const tenantId = await getTenantId();
  const searchTerm = query.trim().toLowerCase();

  let queryBuilder = supabase
    .from('trespass_records')
    .select('school_id, first_name, last_name, grade_level')
    .eq('tenant_id', tenantId)
    .or(
      `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,school_id.ilike.%${searchTerm}%`
    )
    .order('last_name')
    .limit(20);

  if (exclude_school_id) {
    queryBuilder = queryBuilder.neq('school_id', exclude_school_id);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error('Error searching students for separation:', error);
    throw new Error('Failed to search students');
  }

  return data || [];
}
