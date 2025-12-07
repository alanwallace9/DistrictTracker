# Backlog: Student Attendance Dispute Workflow

**Status:** backlog
**Epic:** TBD (Epic 7 Notifications or new Student Portal epic)
**Points:** 8 (estimate)
**Priority:** Medium - High value for student/parent experience

---

## Story

As a **DAEP student**,
I want **to flag when my Focus (SIS) attendance record is incorrect**,
So that **discrepancies can be resolved and my attendance record is accurate**.

---

## Problem Statement

Focus (the district SIS) is the system of record for attendance. However, substitutes or data entry errors sometimes result in incorrect attendance records. Currently, students/parents have no way to flag these discrepancies, and staff must manually track corrections.

This creates:
- Frustration for students who were present but marked absent
- Extra work for registrars chasing down corrections
- Potential impact on days served calculations

---

## User Workflow

### Student/Parent Flow
1. Student views attendance history on their DAEP portal
2. Sees a date/period where Focus says "Absent" but they were present
3. Clicks "Report Issue" button on that entry
4. Modal asks: "What actually happened?" (I was present, I was tardy, etc.)
5. Optional notes field for context
6. Submit creates a pending dispute

### Registrar/Attendance Clerk Flow
1. Registrar sees notification: "3 Attendance Disputes Pending"
2. Opens `/daep/attendance-disputes` dashboard
3. Sees list of disputes with:
   - Student name
   - Date/Period
   - DAEP record vs Focus record
   - Student's claim
   - Notes
4. For each dispute:
   - **Accept**: Update DAEP record to match student's claim
   - **Reject**: Keep current record, provide reason
   - **Investigate**: Mark for follow-up, contact Focus admin
5. Resolution notifies student and parent

---

## Acceptance Criteria (Draft)

| AC | Description |
|----|-------------|
| 1 | Student portal shows attendance history (read-only) |
| 2 | "Report Issue" button on each attendance entry |
| 3 | Dispute modal captures: claimed status, notes |
| 4 | Dispute saved to `daep_attendance_disputes` table |
| 5 | Registrar dashboard at `/daep/attendance-disputes` |
| 6 | Dashboard shows all pending disputes for tenant |
| 7 | Registrar can Accept/Reject/Investigate each dispute |
| 8 | Accept updates DAEP attendance record |
| 9 | Resolution triggers notification to student |
| 10 | Resolution triggers notification to parent (if email configured) |
| 11 | Audit log records all dispute actions |
| 12 | Dispute history visible on student profile |

---

## Database Schema (Draft)

```sql
CREATE TABLE daep_attendance_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id),
  attendance_id UUID REFERENCES daep_attendance(id),  -- May be null if no DAEP record exists

  -- Dispute details
  date DATE NOT NULL,
  period TEXT NOT NULL,
  claimed_status TEXT NOT NULL,      -- What student says happened (P, T, ED)
  claimed_time TEXT,                  -- If tardy/ED, what time
  notes TEXT,                         -- Student's explanation

  -- Resolution
  status TEXT DEFAULT 'pending',      -- pending, accepted, rejected, investigating
  resolution_notes TEXT,              -- Registrar's notes
  resolved_by TEXT,                   -- User who resolved
  resolved_at TIMESTAMPTZ,

  -- Metadata
  submitted_by TEXT NOT NULL,         -- Student user ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Components Needed

| Component | Description |
|-----------|-------------|
| Student attendance history view | Read-only list on student portal |
| "Report Issue" button | Opens dispute modal |
| `DisputeModal.tsx` | Capture claimed status + notes |
| `/daep/attendance-disputes` page | Registrar dashboard |
| `DisputeCard.tsx` | Single dispute with actions |
| `ResolveDisputeDialog.tsx` | Accept/Reject with notes |
| Notification integration | Epic 7 - notify on resolution |

---

## Dependencies

- Story 3-9: Attendance Entry (base attendance system)
- Epic 7: Notifications (for resolution alerts)
- Student Portal (may need to create if doesn't exist)

---

## Questions to Resolve

1. Does a student portal exist, or do students access via parent portal?
2. Should disputes be time-limited? (e.g., can only dispute within 7 days)
3. Should accepted disputes auto-update Focus, or is that manual?
4. Who receives the "investigating" status notification?

---

## Value Proposition

> "How did they ever do their job without this?"

- **Students**: Feel heard when mistakes happen, have agency in their record
- **Parents**: Transparency into attendance, confidence issues get resolved
- **Registrar**: Centralized queue vs. scattered emails/notes, audit trail
- **Admin**: Visibility into dispute patterns (e.g., specific sub with many disputes)

---

_Backlog Item Created: 2025-12-07_
_Source: Story 3-9 Tech Spec Discussion_
_Author: Claude (AI Assistant)_
