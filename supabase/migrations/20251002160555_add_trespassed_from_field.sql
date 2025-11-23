/*
  # Add trespassed_from field to trespass_records

  1. Changes
    - Add `trespassed_from` text field to trespass_records table
    - This field will store the location/campus where the person was trespassed from
    - Make it NOT NULL with empty string as default for existing records
  
  2. Notes
    - Existing records will have empty string
    - New records should specify the location
*/

-- Add trespassed_from column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'trespassed_from'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN trespassed_from text DEFAULT '' NOT NULL;
  END IF;
END $$;