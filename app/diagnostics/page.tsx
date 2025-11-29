'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check } from 'lucide-react';
import { checkUserDiagnostics, repairSuperAdminRole, seedTestStudent } from '@/app/actions/diagnostics';
import Link from 'next/link';

function CopyableOutput({ data, className }: { data: any; className?: string }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-white/80 hover:bg-white border border-slate-300 text-slate-600 hover:text-slate-900"
        title="Copy to clipboard"
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre className={`p-4 rounded-lg overflow-auto text-sm pr-12 ${className || 'bg-slate-100'}`}>
        {text}
      </pre>
    </div>
  );
}

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [repairResult, setRepairResult] = useState<any>(null);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const result = await checkUserDiagnostics();
      setDiagnostics(result);
    } catch (error: any) {
      setDiagnostics({ error: error.message });
    }
    setLoading(false);
  };

  const repairRole = async () => {
    setLoading(true);
    try {
      const result = await repairSuperAdminRole();
      setRepairResult(result);
      // Re-run diagnostics to show updated state
      const diag = await checkUserDiagnostics();
      setDiagnostics(diag);
    } catch (error: any) {
      setRepairResult({ error: error.message, success: false });
    }
    setLoading(false);
  };

  const seedStudent = async () => {
    setLoading(true);
    try {
      const result = await seedTestStudent();
      setSeedResult(result);
    } catch (error: any) {
      setSeedResult({ error: error.message, success: false });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">System Diagnostics</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>User Profile Diagnostics</CardTitle>
            <CardDescription>Check your current authentication and profile status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? 'Running...' : 'Run Diagnostics'}
            </Button>

            {diagnostics && (
              <CopyableOutput data={diagnostics} />
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Seed Test Student (DAEP)</CardTitle>
            <CardDescription className="text-blue-700">
              Create a test student with an active DAEP placement to test the student profile page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={seedStudent}
              disabled={loading}
              variant="outline"
              className="border-blue-500 text-blue-700 hover:bg-blue-100"
            >
              {loading ? 'Creating...' : 'Seed Test Student'}
            </Button>

            {seedResult && (
              <div className="space-y-2">
                <CopyableOutput
                  data={seedResult}
                  className={seedResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                />
                {seedResult.success && seedResult.student && (
                  <Link href={seedResult.student.profileUrl}>
                    <Button variant="default" size="sm">
                      View Student Profile →
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Emergency Role Repair</CardTitle>
            <CardDescription className="text-amber-700">
              Use this if your super_admin role was accidentally changed. Only works for known super_admin accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={repairRole}
              disabled={loading}
              variant="outline"
              className="border-amber-500 text-amber-700 hover:bg-amber-100"
            >
              {loading ? 'Repairing...' : 'Repair Super Admin Role'}
            </Button>

            {repairResult && (
              <CopyableOutput
                data={repairResult}
                className={repairResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
