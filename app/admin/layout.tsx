'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Building2, History, LayoutDashboard, ArrowLeft, FileBarChart, Building, MessageSquare, FileText, Bell, Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { AdminTenantProvider, useAdminTenant } from '@/contexts/AdminTenantContext';

function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string>('viewer');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { tenants, selectedTenantId, setSelectedTenantId, tenantsLoading } = useAdminTenant();

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

  useEffect(() => {
    // Middleware already protects this route, so user will always be authenticated
    // We just need to check the role from Clerk's publicMetadata
    if (isLoaded && user) {
      const role = (user.publicMetadata?.role as string) || 'viewer';
      setUserRole(role);

      console.log('[Admin Layout] User loaded:', {
        userId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        role: role,
        publicMetadata: user.publicMetadata,
      });

      // Allow master_admin and district_admin to access admin pages
      if (role === 'master_admin' || role === 'district_admin') {
        setIsAuthorized(true);
      } else {
        console.log('[Admin Layout] Redirecting non-admin to dashboard');
        // Redirect non-admins to dashboard
        router.push('/dashboard');
      }
    }
  }, [user, isLoaded, router]);

  // Show loading state while checking authorization
  // Middleware ensures user is authenticated
  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authorized (will redirect via useEffect)
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

  const navItems = [
    {
      href: '/admin',
      label: 'Overview',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: '/admin/users',
      label: 'Users',
      icon: Users,
    },
    {
      href: '/admin/records',
      label: 'Records',
      icon: FileText,
    },
    {
      href: '/admin/campuses',
      label: 'Campuses',
      icon: Building2,
    },
    {
      href: '/admin/audit-logs',
      label: 'Audit Logs',
      icon: History,
    },
    {
      href: '/admin/reports',
      label: 'Reports',
      icon: FileBarChart,
    },
    {
      href: '/admin/feedback',
      label: 'Feedback',
      icon: MessageSquare,
      masterAdminOnly: true,
    },
    {
      href: '/admin/tenants',
      label: 'Tenants',
      icon: Building,
      masterAdminOnly: true,
    },
    {
      href: '/admin/waitlist',
      label: 'Waitlist',
      icon: Bell,
      masterAdminOnly: true,
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

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
                className="nav:hidden h-10 w-10 flex items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
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
                  <h1 className="text-base sm:text-xl font-bold text-foreground">District Tracker</h1>
                  {selectedTenantId === 'demo' && userRole && (
                    <span className="px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700 whitespace-nowrap">
                      {userRole.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">Admin Panel</p>
              </div>
            </div>

            {/* Right: Desktop controls (hidden on mobile) */}
            <div className="hidden nav:flex items-center gap-4">
              {/* Tenant Selector - Only for master_admin with multiple tenants */}
              {userRole === 'master_admin' && tenants.length > 1 && !tenantsLoading && selectedTenantId && (
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

              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
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
            <div className="nav:hidden flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Menu</h2>
              <button
                onClick={closeSidebar}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-2">
              {navItems
                .filter((item) => !item.masterAdminOnly || userRole === 'master_admin')
                .map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.exact);

                  return (
                    <Link key={item.href} href={item.href} onClick={() => {
                      // Close sidebar on mobile when clicking a nav item
                      if (window.innerWidth < 1085) {
                        closeSidebar();
                      }
                    }}>
                      <Button
                        variant={active ? 'secondary' : 'ghost'}
                        className={`w-full justify-start rounded-xl ${
                          active
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-slate-700 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
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
            <div className="nav:hidden mt-6 pt-6 border-t border-slate-200 space-y-3">
              {/* Tenant Selector - Only for master_admin with multiple tenants */}
              {userRole === 'master_admin' && tenants.length > 1 && !tenantsLoading && selectedTenantId && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">District</label>
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger className="w-full bg-white border border-slate-300">
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

              <Link href="/dashboard" onClick={closeSidebar}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminTenantProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminTenantProvider>
  );
}
