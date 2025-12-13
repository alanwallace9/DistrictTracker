'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FileSpreadsheet, HelpCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CSVDropzone } from './components/csv-dropzone';
import { FieldRequirementsSection } from './components/field-requirements-section';
import { SISGuideButton } from './components/sis-guide-button';
import { SessionList } from './components/session-list';
import {
  getReconciliationSessions,
  getAvailableSISGuides,
  getSessionAuditCounts,
} from '@/app/actions/daep/reconciliation';
import type { ReconciliationSession } from '@/lib/validation/schemas';

export default function ReconciliationPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ReconciliationSession[]>([]);
  const [sisGuides, setSisGuides] = useState<{ sis_name: string; title: string }[]>([]);
  const [auditCounts, setAuditCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsData, guidesData] = await Promise.all([
        getReconciliationSessions(),
        getAvailableSISGuides(),
      ]);
      setSessions(sessionsData);
      setSisGuides(guidesData);

      // Fetch audit counts for all sessions in a single batch query
      if (sessionsData.length > 0) {
        const sessionIds = sessionsData.map((s) => s.id);
        const counts = await getSessionAuditCounts(sessionIds);
        setAuditCounts(counts);
      }
    } catch (error) {
      console.error('[Reconciliation] Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reconciliation data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            SIS Reconciliation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your SIS export file to compare placements with district records
          </p>
        </div>
        <div className="flex gap-2">
          {/* SIS Guide Buttons */}
          {sisGuides.map((guide) => (
            <SISGuideButton key={guide.sis_name} sisName={guide.sis_name} title={guide.title} />
          ))}
          {/* Download Sample */}
          <Button variant="outline" size="sm" asChild>
            <a href="/downloads/daep-sample-export.csv" download>
              <Download className="h-4 w-4 mr-2" />
              Sample CSV
            </a>
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Upload SIS Export</h2>
        <CSVDropzone onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* Field Requirements */}
      <FieldRequirementsSection />

      {/* Previous Sessions */}
      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Previous Sessions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage your reconciliation history
          </p>
        </div>
        <SessionList
          sessions={sessions}
          loading={loading}
          onRefresh={loadData}
          auditCounts={auditCounts}
        />
      </div>
    </div>
  );
}
