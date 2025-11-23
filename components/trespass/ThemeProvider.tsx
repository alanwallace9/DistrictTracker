'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/app/actions/users';

/**
 * ThemeProvider - Loads and applies user's theme preference
 *
 * Runs on client-side to:
 * 1. Fetch user's theme preference from Supabase
 * 2. Apply data-theme attribute to <html>
 * 3. Listen for system theme changes when theme is 'system'
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    const loadTheme = async () => {
      if (!user) {
        // Default to light theme for logged-out users
        document.documentElement.setAttribute('data-theme', 'light');
        return;
      }

      try {
        const profile = await getUserProfile(user.id);
        const userTheme = profile?.theme || 'light';
        document.documentElement.setAttribute('data-theme', userTheme);
      } catch (error) {
        console.error('Error loading theme:', error);
        // Fallback to light theme
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };

    loadTheme();
  }, [user]);

  return <>{children}</>;
}
