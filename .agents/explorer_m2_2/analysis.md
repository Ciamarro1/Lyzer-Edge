# Milestone 2 — SSRF Vulnerability Analysis Report (Exchange Execution & Integrations)

**Target Module**: `lyzer edge/backend/exchangeExecution.js` and related exchange integration modules  
**Explorer Agent**: Explorer 5 (Milestone 2 - Fix SSRF Vulnerabilities)  
**Date**: 2026-07-31  

---

## Executive Summary

An exhaustive security investigation was conducted across `lyzer edge/backend/exchangeExecution.js`, provider-specific execution modules (`providers/v1_fast/exchangeExecution.js`, `providers/v2_deep/exchangeExecution.js`), notification services (`telegram.js`), market ingestors (`liveDataIngestor.js`, `sportsDataIngestor.js`), and integration bridges (`src-ts/bridge/hub_to_exchange.ts`).

Multiple critical Server-Side Request Forgery (SSRF) vulnerabilities and related URL manipulation risks were identified:
1. **Unvalidated Dynamic API Base URLs**: Notifications (`TELEGRAM_API_URL`) and Exchange Execution endpoints accept external or environment-configurable URLs without domain whitelisting or protocol/IP restriction.
2. **Missing Private IP / Loopback Blocking**: Outgoing `fetch` and `WebSocket` clients do not perform DNS resolution checks, allowing SSRF attacks targeting internal microservices (`127.0.0.1:8080`, `127.0.0.1:7860`), cloud metadata endpoints (`169.254.169.254`), or private RFC 1918 networks.
3. **HTTP Redirect Following & API Key Exfiltration**: Default `fetch` behavior follows 3xx HTTP redirects, enabling attackers hosting rogue endpoints or DNS rebinds to steal sensitive HMAC signatures and `X-MBX-APIKEY` headers.
4. **Unsanitized Symbol Query Parameter Injection**: Symbol names are concatenated directly into REST and WebSocket URLs without `encodeURIComponent` or strict format validation regex.

---

## Scope of Inspection

The following files and components were systematically audited:

| File Path | Description | External Network Calls |
| :--- | :--- | :--- |
| `lyzer edge/backend/exchangeExecution.js` | Primary Binance REST order placement layer | `fetch(url, { method: 'POST', ... })` |
| `lyzer edge/backend/providers/v1_fast/exchangeExecution.js` | Fast-provider Binance REST order placement layer | `fetch(url, { method: 'POST', ... })` |
| `lyzer edge/backend/providers/v2_deep/exchangeExecution.js` | Deep-provider Binance REST order placement with OIL | `fetch(url, { method: 'POST', ... })` |
| `lyzer edge/backend/telegram.js` | Telegram alert service (`TELEGRAM_API_URL`) | `fetch(url, { method: 'POST', ... })` |
| `lyzer edge/backend/liveDataIngestor.js` | Multi-endpoint REST & WS Binance ingestor | `fetch(url)`, `new WebSocket(wsUrl)` |
| `lyzer edge/backend/sports/sportsDataIngestor.js` | Odds API WebSocket ingestor | `new WebSocket(wsUrl)` |
| `lyzer edge/src-ts/bridge/hub_to_exchange.ts` | Rust Hub log tailing to order execution bridge | Triggers `ExchangeExecution.placeOrder()` |

---

## Detailed Findings & Line-by-Line Code Analysis

### 1. `ExchangeExecution` Class Vulnerabilities
**Affected Files**:
- `lyzer edge/backend/exchangeExecution.js` (Lines 13, 41, 46-52)
- `lyzer edge/backend/providers/v1_fast/exchangeExecution.js` (Lines 13, 41, 46-52)
- `lyzer edge/backend/providers/v2_deep/exchangeExecution.js` (Lines 14, 56, 61-67)

**Code Snippet**:
```javascript
// backend/exchangeExecution.js:13, 41, 46-52
13: this.baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
...
41: const url = `${this.baseUrl}/api/v3/order?${queryString}`;
...
46: const response = await fetch(url, {
47:   method: 'POST',
48:   headers: {
49:     'X-MBX-APIKEY': this.apiKey,
50:     'Content-Type': 'application/x-www-form-urlencoded'
51:   }
52: });
```

**Flaws**:
- `this.baseUrl` is assigned based on `isTestnet`, but there is no domain whitelist validation if `baseUrl` is extended or passed dynamically via environment variables or constructor options.
- `fetch(url, ...)` does not set `redirect: 'error'` or `redirect: 'manual'`. If the destination endpoint responds with an HTTP 301/302/307/308 redirect pointing to an internal IP (e.g. `http://169.254.169.254/latest/meta-data/` or `http://127.0.0.1:7860/api/trades/wipe`), `fetch` automatically re-sends the POST request along with the `X-MBX-APIKEY` header.
- `symbol` argument is concatenated directly (`symbol=${symbol.toUpperCase()}`) without `encodeURIComponent()` or regex validation.

---

### 2. `Telegram Notification Service` SSRF Vulnerability
**Affected File**:
- `lyzer edge/backend/telegram.js` (Lines 10, 18, 21-30)

