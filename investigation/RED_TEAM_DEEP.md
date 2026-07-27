# Red Team Deep Security Audit — Lyzer Edge

**Date:** 2026-07-27  
**Scope:** Full codebase (backend, packages, constitution, frontend)  
**Severity Scale:** CRITICAL → HIGH → MEDIUM → LOW  

---

## 1. CRITICAL — Hardcoded Credentials Committed to Repository

**Files:** `.env` (lines 1–4)

```
GITHUB_TOKEN=ghp_***REDACTED***
HF_TOKEN=hf_***REDACTED***
```

Real GitHub Personal Access Token and Hugging Face token committed to version control. Anyone with repo access can:
- Push to Hugging Face Spaces under the Lyzer account
- Access private GitHub repositories if the token has sufficient scope

**Remediation:**  
- Rotate both tokens immediately via GitHub and HF dashboards  
- Add `.env` to `.gitignore` (currently it is **not** excluded)  
- Use `git filter-branch` or `git scrub` to purge from history  
- Load secrets via environment variables only at runtime  

---

## 2. CRITICAL — Command Injection via `child_process.exec()`

**File:** `lyzer edge/backend/server.js:468–477`

```js
import { exec } from 'child_process';
const runBackup = () => {
  const scriptPath = path.join(__dirname, '../backup_restore.py');
  exec(`python3 "${scriptPath}" backup`, (err, stdout, stderr) => { ... });
};
```

**Why it's dangerous:**  
- `exec()` spawns a shell, making it vulnerable to shell injection  
- If `scriptPath` ever contains user-controlled components, an attacker can inject arbitrary commands  
- `exec()` is called via `SIGINT`/`SIGTERM` handlers (lines 483–492) and on a 10-minute interval (line 480), making it a persistent attack surface  

**Remediation:** Use `execFile()` with arguments array or `spawn()` with `shell: false`.

---

## 3. CRITICAL — Weak PermissionToken Signing (Forgeable)

**File:** `packages/lyzer-constitution/src/eca/permission.js:31–35, 44–48`

```js
_signToken() {
    const payload = `${this.id}|${this.action}|${this.granted}|${this.reason}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
}
```

**Why it's forgeable:**  
- Uses a raw SHA-256 hash of deterministic fields — **no HMAC, no secret key**  
- Every field is known to the caller: `id` is `crypto.randomUUID()`, `action` is `'EXECUTE_TRADE'`, `granted` is `true`, `reason` is known  
- The Execution Layer or a malicious process can reconstruct the exact same hash and forge a `PermissionToken`  
- The comment on line 24 says "In a real multi-process system, this is signed with the Court's private key" — this placeholder was never replaced  

**Exploit scenario:** An attacker with network access to the IPC channel can forge "ALLOW" tokens and bypass the entire court → C-CLIST → MOL pipeline.

**Remediation:**  
```js
_signToken() {
    const payload = `${this.id}|${this.action}|${this.granted}|${this.reason}`;
    return crypto.createHmac('sha256', COURT_SECRET_KEY).update(payload).digest('hex');
}
```
The `COURT_SECRET_KEY` must be a long random value known only to the ConstitutionalCourt process, never transmitted to the Execution Node.

---

## 4. HIGH — SQL Injection via Template Literal in PRAGMA

**File:** `lyzer edge/backend/db.js:410–416`

```js
walCheckpoint(mode = 'PASSIVE') {
    return new Promise((resolve, reject) => {
        this.db.run(`PRAGMA wal_checkpoint(${mode});`, (err) => { ... });
    });
}
```

**Why it's dangerous:**  
- `mode` is interpolated directly into the SQL statement without sanitization  
- If called from an API endpoint or with user-controlled `mode`, allows arbitrary SQL execution  
- While PRAGMA is limited, `ATTACH DATABASE` + PRAGMA patterns can be exploited  

**Remediation:**  
```js
const VALID_MODES = ['PASSIVE', 'FULL', 'RESTART', 'TRUNCATE'];
if (!VALID_MODES.includes(mode)) throw new Error('Invalid checkpoint mode');
this.db.run(`PRAGMA wal_checkpoint(${mode});`, ...);
```

---

## 5. HIGH — Insecure Randomness for Security-Critical Operations

**Files with `Math.random()` in sensitive contexts:**

| File | Line | Usage | Risk |
|------|------|-------|------|
| `lyzer edge/backend/streamEngine.js` | 137, 139, 140, 141, 163–167 | Synthetic candle generation for simulation | Low (simulation) |
| `packages/lyzer-constitution/src/eca/complianceEngine.js` | 88 | `approvalToken = \`TKN_COMPLIANCE_${Date.now()}_${Math.random()...}\`` | **HIGH** |
| `packages/lyzer-shared/src/engine/CognitiveCommandBus.js` | 40 | `command_id` generation | MEDIUM |
| `lyzer edge/src/views/StrategyLab.js` | 22 | Strategy scenario IDs | MEDIUM |

