'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';

// Clerk user type for compatibility
type ClerkUser = {
  id: string;
  email: string | null;
  user_metadata: {
    role: string;
  };
};

type AuthContextType = {
  user: ClerkUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [user, setUser] = useState<ClerkUser | null>(null);

  useEffect(() => {
    if (isLoaded) {
      if (clerkUser) {
        // Map Clerk user to our auth context format
        setUser({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
          user_metadata: {
            role: (clerkUser.publicMetadata.role as string) || 'viewer',
          },
        });
      } else {
        setUser(null);
      }
    }
  }, [clerkUser, isLoaded]);

  const signUp = async (_email: string, _password: string) => {
    // Clerk handles sign-up through its UI components
    return { error: new Error('Use Clerk sign-up page') };
  };

  const signIn = async (_email: string, _password: string) => {
    // Clerk handles sign-in through its UI components
    return { error: new Error('Use Clerk sign-in page') };
  };

  const signOut = async () => {
    await clerkSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading: !isLoaded, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
