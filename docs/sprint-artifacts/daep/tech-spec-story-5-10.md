# Tech Spec: Story 5-10 - Unresolved Discrepancy Alerts

**Epic:** 5 - CSV Reconciliation
**Points:** 3
**Status:** Drafted
**FRs:** FR62
**Dependencies:**
- Story 5-4 (Comparison Engine) - Session status values
- Story 5-8 (Audit Trail) - `admin_audit_log` table for reconciliation events
- Story 5-9 (Summary Report) - Session completion handling, `getReconciliationSummary()`

---

## Purpose

Alert administrators about unresolved discrepancies from incomplete reconciliation sessions to ensure data reconciliation is completed and not forgotten. This includes dashboard warnings, incomplete session tracking, and notification after 24 hours.

---

## Auth Pattern (per CLAUDE.md)

All server actions MUST follow this pattern:

```typescript
const supabase = await createServerClient();
const tenantId = await getTenantId();
const user = await currentUser();
// RLS handles role-based access at DB level
```

**DO NOT** create custom auth helpers - RLS handles access control.

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

## Pending Actions Integration

**Key Change:** Instead of a separate alert card, reconciliation items integrate into the existing Pending Actions card on the dashboard (visible in right sidebar).

### Pending Action Item Format

```typescript
// Reconciliation pending action item structure
interface ReconciliationPendingAction {
  id: string;
  type: 'reconciliation_incomplete' | 'reconciliation_abandoned';
  title: string;           // "Reconciliation incomplete" or "Reconciliation abandoned"
  description: string;     // File name
  subtitle: string;        // "5 of 7 unresolved • 3 days ago"
  actionUrl: string;       // /daep/reconciliation/{sessionId}
  ageCategory: SessionAgeCategory;
  createdAt: string;
}
```

### Age-Based Color Coding

```typescript
// lib/daep/session-age.ts
export type SessionAgeCategory = 'recent' | 'warning' | 'critical' | 'abandoned';

export function getSessionAgeCategory(uploadDate: string): SessionAgeCategory {
  const daysSinceUpload = Math.floor(
    (Date.now() - new Date(uploadDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceUpload >= 7) return 'abandoned';
  if (daysSinceUpload >= 3) return 'critical';   // orange
  if (daysSinceUpload >= 1) return 'warning';    // yellow
  return 'recent';                                // no special color (< 1 day)
}

export function getAgeColorClasses(category: SessionAgeCategory): string {
  const colors: Record<SessionAgeCategory, string> = {
    recent: '',
    warning: 'border-l-4 border-l-yellow-500 bg-yellow-50',
    critical: 'border-l-4 border-l-orange-500 bg-orange-50',
    abandoned: 'border-l-4 border-l-red-500 bg-red-50',
  };
  return colors[category];
}
```

### Role-Based Filtering

Only DAEP Admin L1 and L2 roles see reconciliation pending actions:

```typescript
// In getReconciliationPendingActions()
const allowedRoles = ['daep_admin_l1', 'daep_admin_l2', 'super_admin'];

const user = await currentUser();
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('user_id', user?.id)
  .single();

if (!profile || !allowedRoles.includes(profile.role)) {
  return []; // Don't show to teachers, viewers, etc.
}
```

### Dashboard Integration

```typescript
// app/daep/(main)/dashboard/page.tsx
import { getReconciliationPendingActions } from '@/app/actions/daep/reconciliation';

export default async function DAEPDashboard() {
  // Fetch reconciliation pending actions (role-filtered server-side)
  const reconciliationActions = await getReconciliationPendingActions();

  // Merge with other pending actions and render in Pending Actions card
  // ...
}
```

---

## Server Actions

### File: `app/actions/daep/reconciliation.ts`

**Note:** This file already contains related functions from previous stories:
- `getReconciliationSessions()` (line 255) - Returns all sessions for tenant
- `getReconciliationSummary()` (line 1974) - Returns summary for completed session
- `getSessionAuditEvents()` (line 1862) - Returns audit trail for session

#### Type Definition (add to `lib/validation/schemas.ts`)

