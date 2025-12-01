-- Migration: create_rollover_tables
-- Story 2.11: Rollover Student Handling
-- Purpose: Add rollover decision tracking table and placement fields
-- Author: Claude Opus 4.5
-- Date: 2025-11-30

-- =====================================================
-- SECTION 1: Add rollover fields to daep_placements
-- =====================================================

-- Add is_rollover_placement flag (excludes from recidivism counts)
ALTER TABLE daep_placements
  ADD COLUMN IF NOT EXISTS is_rollover_placement BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN daep_placements.is_rollover_placement IS 'True for next-year rollover placements; excludes from recidivism counts';

-- Add original_placement_id FK (links rollover to original placement)
ALTER TABLE daep_placements
  ADD COLUMN IF NOT EXISTS original_placement_id UUID REFERENCES daep_placements(id);

COMMENT ON COLUMN daep_placements.original_placement_id IS 'Links rollover placement back to original placement for audit/history';

-- Update rollover_decision CHECK constraint to use proper values
-- First drop any existing constraint (if exists)
ALTER TABLE daep_placements
  DROP CONSTRAINT IF EXISTS daep_placements_rollover_decision_check;

-- Add new CHECK constraint with proper values
ALTER TABLE daep_placements
  ADD CONSTRAINT daep_placements_rollover_decision_check
  CHECK (rollover_decision IS NULL OR rollover_decision IN ('continue_daep', 'return_home'));

COMMENT ON COLUMN daep_placements.rollover_decision IS 'Current rollover decision: continue_daep or return_home';
COMMENT ON COLUMN daep_placements.rollover_student IS 'True if student is a rollover candidate (days_remaining > school_days_left)';

-- =====================================================
-- SECTION 2: Create daep_rollover_decisions table
-- =====================================================

CREATE TABLE IF NOT EXISTS daep_rollover_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,              -- Student school_id for display
  school_id TEXT NOT NULL,               -- Incident number link
  home_campus_id TEXT NOT NULL,          -- Home campus for filtering

  -- Decision details
  decision TEXT NOT NULL CHECK (decision IN ('continue_daep', 'return_home')),
  days_remaining INTEGER NOT NULL,
  review_eligible_day INTEGER,           -- Days until review eligibility in next year

  -- Audit fields
  decided_by TEXT NOT NULL,              -- Clerk user_id
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE daep_rollover_decisions IS 'Tracks rollover decision history - multiple decisions per placement allowed';
COMMENT ON COLUMN daep_rollover_decisions.student_id IS 'Student school_id from trespass_records';
COMMENT ON COLUMN daep_rollover_decisions.school_id IS 'Incident number for linking to placement';
COMMENT ON COLUMN daep_rollover_decisions.decision IS 'continue_daep: student continues next year; return_home: student returns to home campus';
COMMENT ON COLUMN daep_rollover_decisions.review_eligible_day IS 'Days until review eligibility in next year (carried over from original)';

-- =====================================================
-- SECTION 3: Indexes for performance
-- =====================================================

-- Rollover-related indexes on daep_placements
CREATE INDEX IF NOT EXISTS idx_daep_placements_rollover ON daep_placements(is_rollover_placement);
CREATE INDEX IF NOT EXISTS idx_daep_placements_rollover_candidate ON daep_placements(rollover_student);
CREATE INDEX IF NOT EXISTS idx_daep_placements_original ON daep_placements(original_placement_id);

-- daep_rollover_decisions indexes
CREATE INDEX IF NOT EXISTS idx_rollover_decisions_tenant ON daep_rollover_decisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rollover_decisions_placement ON daep_rollover_decisions(placement_id);
CREATE INDEX IF NOT EXISTS idx_rollover_decisions_campus ON daep_rollover_decisions(home_campus_id);
CREATE INDEX IF NOT EXISTS idx_rollover_decisions_student ON daep_rollover_decisions(student_id);
CREATE INDEX IF NOT EXISTS idx_rollover_decisions_decided_at ON daep_rollover_decisions(decided_at DESC);

-- =====================================================
-- SECTION 4: Enable Row-Level Security
-- =====================================================

ALTER TABLE daep_rollover_decisions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 5: RLS Policies - Tenant isolation only
-- Server actions handle additional authorization via Clerk
-- =====================================================

-- Drop any existing policies first
DROP POLICY IF EXISTS "rollover_decisions_tenant_isolation" ON daep_rollover_decisions;

-- Basic tenant isolation
CREATE POLICY "rollover_decisions_tenant_isolation" ON daep_rollover_decisions
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- =====================================================
-- SECTION 6: Summary
-- =====================================================

COMMENT ON SCHEMA public IS 'Rollover tables added 2025-11-30 (Story 2.11). Added daep_rollover_decisions table and rollover fields to daep_placements.';
