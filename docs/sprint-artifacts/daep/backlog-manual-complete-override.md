# Backlog Item: Manual Complete Override

**Type:** Enhancement
**Priority:** Medium
**Epic:** 2 - Placement Management
**Source:** Story 2-12 Course Correction (2025-11-30)

---

## Description

Add a "Manual Complete Override" action that allows DAEP administrators to immediately mark a placement as complete without going through the standard transition workflow (met -> initiate transition -> complete transition).

## Business Context

Currently, the standard workflow requires:
1. Mark Requirements Met (when days are served)
2. Initiate Transition (schedule meeting with home campus)
3. Complete Transition (confirm meeting occurred, first day back)

However, there are edge cases where an administrator needs to close a placement immediately:
- Administrative corrections
- Student transfers mid-placement
- Unusual circumstances that don't fit the standard flow

## Proposed Solution

Add a "Manual Complete Override" button visible only to authorized administrators (e.g., `daep_admin` role) that:
1. Requires confirmation (AlertDialog pattern)
2. Requires a detailed reason (min 10 chars)
3. Sets `status = 'complete'` immediately
4. Preserves `days_remaining` for record keeping
5. Logs to audit trail with `placement.manual_complete` event type
6. Syncs TrespassTracker expiration

## Acceptance Criteria

| AC# | Criteria |
|-----|----------|
| 1 | Manual Complete button visible on edit form for authorized users only |
| 2 | Confirmation dialog requires reason (min 10 characters) |
| 3 | Placement status set to 'complete' immediately |
| 4 | Days remaining preserved in placement record |
| 5 | Action logged to audit trail with full details |
| 6 | TrespassTracker sync called on completion |

## Technical Notes

- Add `placement.manual_complete` to AuditEventType
- Create `ManualCompleteOverrideSchema` in `lib/validation/schemas.ts`
- Create `manualCompleteOverride()` server action
- Create `ManualCompleteDialog.tsx` component (AlertDialog pattern)
- Add role check for visibility (`daep_admin` or similar)

## Dependencies

- Story 2-8 (Edit Placement) - provides edit form integration point
- Story 2-13 (TrespassTracker Sync) - provides sync function

## Story Points Estimate

2-3 points

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2025-11-30 | Amelia (Dev) | Backlog item created from Story 2-12 course correction |
