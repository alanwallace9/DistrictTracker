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
