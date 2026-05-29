-- Migration: create_daep_intake_queue
-- Phase 1: Approved-students intake queue
-- Purpose: Lightweight scheduling stage seeded from the district's approved list.
--          Rows here are NOT placements yet; they are promoted to daep_placements
--          when a coordinator completes intake (manually now, via import later).

-- =====================================================
-- SECTION 1: Create daep_intake_queue table
-- =====================================================

CREATE TABLE IF NOT EXISTS daep_intake_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  student_id TEXT,                       -- SIS/school_id from approved list (nullable)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  campus_name TEXT,                      -- raw campus text as it appeared in the import
  home_campus_id TEXT,                   -- resolved campus code (nullable until matched)
  special_notes TEXT,
  status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'scheduled', 'arrived', 'no_show', 'promoted', 'cancelled')),
  scheduled_intake_date DATE,
  placement_id UUID REFERENCES daep_placements(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'import'
    CHECK (source IN ('import', 'manual')),
  created_by TEXT,                       -- Clerk user_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Composite FK to tenant-scoped campuses. MATCH SIMPLE: skipped when home_campus_id IS NULL.
  CONSTRAINT fk_daep_intake_queue_campus
    FOREIGN KEY (tenant_id, home_campus_id)
    REFERENCES campuses(tenant_id, id)
    ON DELETE SET NULL
);

COMMENT ON TABLE daep_intake_queue IS 'Approved students awaiting DAEP intake scheduling; promoted to daep_placements on intake completion';
COMMENT ON COLUMN daep_intake_queue.status IS 'approved -> scheduled -> arrived -> promoted (or no_show / cancelled)';
COMMENT ON COLUMN daep_intake_queue.placement_id IS 'Set when the entry is promoted to a full placement';

-- =====================================================
-- SECTION 2: Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_daep_intake_queue_tenant ON daep_intake_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_intake_queue_status ON daep_intake_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_daep_intake_queue_student ON daep_intake_queue(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_daep_intake_queue_placement ON daep_intake_queue(placement_id);

-- =====================================================
-- SECTION 3: Row Level Security (role-based, per CLAUDE.md)
-- =====================================================

ALTER TABLE daep_intake_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daep_intake_queue_tenant_isolation" ON daep_intake_queue
  FOR ALL USING (tenant_id = get_my_tenant_id());
