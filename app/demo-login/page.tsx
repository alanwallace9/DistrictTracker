'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, Loader2 } from 'lucide-react';

export default function DemoLoginPage() {
  const { signIn, setActive } = useSignIn();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<'admin' | 'viewer' | null>(null);
  const [error, setError] = useState('');

  const handleDemoLogin = async (role: 'admin' | 'viewer') => {
    setIsLoading(role);
    setError('');

    const credentials = {
      admin: {
        email: 'demo-admin@districttracker.com',
        password: 'Default1',
      },
      viewer: {
        email: 'demo-viewer@districttracker.com',
        password: 'Default2',
      },
    };

    try {
      const result = await signIn?.create({
        identifier: credentials[role].email,
        password: credentials[role].password,
      });

      if (result?.status === 'complete') {
        await setActive?.({ session: result.createdSessionId });
        router.push('/trespass');
      }
    } catch (err: any) {
      console.error('Demo login error:', err);
      setError(err.errors?.[0]?.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold">Demo Login</CardTitle>
          <CardDescription className="text-base">
            Try TrespassTracker with pre-configured demo accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {/* Admin Login Button */}
            <Button
              onClick={() => handleDemoLogin('admin')}
              disabled={isLoading !== null}
              className="w-full h-auto py-6 flex flex-col items-center space-y-2 text-lg"
              size="lg"
            >
              {isLoading === 'admin' ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <Shield className="h-8 w-8" />
                  <div>
                    <div className="font-bold">Try as Admin</div>
                    <div className="text-xs opacity-90 font-normal">
                      Full access - Create, edit, delete records
                    </div>
                  </div>
                </>
              )}
            </Button>

            {/* Viewer Login Button */}
            <Button
              onClick={() => handleDemoLogin('viewer')}
              disabled={isLoading !== null}
              variant="outline"
              className="w-full h-auto py-6 flex flex-col items-center space-y-2 text-lg"
              size="lg"
            >
              {isLoading === 'viewer' ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <Eye className="h-8 w-8" />
                  <div>
                    <div className="font-bold">Try as Viewer</div>
                    <div className="text-xs opacity-90 font-normal">
                      Read-only access - View records only
                    </div>
                  </div>
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertDescription className="text-sm text-slate-600 dark:text-slate-400">
                <strong className="font-semibold text-slate-900 dark:text-slate-100">Demo Mode:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Data resets every hour</li>
                  <li>Changes are temporary</li>
                  <li>Safe to explore all features</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>

          <div className="text-center pt-2">
            <Button
              variant="link"
              className="text-sm text-slate-600 dark:text-slate-400"
              onClick={() => router.push('/sign-in')}
            >
              Sign in with your own account →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
