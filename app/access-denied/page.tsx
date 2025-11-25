'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Shield, GraduationCap, ArrowLeft, Play } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getUserProfile } from '@/app/actions/users';
import { useAuth } from '@/contexts/AuthContext';

function AccessDeniedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [moduleAccess, setModuleAccess] = useState<'trespass_only' | 'daep_only' | 'both'>('both');
  const [isLoading, setIsLoading] = useState(true);

  const attemptedModule = searchParams.get('module') || 'unknown';
  const attemptedPath = searchParams.get('path') || '/';

  useEffect(() => {
    const fetchModuleAccess = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(user.id);
        if (profile?.module_access) {
          setModuleAccess(profile.module_access as 'trespass_only' | 'daep_only' | 'both');
        }
      } catch (error) {
        console.error('Failed to fetch module access:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModuleAccess();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <a
            href="https://districttracker.com"
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
