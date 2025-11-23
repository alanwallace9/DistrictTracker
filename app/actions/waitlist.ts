'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for server actions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Add user to waitlist for a specific module
 */
export async function joinWaitlist(moduleName: string) {
  try {
    const { userId } = await auth.protect();

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get user's tenant_id from profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    // Insert waitlist entry
    const { error } = await supabaseAdmin
      .from('waitlist')
      .insert({
        user_id: userId,
        module_name: moduleName,
        tenant_id: profile?.tenant_id || null,
      });

    if (error) {
      // If it's a duplicate entry error, that's okay - user is already on waitlist
      if (error.code === '23505') {
        return { success: true, message: 'You are already on the waitlist!' };
      }
      throw error;
    }

    return { success: true, message: 'Successfully joined waitlist!' };
  } catch (error) {
    console.error('Error joining waitlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join waitlist'
    };
  }
}

/**
 * Check if user is already on waitlist for a module
 */
export async function checkWaitlistStatus(moduleName: string) {
  try {
    const { userId } = await auth.protect();

    if (!userId) {
      return { isOnWaitlist: false };
    }

    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .select('id')
      .eq('user_id', userId)
      .eq('module_name', moduleName)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is expected if not on waitlist
      throw error;
    }

    return { isOnWaitlist: !!data };
  } catch (error) {
    console.error('Error checking waitlist status:', error);
    return { isOnWaitlist: false };
  }
}

/**
 * Get all waitlist entries (master admin only)
 */
export async function getWaitlistEntries() {
  try {
    const { userId } = await auth.protect();

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Verify user is master_admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role !== 'master_admin') {
      throw new Error('Unauthorized: Only master admins can view waitlist');
    }

    // Fetch waitlist with user details
    const { data, error } = await supabaseAdmin
      .from('waitlist')
      .select(`
        id,
        module_name,
        tenant_id,
        created_at,
        user_id,
        user_profiles!fk_waitlist_user (
          first_name,
          last_name,
          email,
          display_organization
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch waitlist',
      data: []
    };
  }
}
