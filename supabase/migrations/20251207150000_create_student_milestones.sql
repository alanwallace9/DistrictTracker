-- Migration: create_student_milestones
-- Story 3-7: Cumulative Points & Milestones
-- Purpose: Create milestone tracking table and seed default milestone rules

-- =====================================================
-- SECTION 1: Create daep_student_milestones table
-- =====================================================

CREATE TABLE IF NOT EXISTS daep_student_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  placement_id UUID NOT NULL REFERENCES daep_placements(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES daep_point_bonus_rules(id),
  points_at_achievement INT NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  awarded_by TEXT,  -- Clerk user_id who triggered the award
  award_type TEXT NOT NULL DEFAULT 'auto',  -- 'auto' | 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, placement_id, rule_id)
);

COMMENT ON TABLE daep_student_milestones IS 'Tracks milestone badge achievements per placement';
COMMENT ON COLUMN daep_student_milestones.award_type IS 'auto = system awarded when threshold crossed, manual = admin granted';

-- =====================================================
-- SECTION 2: Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_daep_milestones_tenant ON daep_student_milestones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daep_milestones_placement ON daep_student_milestones(placement_id);
CREATE INDEX IF NOT EXISTS idx_daep_milestones_rule ON daep_student_milestones(rule_id);

-- =====================================================
-- SECTION 3: Row Level Security
-- =====================================================

ALTER TABLE daep_student_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daep_student_milestones_tenant_isolation" ON daep_student_milestones
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- =====================================================
-- SECTION 4: Seed default milestone rules (if none exist)
-- =====================================================

-- Insert default milestones only if no milestone rules exist for this trigger_type
INSERT INTO daep_point_bonus_rules (tenant_id, rule_name, trigger_type, trigger_value, bonus_points, badge_name, active)
SELECT
  t.id as tenant_id,
  m.rule_name,
  'milestone' as trigger_type,
  m.trigger_value,
  m.bonus_points,
  m.badge_name,
  true as active
FROM tenants t
CROSS JOIN (
  VALUES
    ('100 Point Milestone', 100, 0, '100 Club'),
    ('250 Point Milestone', 250, 0, '250 Club'),
    ('500 Point Milestone', 500, 0, '500 Club'),
    ('1000 Point Milestone', 1000, 5, '1000 Club'),
    ('1500 Point Milestone', 1500, 5, '1500 Club'),
    ('2000 Point Milestone', 2000, 10, '2000 Club')
) AS m(rule_name, trigger_value, bonus_points, badge_name)
WHERE NOT EXISTS (
  SELECT 1 FROM daep_point_bonus_rules r
  WHERE r.tenant_id = t.id AND r.trigger_type = 'milestone'
);
