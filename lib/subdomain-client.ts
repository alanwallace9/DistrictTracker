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
 * - staging.districttracker.com → 'demo' (staging uses demo data)
 * - birdville.districttracker.com → 'birdville'
 * - localhost:3000 → 'demo' (development default)
 * - districttracker.com → null (root domain)
 */
export function getSubdomainFromHostname(hostname: string): string | null {
  // Development: default to demo
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'demo';
  }

  const parts = hostname.split('.');

  // Root domain (districttracker.com) or www
  if (parts.length < 3 || parts[0] === 'www') {
    return null;
  }

  const subdomain = parts[0];

  // Staging subdomain uses demo tenant data
  if (subdomain === 'staging') {
    return 'demo';
  }

  // Return the subdomain (e.g., 'demo', 'birdville')
  return subdomain;
}
