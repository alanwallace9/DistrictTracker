'use client';

import { ThemePicker } from '@/components/daep/settings/ThemePicker';

// AC 0.X.7: Theme picker in Settings > Appearance
export default function AppearanceSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Appearance</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the look and feel of your DAEP dashboard.
        </p>
      </div>

      <ThemePicker />
    </div>
  );
}
