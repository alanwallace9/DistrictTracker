# Tech Spec: Story 5-10 - Unresolved Discrepancy Alerts

**Epic:** 5 - CSV Reconciliation
**Points:** 3
**Status:** Drafted
**FRs:** FR62
**Dependencies:** Story 5-4 (Comparison Engine)

---

## Purpose

Alert administrators about unresolved discrepancies from incomplete reconciliation sessions to ensure data reconciliation is completed and not forgotten. This includes dashboard warnings, incomplete session tracking, and notification after 24 hours.

---

## Acceptance Criteria Checklist

| AC | Description | Required Implementation |
|----|-------------|------------------------|
| 5.10.1 | Dashboard warning | Show alert card for unresolved discrepancies |
| 5.10.2 | Warning details | Display "X unresolved discrepancies from [date]" |
| 5.10.3 | Click to navigate | Link to reconciliation session |
| 5.10.4 | 24-hour notification | Send notification if session incomplete after 24 hours |
| 5.10.5 | List incomplete sessions | Reconciliation page shows incomplete sessions |
| 5.10.6 | Resume capability | Can continue session where left off |

---

## Dashboard Integration

### Alert Card Component

```typescript
// components/daep/dashboard/unresolved-alert.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UnresolvedSession {
  id: string;
  fileName: string;
  uploadDate: string;
  unresolvedCount: number;
  totalDiscrepancies: number;
}

interface Props {
  sessions: UnresolvedSession[];
}

export function UnresolvedDiscrepancyAlert({ sessions }: Props) {
  const router = useRouter();

  if (sessions.length === 0) return null;

  const totalUnresolved = sessions.reduce((sum, s) => sum + s.unresolvedCount, 0);

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
            <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
              Unresolved Discrepancies
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {totalUnresolved} discrepancies from {sessions.length} session{sessions.length > 1 ? 's' : ''} need your attention.
            </p>

            <div className="mt-4 space-y-2">
              {sessions.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-yellow-200 dark:border-yellow-800"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{session.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.unresolvedCount} of {session.totalDiscrepancies} unresolved •{' '}
                        {formatDistanceToNow(new Date(session.uploadDate), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/daep/reconciliation/${session.id}`)}
                  >
                    Resume
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ))}

              {sessions.length > 3 && (
                <Button
                  variant="link"
                  className="text-yellow-700 dark:text-yellow-300 p-0"
                  onClick={() => router.push('/daep/reconciliation')}
                >
                  View all {sessions.length} incomplete sessions →
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Dashboard Integration

```typescript
// app/daep/dashboard/page.tsx
import { getUnresolvedSessions } from '@/app/actions/daep/reconciliation';
import { UnresolvedDiscrepancyAlert } from '@/components/daep/dashboard/unresolved-alert';

export default async function DAEPDashboard() {
  const unresolvedSessions = await getUnresolvedSessions();

  return (
    <div className="space-y-6">
      {/* Unresolved Alert - Top Priority */}
      <UnresolvedDiscrepancyAlert sessions={unresolvedSessions} />

      {/* Rest of dashboard... */}
    </div>
  );
}
```

---

## Server Actions

### File: `app/actions/daep/reconciliation.ts`

#### `getUnresolvedSessions()`

```typescript
export interface UnresolvedSession {
  id: string;
  fileName: string;
  uploadDate: string;
  unresolvedCount: number;
  totalDiscrepancies: number;
  status: string;
}

export async function getUnresolvedSessions(): Promise<UnresolvedSession[]> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  // Get sessions that are in_review status (not completed)
  const { data: sessions, error } = await supabase
    .from('daep_reconciliation_sessions')
    .select(`
      id,
      file_name,
      upload_date,
      status,
      discrepancy_count,
      new_in_sis_count,
      missing_from_sis_count
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'in_review')
    .order('upload_date', { ascending: false });

  if (error || !sessions) {
    console.error('[Reconciliation] Failed to fetch unresolved sessions:', error);
    return [];
  }

  // For each session, get actual unresolved count
  const sessionsWithCounts = await Promise.all(
    sessions.map(async (session) => {
      const { count } = await supabase
        .from('daep_reconciliation_discrepancies')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id)
        .eq('resolution', 'pending')
        .neq('discrepancy_type', 'matched');

      const totalDiscrepancies =
        session.discrepancy_count +
        session.new_in_sis_count +
        session.missing_from_sis_count;

      return {
        id: session.id,
        fileName: session.file_name,
        uploadDate: session.upload_date,
        unresolvedCount: count || 0,
        totalDiscrepancies,
        status: session.status,
      };
    })
  );

  // Filter to only sessions with actual unresolved discrepancies
  return sessionsWithCounts.filter(s => s.unresolvedCount > 0);
}
```

#### `getIncompleteSessionsForNotification()`

```typescript
export async function getIncompleteSessionsForNotification() {
  const supabase = await createServerClient();

  // Get sessions older than 24 hours that are still in_review
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data: sessions, error } = await supabase
    .from('daep_reconciliation_sessions')
    .select(`
      id,
      tenant_id,
      uploaded_by,
      file_name,
      upload_date,
      discrepancy_count,
      new_in_sis_count,
      missing_from_sis_count
    `)
    .eq('status', 'in_review')
    .lt('upload_date', twentyFourHoursAgo.toISOString());

  if (error) {
    console.error('[Reconciliation] Failed to fetch incomplete sessions:', error);
    return [];
  }

  return sessions || [];
}
```

---

## Cron Job for 24-Hour Notifications

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/reconciliation-reminder",
      "schedule": "0 8 * * *"
    }
  ]
}
```

