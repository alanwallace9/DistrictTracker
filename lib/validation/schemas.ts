/**
 * Zod validation schemas for input validation
 * Prevents injection attacks and ensures data integrity
 */

import { z } from 'zod';

// ============================================================================
// TRESPASS RECORD SCHEMAS
// ============================================================================

export const CreateRecordSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  middle_name: z.string().max(50, 'Middle name too long').optional().nullable(),
  school_id: z.string().min(1, 'School ID is required').max(50, 'School ID too long'),

  // Date validation - must be valid ISO date string
  date_of_birth: z.string().datetime().optional().nullable(),
  expiration_date: z.string().datetime().optional().nullable(),
  daep_expiration_date: z.string().datetime().optional().nullable(),

  // Optional contact info with format validation
  email: z.string().email('Invalid email format').max(255).optional().nullable(),
  phone: z.string()
    .regex(/^\d{10}$/, 'Phone must be 10 digits')
    .optional()
    .nullable()
    .or(z.literal('')),

  // Optional address fields
  address: z.string().max(500, 'Address too long').optional().nullable(),
  city: z.string().max(100, 'City name too long').optional().nullable(),
  state: z.string().max(2, 'State must be 2 characters').optional().nullable(),
  zip: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code')
    .optional()
    .nullable()
    .or(z.literal('')),

  // Optional fields
  description: z.string().max(5000, 'Description too long').optional().nullable(),
  incident_date: z.string().datetime().optional().nullable(),

  // Status and flags
  status: z.enum(['active', 'inactive', 'expired']).optional(),
  is_student: z.boolean().optional(),
  is_daep: z.boolean().optional(),

  // Foreign keys (campus uses short codes, not UUIDs)
  campus_id: z.string().max(50).optional().nullable(),
  daep_campus_id: z.string().max(50).optional().nullable(),
});

export const UpdateRecordSchema = CreateRecordSchema.partial();

// ============================================================================
// FEEDBACK SCHEMAS
// ============================================================================

export const CreateFeedbackSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  feedback_type: z.enum(['feature_request', 'bug']),
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .max(5000, 'Description too long')
    .optional()
    .nullable(),
});

export const UpdateFeedbackStatusSchema = z.object({
  status: z.enum(['under_review', 'planned', 'in_progress', 'completed', 'declined']),
  admin_response: z.string().max(5000, 'Response too long').optional().nullable(),
  roadmap_notes: z.string().max(2000, 'Notes too long').optional().nullable(),
  planned_release: z.string().max(50, 'Release version too long').optional().nullable(),
  is_public: z.boolean().optional(),
});

export const CreateCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment too long'),
});

// ============================================================================
// USER PROFILE SCHEMAS
// ============================================================================

export const UpdateUserProfileSchema = z.object({
  display_name: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name too long')
    .optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notification_days: z.number()
    .int('Must be a whole number')
    .min(0, 'Must be 0 or greater')
    .max(365, 'Cannot exceed 365 days')
    .optional(),
});

// ============================================================================
// CAMPUS SCHEMAS
// ============================================================================

export const CreateCampusSchema = z.object({
  name: z.string().min(1, 'Campus name is required').max(200, 'Name too long'),
  code: z.string().min(1, 'Campus code is required').max(50, 'Code too long'),
  address: z.string().max(500, 'Address too long').optional().nullable(),
  city: z.string().max(100, 'City name too long').optional().nullable(),
  state: z.string().max(2, 'State must be 2 characters').optional().nullable(),
  zip: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code')
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z.string()
    .regex(/^\d{10}$/, 'Phone must be 10 digits')
    .optional()
    .nullable()
    .or(z.literal('')),
  is_daep: z.boolean().optional(),
});

export const UpdateCampusSchema = CreateCampusSchema.partial();

// ============================================================================
// DAEP ROOM GROUP SCHEMAS (Story 3-0)
// ============================================================================

