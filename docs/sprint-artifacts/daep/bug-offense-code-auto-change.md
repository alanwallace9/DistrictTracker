# Bug Report: Offense Code Auto-Changing

**Date Reported:** 2025-11-30
**Reported By:** Alan (PO)
**Severity:** Medium
**Status:** To Investigate

---

## Description

Offense code on a placement record changed from code 21 to code 22 overnight without user action.

## Observed Behavior

- **Before:** offense_code = 21 (Violation Code of Conduct)
- **After:** offense_code = 22 (different code)
- **Timeframe:** Overnight (no user activity)

## Expected Behavior

Offense code should only change when explicitly updated by a user. It is a static reference to the discipline_codes table.

## Investigation Steps

1. Check for database triggers on daep_placements table
2. Check for scheduled jobs/cron that might update placements
3. Review audit_logs for any update events on this placement
4. Check if there's frontend code that auto-saves on load
5. Verify the discipline_codes table hasn't been modified

## Queries to Run

```sql
-- Check audit logs for placement updates
SELECT * FROM audit_logs
WHERE table_name = 'daep_placements'
AND event_type LIKE '%update%'
ORDER BY created_at DESC
LIMIT 20;

-- Check if there are any triggers on the table
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'daep_placements';
```

## Related

- Table: `daep_placements.offense_code`
- FK to: `discipline_codes` (or similar)
- Story: 2-8b (inline editing will allow manual correction)

---

## Resolution

*To be filled after investigation*
