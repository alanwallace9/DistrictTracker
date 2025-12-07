'use server';

/**
 * Attendance Settings Server Actions
 *
 * Story 3-9: Attendance Entry
 *
 * Provides CRUD operations for attendance status types.
 */

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  AttendanceStatusTypeSchema,
  type AttendanceStatusTypeInput,
  type AttendancePointsType,
} from '@/lib/validation/schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface AttendanceStatusType {
  id: string;
  tenant_id: string;
  status_code: string;
  label: string;
  points_type: AttendancePointsType;
  requires_time: boolean;
  sort_order: number;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// HELPERS
// ============================================================================

async function checkDAEPAdminRole(): Promise<{ userId: string; tenantId: string; role: string }> {
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

  const adminRoles = ['super_admin', 'district_admin', 'daep_admin_l1'];
  if (!adminRoles.includes(profile.role)) {
    throw new Error('Only administrators can manage attendance settings');
  }

  const effectiveTenantId = profile.active_tenant_id || profile.tenant_id;
  if (!effectiveTenantId) {
    throw new Error('No tenant assigned');
  }

  return {
    userId: user.id,
    tenantId: effectiveTenantId,
    role: profile.role,
  };
}

// ============================================================================
// GET ALL STATUS TYPES
// ============================================================================

/**
 * Get all attendance status types for the tenant (including inactive).
 * For settings page management.
 */
export async function getAllAttendanceStatusTypes(): Promise<AttendanceStatusType[]> {
  const { tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('daep_attendance_status_types')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching attendance status types:', error);
    throw new Error('Failed to fetch attendance status types');
  }

  return data || [];
}

// ============================================================================
// UPDATE STATUS TYPE
// ============================================================================

/**
 * Update an attendance status type.
 * Can change points_type, label, requires_time, active status.
 * Cannot change status_code for default types.
 */
export async function updateAttendanceStatusType(
  id: string,
  updates: Partial<AttendanceStatusTypeInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId, userId } = await checkDAEPAdminRole();
    const supabase = await createServerClient();

    // Get existing
    const { data: existing, error: fetchError } = await supabase
      .from('daep_attendance_status_types')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Status type not found' };
    }

    // Build update object - only allow certain fields
    const updateData: Record<string, unknown> = {};

    if (updates.label !== undefined) {
      updateData.label = updates.label;
    }
    if (updates.points_type !== undefined) {
      updateData.points_type = updates.points_type;
    }
    if (updates.requires_time !== undefined) {
      updateData.requires_time = updates.requires_time;
    }
    if (updates.sort_order !== undefined) {
      updateData.sort_order = updates.sort_order;
    }
    if (updates.active !== undefined) {
      // Don't allow deactivating default types
      if (existing.is_default && updates.active === false) {
        return { success: false, error: 'Cannot deactivate default status types' };
      }
      updateData.active = updates.active;
    }

    // Can only change status_code for non-default types
    if (updates.status_code !== undefined && !existing.is_default) {
      updateData.status_code = updates.status_code;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: 'No changes provided' };
    }

    const { error: updateError } = await supabase
      .from('daep_attendance_status_types')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error('Error updating status type:', updateError);
      return { success: false, error: 'Failed to update status type' };
    }

    // Audit log
    await supabase.from('admin_audit_log').insert({
      event_type: 'attendance_settings.status_type_updated',
      actor_id: userId,
      target_id: id,
      action: `Updated attendance status type: ${existing.status_code}`,
      tenant_id: tenantId,
      module: 'daep_management',
      details: {
        status_code: existing.status_code,
        before: existing,
        updates: updateData,
      },
    });

    revalidatePath('/daep/settings/attendance');
    return { success: true };
  } catch (error) {
    console.error('updateAttendanceStatusType error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update status type',
    };
  }
}

// ============================================================================
// CREATE STATUS TYPE
// ============================================================================

/**
 * Create a new custom attendance status type.
 */
export async function createAttendanceStatusType(
  input: AttendanceStatusTypeInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { tenantId, userId } = await checkDAEPAdminRole();

    // Validate input
    const validation = AttendanceStatusTypeSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid input',
      };
    }

    const supabase = await createServerClient();

    // Check if status_code already exists
    const { data: existing } = await supabase
      .from('daep_attendance_status_types')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status_code', input.status_code)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'Status code already exists' };
    }

    // Get max sort_order
    const { data: maxOrder } = await supabase
      .from('daep_attendance_status_types')
      .select('sort_order')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrder?.sort_order || 0) + 1;

    // Insert
    const { data, error } = await supabase
      .from('daep_attendance_status_types')
      .insert({
        tenant_id: tenantId,
        status_code: input.status_code.toUpperCase(),
        label: input.label,
        points_type: input.points_type || 'full',
        requires_time: input.requires_time || false,
        sort_order: input.sort_order || nextOrder,
        is_default: false,
        active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating status type:', error);
      return { success: false, error: 'Failed to create status type' };
    }

    // Audit log
    await supabase.from('admin_audit_log').insert({
      event_type: 'attendance_settings.status_type_created',
      actor_id: userId,
      target_id: data.id,
      action: `Created attendance status type: ${input.status_code}`,
      tenant_id: tenantId,
      module: 'daep_management',
      details: input,
    });

    revalidatePath('/daep/settings/attendance');
    return { success: true, id: data.id };
  } catch (error) {
    console.error('createAttendanceStatusType error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create status type',
    };
  }
}

// ============================================================================
// DELETE STATUS TYPE
// ============================================================================

/**
 * Delete a custom attendance status type.
 * Cannot delete default types.
 */
export async function deleteAttendanceStatusType(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId, userId } = await checkDAEPAdminRole();
    const supabase = await createServerClient();

    // Get existing
    const { data: existing, error: fetchError } = await supabase
      .from('daep_attendance_status_types')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Status type not found' };
    }

    if (existing.is_default) {
      return { success: false, error: 'Cannot delete default status types' };
    }

    // Check if status is in use
    const { count } = await supabase
      .from('daep_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', existing.status_code);

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete - ${count} attendance records use this status`,
      };
    }

    // Delete
    const { error: deleteError } = await supabase
      .from('daep_attendance_status_types')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      console.error('Error deleting status type:', deleteError);
      return { success: false, error: 'Failed to delete status type' };
    }

    // Audit log
    await supabase.from('admin_audit_log').insert({
      event_type: 'attendance_settings.status_type_deleted',
      actor_id: userId,
      target_id: id,
      action: `Deleted attendance status type: ${existing.status_code}`,
      tenant_id: tenantId,
      module: 'daep_management',
      details: existing,
    });

    revalidatePath('/daep/settings/attendance');
    return { success: true };
  } catch (error) {
    console.error('deleteAttendanceStatusType error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete status type',
    };
  }
}