export const DAEPRoomGroupSchema = z.object({
  group_name: z.string().min(1, 'Group name is required').max(50, 'Group name too long'),
  description: z.string().max(200, 'Description too long').optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#6B7280'),
  sort_order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export type CreateDAEPRoomGroupInput = z.infer<typeof DAEPRoomGroupSchema>;

// ============================================================================
// DAEP ROOM SCHEMAS
// ============================================================================

export const DAEPRoomSchema = z.object({
  room_number: z.string().min(1, 'Room number is required').max(20, 'Room number too long'),
  room_name: z.string().max(100, 'Room name too long').optional().nullable(),
  campus_id: z.string().min(1, 'Campus is required'),
  capacity: z.number().int('Must be a whole number').min(1, 'Minimum 1').max(50, 'Maximum 50').default(15),
  building_section: z.string().max(50, 'Building section too long').optional().nullable(),
  room_group_id: z.string().uuid('Invalid group ID').optional().nullable(),
  active: z.boolean().default(true),
});

export const DAEPRoomStaffSchema = z.object({
  room_id: z.string().uuid('Invalid room ID'),
  user_id: z.string().min(1, 'Staff member is required'),
  assignment_type: z.enum(['homeroom', 'rotational']).default('homeroom'),
});

export type CreateDAEPRoomInput = z.infer<typeof DAEPRoomSchema>;
export type CreateDAEPRoomStaffInput = z.infer<typeof DAEPRoomStaffSchema>;

// ============================================================================
// DAEP BELL SCHEDULE SCHEMAS
// ============================================================================

export const BellSchedulePeriodSchema = z.object({
  period_name: z.string().min(1, 'Period name is required').max(20, 'Period name too long'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
  requires_attendance: z.boolean().default(true),  // Story 3-9: Should staff take attendance this period?
  grants_points: z.boolean().default(true),        // Story 3-9: Does this period grant base points?
});

export const BellScheduleSchema = z.object({
  schedule_name: z.string().min(1, 'Schedule name is required').max(100, 'Schedule name too long'),
  schedule_type: z.enum(['regular', 'early_release', 'half_day', 'custom']).default('regular'),
  campus_id: z.string().min(1, 'Campus is required'),
  periods: z.array(BellSchedulePeriodSchema)
    .min(1, 'At least one period is required')
    .max(12, 'Maximum 12 periods allowed'),
  is_default: z.boolean().default(false),
  active: z.boolean().default(true),
}).refine(
  (data) => {
    // Validate periods: start_time < end_time for each period
    for (const period of data.periods) {
      if (period.start_time >= period.end_time) {
        return false;
      }
    }
    return true;
  },
  { message: 'Each period start time must be before end time' }
).refine(
  (data) => {
    // Validate no overlapping periods
    const sorted = [...data.periods].sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].end_time > sorted[i + 1].start_time) {
        return false;
      }
    }
    return true;
  },
  { message: 'Period times cannot overlap' }
);

export type BellSchedulePeriod = z.infer<typeof BellSchedulePeriodSchema>;
export type CreateBellScheduleInput = z.infer<typeof BellScheduleSchema>;

// ============================================================================
// DAEP DISCIPLINE CODE SCHEMAS
// ============================================================================

export const DisciplineCodeSchema = z.object({
  code: z.string().min(1, 'PEIMS code is required').max(20, 'Code too long'),
  label: z.string().min(1, 'Label is required').max(200, 'Label too long'),
  mandatory_placement: z.boolean().default(false),
  behavior_location: z.enum(['on_campus', 'off_campus', 'school_sponsored']).nullable().optional(),
  active: z.boolean().default(true),
});

export type CreateDisciplineCodeInput = z.infer<typeof DisciplineCodeSchema>;

// ============================================================================
// DAEP SCHOOL CALENDAR SCHEMAS
// ============================================================================

export const DAY_TYPES = [
  'Regular',
  'Holiday',
  'Teacher Workday',
  'Bad Weather',
  'Early Release',
] as const;

export type DayType = (typeof DAY_TYPES)[number];

export const SchoolCalendarEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  school_year: z.string().regex(/^\d{4}-\d{4}$/, 'School year must be in format YYYY-YYYY'),
  is_school_day: z.boolean().default(true),
  day_type: z.enum(DAY_TYPES).nullable().optional(),
  bell_schedule_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(500, 'Notes too long').nullable().optional(),
});

export const SchoolCalendarCSVRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  is_school_day: z.preprocess(
    (val) => val === 'true' || val === '1' || val === true,
    z.boolean()
  ),
  day_type: z.string().nullable().optional(),
});

