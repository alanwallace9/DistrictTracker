/*
  # Change campuses primary key to composite (tenant_id, id)

  ## Problem
  The current `id` column is a globally unique PRIMARY KEY, but campus IDs
  (PEIMS codes like "001", "002") should only be unique within a tenant.
  This prevents different districts from using the same campus codes.

  ## Solution
  Change to composite primary key (tenant_id, id) so that:
  - (birdville, 001) and (demo, 001) are both valid
  - Within a single tenant, campus IDs remain unique
  - Foreign keys become composite (tenant_id, campus_id)

  ## Tables Affected
  - campuses: PK changes from (id) to (tenant_id, id)
  - trespass_records: FK becomes composite
  - pending_invitations: FK becomes composite
  - daep_rooms: FK becomes composite
  - daep_bell_schedules: FK becomes composite
  - daep_placements: FK becomes composite + add missing columns
  - user_profiles: FK becomes composite
*/

-- ============================================================
-- STEP 1: Drop all existing foreign key constraints
-- ============================================================
ALTER TABLE trespass_records DROP CONSTRAINT IF EXISTS fk_trespass_records_campus;
ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_campus_id_fkey;
ALTER TABLE daep_rooms DROP CONSTRAINT IF EXISTS daep_rooms_campus_id_fkey;
ALTER TABLE daep_bell_schedules DROP CONSTRAINT IF EXISTS daep_bell_schedules_campus_id_fkey;
ALTER TABLE daep_placements DROP CONSTRAINT IF EXISTS daep_placements_home_campus_id_fkey;
-- user_profiles may not have FK constraint, but try to drop if exists
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_campus_id_fkey;

-- ============================================================
-- STEP 2: Change campuses primary key to composite
-- ============================================================
ALTER TABLE campuses DROP CONSTRAINT campuses_pkey;
ALTER TABLE campuses ADD PRIMARY KEY (tenant_id, id);

-- ============================================================
-- STEP 3: Add missing columns to daep_placements
-- ============================================================
-- campus_id: The DAEP campus where student is placed (required)
ALTER TABLE daep_placements ADD COLUMN IF NOT EXISTS campus_id text;

-- assigning_campus_id: The campus that assigned them to DAEP
ALTER TABLE daep_placements ADD COLUMN IF NOT EXISTS assigning_campus_id text;

-- Update existing rows: set campus_id = home_campus_id as default
UPDATE daep_placements SET campus_id = home_campus_id WHERE campus_id IS NULL;

-- ============================================================
-- STEP 4: Recreate foreign keys as composite constraints
-- ============================================================

-- trespass_records (tenant_id, campus_id) -> campuses (tenant_id, id)
ALTER TABLE trespass_records
  ADD CONSTRAINT fk_trespass_records_campus
  FOREIGN KEY (tenant_id, campus_id)
  REFERENCES campuses(tenant_id, id)
  ON DELETE SET NULL;

-- pending_invitations (tenant_id, campus_id) -> campuses (tenant_id, id)
ALTER TABLE pending_invitations
  ADD CONSTRAINT fk_pending_invitations_campus
  FOREIGN KEY (tenant_id, campus_id)
  REFERENCES campuses(tenant_id, id)
  ON DELETE SET NULL;

-- daep_rooms (tenant_id, campus_id) -> campuses (tenant_id, id)
ALTER TABLE daep_rooms
  ADD CONSTRAINT fk_daep_rooms_campus
  FOREIGN KEY (tenant_id, campus_id)
  REFERENCES campuses(tenant_id, id)
  ON DELETE CASCADE;

-- daep_bell_schedules (tenant_id, campus_id) -> campuses (tenant_id, id)
ALTER TABLE daep_bell_schedules
  ADD CONSTRAINT fk_daep_bell_schedules_campus
  FOREIGN KEY (tenant_id, campus_id)
  REFERENCES campuses(tenant_id, id)
  ON DELETE CASCADE;

-- daep_placements - three campus references
ALTER TABLE daep_placements
  ADD CONSTRAINT fk_daep_placements_home_campus
  FOREIGN KEY (tenant_id, home_campus_id)
  REFERENCES campuses(tenant_id, id)
  ON DELETE SET NULL;

ALTER TABLE daep_placements
  ADD CONSTRAINT fk_daep_placements_assigning_campus
  FOREIGN KEY (tenant_id, assigning_campus_id)
  REFERENCES campuses(tenant_id, id)
  ON DELETE SET NULL;

ALTER TABLE daep_placements
  ADD CONSTRAINT fk_daep_placements_campus
  FOREIGN KEY (tenant_id, campus_id)
  REFERENCES campuses(tenant_id, id)
  ON DELETE SET NULL;

-- user_profiles (tenant_id, campus_id) -> campuses (tenant_id, id)
ALTER TABLE user_profiles
  ADD CONSTRAINT fk_user_profiles_campus
  FOREIGN KEY (tenant_id, campus_id)
  REFERENCES campuses(tenant_id, id)
  ON DELETE SET NULL;

-- ============================================================
-- STEP 5: Create index for campus lookups (PK covers tenant_id, id)
-- ============================================================
-- Drop redundant index since tenant_id is now leading column in PK
DROP INDEX IF EXISTS idx_campuses_tenant_id;
