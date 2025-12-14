# Story 5-10: Unresolved Discrepancy Alerts

**Status:** drafted
**Epic:** 5 - CSV Reconciliation
**Points:** 5 (increased for quick wins + abandonment)
**FRs:** FR62
**Dependencies:** Story 5-4 (Comparison Engine), Story 5-8 (Audit Trail), Story 5-9 (Summary Report)

---

## Story

As a **DAEP administrator (L1 or L2)**,
I want **to see incomplete reconciliation sessions in my Pending Actions list**,
So that **I don't forget to finish reconciling and can maintain accurate data between SIS and DAEP**.

---

## Design Philosophy

> "How did they ever do their job without this?"

You uploaded a CSV, got pulled into a meeting, and forgot to finish reviewing the discrepancies. Without alerts, that data sits in limbo - SIS and DAEP out of sync. This story ensures incomplete work surfaces in your Pending Actions list alongside other tasks, and nudges you at 5 AM each day so it's ready when you start work. Sessions abandoned for 7+ days get marked appropriately so you know what's stale.

---

## Reference Mockup

**Dashboard - Pending Actions Card (right sidebar):**
```
+------------------------------------------+
| Pending Actions                          |
+------------------------------------------+
| (!) No-show needs reschedule             |  <- existing action types
|     Alex Rivera                          |
|     2 hours ago                          |
+------------------------------------------+
| (!) No-show needs reschedule             |
|     Cameron Lee                          |
|     3 hours ago                          |
+------------------------------------------+
| [Y] Reconciliation incomplete            |  <- NEW: yellow for 1-3 days
|     skyward-export-2025-12-10.csv        |
|     5 of 7 unresolved • 3 days ago       |
+------------------------------------------+
| [O] Reconciliation incomplete            |  <- orange for 3-7 days
|     focus-export-2025-12-08.csv          |
|     3 of 3 unresolved • 5 days ago       |
+------------------------------------------+
| [R] Reconciliation abandoned             |  <- red for 7+ days
|     old-export-2025-12-01.csv            |
|     Abandoned • 12 days ago              |
+------------------------------------------+
| (Y) Review date approaching              |
|     Jordan Mitchell                      |
|     Tomorrow                             |
+------------------------------------------+
```

**Same-day color coding (badge + items):**
- Green: Before 10 AM (on track)
- Yellow: 10 AM - 12 PM (warning)
- Orange: 12 PM - 3 PM (urgent)
- Red: After 3 PM (overdue)

**Reminder schedule:** 5 AM (carryover), 10 AM, 1 PM

**Note:** Overdue sessions don't block new uploads but must be resolved before starting today's discrepancies.

**Reconciliation Page - Incomplete Sessions:**
```
+---------------------------------------------------------------------+
| INCOMPLETE SESSIONS (2)                                             |
+---------------------------------------------------------------------+
| [file] skyward-export-2025-12-10.csv                    [Y]         |
| 5 of 7 unresolved • 3 days ago              [71%] [Resume ->]       |
+---------------------------------------------------------------------+
| [file] focus-export-2025-12-08.csv                      [O]         |
| 3 of 3 unresolved • 5 days ago              [0%]  [Resume ->]       |
+---------------------------------------------------------------------+
```

---

## Acceptance Criteria

| AC | Description | Status | Test |
|----|-------------|--------|------|
| 5.10.1 | Incomplete reconciliation sessions appear in Pending Actions card | Pending | Create incomplete session, verify item appears in Pending Actions |
| 5.10.2 | Pending action shows file name, unresolved count, and age | Pending | Verify "5 of 7 unresolved • 3 days ago" format |
| 5.10.3 | Click pending action navigates to reconciliation session | Pending | Click item, verify navigation to correct session |
| 5.10.4 | Only visible to DAEP Admin L1 and L2 roles | Pending | Login as teacher, verify not visible; login as admin, verify visible |
| 5.10.5 | 24-hour notification at 5 AM local time (from settings timezone) | Pending | Trigger cron job, verify notification created |
| 5.10.6 | Reconciliation page shows list of incomplete sessions | Pending | Navigate to /daep/reconciliation, verify list shows |
| 5.10.7 | Sessions past 3 PM marked as "overdue" status | Pending | Create session, wait past 3 PM, verify status |
| 5.10.8 | Same-day color coding: green (<10AM), yellow (10-12), orange (12-3), red (3+) | Pending | Test at different times |
| 5.10.11 | Badge count on Reconciliation nav item | Pending | Verify count shows, green before 10 AM |
| 5.10.12 | Reminders at 5 AM (carryover), 10 AM, 1 PM | Pending | Trigger cron, verify notifications |
| 5.10.9 | Keyboard shortcut "R" jumps to oldest incomplete session | Pending | Press R on dashboard, verify navigation |
| 5.10.10 | Prompt to "Accept All Matches" if user hasn't bulk-accepted | Pending | Session with unaccepted matches shows reminder |

