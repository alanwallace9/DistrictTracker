/**
 * Rate limiting utilities using Upstash Redis
 *
 * Setup instructions:
 * 1. Create an Upstash Redis database at https://console.upstash.com/
 * 2. Add environment variables:
 *    - UPSTASH_REDIS_REST_URL
 *    - UPSTASH_REDIS_REST_TOKEN
 * 3. Configure rate limits below as needed
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Check if Upstash credentials are configured
const UPSTASH_CONFIGURED = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

// Create Redis client only if configured
const redis = UPSTASH_CONFIGURED
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

/**
 * Rate limiter for feedback submissions
 * 10 requests per minute per IP
 */
export const feedbackRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:feedback',
    })
  : null;

/**
 * Rate limiter for upvotes
 * 20 requests per minute per IP (more lenient)
 */
export const upvoteRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      analytics: true,
      prefix: 'ratelimit:upvote',
    })
  : null;

/**
 * Rate limiter for webhooks
 * 100 requests per minute per IP
 */
export const webhookRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:webhook',
    })
  : null;

/**
 * Rate limiter for comments
 * 10 requests per minute per user
 */
export const commentRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:comment',
    })
  : null;

/**
 * Helper function to get client IP from request
 */
export function getClientIp(req: Request): string {
  // Try various headers in order of preference
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return value.split(',')[0].trim();
    }
  }

  return 'unknown';
}

/**
 * Wrapper to check rate limit and return appropriate response
 * Returns null if rate limit passed, or Response if rate limit exceeded
 */
export async function checkRateLimit(
  ratelimit: Ratelimit | null,
  identifier: string
): Promise<Response | null> {
  // If rate limiting is not configured, allow all requests
  if (!ratelimit) {
    console.warn('Rate limiting is not configured (Upstash credentials missing)');
    return null;
  }

  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

  if (!success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        limit,
        remaining,
        reset: new Date(reset).toISOString(),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Check if Upstash is configured
 */
export function isRateLimitConfigured(): boolean {
  return UPSTASH_CONFIGURED;
}
