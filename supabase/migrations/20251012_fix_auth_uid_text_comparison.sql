-- Fix auth.uid() text/uuid comparison issues with Clerk authentication
-- The auth.uid() function returns UUID, but Clerk user IDs are TEXT
-- This migration updates all functions to use auth.jwt() ->> 'sub' instead

-- Update get_my_role_from_db function to use Clerk JWT
CREATE OR REPLACE FUNCTION get_my_role_from_db()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
  user_id_from_jwt TEXT;
BEGIN
  -- Extract Clerk user ID from JWT token
  user_id_from_jwt := auth.jwt() ->> 'sub';

  -- If no JWT or no sub claim, return viewer role
  IF user_id_from_jwt IS NULL THEN
    RETURN 'viewer';
  END IF;

  -- Look up role in user_profiles table
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id_from_jwt;

  RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_user_role function to use Clerk JWT (if it exists)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
  user_id_from_jwt TEXT;
BEGIN
  -- Extract Clerk user ID from JWT token
  user_id_from_jwt := auth.jwt() ->> 'sub';

  -- If no JWT or no sub claim, return viewer role
  IF user_id_from_jwt IS NULL THEN
    RETURN NULL;
  END IF;

  -- Look up role in user_profiles table
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id_from_jwt;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