export type CreateSchoolCalendarEntryInput = z.infer<typeof SchoolCalendarEntrySchema>;
export type SchoolCalendarCSVRow = z.infer<typeof SchoolCalendarCSVRowSchema>;

// ============================================================================
// DAEP SETTINGS SCHEMAS
// ============================================================================

export const TIMEZONES = [
  'America/New_York',      // EST/EDT - Eastern
  'America/Chicago',       // CST/CDT - Central
  'America/Denver',        // MST/MDT - Mountain
  'America/Phoenix',       // MST (no DST) - Arizona
  'America/Los_Angeles',   // PST/PDT - Pacific
  'America/Anchorage',     // AKST/AKDT - Alaska
  'Pacific/Honolulu',      // HST - Hawaii
] as const;

export type Timezone = (typeof TIMEZONES)[number];

export const DistrictDAEPSettingsSchema = z.object({
  timezone: z.enum(TIMEZONES).default('America/Chicago'),
  default_points_per_period: z.number().int().min(1).max(100).default(10),
  attendance_threshold: z.number().int().min(0).max(100).default(85),
  point_threshold_warning: z.number().int().min(1).max(100).default(7),
  school_year: z.string().regex(/^\d{4}-\d{4}$/).nullable().optional(),
  // Story 3-11: ADA attendance period - the period used for daily attendance rate calculation
  // This is the period that determines if a student is "present" for the day (for ADA reporting)
  // Other periods are for points tracking only
  ada_attendance_period: z.string().max(50).nullable().optional(),
});

export const CampusDAEPSettingsSchema = z.object({
  daep_campus_name: z.string().max(200, 'Name too long').nullable().optional(),
  daep_campus_address: z.string().max(500, 'Address too long').nullable().optional(),
  daep_campus_phone: z.string()
    .regex(/^\d{10}$/, 'Phone must be 10 digits')
    .nullable()
    .optional()
    .or(z.literal('')),
  max_room_capacity: z.number().int().min(1).max(100).default(15),
});

export type DistrictDAEPSettings = z.infer<typeof DistrictDAEPSettingsSchema>;
export type CampusDAEPSettings = z.infer<typeof CampusDAEPSettingsSchema>;

// ============================================================================
// DAEP BEHAVIOR CATEGORY SCHEMAS
// ============================================================================

export const BEHAVIOR_CATEGORY_TYPES = ['positive', 'negative', 'neutral', 'bonus'] as const;

export type BehaviorCategoryType = (typeof BEHAVIOR_CATEGORY_TYPES)[number];

export const BehaviorCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Name too long'),
  description: z.string().max(200, 'Description too long').nullable().optional(),
  category_type: z.enum(BEHAVIOR_CATEGORY_TYPES).default('neutral'),
  display_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export type CreateBehaviorCategoryInput = z.infer<typeof BehaviorCategorySchema>;

// ============================================================================
// DAEP STUDENT SEARCH SCHEMAS
// ============================================================================

export const PLACEMENT_STATUSES = ['pending', 'active', 'met', 'complete'] as const;

export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number];

export const StudentSearchSchema = z.object({
  query: z.string().max(200, 'Search query too long').optional(),
  status: z.enum(PLACEMENT_STATUSES).optional(),
  room_id: z.string().uuid('Invalid room ID').optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(25),
});

export type StudentSearchInput = z.infer<typeof StudentSearchSchema>;

// ============================================================================
// DAEP PLACEMENT SCHEMAS
// ============================================================================

export const CreatePlacementSchema = z.object({
  school_id: z.string().min(1, 'Student ID is required'),
  incident_number: z.string().min(1, 'Incident number is required').max(50, 'Incident number too long'),
  placement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  days_assigned: z.number().int('Must be a whole number').min(1, 'Must assign at least 1 day').max(365, 'Cannot exceed 365 days'),
  offense_code: z.string().min(1, 'Offense code is required'),
  location_code: z.string().min(1, 'Location code is required'),
  placement_reason: z.string().min(10, 'Reason must be at least 10 characters').max(2000, 'Reason too long'),
  mandatory_placement: z.boolean().default(false),
  home_campus_id: z.string().min(1, 'Home campus is required'),
  assigning_campus_id: z.string().optional(),
  intake_notes: z.string().max(2000, 'Notes too long').optional(),
});

