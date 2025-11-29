/**
 * Client-Side Subdomain Utilities
 *
 * Extracts subdomain from hostname (client-safe, no server dependencies)
 */

/**
 * Extract subdomain from hostname
 *
 * Examples:
 * - demo.districttracker.com → 'demo'
 * - staging.districttracker.com → 'staging' (isolated test environment)
 * - birdville.districttracker.com → 'birdville'
 * - localhost:3000 → 'staging' (development uses staging tenant)
 * - districttracker.com → null (root domain)
 */
export function getSubdomainFromHostname(hostname: string): string | null {
  // Development: use staging tenant (keeps birdville clean for production)
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'staging';
  }

  const parts = hostname.split('.');

  // Root domain (districttracker.com) or www
  if (parts.length < 3 || parts[0] === 'www') {
    return null;
  }

  const subdomain = parts[0];

  // Return the subdomain directly (e.g., 'demo', 'birdville', 'staging')
  return subdomain;
}
