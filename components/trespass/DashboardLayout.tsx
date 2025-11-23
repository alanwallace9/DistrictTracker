'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useDemoRole } from '@/contexts/DemoRoleContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Shield, LogOut, Settings, User, ChevronDown, Search, Plus, Upload, LayoutGrid, List, FileText, Power, History, MessageSquare, Bell, BookOpen, Menu, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { SettingsDialog } from '@/components/SettingsDialog';
import { AddRecordDialog } from '@/components/AddRecordDialog';
import { CSVUploadDialog } from '@/components/CSVUploadDialog';
import { InviteUserDialog } from '@/components/InviteUserDialog';
import { BulkUserUploadDialog } from '@/components/admin/BulkUserUploadDialog';
import { StatsDropdown } from '@/components/StatsDropdown';
import { AdminAuditLog } from '@/components/AdminAuditLog';
import { getDisplayName, getUserProfile } from '@/app/actions/users';
import { getCurrentVersion } from '@/app/actions/feedback';
import { TrespassRecord, UserProfile } from '@/lib/supabase';
import { useExpiringWarnings } from '@/hooks/useExpiringWarnings';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  stats?: { total: number; active: number; inactive: number };
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (filter: string) => void;
  viewMode?: 'list' | 'card';
  onViewModeChange?: (mode: 'list' | 'card') => void;
  filteredCount?: number;
  records?: TrespassRecord[];
  onShowExpiring?: () => void;
  showExpiringOnly?: boolean;
}

