# Handoff Report — Explorer 5 (Milestone 2: Fix SSRF Vulnerabilities)

## 1. Observation

Direct code observations from `lyzer edge` modules:

- **Exchange Execution Modules** (`lyzer edge/backend/exchangeExecution.js`: lines 13, 41, 46-52; `backend/providers/v1_fast/exchangeExecution.js`: lines 13, 41, 46-52; `backend/providers/v2_deep/exchangeExecution.js`: lines 14, 56, 61-67):
  - Base URLs are constructed dynamically (`this.baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com'`).
  - Request execution: `const url = ${this.baseUrl}/api/v3/order?${queryString}; const response = await fetch(url, { method: 'POST', headers: { 'X-MBX-APIKEY': this.apiKey ... } });`.
  - `fetch` is invoked without setting `redirect: 'error'`, allowing 3xx HTTP redirects to exfiltrate HMAC signatures and API key headers to arbitrary hosts.
  - Parameter concatenation: `symbol=${symbol.toUpperCase()}` is injected without `encodeURIComponent()` or regex validation `/^[A-Z0-9]{2,20}$/`.

- **Telegram Notification Service** (`lyzer edge/backend/telegram.js`: lines 10, 18, 21-30):
  - Dynamic API base URL: `const apiBase = process.env.TELEGRAM_API_URL || 'https://api.telegram.org'`.
  - `const url = ${sanitizedBase}/bot${token}/sendMessage`.
  - Performs `fetch(url, { method: 'POST', body: JSON.stringify(...) })` with no domain whitelist check, no protocol check (allows `http://`), and no private/loopback IP blocking.

- **Market Data Ingestors** (`lyzer edge/backend/liveDataIngestor.js`: lines 9-16, 54, 60, 145, 149, 263-264; `backend/sports/sportsDataIngestor.js`: lines 15-16):
  - Connects to external WebSocket streams (`wss://stream.binance.com:9443/...`, `wss://api.odds-api.io/...`) and REST endpoints (`https://api.binance.com/...`).
  - Inputs (`symbol`, `interval`) are interpolated directly into URL strings without input encoding.

- **Hub Execution Bridge** (`lyzer edge/src-ts/bridge/hub_to_exchange.ts`: lines 47-50):
  - Reads unvalidated JSON execution artifacts from `hub_output.log` and passes `symbol` directly into `executor.placeOrder(symbol, action, 'MARKET', quantity)`.

---

## 2. Logic Chain

1. **Step 1**: `ExchangeExecution`, `sendTelegramAlert`, and `LiveDataIngestor` initiate outgoing HTTP REST or WebSocket requests to endpoints constructed via string templates.
2. **Step 2**: None of these modules validate whether target domain hostnames match a strict allowlist of authorized exchange/service hosts (`api.binance.com`, `testnet.binance.vision`, `api.telegram.org`, `api.odds-api.io`).
3. **Step 3**: Environment overrides (such as `TELEGRAM_API_URL`) or HTTP 3xx redirects can point requests to internal addresses (`127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`).
4. **Step 4**: Standard Node.js `fetch` automatically follows HTTP redirects and includes request headers (`X-MBX-APIKEY`), enabling credential exfiltration and unauthorized access to internal administrative/metadata services.
5. **Step 5**: Therefore, strict SSRF remediation requires centralized domain whitelisting, DNS pre-resolution for private/loopback IP blocking, disabling fetch redirects, and encoding request parameters.

---

## 3. Caveats

- **Network Environment**: Investigation was performed in CODE_ONLY mode (read-only context analysis).
- **Scope Assumption**: No custom HTTP proxy middleware currently exists in `lyzer edge/backend` to intercept `fetch` calls globally; remediation must be added directly via a dedicated SSRF guard module or wrapped HTTP client.
- **Third-Party Libraries**: Native Node `fetch` and `ws` WebSocket packages are used directly without central HTTP abstraction.

---

## 4. Conclusion

Critical SSRF and request manipulation vulnerabilities exist across `exchangeExecution.js`, `telegram.js`, and data ingestor modules. Implementing a centralized `SSRFGuard` utility that enforces:
1. Strict Domain Whitelisting (`api.binance.com`, `testnet.binance.vision`, `api.telegram.org`, etc.)
2. Private IP / Loopback DNS pre-resolution blocking (`127.0.0.0/8`, `169.254.0.0/16`, `10.0.0.0/8`, etc.)
3. `redirect: 'error'` configuration on `fetch`
4. Strict symbol validation regex (`/^[A-Z0-9]{2,20}$/`) and `encodeURIComponent()`
will completely remediate these attack vectors.

---

## 5. Verification Method

To independently verify these findings:

1. **Inspect Code Files**:
   - `view_file` on `E:\projcts\lyzer\lyzer edge\backend\exchangeExecution.js` (Lines 13-52)
   - `view_file` on `E:\projcts\lyzer\lyzer edge\backend\telegram.js` (Lines 10-30)
   - `view_file` on `E:\projcts\lyzer\lyzer edge\backend\liveDataIngestor.js` (Lines 54-60, 263-264)

2. **Simulate SSRF Attack Scenarios**:
   - Set `TELEGRAM_API_URL=http://127.0.0.1:7860/api/status` and invoke `sendTelegramAlert('test')`. Observe HTTP request directed to loopback server without error.
   - Supply a redirected URL to `fetch` in `ExchangeExecution` and confirm headers (`X-MBX-APIKEY`) are forwarded to redirected destination.

3. **Validation Test Command**:
   - Run Vitest suite: `npm test` or `npx vitest run` in `lyzer edge`.
