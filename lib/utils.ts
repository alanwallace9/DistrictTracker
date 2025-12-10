import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format timestamp as relative time for compact display
 * Story 4-1: Quick Behavior Note Entry
 *
 * - Today: show time (10:32 AM)
 * - Yesterday: "Yesterday"
 * - Within 7 days: day name (Monday)
 * - Older: short date (Dec 5)
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();

  // Check if same day
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  // Check if within last 7 days
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Older: short date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format timestamp with date and staff name for activity display
 * Story 4-2: Enhanced activity display
 *
 * Format: "(Dec 10, 25 @ 1:35pm Wallace)"
 */
export function formatActivityTimestamp(timestamp: string, staffName: string): string {
  const date = new Date(timestamp);

  // Format date as "Dec 10, 25"
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);

  // Format time as "1:35pm"
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase().replace(' ', '');

  // Get last name from staff name (assumes "First Last" format)
  const lastName = staffName.split(' ').pop() || staffName;

  return `(${month} ${day}, ${year} @ ${time} ${lastName})`;
}
