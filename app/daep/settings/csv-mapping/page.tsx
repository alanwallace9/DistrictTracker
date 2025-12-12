'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  getFieldMapping,
  extractCSVHeadersAndSample,
  saveFieldMapping,
  type FieldMappingInput,
} from '@/app/actions/daep/reconciliation';
import { FieldMappingForm } from './FieldMappingForm';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { FieldMappingRecord, SISName } from '@/lib/validation/schemas';

export default function CSVMappingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const sessionId = searchParams.get('session');
  const detectedSIS = searchParams.get('detected_sis') as SISName | null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingMapping, setExistingMapping] = useState<FieldMappingRecord | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [sampleData, setSampleData] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Get existing mapping for tenant
        const mapping = await getFieldMapping();
        setExistingMapping(mapping);

        // If session provided, extract headers from uploaded CSV
        if (sessionId) {
          const result = await extractCSVHeadersAndSample(sessionId);
          if (result.success) {
            setCsvHeaders(result.headers);
            setSampleData(result.sampleData);
            setFileName(result.fileName || '');
          } else {
            toast({
              title: 'Error',
              description: result.error || 'Failed to extract CSV headers',
              variant: 'destructive',
            });
          }
        } else if (mapping?.sample_headers) {
          // Use stored sample headers if editing existing mapping
          setCsvHeaders(mapping.sample_headers);
        }
      } catch (error) {
        console.error('[CSV Mapping] Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load mapping configuration',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [sessionId, toast]);

  const handleSave = async (data: FieldMappingInput) => {
    setSaving(true);
    try {
      const result = await saveFieldMapping({
        ...data,
        sessionId: sessionId || undefined,
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Field mapping saved successfully',
        });

        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save mapping',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[CSV Mapping] Save error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (sessionId) {
      router.push('/daep/reconciliation');
    } else {
      router.push('/daep/settings');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">CSV Field Mapping</h2>
            <p className="text-sm text-muted-foreground">
              Configure how your SIS export columns map to DAEP fields
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading mapping configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show status if we have an existing mapping and no session
  const hasExistingMapping = existingMapping && !sessionId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">CSV Field Mapping</h2>
            <p className="text-sm text-muted-foreground">
              {sessionId
                ? 'Map your CSV columns to DAEP fields to continue'
                : 'Configure how your SIS export columns map to DAEP fields'}
            </p>
          </div>
        </div>
        {hasExistingMapping && (
          <div className="flex items-center gap-2 text-sm text-[rgb(var(--daep-success))]">
            <CheckCircle className="w-4 h-4" />
            <span>Mapping configured</span>
          </div>
        )}
      </div>

      {/* Info banner for new mapping flow */}
      {sessionId && !existingMapping && (
        <div className="flex items-start gap-3 p-4 bg-[rgb(var(--daep-info))]/10 border border-[rgb(var(--daep-info))]/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-[rgb(var(--daep-info))] shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">First-time setup required</p>
            <p className="text-muted-foreground mt-1">
              Map your SIS CSV columns to DAEP fields once. Future uploads will use this mapping automatically.
            </p>
            {fileName && (
              <p className="text-muted-foreground mt-1">
                File: <span className="font-medium">{fileName}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* No CSV headers available */}
      {csvHeaders.length === 0 && !loading && (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/50">
          <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {existingMapping
              ? 'No CSV file uploaded. Upload a CSV from the reconciliation page to update column mappings.'
              : 'No CSV file to configure. Upload a CSV from the reconciliation page to set up field mapping.'}
          </p>
          <Button onClick={() => router.push('/daep/reconciliation')}>
            Go to Reconciliation
          </Button>
        </div>
      )}

      {/* Mapping Form */}
      {csvHeaders.length > 0 && (
        <FieldMappingForm
          existingMapping={existingMapping}
          csvHeaders={csvHeaders}
          sampleData={sampleData}
          detectedSIS={detectedSIS}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      )}
    </div>
  );
}
