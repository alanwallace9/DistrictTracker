import { DAEPThemeProvider } from '@/contexts/DAEPThemeContext';
import '@/lib/themes/daep-themes.css';

// AC 0.X.1: Theme provider wraps DAEP app
// Note: This layout only provides theme context. Child routes (like /settings)
// have their own layouts for the actual UI shell.
// The .daep-theme class enables shadcn variable overrides from daep-themes.css
export default function DAEPLayout({ children }: { children: React.ReactNode }) {
  return (
    <DAEPThemeProvider>
      <div className="daep-theme">
        {children}
      </div>
    </DAEPThemeProvider>
  );
}
