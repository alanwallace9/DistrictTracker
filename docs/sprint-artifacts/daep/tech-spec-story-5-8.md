# Tech Spec: Story 5-8 - Reconciliation Audit Trail

**Epic:** 5 - CSV Reconciliation
**Points:** 3
**Status:** Drafted
**FRs:** FR60
**Dependencies:** Story 5-7 (Resolution Actions)

---

## Purpose

Maintain a complete audit trail of all reconciliation decisions to enable review, justify data changes, and support compliance requirements. Administrators can view the history of all reconciliation sessions and individual resolution decisions.

---

## Acceptance Criteria Checklist

| AC | Description | Required Implementation |
|----|-------------|------------------------|
| 5.8.1 | Log all reconciliation actions | session_started, discrepancy_resolved, session_completed |
| 5.8.2 | Include resolution details | resolution type, note if added, before/after values |
| 5.8.3 | Reference session and discrepancy | session_id and discrepancy_id in audit entries |
| 5.8.4 | Log to main audit log | Also logged to admin_audit_log with module='daep_management' |
| 5.8.5 | View session audit history | UI to view all actions for a specific session |

---

## Database Tables

### `daep_reconciliation_audit`

```sql
CREATE TABLE daep_reconciliation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES daep_reconciliation_sessions(id) ON DELETE CASCADE,
  discrepancy_id UUID REFERENCES daep_reconciliation_discrepancies(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'session_created',
    'session_started',
    'csv_uploaded',
    'mapping_applied',
    'comparison_completed',
    'discrepancy_resolved',
    'session_completed',
    'session_abandoned'
  )),
  actor_id TEXT NOT NULL,
  actor_email TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recon_audit_session ON daep_reconciliation_audit(session_id);
CREATE INDEX idx_recon_audit_tenant ON daep_reconciliation_audit(tenant_id);
CREATE INDEX idx_recon_audit_actor ON daep_reconciliation_audit(actor_id);
CREATE INDEX idx_recon_audit_action ON daep_reconciliation_audit(action);
CREATE INDEX idx_recon_audit_created ON daep_reconciliation_audit(created_at DESC);

-- RLS
ALTER TABLE daep_reconciliation_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daep_reconciliation_audit_tenant_isolation"
  ON daep_reconciliation_audit
  FOR ALL
  USING (
    tenant_id IN (
      SELECT COALESCE(active_tenant_id, tenant_id)
      FROM user_profiles
      WHERE id = auth.uid()::text
    )
  );
```

---

## Audit Event Types

| Action | When Logged | Details Included |
|--------|-------------|------------------|
| `session_created` | Upload initiated | fileName, fileSize |
| `csv_uploaded` | File uploaded to storage | fileUrl, originalName |
| `mapping_applied` | Field mapping used | mappingId, sisName |
| `comparison_completed` | Comparison finished | totalRecords, matched, conflicts, newInSIS, missingFromSIS |
| `discrepancy_resolved` | Resolution action taken | discrepancyType, resolution, hasNote, studentId, studentName, changedFields |
| `session_completed` | All discrepancies resolved | totalResolved, acceptedSIS, keptDAEP, duration |
| `session_abandoned` | Session left incomplete | unresolvedCount, lastActivity |

---

## Server Actions

### File: `app/actions/daep/reconciliation.ts`

#### `logReconciliationEvent(input: ReconciliationAuditInput)`

