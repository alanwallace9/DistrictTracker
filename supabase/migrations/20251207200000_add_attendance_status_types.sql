-- Migration: Add attendance status types and bell schedule period flags
-- Story: 3-9 Attendance Entry

-- ============================================================================
-- 1. Create attendance status types table
-- ============================================================================

CREATE TABLE IF NOT EXISTS daep_attendance_status_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  status_code TEXT NOT NULL,           -- 'P', 'A', 'T', 'ED', 'FT', etc.
  label TEXT NOT NULL,                 -- 'Present', 'Absent', etc.
  points_type TEXT NOT NULL DEFAULT 'full',  -- 'full', 'partial', 'none'
  requires_time BOOLEAN DEFAULT false, -- True for Tardy, Early Dismissal
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,    -- System defaults can't be deleted
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, status_code),
  CONSTRAINT valid_points_type CHECK (points_type IN ('full', 'partial', 'none'))
);

COMMENT ON TABLE daep_attendance_status_types IS 'Configurable attendance status types with point values';
COMMENT ON COLUMN daep_attendance_status_types.points_type IS 'full=10pts, partial=5pts, none=0pts';
COMMENT ON COLUMN daep_attendance_status_types.requires_time IS 'If true, prompts for time entry (tardy arrival, early dismissal)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daep_attendance_status_types_tenant
  ON daep_attendance_status_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_attendance_status_types_active
  ON daep_attendance_status_types(tenant_id, active);

-- Enable RLS
ALTER TABLE daep_attendance_status_types ENABLE ROW LEVEL SECURITY;

-- RLS Policy - tenant isolation
CREATE POLICY "daep_attendance_status_types_tenant_isolation"
  ON daep_attendance_status_types
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Updated_at trigger
CREATE TRIGGER update_daep_attendance_status_types_updated_at
  BEFORE UPDATE ON daep_attendance_status_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Seed default status types for existing tenants
-- ============================================================================

-- Function to seed default attendance status types for a tenant
CREATE OR REPLACE FUNCTION seed_default_attendance_status_types(p_tenant_id TEXT)
RETURNS void AS $$
BEGIN
  -- Only insert if tenant doesn't already have status types
  IF NOT EXISTS (
    SELECT 1 FROM daep_attendance_status_types WHERE tenant_id = p_tenant_id
  ) THEN
    INSERT INTO daep_attendance_status_types
      (tenant_id, status_code, label, points_type, requires_time, sort_order, is_default)
    VALUES
      (p_tenant_id, 'P', 'Present', 'full', false, 1, true),
      (p_tenant_id, 'A', 'Absent', 'none', false, 2, true),
      (p_tenant_id, 'T', 'Tardy', 'full', true, 3, true),
      (p_tenant_id, 'ED', 'Early Dismissal', 'full', true, 4, true),
      (p_tenant_id, 'FT', 'Field Trip', 'full', false, 5, false);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Seed defaults for all existing tenants that have DAEP data
DO $$
DECLARE
  t_record RECORD;
BEGIN
  FOR t_record IN
    SELECT DISTINCT tenant_id
    FROM user_profiles
    WHERE tenant_id IS NOT NULL
  LOOP
    PERFORM seed_default_attendance_status_types(t_record.tenant_id);
  END LOOP;
END $$;

-- ============================================================================
-- 3. Update bell schedule to support period flags
-- Note: Bell schedules store periods as JSONB, so we need to update existing
-- periods to include the new flags with defaults
-- ============================================================================

-- Update existing bell schedules to add requires_attendance and grants_points to each period
-- These default to true for backward compatibility
UPDATE daep_bell_schedules
SET periods = (
  SELECT jsonb_agg(
    period || jsonb_build_object(
      'requires_attendance', COALESCE((period->>'requires_attendance')::boolean, true),
      'grants_points', COALESCE((period->>'grants_points')::boolean, true)
    )
  )
  FROM jsonb_array_elements(periods) AS period
)
WHERE periods IS NOT NULL
  AND jsonb_array_length(periods) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(periods) AS p
    WHERE p ? 'requires_attendance'
  );

COMMENT ON COLUMN daep_bell_schedules.periods IS 'Array of period objects with period_name, start_time, end_time, requires_attendance, grants_points';
