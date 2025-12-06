'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Calendar,
  Settings,
  FileSpreadsheet,
  Bell,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  BarChart3,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/daep', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/daep/rooms', label: 'Room Rosters', icon: Building2 },
  { href: '/daep/students', label: 'Students', icon: Users },
  { href: '/daep/placements', label: 'Placements', icon: ClipboardList },
  { href: '/daep/attendance', label: 'Attendance', icon: Calendar },
  { href: '/daep/reconciliation', label: 'Reconciliation', icon: FileSpreadsheet },
  { href: '/daep/notifications', label: 'Notifications', icon: Bell },
  { href: '/daep/settings', label: 'Settings', icon: Settings },
];

// Reports section - shown separately with divider
const REPORT_ITEMS = [
  { href: '/daep/reports/rollover', label: 'Rollover Report', icon: AlertTriangle, badge: 'rollover' },
];

interface DAEPSidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function DAEPSidebar({ collapsed = false, onCollapsedChange }: DAEPSidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);

  const isCollapsed = onCollapsedChange ? collapsed : internalCollapsed;
  const setCollapsed = onCollapsedChange || setInternalCollapsed;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'flex flex-col bg-[rgb(var(--daep-sidebar))] text-[rgb(var(--daep-sidebar-foreground))] transition-all duration-300',
        // AC 0.X.6: Responsive - auto-collapse on tablet
        isCollapsed ? 'w-16' : 'w-64',
        // Hide completely on mobile (handled by parent with hamburger menu)
        'hidden md:flex'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        {!isCollapsed && (
          <span className="font-semibold text-lg">DAEP Manager</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!isCollapsed)}
          className="text-white/70 hover:text-white hover:bg-white/10 shrink-0"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                active
                  ? 'bg-[rgb(var(--daep-primary))] text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Reports Section Divider */}
        <div className="my-3 mx-1 border-t border-white/10" />
        {!isCollapsed && (
          <div className="px-3 py-1 text-xs font-medium text-white/40 uppercase tracking-wider">
            Reports
          </div>
        )}

        {/* Report Items */}
        {REPORT_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                active
                  ? 'bg-[rgb(var(--daep-warning))]/80 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={cn('h-5 w-5 shrink-0', !active && 'text-[rgb(var(--daep-warning))]')} />
              {!isCollapsed && (
                <span className="flex-1">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-white/10 text-xs text-white/50">
          DAEP Management v1.0
        </div>
      )}
    </aside>
  );
}