---

## Tasks / Subtasks

### Task 1: Type Definition and Server Actions

- [ ] 1.1 Add `UnresolvedSession` interface to `lib/validation/schemas.ts`
  - id, fileName, uploadDate, unresolvedCount, totalDiscrepancies, status, ageCategory
- [ ] 1.2 Add `SessionAgeCategory` type: 'recent' | 'warning' | 'critical' | 'abandoned'
- [ ] 1.3 Implement `getUnresolvedSessions()` in `reconciliation.ts`
  - Query sessions with status='in_review' OR 'abandoned'
  - Count unresolved discrepancies per session
  - Calculate age category based on upload_date
  - Return only sessions with unresolvedCount > 0
- [ ] 1.4 Implement `getIncompleteSessionsForNotification()` in `reconciliation.ts`
  - Query sessions older than 24 hours still in_review
  - Use service client for cross-tenant cron access
- [ ] 1.5 Add `hasUnacceptedMatches(sessionId)` helper
  - Check if session has matched records not yet bulk-accepted

### Task 2: Pending Actions Integration

- [ ] 2.1 Create pending action type `reconciliation_incomplete`
  - Add to `daep_pending_actions` type enum (if table exists)
  - Or integrate with existing Pending Actions component pattern
- [ ] 2.2 Create `getReconciliationPendingActions()` server action
  - Returns unresolved sessions formatted as pending action items
  - Filter by role: only return for daep_admin_l1, daep_admin_l2
  - Include age category for color coding
- [ ] 2.3 Integrate into Dashboard Pending Actions card
  - Merge reconciliation actions with other pending actions
  - Sort by priority (abandoned > critical > warning > recent)
- [ ] 2.4 Age-based color coding utility
  - `getSessionAgeColor(uploadDate)`: returns 'yellow' | 'orange' | 'red'
  - Yellow: 1-3 days, Orange: 3-7 days, Red: 7+ days

### Task 3: Incomplete Sessions List (Reconciliation Page)

- [ ] 3.1 Create `app/daep/(main)/reconciliation/components/incomplete-sessions.tsx`
  - Card with "Incomplete Sessions" header and count badge
  - List all incomplete sessions with age color indicator
  - Progress ring showing completion percentage
  - "Resume" button per session
- [ ] 3.2 Integrate into reconciliation page
  - Fetch unresolved sessions
  - Render above "Start New Reconciliation" section
- [ ] 3.3 Add "Accept All Matches" reminder banner
  - Show if session has unaccepted matched records
  - "You have X matched records - Accept All Matches to clear them"

### Task 4: Cron Job - 5 AM Daily Reminder (Timezone-Aware)

- [ ] 4.1 Create `app/api/cron/reconciliation-reminder/route.ts`
  - Verify CRON_SECRET header
  - Get tenant timezone from settings (daep_district_settings.timezone)
  - Calculate if it's 5 AM in tenant's timezone
  - Get incomplete sessions > 24 hours old for that tenant
  - Create in-app notification per session
  - Log via `logAuditEvent()` (reconciliation.reminder_sent)
- [ ] 4.2 Add cron configuration to `vercel.json`
  - Schedule: "0 * * * *" (hourly check, filter by timezone internally)
  - Or use Vercel's timezone-aware cron if available

### Task 5: Same-Day Overdue System

- [ ] 5.1 Add 'overdue' to session status enum
- [ ] 5.2 Create `markOverdueSessions()` function
  - Find sessions with status='in_review' uploaded before 3 PM today
  - Run at 3 PM daily (or check in hourly cron)
- [ ] 5.3 Multiple reminders: 5 AM (carryover), 10 AM, 1 PM
  - Cron checks tenant timezone, sends at appropriate local times
- [ ] 5.4 Overdue sessions still resumable but flagged red
- [ ] 5.5 Nav badge count component
  - Show count on "Reconciliation" nav link
  - Green before 10 AM, yellow 10-12, orange 12-3, red after 3 PM

