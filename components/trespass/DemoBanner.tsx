'use client';

import { useDemoRole } from '@/contexts/DemoRoleContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export function DemoBanner() {
  const { isDemoMode, demoRole, setDemoRole, availableRoles } = useDemoRole();

  if (!isDemoMode) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">Demo Environment</span>
              <span className="hidden sm:inline"> - Data resets nightly at midnight CT.</span>
              <Link href="/signup" className="ml-2 underline hover:text-blue-100">
                Create your own account
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="demo-role" className="text-sm font-medium whitespace-nowrap">
              Experience as:
            </label>
            <Select value={demoRole} onValueChange={setDemoRole}>
              <SelectTrigger
                id="demo-role"
                className="w-[180px] bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-white/30"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{role.label}</span>
                      <span className="text-xs text-slate-500">{role.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Link
              href="/demo-guide"
              className="flex items-center gap-1 text-sm hover:text-blue-100 whitespace-nowrap"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden md:inline">How to use</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
