'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shield, GraduationCap, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { getUserProfile } from '@/app/actions/users';
import { useAuth } from '@/contexts/AuthContext';

interface Module {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  bgColor: string;
  iconColor: string;
  requiredAccess: 'trespass' | 'daep';  // Which module_access allows this
}

export default function ModulesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [moduleAccess, setModuleAccess] = useState<'trespass_only' | 'daep_only' | 'both'>('both');
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);

  // Check if user is on base domain and redirect to their tenant subdomain
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (typeof window === 'undefined') return;

      const hostname = window.location.hostname;
      const parts = hostname.split('.');

      // Check if we're on base domain (districttracker.com or www.districttracker.com)
      // Not on a subdomain like demo.districttracker.com
      const isBaseDomain = parts.length < 3 || parts[0] === 'www';
      const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

      if (isBaseDomain && !isLocalhost) {
        setIsRedirecting(true);
        try {
          // Fetch user's tenant_id
          const response = await fetch('/api/auth/user-tenant');
          const data = await response.json();

          if (data.tenant_id) {
            // Redirect to tenant subdomain
            const protocol = window.location.protocol;

            // Extract base domain (e.g., districttracker.com from www.districttracker.com)
            const baseDomain = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;

            window.location.href = `${protocol}//${data.tenant_id}.${baseDomain}/modules`;
          }
        } catch (error) {
          console.error('Failed to fetch user tenant:', error);
          setIsRedirecting(false);
        }
      }
    };

    checkAndRedirect();
  }, []);

  // Fetch user's module_access from their profile
  useEffect(() => {
    const fetchModuleAccess = async () => {
      if (!user) {
        setIsLoadingAccess(false);
        return;
      }

      try {
        const profile = await getUserProfile(user.id);
        if (profile?.module_access) {
          setModuleAccess(profile.module_access as 'trespass_only' | 'daep_only' | 'both');
        }
      } catch (error) {
        console.error('Failed to fetch module access:', error);
        // Default to 'both' if fetch fails
      } finally {
        setIsLoadingAccess(false);
      }
    };

    fetchModuleAccess();
  }, [user]);

  const allModules: Module[] = [
    {
      id: 'trespass',
      name: 'TrespassTracker',
      description: 'Manage trespass notices, track incidents, and maintain campus security records.',
      icon: <Shield className="w-10 h-10" />,
      href: '/trespass',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      requiredAccess: 'trespass',
    },
    {
      id: 'daep',
      name: 'DAEP Dashboard',
      description: 'Student data management, behavior tracking, and comprehensive district analytics.',
      icon: <GraduationCap className="w-10 h-10" />,
      href: '/daep',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      requiredAccess: 'daep',
    },
  ];

  // Filter modules based on user's module_access (AC 1.2.4)
  const modules = allModules.filter((module) => {
    if (moduleAccess === 'both') return true;
    if (moduleAccess === 'trespass_only' && module.requiredAccess === 'trespass') return true;
    if (moduleAccess === 'daep_only' && module.requiredAccess === 'daep') return true;
    return false;
  });

  // Auto-redirect if user only has access to one module
  useEffect(() => {
    if (!isLoadingAccess && modules.length === 1) {
      router.push(modules[0].href);
    }
  }, [isLoadingAccess, modules, router]);

  const handleModuleClick = (module: Module) => {
    router.push(module.href);
  };

  // Show loading state while redirecting or loading access
  if (isRedirecting || isLoadingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm text-slate-600">
            {isRedirecting ? 'Redirecting to your workspace...' : 'Loading modules...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-6">
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
              <p className="text-sm text-slate-600">v1.8.0</p>
            </div>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Choose Your Module
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Select a module below to access its features and manage your district data.
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {modules.map((module) => (
            <div
              key={module.id}
              className="group bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-lg transition-all duration-200 p-8"
            >
              <div className="flex flex-col h-full">
                {/* Icon */}
                <div className={`w-20 h-20 ${module.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200`}>
                  <div className={module.iconColor}>
                    {module.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                    {module.name}
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {module.description}
                  </p>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  {module.id === 'trespass' ? (
                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={() => router.push(module.href)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg transition-all hover:bg-blue-50"
                      >
                        Launch Module →
                      </button>
                      <a
                        href="https://demo.districttracker.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg transition-all hover:bg-slate-50"
                      >
                        Explore Demo
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={() => router.push(module.href)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg transition-all hover:bg-blue-50"
                      >
                        Learn More →
                      </button>
                      <span className="text-xs text-slate-600 font-normal">
                        (coming soon)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-slate-500">
            Need help? Contact your district administrator or visit our{' '}
            <a href="/feedback" className="text-blue-600 hover:underline font-medium">
              support center
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-8 py-6 text-center">
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
