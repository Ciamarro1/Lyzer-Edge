# Handoff Report - Explorer 6 (Milestone 2 - Fix SSRF Vulnerabilities)

**Agent ID**: `explorer_m2_3`  
**Milestone**: Milestone 2 (Fix SSRF Vulnerabilities)  
**Target Codebase**: `E:\projcts\lyzer`  
**Handoff Type**: Hard Handoff (Task Complete)  

---

## 1. Observation

Directly observed files, line numbers, and network client patterns across `E:\projcts\lyzer`:

1. **`lyzer edge/backend/telegram.js`**:
   - Line 10: `const apiBase = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';`
   - Line 18: `const url = \`${sanitizedBase}/bot${token}/sendMessage\`;`
   - Line 21: `const res = await fetch(url, { method: 'POST', ... });`
   - *Observation*: Uses unvalidated environment variable `TELEGRAM_API_URL`. If manipulated, requests can be redirected to internal loopback (`http://127.0.0.1`) or AWS/GCP cloud metadata (`http://169.254.169.254`).

2. **`lyzer edge/backend/exchangeExecution.js`** (and `providers/v1_fast/exchangeExecution.js`, `providers/v2_deep/exchangeExecution.js`):
   - Line 13: `this.baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';`
   - Line 41: `const url = \`${this.baseUrl}/api/v3/order?${queryString}\`;`
   - Line 46: `const response = await fetch(url, { method: 'POST', headers: ... });`
   - *Observation*: Constructs dynamic request URL. Default global `fetch` automatically follows 3xx redirects without re-validating destination protocol or IP.

3. **`lyzer edge/backend/liveDataIngestor.js`**:
   - Lines 9–16: Hardcoded array `BINANCE_BASE_URLS`: `'https://api.binance.com'`, `'https://data-api.binance.vision'`, `'https://api1.binance.com'`, `'https://api2.binance.com'`, `'https://api3.binance.com'`, `'https://api4.binance.com'`.
   - Line 60: `const res = await fetch(url, { signal: controller.signal });`
   - Line 149: `const res = await fetch(url, { signal: controller.signal });`
   - Line 263: `const wsUrl = \`wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@kline_${this.interval}\`;`
   - Line 264: `this.ws = new WebSocket(wsUrl);`
   - *Observation*: Multiple fallback HTTP REST calls and WebSocket connection.

4. **`lyzer edge/backend/sports/sportsDataIngestor.js`**:
   - Line 15: `const wsUrl = \`wss://api.odds-api.io/v3/ws?apiKey=${this.apiKey}\`;`
   - Line 16: `this.ws = new WebSocket(wsUrl);`

5. **`lyzer edge/backend/providers/v1_fast/ipc_client.js` & `providers/v2_deep/ipc_client.js`**:
   - Line 7: `hostname: '127.0.0.1'`
   - Line 8: `port: 8080`
   - Line 17: `const req = http.request(options, (res) => { ... });`
   - *Observation*: Internal loopback IPC request to local Rust hub.

6. **Repository Scan Result**:
   - Scanner executed via custom Node script (`scan_network_calls.js`) identified 134 occurrences across 45 files in `E:\projcts\lyzer`. Detailed inventory saved to `E:\projcts\lyzer\.agents\explorer_m2_3\analysis.md`.

---

## 2. Logic Chain

1. **Premise 1**: Outbound HTTP clients (`fetch`, `http.request`, `axios`) that accept dynamic parameters, environment variable overrides, or unvalidated hostnames are susceptible to SSRF, DNS Rebinding, and Redirect Hijacking if they lack protocol validation, IP range filtering, domain whitelisting, and redirect controls.
2. **Premise 2**: In `telegram.js`, `TELEGRAM_API_URL` defaults to `https://api.telegram.org`, but if overridden by an environment variable or malicious configuration drift to `http://169.254.169.254/latest/meta-data/` or `http://127.0.0.1:8080`, native `fetch` will send requests to internal targets without restriction.
3. **Premise 3**: Standard `fetch` automatically follows 3xx HTTP redirects (`redirect: 'follow'`). If a remote host (e.g. an external API endpoint or compromised server) responds with `302 Found` pointing to `Location: http://169.254.169.254/`, native `fetch` follows the redirect to the internal cloud metadata endpoint.
4. **Premise 4**: Standard DNS lookup happens right before connecting. A DNS Rebinding attack can resolve a domain to a public IP address during initial validation and then respond with `127.0.0.1` during request connection.
5. **Conclusion**: To eliminate SSRF vulnerabilities across the entire application ecosystem, `Lyzer Edge` requires a centralized Network Shield / URL Validator component (`lyzer edge/backend/utils/urlValidator.js`) providing `validateUrl()` and `safeFetch()`.

