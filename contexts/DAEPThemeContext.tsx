'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

// AC 0.X.2: 4 themes available
export type DAEPTheme = 'trustworthy-blue' | 'modern-slate' | 'academic-green' | 'texas-heritage';

interface ThemeOption {
  value: DAEPTheme;
  label: string;
  primary: string;
}

interface DAEPThemeContextValue {
  theme: DAEPTheme;
  setTheme: (theme: DAEPTheme) => void;
  themes: ThemeOption[];
}

const DAEP_THEMES: ThemeOption[] = [
  { value: 'trustworthy-blue', label: 'Trustworthy Blue', primary: '#3B82F6' },
  { value: 'modern-slate', label: 'Modern Slate', primary: '#0EA5E9' },
  { value: 'academic-green', label: 'Academic Green', primary: '#16A34A' },
  { value: 'texas-heritage', label: 'Texas Heritage', primary: '#EA580C' },
];

const STORAGE_KEY = 'daep-theme';
const DEFAULT_THEME: DAEPTheme = 'trustworthy-blue'; // AC 0.X.3

const DAEPThemeContext = createContext<DAEPThemeContextValue | undefined>(undefined);

export function DAEPThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<DAEPTheme>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  // AC 0.X.4: Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY) as DAEPTheme | null;
    if (stored && DAEP_THEMES.some(t => t.value === stored)) {
      setThemeState(stored);
    }
  }, []);

  // AC 0.X.1: Apply theme to document (CSS variables update on theme change)
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    // Remove all theme attributes first
    root.removeAttribute('data-daep-theme');

    // Only set attribute for non-default themes (default uses :root)
    if (theme !== 'trustworthy-blue') {
      root.setAttribute('data-daep-theme', theme);
    }

    // AC 0.X.4: Persist to localStorage
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: DAEPTheme) => {
    setThemeState(newTheme);
  }, []);

  // Prevent flash of wrong theme during SSR
  if (!mounted) {
    return (
      <DAEPThemeContext.Provider value={{ theme: DEFAULT_THEME, setTheme, themes: DAEP_THEMES }}>
        {children}
      </DAEPThemeContext.Provider>
    );
  }

  return (
    <DAEPThemeContext.Provider value={{ theme, setTheme, themes: DAEP_THEMES }}>
      {children}
    </DAEPThemeContext.Provider>
  );
}

export function useDAEPTheme() {
  const context = useContext(DAEPThemeContext);
  if (context === undefined) {
    throw new Error('useDAEPTheme must be used within DAEPThemeProvider');
  }
  return context;
}
