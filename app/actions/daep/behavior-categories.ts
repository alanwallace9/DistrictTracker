'use server';

import { createServerClient } from '@/lib/supabase/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import {
  BehaviorCategorySchema,
  type CreateBehaviorCategoryInput,
  type BehaviorCategoryType,
} from '@/lib/validation/schemas';

// Types
export interface BehaviorCategory {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category_type: BehaviorCategoryType;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Pre-seed categories
const DEFAULT_CATEGORIES: Omit<CreateBehaviorCategoryInput, 'display_order'>[] = [
  // Positive behaviors
  { name: 'On Task', category_type: 'positive', is_active: true },
  { name: 'Helped Peer', category_type: 'positive', is_active: true },
  { name: 'Showed Respect', category_type: 'positive', is_active: true },
  { name: 'Completed Work', category_type: 'positive', is_active: true },
  // Negative behaviors
  { name: 'Talk Back', category_type: 'negative', is_active: true },
  { name: 'Off Task', category_type: 'negative', is_active: true },
  { name: 'Disruptive', category_type: 'negative', is_active: true },
  { name: 'Incomplete Work', category_type: 'negative', is_active: true },
  // Neutral behaviors
  { name: 'Redirected', category_type: 'neutral', is_active: true },
  { name: 'Conference', category_type: 'neutral', is_active: true },
  { name: 'Parent Contact', category_type: 'neutral', is_active: true },
];

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

  // Get role and effective tenant from database (not Clerk metadata)
  // This ensures consistency with RLS policies
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
    throw new Error('Insufficient permissions. Only DAEP administrators can manage behavior categories.');
  }

  // Match the RLS function: COALESCE(active_tenant_id, tenant_id)
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

// ========== GET BEHAVIOR CATEGORIES ==========

export async function getBehaviorCategories(): Promise<BehaviorCategory[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_behavior_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('display_order');

  if (error) {
    console.error('Error fetching behavior categories:', error);
    throw new Error('Failed to fetch behavior categories');
  }

  return data || [];
}

export async function getActiveBehaviorCategories(): Promise<BehaviorCategory[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_behavior_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Error fetching active behavior categories:', error);
    throw new Error('Failed to fetch behavior categories');
  }

  return data || [];
}

// ========== SEED DEFAULT CATEGORIES ==========

export async function seedDefaultCategories(): Promise<{ seeded: number }> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Check if categories already exist
  const { data: existing } = await supabase
    .from('daep_behavior_categories')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { seeded: 0 };
  }

  // Insert default categories with display_order
  const categoriesToInsert = DEFAULT_CATEGORIES.map((cat, index) => ({
    ...cat,
    display_order: index,
    tenant_id: tenantId,
  }));

  const { error } = await supabase
    .from('daep_behavior_categories')
    .insert(categoriesToInsert);

  if (error) {
    console.error('Error seeding behavior categories:', error);
    throw new Error('Failed to seed default categories');
  }

  await logDAEPAuditEvent(
    supabase,
    'behavior_category.seeded',
    userId,
    'bulk',
    `Seeded ${categoriesToInsert.length} default behavior categories`,
    tenantId,
    { count: categoriesToInsert.length }
  );

  revalidatePath('/daep/settings/behaviors');
  return { seeded: categoriesToInsert.length };
}

// ========== CREATE BEHAVIOR CATEGORY ==========