export type CreatePlacementInput = z.infer<typeof CreatePlacementSchema>;

// ============================================================================
// QUICK STUDENT CREATION (for placement form)
// ============================================================================

export const QuickStudentSchema = z.object({
  school_id: z.string().min(1, 'Student ID is required').max(50, 'Student ID too long'),
  first_name: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  grade_level: z.number().int().min(1).max(12).nullable().optional(),
  current_school: z.string().max(200).nullable().optional(),
  campus_id: z.string().max(50).nullable().optional(),
});

export type QuickStudentInput = z.infer<typeof QuickStudentSchema>;

// ============================================================================
// DAEP PLACEMENT VALIDATION SCHEMAS (Story 2-10)
// ============================================================================

export const CheckActivePlacementSchema = z.object({
  schoolId: z.string().min(1, 'Student ID is required'),
  excludePlacementId: z.string().uuid('Invalid placement ID').optional(),
});

export const ValidatePlacementSchema = z.object({
  schoolId: z.string().min(1, 'Student ID is required'),
  incidentNumber: z.string().min(1, 'Incident number is required'),
  excludePlacementId: z.string().uuid('Invalid placement ID').optional(),
});

export type CheckActivePlacementInput = z.infer<typeof CheckActivePlacementSchema>;
export type ValidatePlacementInput = z.infer<typeof ValidatePlacementSchema>;

// ============================================================================
// DAEP PLACEMENT TRANSITION SCHEMAS (Story 2-6)
// ============================================================================

export const PlacementTransitionSchema = z.object({
  placement_id: z.string().uuid('Invalid placement ID'),
  to_status: z.enum(PLACEMENT_STATUSES),
  transition_reason: z.string().max(500, 'Reason too long').optional(),
  notes: z.string().max(2000, 'Notes too long').optional(),
  // Required for met → complete transition
  transition_meeting_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  first_day_back_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
});

export type PlacementTransitionInput = z.infer<typeof PlacementTransitionSchema>;

// ============================================================================
// DAEP UPDATE PLACEMENT SCHEMAS (Story 2-8)
// ============================================================================

export const UpdatePlacementSchema = z.object({
  id: z.string().uuid('Invalid placement ID'),
  days_assigned: z.number().int('Must be a whole number').min(1, 'Must assign at least 1 day').max(365, 'Cannot exceed 365 days').optional(),
  assigned_room_id: z.string().uuid('Invalid room ID').nullable().optional(),
  intake_notes: z.string().max(2000, 'Intake notes too long').optional(),
  completion_notes: z.string().max(2000, 'Completion notes too long').optional(),
  placement_reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000, 'Reason too long').optional(),
  offense_code: z.string().optional(),
});

export type UpdatePlacementInput = z.infer<typeof UpdatePlacementSchema>;

// ============================================================================
// DAEP TRANSITION WORKFLOW SCHEMAS (Story 2-9)
// ============================================================================

export const InitiateTransitionSchema = z.object({
  placement_id: z.string().uuid('Invalid placement ID'),
  transition_meeting_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  campus_contact_name: z.string().min(1, 'Contact name is required').max(100, 'Contact name too long'),
  campus_contact_email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  notes: z.string().max(2000, 'Notes too long').optional(),
});

export type InitiateTransitionInput = z.infer<typeof InitiateTransitionSchema>;

export const CompleteTransitionSchema = z.object({
  placement_id: z.string().uuid('Invalid placement ID'),
  first_day_back_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  meeting_confirmed: z.boolean().refine(val => val === true, {
    message: 'Meeting confirmation is required',
  }),
  completion_notes: z.string().max(2000, 'Notes too long').optional(),
});

export type CompleteTransitionInput = z.infer<typeof CompleteTransitionSchema>;

// ============================================================================
// DAEP NO-SHOW SCHEMAS (Story 2-12)
// ============================================================================

export const MarkNoShowSchema = z.object({
  placement_id: z.string().uuid('Invalid placement ID'),
  reason: z.string().max(2000, 'Reason too long').optional(),
});

export type MarkNoShowInput = z.infer<typeof MarkNoShowSchema>;