```typescript
export interface ReconciliationAuditInput {
  sessionId: string;
  discrepancyId?: string;
  action: string;
  details?: Record<string, any>;
}

export async function logReconciliationEvent(input: ReconciliationAuditInput) {
  const supabase = await createServerClient();
  const user = await currentUser();
  const tenantId = await getTenantId();

  if (!user) {
    console.error('[Reconciliation Audit] No user for audit log');
    return;
  }

  // Insert into reconciliation-specific audit table
  const { error: reconError } = await supabase
    .from('daep_reconciliation_audit')
    .insert({
      tenant_id: tenantId,
      session_id: input.sessionId,
      discrepancy_id: input.discrepancyId,
      action: input.action,
      actor_id: user.id,
      actor_email: user.emailAddresses[0]?.emailAddress,
      details: input.details || {},
    });

  if (reconError) {
    console.error('[Reconciliation Audit] Failed to log:', reconError);
  }

  // Also log to main audit log for cross-module visibility
  await logAuditEvent({
    eventType: `reconciliation.${input.action}`,
    module: 'daep_management',
    actorId: user.id,
    actorEmail: user.emailAddresses[0]?.emailAddress,
    targetId: input.discrepancyId || input.sessionId,
    action: getAuditActionDescription(input.action, input.details),
    details: {
      sessionId: input.sessionId,
      discrepancyId: input.discrepancyId,
      ...input.details,
    },
  });
}

function getAuditActionDescription(action: string, details?: Record<string, any>): string {
  switch (action) {
    case 'session_created':
      return `Started reconciliation session with file: ${details?.fileName}`;
    case 'csv_uploaded':
      return `Uploaded CSV file: ${details?.fileName}`;
    case 'mapping_applied':
      return `Applied field mapping for ${details?.sisName}`;
    case 'comparison_completed':
      return `Completed comparison: ${details?.matched} matched, ${details?.conflicts} conflicts`;
    case 'discrepancy_resolved':
      return `Resolved discrepancy for ${details?.studentName}: ${details?.resolution}`;
    case 'session_completed':
      return `Completed reconciliation session: ${details?.totalResolved} discrepancies resolved`;
    case 'session_abandoned':
      return `Abandoned reconciliation session with ${details?.unresolvedCount} unresolved`;
    default:
      return `Reconciliation action: ${action}`;
  }
}
```

#### `getSessionAuditHistory(sessionId: string)`

```typescript
export async function getSessionAuditHistory(sessionId: string) {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('daep_reconciliation_audit')
    .select(`
      id,
      action,
      actor_id,
      actor_email,
      discrepancy_id,
      details,
      created_at
    `)
    .eq('session_id', sessionId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Audit] Failed to fetch history:', error);
    return [];
  }

  return data;
}
```

#### `getReconciliationAuditReport(filters: AuditReportFilters)`

```typescript
export interface AuditReportFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
}

export async function getReconciliationAuditReport(filters: AuditReportFilters) {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  let query = supabase
    .from('daep_reconciliation_audit')
    .select(`
      id,
      session_id,
      discrepancy_id,
      action,
      actor_id,
      actor_email,
      details,
      created_at,
      daep_reconciliation_sessions (
        file_name,
        upload_date,
        status
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters.userId) {
    query = query.eq('actor_id', filters.userId);
  }
  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  const { data, error } = await query.limit(500);

  if (error) {
    console.error('[Audit Report] Failed to fetch:', error);
    return [];
  }

  return data;
}
```

---

## UI Components

### Session Audit History

```typescript
// app/daep/reconciliation/[sessionId]/components/audit-history.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { getSessionAuditHistory } from '@/app/actions/daep/reconciliation';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  sessionId: string;
}

