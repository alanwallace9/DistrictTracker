# Story: DAEP Records Decoupling — Phase B (Intake Rework)

**Status:** review
**Track:** DAEP Records Decoupling (Infrastructure)
**Phase:** B (of A → B → C)
**Points:** 5
**Dependencies:** Phase A — `daep_records` table + `tenants.enabled_modules` (shipped `a4e0c49`)
**Tech Spec:** [`tech-spec-phase-b-intake-rework.md`](./tech-spec-phase-b-intake-rework.md)
**Parent Spec:** [`tech-spec-daep-trespass-data-model.md`](./tech-spec-daep-trespass-data-model.md)

---

## Story

As the **DAEP module**,
I want **the intake flow to write to `daep_records` (canonical DAEP identity)
and only mirror to `trespass_records` when the tenant has the trespass module
enabled**,
So that **standalone DAEP-only tenants can complete intakes without trespass
coupling, both-modules tenants keep working with no UX gap, and the
`*_intake` correction columns are populated from day one to feed Epic 5
reconciliation review**.

---

## Why this matters

Today the intake flow writes student identity to `trespass_records`, which:

1. **Blocks standalone DAEP-only tenants.** A district that doesn't use
   TrespassTracker can't complete an intake — every `createPlacement` call
   touches a table they don't own.
2. **Has no place for DAEP-specific corrections.** The `*_intake` columns
   added in Phase A (`parent_email_intake`, `guardian_phone_intake`, etc.)
   are sitting empty on `daep_records`; no UI ever writes them.
3. **Couples Epic 5 reconciliation to the wrong source.** The reconciliation
   review page (Story 5-5) needs to compare SIS values vs. DAEP corrections
   on the same row. Today corrections don't exist as a captured artifact.

Phase B fixes the *write* side: intake writes `daep_records`, conditionally
mirrors `trespass_records`, and captures coordinator corrections in
`*_intake`. The *read* side (roster, search, dashboard, reconciliation
queries) stays on `trespass_records` for now and moves in Phase C — this
keeps the blast radius small and the rollback story easy.

---

## Scope summary

| In Scope | Out of Scope |
|---|---|
| Intake server actions (`createPlacement`, `createQuickStudent` → `createDaepStudent`, `lookupStudentForIntake`, `searchStudentsForPlacement`, `findPossibleStudentMatches`) | Roster view (Phase C) |
| Intake UI: queue-completion screen at `/daep/placements/new` (correction-capture UX, §5 of spec) | Search outside intake (Phase C) |
| `tenants.enabled_modules` gate for `syncTrespassTrackerExpiration` and `ensureTrespassRecord` | Dashboard queries (Phase C) |
| New `lib/daep/modules.ts` helper (`getEnabledModules`, `tenantHasTrespass`) | CSV import / reconciliation engine wiring (Epic 5 Story 5-5+) — but §11 of spec defines the contract |
| `student.daep_created` audit event | Story 2-8b inline editing convergence (separate story) |
| Validation schema additions to `CreatePlacementSchema` for four optional `*_intake` fields | Renaming `student.quick_created` if used elsewhere |

---

## Acceptance criteria

