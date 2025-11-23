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
  incident_date: string | null;                        // Optional
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
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: string;                                          // Clerk user ID (e.g., "user_2abc...")
  email: string | null;                                // User email from Clerk
  display_name: string | null;
  role: 'viewer' | 'campus_admin' | 'district_admin' | 'master_admin';
  tenant_id: string | null;                            // Tenant ID (nullable for feedback-only users)
  campus_id: string | null;                            // Campus ID for campus_admin users
  user_type: 'tenant_user' | 'feedback_user';         // User type: tenant or feedback-only
  display_organization: string | null;                 // Organization name shown publicly
  show_organization: boolean;                          // Whether to show org name on feedback
  theme: 'light' | 'dark' | 'system';
  status: 'active' | 'inactive' | 'invited';          // User account status
  notifications_enabled: boolean;                      // Whether user wants expiration notifications
  notification_days: number | null;                    // Days before expiration to show warnings
  active_tenant_id: string | null;                     // Active tenant for master admins (tenant switching)
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
