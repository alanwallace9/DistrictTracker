-- Add streak-related columns to daep_student_milestones for consecutive perfect days tracking
-- Story 3-7 Enhancement: Consecutive Perfect Days Milestones

-- Add streak columns to daep_student_milestones
ALTER TABLE daep_student_milestones
ADD COLUMN IF NOT EXISTS streak_days INT,
ADD COLUMN IF NOT EXISTS streak_start_date DATE,
ADD COLUMN IF NOT EXISTS streak_end_date DATE,
ADD COLUMN IF NOT EXISTS bonus_points_awarded INT DEFAULT 0;

-- Add is_bonus column to daep_daily_points for bonus point entries
ALTER TABLE daep_daily_points
ADD COLUMN IF NOT EXISTS is_bonus BOOLEAN DEFAULT false;

-- Update unique constraint to allow re-earning streak milestones
-- First drop the old constraint if it exists
ALTER TABLE daep_student_milestones
DROP CONSTRAINT IF EXISTS daep_student_milestones_tenant_id_placement_id_rule_id_key;

-- Create new constraint that includes streak_end_date (null for point thresholds)
-- This allows streak milestones to be earned multiple times (different streaks)
CREATE UNIQUE INDEX IF NOT EXISTS daep_student_milestones_unique_award
ON daep_student_milestones (tenant_id, placement_id, rule_id, COALESCE(streak_end_date, '1900-01-01'));

-- Add comment
COMMENT ON COLUMN daep_student_milestones.streak_days IS 'Number of consecutive perfect days for streak milestones';
COMMENT ON COLUMN daep_student_milestones.streak_start_date IS 'Start date of the streak that earned this milestone';
COMMENT ON COLUMN daep_student_milestones.streak_end_date IS 'End date of the streak - used for uniqueness to allow re-earning';
COMMENT ON COLUMN daep_student_milestones.bonus_points_awarded IS 'Bonus points given when this milestone was achieved';
COMMENT ON COLUMN daep_daily_points.is_bonus IS 'True if this is a bonus point entry from milestone achievement';
