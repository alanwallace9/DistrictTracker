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