**Key finding:** The `complianceEngine.js` generates **compliance approval tokens** using `Math.random()` — a PRNG that is predictable if you can observe previous outputs. An attacker who predicts the next compliance token can forge approvals.

**File:** `packages/lyzer-constitution/src/eca/complianceEngine.js:88`
```js
const approvalToken = `TKN_COMPLIANCE_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
```

**Remediation for all:** Replace with `crypto.randomBytes()` or `crypto.randomUUID()`.

---

## 6. HIGH — No Schema Validation on WebSocket Incoming Messages

**File:** `lyzer edge/backend/liveDataIngestor.js:272–296`

```js
this.ws.on('message', (data) => {
    try {
        const payload = JSON.parse(data);
        if (payload && payload.k) {
            const kline = payload.k;
            const candle = {
                openTime: kline.t,
                open: parseFloat(kline.o),
                ...
            };
            if (this.onTick) this.onTick(candle);
            if (kline.x) onCandleClose(candle);
        }
    } catch (e) { ... }
});
```

**Why it's dangerous:**  
- No schema validation of the Binance WS message structure  
- No type validation on fields — if `kline.o` is not a number, `parseFloat()` returns `NaN`, which propagates through the entire pipeline  
- A malformed or malicious WS message could cause `NaN` prices, stop losses that never trigger, or denial of service  

**Also in `streamEngine.js:204–208`:**
```js
this.ingestor.onTick = (candle) => {
    this.checkTickPositionExit(candle);
    this.emit('arl', { type: 'tick', ... });
};
```

`checkTickPositionExit` (line 394) does `price <= pos.stopLoss` — if `price` is `NaN`, the comparison is `false`, and an active position may never close.

**Remediation:** Add JSON Schema validation using `zod` or `ajv` for the Binance kline data shape.

---

## 7. HIGH — No Rate Limiting on Any API Endpoint

**File:** `lyzer edge/backend/server.js`

All 20+ API routes (lines 49–394) have **zero** rate limiting. A malicious actor can:

- Flood `/api/candles/:symbol` (line 354) with different symbols to cause DB load  
- Hammer `/api/experiments/dashboard` (line 61) repeatedly  
- Call `/api/test-telegram` (line 345) to spam the Telegram channel  

**Remediation:**  
```js
import rateLimit from 'express-rate-limit';
app.use('/api/', rateLimit({ windowMs: 60000, max: 100 }));
```

---

## 8. HIGH — Missing Authentication on Sensitive Endpoints

**File:** `lyzer edge/backend/server.js`

Routes **without** `authenticateAdmin` middleware:

| Route | Line | What it exposes |
|-------|------|-----------------|
| `GET /api/experiments/dashboard` | 61 | All experiment data |
| `GET /api/experiments/active` | 71 | Active experiment state |
| `GET /api/experiments/alpha-discovery` | 145 | Alpha signals |
| `GET /api/experiments/ranking` | 212 | Historical trading data |
| `GET /api/experiments/:id` | 223 | Single experiment detail |
| `GET /api/trades/export` | 327 | Full trade history export |
| `GET /api/candles/:symbol` | 354 | Current price + trades |
| `GET /api/extinction/status` | 384 | Engine state |
| `GET /api/test-telegram` | 345 | Telegram spam vector |
| `POST /api/trades/close` | 238 | **Has auth** ✓ |

The `authenticateAdmin` check (line 40–46) is weak: it accepts the key from `query` string (`req.query.adminKey`), meaning the key leaks in server logs.

**Remediation:** Accept admin key only via `Authorization: Bearer <key>` header.

---

## 9. MEDIUM — Race Conditions in Async State Management

**File:** `lyzer edge/backend/streamEngine.js:483–915` (`processCandle`)

**Issues:**

a) **Shared mutable `this.activePosition` accessed without locks:**
- `processCandle` (line 483) reads/writes `this.activePosition` (line 599, 699, 763, 906)  
- `checkTickPositionExit` (line 394) also reads/writes `this.activePosition` (line 397, 474)  
- Both are called from `startLiveMode`'s WS callback (line 212) and `onTick` (line 206)  
- There is **no mutex** preventing concurrent modification  

b) **`this.tradeHistory` push races:** Lines 670, 269, 457 are not synchronized

c) **`this.candles` array mutation:** Lines 235–239 (`shift`), 380 (`push`), 198 (reassignment) race with reads at line 506, 735

**Exploit scenario:** Two rapid WebSocket messages arrive. The first triggers a position close (line 599–701), the second sees `this.activePosition` as non-null before the first sets it to null (line 699), causing double-processing or phantom trades.

**Remediation:** Use a per-engine async mutex (e.g., `async-mutex` or a simple promise chain).

---

## 10. MEDIUM — Prototype Pollution via Unsafe Spread/Assign

**Files with unsafe spread on user-influenceable data:**

| File | Line | Code |
|------|------|------|
| `lyzer edge/backend/db.js` | 402 | `...r, conditions: JSON.parse(r.conditions_json)` |
| `lyzer edge/backend/db.js` | 475 | `...r` inside `getExperiment` |
| `lyzer edge/backend/db.js` | 489 | `...r` inside `getExperimentTrades` |
| `lyzer edge/backend/db.js` | 745 | `...row` in `getCandles` |
| `lyzer edge/backend/server.js` | 330 | `...t` on trade objects |
| `lyzer edge/backend/streamEngine.js` | 669 | `...resolvedTrade` |
| `lyzer edge/backend/streamEngine.js` | 851 | `...kernelResult` |

**Why it matters:** If `JSON.parse` returns `{ "__proto__": { "polluted": true } }`, the spread operator (or `Object.assign`) can pollute `Object.prototype`.

**Remediation:** Use `JSON.parse` with a reviver that rejects `__proto__` keys, or use `Object.create(null)` before spreading.

---

## 11. MEDIUM — Memory Leaks: Event Listeners Never Removed

**Frontend files with `addEventListener` but no `removeEventListener`:**

| File | Line | Event |
|------|------|-------|
| `lyzer edge/src/views/Dashboard.js` | 241 | `window.addEventListener('resize', ...)` |
| `lyzer edge/src/views/EvolutionView.js` | 162 | `window.addEventListener('resize', ...)` |
| `lyzer edge/src/views/MonteCarloView.js` | 294 | `window.addEventListener('resize', ...)` |
| `lyzer edge/src/views/Router.js` | 42 | `window.addEventListener('hashchange', ...)` |
| `lyzer edge/src/views/Router.js` | 80 | Has `removeEventListener` ✓ |
| `lyzer edge/src/views/DecisionStream.js` | 516–537 | Multiple DOM listeners |
| `lyzer edge/src/views/StrategyLab.js` | 205–253 | Multiple DOM listeners |

Dashboard.js:241 appears to be the most critical — resizing the page 1000 times adds 1000 resize listeners.

**Backend:**  
- `streamEngine.js:206` — `onTick` callback persists across ingestor reconnects  
- Each `engine.on('arl', ...)` and `engine.on('state_changed', ...)` in `server.js:430–434` creates new listeners on every restart  

**Remediation:** Store listener references and call `removeEventListener` in the view's `destroy`/`cleanup` method.

---

## 12. MEDIUM — SSRF via Unvalidated HTTP Fetch Targets

**File:** `lyzer edge/backend/exchangeExecution.js:33–41`

```js
let queryString = `symbol=${symbol.toUpperCase()}&side=${side.toUpperCase()}...`;
const url = `${this.baseUrl}/api/v3/order?${queryString}`;
```

While `baseUrl` is hardcoded to Binance endpoints, the `symbol`, `side`, `type`, and `quantity` parameters are **not validated** beyond `toUpperCase()`. A compromised ExchangeExecution or IPC caller could inject unexpected order parameters.

**Also:** `liveDataIngestor.js:54` constructs URLs from user-provided symbol:
```js
const url = `${this.baseUrl}/api/v3/klines?symbol=${this.symbol}&interval=${this.interval}&limit=101`;
```

The `this.symbol` comes from config (line 29), but if the ingestor is recreated with a malicious symbol (path traversal?), it could request arbitrary paths from Binance.

**File:** `lyzer edge/backend/liveDataIngestor.js:263`
```js
const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@kline_${this.interval}`;
```

