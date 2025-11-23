import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

/**
 * Server-side Supabase client for use in Server Components and Server Actions
 *
 * Uses Clerk's native Supabase integration (April 2025+)
 * No JWT template needed - Clerk tokens are automatically trusted by Supabase
 */
export async function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Get Clerk session token for Supabase RLS (native integration - no template parameter)
  const { getToken } = await auth();
  const supabaseAccessToken = await getToken();

  // Create Supabase client with Clerk JWT
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: supabaseAccessToken
        ? { Authorization: `Bearer ${supabaseAccessToken}` }
        : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabase;
}