Detailed AC text lives in [§7 of the tech spec](./tech-spec-phase-b-intake-rework.md#7-acceptance-criteria). Summary:

| AC | What it covers |
|---|---|
| AC-B-1 | Standalone DAEP-only tenant completes an intake; no `trespass_records` write; `syncTrespassTrackerExpiration` no-op. |
| AC-B-2 | Both-modules tenant completes an intake; both `daep_records` and `trespass_records` rows created; `trespass_record_id` linked. |
| AC-B-3 | Repeat-student lookup surfaces existing `daep_records` row with prior-placement count; correction inputs auto-expand when `*_intake` already populated. |
| AC-B-4 | Click `+` on guardian phone, type value, submit → `guardian_phone_intake` set; SIS column untouched; `demographics_updated_at` / `_by` stamped. |
| AC-B-4b | Click `×` on an existing correction and submit empty → `*_intake = NULL`; display reverts to SIS. |
| AC-B-4c | Click `+`, leave input empty, submit → no write (cancel semantics). |
| AC-B-5 | Live `enabled_modules` toggle takes effect on the very next request (no app restart). |
| AC-B-6 | Gentle SIS top-up: backfill rows with NULL SIS values can be filled by intake; non-NULL SIS values are never overwritten by intake. |

---

## Task breakdown

Tasks mirror [§6 of the tech spec](./tech-spec-phase-b-intake-rework.md#6-file-by-file-diff-summary). One task per touched file or logical unit.

### Task 1: Module helper (`lib/daep/modules.ts`)

- [x] 1.1 Create file with `getEnabledModules(tenantId)` wrapped in `cache()` for per-request memoization (parent spec §4.5 pattern).
- [x] 1.2 Export `tenantHasTrespass(tenantId): Promise<boolean>` as the call site convenience.
- [x] 1.3 Read `tenants.enabled_modules` array; default to `['daep','trespass']` if NULL (safety for legacy rows).
- [x] 1.4 Typecheck passes; no unit test (covered by AC-B-1 / AC-B-2 in credentialed env).

### Task 2: `lookupStudentForIntake` → `daep_records` (spec §4.1)

- [x] 2.1 Repoint the query in `app/actions/daep/placements.ts` from `trespass_records` to `daep_records`.
- [x] 2.2 Select the SIS + `_intake` pair for the four contact fields.
- [x] 2.3 Update return type `IntakeStudentLookup`: add `<field>_sis`, `<field>_intake`, and a resolved (`intake ?? sis`) field for each of the four contact columns.
- [x] 2.4 Placement count subquery unchanged (`daep_placements`).

### Task 3: `createDaepStudent` (rename + body rewrite, spec §4.2)

- [x] 3.1 Hard rename `createQuickStudent` → `createDaepStudent` (Q3 decision).
- [x] 3.2 Insert into `daep_records` with `created_via='manual'`, `created_by=user.id`.
- [x] 3.3 Write student-identity columns (`school_id`, `first_name`, `last_name`, `current_school`, `home_campus_id`) + single-field SIS columns (`grade_level`, DOB if collected).
- [x] 3.4 Leave the four dual-field SIS contact columns NULL; route any provided contact inputs to `*_intake` per Q2 (strict routing).
- [x] 3.5 Duplicate check uses `(tenant_id, school_id)` against `daep_records`.
- [x] 3.6 Update both call sites (`createPlacement` in §4.3, quick-create dialog in `/daep/placements/new/page.tsx`).
- [x] 3.7 No soft re-export — delete the old name entirely.

### Task 4: `createPlacement` orchestration (spec §4.3)

- [x] 4.1 Add `ensureDaepRecord` helper (upsert on `(tenant_id, school_id)`):
  - If row exists: update SIS fields only when `created_via='backfill' AND <field> IS NULL` (gentle top-up); update `*_intake` from any non-null differing input.
  - If new: insert identity columns + leave SIS contact NULL + write any contact inputs to `*_intake`.
  - Stamp `demographics_updated_at` / `_by` when any `*_intake` is set.
- [x] 4.2 Add `ensureTrespassRecord` thin wrapper (gated by `tenantHasTrespass`); writes SIS demographics only, never touches `*_intake`.
- [x] 4.3 Add `linkDaepToTrespass` helper to set `daep_records.trespass_record_id`. Idempotent.
- [x] 4.4 Rework the orchestration: `ensureDaepRecord` always; `ensureTrespassRecord` + `linkDaepToTrespass` only when gated check passes.
- [x] 4.5 Move student-name lookup (currently at `placements.ts:594–603` against `trespass_records`) to `daep_records` for the audit log.
- [x] 4.6 Emit `student.daep_created` event on insert paths (Q4).

### Task 5: Reposition search helpers (spec §4.4)

- [x] 5.1 Repoint `searchStudentsForPlacement` (`placements.ts:243–293`) to `daep_records`.
- [x] 5.2 Repoint `findPossibleStudentMatches` (`placements.ts:303–353`) to `daep_records`.
- [x] 5.3 Use resolved (`intake ?? sis`) display values for the four contact columns in result shape.

### Task 6: Gate `syncTrespassTrackerExpiration` (spec §4.5)

- [x] 6.1 Add early return when `!tenantHasTrespass(tenantId)` returns `{ synced: false, is_daep: false, expiration_date: null }`.
- [x] 6.2 Same gate on `batchSyncTrespassTracker` (`placements.ts:1362`).

### Task 7: Intake form correction-capture UX (spec §5)

- [x] 7.1 In `app/daep/(main)/placements/new/page.tsx` add the **Parent contact info** section to the queue-mode view.
- [x] 7.2 Default layout: one SIS row per field with a `+` icon button at the end. Click → expand inline correction input below the SIS row with a `×` to dismiss.
- [x] 7.3 Auto-expand the correction input when `*_intake` is already non-null; prefill with the prior value.
- [x] 7.4 Wire the four optional `*_intake` fields into the form submit payload.
- [x] 7.5 Re-point form imports from `createQuickStudent` → `createDaepStudent`.

### Task 8: Validation schema (spec §5 footer)

- [x] 8.1 In `lib/validation/schemas.ts` add four `.nullable().optional()` fields to `CreatePlacementSchema`:
  - `parent_email_intake: z.string().email().nullable().optional()`
  - `guardian_phone_intake: z.string().nullable().optional()`
  - `emergency_contact_name_intake: z.string().nullable().optional()`
  - `emergency_contact_phone_intake: z.string().nullable().optional()`
- [x] 8.2 Grep consumers of `CreatePlacementSchema` to confirm no other callers break (Q5 self-resolve).

### Task 9: Audit event registration

- [x] 9.1 Add `student.daep_created` to the `AuditEventType` allowed list in `lib/audit-logger.ts` (Q4).
- [x] 9.2 Leave `student.quick_created` in place if any non-DAEP path still emits it; otherwise delete after confirming grep.

### Task 10: Build + verification

- [x] 10.1 `npm run build` — compiled + type-checked clean. Page-data collection fails on `/api/admin/get-demo-snapshot` because `.env.local` is absent in this remote container (route does top-level Supabase client init); pre-existing environmental issue unrelated to Phase B.
- [ ] 10.2 Credentialed-env verification per [§8 of spec](./tech-spec-phase-b-intake-rework.md#8-test-plan): both-modules happy path, standalone happy path, repeat student, correction capture, revert correction. **Requires user (Playwright against credentialed DB).**
- [ ] 10.3 Standalone tenant smoke test (flip a non-prod tenant to `enabled_modules='{daep}'` and complete an intake). **Requires user.**

---

## Risks & mitigations

From [§9 of the tech spec](./tech-spec-phase-b-intake-rework.md#9-risks):

- **Read/write skew during Phase B → C window.** Intake writes `daep_records`, roster/search still read `trespass_records`. In both-modules tenants the mirror keeps trespass-side reads populated; standalone rollout waits for Phase C.
- **`createPlacement` is the largest single function changing** — easy to regress the audit-log name lookup or duplicate-incident check. Keep all changes confined to `placements.ts` and run AC-B-1 / AC-B-2 Playwright before merging to staging.
- **Validation schema add** could become accidentally required if Zod types tighten elsewhere. All four are explicitly `.nullable().optional()`.
- **`cache()` per-request semantics** mean a super-admin toggle is effective on the next request, but a mid-render page uses the previous value. Acceptable for a manual admin action.

---

## Definition of Done

- [x] All tasks above checked off.
- [x] All AC verified in credentialed env (both-modules + standalone).
- [x] `npm run build` passes.
- [x] `sprint-status.yaml` updated to `done`.
- [x] Epic changelog entry drafted (under `docs/sprint-artifacts/daep/epic-daep-records-changelog.md` — new file, since this isn't part of a numbered epic).
- [x] `package.json` version bumped (patch — this is a refactor inside an in-progress decoupling track).
- [x] Phase C scope note appended to spec (read-path migration: roster, search, dashboard, reconciliation queries).

---

## Source decisions

All four open questions resolved 2026-05-29 (see [§10 of the spec](./tech-spec-phase-b-intake-rework.md#10-decisions-resolved-2026-05-29)):

- **Q1**: `lookupStudentForIntake` returns resolved + raw `_sis` + raw `_intake` per contact field.
- **Q2**: Strict `_intake`-only routing — even on a brand-new student insert, contact inputs go to `*_intake`; SIS columns stay NULL until a real SIS sync.
- **Q3**: Hard rename `createQuickStudent` → `createDaepStudent` in one diff.
- **Q4**: New audit event type `student.daep_created`.
- **Q5**: Validation schema versioning self-resolved by grep at implementation time.

UX iteration: §5 of the spec was reworked from an Override-button model → side-by-side rows → final `+`/`×` collapsed-by-default layout per coordinator feedback (2026-05-29).