```typescript
// Add alongside ReconciliationSummary, ResolutionDetail from Story 5-9
export interface UnresolvedSession {
  id: string;
  fileName: string;
  uploadDate: string;
  unresolvedCount: number;
  totalDiscrepancies: number;
  status: string;
}
```

#### `getUnresolvedSessions()`

```typescript
// Add to reconciliation.ts after getReconciliationSummary()

export async function getUnresolvedSessions(): Promise<UnresolvedSession[]> {
  // Follow standard auth pattern (per CLAUDE.md)
  const supabase = await createServerClient();
  const tenantId = await getTenantId();
  // Note: user not needed here - RLS handles tenant isolation

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
// NOTE: This function is called by cron job, so it queries ALL tenants
// Uses service role client to bypass RLS for cross-tenant queries

import { createServiceClient } from '@/lib/supabase/service';

export async function getIncompleteSessionsForNotification() {
  // Use service client for cron job (cross-tenant query)
  const supabase = createServiceClient();

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

## Cron Job for 5 AM Daily Reminder (Timezone-Aware)

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/reconciliation-reminder",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Note:** Runs hourly, but internally checks each tenant's timezone to see if it's 5 AM local time.

### Cron API Route

```typescript
// app/api/cron/reconciliation-reminder/route.ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit-logger';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    let totalReminders = 0;
    const processedTenants: string[] = [];

    // Get all tenants with their timezone settings
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name');

    for (const tenant of tenants || []) {
      // Get tenant timezone from settings
      const { data: settings } = await supabase
        .from('daep_district_settings')
        .select('timezone')
        .eq('tenant_id', tenant.id)
        .single();

      const timezone = settings?.timezone || 'America/Chicago';

      // Check if it's 5 AM in this tenant's timezone
      const now = new Date();
      const localHour = parseInt(
        new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          hour12: false,
          timeZone: timezone,
        }).format(now)
      );

      if (localHour !== 5) {
        continue; // Skip - not 5 AM for this tenant
      }

      processedTenants.push(tenant.id);

      // Get incomplete sessions > 24 hours old for this tenant
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: sessions } = await supabase
        .from('daep_reconciliation_sessions')
        .select('id, tenant_id, uploaded_by, file_name, upload_date')
        .eq('tenant_id', tenant.id)
        .eq('status', 'in_review')
        .lt('upload_date', twentyFourHoursAgo.toISOString());

      for (const session of sessions || []) {
        // Get user email
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('email, display_name')
          .eq('user_id', session.uploaded_by)
          .single();

        // Create in-app notification
        await supabase.from('daep_notifications').insert({
          tenant_id: session.tenant_id,
          user_id: session.uploaded_by,
          type: 'reconciliation_incomplete',
          title: 'Incomplete Reconciliation Session',
          message: `You have unresolved discrepancies from ${session.file_name}`,
          action_url: `/daep/reconciliation/${session.id}`,
          read: false,
        });

        // Log audit event
        await logAuditEvent({
          eventType: 'reconciliation.reminder_sent',
          module: 'daep_management',
          actorId: 'system',
          actorEmail: 'system@cron',
          targetId: session.id,
          action: 'Sent 5 AM daily reminder',
          details: {
            sessionId: session.id,
            timezone,
            recipientEmail: userProfile?.email,
            fileName: session.file_name,
          },
          tenantId: session.tenant_id,
        });

        totalReminders++;
      }
    }

    return NextResponse.json({
      message: `Sent ${totalReminders} reminders to ${processedTenants.length} tenants`,
      tenantsProcessed: processedTenants,
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
// app/daep/(main)/reconciliation/components/incomplete-sessions.tsx
// NOTE: File path follows existing pattern (matches reconciliation page structure)
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { UnresolvedSession } from '@/lib/validation/schemas';

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
// Add to: app/api/cron/reconciliation-cleanup/route.ts

import { createServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit-logger';

export async function markAbandonedSessions() {
  const supabase = createServiceClient();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Find sessions older than 7 days still in_review
  const { data: abandonedSessions } = await supabase
    .from('daep_reconciliation_sessions')
    .select('id, tenant_id, file_name')
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

  if (error) {
    console.error('[Cleanup] Failed to mark sessions abandoned:', error);
    return { marked: 0 };
  }

  // Log audit events using existing audit system
  for (const session of abandonedSessions) {
    await logAuditEvent({
      eventType: 'reconciliation.session_abandoned',
      module: 'daep_management',
      actorId: 'system',
      actorEmail: 'system@cron',
      targetId: session.id,
      action: 'Marked session as abandoned',
      details: {
        sessionId: session.id,
        fileName: session.file_name,
        reason: 'Session inactive for 7+ days',
      },
      tenantId: session.tenant_id,
    });
  }

  return { marked: abandonedSessions.length };
}
```

---

## Notification Table Migration

**IMPORTANT:** First verify if `daep_notifications` table exists. If not, create it.

```sql
-- Migration: create_daep_notifications_table
-- Check if table exists first, then create or alter

-- Create table if not exists
CREATE TABLE IF NOT EXISTS daep_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL,  -- Clerk user ID
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,

  CONSTRAINT daep_notifications_type_check
    CHECK (type IN (
      'point_approval',
      'compliance_deadline',
      'milestone',
      'transition_reminder',
      'attendance_alert',
      'reconciliation_incomplete'
    ))
);

-- RLS policy (follows CLAUDE.md pattern - use get_my_tenant_id())
ALTER TABLE daep_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for daep_notifications"
  ON daep_notifications
  FOR ALL
  USING (tenant_id = get_my_tenant_id());

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_daep_notifications_user_unread
  ON daep_notifications(user_id, read)
  WHERE read = false;
```

**Alternative:** If table exists but needs the new type:

```sql
-- Just add the new type to existing constraint
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
- [ ] Audit log captures all events (via `logAuditEvent()`)
- [ ] TypeScript compiles without errors
- [ ] Playwright MCP verification

---

## File List

### New Files

| File | Description |
|------|-------------|
| `app/daep/(main)/reconciliation/components/incomplete-sessions.tsx` | Incomplete sessions list component |
| `app/api/cron/reconciliation-reminder/route.ts` | 5 AM timezone-aware reminder cron job |
| `lib/daep/session-age.ts` | Age category calculation utilities |

### Modified Files

| File | Changes |
|------|---------|
| `app/actions/daep/reconciliation.ts` | Add `getUnresolvedSessions()`, `getReconciliationPendingActions()`, `markAbandonedSessions()`, `hasUnacceptedMatches()`, `resumeAbandonedSession()` |
| `lib/validation/schemas.ts` | Add `UnresolvedSession`, `SessionAgeCategory`, `ReconciliationPendingAction` interfaces |
| `app/daep/(main)/dashboard/page.tsx` | Integrate reconciliation items into Pending Actions card |
| `app/daep/(main)/reconciliation/page.tsx` | Import and render `IncompleteSessions` |
| `app/daep/(main)/reconciliation/[sessionId]/page.tsx` | Add "Accept All Matches" reminder banner |
| `vercel.json` | Add hourly cron job configuration |

### Database Migration

| Migration | Description |
|-----------|-------------|
| `add_abandoned_status` | Add 'abandoned' to `daep_reconciliation_sessions` status enum |
| `create_daep_notifications_table` | Create notifications table with RLS (if not exists) |

---

## Quick Wins Included

| Quick Win | Implementation |
|-----------|----------------|
| Age-based color coding | Yellow (1-3d), Orange (3-7d), Red (7+d) via `getAgeColorClasses()` |
| Keyboard shortcut "R" | useEffect listener on dashboard, navigates to oldest incomplete |
| "Accept All Matches" reminder | Banner in session page if matched records not bulk-accepted |

---

## References

- [Source: CLAUDE.md] - Auth patterns, RLS guidelines
- [Source: Story 5-8] - Audit trail via `logAuditEvent()`
- [Source: Story 5-9] - Session completion handling, summary patterns
- [Source: FR62] - Unresolved discrepancy alerts requirement
- [Source: Dashboard mockup] - Pending Actions card design pattern
