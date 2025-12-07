'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings,
  DoorOpen,
  Clock,
  FileText,
  Calendar,
  Tag,
  ArrowLeft,
  Building,
  Menu,
  X,
  Palette,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AdminTenantProvider, useAdminTenant } from '@/contexts/AdminTenantContext';
import { useDemoRole } from '@/contexts/DemoRoleContext';
import { getUserProfile } from '@/app/actions/users';
import { DevRoleSwitcher } from '@/components/dev/DevRoleSwitcher';

const NAV_ITEMS = [
  { href: '/daep/settings', label: 'General', icon: Settings, exact: true },
  { href: '/daep/settings/appearance', label: 'Appearance', icon: Palette },
  { href: '/daep/settings/rooms', label: 'Rooms', icon: DoorOpen },
  { href: '/daep/settings/schedules', label: 'Schedules', icon: Clock },
  { href: '/daep/settings/codes', label: 'Discipline Codes', icon: FileText },
  { href: '/daep/settings/calendar', label: 'Calendar', icon: Calendar },
  { href: '/daep/settings/behaviors', label: 'Behaviors', icon: Tag },
  { href: '/daep/settings/badges', label: 'Badges', icon: Trophy },
];

const ALLOWED_ROLES = ['super_admin', 'district_admin', 'daep_admin_l1'];

function DAEPSettingsLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [actualRole, setActualRole] = useState<string>('viewer');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { tenants, selectedTenantId, setSelectedTenantId, tenantsLoading } = useAdminTenant();
  const { isDemoMode, demoRole } = useDemoRole();

  // Determine effective role (use demo role if in demo mode, otherwise use actual user role)
  const effectiveRole = isDemoMode ? demoRole : actualRole;

  const closeSidebar = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSidebarOpen(false);
      setIsClosing(false);
    }, 200);
  };

  const toggleSidebar = () => {
    if (sidebarOpen) {
      closeSidebar();
    } else {
      setSidebarOpen(true);
    }
  };

  // Load actual role from database on mount
  useEffect(() => {
    async function loadRole() {
      if (!isLoaded || !user) return;

      try {
        const profile = await getUserProfile(user.id);
        const role = profile?.role || 'viewer';
        setActualRole(role);
      } catch (error) {
        console.error('[DAEP Settings] Error fetching user profile:', error);
        router.push('/daep/access-denied');
      }
    }

    loadRole();
  }, [user, isLoaded, router]);

  // Check authorization based on effective role (respects demo role switching)
  useEffect(() => {
    if (!isLoaded || !user || actualRole === 'viewer') return;

    // Allow access if effective role is in allowed list
    if (ALLOWED_ROLES.includes(effectiveRole)) {
      setIsAuthorized(true);
    } else {
      console.log('[DAEP Settings] Redirecting - effective role not authorized:', effectiveRole);
      setIsAuthorized(false);
      router.push('/daep/access-denied');
    }
  }, [effectiveRole, actualRole, isLoaded, user, router]);

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

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  // Tenant selector uses effectiveRole - when impersonating, see UI as that role would
  // Exception: On production (not demo), super_admin keeps tenant switching ability
  const showTenantSelector = selectedTenantId !== 'demo'
    ? actualRole === 'super_admin'  // Production: use actual role
    : effectiveRole === 'super_admin';  // Demo: use impersonated role

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="bg-white/95 border-b border-slate-200 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Hamburger (mobile) + Logo + Title */}
            <div className="flex items-center space-x-3">
              {/* Mobile: Hamburger Menu Button */}
              <button
                onClick={toggleSidebar}
                className="nav:hidden h-10 w-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted"
                aria-label="Menu"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Image
                src="/assets/logo1.svg"
                alt="District Tracker Logo"
                width={40}
                height={40}
                className="w-8 h-8 sm:w-10 sm:h-10"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-bold text-foreground">DAEP Settings</h1>
                  {selectedTenantId === 'demo' && effectiveRole && (
                    <span className="px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-[rgb(var(--daep-info))]/10 text-[rgb(var(--daep-info))] rounded border border-[rgb(var(--daep-info))]/20 whitespace-nowrap">
                      {effectiveRole.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Configure rooms, schedules, and more
                </p>
              </div>
            </div>

            {/* Right: Desktop controls (hidden on mobile) */}
            <div className="hidden nav:flex items-center gap-4">
              {/* Tenant Selector - Only for super_admin with multiple tenants */}
              {showTenantSelector && tenants.length > 1 && !tenantsLoading && selectedTenantId && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger className="w-[220px] bg-white border border-slate-300 shadow-sm focus:ring-2 focus:ring-slate-200">
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Dev Role Switcher - only visible for whitelisted users */}
              <DevRoleSwitcher />

              <Link href="/daep">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card border border-border text-foreground shadow-sm hover:bg-muted"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to DAEP
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="nav:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start relative">
          {/* Sidebar Navigation */}
          <aside className={`
            w-64 flex-shrink-0 bg-white p-4
            nav:static nav:block nav:bg-transparent nav:p-0
            fixed top-0 left-0 h-full z-50 overflow-y-auto shadow-xl nav:shadow-none
            ${sidebarOpen ? 'block' : 'hidden nav:block'}
            ${sidebarOpen && !isClosing ? 'animate-in slide-in-from-left duration-200' : ''}
            ${isClosing ? 'animate-out slide-out-to-left duration-200' : ''}
          `}>
            {/* Mobile: Close button */}
            <div className="nav:hidden flex justify-between items-center mb-4 pb-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Settings Menu</h2>
              <button
                onClick={closeSidebar}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);

                return (
                  <Link key={item.href} href={item.href} onClick={() => {
                    if (window.innerWidth < 1085) {
                      closeSidebar();
                    }
                  }}>
                    <Button
                      variant={active ? 'secondary' : 'ghost'}
                      className={`w-full justify-start rounded-xl ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground hover:bg-card hover:text-foreground border border-transparent hover:border-border'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile: Controls at bottom */}
            <div className="nav:hidden mt-6 pt-6 border-t border-border space-y-3">
              {/* Dev Role Switcher - only visible for whitelisted users */}
              <DevRoleSwitcher />

              {/* Tenant Selector - Only for super_admin with multiple tenants */}
              {showTenantSelector && tenants.length > 1 && !tenantsLoading && selectedTenantId && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">District</label>
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger className="w-full bg-card border border-border">
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Link href="/daep" onClick={closeSidebar}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 bg-card border border-border text-foreground hover:bg-muted"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to DAEP
                </Button>
              </Link>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DAEPSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminTenantProvider>
      <DAEPSettingsLayoutInner>{children}</DAEPSettingsLayoutInner>
    </AdminTenantProvider>
  );
}
