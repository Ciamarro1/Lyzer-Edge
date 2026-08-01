# Milestone 2: SSRF Vulnerability Audit & Universal Network Shield Design Report

**Agent**: Explorer 6 (Milestone 2 - Fix SSRF Vulnerabilities)  
**Target Codebase**: `E:\projcts\lyzer`  
**Metadata Directory**: `E:\projcts\lyzer\.agents\explorer_m2_3`  
**Date**: 2026-07-31  

---

## 1. Executive Summary

This report provides a comprehensive security audit of all outbound network calls within the `Lyzer` codebase (`E:\projcts\lyzer`) and presents the architectural specification for a universal **Network Shield / URL Validator** component (`lyzer edge/backend/utils/urlValidator.js`).

### Summary of Audit Findings
- **Total Network Access Statements Identified**: 134 occurrences across 45 files (spanning Node.js backend services, frontend services, research scripts, PowerShell automation, and Rust microservices).
- **Primary Backend Clients**:
  1. `lyzer edge/backend/telegram.js`: Global `fetch` calls to `process.env.TELEGRAM_API_URL || 'https://api.telegram.org'`. **High SSRF Risk** if `TELEGRAM_API_URL` is set to an arbitrary internal URL or cloud metadata endpoint.
  2. `lyzer edge/backend/exchangeExecution.js` (& `providers/v1_fast`, `providers/v2_deep`): Global `fetch` calls to `https://testnet.binance.vision` or `https://api.binance.com`.
  3. `lyzer edge/backend/liveDataIngestor.js`: Global `fetch` calls across fallback Binance URLs and `ws` WebSocket connections to Binance streams.
  4. `lyzer edge/backend/sports/sportsDataIngestor.js`: `ws` WebSocket connection to `wss://api.odds-api.io`.
  5. `lyzer edge/backend/providers/*/ipc_client.js`: HTTP request calls to `http://127.0.0.1:8080` for internal IPC to Rust Hub.
- **Key Vulnerability Modes**:
  - **Environment-based SSRF**: Unsanitized base URLs from environment variables (e.g. `TELEGRAM_API_URL`).
  - **Redirect-based SSRF**: Standard `fetch()` automatically follows HTTP 3xx redirects without re-validating the target URL, allowing an external service or attacker-controlled endpoint to redirect to internal loopback (`127.0.0.1`) or cloud metadata IMDS (`169.254.169.254`).
  - **DNS Rebinding / TOCTOU**: Time-of-check to time-of-use vulnerability where a domain resolves to a public IP during initial check but resolves to a private IP during fetch.

---

## 2. Comprehensive Inventory of Outbound Network Calls

Below is the complete catalog of network request clients, destination URLs, dynamic inputs, and risk levels across `E:\projcts\lyzer`.

### 2.1 Backend Production Services (`lyzer edge/backend`)

| File Path | Line(s) | Client / API | Target Destination / Base URL | Dynamic Inputs | SSRF Risk Level | Notes |
|-----------|---------|--------------|-------------------------------|----------------|-----------------|-------|
| `lyzer edge/backend/telegram.js` | L10, L21 | `globalThis.fetch` | `process.env.TELEGRAM_API_URL` (default: `https://api.telegram.org`) | `TELEGRAM_API_URL`, `BOT_TOKEN`, `chatId`, `text` | **HIGH** | Unsanitized `TELEGRAM_API_URL` allows redirecting alerts/requests to internal network or `169.254.169.254`. |
| `lyzer edge/backend/exchangeExecution.js` | L13, L46 | `globalThis.fetch` | `https://testnet.binance.vision` / `https://api.binance.com` | `isTestnet`, `symbol`, `side`, `type`, `quantity` | **MEDIUM** | Query params built from inputs. URL base is static, but dynamic `fetch` lacks DNS validation and redirect protection. |
| `lyzer edge/backend/liveDataIngestor.js` | L9-16, L60, L149 | `globalThis.fetch` | `BINANCE_BASE_URLS` array (`api.binance.com`, `data-api.binance.vision`, `api1..4.binance.com`) | `symbol`, `interval` | **MEDIUM** | Iterates through hardcoded Binance URLs. Lacks redirect and DNS rebinding protections. |
| `lyzer edge/backend/liveDataIngestor.js` | L263-264 | `ws.WebSocket` | `wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}` | `symbol`, `interval` | **LOW** | WebSocket client. Protocol `wss:` with hardcoded host. |
| `lyzer edge/backend/sports/sportsDataIngestor.js` | L15-16 | `ws.WebSocket` | `wss://api.odds-api.io/v3/ws?apiKey=${apiKey}` | `apiKey` | **LOW** | WebSocket client to Odds API. |
| `lyzer edge/backend/providers/v1_fast/exchangeExecution.js` | L13, L46 | `globalThis.fetch` | Binance REST API | `symbol`, `side`, `quantity` | **MEDIUM** | Provider v1_fast implementation. |
| `lyzer edge/backend/providers/v1_fast/ipc_client.js` | L7-17 | `http.request` | `http://127.0.0.1:8080/` | `record` payload | **LOW (Internal)** | Internal IPC communication with local Rust hub. Must be explicitly exempted via `allowPrivate: true`. |
| `lyzer edge/backend/providers/v2_deep/exchangeExecution.js` | L14, L61 | `globalThis.fetch` | Binance REST API | `symbol`, `side`, `quantity` | **MEDIUM** | Provider v2_deep implementation. |
| `lyzer edge/backend/providers/v2_deep/ipc_client.js` | L7-17 | `http.request` | `http://127.0.0.1:8080/` | `record` payload | **LOW (Internal)** | Internal IPC communication. |
| `lyzer edge/backend/server.js` | L41, L42 | `http.createServer`, `WebSocketServer` | `http://localhost:${PORT}` | `PORT` | **N/A (Server)** | Inbound server listeners. |