// ============================================================================
// DAEP ROOM ASSIGNMENT SCHEMAS (Story 2-5)
// ============================================================================

export const AssignRoomSchema = z.object({
  placement_id: z.string().uuid('Invalid placement ID'),
  room_id: z.string().uuid('Invalid room ID'),
});

export type AssignRoomInput = z.infer<typeof AssignRoomSchema>;

// ============================================================================
// DAEP STUDENT SEPARATION SCHEMAS (Story 2-5)
// ============================================================================

export const CreateSeparationSchema = z.object({
  student_a_id: z.string().min(1, 'Student A is required'),
  student_b_id: z.string().min(1, 'Student B is required'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500, 'Reason too long'),
  expires_at: z.string().datetime().nullable().optional(),
}).refine(data => data.student_a_id !== data.student_b_id, {
  message: 'Cannot create separation between same student',
  path: ['student_b_id'],
});

export type CreateSeparationInput = z.infer<typeof CreateSeparationSchema>;

// ============================================================================
// DAEP ROLLOVER SCHEMAS (Story 2-11)
// ============================================================================

export const RolloverDecisionValues = ['continue_daep', 'return_home'] as const;
export type RolloverDecision = typeof RolloverDecisionValues[number];

export const RolloverDecisionSchema = z.object({
  placement_id: z.string().uuid('Invalid placement ID'),
  decision: z.enum(RolloverDecisionValues, {
    errorMap: () => ({ message: 'Decision must be continue_daep or return_home' }),
  }),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export type RolloverDecisionInput = z.infer<typeof RolloverDecisionSchema>;

export const CreateRolloverPlacementSchema = z.object({
  original_placement_id: z.string().uuid('Invalid original placement ID'),
  days_remaining: z.number().int().min(1, 'Days remaining must be at least 1'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export type CreateRolloverPlacementInput = z.infer<typeof CreateRolloverPlacementSchema>;

export const ApproveRolloverPlacementSchema = z.object({
  placement_id: z.string().uuid('Invalid placement ID'),
  approved: z.boolean(),
  rejection_reason: z.string().max(500, 'Reason too long').optional().nullable(),
});

export type ApproveRolloverPlacementInput = z.infer<typeof ApproveRolloverPlacementSchema>;

// ============================================================================
// DAEP POINT ENTRY SCHEMAS (Story 3-2)
// ============================================================================

export const POINT_ADJUSTMENT_VALUES = [10, 5, 0, -5, -10, -15] as const;
export type PointAdjustmentValue = (typeof POINT_ADJUSTMENT_VALUES)[number];

export const PointAdjustmentSchema = z.object({
  placement_id: z.string().uuid('Invalid placement ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  period: z.string().min(1, 'Period is required'),
  adjustment_value: z.number().refine(
    (val) => POINT_ADJUSTMENT_VALUES.includes(val as PointAdjustmentValue),
    { message: 'Adjustment must be +10, +5, 0, -5, -10, or -15' }
  ),
  student_action: z.string().max(100).nullable().optional(),
  teacher_action: z.string().max(100).nullable().optional(),
  notes: z.string().max(500, 'Notes too long').nullable().optional(),
});

export type PointAdjustmentInput = z.infer<typeof PointAdjustmentSchema>;

// Response types for point summaries
export interface DailyPointEntry {
  id: string;
  placement_id: string;
  period: string;
  points_earned: number;
  is_base_points: boolean;
  student_action: string | null;
  teacher_action: string | null;
  notes: string | null;
  entered_by: string;
  created_at: string;
}

export interface DailyPointsSummary {
  placement_id: string;
  base_points: number;       // Sum of base points (10 per present period)
  adjustments: number;       // Sum of adjustment values
  day_total: number;         // base_points + adjustments
  periods_present: number;   // Count of periods marked present
  expected_points: number;   // periods_present * 10
  percentage: number;        // (day_total / expected_points) * 100, or 0 if no expected
  entries: DailyPointEntry[]; // All entries for the day
}

// ============================================================================
// DAEP ATTENDANCE SCHEMAS (Story 3-9)
// ============================================================================

// Attendance status codes
export const ATTENDANCE_STATUS_CODES = ['P', 'A', 'T', 'ED', 'FT'] as const;
export type AttendanceStatusCode = (typeof ATTENDANCE_STATUS_CODES)[number];

// Points type for attendance status
export const ATTENDANCE_POINTS_TYPES = ['full', 'partial', 'none'] as const;
export type AttendancePointsType = (typeof ATTENDANCE_POINTS_TYPES)[number];

// ============================================================================
// DAEP EXCUSE REASON SCHEMAS (Story 3-10)
// ============================================================================

// Excuse reason categories
export const EXCUSE_REASONS = [
  'court_legal',
  'parole_probation',
  'drivers_license_dps',
  'state_federal_gov',
  'medical',
  'parent_call',
  'other',
] as const;

export type ExcuseReason = (typeof EXCUSE_REASONS)[number];

// Reasons that auto-check "counts toward points" (state/federal government obligations)
export const POINTS_ELIGIBLE_REASONS: ExcuseReason[] = [
  'court_legal',
  'parole_probation',
  'drivers_license_dps',
  'state_federal_gov',
];

// Labels for dropdown display
export const EXCUSE_REASON_LABELS: Record<ExcuseReason, string> = {
  court_legal: 'Court/Legal Appearance',
  parole_probation: 'Parole/Probation Officer',
  drivers_license_dps: "Driver's License (DPS)",
  state_federal_gov: 'State/Federal Government',
  medical: 'Medical (with documentation)',
  parent_call: 'Parent Call',
  other: 'Other',
};

// Order for dropdown (gov't reasons first - most common for DAEP)
export const EXCUSE_REASON_ORDER: ExcuseReason[] = [
  'court_legal',
  'parole_probation',
  'drivers_license_dps',
  'state_federal_gov',
  'medical',
  'parent_call',
  'other',
];

// Admin roles that can set excuse status
export const ADMIN_ROLES = [
  'super_admin',
  'district_admin',
  'daep_admin_l1',
  'daep_admin_l2',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

// Helper to check if role is admin
export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as AdminRole);
}

// ============================================================================
// ATTENDANCE OVERRIDE TYPES (Story 3-12)
// ============================================================================

// Override reason options
export const OVERRIDE_REASONS = [
  'data_entry_error',
  'late_documentation',
  'admin_correction',
  'other',
] as const;

export type OverrideReason = (typeof OVERRIDE_REASONS)[number];

// Labels for override reasons
export const OVERRIDE_REASON_LABELS: Record<OverrideReason, string> = {
  data_entry_error: 'Data Entry Error',
  late_documentation: 'Late Documentation',
  admin_correction: 'Administrative Correction',
  other: 'Other',
};

// Attendance status type (for settings)
export const AttendanceStatusTypeSchema = z.object({
  status_code: z.string().min(1, 'Status code is required').max(10, 'Status code too long'),
  label: z.string().min(1, 'Label is required').max(50, 'Label too long'),
  points_type: z.enum(ATTENDANCE_POINTS_TYPES).default('full'),
  requires_time: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
  is_default: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type AttendanceStatusTypeInput = z.infer<typeof AttendanceStatusTypeSchema>;

// Mark attendance input (Story 3-10: Added excuse fields, Story 3-12: Added override fields)
export const MarkAttendanceSchema = z.object({
  placement_id: z.string().uuid('Invalid placement ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  period: z.string().min(1, 'Period is required'),
  status: z.string().min(1, 'Status is required').max(10, 'Status code too long'),
  tardy_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM').nullable().optional(),
  early_dismiss_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM').nullable().optional(),
  // Story 3-10: Excuse fields (only used by Admin L1/L2)
  excused: z.boolean().nullable().optional(), // null = pending review (staff-marked)
  excuse_reason: z.enum(EXCUSE_REASONS).nullable().optional(),
  excuse_notes: z.string().max(500, 'Notes too long').nullable().optional(),
  counts_toward_days_served: z.boolean().optional(), // Auto-set based on reason for admins
  // Story 3-12: Override fields (when admin edits someone else's entry)
  override_reason: z.enum(OVERRIDE_REASONS).optional(),
  override_notes: z.string().max(500, 'Notes too long').optional(),
}).refine(
  (data) => {
    // Tardy requires tardy_time
    if (data.status === 'T' && !data.tardy_time) return false;
    // Early Dismissal requires early_dismiss_time
    if (data.status === 'ED' && !data.early_dismiss_time) return false;
    return true;
  },
  { message: 'Time is required for Tardy and Early Dismissal statuses' }
).refine(
  (data) => {
    // If override_reason is 'other', override_notes is required
    if (data.override_reason === 'other' && !data.override_notes?.trim()) {
      return false;
    }
    return true;
  },
  { message: 'Notes are required when override reason is "Other"' }
);

export type MarkAttendanceInput = z.infer<typeof MarkAttendanceSchema>;

// Bulk mark attendance input
export const BulkMarkAttendanceSchema = z.object({
  placement_ids: z.array(z.string().uuid()).min(1, 'At least one student required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  period: z.string().min(1, 'Period is required'),
  status: z.string().min(1, 'Status is required').max(10, 'Status code too long'),
});

export type BulkMarkAttendanceInput = z.infer<typeof BulkMarkAttendanceSchema>;

// Attendance entry response type (Story 3-10: excused can be null for pending, Story 3-12: override fields)
export interface AttendanceEntry {
  id: string;
  placement_id: string;
  date: string;
  period: string;
  status: string;
  tardy_time: string | null;
  early_dismiss_time: string | null;
  excused: boolean | null; // null = pending review (staff-marked absent)
  excuse_reason: ExcuseReason | null;
  counts_toward_days_served: boolean;
  notes: string | null;
  entered_by: string;
  created_at: string;
  updated_at: string;
  // Story 3-12: Override tracking
  override_reason: OverrideReason | null;
  override_notes: string | null;
  overridden_by: string | null;
  overridden_at: string | null;
}

// Room attendance status (for room cards)
export interface RoomAttendanceStatus {
  room_id: string;
  taken: boolean;       // All students marked for this period?
  count: number;        // Number of students with attendance
  total: number;        // Total students in room
  present_count: number; // Students marked present/tardy/ED (not absent)
}

// ============================================================================
// DAEP ATTENDANCE RATE SCHEMAS (Story 3-11)
// ============================================================================

// Rate category for color coding
export const ATTENDANCE_RATE_CATEGORIES = ['green', 'yellow', 'red'] as const;
export type AttendanceRateCategory = (typeof ATTENDANCE_RATE_CATEGORIES)[number];

/**
 * Get rate category based on percentage
 * - green: >90%
 * - yellow: 85-90%
 * - red: <85%
 */
export function getRateCategory(rate: number): AttendanceRateCategory {
  if (rate > 90) return 'green';
  if (rate >= 85) return 'yellow';
  return 'red';
}

// Base attendance rate result
export interface AttendanceRateResult {
  periodsPresent: number;      // P + T + ED + Excused (counts_toward_days_served=true)
  periodsAbsent: number;       // A (unexcused or excused that doesn't count)
  totalPeriods: number;        // Total attendance-required periods
  rate: number;                // Percentage (0-100), rounded to 1 decimal
  rateCategory: AttendanceRateCategory;
}

// Daily attendance rate (for single day)
export interface DailyAttendanceRate extends AttendanceRateResult {
  date: string;
}

// Cumulative attendance rate (for entire placement)
export interface CumulativeAttendanceRate extends AttendanceRateResult {
  startDate: string;           // Placement start date
  endDate: string;             // Today or last attendance date
  daysWithAttendance: number;  // Unique days with attendance records
  consecutiveAbsentDays: number; // For notification trigger (Epic 7)
}

// Combined rates for student profile
export interface StudentAttendanceRates {
  daily: DailyAttendanceRate | null;  // Today's rate (null if no attendance today)
  cumulative: CumulativeAttendanceRate;
}

// Student below threshold result (for dashboard/notifications)
export interface StudentBelowThreshold {
  placement_id: string;
  school_id: string;
  student_name: string;
  attendance_rate: number;
  consecutive_absent_days: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// ============================================================================
// BEHAVIOR NOTES SCHEMAS (Story 4-1)
// ============================================================================

// Quick point values for bulk toolbar buttons
export const QUICK_POINT_VALUES = [-15, -10, -5, 0, 5] as const;
export type QuickPointValue = (typeof QUICK_POINT_VALUES)[number];

// Behavior note schema for inline entry
// Story 4-4: placement_id is now optional - notes can be linked to student only
export const BehaviorNoteSchema = z.object({
  // Either placement_id OR student_school_id must be provided
  placement_id: z.string().uuid('Invalid placement ID').nullable().optional(),
  student_school_id: z.string().min(1, 'Student ID is required').optional(),
  incident_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  incident_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format').optional(),
  category_id: z.string().uuid('Invalid category').nullable().optional(),
  description: z.string().max(2000, 'Description too long').nullable().optional(),
  action_taken: z.string().max(500, 'Action taken too long').nullable().optional(),
  // Point adjustment fields (optional - for combined point+note entries)
  points: z.number().int().min(-15).max(10).optional(),
  period: z.string().min(1).optional(),
  student_action: z.string().max(100).nullable().optional(),
  teacher_action: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
}).refine(
  (data) => data.placement_id || data.student_school_id,
  { message: 'Either placement_id or student_school_id is required' }
);

export type CreateBehaviorNoteInput = z.infer<typeof BehaviorNoteSchema>;

// Recent activity item for compact display in inline panel
export interface RecentActivityItem {
  id: string;
  type: 'point_entry' | 'behavior_note' | 'attendance';
  timestamp: string;
  summary: string;
  points?: number;
  period?: string;
  student_action?: string | null;
  teacher_action?: string | null;
  category_type?: 'positive' | 'negative' | 'neutral' | 'bonus'; // Story 4-2
  staff_name: string;
}

// Bulk add behavior points input (for quick point buttons)
export const BulkAddBehaviorPointsSchema = z.object({
  placement_ids: z.array(z.string().uuid()).min(1, 'At least one student required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  period: z.string().min(1, 'Period is required'),
  points: z.number().int().min(-15).max(10),
  student_action: z.string().max(100).nullable().optional(),
  teacher_action: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type BulkAddBehaviorPointsInput = z.infer<typeof BulkAddBehaviorPointsSchema>;

// ============================================================================
// BEHAVIOR NOTES LIST SCHEMAS (Story 4-3)
// ============================================================================

export const BEHAVIOR_NOTES_SORT_KEYS = [
  'date',
  'student_name',
  'campus',
  'category',
  'staff',
  'verified',
] as const;

export type BehaviorNotesSortKey = (typeof BEHAVIOR_NOTES_SORT_KEYS)[number];

export const BehaviorNotesListQuerySchema = z.object({
  // Search
  query: z.string().max(200).optional(),
  // Filters
  category_type: z.enum(['positive', 'negative', 'neutral', 'all']).optional(),
  campus_id: z.string().optional(),
  staff_id: z.string().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Sorting
  sort_by: z.enum(BEHAVIOR_NOTES_SORT_KEYS).optional().default('date'),
  sort_direction: z.enum(['asc', 'desc']).optional().default('desc'),
  // Pagination
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(10).max(100).default(25),
});

export type BehaviorNotesListQuery = z.infer<typeof BehaviorNotesListQuerySchema>;

export interface BehaviorNoteListItem {
  id: string;
  incident_date: string;
  incident_time: string | null;
  category: string | null;
  category_id: string | null;
  category_type: 'positive' | 'negative' | 'neutral' | null;
  description: string | null;
  description_snippet: string; // Truncated to 40 chars
  action_taken: string | null;
  // Staff info
  staff_member: string;
  staff_name: string;
  staff_last_name: string;
  // Student info via placement (Story 4-4: placement_id now nullable)
  placement_id: string | null;
  student_school_id: string;
  student_first_name: string;
  student_last_name: string;
  student_photo_url: string | null;
  // Placement context (Story 4-4)
  incident_number: string | null; // From placement if linked
  placement_status: string | null; // active, completed, etc.
  // Campus info
  home_campus_id: string | null;
  home_campus_name: string | null;
  // Point adjustment (if associated)
  points: number | null;
  student_action: string | null;
  teacher_action: string | null;
  // Verification (future feature)
  verified_by: string | null;
  verified_at: string | null;
  is_verified: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface BehaviorNotesListResult {
  notes: BehaviorNoteListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface BehaviorNotesStats {
  total: number;
  today: number;
  negative: number;
  unverified: number;
}

/**
 * Validates data against a schema and returns validated data or error
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown):
  { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}