export function AuditHistory({ sessionId }: Props) {
  const [events, setEvents] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getSessionAuditHistory(sessionId);
      setEvents(data);
      setLoading(false);
    }
    load();
  }, [sessionId]);

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'session_completed':
        return 'default';
      case 'discrepancy_resolved':
        return 'secondary';
      case 'session_abandoned':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      session_created: 'Session Started',
      csv_uploaded: 'File Uploaded',
      mapping_applied: 'Mapping Applied',
      comparison_completed: 'Comparison Done',
      discrepancy_resolved: 'Resolved',
      session_completed: 'Completed',
      session_abandoned: 'Abandoned',
    };
    return labels[action] || action;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Audit History
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      {expanded && (
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading audit history...
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No audit events recorded.
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-2 rounded bg-muted/50"
                  >
                    <Badge variant={getActionBadgeVariant(event.action)}>
                      {getActionLabel(event.action)}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {event.details?.studentName && (
                          <span className="font-medium">
                            {event.details.studentName}:
                          </span>
                        )}{' '}
                        {event.details?.resolution || event.details?.fileName || ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.actor_email} •{' '}
                        {formatDistanceToNow(new Date(event.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
}
```

### Reconciliation Audit Report Page

```typescript
// app/daep/reports/reconciliation-audit/page.tsx
import { getReconciliationAuditReport } from '@/app/actions/daep/reconciliation';
import { ReconciliationAuditTable } from './components/audit-table';

export default async function ReconciliationAuditPage() {
  const events = await getReconciliationAuditReport({});

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reconciliation Audit Log</h1>
        <p className="text-muted-foreground">
          Complete history of all SIS reconciliation activities
        </p>
      </div>

      <ReconciliationAuditTable events={events} />
    </div>
  );
}
```

---

## Integration Points

### Update Existing Server Actions

Add audit logging to existing reconciliation actions:

```typescript
// In uploadReconciliationCSV:
await logReconciliationEvent({
  sessionId: session.id,
  action: 'session_created',
  details: { fileName: file.name, fileSize: file.size },
});

// In startReconciliationComparison:
await logReconciliationEvent({
  sessionId,
  action: 'comparison_completed',
  details: {
    totalRecords: sisRecords.length,
    matched,
    conflicts: fieldConflicts,
    newInSIS,
    missingFromSIS,
  },
});

// In resolveDiscrepancy:
await logReconciliationEvent({
  sessionId: input.sessionId,
  discrepancyId: input.discrepancyId,
  action: 'discrepancy_resolved',
  details: {
    discrepancyType: discrepancy.discrepancy_type,
    resolution: input.resolution,
    hasNote: !!input.note,
    studentId: discrepancy.student_id,
    studentName: discrepancy.student_name,
    changedFields: discrepancy.conflicts?.map((c: any) => c.field),
  },
});

// In checkSessionCompletion (when session completes):
await logReconciliationEvent({
  sessionId,
  action: 'session_completed',
  details: {
    totalResolved: resolvedCount,
    acceptedSIS: acceptCount,
    keptDAEP: keepCount,
    duration: `${durationMinutes} minutes`,
  },
});
```

---

## Migration File

```sql
-- supabase/migrations/20251211_daep_reconciliation_audit.sql

CREATE TABLE IF NOT EXISTS daep_reconciliation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES daep_reconciliation_sessions(id) ON DELETE CASCADE,
  discrepancy_id UUID REFERENCES daep_reconciliation_discrepancies(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'session_created',
    'session_started',
    'csv_uploaded',
    'mapping_applied',
    'comparison_completed',
    'discrepancy_resolved',
    'session_completed',
    'session_abandoned'
  )),
  actor_id TEXT NOT NULL,
  actor_email TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recon_audit_session ON daep_reconciliation_audit(session_id);
CREATE INDEX idx_recon_audit_tenant ON daep_reconciliation_audit(tenant_id);
CREATE INDEX idx_recon_audit_actor ON daep_reconciliation_audit(actor_id);
CREATE INDEX idx_recon_audit_action ON daep_reconciliation_audit(action);
CREATE INDEX idx_recon_audit_created ON daep_reconciliation_audit(created_at DESC);

-- RLS
ALTER TABLE daep_reconciliation_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daep_reconciliation_audit_tenant_isolation"
  ON daep_reconciliation_audit
  FOR ALL
  USING (
    tenant_id IN (
      SELECT COALESCE(active_tenant_id, tenant_id)
      FROM user_profiles
      WHERE id = auth.uid()::text
    )
  );
```

---

## Edge Cases

1. **Actor no longer exists:** Store actor_email at log time, not just ID
2. **Session deleted:** Cascade delete audit entries
3. **Discrepancy deleted:** SET NULL for discrepancy_id, keep audit entry
4. **Large number of audit entries:** Pagination for reports
5. **Concurrent resolutions:** Each creates separate audit entry
6. **Abandoned session detection:** Cron job to mark sessions inactive after 24h

---

## Testing Checklist

- [ ] session_created logged on upload
- [ ] csv_uploaded logged after storage upload
- [ ] comparison_completed logged with counts
- [ ] discrepancy_resolved logged for each resolution
- [ ] session_completed logged when all resolved
- [ ] Details include before/after values for conflicts
- [ ] Resolution notes captured in details
- [ ] Events appear in session audit history
- [ ] Events appear in main admin_audit_log
- [ ] Audit report filters work (date, user, action)
- [ ] Actor email stored correctly
