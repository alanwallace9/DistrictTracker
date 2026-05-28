/**
 * Days Remaining Calculation Utility
 * Calculates expected end date based on school calendar
 */

import { createServerClient } from '@/lib/supabase/server';

/**
 * Calculates the expected end date for a DAEP placement
 * based on start date, days assigned, and the school calendar.
 *
 * Only counts school days (is_school_day = true) toward the placement.
 *
 * @param tenantId - The tenant ID for RLS
 * @param startDate - Start date of the placement (YYYY-MM-DD)
 * @param daysAssigned - Number of school days assigned
 * @returns Expected end date (YYYY-MM-DD) or null if cannot calculate
 */
export async function calculateExpectedEndDate(
  tenantId: string,
  startDate: string,
  daysAssigned: number
): Promise<string | null> {
  const supabase = await createServerClient();

  // Get school calendar entries from start date forward
  // Limit to a reasonable range (2x days assigned to account for non-school days)
  const maxCalendarDays = daysAssigned * 3 + 30; // Buffer for holidays, weekends

  const { data: calendarDays, error } = await supabase
    .from('daep_school_calendar')
    .select('date, is_school_day')
    .eq('tenant_id', tenantId)
    .gte('date', startDate)
    .eq('is_school_day', true)
    .order('date', { ascending: true })
    .limit(maxCalendarDays);

  if (error) {
    console.error('Error fetching school calendar:', error);
    // Fallback: estimate based on ~180 school days / 365 days ratio
    return estimateEndDate(startDate, daysAssigned);
  }

  // If no calendar entries, use estimation
  if (!calendarDays || calendarDays.length === 0) {
    return estimateEndDate(startDate, daysAssigned);
  }

  // Count school days until we reach daysAssigned
  if (calendarDays.length >= daysAssigned) {
    // Return the date of the last assigned school day
    return calendarDays[daysAssigned - 1].date;
  }

  // Not enough calendar days configured - estimate the remaining days
  const lastCalendarDate = calendarDays[calendarDays.length - 1].date;
  const remainingDays = daysAssigned - calendarDays.length;

  return estimateEndDate(lastCalendarDate, remainingDays);
}

/**
 * Estimates end date when school calendar is not available.
 * Uses approximately 5 school days per week (M-F), excluding
 * an estimated 10% for holidays/breaks.
 */
function estimateEndDate(startDate: string, schoolDaysRemaining: number): string {
  // Approximate ratio: 7 calendar days / 5 school days * 1.1 buffer
  const calendarDaysEstimate = Math.ceil(schoolDaysRemaining * (7 / 5) * 1.1);

  const start = new Date(startDate);
  start.setDate(start.getDate() + calendarDaysEstimate);

  return start.toISOString().split('T')[0];
}

/**
 * Calculates days served for a placement based on school calendar
 *
 * @param tenantId - The tenant ID
 * @param startDate - Placement start date
 * @param asOfDate - Date to calculate through (defaults to today)
 * @returns Number of school days served
 */
export async function calculateDaysServed(
  tenantId: string,
  startDate: string,
  asOfDate?: string
): Promise<number> {
  const supabase = await createServerClient();

  const endDate = asOfDate || new Date().toISOString().split('T')[0];

  const { data: schoolDays, error } = await supabase
    .from('daep_school_calendar')
    .select('date')
    .eq('tenant_id', tenantId)
    .eq('is_school_day', true)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error calculating days served:', error);
    return 0;
  }

  return schoolDays?.length || 0;
}

/**
 * Calculates days remaining for an active placement
 */
export async function calculateDaysRemaining(
  tenantId: string,
  startDate: string,
  daysAssigned: number
): Promise<number> {
  const daysServed = await calculateDaysServed(tenantId, startDate);
  return Math.max(0, daysAssigned - daysServed);
}

/**
 * Preview calculation for the placement form
 * Returns expected end date based on current calendar config
 */
export async function previewExpectedEndDate(
  tenantId: string,
  startDate: string,
  daysAssigned: number
): Promise<{
  expectedEndDate: string;
  isEstimate: boolean;
  schoolDaysFound: number;
}> {
  const supabase = await createServerClient();

  const maxCalendarDays = daysAssigned * 3 + 30;

  const { data: calendarDays, error } = await supabase
    .from('daep_school_calendar')
    .select('date, is_school_day')
    .eq('tenant_id', tenantId)
    .gte('date', startDate)
    .eq('is_school_day', true)
    .order('date', { ascending: true })
    .limit(maxCalendarDays);

  if (error || !calendarDays || calendarDays.length === 0) {
    return {
      expectedEndDate: estimateEndDate(startDate, daysAssigned),
      isEstimate: true,
      schoolDaysFound: 0,
    };
  }

  if (calendarDays.length >= daysAssigned) {
    return {
      expectedEndDate: calendarDays[daysAssigned - 1].date,
      isEstimate: false,
      schoolDaysFound: calendarDays.length,
    };
  }

  // Partial calendar data available
  const lastCalendarDate = calendarDays[calendarDays.length - 1].date;
  const remainingDays = daysAssigned - calendarDays.length;

  return {
    expectedEndDate: estimateEndDate(lastCalendarDate, remainingDays),
    isEstimate: true,
    schoolDaysFound: calendarDays.length,
  };
}

/**
 * Complete days info for a placement
 * Returns all calculated values needed for display and storage
 */
