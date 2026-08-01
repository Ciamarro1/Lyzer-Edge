# Handoff Report: Milestone 2 — SSRF Vulnerabilities Analysis

**Author**: Explorer 4 (Milestone 2 - Fix SSRF Vulnerabilities)  
**Target Subsystem**: `lyzer edge/backend/liveDataIngestor.js`, `telegram.js`, `exchangeExecution.js`, and provider network modules.  
**Working Directory**: `E:\projcts\lyzer\.agents\explorer_m2_1`  
**Date**: 2026-07-31  

---

## 1. Observation

Direct code observations from inspection of `E:\projcts\lyzer\lyzer edge\backend`:

1. **`liveDataIngestor.js` Lines 9–16, 44–46, 54, 60, 145, 149, 263–264**:
   - Lines 9–16:
     ```javascript
     const BINANCE_BASE_URLS = [
       'https://api.binance.com',
       'https://data-api.binance.vision',
       'https://api1.binance.com',
       'https://api2.binance.com',
       'https://api3.binance.com',
       'https://api4.binance.com'
     ];
     ```
   - Line 54 & 60:
     ```javascript
     const url = `${this.baseUrl}/api/v3/klines?symbol=${this.symbol}&interval=${this.interval}&limit=101`;
     const res = await fetch(url, { signal: controller.signal });
     ```
   - Line 145 & 149:
     ```javascript
     const url = `${this.baseUrl}/api/v3/klines?symbol=${this.symbol}&interval=${this.interval}&limit=2`;
     const res = await fetch(url, { signal: controller.signal });
     ```
   - Line 263–264:
     ```javascript
     const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@kline_${this.interval}`;
     this.ws = new WebSocket(wsUrl);
     ```

2. **`telegram.js` Lines 8–18, 21–36**:
   - Lines 8–18:
     ```javascript
     const token = process.env.TELEGRAM_BOT_TOKEN;
     const chatId = process.env.TELEGRAM_CHAT_ID;
     const apiBase = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
     ...
     const sanitizedBase = apiBase.replace(/\/$/, '');
     const url = `${sanitizedBase}/bot${token}/sendMessage`;
     ```
   - Lines 21–36:
     ```javascript
     const res = await fetch(url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ ... })
     });
     ...
     if (!res.ok) {
       const errorBody = await res.text();
       throw new Error(`Telegram API Error: ${res.status} - ${errorBody}`);
     }
     ...
     throw new Error(`Erro ao conectar ao proxy/Telegram [API_BASE=${apiBase}]: ${e.message}`);
     ```

3. **`exchangeExecution.js` (Root & Providers `v1_fast`, `v2_deep`) Lines 13, 41, 46**:
   - Lines 13, 41, 46:
     ```javascript
     this.baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
     ...
     const url = `${this.baseUrl}/api/v3/order?${queryString}`;
     const response = await fetch(url, { method: 'POST', ... });
     ```

4. **Repository Structure**:
   - `lyzer edge/backend/liveDataIngestor.js`
   - `lyzer edge/backend/telegram.js`
   - `lyzer edge/backend/exchangeExecution.js`
   - `lyzer edge/backend/providers/v1_fast/exchangeExecution.js`
   - `lyzer edge/backend/providers/v2_deep/exchangeExecution.js`

---

## 2. Logic Chain

1. **Observation 2** shows that `telegram.js` fetches from `apiBase` derived directly from environment variable `process.env.TELEGRAM_API_URL` without validating protocol, scheme, hostname, or IP address.
2. An attacker or corrupted environment file setting `TELEGRAM_API_URL=http://169.254.169.254` forces `sendTelegramAlert()` to issue an HTTP POST request to `169.254.169.254/bot<token>/sendMessage`.
3. The response body and HTTP status code from this request are captured in `errorBody` and included in the thrown `Error` message (`Telegram API Error: ${res.status} - ${errorBody}`), allowing metadata leakage into application logs and API responses.
4. **Observation 1** shows that `liveDataIngestor.js` constructs HTTP and WebSocket URLs by concatenating `this.symbol` and `this.interval` directly into target URL strings without regex validation or URL component encoding.
5. If constructor arguments or query options contain path traversal (`/../`), query delimiters (`?`, `#`), or invalid characters, the request URL structure is corrupted or altered.
6. Standard Node.js `fetch()` follows HTTP 301/302/307 redirects by default. If a remote endpoint returns a redirect pointing to `http://127.0.0.1` or `http://169.254.169.254`, native `fetch` follows it without validating the target IP.
7. Therefore, the codebase lacks SSRF protection across external HTTP and WebSocket requests, necessitating a centralized guard (`ssrfGuard.js`) that enforces scheme whitelisting, domain allowlisting, IP/CIDR blocklisting, DNS pre-flight verification, and redirect disallowance.

---

## 3. Caveats

- **No Caveats**: All network request entry points across `lyzer edge/backend` and provider subdirectories were fully inspected.
- Note: `_archive/backend/historicalDataIngestor.js` is archived code; however, if reactivated in the future, it should also adopt `safeFetch`.

---

## 4. Conclusion

1. **Severity**: Critical SSRF vector in `telegram.js` (`TELEGRAM_API_URL`); High severity parameter injection and redirect vulnerabilities in `liveDataIngestor.js` and `exchangeExecution.js`.
2. **Actionable Remediation**:
   - Implement `lyzer edge/backend/utils/ssrfGuard.js` featuring `validateUrl()`, `isPrivateIp()`, `validateSymbol()`, `validateInterval()`, and `safeFetch()`.
   - Update `liveDataIngestor.js` to validate constructor arguments and execute all HTTP and WS connections via `ssrfGuard.js`.
   - Update `telegram.js` to sanitize and validate `TELEGRAM_API_URL` before dispatching alerts.
   - Disable redirect following (`redirect: 'error'`) on all external fetch requests.

---

## 5. Verification Method

### 5.1 Verification Commands
Run unit tests for backend modules:
```powershell
cd "E:\projcts\lyzer\lyzer edge"
npm test
```
Or execute specific vitest / node tests if configured:
```powershell
npx vitest run tests/ssrfGuard.test.js
```

### 5.2 Files to Inspect
1. `E:\projcts\lyzer\lyzer edge\backend\utils\ssrfGuard.js` (New security guard module)
2. `E:\projcts\lyzer\lyzer edge\backend\liveDataIngestor.js` (Imports and uses `ssrfGuard.js`)
3. `E:\projcts\lyzer\lyzer edge\backend\telegram.js` (Sanitizes `TELEGRAM_API_URL`)
4. `E:\projcts\lyzer\.agents\explorer_m2_1\analysis.md` (Detailed security report)

### 5.3 Invalidation Conditions
- Any external request tool that bypasses `safeFetch` or allows `http:` protocol to non-localhost without validation.
- Allowing DNS resolution to private IP ranges (`10.0.0.0/8`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`).
- Allowing HTTP redirects to arbitrary URLs.
