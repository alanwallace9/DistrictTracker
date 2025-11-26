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
// DAEP ROOM SCHEMAS
// ============================================================================

export const DAEPRoomSchema = z.object({
  room_number: z.string().min(1, 'Room number is required').max(20, 'Room number too long'),
  room_name: z.string().max(100, 'Room name too long').optional().nullable(),
  campus_id: z.string().min(1, 'Campus is required'),
  capacity: z.number().int('Must be a whole number').min(1, 'Minimum 1').max(50, 'Maximum 50').default(15),
  building_section: z.string().max(50, 'Building section too long').optional().nullable(),
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
// HELPER FUNCTIONS
// ============================================================================

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
