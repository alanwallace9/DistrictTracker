-- Migration: Rename is_former_student to is_current_student with inverted logic
-- Date: 2025-11-10
-- Purpose: Better workflow - default to "current student" checked, uncheck when they withdraw
--
-- This migration:
-- 1. Renames the column
-- 2. Inverts the boolean logic (former=true becomes current=false)
-- 3. Updates the default to true (most trespass records are for current students)

-- Rename column
ALTER TABLE trespass_records
RENAME COLUMN is_former_student TO is_current_student;

-- Invert the boolean logic for existing records
-- (what was "is former student = true" becomes "is current student = false")
UPDATE trespass_records
SET is_current_student = NOT is_current_student;

-- Update default to true (most records created are for current students)
ALTER TABLE trespass_records
ALTER COLUMN is_current_student SET DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN trespass_records.is_current_student IS
'True if the person is currently enrolled as a student in this district. False if they have withdrawn or graduated. Default is true since most trespass records are created for current students.';
