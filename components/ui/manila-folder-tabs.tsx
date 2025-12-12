'use client';

/**
 * Manila Folder Tabs Component
 *
 * Story 4-A: Reusable manila folder-style tab component
 *
 * Features:
 * - Active tab has card background and overlaps content area
 * - Inactive tabs have muted background and appear "behind"
 * - Smooth transition animations
 * - Works with 2-6 tabs
 * - Responsive on mobile
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ManilaFolderTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface ManilaFolderTabsProps {
  tabs: ManilaFolderTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function ManilaFolderTabs({
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}: ManilaFolderTabsProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Tab Bar */}
      <div className="flex items-end overflow-x-auto overflow-y-hidden scrollbar-hide">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const isFirst = index === 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all duration-200 whitespace-nowrap',
                'border border-border',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                // Remove left border on non-first tabs to avoid double borders
                !isFirst && '-ml-[1px]',
                isActive
                  ? [
                      // Active tab styling - filled background
                      'bg-card text-foreground z-10',
                      // Overlap the content border
                      'mb-[-1px]',
                      // Remove bottom border to blend with content
                      'border-b-card',
                    ]
                  : [
                      // Inactive tab styling - outlined only (transparent bg)
                      'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30',
                      // Slight vertical offset to appear "behind"
                      'mb-0 mt-1',
                    ]
              )}
              aria-selected={isActive}
              role="tab"
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
        {/* Filler - just bottom border to continue the line, no right border */}
        <div className="flex-1 border-b border-border mb-[-1px]" />
      </div>

      {/* Content Area - full border with all corners rounded except top-left */}
      <div className="bg-card border border-border rounded-lg rounded-tl-none p-4">
        {children}
      </div>
    </div>
  );
}

/**
 * Individual tab panel for controlled content display
 */
export interface ManilaFolderTabPanelProps {
  tabId: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export function ManilaFolderTabPanel({
  tabId,
  activeTab,
  children,
  className,
}: ManilaFolderTabPanelProps) {
  if (tabId !== activeTab) return null;

  return (
    <div
      role="tabpanel"
      className={cn('animate-in fade-in-0 duration-200', className)}
    >
      {children}
    </div>
  );
}
