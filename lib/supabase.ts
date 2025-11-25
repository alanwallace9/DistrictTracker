import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Real Supabase client - connected to your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type TrespassRecord = {
  id: string;
  user_id: string;
  tenant_id: string;                                   // Tenant ID for multi-tenancy (required)
  campus_id: string | null;                            // Campus ID for campus assignment (optional)
  first_name: string;
  last_name: string;
  school_id: string;                                   // Required - Student ID
  expiration_date: string;                             // Required - When trespass order expires
  trespassed_from: string;                             // Required - Location trespassed from
  aka: string | null;
  date_of_birth: string | null;
  incident_date: string | null;                        // Optional - Original incident date (also used for DAEP linking)
  incident_number: string | null;                      // SIS incident number for DAEP placement linking (CSV reconciliation)
  incident_location: string | null;                    // Optional - Renamed from 'location'
  description: string | null;                          // Optional
  affiliation: string | null;                          // Renamed from 'known_associates'
  current_school: string | null;
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  school_contact: string | null;                       // Renamed from 'contact_info'
  notes: string | null;
  photo: string | null;                                // Renamed from 'photo_url'
  status: 'active' | 'inactive';
  is_current_student: boolean;
  is_daep: boolean;                                    // DAEP assignment flag
  daep_expiration_date: string | null;                 // DAEP assignment expiration date (separate from trespass)
  // DAEP-specific fields (Story 1.1)
  grade_level: number | null;                          // Student grade level (9-12 for high school DAEP)
  parent_email: string | null;                         // Parent/guardian email for DAEP notifications
  emergency_contact_name: string | null;               // Emergency contact name for DAEP
  emergency_contact_phone: string | null;              // Emergency contact phone for DAEP
  special_education: boolean;                          // Student has IEP (special education)
  plan_504: boolean;                                   // Student has 504 plan
  ell_status: boolean;                                 // English Language Learner status
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: string;                                          // Clerk user ID (e.g., "user_2abc...")
  email: string | null;                                // User email from Clerk
  display_name: string | null;
  role: 'viewer' | 'campus_admin' | 'district_admin' | 'master_admin' | 'daep_admin_l1' | 'daep_admin_l2' | 'daep_staff' | 'parent' | 'student' | 'counselor';
  tenant_id: string | null;                            // Tenant ID (nullable for feedback-only users)
  campus_id: string | null;                            // Campus ID for campus_admin users
  user_type: 'tenant_user' | 'feedback_user';         // User type: tenant or feedback-only
  module_access: 'trespass_only' | 'daep_only' | 'both';  // Which modules user can access (Story 1.2)
  display_organization: string | null;                 // Organization name shown publicly
  show_organization: boolean;                          // Whether to show org name on feedback
  theme: 'light' | 'dark' | 'system';
  status: 'active' | 'inactive' | 'invited';          // User account status
  notifications_enabled: boolean;                      // Whether user wants expiration notifications
  notification_days: number | null;                    // Days before expiration to show warnings
  active_tenant_id: string | null;                     // Active tenant for master admins (tenant switching)
  approved_teacher: boolean;                          // When true, point entries auto-approved (daep_staff/daep_admin_l2 only)
  deleted_at: string | null;                          // Soft delete timestamp
  created_at: string;
  updated_at: string;
};

export type Tenant = {
  id: string;                                          // Tenant identifier (e.g., 'birdville', 'demo')
  subdomain: string;                                   // Subdomain for routing (e.g., 'birdville')
  display_name: string;                                // Human-readable name (e.g., 'Birdville ISD')
  short_display_name: string | null;                   // Short name shown on dashboard (e.g., 'BISD', 'DEMO')
  status: 'active' | 'suspended' | 'trial';
  created_at: string;
  updated_at: string;
};

export type Campus = {
  id: string;                                          // Campus identifier (e.g., '010', '042')
  tenant_id: string;                                   // Tenant ID for multi-tenancy
  name: string;                                        // Human-readable name (e.g., 'Birdville HS')
  abbreviation: string | null;                         // Short name or number (e.g., '010')
  status: 'active' | 'inactive';
  deleted_at: string | null;                          // Soft delete timestamp
  created_at: string;
  updated_at: string;
};

