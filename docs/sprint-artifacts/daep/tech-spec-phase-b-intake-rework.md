# Tech Spec — Phase B: Intake Rework (DAEP records decoupling)

**Author:** Claude (Opus 4.7)
**Date:** 2026-05-29
**Status:** Draft — needs review
**Parent spec:** [`tech-spec-daep-records-decoupling.md`](./tech-spec-daep-records-decoupling.md)
**Phase A migration (prerequisite):** `supabase/migrations/20260529100000_create_daep_records.sql`

---

## 1. Purpose

After Phase A, the schema supports `daep_records` and `tenants.enabled_modules`, but
nothing reads or writes the new table yet. Phase B rewires **intake** so DAEP
becomes self-sufficient:

- The intake completion path creates/updates a `daep_records` row instead of (or
  alongside) a `trespass_records` row.
- Intake-time demographic corrections (better phone, etc.) write to the parallel
  `*_intake` fields per spec §6.1 — SIS originals are never overwritten.
- Cross-module sync to `trespass_records` (`is_daep`, `daep_expiration_date`)
  becomes gated by a **live** read of `tenants.enabled_modules`.

Phase B does **not** repoint roster/search/dashboard reads — those are Phase C.
After Phase B ships, DAEP-only tenants can complete an intake without any
`trespass_records` write; both-modules tenants get unchanged behavior.

---

## 2. Scope

| In scope | Out of scope |
|---|---|
| `lookupStudentForIntake` reads `daep_records` | Roster / search / dashboard reads (Phase C) |
| `createPlacement` upserts `daep_records`; conditionally upserts `trespass_records` | Reconciliation re-pointing (Phase C) |
| `createQuickStudent` rewritten to write `daep_records` (renamed `createDaepStudent`) | Admin toggle UI on `app/admin/tenants/page.tsx` (Phase E) |
| `searchStudentsForPlacement` + `findPossibleStudentMatches` read `daep_records` (intake-adjacent) | Periodic reconciliation job (Phase E) |
| `syncTrespassTrackerExpiration` gated by `enabled_modules` | Decommissioning DAEP columns on `trespass_records` (Phase D) |
| `*_intake` correction capture UI in `app/daep/(main)/placements/new/page.tsx` | UI for editing corrections outside intake |
| New `lib/daep/modules.ts` helper for live `enabled_modules` reads | Updates to the tenants schema |

---

## 3. New module-presence helper

A small, cached-per-request helper centralizes the live `enabled_modules` read.
Decision points in this phase (and Phase C/E) call this — never inline the column
lookup.

**File:** `lib/daep/modules.ts` (new)

```ts
import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';

export type ModuleKey = 'trespass' | 'daep';

/** Live per-request read of tenants.enabled_modules. Cached within one request. */
export const getEnabledModules = cache(
  async (tenantId: string): Promise<Set<ModuleKey>> => {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from('tenants')
      .select('enabled_modules')
      .eq('id', tenantId)
      .maybeSingle();
    const list = (data?.enabled_modules as string[] | null) ?? ['trespass', 'daep'];
    return new Set(list.filter((m): m is ModuleKey => m === 'trespass' || m === 'daep'));
  }
);

export async function tenantHasTrespass(tenantId: string): Promise<boolean> {
  return (await getEnabledModules(tenantId)).has('trespass');
}
```

- React's `cache()` gives us per-request memoization without a global TTL, so a
  super-admin toggle takes effect on the **next request** with no stale window.
- Falls back to `{'trespass','daep'}` if the row is missing (matches the column
  default seeded in Phase A; safe for existing tenants).

---

## 4. Server-action changes

All files below live at `app/actions/daep/`. Line numbers reference HEAD as of
commit `a4e0c49`.

### 4.1 `placements.ts` — `lookupStudentForIntake` (lines 196–241)

**Change:** read from `daep_records` (with `*_intake` preferred for display
fields). The existing student lookup logic stays identical otherwise.

