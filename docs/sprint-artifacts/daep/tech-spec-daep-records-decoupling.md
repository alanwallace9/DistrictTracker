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
  -- DAEP support fields (migrated from trespass_records)
  parent_email             text,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  special_education boolean NOT NULL DEFAULT false,
  plan_504          boolean NOT NULL DEFAULT false,
  ell_status        boolean NOT NULL DEFAULT false,
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

## 5. Module-Presence Detection (KEY DECISION — needs your input)

We must know whether a tenant "uses the trespass module" to decide whether to
link/sync. Today this only exists per-user. Options:

| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| **A (recommended)** | Tenant-level flag: `tenants.enabled_modules text[]` (or a `tenant_modules` table) | Explicit, queryable, future-proof | New column/migration + admin UI to set it |
| **B** | Derive: tenant has any `user_profiles.module_access IN ('trespass_only','both')` | No new schema | Implicit; user provisioning drives data behavior |
| **C** | Derive: tenant has ≥1 row in `trespass_records` | No new schema | Fragile; empty/new tenants misdetected |

**Recommendation: Option A**, defaulting `enabled_modules` from existing user
`module_access` during migration.

---

## 6. Integration / Sync Behavior (when both modules present)

**DAEP is the source of truth for DAEP status.** On DAEP intake / placement lifecycle:

1. Upsert `daep_records` (create or reuse by `(tenant_id, school_id)`).
2. If tenant has trespass module:
   - Upsert/find the `trespass_records` row by `(tenant_id, school_id)`.
   - Set `daep_records.trespass_record_id`.
   - Sync DAEP status onto the trespass record: `is_daep`, `daep_expiration_date`
     (this is today's `syncTrespassTrackerExpiration`, repurposed as DAEP→trespass).
3. If tenant does **not** have trespass module: skip all trespass writes.

**Open decision:** ownership of shared demographics (name, grade, contacts) when both
exist — do we (a) treat `daep_records` as authoritative and push to trespass, (b) keep
each independent, or (c) read demographics from trespass when linked? See §10 Q2.

---

## 7. Migration / Backfill

1. Create `daep_records` + RLS + indexes.
2. Backfill: for every distinct `(tenant_id, school_id)` that has a `daep_placements`
   row **or** `trespass_records.is_daep = true`, insert a `daep_records` row copying
   the DAEP-relevant fields from `trespass_records`, and set `trespass_record_id`.
3. (Option A) Add `tenants.enabled_modules`; seed from aggregated user `module_access`.

Backfill is idempotent (`ON CONFLICT (tenant_id, school_id) DO NOTHING`).

---

## 8. Affected Code & Phased Rollout

| Phase | Scope | Risk |
|-------|-------|------|
| **A — Schema** | `daep_records` table, RLS, indexes, backfill migration; (Option A) tenant module flag | Low (additive) |
| **B — Intake rework** | Rework commit `a5500fb`: `createPlacement`/intake create `daep_records`; `lookupStudentForIntake` reads `daep_records`; DAEP→trespass sync gated by module presence | Medium |
| **C — Reads migration** | Point roster/search/dashboard off `daep_records`: `students.ts`, `placements.ts` (search, getDaepStudents path), `dashboard.ts`, `roster.ts`, `rooms.ts`, `behavior-notes.ts`, `rollover.ts`, `reconciliation.ts` | High (8 files, ~61 refs) |
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

## 10. Open Decisions (need answers before Phase A)

1. **Module detection (§5):** Option A (tenant flag), B (derive from users), or C (derive
   from data)? — *Recommend A.*
2. **Shared-field ownership (§6):** when both modules present, is `daep_records`
   authoritative for demographics (push to trespass), independent, or read-through?
3. **`trespass_records` DAEP columns:** keep for back-compat/sync now (recommended) or
   plan removal in Phase D?
4. **Reconciliation:** it matches CSV/SIS to `trespass_records.incident_number`. Should
   reconciliation stay trespass-oriented, or also/instead resolve against `daep_records`?

---

## 11. Risks

- **Blast radius:** 8 action files, ~61 references; high chance of regressions in Phase C.
- **No local verification:** all DB/RLS/UI validation deferred to a credentialed env.
- **Data duplication:** demographics exist in both tables when linked; sync drift risk →
  mitigated by single-writer rule (DAEP authoritative) per Q2.
- **Reconciliation coupling:** SIS reconciliation is trespass-incident-oriented; needs
  careful handling (Q4).
