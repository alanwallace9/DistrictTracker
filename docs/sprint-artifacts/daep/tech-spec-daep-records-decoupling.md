# Tech Spec: DAEP Records Decoupling (Standalone DAEP Student Store)

**Date:** 2026-05-29
**Author:** Dev (with Alan)
**Status:** DRAFT — awaiting executive-plan approval
**Related:** `architecture-notes-daep-vs-trespass.md` (2025-11-30), Phase 1 intake commit `a5500fb`

---

## 1. Problem & Motivation

The DAEP module has **no student-record table of its own**. Student identity for
DAEP lives entirely in the shared `trespass_records` table (with DAEP fields bolted
on: `is_daep`, `daep_expiration_date`, `grade_level`, `parent_email`,
`special_education`, `plan_504`, `ell_status`). Every DAEP feature reads/writes
`trespass_records`.

**Consequence:** DAEP cannot function for a district that does **not** use
TrespassTracker. The modules are coupled at the data layer.

**Desired state (Alan, 2026-05-29):** DAEP owns its student records and runs
**standalone**. When a district *also* uses TrespassTracker, intake **creates a DAEP
record and then links/syncs it to the trespass record** — the two modules work
together but neither requires the other.

This is consistent with the 2025-11-30 architecture note, which already named the
**"DAEP Student Record" as the primary identity** — that note simply implemented it
on the shared table. This spec makes the DAEP Student Record a real table.

---

## 2. Goals / Non-Goals

### Goals
- A DAEP-owned student store: `daep_records`, keyed by `(tenant_id, school_id)`.
- DAEP module works with **zero** dependence on `trespass_records` (standalone).
- When both modules are present, DAEP intake **links + syncs** to `trespass_records`
  (DAEP is the source of truth for DAEP status; TrespassTracker mirrors `is_daep` /
  expiration for its own displays).
- Backfill existing DAEP students from `trespass_records` into `daep_records`.
- Rework the Phase 1 intake/queue flow (commit `a5500fb`) onto `daep_records`.

### Non-Goals (this effort)
- No change to TrespassTracker's own UI/behavior.
- No removal of the bolted-on DAEP columns from `trespass_records` yet (kept for
  back-compat/sync; decommission is a later cleanup story).
- No change to `daep_placements` schema (it already keys on `(tenant_id, school_id)`).

---

## 3. Current State (verified)

| Fact | Evidence |
|------|----------|
| No `daep_records` table/view/type exists | exhaustive grep; `lib/supabase.ts` types |
| DAEP identity stored in `trespass_records` | `createQuickStudent`, `getDaepStudents` (`students.ts:253`) |
| DAEP tables reference students by **soft** `(tenant_id, school_id)` text — **no FK** | `create_daep_schema.sql:159,194`; `idx_daep_placements_student` |
| `trespass_records` carries DAEP fields | `lib/supabase.ts:35-44` |
| Module access is **per-user** (`module_access`), no tenant-level flag | `user_profiles.module_access`; `app/modules/page.tsx:78` |
| DAEP roster is placement-driven (placements → demographics join) | `students.ts:249-257` |
| DAEP `trespass_records` references span **8 files (~61 refs)** | `placements.ts`(15), `behavior-notes.ts`(15), `students.ts`(10), `reconciliation.ts`(6), `rooms.ts`(6), `rollover.ts`(5), `roster.ts`(2), `dashboard.ts`(2) |

**Implication of the no-FK finding:** all DAEP tables resolve students by
`(tenant_id, school_id)`. Pointing those resolutions at `daep_records` instead of
`trespass_records` requires **no schema/FK migration on the placement-side tables** —
only query changes.

---

## 4. Proposed Data Model

### 4.1 `daep_records` (new)