Same issue — only `toLowerCase()` sanitization. No character filtering.

---

## 13. MEDIUM — Unbounded Array Growth (OOM Risk)

**File:** `lyzer edge/backend/streamEngine.js:237`

```js
if (this.mtfCandles['1m'].length > 1000) {
    this.mtfCandles['1m'].shift();
}
```

While `1m` candles are capped at 1000, **fallback mode** (line 359–382) pushes `fakeCandle` to `this.candles` **without any cap**:
```js
this.candles.push(fakeCandle);
this.processCandle(fakeCandle, nextIndex);
```

In fallback mode (triggered on connection loss), candles grow unbounded, causing OOM on long-running instances.

**Also:** `updateMtfCandles` (line 285) caps other timeframes at 500, but the fallback loop bypasses this entirely by using `this.candles` directly.

---

## 14. LOW — Hardcoded Magic Numbers and Configuration

**File:** `lyzer edge/backend/streamEngine.js:725`

```js
const baseQty = 0.001;
```

Hardcoded base quantity for orders. Should be configurable per-asset.

**File:** `lyzer edge/backend/streamEngine.js:746–747`

```js
let slDistance = 0.0025; // 0.25% micro SL fallback
let tpDistance = 0.0050; // 0.50% micro TP fallback
```

Hardcoded stop-loss and take-profit percentages used when ATR is unavailable.

