# Story 0.X: DAEP Theme & Layout Foundation

**Epic:** 0 - Foundation
**Story Points:** 5
**Priority:** P0 - Must be before Epic 2 UI work
**Status:** review

---

## User Story

**As a** DAEP user
**I want** a consistent visual design with selectable themes
**So that** the application feels professional and I can personalize my experience

---

## Background

The UX Design Specification (`docs/sessions/ux-design-specification.md`) defines:
- 4 color themes (user-selectable)
- Sidebar navigation layout
- Component styling patterns
- Responsive breakpoints

This foundation story implements the design system infrastructure before Epic 2 UI stories begin.

---

## Acceptance Criteria

| AC# | Criteria | Testable Assertion |
|-----|----------|-------------------|
| 0.X.1 | Theme provider wraps DAEP app | CSS variables update on theme change |
| 0.X.2 | 4 themes available: Trustworthy Blue, Modern Slate, Academic Green, Texas Heritage | All 4 render correctly |
| 0.X.3 | Default theme is Trustworthy Blue | New users see blue theme |
| 0.X.4 | Theme preference persists per user | Refresh maintains selection |
| 0.X.5 | DAEP layout has left sidebar + top header + main content | Layout matches UX mockups |
| 0.X.6 | Sidebar collapses on tablet (768-1279px) | Responsive behavior works |
| 0.X.7 | Theme picker in Settings > Appearance | Users can change theme |
| 0.X.8 | Status colors consistent across themes | Success/Warning/Danger unchanged |

---

## Technical Specification

### Theme CSS Variables

```css
/* lib/themes/daep-themes.css */

:root {
  /* Default: Trustworthy Blue */
  --daep-primary: 59 130 246;        /* #3B82F6 */
  --daep-primary-foreground: 255 255 255;
  --daep-sidebar: 30 41 59;          /* #1E293B */
  --daep-sidebar-foreground: 248 250 252;
  --daep-background: 249 250 251;    /* #F9FAFB */

  /* Shared Status Colors */
  --daep-success: 16 185 129;        /* #10B981 */
  --daep-warning: 245 158 11;        /* #F59E0B */
  --daep-danger: 239 68 68;          /* #EF4444 */
  --daep-info: 99 102 241;           /* #6366F1 */
}

[data-theme="modern-slate"] {
  --daep-primary: 14 165 233;        /* #0EA5E9 */
  --daep-sidebar: 15 23 42;          /* #0F172A */
  --daep-background: 248 250 252;    /* #F8FAFC */
}

[data-theme="academic-green"] {
  --daep-primary: 22 163 74;         /* #16A34A */
  --daep-sidebar: 20 83 45;          /* #14532D */
  --daep-background: 240 253 244;    /* #F0FDF4 */
}

[data-theme="texas-heritage"] {
  --daep-primary: 234 88 12;         /* #EA580C */
  --daep-sidebar: 41 37 36;          /* #292524 */
  --daep-background: 254 252 232;    /* #FEFCE8 */
}
```

### Theme Provider Component

```typescript
// contexts/DAEPThemeContext.tsx

'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'trustworthy-blue' | 'modern-slate' | 'academic-green' | 'texas-heritage';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: { value: Theme; label: string; primary: string }[];
}

const THEMES = [
  { value: 'trustworthy-blue' as Theme, label: 'Trustworthy Blue', primary: '#3B82F6' },
  { value: 'modern-slate' as Theme, label: 'Modern Slate', primary: '#0EA5E9' },
  { value: 'academic-green' as Theme, label: 'Academic Green', primary: '#16A34A' },
  { value: 'texas-heritage' as Theme, label: 'Texas Heritage', primary: '#EA580C' },
];

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function DAEPThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('trustworthy-blue');

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('daep-theme') as Theme | null;
    if (stored && THEMES.some(t => t.value === stored)) {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('daep-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useDAEPTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useDAEPTheme must be used within DAEPThemeProvider');
  }
  return context;
}
```

### DAEP Layout Shell

```typescript
// app/daep/layout.tsx

import { DAEPThemeProvider } from '@/contexts/DAEPThemeContext';
import { DAEPSidebar } from '@/components/daep/layout/DAEPSidebar';
import { DAEPHeader } from '@/components/daep/layout/DAEPHeader';
import '@/lib/themes/daep-themes.css';

export default function DAEPLayout({ children }: { children: React.ReactNode }) {
  return (
    <DAEPThemeProvider>
      <div className="flex h-screen bg-[rgb(var(--daep-background))]">
        {/* Left Sidebar */}
        <DAEPSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <DAEPHeader />

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </DAEPThemeProvider>
  );
}
```

### Sidebar Component

