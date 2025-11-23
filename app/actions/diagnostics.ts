'use server';

import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Diagnostic function to check user's authentication and tenant status
 * This helps debug RLS policy issues
 */
export async function checkUserDiagnostics() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return {
      error: 'No user logged in',
      userId: null,
      clerkClaims: null,
      supabaseProfile: null,
      supabaseToken: null,
    };
  }

  // Get Clerk session claims
  const clerkClaims = {
    userId,
    sessionClaims,
  };

  // Try to get Supabase profile
  const supabase = await createServerClient();

  // Check what Supabase sees as the current user
  const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();

  // Get user profile from database
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  // Try to call the RLS helper functions via a query
  const { data: rlsCheck, error: rlsError } = await supabase
    .rpc('get_my_tenant_id');

  return {
    clerkUserId: userId,
    clerkClaims,
    supabaseUser: supabaseUser ? {
      id: supabaseUser.id,
      email: supabaseUser.email,
      role: supabaseUser.role,
    } : null,
    authError: authError?.message,
    profile,
    profileError: profileError?.message,
    rlsCheck,
    rlsError: rlsError?.message,
  };
}