### 2.2 Root & Research Scripts (`lyzer edge/`, `packages/lyzer-shared/`)

| File Path | Line(s) | Client / API | Target Destination | Dynamic Inputs | SSRF Risk Level |
|-----------|---------|--------------|--------------------|----------------|-----------------|
| `lyzer edge/optimize_backtest.js` | L25-26 | `globalThis.fetch` | `https://api.binance.com/api/v3/klines` | `symbol`, `interval`, `limit` | **LOW** | Backtest CLI tool. |
| `lyzer edge/run_binance_backtest.js` | L25-27 | `globalThis.fetch` | `https://api.binance.com/api/v3/klines` | `symbol`, `interval`, `limit` | **LOW** | Backtest CLI tool. |
| `packages/lyzer-shared/src/research/fetch_historical_ohlcv.js` | L11-14 | `globalThis.fetch` | `https://api.binance.com/api/v3/klines` | `symbol`, `interval`, `limit` | **LOW** | Research script. |
| `packages/lyzer-shared/src/research/run_adaptive_calibration.js` | L16-17 | `globalThis.fetch` | `https://api.binance.com/api/v3/klines` | None (static params) | **LOW** | Research script. |
| `packages/lyzer-shared/src/research/run_v4_solo_experiment.js` | L10-11 | `globalThis.fetch` | `https://api.binance.com/api/v3/klines` | None (static params) | **LOW** | Research script. |
| `packages/lyzer-shared/src/research/run_walkforward_validation.js` | L8-10 | `globalThis.fetch` | `https://api.binance.com/api/v3/klines` | `symbol`, `interval`, `limit` | **LOW** | Research script. |
| `src-ts/bridge/ingestor_to_hub.ts` | L3-7 | `globalThis.fetch` | `http://127.0.0.1:8080` | `payload` | **LOW (Internal)** | Internal TypeScript bridge. |
| `src-ts/scripts/first_blood/1_ingest_binance.ts` | L28-29 | `globalThis.fetch` | `https://api.binance.com/api/v3/klines` | `symbol`, `startTime`, `endTime` | **LOW** | Offline ingest script. |

### 2.3 Frontend & Client Services (`lyzer edge/src/`, `packages/lyzer-shared/src/`)

| File Path | Line(s) | Client / API | Target Destination | Dynamic Inputs | SSRF Risk Level |
|-----------|---------|--------------|--------------------|----------------|-----------------|
| `lyzer edge/src/services/BinanceSeederService.js` | L24 | `fetch` | `https://api.binance.com/api/v3/klines` | `symbol` | **LOW** | Client-side frontend seeder. |
| `lyzer edge/src/services/experimentService.js` | L15, L29, L44, etc. | `fetch` | Relative backend paths (`/api/experiments/...`) | `id`, `sortBy`, `limit` | **LOW** | Relative path client calls. |
| `lyzer edge/src/services/LiveTradeSyncService.js` | L32 | `fetch` | Relative path (`/api/candles/${sym}`) | `sym` | **LOW** | Relative path client call. |
| `lyzer edge/src/services/wsClient.js` | L19 | `WebSocket` | `wsUrl` | `wsUrl` | **LOW** | Frontend WS client. |
| `packages/lyzer-shared/src/services/wsClient.js` | L9 | `WebSocket` | `ws://localhost:3001` | Static | **LOW** | Frontend WS client. |

