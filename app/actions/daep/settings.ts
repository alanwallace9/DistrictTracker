'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  DistrictDAEPSettingsSchema,
  CampusDAEPSettingsSchema,
  type DistrictDAEPSettings,
  type CampusDAEPSettings,
} from '@/lib/validation/schemas';

// Default settings values
const DEFAULT_DISTRICT_SETTINGS: DistrictDAEPSettings = {
  timezone: 'America/Chicago',
  default_points_per_period: 10,
  attendance_threshold: 85,
  point_threshold_warning: 7,
  school_year: null,
};

const DEFAULT_CAMPUS_SETTINGS: CampusDAEPSettings = {
  daep_campus_name: null,
  daep_campus_address: null,
  daep_campus_phone: null,
  max_room_capacity: 15,
};

// Helper to get effective tenant_id from database (matches RLS get_my_tenant_id())
// Uses COALESCE(active_tenant_id, tenant_id) to support master_admin tenant switching
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

  const allowedRoles = ['master_admin', 'district_admin', 'daep_admin_l1'];
  if (!allowedRoles.includes(profile.role)) {
    throw new Error('Insufficient permissions. Only DAEP administrators can manage settings.');
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

// ========== DISTRICT SETTINGS ==========

export interface DistrictSettingsResult {
  settings: DistrictDAEPSettings;
  tenant_id: string;
  tenant_name: string;
}

export async function getDistrictDAEPSettings(): Promise<DistrictSettingsResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('tenants')
    .select('id, display_name, daep_settings')
    .eq('id', tenantId)
    .single();

  if (error) {
    console.error('Error fetching district settings:', error);
    throw new Error('Failed to fetch district settings');
  }

  // Merge stored settings with defaults
  const storedSettings = (data?.daep_settings as Partial<DistrictDAEPSettings>) || {};
  const settings: DistrictDAEPSettings = {
    ...DEFAULT_DISTRICT_SETTINGS,
    ...storedSettings,
  };

  return {
    settings,
    tenant_id: data.id,
    tenant_name: data.display_name,
  };
}

export async function updateDistrictDAEPSettings(
  input: Partial<DistrictDAEPSettings>
): Promise<DistrictDAEPSettings> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get current settings
  const { data: current } = await supabase
    .from('tenants')
    .select('daep_settings')
    .eq('id', tenantId)
    .single();

  const currentSettings = (current?.daep_settings as Partial<DistrictDAEPSettings>) || {};
  const mergedSettings = { ...DEFAULT_DISTRICT_SETTINGS, ...currentSettings, ...input };

  // Validate merged settings
  const validation = DistrictDAEPSettingsSchema.safeParse(mergedSettings);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.errors[0].message}`);
  }

  // Update settings
  const { data, error } = await supabase
    .from('tenants')
    .update({ daep_settings: validation.data })
    .eq('id', tenantId)
    .select('daep_settings')
    .single();

  if (error) {
    console.error('Error updating district settings:', error);
    throw new Error('Failed to update district settings');
  }

  await logDAEPAuditEvent(
    supabase,
    'daep_settings.district_updated',
    userId,
    tenantId,
    'Updated district DAEP settings',
    tenantId,
    { changes: input }
  );

  revalidatePath('/daep/settings');
  return data.daep_settings as DistrictDAEPSettings;
}

// ========== CAMPUS SETTINGS ==========

export interface CampusInfo {
  id: string;
  name: string;
  is_daep: boolean;
}

export interface CampusSettingsResult {
  settings: CampusDAEPSettings;
  campus: CampusInfo;
}

export async function getDAEPCampuses(): Promise<CampusInfo[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  console.log('[getDAEPCampuses] tenantId from Clerk metadata:', tenantId);

  const { data, error } = await supabase
    .from('campuses')
    .select('id, name, is_daep')
    .eq('tenant_id', tenantId)
    .eq('is_daep', true)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('[getDAEPCampuses] Error fetching DAEP campuses:', error);
    throw new Error('Failed to fetch DAEP campuses');
  }

  console.log('[getDAEPCampuses] Query result:', { count: data?.length || 0, data });

  return data || [];
}

export async function getCampusDAEPSettings(campusId: string): Promise<CampusSettingsResult> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('campuses')
    .select('id, name, is_daep, daep_settings')
    .eq('id', campusId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    console.error('Error fetching campus settings:', error);
    throw new Error('Failed to fetch campus settings');
  }

  if (!data) {
    throw new Error('Campus not found');
  }

  // Merge stored settings with defaults
  const storedSettings = (data.daep_settings as Partial<CampusDAEPSettings>) || {};
  const settings: CampusDAEPSettings = {
    ...DEFAULT_CAMPUS_SETTINGS,
    ...storedSettings,
  };

  return {
    settings,
    campus: {
      id: data.id,
      name: data.name,
      is_daep: data.is_daep,
    },
  };
}

export async function updateCampusDAEPSettings(
  campusId: string,
  input: Partial<CampusDAEPSettings>
): Promise<CampusDAEPSettings> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Verify campus exists and belongs to tenant
  const { data: campus } = await supabase
    .from('campuses')
    .select('id, name, daep_settings')
    .eq('id', campusId)
    .eq('tenant_id', tenantId)
    .single();

  if (!campus) {
    throw new Error('Campus not found');
  }

  const currentSettings = (campus.daep_settings as Partial<CampusDAEPSettings>) || {};
  const mergedSettings = { ...DEFAULT_CAMPUS_SETTINGS, ...currentSettings, ...input };

  // Validate merged settings
  const validation = CampusDAEPSettingsSchema.safeParse(mergedSettings);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.errors[0].message}`);
  }

  // Update settings
  const { data, error } = await supabase
    .from('campuses')
    .update({ daep_settings: validation.data })
    .eq('id', campusId)
    .eq('tenant_id', tenantId)
    .select('daep_settings')
    .single();

  if (error) {
    console.error('Error updating campus settings:', error);
    throw new Error('Failed to update campus settings');
  }

  await logDAEPAuditEvent(
    supabase,
    'daep_settings.campus_updated',
    userId,
    campusId,
    `Updated DAEP settings for campus ${campus.name}`,
    tenantId,
    { campus_id: campusId, campus_name: campus.name, changes: input }
  );

  revalidatePath('/daep/settings');
  return data.daep_settings as CampusDAEPSettings;
}
