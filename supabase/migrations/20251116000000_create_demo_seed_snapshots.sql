-- Create table to store demo tenant seed data snapshots
-- This table stores the "default state" that demo tenant resets to every 6 hours

CREATE TABLE IF NOT EXISTS demo_seed_snapshots (
  id TEXT PRIMARY KEY DEFAULT 'default',
  campuses_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  records_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  snapshot_count_campuses INTEGER NOT NULL DEFAULT 0,
  snapshot_count_records INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row (will be updated via admin UI)
INSERT INTO demo_seed_snapshots (id, campuses_snapshot, records_snapshot)
VALUES ('default', '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies (only master admins can update, cron job can read)
ALTER TABLE demo_seed_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write (for cron job and server actions)
CREATE POLICY "Service role can manage demo snapshots"
  ON demo_seed_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read (for verification)
CREATE POLICY "Authenticated users can view demo snapshots"
  ON demo_seed_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE demo_seed_snapshots IS 'Stores snapshot of demo tenant data used for automated resets every 6 hours';
COMMENT ON COLUMN demo_seed_snapshots.campuses_snapshot IS 'Array of demo campus records';
COMMENT ON COLUMN demo_seed_snapshots.records_snapshot IS 'Array of demo trespass records';
COMMENT ON COLUMN demo_seed_snapshots.updated_by IS 'Clerk user ID of admin who last updated snapshot';
