'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  BellScheduleSchema,
  type CreateBellScheduleInput,
  type BellSchedulePeriod,
} from '@/lib/validation/schemas';

// Types
export interface BellSchedule {
  id: string;
  tenant_id: string;
  campus_id: string | null;
  schedule_name: string;
  schedule_type: 'regular' | 'early_release' | 'half_day' | 'custom';
  periods: BellSchedulePeriod[];
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  campus?: { id: string; name: string } | null;
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
    throw new Error('Insufficient permissions. Only DAEP administrators can manage bell schedules.');
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

// ========== GET SCHEDULES ==========

export async function getBellSchedules(): Promise<BellSchedule[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_bell_schedules')
    .select(`
      *,
      campus:campuses(id, name)
    `)
    .eq('tenant_id', tenantId)
    .order('schedule_name');

  if (error) {
    console.error('Error fetching bell schedules:', error);
    throw new Error('Failed to fetch bell schedules');
  }

  return data || [];
}

export async function getBellSchedule(scheduleId: string): Promise<BellSchedule | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_bell_schedules')
    .select(`
      *,
      campus:campuses(id, name)
    `)
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error('Failed to fetch bell schedule');
  }

  return data;
}

export async function getDefaultScheduleForCampus(campusId: string): Promise<BellSchedule | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_bell_schedules')
    .select(`
      *,
      campus:campuses(id, name)
    `)
    .eq('tenant_id', tenantId)
    .eq('campus_id', campusId)
    .eq('is_default', true)
    .eq('active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error('Failed to fetch default schedule');
  }

  return data;
}

// ========== CREATE SCHEDULE ==========

export async function createBellSchedule(input: CreateBellScheduleInput): Promise<BellSchedule> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Validate input
  const validation = BellScheduleSchema.safeParse(input);
  if (!validation.success) {
    const errors = validation.error.errors.map(e => e.message).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }

  // If setting as default, clear other defaults for this campus
  if (validation.data.is_default) {
    await supabase
      .from('daep_bell_schedules')
      .update({ is_default: false })
      .eq('tenant_id', tenantId)
      .eq('campus_id', validation.data.campus_id);
  }

  const { data, error } = await supabase
    .from('daep_bell_schedules')
    .insert({
      ...validation.data,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating bell schedule:', error);
    throw new Error('Failed to create bell schedule');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'bell_schedule.created',
    userId,
    data.id,
    `Created bell schedule "${input.schedule_name}"`,
    tenantId,
    {
      schedule_name: input.schedule_name,
      schedule_type: input.schedule_type,
      period_count: input.periods.length,
    }
  );

  revalidatePath('/daep/settings/schedules');
  return data;
}

// ========== UPDATE SCHEDULE ==========

export async function updateBellSchedule(
  scheduleId: string,
  input: Partial<CreateBellScheduleInput>
): Promise<BellSchedule> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get existing schedule for audit log
  const { data: existing } = await supabase
    .from('daep_bell_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Bell schedule not found');
  }

  // If setting as default, clear other defaults for this campus
  if (input.is_default && !existing.is_default) {
    const campusId = input.campus_id || existing.campus_id;
    await supabase
      .from('daep_bell_schedules')
      .update({ is_default: false })
      .eq('tenant_id', tenantId)
      .eq('campus_id', campusId)
      .neq('id', scheduleId);
  }

  const { data, error } = await supabase
    .from('daep_bell_schedules')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating bell schedule:', error);
    throw new Error('Failed to update bell schedule');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'bell_schedule.updated',
    userId,
    scheduleId,
    `Updated bell schedule "${data.schedule_name}"`,
    tenantId,
    { before: existing, after: data }
  );

  revalidatePath('/daep/settings/schedules');
  return data;
}

// ========== DEACTIVATE SCHEDULE ==========

export async function deactivateBellSchedule(scheduleId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_bell_schedules')
    .select('schedule_name, is_default')
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Bell schedule not found');
  }

  if (existing.is_default) {
    throw new Error('Cannot deactivate the default schedule. Set another schedule as default first.');
  }

  const { error } = await supabase
    .from('daep_bell_schedules')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deactivating bell schedule:', error);
    throw new Error('Failed to deactivate bell schedule');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'bell_schedule.deactivated',
    userId,
    scheduleId,
    `Deactivated bell schedule "${existing.schedule_name}"`,
    tenantId
  );

  revalidatePath('/daep/settings/schedules');
}

// ========== ACTIVATE SCHEDULE ==========

export async function activateBellSchedule(scheduleId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_bell_schedules')
    .select('schedule_name')
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Bell schedule not found');
  }

  const { error } = await supabase
    .from('daep_bell_schedules')
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error activating bell schedule:', error);
    throw new Error('Failed to activate bell schedule');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'bell_schedule.activated',
    userId,
    scheduleId,
    `Activated bell schedule "${existing.schedule_name}"`,
    tenantId
  );

  revalidatePath('/daep/settings/schedules');
}

// ========== SET DEFAULT SCHEDULE ==========

export async function setDefaultSchedule(scheduleId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get the schedule to find its campus
  const { data: schedule } = await supabase
    .from('daep_bell_schedules')
    .select('schedule_name, campus_id, active')
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)
    .single();

  if (!schedule) {
    throw new Error('Bell schedule not found');
  }

  if (!schedule.active) {
    throw new Error('Cannot set an inactive schedule as default');
  }

  // Clear existing default for this campus
  await supabase
    .from('daep_bell_schedules')
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('campus_id', schedule.campus_id);

  // Set new default
  const { error } = await supabase
    .from('daep_bell_schedules')
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error setting default bell schedule:', error);
    throw new Error('Failed to set default bell schedule');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'bell_schedule.set_default',
    userId,
    scheduleId,
    `Set bell schedule "${schedule.schedule_name}" as default`,
    tenantId,
    { campus_id: schedule.campus_id }
  );

  revalidatePath('/daep/settings/schedules');
}

// ========== DELETE SCHEDULE ==========

export async function deleteBellSchedule(scheduleId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_bell_schedules')
    .select('schedule_name, is_default')
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Bell schedule not found');
  }

  if (existing.is_default) {
    throw new Error('Cannot delete the default schedule. Set another schedule as default first.');
  }

  const { error } = await supabase
    .from('daep_bell_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting bell schedule:', error);
    throw new Error('Failed to delete bell schedule');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'bell_schedule.deleted',
    userId,
    scheduleId,
    `Deleted bell schedule "${existing.schedule_name}"`,
    tenantId
  );

  revalidatePath('/daep/settings/schedules');
}