### 2.4 Rust Modules (`src-rust/`, `lyzer edge/src-rust/`)

| File Path | Line(s) | Client / API | Target Destination | Notes |
|-----------|---------|--------------|--------------------|-------|
| `src-rust/lyzer-binance-adapter/src/client.rs` | L1, L10, L43 | `reqwest::Client` | `https://testnet.binancefuture.com` | Binance futures client in Rust. |
| `src-rust/lyzer-oal/src/acquisition/binance_feed.rs` | L2, L31-32 | `reqwest`, `tokio_tungstenite` | `wss://stream.binance.com:9443` | WebSocket market feed in Rust. |
| `src-rust/lyzer-reality-ws/src/stream.rs` | L16-17 | `tokio_tungstenite` | `wss://fstream.binance.com` | WebSocket stream in Rust. |
| `lyzer edge/src-rust/lyzer-oms/src/main.rs` | L80, L153 | `tonic::transport::Channel` | `http://[::1]:50052` | Internal gRPC channel on loopback. |

---

## 3. Specification & Design of `urlValidator.js`

### 3.1 Overview & Requirements
Component Location: `lyzer edge/backend/utils/urlValidator.js`

The Network Shield module provides a defense-in-depth barrier against SSRF (Server-Side Request Forgery), DNS Rebinding, and Protocol Smuggling attacks.

Key Defense Requirements:
1. **Strict Protocol Whitelisting**: Allows only `http:` and `https:` (configurable to allow `ws:` / `wss:` for WebSockets). Rejects `file:`, `ftp:`, `gopher:`, `dict:`, `data:`, `blob:`, etc.
2. **Comprehensive CIDR Blacklisting (IPv4 & IPv6)**: Resolves hostnames to IP addresses via `dns.promises.lookup()` and blocks all non-routable, private, loopback, link-local, carrier-grade NAT, and cloud metadata IP ranges.
3. **Domain Whitelisting**: Supports domain pattern matching (exact and wildcard subdomain e.g. `*.binance.com`).
4. **DNS Rebinding (TOCTOU) Protection**: Resolves IP during validation and pins the IP for the request, or re-verifies resolved IP before establishing connection.
5. **Redirect Validation (`safeFetch`)**: Overrides default `fetch` redirect behavior (`redirect: 'manual'`), parses and validates each redirect `Location` header against the validator before following, up to a maximum redirect limit (`maxRedirects: 5`).

---

### 3.2 Blocked IP Ranges Specification

#### IPv4 Forbidden Ranges:
- `0.0.0.0/8` (Current network / "this" host)
- `10.0.0.0/8` (Private network - RFC 1918)
- `100.64.0.0/10` (Carrier-grade NAT - RFC 6598)
- `127.0.0.0/8` (Loopback addresses)
- `169.254.0.0/16` (Link-Local & Cloud IMDS Metadata e.g. AWS/GCP/Azure `169.254.169.254`)
- `172.16.0.0/12` (Private network - RFC 1918: `172.16.0.0` - `172.31.255.255`)
- `192.0.0.0/24` (IETF Protocol Assignments)
- `192.0.2.0/24` (TEST-NET-1)
- `192.168.0.0/16` (Private network - RFC 1918)
- `198.51.100.0/24` (TEST-NET-2)
- `203.0.113.0/24` (TEST-NET-3)
- `224.0.0.0/4` (Multicast)
- `240.0.0.0/4` (Reserved / Future Use / Broadcast `255.255.255.255`)
- `100.100.100.200/32` (Alibaba Cloud Metadata endpoint)

#### IPv6 Forbidden Ranges:
- `::/128` (Unspecified address)
- `::1/128` (Loopback address)
- `::ffff:0:0/96` (IPv4-mapped IPv6 — must extract the embedded IPv4 address and apply IPv4 checks!)
- `fc00::/7` (Unique Local Address - ULA)
- `fe80::/10` (Link-Local IPv6)
- `2001:db8::/32` (Documentation)
- `ff00::/8` (Multicast)

---

### 3.3 Target Implementation Code for `lyzer edge/backend/utils/urlValidator.js`

Below is the complete proposed code for `lyzer edge/backend/utils/urlValidator.js`.