### Task 6: Notification Table (if needed)

- [ ] 6.1 Check if `daep_notifications` table exists
- [ ] 6.2 If not exists, create migration
  - Table with tenant_id, user_id, type, title, message, action_url, read
  - RLS policy using `get_my_tenant_id()`
  - Index on (user_id, read) for unread queries

### Task 7: Quick Wins

- [ ] 7.1 Keyboard shortcut "R" for oldest incomplete session
  - Add useEffect listener on dashboard page
  - Navigate to oldest in_review session on "R" keypress
  - Only active when not in input/textarea
- [ ] 7.2 "Accept All Matches" reminder
  - In session page, show toast/banner if matched records pending
  - "Tip: Use 'Accept All Matches' to quickly clear 67 matched records"

### Task 8: Testing

- [ ] 8.1 Create incomplete reconciliation session (resolve some, leave others pending)
- [ ] 8.2 Verify Pending Actions shows reconciliation items
- [ ] 8.3 Verify role filtering (admin sees, teacher doesn't)
- [ ] 8.4 Verify age-based color coding (yellow/orange/red)
- [ ] 8.5 Verify Resume navigates to correct session
- [ ] 8.6 Verify reconciliation page shows incomplete sessions list
- [ ] 8.7 Test cron endpoint manually (with CRON_SECRET)
- [ ] 8.8 Test session abandonment after 7 days
- [ ] 8.9 Test keyboard shortcut "R"
- [ ] 8.10 TypeScript compilation
- [ ] 8.11 Playwright MCP verification

---

## Dev Notes

### Auth Pattern (per CLAUDE.md)

```typescript
// Standard pattern for server actions
const supabase = await createServerClient();
const tenantId = await getTenantId();
const user = await currentUser();
// RLS handles role-based access at DB level
```

### Role Filtering

Only show reconciliation pending actions to DAEP Admin L1 and L2:
```typescript
const user = await currentUser();
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('user_id', user.id)
  .single();

const allowedRoles = ['daep_admin_l1', 'daep_admin_l2', 'super_admin'];
if (!allowedRoles.includes(profile?.role)) {
  return []; // Don't show to other roles
}
```

### Timezone-Aware Cron

The cron runs hourly but checks each tenant's timezone:
```typescript
// Get tenant timezone from settings
const { data: settings } = await supabase
  .from('daep_district_settings')
  .select('timezone')
  .eq('tenant_id', tenantId)
  .single();

const timezone = settings?.timezone || 'America/Chicago';
const now = new Date();
const localHour = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  hour12: false,
  timeZone: timezone,
}).format(now);

if (parseInt(localHour) === 5) {
  // It's 5 AM in this tenant's timezone - send reminders
}
```

### Age Category Calculation

```typescript
function getSessionAgeCategory(uploadDate: string): SessionAgeCategory {
  const daysSinceUpload = Math.floor(
    (Date.now() - new Date(uploadDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceUpload >= 7) return 'abandoned';
  if (daysSinceUpload >= 3) return 'critical';  // orange
  if (daysSinceUpload >= 1) return 'warning';   // yellow
  return 'recent';                               // no special color
}

function getAgeColor(category: SessionAgeCategory): string {
  const colors = {
    recent: 'text-muted-foreground',
    warning: 'text-yellow-600 bg-yellow-50',
    critical: 'text-orange-600 bg-orange-50',
    abandoned: 'text-red-600 bg-red-50',
  };
  return colors[category];
}
```

### Cron Job Auth

Cron jobs use service client for cross-tenant queries:
```typescript
import { createServiceClient } from '@/lib/supabase/service';
const supabase = createServiceClient();
```

### Audit Logging

Use existing `logAuditEvent()` function (NOT a separate audit table):
```typescript
await logAuditEvent({
  eventType: 'reconciliation.reminder_sent',
  module: 'daep_management',
  actorId: 'system',
  actorEmail: 'system@cron',
  targetId: sessionId,
  action: 'Sent 5 AM daily reminder',
  details: { sessionId, fileName, timezone },
  tenantId,
});
```

### Session Abandonment Details

**What happens when a session is abandoned:**
1. Status changes from `in_review` → `abandoned`
2. Audit event logged with reason
3. Session still visible in Pending Actions (red color)
4. User can click "Resume" to reactivate
5. Reactivation sets status back to `in_review` and logs audit event

**Why 7 days?**
- Gives users a full business week to complete
- Prevents "zombie" sessions from cluttering the system indefinitely
- Abandoned sessions are still recoverable, just flagged

**Abandoned vs Completed:**
- `completed`: All discrepancies resolved
- `abandoned`: User stopped working on it for 7+ days
- Abandoned sessions still have unresolved discrepancies

### Existing Functions to Reference

In `app/actions/daep/reconciliation.ts`:
- `getReconciliationSessions()` (line 255) - pattern for session queries
- `getReconciliationSummary()` (line 1974) - pattern for detailed session data
- `getSessionAuditEvents()` (line 1862) - audit event pattern

---

## Edge Cases

| Case | Handling |
|------|----------|
| Session completed between dashboard load and click | Re-fetch on navigation, show "completed" state |
| User no longer exists | Skip notification, log warning |
| Multiple incomplete sessions | Show all, prioritize by age (oldest/abandoned first) |
| Session abandoned then user clicks Resume | Set status back to 'in_review', log audit event |
| Zero unresolved in session | Don't show in Pending Actions or incomplete list |
| User is not DAEP Admin L1/L2 | Don't show reconciliation pending actions |
| Tenant has no timezone setting | Default to 'America/Chicago' |
| User presses "R" while in input field | Ignore keyboard shortcut |
| Session has matched records not bulk-accepted | Show "Accept All Matches" reminder |
| Cron runs but it's not 5 AM in any tenant timezone | Skip all tenants, no notifications |

---

## Out of Scope

| Item | Reason |
|------|--------|
| Email notifications | No email service configured yet |
| Push notifications | Future enhancement |
| Notification preferences UI | Future story |
| Auto-archive/delete after 30 days | Consider for future cleanup story |
| Sound on notification | Deferred per user request |
| Badge count on nav item | Not requested |

---

## Definition of Done

- [ ] Incomplete reconciliation sessions appear in Pending Actions card
- [ ] Only visible to DAEP Admin L1 and L2 roles
- [ ] Age-based color coding works (yellow/orange/red)
- [ ] Click navigates to correct session
- [ ] Incomplete sessions list on reconciliation page
- [ ] Progress ring shows accurate percentage
- [ ] 5 AM timezone-aware cron creates notifications
- [ ] Sessions marked abandoned after 7 days
- [ ] Abandoned sessions can be resumed
- [ ] Keyboard shortcut "R" works on dashboard
- [ ] "Accept All Matches" reminder shows when applicable
- [ ] Audit events logged for reminders and abandonment
- [ ] TypeScript compiles without errors
- [ ] No console errors
- [ ] Tested with Playwright MCP

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/daep/tech-spec-story-5-10.md` - Technical specification
- `app/actions/daep/reconciliation.ts` - Existing server actions
- `app/daep/(main)/reconciliation/[sessionId]/page.tsx` - Session page pattern
- Dashboard mockup (user-provided screenshot) - Pending Actions card pattern

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### File List

**New Files:**
- `app/daep/(main)/reconciliation/components/incomplete-sessions.tsx` - Incomplete sessions list
- `app/api/cron/reconciliation-reminder/route.ts` - 5 AM daily reminder cron
- `lib/daep/session-age.ts` - Age category calculation utilities

**Modified Files:**
- `app/actions/daep/reconciliation.ts` - Add getUnresolvedSessions, getReconciliationPendingActions, markAbandonedSessions, hasUnacceptedMatches
- `lib/validation/schemas.ts` - Add UnresolvedSession, SessionAgeCategory interfaces
- `app/daep/(main)/dashboard/page.tsx` - Integrate reconciliation items into Pending Actions
- `app/daep/(main)/reconciliation/page.tsx` - Render IncompleteSessions
- `app/daep/(main)/reconciliation/[sessionId]/page.tsx` - Add "Accept All Matches" reminder
- `vercel.json` - Add hourly cron configuration

**Database Migration:**
- Add 'abandoned' to `daep_reconciliation_sessions` status enum
- `create_daep_notifications_table` (if not exists) - Notifications table with RLS

---

## References

- [Source: docs/sprint-artifacts/daep/tech-spec-story-5-10.md] - Technical specification
- [Source: FR62] - Unresolved discrepancy alerts requirement
- [Source: CLAUDE.md] - Auth patterns, RLS guidelines
- [Source: Dashboard mockup] - Pending Actions card design pattern
