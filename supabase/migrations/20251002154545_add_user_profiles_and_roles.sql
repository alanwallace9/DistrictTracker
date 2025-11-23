/*
  # Add User Profiles and Roles

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `display_name` (text) - User's display name
      - `role` (text) - User role: user, district_admin, master_admin
      - `theme` (text) - User's theme preference: light, dark, system
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Changes to existing tables
    - Add `is_former_student` boolean to trespass_records
    - Add `expiration_date` date to trespass_records
    - Update status values to only be: active, inactive
  
  3. Security
    - Enable RLS on user_profiles
    - Users can read their own profile
    - Users can update their own profile
    - Add helper function to check user role
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role text NOT NULL DEFAULT 'user',
  theme text NOT NULL DEFAULT 'system',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('user', 'district_admin', 'master_admin')),
  CONSTRAINT valid_theme CHECK (theme IN ('light', 'dark', 'system'))
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add columns to trespass_records if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'is_former_student'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN is_former_student boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trespass_records' AND column_name = 'expiration_date'
  ) THEN
    ALTER TABLE trespass_records ADD COLUMN expiration_date date;
  END IF;
END $$;

-- Update status constraint
ALTER TABLE trespass_records DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE trespass_records ADD CONSTRAINT valid_status CHECK (status IN ('active', 'inactive'));

-- Create trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);