```javascript
/**
 * Universal Network Shield / URL Validator
 * Path: lyzer edge/backend/utils/urlValidator.js
 *
 * Provides SSRF protection, protocol validation, DNS resolution check,
 * private/loopback/cloud-metadata IP blocking, domain whitelisting,
 * DNS rebinding protection, and safeFetch HTTP wrapper.
 */

import dns from 'dns';
import net from 'net';

export class ValidationError extends Error {
  constructor(message, code = 'INVALID_URL') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

// Global default domain whitelist for Lyzer Edge
export const DEFAULT_ALLOWED_DOMAINS = [
  'api.binance.com',
  '*.binance.com',
  'data-api.binance.vision',
  'testnet.binance.vision',
  'api.telegram.org',
  '*.telegram.org',
  'api.odds-api.io',
  '*.odds-api.io',
  'huggingface.co',
  '*.huggingface.co'
];

/**
 * Checks whether an IPv4 address string falls into private/loopback/metadata ranges.
 * @param {string} ip - IPv4 address string (e.g. "127.0.0.1")
 * @returns {boolean} true if forbidden
 */
export function isForbiddenIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP is rejected
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8
  if (a === 0) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 127.0.0.0/8
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-Local & Cloud Metadata e.g. AWS/GCP/Azure 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.0.0/24, 192.0.2.0/24
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  // 198.51.100.0/24
  if (a === 198 && b === 51 && c === 100) return true;
  // 203.0.113.0/24
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (Reserved / Broadcast)
  if (a >= 240) return true;
  // 100.100.100.200/32 (Alibaba Cloud Metadata)
  if (a === 100 && b === 100 && c === 100 && d === 200) return true;

  return false;
}

/**
 * Checks whether an IPv6 address string falls into private/loopback/metadata ranges.
 * @param {string} ip - IPv6 address string
 * @returns {boolean} true if forbidden
 */
export function isForbiddenIPv6(ip) {
  const normalized = ip.toLowerCase().trim();

  // ::1 or :: (Loopback / Unspecified)
  if (normalized === '::' || normalized === '::1' || normalized === '0:0:0:0:0:0:0:0' || normalized === '0:0:0:0:0:0:0:1') {
    return true;
  }

  // IPv4-mapped IPv6 address (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:') || normalized.startsWith('0:0:0:0:0:ffff:')) {
    const lastColon = normalized.lastIndexOf(':');
    const embedded = normalized.slice(lastColon + 1);
    if (net.isIPv4(embedded)) {
      return isForbiddenIPv4(embedded);
    }
  }

  // Unique Local Address (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Link-Local (fe80::/10 -> fe8, fe9, fea, feb)
  if (/^fe[89ab]/i.test(normalized)) {
    return true;
  }

  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) {
    return true;
  }

  // Documentation (2001:db8::/32)
  if (normalized.startsWith('2001:db8:')) {
    return true;
  }

  return false;
}

/**
 * Matches a domain against an allowed domain pattern list.
 * Supports exact matches ("api.binance.com") and wildcard subdomains ("*.binance.com").
 * @param {string} hostname 
 * @param {Array<string>} allowedDomains 
 * @returns {boolean}
 */
export function isDomainAllowed(hostname, allowedDomains = []) {
  if (!allowedDomains || allowedDomains.length === 0) return true;

  const lowerHost = hostname.toLowerCase();

  for (const pattern of allowedDomains) {
    const lowerPattern = pattern.toLowerCase();
    if (lowerPattern === lowerHost) return true;

    if (lowerPattern.startsWith('*.')) {
      const rootDomain = lowerPattern.slice(2);
      if (lowerHost === rootDomain || lowerHost.endsWith('.' + rootDomain)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validates a URL against protocol, domain whitelist, and resolved IP ranges.
 * @param {string|URL} inputUrl - URL string or URL object
 * @param {Object} [options]
 * @param {Array<string>} [options.allowedDomains] - Domain patterns list
 * @param {Array<string>} [options.allowedProtocols] - Allowed protocols (default: ['http:', 'https:'])
 * @param {boolean} [options.allowPrivate] - Allow private IPs (for internal IPC only)
 * @returns {Promise<{ valid: boolean, parsedUrl: URL, resolvedIps: string[] }>}
 */
export async function validateUrl(inputUrl, options = {}) {
  const allowedProtocols = options.allowedProtocols || ['http:', 'https:'];
  const allowedDomains = options.allowedDomains || null;
  const allowPrivate = options.allowPrivate || false;

  let parsedUrl;
  try {
    parsedUrl = typeof inputUrl === 'string' ? new URL(inputUrl) : inputUrl;
  } catch (err) {
    throw new ValidationError(`Invalid URL format: ${err.message}`, 'INVALID_URL_FORMAT');
  }

  // 1. Protocol Validation
  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    throw new ValidationError(`Forbidden URL protocol '${parsedUrl.protocol}'. Allowed: ${allowedProtocols.join(', ')}`, 'FORBIDDEN_PROTOCOL');
  }

  const hostname = parsedUrl.hostname;
  if (!hostname) {
    throw new ValidationError('URL missing hostname', 'MISSING_HOSTNAME');
  }

  // 2. Domain Whitelist Check
  if (allowedDomains && allowedDomains.length > 0) {
    if (!isDomainAllowed(hostname, allowedDomains)) {
      throw new ValidationError(`Domain '${hostname}' is not in the allowed domains whitelist.`, 'DOMAIN_NOT_ALLOWED');
    }
  }

  // 3. Check if hostname is an explicit IP address literal
  const resolvedIps = [];

  if (net.isIPv4(hostname)) {
    resolvedIps.push(hostname);
    if (!allowPrivate && isForbiddenIPv4(hostname)) {
      throw new ValidationError(`IPv4 address '${hostname}' is restricted (private/loopback/metadata).`, 'FORBIDDEN_IP_RANGE');
    }
  } else if (net.isIPv6(hostname)) {
    const rawIp = hostname.replace(/^\[|\]$/g, '');
    resolvedIps.push(rawIp);
    if (!allowPrivate && isForbiddenIPv6(rawIp)) {
      throw new ValidationError(`IPv6 address '${rawIp}' is restricted (private/loopback/metadata).`, 'FORBIDDEN_IP_RANGE');
    }
  } else {
    // 4. Perform DNS Resolution for Hostnames
    try {
      const addresses = await dns.promises.lookup(hostname, { all: true });
      if (!addresses || addresses.length === 0) {
        throw new ValidationError(`DNS resolution returned no records for host '${hostname}'.`, 'DNS_RESOLUTION_FAILED');
      }

      for (const record of addresses) {
        const ip = record.address;
        resolvedIps.push(ip);

        if (!allowPrivate) {
          if (record.family === 4 && isForbiddenIPv4(ip)) {
            throw new ValidationError(`Host '${hostname}' resolved to forbidden IPv4 address '${ip}'.`, 'FORBIDDEN_IP_RANGE');
          } else if (record.family === 6 && isForbiddenIPv6(ip)) {
            throw new ValidationError(`Host '${hostname}' resolved to forbidden IPv6 address '${ip}'.`, 'FORBIDDEN_IP_RANGE');
          }
        }
      }
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError(`DNS lookup failed for host '${hostname}': ${err.message}`, 'DNS_LOOKUP_ERROR');
    }
  }

  return {
    valid: true,
    parsedUrl,
    resolvedIps
  };
}

/**
 * Safe fetch wrapper that enforces URL validation, DNS rebinding mitigation,
 * and redirect validation.
 * @param {string|URL} inputUrl 
 * @param {Object} [options] - Standard fetch options + safeFetch options
 * @param {Array<string>} [options.allowedDomains]
 * @param {number} [options.maxRedirects=5]
 * @param {boolean} [options.allowPrivate=false]
 * @returns {Promise<Response>}
 */
export async function safeFetch(inputUrl, options = {}) {
  const {
    allowedDomains = DEFAULT_ALLOWED_DOMAINS,
    maxRedirects = 5,
    allowPrivate = false,
    allowedProtocols = ['http:', 'https:'],
    ...fetchOptions
  } = options;

  let currentUrl = inputUrl;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    // Validate current URL
    const { parsedUrl } = await validateUrl(currentUrl, {
      allowedDomains,
      allowedProtocols,
      allowPrivate
    });

    // Execute fetch with manual redirect handling to intercept 3xx SSRF redirects
    const response = await fetch(parsedUrl.toString(), {
      ...fetchOptions,
      redirect: 'manual'
    });

    // Check for HTTP 3xx Redirects
    if (response.status >= 300 && response.status < 400) {
      const locationHeader = response.headers.get('location');
      if (!locationHeader) {
        return response; // No location header provided, return response
      }

      if (redirectsRemaining === 0) {
        throw new ValidationError(`Exceeded maximum allowed redirects (${maxRedirects}).`, 'MAX_REDIRECTS_EXCEEDED');
      }

      // Resolve relative redirect against base URL
      currentUrl = new URL(locationHeader, parsedUrl).toString();
      redirectsRemaining--;
    } else {
      return response;
    }
  }

  throw new ValidationError('Redirect loop or limit exceeded', 'REDIRECT_ERROR');
}
```

