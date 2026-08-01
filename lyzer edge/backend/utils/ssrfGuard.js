/**
 * SSRF Defense Mechanism & Network Hardening Utility
 * Enforces URL scheme validation, domain allowlists, DNS pre-flight inspection,
 * private/loopback/cloud-metadata IP blocking, parameter validation, and safe HTTP fetch requests.
 */

import net from 'net';
import dns from 'dns';

export const DEFAULT_ALLOWED_DOMAINS = [
  'binance.com',
  'binance.vision',
  'telegram.org'
];

export const ALLOWED_INTERVALS = new Set(['1m', '5m', '15m', '1h', '4h', '1d']);

/**
 * Evaluates whether an IP address (IPv4 or IPv6) is within loopback, private,
 * link-local, carrier-grade NAT, or cloud metadata CIDR ranges.
 * 
 * @param {string} ip - IP address string to check
 * @returns {boolean} - true if IP is private/loopback/restricted, false otherwise
 */
export function isPrivateIp(ip) {
  if (!ip || typeof ip !== 'string') return false;

  const normalized = ip.trim().toLowerCase();

  if (normalized === 'localhost') return true;

  // Handle IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1 or ::ffff:10.0.0.1)
  const ipv4MappedMatch = normalized.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4MappedMatch) {
    return isPrivateIp(ipv4MappedMatch[1]);
  }

  const version = net.isIP(normalized);

  if (version === 4) {
    const parts = normalized.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
      return true; // Malformed IPv4 string treated as restricted
    }
    const [a, b, c, d] = parts;

    // Loopback: 127.0.0.0/8
    if (a === 127) return true;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // RFC 1918 Private ranges:
    // 10.0.0.0/8
    if (a === 10) return true;

    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;

    // Link-local / Cloud Metadata (IMDS): 169.254.0.0/16 (includes 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // Carrier-grade NAT: 100.64.0.0/10 (100.64.0.0 - 100.127.255.255)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // Multicast & Reserved: 224.0.0.0/4 (224.0.0.0 - 255.255.255.255)
    if (a >= 224) return true;

    return false;
  } else if (version === 6) {
    // Loopback: ::1 or 0:0:0:0:0:0:0:1 or ::
    if (normalized === '::1' || normalized === '::' || normalized === '0:0:0:0:0:0:0:1' || normalized === '0:0:0:0:0:0:0:0') {
      return true;
    }
    // Unique Local Address: fc00::/7 (starts with fc or fd)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    // Link-Local: fe80::/10 (starts with fe8, fe9, fea, feb)
    if (/^fe[89ab]/i.test(normalized)) {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Strictly validates currency symbol format.
 * Must match regex /^[A-Z0-9]{2,20}$/.
 * 
 * @param {string} symbol
 * @returns {string} - Clean, uppercase symbol
 */
export function validateSymbol(symbol) {
  if (typeof symbol !== 'string') {
    throw new Error('Invalid symbol: must be a string');
  }
  const cleanSymbol = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,20}$/.test(cleanSymbol)) {
    throw new Error(`Invalid symbol format: ${symbol}`);
  }
  return cleanSymbol;
}

/**
 * Strictly validates interval against allowlist (1m, 5m, 15m, 1h, 4h, 1d).
 * 
 * @param {string} interval
 * @returns {string} - Clean interval string
 */
export function validateInterval(interval) {
  if (typeof interval !== 'string' || !ALLOWED_INTERVALS.has(interval.trim())) {
    throw new Error(`Invalid interval: ${interval}`);
  }
  return interval.trim();
}

/**
 * Validates outbound URL against protocol schemes, domain allowlists,
 * and performs DNS pre-flight checks to prevent SSRF to private/loopback IPs.
 * 
 * @param {string} urlInput
 * @param {Object} [options]
 * @param {string[]} [options.allowedDomains]
 * @param {string[]} [options.allowlist]
 * @param {string[]} [options.allowedSchemes]
 * @param {boolean} [options.allowWs]
 * @param {boolean} [options.skipDns]
 * @returns {Promise<string>} - Validated URL string
 */
export async function validateUrl(urlInput, options = {}) {
  if (!urlInput || typeof urlInput !== 'string') {
    throw new Error('SSRF Guard: Invalid URL input');
  }

  let parsed;
  try {
    parsed = new URL(urlInput);
  } catch (err) {
    throw new Error(`SSRF Guard: Malformed URL '${urlInput}'`);
  }

  const allowedSchemes = options.allowedSchemes || (options.allowWs ? ['http:', 'https:', 'ws:', 'wss:'] : ['http:', 'https:']);
  if (!allowedSchemes.includes(parsed.protocol)) {
    throw new Error(`SSRF Guard: Disallowed URL scheme '${parsed.protocol}'`);
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    throw new Error('SSRF Guard: URL missing hostname');
  }

  const allowedDomains = options.allowedDomains || options.allowlist || DEFAULT_ALLOWED_DOMAINS;

  // Check if hostname is an IP address
  const ipVersion = net.isIP(hostname);
  if (ipVersion !== 0) {
    if (isPrivateIp(hostname)) {
      throw new Error(`SSRF Guard: Access to private/loopback IP address '${hostname}' is blocked`);
    }
    const isIpAllowed = allowedDomains.some(domain => domain === hostname);
    if (!isIpAllowed && allowedDomains.length > 0) {
      throw new Error(`SSRF Guard: IP address '${hostname}' is not in allowlist`);
    }
    return parsed.href;
  }

  // Domain check against allowlist
  const isDomainAllowed = allowedDomains.some(domain => {
    const cleanDomain = domain.toLowerCase();
    const cleanHost = hostname.toLowerCase();
    return cleanHost === cleanDomain || cleanHost.endsWith('.' + cleanDomain);
  });

  if (!isDomainAllowed) {
    throw new Error(`SSRF Guard: Domain '${hostname}' is not in allowlist`);
  }

  // DNS Pre-flight check
  if (!options.skipDns) {
    try {
      const addresses = await dns.promises.lookup(hostname, { all: true });
      if (!addresses || addresses.length === 0) {
        throw new Error(`SSRF Guard: Could not resolve DNS for domain '${hostname}'`);
      }
      for (const entry of addresses) {
        if (isPrivateIp(entry.address)) {
          throw new Error(`SSRF Guard: Domain '${hostname}' resolved to private/loopback IP '${entry.address}'`);
        }
      }
    } catch (err) {
      if (err.message && err.message.startsWith('SSRF Guard:')) {
        throw err;
      }
      throw new Error(`SSRF Guard: DNS resolution failed for '${hostname}': ${err.message}`);
    }
  }

  return parsed.href;
}

/**
 * Fetch wrapper setting redirect: 'error', validating URL prior to connection,
 * and preventing redirect header/credential leaks.
 * 
 * @param {string} urlInput
 * @param {Object} [fetchOptions]
 * @returns {Promise<Response>}
 */
export async function safeFetch(urlInput, fetchOptions = {}) {
  const allowWs = fetchOptions.allowWs || false;
  const allowedDomains = fetchOptions.allowedDomains || fetchOptions.allowlist;
  const skipDns = fetchOptions.skipDns || false;

  const validUrl = await validateUrl(urlInput, { allowWs, allowedDomains, skipDns });

  const options = { ...fetchOptions };

  // Remove custom options prior to calling standard fetch
  delete options.allowWs;
  delete options.allowedDomains;
  delete options.allowlist;
  delete options.skipDns;

  // Enforce strict redirect blocking
  options.redirect = 'error';

  return fetch(validUrl, options);
}
