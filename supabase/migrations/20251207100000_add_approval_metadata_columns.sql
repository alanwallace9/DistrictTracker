-- Story 3.6: Pending Approval Workflow
-- Add metadata columns for tracking who approved/rejected point entries

-- Add approval metadata columns
ALTER TABLE daep_daily_points
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for pending approvals query performance
-- Partial index on tenant_id + approval_status for pending entries only
CREATE INDEX IF NOT EXISTS idx_daep_daily_points_pending
ON daep_daily_points(tenant_id, approval_status)
WHERE approval_status = 'pending';

-- Add index for approved_by lookups
CREATE INDEX IF NOT EXISTS idx_daep_daily_points_approved_by
ON daep_daily_points(approved_by)
WHERE approved_by IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN daep_daily_points.approved_by IS 'Admin who approved the entry (null if auto-approved by approved_teacher or still pending)';
COMMENT ON COLUMN daep_daily_points.approved_at IS 'Timestamp when entry was approved by admin';
COMMENT ON COLUMN daep_daily_points.rejected_by IS 'Admin who rejected the entry';
COMMENT ON COLUMN daep_daily_points.rejected_at IS 'Timestamp when entry was rejected';
COMMENT ON COLUMN daep_daily_points.rejection_reason IS 'Optional reason provided when rejecting an entry';
