'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type UserProfileUpdate = {
  display_name?: string;
  theme?: 'light' | 'dark' | 'system';
  notification_days?: number;
};

/**
 * Update user profile (display name, theme, etc.)
 * Profile must already exist (created via webhook)
 */
export async function updateUserProfile(userId: string, updates: UserProfileUpdate) {
  const supabase = await createServerClient();

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existingProfile) {
    throw new Error('User profile not found. Please sign out and sign in again to sync your profile.');
  }

  // Update only - never create
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard');
  return data;
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  const supabase = await createServerClient();

  const { data, error} = await supabase
    .from('user_profiles')
    .select(`
      *,
      tenant:tenants!fk_user_profiles_tenant(short_display_name)
    `)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get display name only (lightweight version)
 */
export async function getDisplayName(userId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching display name:', error);
    return null;
  }

  return data?.display_name || null;
}
