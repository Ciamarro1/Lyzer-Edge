# Milestone 2 Implementation Report — SSRF Protection & Network Hardening

## Overview
Worker M2 has implemented the SSRF defense shield (`ssrfGuard.js`), a comprehensive unit test suite (`ssrfGuard.test.js`), and refactored all vulnerable outbound networking code across `liveDataIngestor.js`, `telegram.js`, and all variants of `exchangeExecution.js`.

---

## File Inventory & Changes Summary

### 1. `lyzer edge/backend/utils/ssrfGuard.js` (NEW)
- **`isPrivateIp(ip)`**: Detects loopback (`127.0.0.1`, `localhost`, `::1`), RFC 1918 private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), Link-local / Cloud Metadata IMDS (`169.254.0.0/16` including `169.254.169.254`), Carrier-grade NAT (`100.64.0.0/10`), multicast/reserved IPv4 (`224.0.0.0/4`), IPv6 private/link-local ranges (`fc00::/7`, `fe80::/10`), and IPv4-mapped IPv6 formats (`::ffff:127.0.0.1`).
- **`validateSymbol(symbol)`**: Strictly enforces regex `/^[A-Z0-9]{2,20}$/` and returns uppercase sanitized symbol. Throws descriptive error on malformed/malicious symbols.
- **`validateInterval(interval)`**: Enforces strict whitelist (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`). Throws error on unapproved intervals.
- **`validateUrl(urlInput, options)`**: Validates URL scheme (`http:`, `https:`, optional `ws:`, `wss:`), checks domain against domain allowlist (`binance.com`, `binance.vision`, `telegram.org`), performs DNS pre-flight resolution via `dns.promises.lookup`, and verifies all resolved IPs against `isPrivateIp`.
- **`safeFetch(urlInput, fetchOptions)`**: Custom fetch wrapper that validates URL prior to execution and enforces `redirect: 'error'` to block open redirect & header leakage attacks.

### 2. `lyzer edge/tests/unit/ssrfGuard.test.js` (NEW)
- Unit test suite with 26 tests covering:
  - `isPrivateIp`: Loopback, RFC 1918, link-local / IMDS (`169.254.169.254`), IPv6, CGNAT, public IPs.
  - `validateSymbol`: Valid symbols, special character injection attempts, boundary lengths.
  - `validateInterval`: Valid intervals, unapproved intervals.
  - `validateUrl`: Scheme blocking (`gopher://`, `file://`, `ftp://`), private IP blocking, domain allowlist enforcement, subdomain spoofing rejection (`binance.com.evil.com`), WebSocket scheme allowance.
  - `safeFetch`: Pre-flight blocking of private targets and enforcement of `redirect: 'error'`.
  - Refactored components integration tests (`LiveDataIngestor`, `sendTelegramAlert`, `ExchangeExecution` root/v1_fast/v2_deep).

### 3. `lyzer edge/backend/liveDataIngestor.js` (REFACTORED)
- Imported `safeFetch`, `validateSymbol`, `validateInterval`, `validateUrl` from `./utils/ssrfGuard.js`.
- Updated `constructor(symbol, interval)` to sanitize `symbol` and `interval` using strict validators.
- Refactored `warmupCandles()` and `_doPoll()` to use `safeFetch` and URL parameter encoding via `encodeURIComponent`.
- Refactored `startWebSocket()` to validate `wsUrl` asynchronously with `validateUrl(wsUrl, { allowWs: true })` prior to creating `WebSocket`.

### 4. `lyzer edge/backend/telegram.js` (REFACTORED)
- Imported `safeFetch` and `validateUrl` from `./utils/ssrfGuard.js`.
- Validated `apiBase` against domain allowlist (`['telegram.org']`) and IP SSRF rules via `validateUrl`.
- Replaced `fetch` with `safeFetch`.
- Suppressed raw error body leakage (`res.text()`) and redacted bot token from catch block error messages using regex `/bot[^\/]+/` -> `/bot[REDACTED]`.

### 5. `lyzer edge/backend/exchangeExecution.js` (Root) (REFACTORED)
- Imported `safeFetch` and `validateSymbol` from `./utils/ssrfGuard.js`.
- Enforced `validateSymbol` in `placeOrder()`.
- Encoded all URL query string parameters (`symbol`, `side`, `type`, `quantity`, `timestamp`, `recvWindow`, `signature`) using `encodeURIComponent`.
- Replaced raw `fetch` with `safeFetch` enforcing `redirect: 'error'`.

### 6. `lyzer edge/backend/providers/v1_fast/exchangeExecution.js` (REFACTORED)
- Imported `safeFetch` and `validateSymbol` from `../../utils/ssrfGuard.js`.
- Applied identical SSRF parameter sanitization, query string encoding, and `safeFetch` protection.

### 7. `lyzer edge/backend/providers/v2_deep/exchangeExecution.js` (REFACTORED)
- Imported `safeFetch` and `validateSymbol` from `../../utils/ssrfGuard.js`.
- Applied symbol validation, parameter encoding, and `safeFetch` while preserving `recordTradeOutcome` integration.
