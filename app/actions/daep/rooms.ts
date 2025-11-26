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
