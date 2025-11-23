-- Create admin_audit_log table for tracking administrative actions
-- This allows admins to view a changelog of all important events with full details (including PII)
-- while keeping console logs clean and PII-free

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_email TEXT,
  actor_role TEXT,
  target_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor ON admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_event_type ON admin_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_id);

-- Add comments for documentation
COMMENT ON TABLE admin_audit_log IS 'Audit log for administrative actions, viewable by admins only';
COMMENT ON COLUMN admin_audit_log.event_type IS 'Type of event (e.g., user.created, record.deleted)';
COMMENT ON COLUMN admin_audit_log.actor_id IS 'ID of user who performed the action';
COMMENT ON COLUMN admin_audit_log.actor_email IS 'Email of user who performed the action (for admin reference)';
COMMENT ON COLUMN admin_audit_log.actor_role IS 'Role of user who performed the action';
COMMENT ON COLUMN admin_audit_log.target_id IS 'ID of the resource affected by the action';
COMMENT ON COLUMN admin_audit_log.action IS 'Description of the action performed';
COMMENT ON COLUMN admin_audit_log.details IS 'Additional details about the action (JSON)';

-- RLS policies: Only admins can view
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role from Clerk auth
-- Note: This assumes user_profiles table has been synced from Clerk
CREATE OR REPLACE FUNCTION get_my_role_from_db()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = auth.uid();

  RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Master admins and district admins can view all audit logs
CREATE POLICY "Master and district admins can view audit logs"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    get_my_role_from_db() IN ('master_admin', 'district_admin')
  );

-- Policy: System can insert audit logs (for webhooks and server actions)
CREATE POLICY "Authenticated users can insert audit logs"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
