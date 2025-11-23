'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getAuditLogs, type AuditLog } from '@/app/actions/audit-logs';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminAuditLogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminAuditLog({ open, onOpenChange }: AdminAuditLogProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
  }, [open]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeBadge = (eventType: string) => {
    const type = eventType.split('.')[1];
    const colors: Record<string, string> = {
      created: 'bg-green-600',
      updated: 'bg-blue-600',
      deleted: 'bg-red-600',
      invited: 'bg-purple-600',
      revoked: 'bg-orange-600',
    };
    return colors[type] || 'bg-gray-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Admin Audit Log</DialogTitle>
          <DialogDescription>
            View all administrative actions and changes. This log contains sensitive information and is only accessible to admins.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        {!loading && !error && (
          <ScrollArea className="h-[60vh]">
            <div className="space-y-3">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getEventTypeBadge(log.event_type)} text-white`}>
                            {log.event_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>

                        <p className="font-medium">{log.action}</p>

                        <div className="text-sm text-muted-foreground space-y-1">
                          {log.actor_email && (
                            <div>
                              <span className="font-medium">Actor:</span> {log.actor_email} ({log.actor_role})
                            </div>
                          )}
                          {log.target_id && (
                            <div>
                              <span className="font-medium">Target ID:</span> {log.target_id}
                            </div>
                          )}
                        </div>

                        {log.details && Object.keys(log.details).length > 0 && (
                          <details className="text-sm">
                            <summary className="cursor-pointer text-primary hover:underline">
                              View details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