export async function createBehaviorCategory(input: CreateBehaviorCategoryInput): Promise<BehaviorCategory> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Validate input
  const validation = BehaviorCategorySchema.safeParse(input);
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.error.errors[0].message}`);
  }

  // Get next display_order
  const { data: maxOrder } = await supabase
    .from('daep_behavior_categories')
    .select('display_order')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.display_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('daep_behavior_categories')
    .insert({
      ...validation.data,
      display_order: nextOrder,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A behavior category with this name already exists');
    }
    console.error('Error creating behavior category:', error);
    throw new Error('Failed to create behavior category');
  }

  await logDAEPAuditEvent(
    supabase,
    'behavior_category.created',
    userId,
    data.id,
    `Created behavior category ${input.name}`,
    tenantId,
    { name: input.name, category_type: input.category_type }
  );

  revalidatePath('/daep/settings/behaviors');
  return data;
}

// ========== UPDATE BEHAVIOR CATEGORY ==========

export async function updateBehaviorCategory(
  categoryId: string,
  input: Partial<CreateBehaviorCategoryInput>
): Promise<BehaviorCategory> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get existing category for audit log
  const { data: existing } = await supabase
    .from('daep_behavior_categories')
    .select('*')
    .eq('id', categoryId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Behavior category not found');
  }

  const { data, error } = await supabase
    .from('daep_behavior_categories')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', categoryId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A behavior category with this name already exists');
    }
    console.error('Error updating behavior category:', error);
    throw new Error('Failed to update behavior category');
  }

  await logDAEPAuditEvent(
    supabase,
    'behavior_category.updated',
    userId,
    categoryId,
    `Updated behavior category ${data.name}`,
    tenantId,
    { before: existing, after: data }
  );

  revalidatePath('/daep/settings/behaviors');
  return data;
}

// ========== DEACTIVATE BEHAVIOR CATEGORY ==========

export async function deactivateBehaviorCategory(categoryId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_behavior_categories')
    .select('name')
    .eq('id', categoryId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Behavior category not found');
  }

  const { error } = await supabase
    .from('daep_behavior_categories')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', categoryId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deactivating behavior category:', error);
    throw new Error('Failed to deactivate behavior category');
  }

  await logDAEPAuditEvent(
    supabase,
    'behavior_category.deactivated',
    userId,
    categoryId,
    `Deactivated behavior category ${existing.name}`,
    tenantId
  );

  revalidatePath('/daep/settings/behaviors');
}

// ========== ACTIVATE BEHAVIOR CATEGORY ==========

export async function activateBehaviorCategory(categoryId: string): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from('daep_behavior_categories')
    .select('name')
    .eq('id', categoryId)
    .eq('tenant_id', tenantId)
    .single();

  if (!existing) {
    throw new Error('Behavior category not found');
  }

  const { error } = await supabase
    .from('daep_behavior_categories')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', categoryId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error activating behavior category:', error);
    throw new Error('Failed to activate behavior category');
  }

  await logDAEPAuditEvent(
    supabase,
    'behavior_category.activated',
    userId,
    categoryId,
    `Activated behavior category ${existing.name}`,
    tenantId
  );

  revalidatePath('/daep/settings/behaviors');
}

// ========== REORDER BEHAVIOR CATEGORIES ==========

export async function reorderBehaviorCategories(orderedIds: string[]): Promise<void> {
  const { userId, tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Update each category's display_order
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('daep_behavior_categories')
      .update({ display_order: index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);

  if (hasError) {
    console.error('Error reordering behavior categories');
    throw new Error('Failed to reorder behavior categories');
  }

  await logDAEPAuditEvent(
    supabase,
    'behavior_category.reordered',
    userId,
    'bulk',
    'Reordered behavior categories',
    tenantId,
    { new_order: orderedIds }
  );

  revalidatePath('/daep/settings/behaviors');
}

// ========== MOVE CATEGORY UP/DOWN ==========

export async function moveBehaviorCategoryUp(categoryId: string): Promise<void> {
  const { tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get all categories ordered by display_order
  const { data: categories } = await supabase
    .from('daep_behavior_categories')
    .select('id, display_order')
    .eq('tenant_id', tenantId)
    .order('display_order');

  if (!categories || categories.length === 0) return;

  const currentIndex = categories.findIndex((c) => c.id === categoryId);
  if (currentIndex <= 0) return; // Already at top or not found

  // Swap with previous category
  const newOrder = categories.map((c) => c.id);
  [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]];

  await reorderBehaviorCategories(newOrder);
}

export async function moveBehaviorCategoryDown(categoryId: string): Promise<void> {
  const { tenantId } = await checkDAEPAdminRole();
  const supabase = await createServerClient();

  // Get all categories ordered by display_order
  const { data: categories } = await supabase
    .from('daep_behavior_categories')
    .select('id, display_order')
    .eq('tenant_id', tenantId)
    .order('display_order');

  if (!categories || categories.length === 0) return;

  const currentIndex = categories.findIndex((c) => c.id === categoryId);
  if (currentIndex < 0 || currentIndex >= categories.length - 1) return; // Already at bottom or not found

  // Swap with next category
  const newOrder = categories.map((c) => c.id);
  [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];

  await reorderBehaviorCategories(newOrder);
}
