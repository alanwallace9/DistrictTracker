import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { DemoRoleProvider } from '@/contexts/DemoRoleContext';
import { SubdomainTenantProvider } from '@/contexts/SubdomainTenantContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { dark } from '@clerk/themes';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'School District Trespass Tracker',
  description: 'Track and manage trespass incidents across school district locations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#22c45d',
          colorBackground: '#1a1f2e',
          colorInputBackground: '#161b26',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#999999',
          colorDanger: '#E74C3C',
          borderRadius: '0.5rem',
        },
        elements: {
          card: 'bg-[#232c3f] border border-[#363f4d]',
          headerTitle: 'text-white',
          headerSubtitle: 'text-[#999999]',
          formButtonPrimary: 'bg-[#22c45d] hover:bg-[#1fa34e] text-black',
          formFieldInput: 'bg-[#161b26] border-[#363f4d] text-white placeholder:text-[#999999]',
          formFieldLabel: 'text-white',
          footerActionLink: 'text-[#22c45d] hover:text-[#1fa34e]',
          identityPreviewText: 'text-white',
          identityPreviewEditButton: 'text-[#22c45d]',
          formFieldInputShowPasswordButton: 'text-[#999999] hover:text-white',
          formResendCodeLink: 'text-[#22c45d] hover:text-[#1fa34e]',
          otpCodeFieldInput: 'bg-[#161b26] border-[#363f4d] text-white',
          socialButtonsBlockButton: 'bg-[#2a3647] border-[#363f4d] text-white hover:bg-[#3a4556]',
          socialButtonsBlockButtonText: 'text-white',
          dividerLine: 'bg-[#363f4d]',
          dividerText: 'text-[#999999]',
          footerActionText: 'text-[#999999]',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Load theme instantly from localStorage to prevent flash */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    const theme = localStorage.getItem('theme') || 'dark';
                    document.documentElement.setAttribute('data-theme', theme);
                  } catch (e) {}
                })();
              `,
            }}
          />
        </head>
        <body className={inter.className} suppressHydrationWarning>
          <AuthProvider>
            <SubdomainTenantProvider>
              <DemoRoleProvider>
                <ThemeProvider>
                  {children}
                  <Toaster />
                  <SonnerToaster position="top-right" richColors />
                </ThemeProvider>
              </DemoRoleProvider>
            </SubdomainTenantProvider>
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
