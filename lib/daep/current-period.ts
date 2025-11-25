/**
 * Current Period Utility
 * Calculates the current period based on bell schedule and current time
 * Uses Central Time (America/Chicago) for Texas school districts
 */

import { type BellSchedulePeriod } from '@/lib/validation/schemas';

export interface CurrentPeriodResult {
  period: BellSchedulePeriod | null;
  periodIndex: number;
  status: 'before_school' | 'in_class' | 'passing' | 'after_school';
  nextPeriod: BellSchedulePeriod | null;
  timeUntilNext: number | null; // minutes until next period starts
  timeRemaining: number | null; // minutes remaining in current period
}

/**
 * Formats a time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Gets the current time in Central Time as minutes since midnight
 */
function getCurrentTimeInCentral(): number {
  const now = new Date();

  // Convert to Central Time
  const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));

  return centralTime.getHours() * 60 + centralTime.getMinutes();
}

/**
 * Calculates the current period based on a bell schedule and current time
 *
 * @param periods - Array of periods from bell schedule
 * @param currentTimeOverride - Optional time override for testing (HH:MM format)
 * @returns CurrentPeriodResult with current period info and status
 */
export function getCurrentPeriod(
  periods: BellSchedulePeriod[],
  currentTimeOverride?: string
): CurrentPeriodResult {
  if (!periods || periods.length === 0) {
    return {
      period: null,
      periodIndex: -1,
      status: 'before_school',
      nextPeriod: null,
      timeUntilNext: null,
      timeRemaining: null,
    };
  }

  // Sort periods by start time
  const sortedPeriods = [...periods].sort((a, b) =>
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  const currentMinutes = currentTimeOverride
    ? timeToMinutes(currentTimeOverride)
    : getCurrentTimeInCentral();

  const firstPeriodStart = timeToMinutes(sortedPeriods[0].start_time);
  const lastPeriodEnd = timeToMinutes(sortedPeriods[sortedPeriods.length - 1].end_time);

  // Before school starts
  if (currentMinutes < firstPeriodStart) {
    return {
      period: null,
      periodIndex: -1,
      status: 'before_school',
      nextPeriod: sortedPeriods[0],
      timeUntilNext: firstPeriodStart - currentMinutes,
      timeRemaining: null,
    };
  }

  // After school ends
  if (currentMinutes >= lastPeriodEnd) {
    return {
      period: null,
      periodIndex: -1,
      status: 'after_school',
      nextPeriod: null,
      timeUntilNext: null,
      timeRemaining: null,
    };
  }

  // Check each period
  for (let i = 0; i < sortedPeriods.length; i++) {
    const period = sortedPeriods[i];
    const periodStart = timeToMinutes(period.start_time);
    const periodEnd = timeToMinutes(period.end_time);

    // Currently in this period
    if (currentMinutes >= periodStart && currentMinutes < periodEnd) {
      const nextPeriod = i < sortedPeriods.length - 1 ? sortedPeriods[i + 1] : null;
      return {
        period,
        periodIndex: i,
        status: 'in_class',
        nextPeriod,
        timeUntilNext: nextPeriod ? timeToMinutes(nextPeriod.start_time) - currentMinutes : null,
        timeRemaining: periodEnd - currentMinutes,
      };
    }

    // Between periods (passing time)
    if (i < sortedPeriods.length - 1) {
      const nextPeriod = sortedPeriods[i + 1];
      const nextPeriodStart = timeToMinutes(nextPeriod.start_time);

      if (currentMinutes >= periodEnd && currentMinutes < nextPeriodStart) {
        return {
          period: null,
          periodIndex: -1,
          status: 'passing',
          nextPeriod,
          timeUntilNext: nextPeriodStart - currentMinutes,
          timeRemaining: null,
        };
      }
    }
  }

  // Fallback (shouldn't reach here)
  return {
    period: null,
    periodIndex: -1,
    status: 'after_school',
    nextPeriod: null,
    timeUntilNext: null,
    timeRemaining: null,
  };
}

/**
 * Formats time remaining as a human-readable string
 */
export function formatTimeRemaining(minutes: number | null): string {
  if (minutes === null) return '';

  if (minutes < 1) return 'Less than 1 min';
  if (minutes === 1) return '1 min';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

/**
 * Gets a status message based on current period result
 */
export function getPeriodStatusMessage(result: CurrentPeriodResult): string {
  switch (result.status) {
    case 'before_school':
      if (result.nextPeriod && result.timeUntilNext !== null) {
        return `School starts in ${formatTimeRemaining(result.timeUntilNext)} (${result.nextPeriod.period_name})`;
      }
      return 'Before school hours';

    case 'in_class':
      if (result.period && result.timeRemaining !== null) {
        return `${result.period.period_name} - ${formatTimeRemaining(result.timeRemaining)} remaining`;
      }
      return 'In class';

    case 'passing':
      if (result.nextPeriod && result.timeUntilNext !== null) {
        return `Passing period - ${result.nextPeriod.period_name} in ${formatTimeRemaining(result.timeUntilNext)}`;
      }
      return 'Passing period';

    case 'after_school':
      return 'After school hours';

    default:
      return '';
  }
}

/**
 * Returns the default period to select for point/attendance entry
 * - If currently in a period, returns that period
 * - If passing time, returns the next period
 * - Otherwise returns the first period
 */
export function getDefaultPeriodForEntry(
  periods: BellSchedulePeriod[],
  currentTimeOverride?: string
): BellSchedulePeriod | null {
  if (!periods || periods.length === 0) return null;

  const result = getCurrentPeriod(periods, currentTimeOverride);

  // Currently in class - return current period
  if (result.status === 'in_class' && result.period) {
    return result.period;
  }

  // Passing time - return next period
  if (result.status === 'passing' && result.nextPeriod) {
    return result.nextPeriod;
  }

  // Before/after school - return first period
  const sortedPeriods = [...periods].sort((a, b) =>
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  return sortedPeriods[0];
}
