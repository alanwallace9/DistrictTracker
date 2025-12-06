'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { DAEPRoomGroupSchema, type CreateDAEPRoomGroupInput } from '@/lib/validation/schemas';

// Types
export interface DAEPRoomGroup {
  id: string;
  tenant_id: string;
  group_name: string;
  description: string | null;
  color: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  room_count?: number;
}

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

// Helper to check DAEP admin role
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
    throw new Error('Insufficient permissions. Only DAEP administrators can manage room groups.');
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
  details?: Record<string, unknown>
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

// ========== GET ROOM GROUPS ==========

export async function getRoomGroups(): Promise<DAEPRoomGroup[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get groups with room count
  const { data, error } = await supabase
    .from('daep_room_groups')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order')
    .order('group_name');

  if (error) {
    console.error('Error fetching room groups:', error);
    throw new Error('Failed to fetch room groups');
  }

  // Get room counts per group
  const { data: roomCounts } = await supabase
    .from('daep_rooms')
    .select('room_group_id')
    .eq('tenant_id', tenantId)
    .not('room_group_id', 'is', null);

  const countMap = new Map<string, number>();
  (roomCounts || []).forEach((r) => {
    if (r.room_group_id) {
      countMap.set(r.room_group_id, (countMap.get(r.room_group_id) || 0) + 1);
    }
  });

  return (data || []).map((group) => ({
    ...group,
    room_count: countMap.get(group.id) || 0,
  }));
}

export async function getRoomGroup(groupId: string): Promise<DAEPRoomGroup | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_room_groups')
    .select('*')
    .eq('id', groupId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch room group');
  }

  return data;
}

// ========== CREATE ROOM GROUP ==========

export async function createRoomGroup(input: CreateDAEPRoomGroupInput): Promise<DAEPRoomGroup> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Validate input
  const validation = DAEPRoomGroupSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.errors[0].message}`);
  }

  const { data, error } = await supabase
    .from('daep_room_groups')
    .insert({
      ...validation.data,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A group with this name already exists');
    }
    console.error('Error creating room group:', error);
    throw new Error('Failed to create room group');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'room_group.created',
    userId,
    data.id,
    `Created room group "${input.group_name}"`,
    tenantId,
    { group_name: input.group_name, color: input.color }
  );

  revalidatePath('/daep/settings/rooms');
  return data;
}

// ========== UPDATE ROOM GROUP ==========

export async function updateRoomGroup(
  groupId: string,
  input: Partial<CreateDAEPRoomGroupInput>
): Promise<DAEPRoomGroup> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get existing group for audit log
  const { data: existing } = await supabase
    .from('daep_room_groups')
    .select('*')
    .eq('id', groupId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Room group not found');
  }

  const { data, error } = await supabase
    .from('daep_room_groups')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A group with this name already exists');
    }
    console.error('Error updating room group:', error);
    throw new Error('Failed to update room group');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'room_group.updated',
    userId,
    groupId,
    `Updated room group "${data.group_name}"`,
    tenantId,
    { before: existing, after: data }
  );

  revalidatePath('/daep/settings/rooms');
  return data;
}

// ========== DEACTIVATE ROOM GROUP ==========

export async function deactivateRoomGroup(groupId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_room_groups')
    .select('group_name')
    .eq('id', groupId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Room group not found');
  }

  // Check if any rooms are assigned to this group
  const { data: assignedRooms } = await supabase
    .from('daep_rooms')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('room_group_id', groupId)
    .limit(1);

  if (assignedRooms && assignedRooms.length > 0) {
    throw new Error('Cannot deactivate group with assigned rooms. Reassign rooms first.');
  }

  const { error } = await supabase
    .from('daep_room_groups')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deactivating room group:', error);
    throw new Error('Failed to deactivate room group');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'room_group.deactivated',
    userId,
    groupId,
    `Deactivated room group "${existing.group_name}"`,
    tenantId
  );

  revalidatePath('/daep/settings/rooms');
}

// ========== ACTIVATE ROOM GROUP ==========

export async function activateRoomGroup(groupId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_room_groups')
    .select('group_name')
    .eq('id', groupId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Room group not found');
  }

  const { error } = await supabase
    .from('daep_room_groups')
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error activating room group:', error);
    throw new Error('Failed to activate room group');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'room_group.activated',
    userId,
    groupId,
    `Activated room group "${existing.group_name}"`,
    tenantId
  );

  revalidatePath('/daep/settings/rooms');
}

// ========== DELETE ROOM GROUP ==========

export async function deleteRoomGroup(groupId: string): Promise<void> {
  const { userId, role, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Only district admins can delete
  if (!['super_admin', 'district_admin'].includes(role)) {
    throw new Error('Only district administrators can delete room groups');
  }

  const { data: existing } = await supabase
    .from('daep_room_groups')
    .select('group_name')
    .eq('id', groupId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Room group not found');
  }

  // Check if any rooms are assigned to this group
  const { data: assignedRooms } = await supabase
    .from('daep_rooms')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('room_group_id', groupId)
    .limit(1);

  if (assignedRooms && assignedRooms.length > 0) {
    throw new Error('Cannot delete group with assigned rooms. Reassign rooms first.');
  }

  const { error } = await supabase
    .from('daep_room_groups')
    .delete()
    .eq('id', groupId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting room group:', error);
    throw new Error('Failed to delete room group');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'room_group.deleted',
    userId,
    groupId,
    `Deleted room group "${existing.group_name}"`,
    tenantId
  );

  revalidatePath('/daep/settings/rooms');
}
