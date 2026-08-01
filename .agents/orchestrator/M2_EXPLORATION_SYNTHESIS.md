# Milestone 2 Exploration Synthesis — SSRF Vulnerabilities & Network Hardening

## Overview
Explorers 4 and 5 completed detailed investigations of outbound network operations across `liveDataIngestor.js`, `exchangeExecution.js`, `telegram.js`, and provider network modules.

## Synthesized Vulnerability Catalog

| File / Component | Line Numbers | Vulnerable Pattern | Risk |
|---|---|---|---|
| `lyzer edge/backend/telegram.js` | 8-18, 21-36 | `process.env.TELEGRAM_API_URL` without URL scheme, domain allowlist, or IP validation; leaks error response body in Error message | Critical |
| `lyzer edge/backend/liveDataIngestor.js` | 54, 60, 145, 149, 263-264 | Concatenates `symbol` & `interval` directly without regex validation/encoding; default `fetch` follows 3xx redirects to internal IPs | High |
| `lyzer edge/backend/exchangeExecution.js` (Root, v1_fast, v2_deep) | 13, 41, 46 | `this.baseUrl` lacks domain allowlist enforcement; header exfiltration on 3xx redirects; unencoded `symbol` query string | High |
| Global Outbound Requests | All HTTP/WS clients | Default `fetch` follows redirects; missing DNS pre-flight checks against loopback (`127.0.0.0/8`), RFC 1918 private IPs (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and AWS IMDS (`169.254.169.254`) | Critical |

## Reconciled Network Shield Architecture (`lyzer edge/backend/utils/ssrfGuard.js`)

1. **`ssrfGuard.js` Specifications**:
   - `validateUrl(urlInput, options)`: Ensures HTTPS/HTTP scheme, verifies hostname against domain whitelist (`binance.com`, `binance.vision`, `telegram.org`), resolves DNS to IPv4/IPv6, and blocks private/loopback/cloud-metadata IP ranges.
   - `isPrivateIp(ip)`: Detects loopback (`127.0.0.1`), RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), and IPv6 loopback (`::1`).
   - `validateSymbol(symbol)`: Enforces strict regex `/^[A-Z0-9]{2,20}$/`.
   - `validateInterval(interval)`: Enforces strict whitelist (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`).
   - `safeFetch(url, fetchOptions)`: Custom fetch wrapper with `redirect: 'error'`, timeout control, and URL pre-validation.

2. **Refactoring Targets**:
   - Create `lyzer edge/backend/utils/ssrfGuard.js` with comprehensive unit tests (`lyzer edge/tests/unit/ssrfGuard.test.js`).
   - Refactor `liveDataIngestor.js` to sanitize symbols/intervals and use `ssrfGuard.js` / `safeFetch`.
   - Refactor `telegram.js` to validate `TELEGRAM_API_URL` and suppress raw error response body leakage.
   - Refactor `exchangeExecution.js` (root, `v1_fast`, `v2_deep`) to use `safeFetch` and enforce `redirect: 'error'`.
