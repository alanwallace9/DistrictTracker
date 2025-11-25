'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  DoorOpen,
  Clock,
  FileText,
  Calendar,
  Tag,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

const SETTINGS_TABS = [
  { href: '/daep/settings', label: 'General', icon: Settings, exact: true },
  { href: '/daep/settings/rooms', label: 'Rooms', icon: DoorOpen },
  { href: '/daep/settings/schedules', label: 'Schedules', icon: Clock },
  { href: '/daep/settings/codes', label: 'Discipline Codes', icon: FileText },
  { href: '/daep/settings/calendar', label: 'Calendar', icon: Calendar },
  { href: '/daep/settings/behaviors', label: 'Behaviors', icon: Tag },
];

const ALLOWED_ROLES = ['master_admin', 'district_admin', 'daep_admin_l1'];

export default function DAEPSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      const role = (user.publicMetadata?.role as string) || 'viewer';
      if (ALLOWED_ROLES.includes(role)) {
        setIsAuthorized(true);
      } else {
        router.push('/daep/access-denied');
      }
    }
  }, [user, isLoaded, router]);

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  const getActiveTab = () => {
    const tab = SETTINGS_TABS.find((t) =>
      t.exact ? pathname === t.href : pathname?.startsWith(t.href)
    );
    return tab?.href || '/daep/settings';
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">DAEP Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure rooms, schedules, discipline codes, and more
            </p>
          </div>
          <Link href="/daep">
            <Button
              variant="outline"
              size="sm"
              className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to DAEP
            </Button>
          </Link>
        </div>

        {/* Tab Navigation */}
        <Tabs value={getActiveTab()} className="mb-6">
          <TabsList className="bg-white border border-slate-200 p-1 h-auto flex-wrap">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.exact
                ? pathname === tab.href
                : pathname?.startsWith(tab.href);
              return (
                <Link key={tab.href} href={tab.href}>
                  <TabsTrigger
                    value={tab.href}
                    className={`gap-2 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </TabsTrigger>
                </Link>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Content */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
