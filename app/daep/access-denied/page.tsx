'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft } from 'lucide-react';

export default function DAEPAccessDeniedPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
      <div className="max-w-md text-center p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don&apos;t have permission to access DAEP Settings. This area is restricted to
          district administrators and DAEP administrators.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/daep">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to DAEP
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
