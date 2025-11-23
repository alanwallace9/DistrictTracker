'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Search, Map, ListChecks } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { VersionDisplay } from './VersionDisplay';

export function FeedbackNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isFeatures = pathname?.startsWith('/feedback/features') || pathname === '/feedback';
  const isBugs = pathname?.startsWith('/feedback/bugs');
  const isRoadmap = pathname?.startsWith('/feedback/roadmap');
  const isChangelog = pathname?.startsWith('/feedback/changelog');
  const isFeedbackSection = isFeatures || isBugs;

  const handleAuth = () => {
    if (user) {
      // Already logged in - could show profile menu
      router.push('/dashboard');
    } else {
      router.push('/login?redirect=/feedback');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/feedback/search?term=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Brand + Navigation */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/logo1.svg"
                alt="DistrictTracker"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-slate-900">DistrictTracker</span>
                <VersionDisplay />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
            {/* Feedback Link */}
            <button
              onClick={() => router.push('/feedback')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                isFeedbackSection
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-700 hover:text-blue-600'
              }`}
            >
              Feedback
            </button>

            {/* Roadmap Link */}
            <button
              onClick={() => router.push('/feedback/roadmap')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                isRoadmap
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-700 hover:text-blue-600'
              }`}
            >
              <Map className="w-4 h-4" />
              Roadmap
            </button>

            {/* Changelog Link */}
            <button
              onClick={() => router.push('/feedback/changelog')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                isChangelog
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-700 hover:text-blue-600'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              Changelog
            </button>
            </div>
          </div>

          {/* Right: Search + Auth */}
          <div className="flex items-center gap-3">
            {/* Animated Search Bar */}
            <div className={`flex items-center transition-all duration-700 ease-in-out ${searchOpen ? 'w-96' : 'w-auto'}`}>
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ideas..."
                      className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      autoFocus
                      onBlur={() => {
                        if (!searchQuery) {
                          setTimeout(() => setSearchOpen(false), 100);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>

            <Button
              onClick={handleAuth}
              className="bg-[#FF5437] hover:bg-[#E64A30] text-white font-medium px-6"
            >
              {user ? 'Dashboard' : 'Sign up / Log in'}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
