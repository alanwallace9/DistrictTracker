'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { DisciplineCodeSchema, type CreateDisciplineCodeInput } from '@/lib/validation/schemas';

// Types
export interface DisciplineCode {
  id: string;
  tenant_id: string;
  code: string;
  label: string;
  mandatory_placement: boolean;
  behavior_location: 'on_campus' | 'off_campus' | 'school_sponsored' | null;
  active: boolean;
  created_at: string;
  updated_at: string;
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
    throw new Error('Insufficient permissions. Only DAEP administrators can manage discipline codes.');
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

// ========== GET DISCIPLINE CODES ==========

export async function getDisciplineCodes(): Promise<DisciplineCode[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_discipline_codes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('code');

  if (error) {
    console.error('Error fetching discipline codes:', error);
    throw new Error('Failed to fetch discipline codes');
  }

  return data || [];
}

export async function getActiveDisciplineCodes(): Promise<DisciplineCode[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_discipline_codes')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('code');

  if (error) {
    console.error('Error fetching active discipline codes:', error);
    throw new Error('Failed to fetch discipline codes');
  }

  return data || [];
}

export async function getDisciplineCode(codeId: string): Promise<DisciplineCode | null> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_discipline_codes')
    .select('*')
    .eq('id', codeId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error('Failed to fetch discipline code');
  }

  return data;
}

// ========== CREATE DISCIPLINE CODE ==========

export async function createDisciplineCode(input: CreateDisciplineCodeInput): Promise<DisciplineCode> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Validate input
  const validation = DisciplineCodeSchema.safeParse(input);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.errors[0].message}`);
  }

  const { data, error } = await supabase
    .from('daep_discipline_codes')
    .insert({
      ...validation.data,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A discipline code with this PEIMS code already exists');
    }
    console.error('Error creating discipline code:', error);
    throw new Error('Failed to create discipline code');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'discipline_code.created',
    userId,
    data.id,
    `Created discipline code ${input.code}`,
    tenantId,
    { code: input.code, label: input.label, mandatory_placement: input.mandatory_placement }
  );

  revalidatePath('/daep/settings/codes');
  return data;
}

// ========== UPDATE DISCIPLINE CODE ==========

export async function updateDisciplineCode(
  codeId: string,
  input: Partial<CreateDisciplineCodeInput>
): Promise<DisciplineCode> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get existing code for audit log
  const { data: existing } = await supabase
    .from('daep_discipline_codes')
    .select('*')
    .eq('id', codeId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Discipline code not found');
  }

  const { data, error } = await supabase
    .from('daep_discipline_codes')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', codeId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A discipline code with this PEIMS code already exists');
    }
    console.error('Error updating discipline code:', error);
    throw new Error('Failed to update discipline code');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'discipline_code.updated',
    userId,
    codeId,
    `Updated discipline code ${data.code}`,
    tenantId,
    { before: existing, after: data }
  );

  revalidatePath('/daep/settings/codes');
  return data;
}

// ========== DEACTIVATE DISCIPLINE CODE ==========

export async function deactivateDisciplineCode(codeId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_discipline_codes')
    .select('code')
    .eq('id', codeId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Discipline code not found');
  }

  const { error } = await supabase
    .from('daep_discipline_codes')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', codeId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deactivating discipline code:', error);
    throw new Error('Failed to deactivate discipline code');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'discipline_code.deactivated',
    userId,
    codeId,
    `Deactivated discipline code ${existing.code}`,
    tenantId
  );

  revalidatePath('/daep/settings/codes');
}

// ========== ACTIVATE DISCIPLINE CODE ==========

export async function activateDisciplineCode(codeId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_discipline_codes')
    .select('code')
    .eq('id', codeId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Discipline code not found');
  }

  const { error } = await supabase
    .from('daep_discipline_codes')
    .update({ active: true, updated_at: new Date().toISOString() })
    .eq('id', codeId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error activating discipline code:', error);
    throw new Error('Failed to activate discipline code');
  }

  // Log audit event
  await logDAEPAuditEvent(
    supabase,
    'discipline_code.activated',
    userId,
    codeId,
    `Activated discipline code ${existing.code}`,
    tenantId
  );

  revalidatePath('/daep/settings/codes');
}