---

## 3. Caveats

1. **Read-Only Scope**: As an Explorer agent, no source files outside `.agents` were modified. The code for `urlValidator.js` and remediation diffs have been designed and documented in `analysis.md` for implementation by the Worker agent.
2. **IPC Exemption**: Local IPC clients (`ipc_client.js`) deliberately target `127.0.0.1:8080`. `validateUrl()` must support an `allowPrivate: true` flag specifically for intentional internal loopback communications.
3. **Environment Assumptions**: Node.js runtime version is `v24.14.1`, which supports global native `fetch`, `URL`, `dns.promises.lookup`, and `net`.

---

## 4. Conclusion

1. **Catalog Complete**: All 134 occurrences of outbound network request clients across `E:\projcts\lyzer` have been audited and cataloged.
2. **Vulnerability Identified**: Primary SSRF risks lie in `telegram.js` (unfiltered `TELEGRAM_API_URL`), standard `fetch` redirect handling across backend services, and lack of DNS rebinding protection.
3. **Design Finalized**: Designed universal Network Shield component `lyzer edge/backend/utils/urlValidator.js` featuring:
   - Protocol restriction (`http:`, `https:`)
   - Domain whitelisting (`DEFAULT_ALLOWED_DOMAINS` + custom whitelist)
   - DNS resolution and CIDR range blocking for all IPv4/IPv6 private, loopback (`127.0.0.0/8`), link-local/cloud metadata (`169.254.0.0/16`), ULA (`fc00::/7`), IPv4-mapped IPv6 (`::ffff:0:0/96`), and Alibaba IMDS (`100.100.100.200/32`).
   - `safeFetch(url, options)` HTTP wrapper with manual redirect validation (`redirect: 'manual'`) and max redirect quota (`maxRedirects: 5`).

---

## 5. Verification Method

To verify the design and subsequent implementation:

1. **File Locations to Inspect**:
   - `E:\projcts\lyzer\.agents\explorer_m2_3\analysis.md` (Detailed audit report & complete design code)
   - `E:\projcts\lyzer\.agents\explorer_m2_3\handoff.md` (This handoff report)
   - `E:\projcts\lyzer\lyzer edge\backend\utils\urlValidator.js` (To be created by Worker)

2. **Automated Unit Verification Suite Command**:
   When Worker implements `urlValidator.js`, run:
   ```powershell
   node -e "
   import('./lyzer edge/backend/utils/urlValidator.js').then(async ({ validateUrl }) => {
     try {
       await validateUrl('http://127.0.0.1');
       console.error('FAIL: Allowed 127.0.0.1');
     } catch (e) {
       console.log('PASS: Blocked 127.0.0.1 ->', e.message);
     }
     try {
       await validateUrl('http://169.254.169.254');
       console.error('FAIL: Allowed 169.254.169.254');
     } catch (e) {
       console.log('PASS: Blocked 169.254.169.254 ->', e.message);
     }
     try {
       await validateUrl('https://api.binance.com');
       console.log('PASS: Allowed https://api.binance.com');
     } catch (e) {
       console.error('FAIL: Blocked valid domain ->', e.message);
     }
   });
   "
   ```

3. **Invalidation Conditions**:
   - If `validateUrl` fails to block `::ffff:127.0.0.1` or `169.254.169.254`.
   - If `safeFetch` permits following a redirect to `127.0.0.1`.
   - If valid requests to `api.binance.com` or `api.telegram.org` are falsely blocked.