**Code Snippet**:
```javascript
// backend/telegram.js:10, 18, 21-30
10: const apiBase = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
...
18: const url = `${sanitizedBase}/bot${token}/sendMessage`;
...
21: const res = await fetch(url, {
22:   method: 'POST',
23:   headers: { 'Content-Type': 'application/json' },
24:   body: JSON.stringify({
25:     chat_id: chatId,
26:     text: text,
27:     parse_mode: 'HTML',
28:     disable_web_page_preview: true
29:   })
30: });
```

**Flaws**:
- `TELEGRAM_API_URL` is fetched directly from `process.env`. If an attacker or compromised configuration sets `TELEGRAM_API_URL=http://169.254.169.254` or `http://127.0.0.1:8080`, the application issues POST HTTP requests containing sensitive operational alerts to that internal endpoint.
- Zero URL scheme validation (e.g., permits `http://`), zero domain whitelisting, and zero loopback/private IP blocking.

---

### 3. Market Ingestor Endpoint & Parameter Injection
**Affected Files**:
- `lyzer edge/backend/liveDataIngestor.js` (Lines 54, 60, 145, 149, 263-264)
- `lyzer edge/backend/sports/sportsDataIngestor.js` (Lines 15-16)

**Code Snippet**:
```javascript
// backend/liveDataIngestor.js:263-264
263: const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@kline_${this.interval}`;
264: this.ws = new WebSocket(wsUrl);
```

**Flaws**:
- `this.symbol` and `this.interval` are interpolated into WebSocket and REST URLs without input validation.
- If `symbol` contains URL control characters (`../`, `?`, `#`), it alters the WebSocket resource path or REST query structure.

---

## Attack Scenarios & Exploit Vectors

### Attack Scenario 1: API Key & Signature Exfiltration via HTTP Redirect SSRF
1. **Attacker Action**: An attacker compromises an upstream DNS record or configures a custom exchange proxy domain, returning an HTTP 307 Temporary Redirect pointing to `https://attacker-controlled-server.com/steal`.
2. **Execution**: `ExchangeExecution.placeOrder()` constructs the order request with `X-MBX-APIKEY` and the SHA256 HMAC signature in `url`.
3. **Impact**: `fetch` follows the 307 redirect and sends `X-MBX-APIKEY` and signed parameters to the attacker's server, granting full trading access on Binance.

### Attack Scenario 2: Cloud Metadata & Internal API Exploitation via Environment Override
1. **Attacker Action**: In a containerized or multi-tenant environment, the attacker sets `TELEGRAM_API_URL=http://169.254.169.254/latest/meta-data/iam/security-credentials/`.
2. **Execution**: System alert trigger (e.g. trade execution or error alert) calls `sendTelegramAlert()`.
3. **Impact**: The backend sends POST requests to IMDS, exposing cloud IAM credentials or triggering unauthenticated internal API endpoints (`http://127.0.0.1:7860/api/trades/wipe`).

### Attack Scenario 3: DNS Rebinding Attack to Loopback Services
1. **Attacker Action**: Attacker supplies a domain `ssrf.attacker.com` pointing to a short TTL public IP, which rebinds to `127.0.0.1` upon DNS resolution by Node.js `fetch`.
2. **Execution**: Outgoing request passes naive domain string check, but TCP connection is established with `127.0.0.1:8080` (Rust Hub IPC server).
3. **Impact**: Unauthenticated interaction with internal IPC services on `127.0.0.1`.

---

## Remediation Specifications

To comprehensively resolve all SSRF vulnerabilities across exchange execution and integration modules, the following strict security specs must be implemented:

### 1. Centralized Domain Whitelist Policy (`URLSanitizer` / `SSRFGuard`)
Create a strict domain whitelist module that validates all outgoing URLs:
```javascript
const ALLOWED_DOMAINS = new Set([
  'api.binance.com',
  'testnet.binance.vision',
  'data-api.binance.vision',
  'api1.binance.com',
  'api2.binance.com',
  'api3.binance.com',
  'api4.binance.com',
  'stream.binance.com',
  'api.telegram.org',
  'api.odds-api.io'
]);
```

### 2. Private IP & Loopback Network Blocking
Implement pre-request DNS resolution checks using `dns.promises.lookup()` to block private IP ranges:
- **Loopback**: `127.0.0.0/8`, `::1`
- **Private IPv4**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- **Link-Local / AWS IMDS**: `169.254.0.0/16`, `fe80::/10`
- **CGNAT & Reserved**: `0.0.0.0/8`, `100.64.0.0/10`

### 3. Protocol & Redirect Policy Restriction
- Force `https:` for REST requests and `wss:` for WebSocket connections. Reject `http:`, `ws:`, `file:`, `ftp:`.
- Pass `redirect: 'error'` to all `fetch()` calls in exchange execution modules to prevent redirect-based credential exfiltration.

### 4. Input Validation & Encoding for Parameters
- Enforce strict regex validation for trading symbols: `/^[A-Z0-9]{2,20}$/`.
- Use `encodeURIComponent()` on all symbol, side, type, and quantity parameters appended to request strings.

---