export interface DaysInfo {
  daysServed: number;
  daysRemaining: number;
  daysAssigned: number;
  progressPercent: number;
  expectedEndDate: string | null;
  isComplete: boolean;
  isEstimate: boolean;
}

/**
 * Calculate complete days information for a placement
 * Used by recalculation functions and UI display
 *
 * @param tenantId - The tenant ID
 * @param startDate - Placement start date (YYYY-MM-DD)
 * @param daysAssigned - Total days assigned
 * @param currentDaysServed - Optional override for days served (otherwise calculated)
 * @returns Complete days info object
 */
export async function calculateDaysInfo(
  tenantId: string,
  startDate: string,
  daysAssigned: number,
  currentDaysServed?: number
): Promise<DaysInfo> {
  // Calculate days served if not provided
  const daysServed = currentDaysServed ?? await calculateDaysServed(tenantId, startDate);

  // Calculate days remaining
  const daysRemaining = Math.max(0, daysAssigned - daysServed);

  // Calculate progress percentage (0-100)
  const progressPercent = daysAssigned > 0
    ? Math.min(100, Math.round((daysServed / daysAssigned) * 100))
    : 0;

  // Calculate expected end date
  const preview = await previewExpectedEndDate(tenantId, startDate, daysAssigned);

  return {
    daysServed,
    daysRemaining,
    daysAssigned,
    progressPercent,
    expectedEndDate: preview.expectedEndDate,
    isComplete: daysRemaining === 0,
    isEstimate: preview.isEstimate,
  };
}

/**
 * Business days fallback calculation (Mon-Fri)
 * Used when no school calendar exists
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param businessDays - Number of business days to add
 * @returns End date (YYYY-MM-DD)
 */
export function calculateBusinessDaysFallback(
  startDate: string,
  businessDays: number
): string {
  console.warn('[DAEP Days] No school calendar found, using business days fallback');

  let date = new Date(startDate);
  let remaining = businessDays;

  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remaining--;
    }
  }

  return date.toISOString().split('T')[0];
}

// ========== STORY 2-11: ROLLOVER CALENDAR UTILITIES ==========

/**
 * Get the school year (format YYYY-YYYY, e.g. "2024-2025") for a given date.
 * Logic: If the month is July or later (>=7), year is current-next;
 *        otherwise it is previous-current.
 */
export function getSchoolYearForDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12

  // School year typically starts in August/September.
  // July (7) is summer but closer to the new school year.
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/**
 * Get current school year in format YYYY-YYYY (e.g., "2024-2025")
 */
export function getCurrentSchoolYear(): string {
  return getSchoolYearForDate(new Date());
}

/**
 * Check if current date is within the last month of the school year
 * Used as a calendar guard for showing rollover report (AC 2.11.11)
 *
 * Logic: Checks if current date is within 30 days of the last school day
 *        in the calendar for the current school year.
 *
 * @param tenantId - The tenant ID for RLS
 * @returns true if within last month of school year
 */
export async function isLastMonthOfSchoolYear(tenantId: string): Promise<boolean> {
  const supabase = await createServerClient();
  const schoolYear = getCurrentSchoolYear();

  // Get the last school day of the current school year
  const { data: lastDay, error } = await supabase
    .from('daep_school_calendar')
    .select('date')
    .eq('tenant_id', tenantId)
    .eq('school_year', schoolYear)
    .eq('is_school_day', true)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !lastDay) {
    // No calendar configured - fallback to May 15 - June 15 window
    // This is a reasonable default for Texas school districts
    const now = new Date();
    const month = now.getMonth() + 1;
    return month >= 5 && month <= 6;
  }

  // Check if current date is within 30 days of last school day
  const lastSchoolDate = new Date(lastDay.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysUntilEnd = Math.ceil(
    (lastSchoolDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Show rollover tab if within last 30 days of school year (or past it)
  return daysUntilEnd <= 30 && daysUntilEnd >= -7; // Allow a week after EOY
}

/**
 * Get the number of remaining school days in current school year
 * Used for rollover candidate detection
 *
 * @param tenantId - The tenant ID for RLS
 * @param fromDate - Optional start date (defaults to today)
 * @returns Number of remaining school days, or null if no calendar
 */
export async function getSchoolDaysRemaining(
  tenantId: string,
  fromDate?: string
): Promise<number | null> {
  const supabase = await createServerClient();
  const schoolYear = getCurrentSchoolYear();
  const startDate = fromDate || new Date().toISOString().split('T')[0];

  // Count school days from startDate to end of school year
  const { data: schoolDays, error } = await supabase
    .from('daep_school_calendar')
    .select('date')
    .eq('tenant_id', tenantId)
    .eq('school_year', schoolYear)
    .eq('is_school_day', true)
    .gte('date', startDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('[Rollover] Error fetching remaining school days:', error);
    return null;
  }

  return schoolDays?.length ?? null;
}

/**
 * Get the last school day date of the current school year
 *
 * @param tenantId - The tenant ID for RLS
 * @returns Last school day date (YYYY-MM-DD) or null if no calendar
 */
export async function getLastSchoolDay(tenantId: string): Promise<string | null> {
  const supabase = await createServerClient();
  const schoolYear = getCurrentSchoolYear();

  const { data, error } = await supabase
    .from('daep_school_calendar')
    .select('date')
    .eq('tenant_id', tenantId)
    .eq('school_year', schoolYear)
    .eq('is_school_day', true)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.date;
}