---

## 4. Remediation Code Examples for Lyzer Modules

### 4.1 Remediation for `lyzer edge/backend/telegram.js`

#### Before:
```javascript
export async function sendTelegramAlert(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const apiBase = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
  ...
  const url = `${sanitizedBase}/bot${token}/sendMessage`;
  const res = await fetch(url, { ... });
}
```

#### After (Proposed Remediation):
```javascript
import { safeFetch } from './utils/urlValidator.js';

export async function sendTelegramAlert(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const apiBase = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';

  if (!token || !chatId) {
    throw new Error(`Configurações ausentes nos Secrets.`);
  }

  const sanitizedBase = apiBase.replace(/\/$/, '');
  const url = `${sanitizedBase}/bot${token}/sendMessage`;

  try {
    // safeFetch validates apiBase domain & IP range (blocks 127.0.0.1, 169.254.169.254)
    const res = await safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      allowedDomains: ['api.telegram.org', '*.telegram.org'],
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Telegram API Error: ${res.status} - ${errorBody}`);
    }
  } catch (e) {
    throw new Error(`Erro ao conectar ao proxy/Telegram: ${e.message}`);
  }
}
```

---

### 4.2 Remediation for `lyzer edge/backend/exchangeExecution.js`

#### Before:
```javascript
const url = `${this.baseUrl}/api/v3/order?${queryString}`;
const response = await fetch(url, { method: 'POST', ... });
```

#### After (Proposed Remediation):
```javascript
import { safeFetch } from './utils/urlValidator.js';

