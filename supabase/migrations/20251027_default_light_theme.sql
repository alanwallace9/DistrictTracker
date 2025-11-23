-- Migration: Default to Light Theme
-- Description: Changes the default theme from 'system' to 'light' for better user experience
-- Date: 2025-10-27

-- Update existing users who have 'system' theme to 'light' theme
UPDATE user_profiles
SET theme = 'light'
WHERE theme = 'system';

-- Alter the default value for the theme column to 'light'
ALTER TABLE user_profiles
ALTER COLUMN theme SET DEFAULT 'light';

-- Add a comment to document the change
COMMENT ON COLUMN user_profiles.theme IS 'User theme preference: light, dark, or system. Defaults to light for better accessibility.';