```ts
const { data: student } = await supabase
  .from('daep_records')
  .select(`
    first_name,
    last_name,
    grade_level,
    current_school,
    parent_email,        parent_email_intake,
    guardian_phone,      guardian_phone_intake,
    emergency_contact_name,  emergency_contact_name_intake,
    emergency_contact_phone, emergency_contact_phone_intake
  `)
  .eq('tenant_id', tenantId)
  .eq('school_id', id)
  .maybeSingle();
```

The placement count subquery on `daep_placements` is unchanged.

The returned shape adds the resolved (COALESCE'd) contact fields so the intake
form can show the coordinator what's currently on file when checking for a repeat
student. Concretely, `IntakeStudentLookup` gains:

```ts
parent_email: string | null;
guardian_phone: string | null;
emergency_contact_name: string | null;
emergency_contact_phone: string | null;
```

Each is computed `intake ?? sis` server-side. *(Decided: yes, return resolved
fields — Q1 resolved 2026-05-29.)*

### 4.2 `placements.ts` — `createQuickStudent` (lines 699–801)

**Hard rename to `createDaepStudent`** *(Q3 resolved: hard rename, no soft
re-export)*. Writes a `daep_records` row (canonical DAEP identity). The
trespass-record write is removed from this function entirely.

Key differences from the current `createQuickStudent`:
- Inserts into `daep_records` with `created_via = 'manual'`, `created_by = user.id`.
- **Student-identity columns** — `school_id` (the PEIMS Student ID, also the
  row key with `tenant_id`), `first_name`, `last_name`, and the campus
  (`current_school` text + `home_campus_id` FK) — are written from the
  coordinator's intake inputs (or queue-prefilled values). These are
  single-field SIS-authoritative columns, not in the dual-field scope.
- **Other single-field SIS columns** — `grade_level`, DOB, etc. — are written
  the same way.
- **Dual-field contact columns** (`parent_email`, `guardian_phone`,
  `emergency_contact_name`, `emergency_contact_phone`) are left NULL on insert
  *(Q2 resolved: always `_intake` on intake-time entry; SIS columns are
  populated only by a real SIS sync)*. If contact-info inputs are present, they
  are written to the corresponding `*_intake` fields with
  `demographics_updated_at` / `_by` stamped.
- **Incident number** lives on `daep_placements`, not `daep_records`, so
  `createDaepStudent` doesn't touch it — `createPlacement` (§4.3) writes it
  when it inserts the placement row.
- No `expiration_date`, no `is_daep` flag, no `user_id` — DAEP doesn't need those.
- Duplicate check is `(tenant_id, school_id)` against `daep_records`, not
  `trespass_records`.
- Audit event payload becomes `student.daep_created` *(Q4 resolved: new
  AuditEventType, added to `lib/audit-logger.ts`)*.

The callers of `createQuickStudent` today are updated to call
`createDaepStudent`:
- `app/actions/daep/placements.ts` — `createPlacement` (we change this in §4.3)
- `app/daep/(main)/placements/new/page.tsx` — quick-create dialog (UI keeps the
  same dialog; we just point it at the renamed action)

### 4.3 `placements.ts` — `createPlacement` (lines 506–671)

The orchestration becomes:

```
validatePlacement(...)                            // unchanged

// (a) Ensure daep_records exists, capture corrections if provided
ensureDaepRecord({
  tenant_id, school_id, first_name, last_name,
  grade_level, current_school, home_campus_id,
  // additive corrections from intake form (may all be null):
  parent_email_intake, guardian_phone_intake,
  emergency_contact_name_intake, emergency_contact_phone_intake,
});

// (b) Insert daep_placements                     // unchanged shape
// (c) Cross-module sync, gated:
if (await tenantHasTrespass(tenantId)) {
  await ensureTrespassRecord(...);                // mirror SIS demographics only
  await syncTrespassTrackerExpiration(...);       // existing function, unchanged
  await linkDaepToTrespass(daepRecordId, trespassRecordId);
}

// (d) audit log + revalidatePath                 // unchanged
```

Where:

- **`ensureDaepRecord`** is a new helper in `placements.ts` (or
  `lib/daep/records.ts` if we want it reusable). It upserts on
  `(tenant_id, school_id)`:
  - If the row exists: update SIS fields **only if the row was created via
    `'backfill'` and the SIS field is NULL** (gentle SIS top-up of legacy data
    — never overwrites a present SIS value); update `*_intake` fields whenever
    the corresponding input is non-null and differs.
  - If new (no prior `daep_records`): insert student-identity columns
    (`school_id`, `first_name`, `last_name`, `current_school`,
    `home_campus_id`) plus other single-field SIS columns (`grade_level`,
    DOB) from the intake inputs; **leave the four dual-field contact
    columns NULL** *(Q2 resolved)*; write any provided contact inputs to
    `*_intake`. (Incident number is on `daep_placements` and is set by
    `createPlacement`, not here.)
  - Stamp `demographics_updated_at = now()`, `demographics_updated_by = user.id`
    when any `*_intake` is set.

- **`ensureTrespassRecord`** is a thin wrapper (gated path only) that does what
  today's `createQuickStudent` did — create a `trespass_records` row when one
  doesn't exist. Importantly: it writes SIS demographics only; intake
  corrections never flow here (per spec §6.1).

- **`linkDaepToTrespass`** sets `daep_records.trespass_record_id`. Idempotent.

The current behavior of `createPlacement` looking up `trespass_records` for the
student name in the audit log (lines 594–603) moves to looking up `daep_records`.

### 4.4 `placements.ts` — `searchStudentsForPlacement` (lines 243–293) and `findPossibleStudentMatches` (lines 303–353)

Both repoint to `daep_records`. These are intake-adjacent (the quick-create
duplicate guard and the queue-mode lookup), and leaving them on `trespass_records`
would break standalone tenants the moment the queue mode references an unknown
student. The query shape is identical aside from the table name and the
demographic-column COALESCE for display purposes.

### 4.5 `placements.ts` — `syncTrespassTrackerExpiration` (lines 1279–1349)

Gate the entry: return a no-op result if the tenant doesn't have the trespass
module.

```ts
if (!(await tenantHasTrespass(tenantId))) {
  return { synced: false, is_daep: false, expiration_date: null };
}
```

Call sites (all in the same file) — `createPlacement` line 636,
`recalculatePlacementDays` line 899, `transitionPlacement` line 1130,
`updatePlacement` line 1727 — don't need changes; the gate lives inside the
function.

`batchSyncTrespassTracker` (line 1362) also short-circuits via the same gate
when called.

### 4.6 `intake-queue.ts`

`promoteIntakeQueueEntry` (lines 424–462) is unchanged — it links queue rows to
placements and doesn't touch student tables. `importApprovedList` is also
unchanged — it writes to `daep_intake_queue`, not student tables.

---

## 5. Intake form — correction capture UX

**File:** `app/daep/(main)/placements/new/page.tsx`

Today the queue-mode prefill (lines 158–202) populates name/grade/home campus
from the queue entry. The repeat-student lookup (lines 184–202) already fetches
the existing student from `lookupStudentForIntake`.

Add an **"Update parent contact info"** disclosure section to the queue-mode
view, shown after the existing-student / new-student branch resolves:

```
┌─ Contact info on file ────────────────────────────────────────────┐
│ Parent email          alanw@example.com    [ Override ]           │
│ Guardian phone        (817) 555-0100        [ Override ]          │
│ Emergency contact     Jane Doe / (817)…     [ Override ]          │
│                                                                   │
│ ℹ Corrections are saved to the DAEP record and used for           │
│   notifications. The official SIS values stay unchanged.          │
└───────────────────────────────────────────────────────────────────┘
```

- For **existing students**, "on file" shows the resolved value
  (`intake ?? sis`) returned by §4.1.
- For **new students**, there are no "on file" baselines — the fields are blank
  inputs (no Override button needed, since there's nothing to override). Any
  value entered is written to the corresponding `*_intake` field per Q2; the
  SIS columns stay NULL. *(Decided: always `_intake` on intake-time entry —
  Q2 resolved 2026-05-29.)*
- Clicking **Override** (existing-student case) turns the field editable; the
  entered value is sent as the corresponding `*_intake` on submit. Hitting
  Override on a blank-on-file field still writes `*_intake` (so we capture the
  new info as a correction, preserving the empty SIS state).
- Optional: a small "edited" badge after submit, but not required for Phase B.

The submit handler adds the four optional `*_intake` strings (or nulls) to the
`createPlacement` input.

**Validation schema update** — `lib/validation/schemas.ts` `CreatePlacementSchema`
gains four optional `string().email()` / `string()` fields:

```ts
parent_email_intake: z.string().email().nullable().optional(),
guardian_phone_intake: z.string().nullable().optional(),
emergency_contact_name_intake: z.string().nullable().optional(),
emergency_contact_phone_intake: z.string().nullable().optional(),
```

---

## 6. File-by-file diff summary

| File | Change |
|---|---|
| `lib/daep/modules.ts` | **NEW.** `getEnabledModules`, `tenantHasTrespass`. |
| `app/actions/daep/placements.ts` | Re-point `lookupStudentForIntake`, `searchStudentsForPlacement`, `findPossibleStudentMatches` to `daep_records`. Replace `createQuickStudent` body with `daep_records` insert (rename to `createDaepStudent`). Rework `createPlacement` orchestration per §4.3. Gate `syncTrespassTrackerExpiration` per §4.5. Update student-name lookup at line 594 to query `daep_records`. |
| `app/daep/(main)/placements/new/page.tsx` | Add correction-capture disclosure (§5). Update imports for renamed action. Send the four `*_intake` fields in submit. |
| `lib/validation/schemas.ts` | Add four optional `*_intake` fields to `CreatePlacementSchema`. |
| `lib/audit-logger.ts` | Add `student.daep_created` (replaces `student.quick_created` for DAEP path; keep the old event type for the unrelated trespass quick-create path if any). |
| `app/actions/daep/intake-queue.ts` | No changes. |

Out of the ~61 references to `trespass_records` in DAEP server actions, Phase B
touches roughly 8 in `placements.ts` plus the form. The remaining ~53 (roster,
search outside intake, dashboard, reconciliation) are Phase C.

---

## 7. Acceptance criteria

**AC-B-1: Standalone DAEP-only tenant — complete an intake.**
Given a tenant with `enabled_modules = {'daep'}`, when a coordinator completes a
queued intake for a brand-new student, then a `daep_records` row is created, a
`daep_placements` row is created, **no** `trespass_records` row is created, and
`syncTrespassTrackerExpiration` is a no-op.

**AC-B-2: Both-modules tenant — complete an intake for a new student.**
Given a tenant with `enabled_modules = {'trespass','daep'}`, the same flow
creates a `daep_records` row, a `trespass_records` row (with SIS demographics
only), a `daep_placements` row, and `daep_records.trespass_record_id` is set;
`syncTrespassTrackerExpiration` updates the trespass row's `is_daep` and
`daep_expiration_date`.

**AC-B-3: Repeat student detection.**
Given an existing `daep_records` row for `(tenant_id, school_id)`, when the
coordinator types that Student ID in the queue completion screen, then the
existing student card surfaces with prior-placement count and resolved contact
info (`intake ?? sis`).

**AC-B-4: Intake-time correction.**
Given a coordinator clicks "Override" on guardian phone (existing student) or
fills the guardian phone field at first intake (new student), then
`daep_records.guardian_phone_intake` is set to the entered value,
`daep_records.guardian_phone` (SIS) is unchanged (or NULL for the new-student
case), and `daep_records.demographics_updated_at` / `_by` are stamped. In a
both-modules tenant, `trespass_records.guardian_phone` is also unchanged.
*(Confirms parent spec §10 Q2a — no push-through to trespass; confirms Phase
B Q2 — `_intake` is the destination even at create.)*

**AC-B-5: Live module toggle.**
Given a super-admin removes `'trespass'` from `tenants.enabled_modules` for
tenant T, then the **very next** `createPlacement` for tenant T skips trespass
writes (no need to restart the app; `cache()` is per-request).

**AC-B-6: Gentle SIS top-up on intake.**
Given a `daep_records` row exists from Phase A backfill with a NULL
`guardian_phone`, when intake provides a SIS-sourced guardian phone (not a
correction), then `daep_records.guardian_phone` is filled. If the field was
already non-NULL, intake never overwrites it (corrections go to `_intake`).

---

## 8. Test plan

Local (this container): **typecheck + build only.** Intake flows can't be
exercised without a DB.

Credentialed env (you):

1. **Both-modules tenant happy path.** Use Playwright MCP to drive
   `/daep/intake-queue` → import a 1-row CSV → schedule → complete via
   `/daep/placements/new?queueId=...`. Verify rows in `daep_records`,
   `trespass_records`, `daep_placements`, `daep_records.trespass_record_id` set.
2. **Standalone tenant.** Pre-flip a non-prod tenant to
   `enabled_modules = '{daep}'`. Repeat (1). Verify **no** `trespass_records`
   row, `syncTrespassTrackerExpiration` no-op.
3. **Repeat student.** Complete a second placement for the same `school_id` in a
   standalone tenant. Verify the queue completion screen shows "prior placements:
   1" and the resolved contact info.
4. **Correction capture.** Click Override on guardian phone, enter a new value,
   submit. Verify `daep_records.guardian_phone_intake` set, SIS field unchanged,
   `demographics_updated_at` stamped.
5. **Live toggle.** With the super-admin tenants page (or a temporary SQL
   update), flip `enabled_modules` from `{trespass,daep}` to `{daep}` on a test
   tenant. Without redeploying, run another intake. Verify trespass writes are
   skipped.
6. **Regression — TrespassTracker UI.** In a both-modules tenant, complete an
   intake; verify the trespass record's `is_daep` badge appears in
   TrespassTracker as before.

---

## 9. Risks

- **Read/write skew during Phase B → C window.** After Phase B, intake writes
  `daep_records` but roster/search still read `trespass_records` (Phase C).
  Standalone-tenant rollout must wait for Phase C. In both-modules tenants,
  the existing `ensureTrespassRecord` mirror keeps the trespass-side reads
  populated, so there's no UX gap.
- **`createPlacement` orchestration is the biggest single function changing.**
  Easy to introduce a regression in the "student name for audit log" subselect
  or the duplicate-incident check. Mitigation: keep all changes confined to
  `placements.ts`; explicit AC-B-1 / AC-B-2 Playwright runs before Phase C.
- **Validation schema add** could break the existing intake-queue submit form
  if any field becomes accidentally required. Mitigation: all four are
  `.nullable().optional()`.
- **`cache()` per-request semantics** mean a super-admin toggle is effective on
  the next request, but a hot page already mid-render uses the previous value.
  That's acceptable for a manually-driven admin action.

---

## 10. Decisions (resolved 2026-05-29)

| # | Question | Decision |
|---|---|---|
| Q1 | Resolve contact fields in `IntakeStudentLookup`? | **Yes** — return `intake ?? sis` for parent_email, guardian_phone, emergency_contact_name/phone. |
| Q2 | New-student intake-time contact entries — SIS or `_intake`? | **Always `_intake`.** SIS contact columns stay NULL until a real SIS sync. The strict invariant "SIS field = SIS-sourced only" applies on creation too. Scope is the four dual-field contact columns only (`parent_email`, `guardian_phone`, `emergency_contact_name`, `emergency_contact_phone`). Student-identity columns (`school_id`, name, campus) and other single-field columns (`grade_level`, DOB) are written normally from intake inputs; incident number lives on `daep_placements`. |
| Q3 | Rename `createQuickStudent` → `createDaepStudent`? | **Hard rename.** Update both call sites in one diff; no soft re-export. |
| Q4 | Audit event for the DAEP-record-creation path? | **Add `student.daep_created`** as a new `AuditEventType` in `lib/audit-logger.ts`. |
| Q5 | Validation schema versioning concerns? | Self-resolve via `grep` over consumers of `CreatePlacementSchema` before changing it. |

---

## 11. Effort estimate

- **Story points:** 5
- **Tasks:** 6 (helper + 4 server actions + 1 UI)
- **New files:** 1 (`lib/daep/modules.ts`)
- **Modified files:** 4 (`placements.ts`, intake form, validation, audit-logger)
- **Verification:** ~30 min in credentialed env across two tenant configs.
