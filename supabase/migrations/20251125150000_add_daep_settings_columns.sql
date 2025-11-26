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
