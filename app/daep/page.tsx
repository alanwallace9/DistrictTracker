'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowLeft, Bell, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { joinWaitlist, checkWaitlistStatus } from '@/app/actions/waitlist';

export default function DAPPage() {
  const router = useRouter();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already on waitlist
  useEffect(() => {
    async function checkStatus() {
      const { isOnWaitlist } = await checkWaitlistStatus('DAEP');
      setIsSubscribed(isOnWaitlist);
    }
    checkStatus();
  }, []);

  const handleJoinWaitlist = async () => {
    setIsLoading(true);
    setError(null);

    const result = await joinWaitlist('DAEP');

    if (result.success) {
      setIsSubscribed(true);
    } else {
      setError(result.error || 'Failed to join waitlist');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/logo1.svg"
              alt="District Tracker Logo"
              width={48}
              height={48}
              priority
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">DistrictTracker</h1>
              <p className="text-sm text-slate-600">DAEP Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-8 py-20">
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm p-12 text-center">
          <div className="w-24 h-24 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-12 h-12 text-green-600" />
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            DAEP Dashboard
          </h2>

          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            The DAEP (Disciplinary Alternative Education Program) Dashboard is currently under development.
            This module will provide comprehensive student data management, behavior tracking,
            and district-wide analytics.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-green-900 mb-3">Coming Soon:</h3>
            <ul className="text-left text-green-800 space-y-2 max-w-md mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Student behavior tracking and intervention management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>District-wide analytics and reporting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Performance metrics and data visualization</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Integration with existing student information systems</span>
              </li>
            </ul>
          </div>

          {/* Waitlist Signup */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-8 mb-8">
            {!isSubscribed ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Bell className="w-6 h-6 text-green-600" />
                  <h3 className="text-xl font-bold text-slate-900">Be the First to Know</h3>
                </div>
                <p className="text-slate-700 mb-6">
                  Join our waitlist to be notified when the DAEP Dashboard launches. Get early access and exclusive updates!
                </p>
                {error && (
                  <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleJoinWaitlist}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-8 py-3 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Joining...' : 'Sign Up for Waitlist'}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle className="w-12 h-12 text-green-600" />
                <h3 className="text-xl font-bold text-green-900">You're on the list!</h3>
                <p className="text-slate-700">
                  We'll notify you as soon as the DAEP Dashboard is ready to launch.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push('/modules')}
            className="inline-flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Modules
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-200 fixed bottom-0 w-full">
        <div className="max-w-7xl mx-auto px-8 py-4 text-center">
          <p className="text-xs text-slate-600">
            powered by{' '}
            <a
              href="https://districttracker.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline font-medium"
            >
              DistrictTracker.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