export function DashboardLayout({
  children,
  onRefresh,
  stats,
  searchQuery = '',
  onSearchChange,
  statusFilter = 'active',
  onStatusFilterChange,
  viewMode = 'card',
  onViewModeChange,
  filteredCount,
  records = [],
  onShowExpiring,
  showExpiringOnly = false,
}: DashboardLayoutProps) {
  const { user, loading, signOut } = useAuth();
  const { isDemoMode, demoRole, setDemoRole, availableRoles } = useDemoRole();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [csvDialogOpen, setCSVDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [bulkUserDialogOpen, setBulkUserDialogOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('viewer');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenantShortName, setTenantShortName] = useState<string>('');
  const [appVersion, setAppVersion] = useState<string>('');
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  // Initialize theme state directly from localStorage (no useEffect delay)
  // The blocking script in layout.tsx already set the data-theme attribute
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return (saved as 'light' | 'dark') || 'dark';
    }
    return 'dark';
  });
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);

  // Use the expiring warnings hook
  const { count: expiringCount } = useExpiringWarnings(records, userProfile);

  // Determine effective role (use demo role if in demo mode, otherwise use actual user role)
  const effectiveRole = isDemoMode ? demoRole : (userProfile?.role || 'viewer');

  // Permission check: viewers cannot add/edit records
  const canEdit = effectiveRole !== 'viewer';

  // Check if notification was dismissed this session
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      const dismissed = sessionStorage.getItem(`notification-dismissed-${user.id}`);
      setNotificationDismissed(dismissed === 'true');
    }
  }, [user]);

  // Removed client-side auth redirect - middleware handles authentication
  // This was causing a redirect loop after login because of timing issues
  // with Clerk session loading after window.location.href redirect

  // Auto-sync user to Supabase on first load, then fetch display name (truly only once)
  useEffect(() => {
    const syncAndFetch = async () => {
      // Skip if already initialized or currently initializing
      if (!user || initializedRef.current || initializingRef.current) {
        return;
      }

      // Mark as initializing to prevent duplicate calls
      initializingRef.current = true;

      try {
        // Auto-sync (for development without webhooks)
        const { syncCurrentUser } = await import('@/app/actions/sync-user');
        await syncCurrentUser();
        // Logging handled in sync-user.ts
      } catch (error) {
        // Silently fail - sync will happen via webhook or next load
      }

      // Fetch display name (only once per user load)
      await fetchDisplayName();

      // Mark as fully initialized
      initializedRef.current = true;
    };

    syncAndFetch();
  }, [user]);

  const fetchDisplayName = async () => {
    if (!user) return;

    // Set role from Clerk public metadata (source of truth)
    setUserRole(user.user_metadata.role || 'viewer');

    // Fetch display name from Supabase using server action (with Clerk auth)
    try {
      const name = await getDisplayName(user.id);
      setDisplayName(name);
    } catch (error) {
      // Silently fail - display name is optional
      setDisplayName(null);
    }

    // Fetch full user profile for notifications and tenant info
    try {
      const profile = await getUserProfile(user.id);
      if (profile) {
        setUserProfile(profile);
        // Set tenant short name for dashboard branding
        if (profile.tenant && Array.isArray(profile.tenant) && profile.tenant[0]?.short_display_name) {
          setTenantShortName(profile.tenant[0].short_display_name);
        } else if (profile.tenant && !Array.isArray(profile.tenant) && profile.tenant.short_display_name) {
          setTenantShortName(profile.tenant.short_display_name);
        }
      }
    } catch (error) {
      // Silently fail - profile is optional for notifications
      setUserProfile(null);
    }

    // Fetch app version
    try {
      const versionResult = await getCurrentVersion();
      if (!versionResult.error && versionResult.version) {
        setAppVersion(versionResult.version);
      }
    } catch (error) {
      // Silently fail - version is optional
    }
  };

  const handleSignOut = async () => {
    // Clear notification dismissed flag on logout
    if (typeof window !== 'undefined' && user) {
      sessionStorage.removeItem(`notification-dismissed-${user.id}`);
    }
    await signOut();
    router.push('/login');
  };

  const handleBellClick = () => {
    // Mark notification as dismissed for this session
    if (typeof window !== 'undefined' && user) {
      sessionStorage.setItem(`notification-dismissed-${user.id}`, 'true');
      setNotificationDismissed(true);
    }
    // Call the original handler
    if (onShowExpiring) {
      onShowExpiring();
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const closeMobileMenu = () => {
    setIsMenuClosing(true);
    setTimeout(() => {
      setMobileMenuOpen(false);
      setIsMenuClosing(false);
    }, 200); // Match animation duration
  };

  const toggleMobileMenu = () => {
    if (mobileMenuOpen) {
      closeMobileMenu();
    } else {
      setMobileMenuOpen(true);
    }
  };

  // Show loading state while auth is initializing
  // Middleware protects the route, so we know user will be authenticated
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const handleDialogClose = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background sticky top-0 z-50 shadow-sm backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile & Desktop Header */}
          <div className="flex flex-col">
            {/* Top row: Logo, Title, Hamburger */}
            <div className="flex justify-between items-center h-16 sm:h-20">
              {/* Left: Logo + Title */}
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                <Image
                  src="/assets/logo1.svg"
                  alt="DistrictTracker"
                  width={32}
                  height={32}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-xl font-bold text-foreground truncate">
                      {isDemoMode ? 'DEMO' : (tenantShortName || 'BISD')} Trespass Tracker
                    </h1>
                    {isDemoMode && demoRole && (
                      <span className="px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700 whitespace-nowrap">
                        {demoRole.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                    powered by <a href="https://DistrictTracker.com" className="underline hover:no-underline">DistrictTracker.com</a>
                    {appVersion && <span className="ml-2">• v{appVersion}</span>}
                  </p>
                </div>
              </div>

              {/* Right: Desktop controls (hidden on mobile) */}
              <div className="hidden nav:flex items-center space-x-4">
              {/* Demo Guide Button - Only visible in demo mode */}
              {isDemoMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/demo-guide')}
                  className="gap-2 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Demo Guide</span>
                </Button>
              )}

              {/* Demo Role Switcher - Only visible in demo mode */}
              {isDemoMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-input text-foreground border-border hover:bg-input hover:text-foreground hover:scale-110">
                      <Shield className="w-4 h-4" />
                      <span className="hidden sm:inline">{availableRoles.find(r => r.value === demoRole)?.label}</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 bg-white">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium text-slate-900">Demo Role Switcher</p>
                        <p className="text-xs text-slate-500">Test different permission levels</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableRoles.map((role) => (
                      <DropdownMenuItem
                        key={role.value}
                        onSelect={() => setDemoRole(role.value as any)}
                        className={demoRole === role.value ? 'bg-slate-100' : ''}
                      >
                        <div className="flex flex-col w-full">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">{role.label}</span>
                            {demoRole === role.value && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Active</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 mt-0.5">
                            {role.value === 'viewer' && 'Can view all records'}
                            {role.value === 'campus_admin' && 'Can add/update all campus records'}
                            {role.value === 'district_admin' && 'Full access'}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Theme Toggle Power Button */}
              <button
                onClick={toggleTheme}
                className="h-9 w-9 flex items-center justify-center rounded-lg transition-all hover:scale-110 border border-birdville-light-gold bg-input"
                aria-label="Toggle theme"
              >
                <Power
                  className="w-5 h-5 transition-colors"
                  style={{
                    color: theme === 'dark' ? 'oklch(0.9 0.17 100)' : 'oklch(0.65 0.15 264)',
                    filter: theme === 'dark' ? 'drop-shadow(0 0 8px oklch(0.9 0.17 100 / 0.5))' : 'drop-shadow(0 2px 4px oklch(0 0 0 / 0.2))'
                  }}
                />
              </button>

              {/* Notification Bell - Visible to all users (viewers can see expiring warnings) */}
              <button
                onClick={handleBellClick}
                className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all hover:scale-110 border border-border bg-input relative ${showExpiringOnly ? 'ring-2 ring-primary' : ''}`}
                aria-label={expiringCount > 0 ? `${expiringCount} trespass warning${expiringCount !== 1 ? 's' : ''} expiring soon` : 'Notifications'}
                title={expiringCount > 0 ? `${expiringCount} warning${expiringCount !== 1 ? 's' : ''} expiring within 1 week` : 'View notifications'}
              >
                <Bell className="w-5 h-5 text-foreground" />
                {expiringCount > 0 && !notificationDismissed && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {expiringCount > 99 ? '99+' : expiringCount}
                  </span>
                )}
              </button>

              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-input text-foreground border-border hover:bg-input hover:text-foreground hover:scale-110">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{displayName || user.email?.split('@')[0]}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white">
                  <DropdownMenuLabel >
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-slate-900">{displayName || 'User'}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {stats && (
                    <>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-slate-700">Total Records</span>
                          <span className="font-semibold text-slate-900">{stats.total}</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-green-600">Active</span>
                          <span className="font-semibold text-green-600">{stats.active}</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-orange-600">Inactive</span>
                          <span className="font-semibold text-orange-600">{stats.inactive}</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {canEdit && (
                    <>
                      <DropdownMenuItem onSelect={(e) => {
                        e.preventDefault();
                        setDropdownOpen(false);
                        setTimeout(() => setCSVDialogOpen(true), 150);
                      }}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => {
                        e.preventDefault();
                        setDropdownOpen(false);
                        setTimeout(() => setAddDialogOpen(true), 150);
                      }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Record
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onSelect={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    window.open('https://districttracker.com/feedback/changelog', '_blank');
                  }}>
                    <History className="w-4 h-4 mr-2" />
                    Changelog
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    window.open('https://districttracker.com/feedback', '_blank');
                  }}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Feedback
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    setTimeout(() => setSettingsOpen(true), 150);
                  }}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>

              {/* Mobile: Hamburger Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="nav:hidden h-10 w-10 flex items-center justify-center rounded-lg border border-border bg-input hover:bg-input/80"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {/* Demo Environment Warning Banner - Stacked below on mobile */}
            {isDemoMode && (
              <div className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 mb-2">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-[10px] sm:text-xs font-medium text-amber-900 dark:text-amber-200">
                  Demo environment resets at least every 6 hours
                </span>
              </div>
            )}

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className={`nav:hidden bg-background border-t border-border py-3 space-y-3 ${
                isMenuClosing ? 'animate-out slide-out-to-top duration-200' : 'animate-in slide-in-from-top duration-200'
              }`}>
                {/* User Info */}
                <div className="px-4 pb-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground">{displayName || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {stats && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Total:</span>{' '}
                        <span className="font-semibold text-foreground">{stats.total}</span>
                      </div>
                      <div>
                        <span className="text-green-600">Active:</span>{' '}
                        <span className="font-semibold text-green-600">{stats.active}</span>
                      </div>
                      <div>
                        <span className="text-orange-600">Inactive:</span>{' '}
                        <span className="font-semibold text-orange-600">{stats.inactive}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Controls */}
                <div className="px-4 space-y-2">
                  {/* Demo Guide Button */}
                  {isDemoMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        router.push('/demo-guide');
                        closeMobileMenu();
                      }}
                      className="w-full justify-start gap-2 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700"
                    >
                      <BookOpen className="w-4 h-4" />
                      Demo Guide
                    </Button>
                  )}

                  {/* Demo Role Switcher */}
                  {isDemoMode && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Demo Role</p>
                      <Select value={demoRole} onValueChange={(value) => setDemoRole(value as any)}>
                        <SelectTrigger className="w-full bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Theme Toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTheme}
                    className="w-full justify-start gap-2 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <Power className="w-4 h-4" />
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </Button>

                  {/* Notifications */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleBellClick();
                      closeMobileMenu();
                    }}
                    className="w-full justify-start gap-2 relative bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <Bell className="w-4 h-4" />
                    Notifications
                    {expiringCount > 0 && !notificationDismissed && (
                      <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {expiringCount > 99 ? '99+' : expiringCount}
                      </span>
                    )}
                  </Button>

                  {/* Action Buttons */}
                  {canEdit && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCSVDialogOpen(true);
                          closeMobileMenu();
                        }}
                        className="w-full justify-start gap-2 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Upload className="w-4 h-4" />
                        Upload CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAddDialogOpen(true);
                          closeMobileMenu();
                        }}
                        className="w-full justify-start gap-2 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <Plus className="w-4 h-4" />
                        Add Record
                      </Button>
                    </>
                  )}

                  {/* Other Actions */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open('https://districttracker.com/feedback/changelog', '_blank');
                      closeMobileMenu();
                    }}
                    className="w-full justify-start gap-2 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <History className="w-4 h-4" />
                    Changelog
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open('https://districttracker.com/feedback', '_blank');
                      closeMobileMenu();
                    }}
                    className="w-full justify-start gap-2 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Send Feedback
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSettingsOpen(true);
                      closeMobileMenu();
                    }}
                    className="w-full justify-start gap-2 bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="w-full justify-start gap-2 bg-background text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 border-red-200 dark:border-red-900"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}
          </div>
          {onSearchChange && onStatusFilterChange && onViewModeChange && (
              <div className="flex flex-row gap-2 items-center pt-4 pb-2 border-t" style={{ borderColor: 'var(--birdville-light-gold)' }}>
                <div className="relative w-full min-w-[150px] flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or ID"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 bg-input border-border text-foreground placeholder:text-foreground"
                />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                  <SelectTrigger className="w-[130px] sm:w-[150px] bg-input border-border text-foreground [&>span]:text-slate-300 dark:[&>span]:text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">All {stats ? `(${stats.total})` : ''}</SelectItem>
                    <SelectItem value="active">Active {stats ? `(${stats.active})` : ''}</SelectItem>
                    <SelectItem value="inactive">Inactive {stats ? `(${stats.inactive})` : ''}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex border border-border rounded-lg bg-card h-10">
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('list')}
                    className={`rounded-r-none h-full ${viewMode === 'list' ? 'bg-input' : 'text-foreground'}`}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange('card')}
                    className={`rounded-l-none h-full ${viewMode === 'card' ? 'bg-input' : 'text-foreground'}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              </div>
          )}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
        {children}
      </main>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSettingsSaved={fetchDisplayName}
      />
      <AddRecordDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onRecordAdded={handleDialogClose}
      />
      <CSVUploadDialog
        open={csvDialogOpen}
        onOpenChange={setCSVDialogOpen}
        onRecordsUploaded={handleDialogClose}
      />
      <InviteUserDialog
        open={addUserDialogOpen}
        onOpenChange={setAddUserDialogOpen}
        onUserInvited={handleDialogClose}
      />
      <BulkUserUploadDialog
        open={bulkUserDialogOpen}
        onOpenChange={setBulkUserDialogOpen}
        onUsersInvited={handleDialogClose}
      />
      <AdminAuditLog
        open={auditLogOpen}
        onOpenChange={setAuditLogOpen}
      />
    </div>
  );
}
