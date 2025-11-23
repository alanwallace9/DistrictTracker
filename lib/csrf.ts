/**
 * CSRF Protection Utilities
 *
 * Next.js Server Actions have built-in CSRF protection, but this module
 * provides additional origin header validation for extra security.
 */

import { headers } from 'next/headers';
import { logger } from './logger';

/**
 * Validates that the request origin matches the host
 * Provides additional CSRF protection beyond Next.js built-in mechanisms
 *
 * @returns true if origin is valid or missing (same-origin), false otherwise
 */
export async function validateOrigin(): Promise<boolean> {
  const headersList = await headers();
  const origin = headersList.get('origin');
  const host = headersList.get('host');

  // Same-origin requests don't have an origin header - these are valid
  if (!origin) {
    return true;
  }

  // Extract hostname from origin URL
  try {
    const originUrl = new URL(origin);
    const isValid = originUrl.host === host;

    if (!isValid) {
      logger.warn('[CSRF] Origin validation failed', {
        origin,
        host,
        originHost: originUrl.host,
      });
    }

    return isValid;
  } catch (error) {
    logger.error('[CSRF] Failed to parse origin URL', { origin, error });
    return false;
  }
}

/**
 * Throws an error if origin validation fails
 * Use this in Server Actions for additional CSRF protection
 *
 * @throws Error if origin validation fails
 */
export async function requireValidOrigin(): Promise<void> {
  const isValid = await validateOrigin();

  if (!isValid) {
    throw new Error('Invalid request origin');
  }
}
