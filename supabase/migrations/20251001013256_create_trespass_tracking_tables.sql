/*
  # School District Trespass Tracking System

  1. New Tables
    - `trespass_records`
      - `id` (uuid, primary key) - Unique identifier for each record
      - `user_id` (uuid, foreign key) - References auth.users who created the record
      - `first_name` (text) - Trespasser's first name
      - `last_name` (text) - Trespasser's last name
      - `date_of_birth` (date) - Date of birth
      - `incident_date` (date) - When the trespass incident occurred
      - `location` (text) - School or district location
      - `description` (text) - Details about the incident
      - `photo_url` (text, optional) - URL to photo if uploaded
      - `status` (text) - Status: active, resolved, expired
      - `created_at` (timestamptz) - When record was created
      - `updated_at` (timestamptz) - When record was last updated

  2. Security
    - Enable RLS on `trespass_records` table
    - Add policies for authenticated users to:
      - View all trespass records (SELECT)
      - Create new records (INSERT)
      - Update existing records (UPDATE)
      - Delete records (DELETE)

  3. Indexes
    - Index on user_id for faster queries
    - Index on incident_date for sorting
    - Index on status for filtering
*/

-- Create trespass_records table
CREATE TABLE IF NOT EXISTS trespass_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  incident_date date NOT NULL,
  location text NOT NULL,
  description text NOT NULL,
  photo_url text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE trespass_records ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view all trespass records"
  ON trespass_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create trespass records"
  ON trespass_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update trespass records"
  ON trespass_records
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete trespass records"
  ON trespass_records
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trespass_records_user_id ON trespass_records(user_id);
CREATE INDEX IF NOT EXISTS idx_trespass_records_incident_date ON trespass_records(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_trespass_records_status ON trespass_records(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_trespass_records_updated_at
  BEFORE UPDATE ON trespass_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();