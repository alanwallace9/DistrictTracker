'use client';

import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Settings2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MappingPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const detectedSis = searchParams.get('detected_sis');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/daep/reconciliation">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            Field Mapping
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Map your CSV columns to the required fields
          </p>
        </div>
      </div>

      {/* Detected SIS notice */}
      {detectedSis && (
        <div className="rounded-lg border border-[rgb(var(--daep-primary))]/30 bg-[rgb(var(--daep-primary))]/5 p-4">
          <p className="text-sm">
            <span className="font-medium">Detected SIS:</span> {detectedSis}
            <span className="text-muted-foreground ml-2">
              - We'll try to auto-map common fields
            </span>
          </p>
        </div>
      )}

      {/* Placeholder content */}
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-muted">
            <Settings2 className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Field Mapping Coming Soon</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              This page will allow you to map your CSV columns to the required DAEP fields.
              Story 5-2 will implement this functionality.
            </p>
          </div>

          {sessionId && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
              <p>
                <span className="font-medium">Session ID:</span>{' '}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{sessionId}</code>
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button variant="outline" asChild>
              <Link href="/daep/reconciliation">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reconciliation
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Info about what mapping will do */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-[rgb(var(--daep-primary))]" />
          What Field Mapping Does
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-[rgb(var(--daep-primary))]">1.</span>
            <span>Reads the header row from your uploaded CSV file</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[rgb(var(--daep-primary))]">2.</span>
            <span>Auto-detects common column names from your SIS</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[rgb(var(--daep-primary))]">3.</span>
            <span>Lets you manually map any unrecognized columns</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[rgb(var(--daep-primary))]">4.</span>
            <span>Saves your mapping for future uploads from the same SIS</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