```sql
CREATE TABLE IF NOT EXISTS daep_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     text NOT NULL,
  school_id     text NOT NULL,                    -- District Student ID
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  grade_level   int,
  home_campus_id text,                            -- composite FK -> campuses(tenant_id, id)
  current_school text,
  date_of_birth date,
  -- SIS-sourced demographics (authoritative; NEVER overwritten by intake)
  parent_email             text,
  guardian_phone           text,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  special_education boolean NOT NULL DEFAULT false,
  plan_504          boolean NOT NULL DEFAULT false,
  ell_status        boolean NOT NULL DEFAULT false,
  -- Intake-captured corrections (additive; preferred for display when present).
  -- See §6.1 "Additive demographics". SIS originals above are preserved.
  parent_email_intake            text,
  guardian_phone_intake          text,
  emergency_contact_name_intake  text,
  emergency_contact_phone_intake text,
  demographics_updated_at        timestamptz,
  demographics_updated_by        text,                  -- Clerk user id
  -- lifecycle
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  -- cross-module link (NULL when trespass module not in use)
  trespass_record_id uuid REFERENCES trespass_records(id) ON DELETE SET NULL,
  -- audit
  created_via   text NOT NULL DEFAULT 'manual',
  created_by    text,                             -- Clerk user id
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, school_id),
  FOREIGN KEY (tenant_id, home_campus_id) REFERENCES campuses(tenant_id, id)
);
```

- **RLS:** role-based, using `get_my_tenant_id()` and `get_my_role_from_db()`, mirroring
  `daep_placements` / `daep_attendance` (per CLAUDE.md + `dec-12-rls-update.md`). DAEP
  roles (`daep_admin_l1/l2`, `daep_staff`, `super_admin`, `district_admin`) read; write
  limited to admin roles. Tenant isolation on every policy.
- **Indexes:** `(tenant_id, school_id)` unique already; add `(tenant_id, status)` for roster.

### 4.2 Relationship to existing tables

```
daep_records (tenant_id, school_id)  ← resolved by →  daep_placements, daep_attendance,
                                                       daep_behavior_notes, daep_daily_points,
                                                       daep_student_separations, ...
        │
        │ trespass_record_id (nullable)
        ▼
trespass_records (id)   ← only when district uses TrespassTracker
```

`daep_placements` etc. are **unchanged**; they keep keying on `(tenant_id, school_id)`.

---

## 5. Module-Presence Detection (DECIDED: Option A + dynamic)

**Decision (Alan, 2026-05-29): Option A — tenant-level flag**, because modules can be
added/removed throughout the contract.

- **Schema:** `tenants.enabled_modules text[]` (e.g., `{'daep','trespass'}`).
  Seed during migration from aggregated user `module_access` per tenant.
- **Admin UI:** a per-tenant module toggle on the **master/super-admin tenants page**
  (`app/admin/tenants/page.tsx`), writable only by `super_admin`.
- **Runtime + cadence (DECIDED: "Both"):**
  1. **Live read** of `enabled_modules` at every decision point (intake, placement
     lifecycle sync) — never assume a fixed state.
  2. **On-toggle reconcile** when a module is switched in the admin UI (trespass ON ⇒
     backfill/link existing `daep_records` to `trespass_records`; OFF ⇒ stop trespass
     writes, DAEP continues standalone).
  3. **Periodic safety-net job** re-reconciles links per tenant on a cadence (catches
     anything missed by the toggle path).

---

## 6. Integration / Sync Behavior (when both modules present)

**DAEP is the source of truth for DAEP status.** On DAEP intake / placement lifecycle:

1. Upsert `daep_records` (create or reuse by `(tenant_id, school_id)`).
2. If tenant has trespass module (live `enabled_modules` check):
   - Upsert/find the `trespass_records` row by `(tenant_id, school_id)`.
   - Set `daep_records.trespass_record_id`.
   - Sync DAEP status onto the trespass record: `is_daep`, `daep_expiration_date`
     (this is today's `syncTrespassTrackerExpiration`, repurposed as DAEP→trespass).
3. If tenant does **not** have trespass module: skip all trespass writes.

### 6.1 Additive demographics (DECIDED: Option A "with a twist")

DAEP is authoritative for the DAEP context, **but intake never overwrites SIS-sourced
demographics.** Corrections captured at intake (e.g., a parent gives a better phone
number) are written to the **parallel `*_intake` fields**, leaving the SIS originals
intact.

- **Write:** intake/edit sets `parent_email_intake`, `guardian_phone_intake`,
  `emergency_contact_*_intake` (+ `demographics_updated_at/by`). SIS fields untouched.
- **Display (helper):** prefer `*_intake` when present, else the SIS value
  (`COALESCE(guardian_phone_intake, guardian_phone)`), so screens show the freshest
  contact info while preserving the official record.
- **Both modules:** the SIS value continues to live in `trespass_records` too (unchanged);
  we do **not** push intake corrections back into `trespass_records` (it owns SIS data).
  *(Confirm: see §10 Q2a.)*
- **Standalone:** `daep_records` holds both the SIS-imported value and the `*_intake`
  override.
- **Scope:** applies to contact fields (parent email, guardian phone, emergency contact
  name/phone). Name / grade / DOB / program flags remain single SIS-authoritative fields
  (correctable in place). *(Confirm field set: §10 Q2b.)*

---

## 7. Migration / Backfill

1. Create `daep_records` + RLS + indexes.
2. Backfill: for every distinct `(tenant_id, school_id)` that has a `daep_placements`
   row **or** `trespass_records.is_daep = true`, insert a `daep_records` row copying
   the SIS demographic fields from `trespass_records`, and set `trespass_record_id`.
   The `*_intake` correction fields start NULL (no intake corrections exist yet).
3. Add `tenants.enabled_modules text[]`; seed per tenant from aggregated user
   `module_access` (`both`→`{daep,trespass}`, `daep_only`→`{daep}`, etc.).

Backfill is idempotent (`ON CONFLICT (tenant_id, school_id) DO NOTHING`).

---

## 8. Affected Code & Phased Rollout

| Phase | Scope | Risk |
|-------|-------|------|
| **A — Schema** | `daep_records` table (+ `*_intake` fields), RLS, indexes, backfill migration; `tenants.enabled_modules` + seed | Low (additive) |
| **B — Intake rework** | Rework commit `a5500fb`/`72479b0`: `createPlacement`/intake create `daep_records`; intake corrections → `*_intake` fields; `lookupStudentForIntake` reads `daep_records`; DAEP→trespass sync gated by live `enabled_modules` | Medium |
| **C — Reads migration** | Point roster/search/dashboard off `daep_records`: `students.ts`, `placements.ts` (search, getDaepStudents path), `dashboard.ts`, `roster.ts`, `rooms.ts`, `behavior-notes.ts`, `rollover.ts`; reconciliation resolves against `daep_records` (Q4) | High (8 files, ~61 refs) |
| **E — Admin toggle + periodic job** | Module toggle UI on `app/admin/tenants/page.tsx` (super_admin); on-toggle reconcile; periodic safety-net reconciliation job | Medium |
| **D — Sync hardening / cleanup** | DAEP→trespass one-way sync finalized; optionally decommission DAEP columns on `trespass_records` (separate story) | Medium |

Each phase is independently shippable; DAEP keeps working throughout (dual-source until
Phase C completes).

---

## 9. Testing & Verification

- **Cannot verify in this container** (no `.env.local`, no DB, no Playwright). Each phase
  needs verification in a credentialed env: migration apply, backfill row counts, RLS
  policy checks, and Playwright runs of intake (standalone tenant + both-modules tenant).
- Regression focus: roster counts, student search, reconciliation (matches placements to
  `trespass_records.incident_number` today — must be re-pointed carefully).

---

## 10. Decisions & Remaining Confirmations

**Resolved (Alan, 2026-05-29):**
1. **Module detection (§5):** Option A — `tenants.enabled_modules`, toggled on the
   super-admin tenants page. Handling = **Both** (live reads + on-toggle reconcile +
   periodic safety-net job).
2. **Shared demographics (§6.1):** Option A **additive** — DAEP authoritative, but
   intake corrections go to parallel `*_intake` fields; SIS originals never overwritten;
   display prefers the correction.
3. **Reconciliation (§7/§8C):** resolves against the new `daep_records`.

**Need confirmation before/within the relevant phase:**
- **Q2a (Phase B):** When both modules are present, do we keep intake corrections only in
  `daep_records.*_intake` (recommended — trespass keeps SIS), or also surface them in
  TrespassTracker?
- **Q2b (Phase B):** Confirm the field set that gets `*_intake` corrections (proposed:
  parent email, guardian phone, emergency contact name/phone). Name/grade/DOB stay
  single SIS-authoritative fields — OK?
- **Q3 (Phase D):** Keep the DAEP columns on `trespass_records` for back-compat/sync now,
  removing only in a later cleanup story? (recommended)


---

## 11. Risks

- **Blast radius:** 8 action files, ~61 references; high chance of regressions in Phase C.
- **No local verification:** all DB/RLS/UI validation deferred to a credentialed env.
- **Data duplication:** demographics exist in both tables when linked; sync drift risk →
  mitigated by single-writer rule (DAEP authoritative) per Q2.
- **Reconciliation coupling:** SIS reconciliation is trespass-incident-oriented; needs
  careful handling (Q4).
