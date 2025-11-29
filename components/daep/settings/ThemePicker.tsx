'use client';

import { useDAEPTheme } from '@/contexts/DAEPThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

// AC 0.X.7: Theme picker in Settings > Appearance
export function ThemePicker() {
  const { theme, setTheme, themes } = useDAEPTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          Choose your preferred color theme for the DAEP interface.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                'relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
                // Touch target: 44x44px minimum (actual button is larger)
                'min-h-[88px]',
                theme === t.value
                  ? 'border-[rgb(var(--daep-primary))] bg-[rgb(var(--daep-primary))]/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              {/* Color preview */}
              <div
                className="w-12 h-12 rounded-full shadow-md border border-white/20"
                style={{ backgroundColor: t.primary }}
              />
              <span className="text-sm font-medium text-gray-900">{t.label}</span>

              {/* Selected indicator */}
              {theme === t.value && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[rgb(var(--daep-primary))] flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