export type RecordPhoto = {
  id: string;
  record_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  display_order: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

export type RecordDocument = {
  id: string;
  record_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

// =====================================================
// FEEDBACK SYSTEM TYPES
// =====================================================

export type FeedbackCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type FeedbackSubmission = {
  id: string;
  user_id: string;
  tenant_id: string | null;
  category_id: string;
  feedback_type: 'bug' | 'feature_request' | 'improvement' | 'question' | 'other';
  title: string;
  slug: string;
  description: string | null;
  status: 'under_review' | 'planned' | 'in_progress' | 'completed' | 'declined';
  status_changed_at: string;
  roadmap_notes: string | null;
  planned_release: string | null;
  admin_notes: string | null;
  admin_response: string | null;
  upvote_count: number;
  comment_count: number;
  share_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type FeedbackUpvote = {
  id: string;
  feedback_id: string;
  user_id: string;
  created_at: string;
};

export type FeedbackImage = {
  id: string;
  feedback_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
};

export type FeedbackComment = {
  id: string;
  feedback_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  is_admin_response: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// =====================================================
// DEMO SEED SNAPSHOTS
// =====================================================

export type DemoSeedSnapshot = {
  id: string;
  campuses_snapshot: Campus[];
  records_snapshot: TrespassRecord[];
  snapshot_count_campuses: number;
  snapshot_count_records: number;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
};

// =====================================================
// DAEP MODULE TYPES (Story 1.1)
// =====================================================

export type DaepRoom = {
  id: string;
  tenant_id: string;
  campus_id: string | null;
  room_number: string;
  room_name: string | null;
  capacity: number;
  active: boolean;
  building_section: string | null;                     // For student separation logic ("501-505", "506-509")
  created_at: string;
  updated_at: string;
};

export type DaepRoomStaff = {
  id: string;
  tenant_id: string;
  room_id: string;
  user_id: string;                                     // Clerk user_id
  assignment_type: 'homeroom' | 'rotational';
  created_at: string;
};

export type DaepBellSchedule = {
  id: string;
  tenant_id: string;
  campus_id: string | null;
  schedule_name: string;                               // "Regular Day", "Early Release", "Half Day"
  periods: { period: string; start_time: string; end_time: string }[];
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DaepSchoolCalendar = {
  id: string;
  tenant_id: string;
  school_year: string;                                 // "2024-2025"
  date: string;
  is_school_day: boolean;
  day_type: string | null;                             // "Regular", "Holiday", "Teacher Workday", "Bad Weather"
  bell_schedule_id: string | null;
  notes: string | null;
  created_at: string;
};

export type DaepDisciplineCode = {
  id: string;
  tenant_id: string;
  code: string;                                        // Texas PEIMS code
  label: string;
  mandatory_placement: boolean;
  behavior_location: string | null;                    // "on_campus", "off_campus", "school_sponsored"
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DaepBehaviorCategory = {
  id: string;
  tenant_id: string;
  category_name: string;
  category_type: 'positive' | 'negative' | 'neutral';
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type DaepPointBonusRule = {
  id: string;
  tenant_id: string;
  rule_name: string;
  trigger_type: 'perfect_streak' | 'milestone' | 'manual';
  trigger_value: number | null;
  bonus_points: number;
  badge_name: string | null;
  active: boolean;
  created_at: string;
};

export type DaepPlacement = {
  id: string;
  tenant_id: string;
  school_id: string;                                   // References trespass_records.school_id
  incident_number: string;                             // Unique per placement
  placement_date: string;                              // Date placement was approved
  start_date: string;                                  // First day at DAEP
  days_assigned: number;
  days_served: number;
  days_remaining: number | null;                       // Calculated via trigger
  expected_end_date: string | null;
  actual_end_date: string | null;
  offense_code: string;
  placement_reason: string;
  mandatory_placement: boolean;
  home_campus_id: string | null;
  assigned_room_id: string | null;
  status: 'pending' | 'active' | 'transition' | 'complete';
  transition_requested_date: string | null;
  transition_approved_date: string | null;
  transition_meeting_date: string | null;
  first_day_back_date: string | null;
  rollover_student: boolean;
  rollover_decision: 'continue' | 'reset' | null;
  no_show: boolean;
  assessment_90day_required: boolean;
  assessment_90day_date: string | null;
  assessment_90day_scores: { math?: number; reading?: number } | null;
  assessment_120day_date: string | null;
  intake_notes: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DaepDailyPoints = {
  id: string;
  tenant_id: string;
  placement_id: string;
  date: string;
  period: string;                                      // "1st", "2nd", "3rd", etc.
  points_earned: number;                               // 0-10
  student_action: string | null;                       // "On Task", "Helped Peer", "Talk Back", etc.
  teacher_action: string | null;                       // "Redirected", "Called Home", "Conference", etc.
  notes: string | null;
  entered_by: string;                                  // Clerk user_id
  approved_by: string | null;                          // Clerk user_id
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  public: boolean;
  created_at: string;
  updated_at: string;
};

export type DaepAttendance = {
  id: string;
  tenant_id: string;
  placement_id: string;
  date: string;
  period: string;
  status: 'P' | 'A' | 'T' | 'ED';                      // Present, Absent, Tardy, Early Dismissal
  tardy_time: string | null;
  early_dismiss_time: string | null;
  excused: boolean;
  excuse_reason: string | null;
  counts_toward_days_served: boolean;
  notes: string | null;
  entered_by: string;
  created_at: string;
  updated_at: string;
};

export type DaepBehaviorNote = {
  id: string;
  tenant_id: string;
  placement_id: string;
  date: string;
  time: string;
  category: string | null;                             // "Positive", "Negative", "Neutral"
  description: string;
  action_taken: string | null;
  staff_member: string;                                // Clerk user_id
  created_at: string;
  updated_at: string;
};

export type DaepStudentSeparation = {
  id: string;
  tenant_id: string;
  student_a_id: string;                                // References trespass_records.school_id
  student_b_id: string;                                // References trespass_records.school_id
  reason: string;
  active: boolean;
  created_by: string;
  created_at: string;
  expires_at: string | null;
};

export type DaepNotification = {
  id: string;
  tenant_id: string;
  user_id: string;                                     // Clerk user_id (recipient)
  notification_type: 'return_reminder' | 'absent_streak' | 'below_threshold' | 'approval_pending';
  title: string;
  message: string;
  related_school_id: string | null;
  related_placement_id: string | null;
  action_url: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
};

export type DaepCsvFieldMapping = {
  id: string;
  tenant_id: string;
  sis_name: string;                                    // "Skyward", "Focus", "PowerSchool"
  field_mappings: Record<string, string>;              // { "student_id": "StudentNumber", ... }
  created_at: string;
  updated_at: string;
};

export type DaepReconciliationSession = {
  id: string;
  tenant_id: string;
  uploaded_by: string;                                 // Clerk user_id
  upload_date: string;
  file_name: string;
  file_url: string;                                    // Supabase Storage URL
  total_records: number;
  matched_count: number;
  discrepancy_count: number;
  new_in_sis_count: number;
  missing_from_sis_count: number;
  status: 'pending' | 'in_review' | 'completed';
  completed_at: string | null;
  created_at: string;
};

export type DaepReconciliationDiscrepancy = {
  id: string;
  session_id: string;
  student_id: string | null;
  discrepancy_type: 'field_conflict' | 'new_in_sis' | 'missing_from_sis';
  sis_data: Record<string, unknown>;
  daep_data: Record<string, unknown> | null;
  conflicts: { field: string; sis_value: unknown; daep_value: unknown }[] | null;
  resolution: 'accept_sis' | 'keep_daep' | 'pending' | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type DaepReconciliationAudit = {
  id: string;
  session_id: string;
  discrepancy_id: string | null;
  action: 'session_started' | 'discrepancy_resolved' | 'session_completed';
  actor_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
};
