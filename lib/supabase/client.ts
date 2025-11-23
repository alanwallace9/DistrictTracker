'use client';

import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import { useMemo, useEffect, useState } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Hook to create an authenticated Supabase client on the client side
 * Uses Clerk's getToken() to authenticate with Supabase RLS
 */
export function useSupabaseClient() {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const supabaseToken = await getToken();
      setToken(supabaseToken);
    };
    fetchToken();
  }, [getToken]);

  const supabase = useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }, [token]);

  return supabase;
}
