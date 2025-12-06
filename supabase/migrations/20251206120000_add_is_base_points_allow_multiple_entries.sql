-- Story 3-2: Point Entry Grid
-- Allow multiple point entries per period and distinguish base vs adjustment entries
-- Applied to Supabase via MCP: 2025-12-06

-- Remove unique constraint to allow multiple entries per period
ALTER TABLE daep_daily_points
DROP CONSTRAINT IF EXISTS daep_daily_points_tenant_id_placement_id_date_period_key;

-- Add is_base_points column to distinguish auto vs manual entries
ALTER TABLE daep_daily_points
ADD COLUMN IF NOT EXISTS is_base_points BOOLEAN DEFAULT false;

-- Update check constraint to allow negative values for adjustments (-15 to +10)
ALTER TABLE daep_daily_points
DROP CONSTRAINT IF EXISTS daep_daily_points_points_earned_check;

ALTER TABLE daep_daily_points
ADD CONSTRAINT daep_daily_points_points_earned_check
CHECK (points_earned >= -15 AND points_earned <= 10);

-- Add index for efficient querying by placement and date
CREATE INDEX IF NOT EXISTS idx_daep_daily_points_placement_date
ON daep_daily_points(tenant_id, placement_id, date);

-- Add index for querying by room (via placement) for room logs
CREATE INDEX IF NOT EXISTS idx_daep_daily_points_created_at
ON daep_daily_points(created_at DESC);

-- Comment for clarity
COMMENT ON COLUMN daep_daily_points.is_base_points IS 'TRUE for auto-generated base points (10 when present), FALSE for teacher adjustments';
