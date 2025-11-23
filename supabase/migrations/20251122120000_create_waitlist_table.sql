-- Create waitlist table for tracking module interest
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  tenant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_waitlist_user_id ON waitlist(user_id);
CREATE INDEX idx_waitlist_module_name ON waitlist(module_name);
CREATE INDEX idx_waitlist_created_at ON waitlist(created_at DESC);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Only master admins can view all waitlist entries
CREATE POLICY "Master admins can view all waitlist entries"
  ON waitlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_master_admin = true
    )
  );

-- Policy: Users can insert their own waitlist entry
CREATE POLICY "Users can add themselves to waitlist"
  ON waitlist
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Policy: Prevent duplicate entries (user can only sign up once per module)
CREATE UNIQUE INDEX idx_waitlist_user_module ON waitlist(user_id, module_name);

-- Add comment for documentation
COMMENT ON TABLE waitlist IS 'Tracks user interest in upcoming modules (e.g., DAEP Dashboard)';
