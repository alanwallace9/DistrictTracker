-- Story 2-6: Placement Lifecycle State Machine
-- Create daep_placement_transitions table for audit trail of status changes

-- Create the transitions table
CREATE TABLE IF NOT EXISTS daep_placement_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  from_status TEXT,  -- nullable for initial state
  to_status TEXT NOT NULL,
  transition_reason TEXT,
  transitioned_by TEXT NOT NULL,  -- Clerk user_id
  transitioned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_daep_transitions_placement ON daep_placement_transitions(placement_id);
CREATE INDEX IF NOT EXISTS idx_daep_transitions_tenant ON daep_placement_transitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_transitions_timestamp ON daep_placement_transitions(transitioned_at DESC);

-- Enable RLS
ALTER TABLE daep_placement_transitions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their tenant's transitions
CREATE POLICY "Users can access their tenant's transitions"
  ON daep_placement_transitions
  FOR ALL
  USING (tenant_id = get_my_tenant_id());

-- Add review_met_date column to daep_placements if not exists
-- This tracks when a placement transitions to 'met' status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daep_placements' AND column_name = 'review_met_date'
  ) THEN
    ALTER TABLE daep_placements ADD COLUMN review_met_date DATE;
  END IF;
END $$;

-- Add index for school calendar queries (days calculation optimization)
CREATE INDEX IF NOT EXISTS idx_daep_school_calendar_days_lookup
  ON daep_school_calendar(tenant_id, school_year, is_school_day, date)
  WHERE is_school_day = true;

COMMENT ON TABLE daep_placement_transitions IS 'Audit trail for placement status changes - Story 2.6';
COMMENT ON COLUMN daep_placement_transitions.from_status IS 'Previous status (null for initial placement)';
COMMENT ON COLUMN daep_placement_transitions.to_status IS 'New status after transition';
COMMENT ON COLUMN daep_placement_transitions.transition_reason IS 'Reason for transition (auto-activated, manual, etc.)';
