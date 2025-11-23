'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    setIsLoading(true);
    setError('');

    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({
          session: signInAttempt.createdSessionId,
        });

        // Wait briefly to ensure session cookie is fully written to browser
        await new Promise(resolve => setTimeout(resolve, 50));

        // Check if logging in from app.districttracker.com
        const hostname = window.location.hostname;
        const isAppSubdomain = hostname.startsWith('app.');

        if (isAppSubdomain) {
          // Fetch user's tenant_id to redirect to their subdomain
          try {
            const response = await fetch('/api/auth/user-tenant');
            const data = await response.json();

            if (data.tenant_id) {
              // Redirect to user's tenant subdomain
              const protocol = window.location.protocol;

              // Extract base domain (e.g., districttracker.com from app.districttracker.com)
              const parts = hostname.split('.');
              const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;

              window.location.href = `${protocol}//${data.tenant_id}.${baseDomain}/modules`;
              return;
            }
          } catch (err) {
            console.error('Failed to fetch user tenant:', err);
            // Fallback to /modules on current domain
          }
        }

        // Use window.location.href for full page reload
        // This is necessary because:
        // 1. Clerk's session cookie must be sent with the next HTTP request
        // 2. Client-side navigation (router.push) doesn't reliably include the new cookie
        // 3. Middleware needs to see the cookie to authorize access
        // Security: Safe because URL is hardcoded internal path (no user input)
        window.location.href = '/modules';
        // Keep loading state active during redirect (don't set to false)
        return;
      }
    } catch (err: any) {
      // Check if session already exists
      const errorMessage = err.errors?.[0]?.message || '';
      const errorCode = err.errors?.[0]?.code || '';

      if (errorMessage.includes('session') || errorCode === 'session_exists') {
        // User already has an active session, redirect them to their tenant
        try {
          const response = await fetch('/api/auth/user-tenant');
          const data = await response.json();

          if (data.tenant_id) {
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;

            // Extract base domain (e.g., districttracker.com from any subdomain)
            const parts = hostname.split('.');
            const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;

            window.location.href = `${protocol}//${data.tenant_id}.${baseDomain}/modules`;
            return;
          }
        } catch (fetchErr) {
          console.error('Failed to fetch user tenant:', fetchErr);
          // Fallback to modules on current domain
          window.location.href = '/modules';
          return;
        }
      }

      setError(errorMessage || 'Invalid email or password');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm rounded-2xl">
        {/* Header */}
        <div className="text-center pt-8 pb-6 px-8">
          <div className="w-16 h-16 mx-auto flex items-center justify-center mb-4">
            <Image
              src="/assets/logo1.svg"
              alt="District Tracker Logo"
              width={64}
              height={64}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">District Tracker</h1>
          <p className="text-slate-600">Please sign in to your account</p>
        </div>

        {/* Custom Login Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="text-slate-900 font-medium mb-2 block">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading}
              className="bg-slate-50/50 border border-slate-200 text-slate-900 placeholder:text-slate-500 px-4 py-3 text-base rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-400 w-full focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-slate-900 font-medium mb-2 block">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                className="bg-slate-50/50 border border-slate-200 text-slate-900 placeholder:text-slate-500 px-4 py-3 text-base rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-400 w-full focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm h-11 text-base rounded-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Continue'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center px-8 pb-8 pt-6 border-t border-slate-200 mx-8">
          <p className="text-xs text-slate-600">
            powered by{' '}
            <a
              href="https://districttracker.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              DistrictTracker.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