### Cron API Route

```typescript
// app/api/cron/reconciliation-reminder/route.ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getIncompleteSessionsForNotification } from '@/app/actions/daep/reconciliation';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const incompleteSessions = await getIncompleteSessionsForNotification();

    if (incompleteSessions.length === 0) {
      return NextResponse.json({ message: 'No incomplete sessions' });
    }

    const supabase = createServiceClient();

    // Create notifications for each incomplete session
    for (const session of incompleteSessions) {
      // Get user email
      const { data: user } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', session.uploaded_by)
        .single();

      // Create in-app notification
      await supabase.from('daep_notifications').insert({
        tenant_id: session.tenant_id,
        user_id: session.uploaded_by,
        type: 'reconciliation_incomplete',
        title: 'Incomplete Reconciliation Session',
        message: `You have unresolved discrepancies from ${session.file_name} uploaded ${new Date(session.upload_date).toLocaleDateString()}`,
        action_url: `/daep/reconciliation/${session.id}`,
        read: false,
      });

      // Log the notification
      await supabase.from('daep_reconciliation_audit').insert({
        tenant_id: session.tenant_id,
        session_id: session.id,
        action: 'reminder_sent',
        actor_id: 'system',
        details: {
          reminderType: '24_hour',
          recipientEmail: user?.email,
        },
      });
    }

    return NextResponse.json({
      message: `Sent ${incompleteSessions.length} reminders`,
      sessions: incompleteSessions.map(s => s.id),
    });
  } catch (error) {
    console.error('[Cron] Reconciliation reminder failed:', error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}
```

---

## Reconciliation Page - Incomplete Sessions List

```typescript
// app/daep/reconciliation/components/incomplete-sessions.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileSpreadsheet, ArrowRight, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { UnresolvedSession } from '@/lib/types/daep';

interface Props {
  sessions: UnresolvedSession[];
}

export function IncompleteSessions({ sessions }: Props) {
  const router = useRouter();

  if (sessions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          Incomplete Sessions
          <Badge variant="secondary">{sessions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{session.fileName}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {session.unresolvedCount} of {session.totalDiscrepancies} unresolved
                    </span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(session.uploadDate), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ProgressRing
                  progress={
                    ((session.totalDiscrepancies - session.unresolvedCount) /
                      session.totalDiscrepancies) *
                    100
                  }
                />
                <Button
                  size="sm"
                  onClick={() => router.push(`/daep/reconciliation/${session.id}`)}
                >
                  Resume
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressRing({ progress }: { progress: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative h-10 w-10">
      <svg className="h-10 w-10 -rotate-90">
        <circle
          className="text-muted stroke-current"
          strokeWidth="3"
          fill="transparent"
          r={radius}
          cx="20"
          cy="20"
        />
        <circle
          className="text-green-600 stroke-current"
          strokeWidth="3"
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx="20"
          cy="20"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
        {Math.round(progress)}%
      </span>
    </div>
  );
}
```

---

## Session Abandonment Detection

```typescript
// Mark sessions as abandoned after 7 days
// Run via cron job weekly

export async function markAbandonedSessions() {
  const supabase = createServiceClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Find sessions older than 7 days still in_review
  const { data: abandonedSessions } = await supabase
    .from('daep_reconciliation_sessions')
    .select('id, tenant_id')
    .eq('status', 'in_review')
    .lt('upload_date', sevenDaysAgo.toISOString());

  if (!abandonedSessions || abandonedSessions.length === 0) {
    return { marked: 0 };
  }

  // Update status to abandoned
  const { error } = await supabase
    .from('daep_reconciliation_sessions')
    .update({ status: 'abandoned' })
    .in('id', abandonedSessions.map(s => s.id));

  // Log audit events
  for (const session of abandonedSessions) {
    await supabase.from('daep_reconciliation_audit').insert({
      tenant_id: session.tenant_id,
      session_id: session.id,
      action: 'session_abandoned',
      actor_id: 'system',
      details: {
        reason: 'Session inactive for 7+ days',
      },
    });
  }

  return { marked: abandonedSessions.length };
}
```

---

## Notification Table Update

```sql
-- Add reconciliation notification type if not exists
-- In daep_notifications, ensure type supports 'reconciliation_incomplete'

ALTER TABLE daep_notifications
  DROP CONSTRAINT IF EXISTS daep_notifications_type_check,
  ADD CONSTRAINT daep_notifications_type_check
    CHECK (type IN (
      'point_approval',
      'compliance_deadline',
      'milestone',
      'transition_reminder',
      'attendance_alert',
      'reconciliation_incomplete'
    ));
```

---

## Edge Cases

1. **Session completed between checks:** Verify unresolved count before sending reminder
2. **User no longer exists:** Skip notification, log warning
3. **Multiple incomplete sessions:** Show all, prioritize oldest
4. **Session abandoned then resumed:** Update status back to in_review
5. **Very old sessions (30+ days):** Consider auto-archiving

---

## Testing Checklist

- [ ] Dashboard shows unresolved alert when sessions exist
- [ ] Alert shows correct count of unresolved discrepancies
- [ ] Click "Resume" navigates to correct session
- [ ] Session resumes at correct position
- [ ] Incomplete sessions list shows on reconciliation page
- [ ] Progress ring shows accurate percentage
- [ ] 24-hour cron job triggers notifications
- [ ] In-app notification created correctly
- [ ] Sessions marked abandoned after 7 days
- [ ] Audit log captures all events
