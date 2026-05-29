'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, Loader2, UserCheck, AlertCircle } from 'lucide-react';
import {
  getIntakeQueue,
  importApprovedList,
  updateIntakeQueueEntry,
  type IntakeQueueEntry,
  type IntakeQueueStatus,
} from '@/app/actions/daep/intake-queue';

const STATUS_VARIANT: Record<IntakeQueueStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  approved: 'secondary',
  scheduled: 'default',
  arrived: 'default',
  promoted: 'outline',
  no_show: 'destructive',
  cancelled: 'outline',
};

const STATUS_LABEL: Record<IntakeQueueStatus, string> = {
  approved: 'Approved',
  scheduled: 'Scheduled',
  arrived: 'Arrived',
  promoted: 'Promoted',
  no_show: 'No-show',
  cancelled: 'Cancelled',
};

function isTerminal(status: IntakeQueueStatus): boolean {
  return status === 'promoted' || status === 'cancelled';
}

export default function IntakeQueuePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<IntakeQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  async function loadQueue() {
    try {
      const data = await getIntakeQueue();
      setEntries(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load intake queue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await importApprovedList(formData);

      if (result.success) {
        const parts = [`${result.added} added`, `${result.updated} updated`];
        if (result.campusUnresolved) parts.push(`${result.campusUnresolved} campus unmatched`);
        toast({
          title: 'Approved list imported',
          description: parts.join(' · '),
        });
        await loadQueue();
      } else {
        toast({
          title: 'Import failed',
          description: result.error || 'Could not import the file',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleScheduleChange = async (id: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              scheduled_intake_date: value || null,
              status: value && entry.status === 'approved' ? 'scheduled' : entry.status,
            }
          : entry
      )
    );
    const result = await updateIntakeQueueEntry(id, { scheduled_intake_date: value || null });
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update intake date',
        variant: 'destructive',
      });
      await loadQueue();
    }
  };

  const handleNoShow = async (id: string) => {
    const result = await updateIntakeQueueEntry(id, { status: 'no_show' });
    if (result.success) {
      setEntries((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, status: 'no_show' } : entry))
      );
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to mark no-show',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Intake Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Approved students awaiting DAEP intake. Schedule their date, then complete intake to
            create the placement.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Approved List
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approved Students</CardTitle>
          <CardDescription>
            Upload the district&apos;s approved list (student name, campus, special notes). Re-importing
            updates existing entries instead of duplicating them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No students in the intake queue yet.</p>
              <p className="text-sm mt-1">Import an approved list to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Home Campus</TableHead>
                  <TableHead>Scheduled Intake</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const campusUnresolved = !!entry.campus_name && !entry.home_campus_name;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium">
                          {entry.last_name}
                          {entry.last_name && entry.first_name ? ', ' : ''}
                          {entry.first_name}
                        </div>
                        {entry.special_notes && (
                          <div className="text-xs text-muted-foreground max-w-xs truncate">
                            {entry.special_notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.student_id || '—'}
                      </TableCell>
                      <TableCell>
                        {entry.home_campus_name ? (
                          entry.home_campus_name
                        ) : campusUnresolved ? (
                          <span className="flex items-center gap-1 text-[rgb(var(--daep-warning))] text-sm">
                            <AlertCircle className="w-3 h-3" />
                            {entry.campus_name} (unmatched)
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={entry.scheduled_intake_date || ''}
                          disabled={isTerminal(entry.status)}
                          onChange={(e) => handleScheduleChange(entry.id, e.target.value)}
                          className="w-40"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[entry.status]}>
                          {STATUS_LABEL[entry.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isTerminal(entry.status) && (
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" asChild>
                              <Link href={`/daep/placements/new?queueId=${entry.id}`}>
                                <UserCheck className="w-4 h-4 mr-1.5" />
                                Complete intake
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleNoShow(entry.id)}
                            >
                              No-show
                            </Button>
                          </div>
                        )}
                        {entry.status === 'promoted' && entry.placement_id && (
                          <Link
                            href={`/daep/students`}
                            className="text-sm text-primary hover:underline"
                          >
                            View placement
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
