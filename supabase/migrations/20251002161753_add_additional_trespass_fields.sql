/*
  # Add additional fields to trespass_records

  1. New Fields
    - `aka` (also known as) - text field for aliases
    - `school_id` - text field for student ID number
    - `known_associates` - text field for associated individuals
    - `current_school` - text field for current school name
    - `guardian_first_name` - text field for guardian's first name
    - `guardian_last_name` - text field for guardian's last name
    - `guardian_phone` - text field for guardian's phone number
    - `contact_info` - text field for additional contact information
    - `notes` - text field for additional notes/description
  
  2. Notes
    - All fields are optional (nullable)
    - Using text type for flexibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'aka'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN aka text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN school_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'known_associates'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN known_associates text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'current_school'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN current_school text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'guardian_first_name'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN guardian_first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'guardian_last_name'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN guardian_last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'guardian_phone'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN guardian_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'contact_info'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN contact_info text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'notes'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN notes text;
  END IF;
END $$;