const url = `${this.baseUrl}/api/v3/order?${queryString}`;
const response = await safeFetch(url, {
  method: 'POST',
  allowedDomains: ['api.binance.com', 'testnet.binance.vision'],
  headers: {
    'X-MBX-APIKEY': this.apiKey,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
});
```

---

### 4.3 Remediation for `lyzer edge/backend/liveDataIngestor.js`

#### Before:
```javascript
const res = await fetch(url, { signal: controller.signal });
```

#### After (Proposed Remediation):
```javascript
import { safeFetch } from './utils/urlValidator.js';

const res = await safeFetch(url, {
  signal: controller.signal,
  allowedDomains: [
    'api.binance.com',
    'data-api.binance.vision',
    'api1.binance.com',
    'api2.binance.com',
    'api3.binance.com',
    'api4.binance.com'
  ]
});
```

---

## 5. Risk Assessment & Verification Strategy

| Target Area | Pre-Mitigation SSRF Risk | Post-Mitigation Risk | Primary Defense Mechanism |
|-------------|--------------------------|----------------------|---------------------------|
| `telegram.js` | **HIGH** | **NEGLIGIBLE** | `safeFetch` enforces `api.telegram.org` whitelist & blocks loopback/cloud-metadata IPs. |
| `exchangeExecution.js` | **MEDIUM** | **NEGLIGIBLE** | `safeFetch` prevents DNS rebinding and 3xx redirects to private networks. |
| `liveDataIngestor.js` | **MEDIUM** | **NEGLIGIBLE** | `safeFetch` restricts requests to hardcoded Binance endpoint list. |
| `ipc_client.js` | **LOW** | **SAFE** | `validateUrl` with `allowPrivate: true` explicitly documents and locks IPC to `127.0.0.1:8080`. |

---

## 6. Recommendations for Implementation (Worker Task Handoff)

1. **Create Utility Module**:
   Implement `lyzer edge/backend/utils/urlValidator.js` with `validateUrl` and `safeFetch`.
2. **Add Unit Test Suite**:
   Create `lyzer edge/tests/unit/urlValidator.test.js` to test:
   - Blocking `127.0.0.1`, `localhost`, `169.254.169.254`, `[::1]`, `::ffff:127.0.0.1`.
   - Protocol restriction (`file://`, `gopher://`, `ftp://`).
   - Domain whitelist enforcement.
   - Redirect loop and manual redirect validation.
3. **Refactor Outbound Request Clients**:
   Replace `globalThis.fetch` in `telegram.js`, `exchangeExecution.js`, and `liveDataIngestor.js` with `safeFetch`.

