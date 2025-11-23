/*
  # Add Missing Fields and Multi-Tenancy to trespass_records

  1. New Fields
    - `expiration_date` (date) - When the trespass order expires
    - `is_former_student` (boolean) - Whether person is a former student
    - `org_id` (text) - Organization/District ID for multi-tenancy

  2. Schema Changes
    - Make school_id NOT NULL (required field)
    - Make expiration_date NOT NULL (required field)
    - Make trespassed_from NOT NULL (already done in previous migration)
    - Make incident_date, location, description nullable (now optional)
    - Add org_id as required field for multi-tenancy

  3. Multi-Tenancy Setup
    - Add org_id column
    - Update RLS policies to filter by org_id
    - Add index on org_id for performance

  4. Notes
    - Existing records will need org_id populated
    - Default values set for backward compatibility
*/

-- Add expiration_date column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'expiration_date'
  ) THEN
    -- Add as nullable first for existing records
    ALTER TABLE trespass_records ADD COLUMN expiration_date date;
  END IF;
END $$;

-- Add is_former_student column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'is_former_student'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN is_former_student boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add org_id column for multi-tenancy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'org_id'
  ) THEN
    -- Add as nullable first to allow existing records
    ALTER TABLE trespass_records ADD COLUMN org_id text;

    -- Set default org_id for existing records (if any)
    UPDATE trespass_records SET org_id = 'default' WHERE org_id IS NULL;

    -- Now make it NOT NULL
    ALTER TABLE trespass_records ALTER COLUMN org_id SET NOT NULL;
  END IF;
END $$;

-- Update field constraints to match new requirements
-- Make school_id NOT NULL (already text, just enforce NOT NULL)
DO $$
BEGIN
  -- Check if school_id exists and is nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records'
    AND column_name = 'school_id'
    AND is_nullable = 'YES'
  ) THEN
    -- Set default for existing NULL values
    UPDATE trespass_records SET school_id = '' WHERE school_id IS NULL;
    -- Make it NOT NULL
    ALTER TABLE trespass_records ALTER COLUMN school_id SET NOT NULL;
  END IF;
END $$;

-- Make expiration_date NOT NULL (after populating existing records)
DO $$
BEGIN
  -- Set default expiration_date for existing records (1 year from now)
  UPDATE trespass_records
  SET expiration_date = CURRENT_DATE + INTERVAL '1 year'
  WHERE expiration_date IS NULL;

  -- Now make it NOT NULL
  ALTER TABLE trespass_records ALTER COLUMN expiration_date SET NOT NULL;
END $$;

-- Make incident_date, location, description nullable (now optional)
DO $$
BEGIN
  ALTER TABLE trespass_records ALTER COLUMN incident_date DROP NOT NULL;
  ALTER TABLE trespass_records ALTER COLUMN location DROP NOT NULL;
  ALTER TABLE trespass_records ALTER COLUMN description DROP NOT NULL;
END $$;

-- Add index on org_id for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_trespass_records_org_id ON trespass_records(org_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Authenticated users can view all trespass records" ON trespass_records;
DROP POLICY IF EXISTS "Authenticated users can create trespass records" ON trespass_records;
DROP POLICY IF EXISTS "Authenticated users can update trespass records" ON trespass_records;
DROP POLICY IF EXISTS "Authenticated users can delete trespass records" ON trespass_records;

-- Create new RLS policies with org_id filtering
-- Users can only see records from their organization
CREATE POLICY "Users can view records from their organization"
  ON trespass_records
  FOR SELECT
  TO authenticated
  USING (
    org_id = (
      SELECT org_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can only create records for their organization
CREATE POLICY "Users can create records for their organization"
  ON trespass_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND org_id = (
      SELECT org_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can only update records from their organization
CREATE POLICY "Users can update records from their organization"
  ON trespass_records
  FOR UPDATE
  TO authenticated
  USING (
    org_id = (
      SELECT org_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    org_id = (
      SELECT org_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can only delete records from their organization
CREATE POLICY "Users can delete records from their organization"
  ON trespass_records
  FOR DELETE
  TO authenticated
  USING (
    org_id = (
      SELECT org_id FROM user_profiles WHERE id = auth.uid()
    )
  );