**File:** `lyzer edge/backend/liveDataIngestor.js:18–25`
```js
const BASE_PRICES = {
    BTCUSDT: 95000,
    ETHUSDT: 3300,
    ...
};
```

Hardcoded base prices for synthetic fallback. If the exchange configuration changes (e.g., a reverse split), these become wildly inaccurate, causing incorrect position sizing and risk calculations.

---

## 15. LOW — API Key Leaks in Server Logs

**File:** `lyzer edge/backend/server.js:43`
```js
const keyHeader = req.headers['x-admin-key'] || req.query.adminKey || ...;
```

If an admin key is passed via query string, it appears in:
- `console.log` output  
- Express request logs  
- Any log aggregation service  
- Browser history and bookmarks  

**Remediation:** Remove `req.query.adminKey` support. Accept keys only via `Authorization` header.

---

## 16. LOW — Missing Input Validation on Trade Close Endpoint

**File:** `lyzer edge/backend/server.js:238–283`

```js
app.post('/api/trades/close', authenticateAdmin, (req, res) => {
    const { symbol, id, exitPrice, exitDate, fees } = req.body;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });
```

- `exitPrice` can be `undefined` or `null`  
- `id` is used for matching but isn't validated as a string  
- `fees` is accepted but never used (dead parameter)  
- No type validation on any field  

The engine uses `exitPrice` directly in PnL calculation (line 247–249):
```js
const rawPnl = pos.direction === 'LONG'
    ? (exitPrice - pos.entryPrice) / pos.entryPrice
    : (pos.entryPrice - exitPrice) / pos.entryPrice;
```

If `exitPrice` is `undefined`, `rawPnl` becomes `NaN`, which propagates into trade history.

---

## 17. LOW — Insecure `process.exit()` with Timeout on Shutdown

**File:** `lyzer edge/backend/server.js:486, 491`

```js
setTimeout(() => process.exit(0), 4000);
```

- `process.exit()` forces immediate termination without cleanup  
- Active WebSocket connections are dropped ungracefully  
- In-flight database writes may be lost  
- The 4-second timeout means backup script may not complete before exit  

**Remediation:** Use `server.close()` and `wss.close()` with graceful draining before exiting.

---

## Summary Table

| # | Severity | Category | File | Line(s) |
|---|----------|----------|------|---------|
| 1 | **CRITICAL** | Hardcoded credentials | `.env` | 1–4 |
| 2 | **CRITICAL** | Command injection | `server.js` | 468–477 |
| 3 | **CRITICAL** | Weak token signing | `permission.js` | 31–35 |
| 4 | **HIGH** | SQL injection | `db.js` | 412 |
| 5 | **HIGH** | Insecure randomness | `complianceEngine.js` | 88 |
| 6 | **HIGH** | WS message validation | `liveDataIngestor.js` | 272–296 |
| 7 | **HIGH** | No rate limiting | `server.js` | all routes |
| 8 | **HIGH** | Missing auth | `server.js` | multiple routes |
| 9 | **MEDIUM** | Race conditions | `streamEngine.js` | 394, 599, 699, 763 |
| 10 | **MEDIUM** | Prototype pollution | `db.js`, `server.js`, `streamEngine.js` | multiple |
| 11 | **MEDIUM** | Memory leaks | `Dashboard.js`, etc. | 241 |
| 12 | **MEDIUM** | SSRF | `exchangeExecution.js`, `liveDataIngestor.js` | 33, 54, 263 |
| 13 | **MEDIUM** | Unbounded array | `streamEngine.js` | 380 |
| 14 | **LOW** | Magic numbers | `streamEngine.js` | 725, 746–747 |
| 15 | **LOW** | Key in logs | `server.js` | 43 |
| 16 | **LOW** | Input validation | `server.js` | 238–283 |
| 17 | **LOW** | Forceful shutdown | `server.js` | 486, 491 |

---

## Attack Chain Scenarios

### Chain A: From No Auth to Unauthorized Trading
```
No rate limit (7) + Missing auth (8) → Flood /api/trades/close
→ Race condition (9) triggers double-close on the same position
→ SSRF (12) sends malicious order to exchange
```

### Chain B: Forging Court Authorization
```
Weak signing (3) → Reconstruct PermissionToken hash
→ Bypass C-CLIST + MOL → Execute unauthorized trades
→ All trades logged as "ALLOW" in ledger
```

### Chain C: Token Leak → Full Compromise
```
.env committed (1) → HF_TOKEN compromises Hugging Face Space
→ Attacker modifies environment → Injects fake trading signals
→ Compromised exec() (2) runs arbitrary commands on the server
```
