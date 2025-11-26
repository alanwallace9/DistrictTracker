-- Migration: update_behavior_categories_columns
-- Story 1.10: Align daep_behavior_categories columns with server actions
-- Purpose: Rename columns and add description field for behavior categories
-- Author: Claude Opus 4.5
-- Date: 2025-11-25

-- =====================================================
-- SECTION 1: Rename existing columns to match code
-- =====================================================

-- Rename category_name to name
ALTER TABLE daep_behavior_categories
  RENAME COLUMN category_name TO name;

-- Rename sort_order to display_order
ALTER TABLE daep_behavior_categories
  RENAME COLUMN sort_order TO display_order;

-- Rename active to is_active
ALTER TABLE daep_behavior_categories
  RENAME COLUMN active TO is_active;

-- =====================================================
-- SECTION 2: Add missing columns
-- =====================================================

-- Add description column
ALTER TABLE daep_behavior_categories
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Add updated_at column for tracking changes
ALTER TABLE daep_behavior_categories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- SECTION 3: Update unique constraint
-- =====================================================

-- Drop old constraint that references category_name
ALTER TABLE daep_behavior_categories
  DROP CONSTRAINT IF EXISTS daep_behavior_categories_tenant_id_category_name_key;

-- Create new constraint with renamed column
ALTER TABLE daep_behavior_categories
  ADD CONSTRAINT daep_behavior_categories_tenant_id_name_key UNIQUE (tenant_id, name);

-- =====================================================
-- SECTION 4: Add updated_at trigger
-- =====================================================

CREATE TRIGGER update_daep_behavior_categories_updated_at
  BEFORE UPDATE ON daep_behavior_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SECTION 5: Add index for display_order
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_daep_behavior_categories_tenant ON daep_behavior_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_behavior_categories_order ON daep_behavior_categories(tenant_id, display_order);

COMMENT ON COLUMN daep_behavior_categories.name IS 'Display name for the behavior category';
COMMENT ON COLUMN daep_behavior_categories.description IS 'Optional description of the category';
COMMENT ON COLUMN daep_behavior_categories.category_type IS 'Type: positive, negative, or neutral';
COMMENT ON COLUMN daep_behavior_categories.display_order IS 'Sort order for UI display';
COMMENT ON COLUMN daep_behavior_categories.is_active IS 'Soft delete flag - inactive categories not shown in dropdowns';
