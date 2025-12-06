'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Shield, GraduationCap, ArrowLeft, Play, Building2, Home } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getUserProfile } from '@/app/actions/users';
import { useAuth } from '@/contexts/AuthContext';

function AccessDeniedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [moduleAccess, setModuleAccess] = useState<'trespass_only' | 'daep_only' | 'both'>('both');
  const [userTenantId, setUserTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reason = searchParams.get('reason') || 'module';
  const attemptedModule = searchParams.get('module') || 'unknown';
  const attemptedTenant = searchParams.get('tenant') || 'unknown';

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(user.id);
        if (profile?.module_access) {
          setModuleAccess(profile.module_access as 'trespass_only' | 'daep_only' | 'both');
        }
        if (profile?.tenant_id) {
          setUserTenantId(profile.tenant_id);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const getAuthorizedModuleInfo = () => {
    if (moduleAccess === 'trespass_only') {
      return {
        name: 'TrespassTracker',
        href: '/trespass',
        icon: <Shield className="w-5 h-5" />,
        color: 'blue',
      };
    }
    if (moduleAccess === 'daep_only') {
      return {
        name: 'DAEP Dashboard',
        href: '/daep',
        icon: <GraduationCap className="w-5 h-5" />,
        color: 'green',
      };
    }
    return null;
  };

  const authorizedModule = getAuthorizedModuleInfo();
  const deniedModuleName = attemptedModule === 'daep' ? 'DAEP Dashboard' : 'TrespassTracker';

  // Build the user's tenant URL for production
  const getUserTenantUrl = () => {
    if (!userTenantId) return null;
    // In production, redirect to their tenant subdomain
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      // On localhost, just go to modules (middleware handles staging)
      return '/modules';
    }
    // Extract base domain
    const parts = hostname.split('.');
    const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;
    return `https://${userTenantId}.${baseDomain}/modules`;
  };

  const getDemoUrl = () => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return '/modules'; // On localhost, demo is accessible via normal routes
    }
    return 'https://demo.districttracker.com/modules';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Wrong tenant access (trying to access another district's data)
  if (reason === 'wrong_tenant' || reason === 'restricted_tenant') {
    const userTenantUrl = getUserTenantUrl();
    const hasTenant = !!userTenantId;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-8 py-6">
            <a
              href="https://www.districttracker.com"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit"
            >
              <Image
                src="/assets/logo1.svg"
                alt="District Tracker Logo"
                width={48}
                height={48}
                priority
              />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">DistrictTracker</h1>
              </div>
            </a>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto px-8 py-16">
          <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg p-8 text-center">
            {/* Icon */}
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-amber-600" />
            </div>

            {/* Message */}
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              {hasTenant ? "Wrong District" : "Access Not Available"}
            </h2>
            <p className="text-slate-600 mb-8">
              {hasTenant ? (
                <>
                  You tried to access <strong className="text-amber-700">{attemptedTenant}</strong>, but your account is associated with a different district.
                  No worries - we can help you get where you need to go!
                </>
              ) : (
                <>
                  You don&apos;t currently have access to this application.
                  Would you like to explore what DistrictTracker can do?
                </>
              )}
            </p>

            {/* Options */}
            <div className="space-y-4">
              {/* Option 1: Go to their assigned tenant */}
              {hasTenant && userTenantUrl && (
                <Button
                  onClick={() => window.location.href = userTenantUrl}
                  className="w-full justify-center gap-2 h-12 text-base bg-blue-600 hover:bg-blue-700"
                >
                  <Home className="w-5 h-5" />
                  Go to Your District ({userTenantId})
                </Button>
              )}

              {/* Option 2: Try the demo */}
              <Button
                variant={hasTenant ? "outline" : "default"}
                onClick={() => window.location.href = getDemoUrl()}
                className={`w-full justify-center gap-2 h-12 text-base ${
                  hasTenant
                    ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-400 hover:text-green-800'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <Play className="w-5 h-5" />
                {hasTenant ? 'Explore Demo Environment' : 'Try the Demo'}
              </Button>

              {/* Back option */}
              <Button
                variant="ghost"
                onClick={() => router.push('/login')}
                className="w-full justify-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Button>
            </div>

            {/* Help text */}
            <p className="text-xs text-slate-500 mt-8">
              {hasTenant ? (
                "Need access to a different district? Contact your administrator."
              ) : (
                <>
                  Interested in DistrictTracker for your district?{' '}
                  <a
                    href="https://www.districttracker.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Visit districttracker.com
                  </a>{' '}
                  to learn more.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Module access restriction (original behavior)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <a
            href="https://www.districttracker.com"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit"
          >
            <Image
              src="/assets/logo1.svg"
              alt="District Tracker Logo"
              width={48}
              height={48}
              priority
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">DistrictTracker</h1>
            </div>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-8 py-16">
        <div className="bg-white rounded-2xl border-2 border-red-200 shadow-lg p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-red-600" />
          </div>

          {/* Message */}
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Access Restricted
          </h2>
          <p className="text-slate-600 mb-8">
            You don&apos;t have permission to access the <strong>{deniedModuleName}</strong> module.
            Your account is configured for limited module access.
          </p>

          {/* Options */}
          <div className="space-y-4">
            {authorizedModule && (
              <Button
                onClick={() => router.push(authorizedModule.href)}
                className={`w-full justify-center gap-2 h-12 text-base ${
                  authorizedModule.color === 'blue'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {authorizedModule.icon}
                Return to {authorizedModule.name}
              </Button>
            )}

            {/* Only show demo option if TrespassTracker demo exists and they tried to access trespass */}
            {attemptedModule === 'trespass' && (
              <Button
                variant="outline"
                onClick={() => window.location.href = 'https://demo.districttracker.com/trespass'}
                className="w-full justify-center gap-2 h-12 text-base border-slate-300 hover:bg-slate-50"
              >
                <Play className="w-5 h-5" />
                Try TrespassTracker Demo Instead
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => router.push('/modules')}
              className="w-full justify-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Module Selection
            </Button>
          </div>

          {/* Help text */}
          <p className="text-xs text-slate-500 mt-8">
            Need access to additional modules? Contact your district administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <AccessDeniedContent />
    </Suspense>
  );
}
