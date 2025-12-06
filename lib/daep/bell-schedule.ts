/**
 * Bell Schedule Utilities for Room Roster
 *
 * Server-side utilities that combine bell schedules with calendar overrides
 * to determine the effective schedule for any given date.
 *
 * Story 3-1: Room Roster View
 */

import { createServerClient } from '@/lib/supabase/server';
import { getTenantId } from '@/lib/tenant';
import { type BellSchedulePeriod } from '@/lib/validation/schemas';
import { getCurrentPeriod, getDefaultPeriodForEntry, type CurrentPeriodResult } from './current-period';

// Re-export current-period utilities for convenience
export { getCurrentPeriod, getDefaultPeriodForEntry, formatTimeRemaining, getPeriodStatusMessage } from './current-period';
export type { CurrentPeriodResult } from './current-period';

export interface BellScheduleInfo {
  id: string;
  schedule_name: string;
  periods: BellSchedulePeriod[];
  is_default: boolean;
}

export interface ScheduleForDateResult {
  schedule: BellScheduleInfo | null;
  isSchoolDay: boolean;
  dayType: string | null;
  calendarNotes: string | null;
  source: 'calendar_override' | 'default_schedule' | 'no_schedule';
}

export interface PeriodsForDateResult {
  periods: BellSchedulePeriod[];
  scheduleName: string | null;
  isSchoolDay: boolean;
  dayType: string | null;
}

/**
 * Get the effective bell schedule for a specific date
 *
 * Resolution order:
 * 1. Check calendar for date-specific schedule override
 * 2. Fall back to default schedule for tenant
 * 3. Return null if no schedule configured
 */
export async function getScheduleForDate(
  date: string
): Promise<ScheduleForDateResult> {
  const tenantId = await getTenantId();
  const supabase = await createServerClient();

  // 1. Check calendar for this date
  const { data: calendarEntry } = await supabase
    .from('daep_school_calendar')
    .select(`
      is_school_day,
      day_type,
      notes,
      bell_schedule_id,
      bell_schedule:daep_bell_schedules(id, schedule_name, periods, is_default)
    `)
    .eq('tenant_id', tenantId)
    .eq('date', date)
    .single();

  // If calendar has a specific schedule override
  if (calendarEntry?.bell_schedule_id && calendarEntry.bell_schedule) {
    const schedule = Array.isArray(calendarEntry.bell_schedule)
      ? calendarEntry.bell_schedule[0]
      : calendarEntry.bell_schedule;

    return {
      schedule: schedule ? {
        id: schedule.id,
        schedule_name: schedule.schedule_name,
        periods: schedule.periods as BellSchedulePeriod[],
        is_default: schedule.is_default,
      } : null,
      isSchoolDay: calendarEntry.is_school_day,
      dayType: calendarEntry.day_type,
      calendarNotes: calendarEntry.notes,
      source: 'calendar_override',
    };
  }

  // If calendar entry exists but no schedule override, check if it's a school day
  if (calendarEntry && !calendarEntry.is_school_day) {
    return {
      schedule: null,
      isSchoolDay: false,
      dayType: calendarEntry.day_type,
      calendarNotes: calendarEntry.notes,
      source: 'calendar_override',
    };
  }

  // 2. Fall back to default schedule
  const { data: defaultSchedule } = await supabase
    .from('daep_bell_schedules')
    .select('id, schedule_name, periods, is_default')
    .eq('tenant_id', tenantId)
    .eq('is_default', true)
    .eq('active', true)
    .single();

  if (defaultSchedule) {
    return {
      schedule: {
        id: defaultSchedule.id,
        schedule_name: defaultSchedule.schedule_name,
        periods: defaultSchedule.periods as BellSchedulePeriod[],
        is_default: defaultSchedule.is_default,
      },
      isSchoolDay: calendarEntry?.is_school_day ?? true, // Assume school day if no calendar entry
      dayType: calendarEntry?.day_type ?? 'regular',
      calendarNotes: calendarEntry?.notes ?? null,
      source: 'default_schedule',
    };
  }

  // 3. No schedule configured
  return {
    schedule: null,
    isSchoolDay: calendarEntry?.is_school_day ?? true,
    dayType: calendarEntry?.day_type ?? null,
    calendarNotes: calendarEntry?.notes ?? null,
    source: 'no_schedule',
  };
}

/**
 * Get periods for a specific date
 * Combines schedule lookup with period extraction
 */
export async function getPeriodsForDate(
  date: string
): Promise<PeriodsForDateResult> {
  const result = await getScheduleForDate(date);

  return {
    periods: result.schedule?.periods ?? [],
    scheduleName: result.schedule?.schedule_name ?? null,
    isSchoolDay: result.isSchoolDay,
    dayType: result.dayType,
  };
}

/**
 * Get the current period info for today
 * Combines schedule lookup with current period calculation
 */
export async function getCurrentPeriodForToday(): Promise<{
  currentPeriod: CurrentPeriodResult;
  schedule: BellScheduleInfo | null;
  isSchoolDay: boolean;
  dayType: string | null;
}> {
  const today = new Date().toISOString().split('T')[0];
  const scheduleResult = await getScheduleForDate(today);

  const periods = scheduleResult.schedule?.periods ?? [];
  const currentPeriod = getCurrentPeriod(periods);

  return {
    currentPeriod,
    schedule: scheduleResult.schedule,
    isSchoolDay: scheduleResult.isSchoolDay,
    dayType: scheduleResult.dayType,
  };
}

/**
 * Get the default period to select for a given date
 * Returns the current period if today, or first period otherwise
 */
export async function getDefaultPeriodForDate(
  date: string
): Promise<BellSchedulePeriod | null> {
  const { periods } = await getPeriodsForDate(date);

  if (periods.length === 0) return null;

  const today = new Date().toISOString().split('T')[0];

  // If today, use current period logic
  if (date === today) {
    return getDefaultPeriodForEntry(periods);
  }

  // Otherwise, return first period
  const sortedPeriods = [...periods].sort((a, b) => {
    const [aH, aM] = a.start_time.split(':').map(Number);
    const [bH, bM] = b.start_time.split(':').map(Number);
    return (aH * 60 + aM) - (bH * 60 + bM);
  });

  return sortedPeriods[0];
}

/**
 * Check if a specific date is a school day
 */
export async function isSchoolDay(date: string): Promise<boolean> {
  const result = await getScheduleForDate(date);
  return result.isSchoolDay;
}

/**
 * Get today's date in YYYY-MM-DD format (Central Time)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));

  const year = centralTime.getFullYear();
  const month = String(centralTime.getMonth() + 1).padStart(2, '0');
  const day = String(centralTime.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
