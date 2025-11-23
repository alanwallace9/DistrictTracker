'use server';

import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type Campus = {
  id: string;
  tenant_id: string;
  name: string;
  abbreviation: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

/**
 * Get all campuses for the current user's tenant
 */
export async function getCampuses() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('campuses')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching campuses:', error);
    throw new Error(error.message);
  }

  return data as Campus[];
}

/**
 * Create a new campus
 */
export async function createCampus(campus: {
  id: string;
  name: string;
  abbreviation?: string;
}) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const supabase = await createServerClient();

  // Get user's profile to get tenant_id
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', userId)
    .single();

  if (!profile) {
    throw new Error('User profile not found');
  }

  if (!['district_admin', 'master_admin'].includes(profile.role)) {
    throw new Error('Only district and master admins can create campuses');
  }

  const { data, error } = await supabase
    .from('campuses')
    .insert({
      id: campus.id,
      tenant_id: profile.tenant_id,
      name: campus.name,
      abbreviation: campus.abbreviation || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating campus:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  return data as Campus;
}

/**
 * Update an existing campus
 */
export async function updateCampus(
  campusId: string,
  updates: {
    name?: string;
    abbreviation?: string;
    status?: 'active' | 'inactive';
  }
) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('campuses')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campusId)
    .select()
    .single();

  if (error) {
    console.error('Error updating campus:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  return data as Campus;
}

/**
 * Delete a campus
 */
export async function deleteCampus(campusId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const supabase = await createServerClient();

  const { error } = await supabase
    .from('campuses')
    .delete()
    .eq('id', campusId);

  if (error) {
    console.error('Error deleting campus:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  return { success: true };
}