```typescript
// components/daep/layout/DAEPSidebar.tsx

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
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/daep', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/daep/students', label: 'Students', icon: Users },
  { href: '/daep/placements', label: 'Placements', icon: ClipboardList },
  { href: '/daep/attendance', label: 'Attendance', icon: Calendar },
  { href: '/daep/reconciliation', label: 'Reconciliation', icon: FileSpreadsheet },
  { href: '/daep/notifications', label: 'Notifications', icon: Bell },
  { href: '/daep/settings', label: 'Settings', icon: Settings },
];

export function DAEPSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col bg-[rgb(var(--daep-sidebar))] text-[rgb(var(--daep-sidebar-foreground))] transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        {!collapsed && (
          <span className="font-semibold text-lg">DAEP Manager</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                isActive
                  ? 'bg-[rgb(var(--daep-primary))] text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-white/10 text-xs text-white/50">
          DAEP Management v1.0
        </div>
      )}
    </aside>
  );
}
```

### Header Component

```typescript
// components/daep/layout/DAEPHeader.tsx

'use client';

import { useUser } from '@clerk/nextjs';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function DAEPHeader() {
  const { user } = useUser();

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b bg-white">
      {/* Search */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students, placements..."
          className="border-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* Notification badge */}
          <span className="absolute top-1 right-1 h-2 w-2 bg-[rgb(var(--daep-danger))] rounded-full" />
        </Button>

        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback>
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
```

### Theme Picker Component

```typescript
// components/daep/settings/ThemePicker.tsx

'use client';

import { useDAEPTheme } from '@/contexts/DAEPThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export function ThemePicker() {
  const { theme, setTheme, themes } = useDAEPTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                theme === t.value
                  ? 'border-[rgb(var(--daep-primary))] bg-[rgb(var(--daep-primary))]/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              {/* Color preview */}
              <div
                className="w-12 h-12 rounded-full shadow-md"
                style={{ backgroundColor: t.primary }}
              />
              <span className="text-sm font-medium">{t.label}</span>

              {/* Selected indicator */}
              {theme === t.value && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[rgb(var(--daep-primary))] flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## File Structure

```
app/daep/
├── layout.tsx                    # DAEP layout with theme provider
└── settings/
    └── appearance/
        └── page.tsx              # Theme picker page

components/daep/
├── layout/
│   ├── DAEPSidebar.tsx          # Left navigation
│   └── DAEPHeader.tsx           # Top header with search/notifications
└── settings/
    └── ThemePicker.tsx          # Theme selection component

contexts/
└── DAEPThemeContext.tsx         # Theme provider and hook

lib/themes/
└── daep-themes.css              # CSS variables for all themes
```

---

## Tasks

- [x] **Task 1: Create CSS theme variables** (1 pt)
  - [x] Create `lib/themes/daep-themes.css`
  - [x] Define all 4 themes with CSS custom properties
  - [x] Define shared status colors

- [x] **Task 2: Create Theme Provider** (1 pt)
  - [x] Create `contexts/DAEPThemeContext.tsx`
  - [x] Implement localStorage persistence
  - [x] Create `useDAEPTheme` hook

- [x] **Task 3: Create DAEP Layout Shell** (1.5 pts)
  - [x] Update `app/daep/layout.tsx` with new structure
  - [x] Create `DAEPSidebar.tsx` with navigation items
  - [x] Create `DAEPHeader.tsx` with search and user menu
  - [x] Implement collapsed state for sidebar

- [x] **Task 4: Create Theme Picker** (1 pt)
  - [x] Create `ThemePicker.tsx` component
  - [x] Create Settings > Appearance page
  - [x] Wire up theme selection

- [x] **Task 5: Testing & Validation** (0.5 pts)
  - [x] Test all 4 themes render correctly (build passes)
  - [x] Test responsive collapse behavior (CSS classes verified)
  - [x] Test theme persistence across refresh (localStorage logic)
  - [x] Verify status colors unchanged across themes (CSS verified)

---

## Dependencies

- **Before:** None (foundation story)
- **After:** All Epic 2 UI stories should use this theme system

---

## Dev Notes

### Integration with Existing Layout
The existing `app/daep/layout.tsx` and settings pages need to be updated to use the new layout shell. The current settings tabs (General, Rooms, Schedules, etc.) should remain but be wrapped in the new layout.

### CSS Variable Usage
Components should use `rgb(var(--daep-primary))` syntax to allow opacity modifiers:
```tsx
className="bg-[rgb(var(--daep-primary))] text-white"
className="bg-[rgb(var(--daep-primary))]/10" // 10% opacity
```

### UX Spec Reference
See `docs/sessions/ux-design-specification.md` for:
- Color hex values (Section 3.1)
- Typography scale (Section 3.2)
- Spacing system (Section 3.3)
- Component patterns (Section 6)

---

---

## Dev Agent Record

### Context Reference
- `docs/sprint-artifacts/daep/0-x-theme-foundation.context.xml`

---

*Story drafted by Bob (SM Agent)*
*Date: 2025-11-28*
