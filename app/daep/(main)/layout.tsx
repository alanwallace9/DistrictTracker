'use client';

import { useState } from 'react';
import { DAEPSidebar } from '@/components/daep/layout/DAEPSidebar';
import { DAEPHeader } from '@/components/daep/layout/DAEPHeader';

// Shell layout for main DAEP pages (not settings)
// AC 0.X.5: Left sidebar + top header + main content
export default function DAEPMainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[rgb(var(--daep-background))]">
      {/* Left Sidebar - Desktop */}
      <DAEPSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[rgb(var(--daep-sidebar))] text-[rgb(var(--daep-sidebar-foreground))] md:hidden animate-in slide-in-from-left duration-200">
            <DAEPSidebar />
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <DAEPHeader
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
