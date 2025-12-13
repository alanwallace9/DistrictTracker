# Tech Spec: Story 5-8 - Reconciliation Audit Trail

**Epic:** 5 - CSV Reconciliation
**Points:** 3
**Status:** Drafted
**FRs:** FR60
**Dependencies:** Story 5-5 (Reconciliation Review Page - Combined)

---

## Key Decisions (Session 2025-12-13)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Audit storage** | Use existing `admin_audit_log` | Filter by `event_type LIKE 'reconciliation.%'` - no new table needed |
| **UI placement** | Expand/collapse per session card | Users audit specific sessions; matches reversion mental model |
| **Reversion** | View-only for 5-8 | Actual revert functionality is future story |
| **Badge update** | Changed Skyward → Focus | Test data now uses Focus SIS |

---

## Purpose

Enable administrators to view complete audit trail of reconciliation decisions per session. Each session card on the reconciliation page expands to show what changes were made, by whom, and the original values (for potential future reversion).

---

## Acceptance Criteria

| AC | Description | Implementation |
|----|-------------|----------------|
| 5.8.1 | Log all reconciliation actions | session_created, mapping_applied, comparison_completed, discrepancy_resolved, session_completed |
| 5.8.2 | Include resolution details | resolution type, note, before/after field values |
| 5.8.3 | Reference session and discrepancy | session_id and discrepancy_id in audit details |
| 5.8.4 | Log to admin_audit_log | module='daep_management', event_type='reconciliation.{action}' |
| 5.8.5 | View session audit history | Expand/collapse on each session card shows filtered events |

---

## UI Component

### Session Card Expansion

**Location:** `app/daep/(main)/reconciliation/components/session-card.tsx`

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📄 test-focus-export.csv  [Focus]   3 Records  0 Matched  ⏱ Ready  │ ▼
├─────────────────────────────────────────────────────────────────────┤
│ Audit History                                               Filter ▼│
│ ─────────────────────────────────────────────────────────────────── │
│ Dec 12, 5:19 PM  Session Created       admin@district.edu           │
│ Dec 12, 5:20 PM  Comparison Done       3 records, 0 matched         │
│ Dec 12, 5:25 PM  Resolved: Bob Johnson accept_sis → Start Date      │
│                  Before: 2024-01-15    After: 2024-02-01            │
│ Dec 12, 5:26 PM  Session Completed     admin@district.edu           │
└─────────────────────────────────────────────────────────────────────┘
```

### Event Display Fields

| Event Type | Display Info |
|------------|--------------|
| session_created | Upload time, filename, user email |
| mapping_applied | SIS name, field count |
| comparison_completed | Total records, matched/conflict/new/missing counts |
| discrepancy_resolved | Student name, resolution type, field changed, before/after values |
| session_completed | Total resolved, duration |

---

## Server Action

### `getSessionAuditEvents(sessionId: string)`

**File:** `app/actions/daep/reconciliation.ts`

```typescript
export async function getSessionAuditEvents(sessionId: string) {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('id, event_type, actor_email, action, details, created_at')
    .eq('tenant_id', tenantId)
    .eq('module', 'daep_management')
    .like('event_type', 'reconciliation.%')
    .eq('details->>sessionId', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Audit] Failed to fetch session events:', error);
    return [];
  }

  return data;
}
```

---

## Integration: Enhance Existing Logging

Update existing `logAuditEvent` calls in `reconciliation.ts` to include before/after values:

### In `resolveDiscrepancy`:
```typescript
await logAuditEvent({
  eventType: 'reconciliation.discrepancy_resolved',
  module: 'daep_management',
  // ... existing fields ...
  details: {
    sessionId,
    discrepancyId,
    studentName: discrepancy.student_name,
    resolution,
    hasNote: !!note,
    // ADD: before/after for each conflict field
    changes: (discrepancy.conflicts || []).map((c: FieldConflict) => ({
      field: c.field,
      fieldLabel: c.fieldLabel,
      before: c.daepValue,
      after: c.sisValue,
    })),
  },
  tenantId,
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/daep/(main)/reconciliation/components/session-card.tsx` | Add expand/collapse, audit history section, event count badge |
| `app/actions/daep/reconciliation.ts` | Add `getSessionAuditEvents()`, `getSessionAuditCount()`, enhance details in existing logging |

---

## Quick Wins (Included)

### 1. GIN Index for JSONB Filtering

Add index for faster `details->>sessionId` queries:

```sql
-- Migration: Add GIN index on admin_audit_log.details
CREATE INDEX IF NOT EXISTS idx_audit_log_details_gin
ON admin_audit_log USING GIN (details);
```

### 2. Audit Event Count Badge

Show event count on collapsed card so users know there's history:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📄 test-focus-export.csv  [Focus]   3 Records  0 Matched  [4 events] ▼
└─────────────────────────────────────────────────────────────────────┘
```

**Server Action:**
```typescript
export async function getSessionAuditCount(sessionId: string): Promise<number> {
  const supabase = await createServerClient();
  const tenantId = await getTenantId();

  const { count, error } = await supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('module', 'daep_management')
    .like('event_type', 'reconciliation.%')
    .eq('details->>sessionId', sessionId);

  if (error) return 0;
  return count || 0;
}
```

---

## Out of Scope (Future Stories)

- **Reversion functionality** - Actually reverting a change (separate story)
- **Date range filter on audit** - Global audit view with filtering (Story 5-9 or Epic 6)
- **Session abandoned detection** - Cron job for incomplete sessions (Story 5-10)

---

## Testing Checklist

- [ ] Session card shows expand/collapse chevron
- [ ] Event count badge shows on collapsed card (e.g., "4 events")
- [ ] Expanded view shows audit events for that session only
- [ ] Events display in chronological order
- [ ] discrepancy_resolved shows before/after values
- [ ] Actor email displayed for each event
- [ ] Collapsed by default, expands on click
- [ ] GIN index migration runs without error
