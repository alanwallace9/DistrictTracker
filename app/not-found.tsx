'use client';

import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  // Get a friendly greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 17) return "Good afternoon!";
    return "Good evening!";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <a
            href="/"
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
        <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-lg p-8 text-center">
          {/* Fun 404 Display */}
          <div className="mb-6">
            <div className="text-8xl font-bold text-blue-200 mb-2">404</div>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <HelpCircle className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          {/* Message */}
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            This is not the page you&apos;re looking for...
          </h2>
          <p className="text-slate-600 mb-2">
            {getGreeting()} Looks like you took a wrong turn somewhere.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            No worries - even the best navigators get lost sometimes. Let&apos;s get you back on track!
          </p>

          {/* Helpful Options */}
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/modules')}
              className="w-full justify-center gap-2 h-12 text-base bg-blue-600 hover:bg-blue-700"
            >
              <Home className="w-5 h-5" />
              Go to Module Selection
            </Button>

            <Button
              variant="outline"
              onClick={() => router.back()}
              className="w-full justify-center gap-2 h-12 text-base border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back to Previous Page
            </Button>
          </div>

          {/* Quick Links */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-3">Looking for something specific?</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => router.push('/daep')}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                DAEP Dashboard
              </button>
              <button
                onClick={() => router.push('/trespass')}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                TrespassTracker
              </button>
              <button
                onClick={() => router.push('/feedback')}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                Feedback
              </button>
            </div>
          </div>

          {/* Help text */}
          <p className="text-xs text-slate-400 mt-6">
            If you keep ending up here, please{' '}
            <a
              href="/feedback/bugs"
              className="text-blue-600 hover:underline"
            >
              let us know
            </a>
            {' '}- we&apos;d love to help!
          </p>
        </div>
      </div>
    </div>
  );
}
