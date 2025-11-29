# Story 1.1: DAEP Database Schema Migration

**Status:** done
**Epic:** 1a - Core Schema & Security
**Points:** 8
**Priority:** P0

---

## Story

**As a** developer
**I want** all DAEP tables created with proper indexes and RLS policies
**So that** subsequent stories have the data foundation they need

---

## Acceptance Criteria

| AC# | Criteria | Status |
|-----|----------|--------|
| 1.1.1 | Migration creates all 17 DAEP tables per architecture.md schema | DONE |
| 1.1.2 | All tables have `tenant_id` column with NOT NULL constraint | DONE |
| 1.1.3 | RLS policies enabled on all tables filtering by `tenant_id` | DONE |
| 1.1.4 | Indexes created on `tenant_id`, `school_id`, `placement_id`, `date` columns | DONE |
| 1.1.5 | `updated_at` triggers created for applicable tables | DONE |
| 1.1.6 | Migration runs successfully on staging | DONE |
| 1.1.7 | No breaking changes to existing TrespassTracker tables | DONE |

---

## Tables Created

### Configuration Tables (7)
1. `daep_rooms` - DAEP classroom configuration
2. `daep_room_staff` - Staff-to-room assignments
3. `daep_bell_schedules` - Bell schedule configurations
4. `daep_school_calendar` - School calendar for days served calculation
5. `daep_discipline_codes` - Texas PEIMS discipline codes
6. `daep_behavior_categories` - Configurable behavior categories
7. `daep_point_bonus_rules` - Bonus point rules and milestones

### Core Tables (4)
8. `daep_placements` - DAEP placement records (main table)
9. `daep_daily_points` - Point tracking per student/period/day
10. `daep_attendance` - Attendance tracking per student/period/day
11. `daep_behavior_notes` - Detailed behavior incident notes

### Support Tables (2)
12. `daep_student_separations` - Students who must be kept apart
13. `daep_notifications` - In-app notification queue

### CSV Reconciliation Tables (4)
14. `daep_csv_field_mappings` - SIS-specific CSV column mappings
15. `daep_reconciliation_sessions` - CSV reconciliation upload sessions
16. `daep_reconciliation_discrepancies` - Individual discrepancies found
17. `daep_reconciliation_audit` - Audit trail for reconciliation actions

---

## Extended Existing Tables

### trespass_records (7 new columns)
- `grade_level` (INT) - Student grade level
- `parent_email` (TEXT) - Parent/guardian email for DAEP notifications
- `emergency_contact_name` (TEXT) - Emergency contact name
- `emergency_contact_phone` (TEXT) - Emergency contact phone
- `special_education` (BOOLEAN) - Student has IEP
- `plan_504` (BOOLEAN) - Student has 504 plan
- `ell_status` (BOOLEAN) - English Language Learner status

### admin_audit_log (1 new column)
- `module` (TEXT) - Module identifier: 'trespass_tracker' or 'daep_management'

---

## Dev Notes

### Migration Files
- `supabase/migrations/20251124221840_create_daep_schema.sql` (local file, comprehensive)
- Applied via Supabase MCP in 2 parts (tables, then indexes/RLS/triggers)

### Key Design Decisions
- Used TEXT for `campus_id` references (matches existing campuses.id type)
- Created `get_current_tenant_id()` helper function for RLS policies
- Added `calculate_days_remaining` trigger for automatic calculation
- Added `check_90day_assessment` trigger for auto-flagging long placements

### TypeScript Types Added
- 17 new types in `lib/supabase.ts` for all DAEP tables
- Updated `TrespassRecord` type with new DAEP fields

---

## File List

| Action | File Path |
|--------|-----------|
| NEW | `supabase/migrations/20251124221840_create_daep_schema.sql` |
| MODIFIED | `lib/supabase.ts` (added 7 fields to TrespassRecord, 17 new DAEP types) |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2025-11-24 | DEV Agent (Opus 4.5) | Implementation complete: 17 tables, RLS, indexes, triggers, types |
