-- Add DAEP settings JSONB columns to tenants and campuses tables
-- Story 1.9: District/Campus DAEP Settings

-- Add is_daep flag to campuses table
ALTER TABLE campuses
ADD COLUMN IF NOT EXISTS is_daep BOOLEAN DEFAULT false;

-- Add daep_settings to tenants table (district-level settings)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS daep_settings JSONB DEFAULT '{
  "timezone": "America/Chicago",
  "default_points_per_period": 10,
  "attendance_threshold": 85,
  "point_threshold_warning": 7,
  "school_year": null
}'::jsonb;

-- Add daep_settings to campuses table (campus-level settings)
ALTER TABLE campuses
ADD COLUMN IF NOT EXISTS daep_settings JSONB DEFAULT '{
  "daep_campus_name": null,
  "daep_campus_address": null,
  "daep_campus_phone": null,
  "max_room_capacity": 15
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN tenants.daep_settings IS 'JSONB storage for district-level DAEP configuration (timezone, points, thresholds)';
COMMENT ON COLUMN campuses.daep_settings IS 'JSONB storage for campus-level DAEP configuration (name, address, phone, capacity)';

-- Update get_campuses_with_counts function to include is_daep
DROP FUNCTION IF EXISTS get_campuses_with_counts(uuid);
DROP FUNCTION IF EXISTS get_campuses_with_counts(text);

CREATE OR REPLACE FUNCTION get_campuses_with_counts(p_tenant_id text)
RETURNS TABLE (
  id text,
  tenant_id text,
  name text,
  abbreviation text,
  status text,
  is_daep boolean,
  deleted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  user_count bigint,
  record_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.tenant_id,
    c.name,
    c.abbreviation,
    c.status,
    c.is_daep,
    c.deleted_at,
    c.created_at,
    c.updated_at,
    COALESCE(u.user_count, 0) as user_count,
    CASE
      WHEN c.is_daep = true THEN COALESCE(daep.daep_count, 0)
      ELSE COALESCE(r.record_count, 0)
    END as record_count
  FROM campuses c
  LEFT JOIN (
    SELECT up.campus_id, COUNT(*) as user_count
    FROM user_profiles up
    WHERE up.tenant_id = p_tenant_id
      AND up.deleted_at IS NULL
    GROUP BY up.campus_id
  ) u ON c.id = u.campus_id
  LEFT JOIN (
    SELECT tr.campus_id, COUNT(*) as record_count
    FROM trespass_records tr
    WHERE tr.tenant_id = p_tenant_id
    GROUP BY tr.campus_id
  ) r ON c.id = r.campus_id
  LEFT JOIN (
    SELECT COUNT(*) as daep_count
    FROM trespass_records tr2
    WHERE tr2.tenant_id = p_tenant_id
      AND tr2.is_daep = true
  ) daep ON c.is_daep = true
  WHERE c.tenant_id = p_tenant_id
    AND c.deleted_at IS NULL
  ORDER BY c.name;
END;
$$;
