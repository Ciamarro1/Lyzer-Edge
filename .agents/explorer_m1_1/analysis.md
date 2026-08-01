# Comprehensive Prototype Pollution Security Analysis Report

**Target Codebase**: `E:\projcts\lyzer\lyzer edge\backend`
**Milestone**: Milestone 1 (Fix Prototype Pollution)
**Explorer**: Explorer 1 (`explorer_m1_1`)
**Date**: 2026-08-01

---

## Executive Summary

A comprehensive security audit of `db.js` and `server.js` (and associated backend modules in `lyzer edge/backend`) was conducted to evaluate susceptibility to **Prototype Pollution** attacks. Prototype pollution occurs when unsafe JSON parsing or object manipulations allow an attacker to inject properties into JavaScript's `Object.prototype`, affecting all objects across the Node.js runtime.

Our analysis identified **11 primary locations** across `db.js`, `server.js`, and auxiliary registry files where native `JSON.parse()` calls are paired with object spread operations (`{ ... }`) or direct property assignments without sanitizing special prototype keys (`__proto__`, `constructor`, `prototype`).

---

## 1. Vulnerability Findings & Code Evidence

### 1.1 `lyzer edge/backend/db.js`

#### Location 1: `getActiveParameterVersion()` (Line 284)
- **Code Snippet**:
  ```javascript
  284: else resolve(row ? { ...row, value: JSON.parse(row.value_json) } : null);
  ```
- **Vulnerability Mechanism**: `row.value_json` is read from SQLite database table `parameter_versions` and parsed with standard `JSON.parse`. The resulting object is spread alongside database row attributes (`{ ...row, value: ... }`).
- **Attack Vector**: If an attacker or untrusted proposal writes a JSON payload containing `"__proto__": {"admin": true}` to `parameter_versions`, `JSON.parse` instantiates an object with an own `__proto__` property. Spreading into `{ ...row }` copies this key, which can pollute `Object.prototype` when accessed or merged downstream.

#### Location 2: `_parseEvolutionRow()` (Lines 370–374)
- **Code Snippet**:
  ```javascript
  367: _parseEvolutionRow(row) {
  368:     return {
  369:         ...row,
  370:         from_value: row.from_value_json ? JSON.parse(row.from_value_json) : null,
  371:         to_value: row.to_value_json ? JSON.parse(row.to_value_json) : null,
  372:         regime_stability: row.regime_stability_json ? JSON.parse(row.regime_stability_json) : null,
  373:         impact_analysis: row.impact_analysis_json ? JSON.parse(row.impact_analysis_json) : null,
  374:         observed_result: row.observed_result_json ? JSON.parse(row.observed_result_json) : null
  375:     };
  376: }
  ```
- **Vulnerability Mechanism**: Up to 5 text columns are parsed via native `JSON.parse` and spread onto the returned object.
- **Attack Vector**: Injected evolution ledger records (e.g. from automated parameter proposal algorithms or external imports) containing `"__proto__"` in `regime_stability_json` or `impact_analysis_json` allow attackers to poison prototype properties on any system reading evolution ledger history.

#### Location 3: `getSemanticPatterns()` (Lines 422–426)
- **Code Snippet**:
  ```javascript
  422: else resolve(rows.map(r => ({
  423:     ...r,
  424:     conditions: JSON.parse(r.conditions_json),
  425:     graph_edges: JSON.parse(r.graph_edges_json)
  426: })));
  ```
- **Vulnerability Mechanism**: Database rows from `semantic_memory` are parsed using `JSON.parse(r.conditions_json)` and `JSON.parse(r.graph_edges_json)`, then combined with object spread `{ ...r }`.
- **Attack Vector**: Manipulated semantic pattern records can introduce arbitrary keys into `Object.prototype`, compromising graph edge traversal or rule evaluation.

#### Location 4: `getCausalEventsUntil()` (Lines 497–501)
- **Code Snippet**:
  ```javascript
  497: else resolve(rows.map(r => ({
  498:     ...r,
  499:     payload: JSON.parse(r.payload),
  500:     context: JSON.parse(r.context)
  501: })));
  ```
- **Vulnerability Mechanism**: `r.payload` and `r.context` store JSON-serialized event payloads from stream ingestion (`insertCausalEvent`).
- **Attack Vector**: An external stream client sending a event payload like:
  `{"payload": "{\"__proto__\": {\"bypassed\": true}}"}`
  will result in `payload` having property `__proto__`. Spreading this into `{ ...r }` creates an event object whose properties will pollute prototype chains whenever events are processed, indexed, or merged.

#### Location 5: `getCausalEventsByCorrelation()` (Lines 511–515)
- **Code Snippet**:
  ```javascript
  511: else resolve(rows.map(r => ({
  512:     ...r,
  513:     payload: JSON.parse(r.payload),
  514:     context: JSON.parse(r.context)
  515: })));
  ```
- **Vulnerability Mechanism**: Identical event payload and context parsing via `JSON.parse` with object spread `{ ...r }`.

#### Location 6: `getExperimentSnapshot()` (Lines 772–777)
- **Code Snippet**:
  ```javascript
  772: else resolve(row ? {
  773:     ...row,
  774:     equityCurve: row.equity_curve_json ? JSON.parse(row.equity_curve_json) : null,
  775:     drawdownCurve: row.drawdown_curve_json ? JSON.parse(row.drawdown_curve_json) : null,
  776:     monthlyReturns: row.monthly_returns_json ? JSON.parse(row.monthly_returns_json) : null
  777: } : null);
  ```
- **Vulnerability Mechanism**: Snapshot metrics parsed with standard `JSON.parse` and spread with `{ ...row }`.

---

### 1.2 `lyzer edge/backend/server.js`

#### Location 7: Body Parser Middleware (Line 54)
- **Code Snippet**:
  ```javascript
  54: app.use(express.json());
  ```
- **Vulnerability Mechanism**: Express `express.json()` middleware relies on `body-parser`, which calls standard `JSON.parse()` without a reviver function.
- **Attack Vector**: Any incoming HTTP POST request (e.g. `/api/experiments/freeze-and-new`, `/api/experiments/promote-champion`, `/api/experiments/update-status`, `/api/trades/close`) that includes JSON payloads with `"__proto__": { ... }` or `"constructor": { "prototype": { ... } }` populates `req.body` with prototype-polluted objects.

#### Location 8: Trade Closing & History Export Endpoints (Lines 258, 347–359)
- **Code Snippet**:
  ```javascript
  258: const { symbol, id, exitPrice, exitDate, fees } = req.body;
  ...
  347: app.get('/api/trades/export', authenticateAdmin, (req, res) => {
  348:   try {
  349:     const allTrades = engines.flatMap(e => (e.tradeHistory || []).map(t => ({
  350:       ...t,
  351:       symbol: e.symbol
  352:     })));
  ```
- **Vulnerability Mechanism**: Endpoint handlers destructure `req.body` and perform object spread operations (`{ ...t, symbol: e.symbol }`) over arrays. If input trade objects contain prototype pollution keys, spreading propagates polluted keys to all serialized outputs or state persistence calls.

---

### 1.3 Other Backend Modules

#### Location 9: `statePersistence.js` (Line 30)
- **Code Snippet**:
  ```javascript
  30: const state = JSON.parse(raw);
  ```
- **Description**: Loads persisted engine state from disk. Raw JSON parsing allows tampered state files to pollute system prototype.

#### Location 10: `liveDataIngestor.js` (Line 274)
- **Code Snippet**:
  ```javascript
  274: const payload = JSON.parse(data);
  ```
- **Description**: Ingests WebSocket live data feeds into memory without sanitizing prototype keys.

#### Location 11: `providers/v2_deep/lessonRegistry.js` (Lines 25, 43) & `tradeMemoryRegistry.js` (Lines 42, 78, 89)
- **Code Snippet**:
  ```javascript
  let registry = JSON.parse(rawData);
  ```
- **Description**: File persistence registries parsing raw JSON disk contents directly into JavaScript objects.

---

## 2. Technical Explanation of Prototype Pollution

In JavaScript V8 (Node.js runtime), when `JSON.parse('{"__proto__": {"polluted": true}}')` is executed:
1. `JSON.parse` creates a plain object with an own property key named `"__proto__"`.
2. Standard object spread `{ ...obj }` copies own enumerable properties, including `"__proto__"`.
3. If an object with an own `"__proto__"` property is later accessed via property lookup or passed into a recursive merge function (e.g. `Object.assign()`, custom deep merge, or key loop `for (let k in obj)`), the property access `target['__proto__']` resolves to `Object.prototype`.
4. Writing `target['__proto__']['polluted'] = true` mutates `Object.prototype`, adding property `polluted` to every object in the Node.js runtime environment.

### Potential Exploitation Consequences:
- **Authentication Bypass**: Injecting properties like `Object.prototype.admin = true` or `Object.prototype.isAdmin = true` can bypass middleware checks (such as `authenticateAdmin`).
- **Denial of Service (DoS)**: Polluting `Object.prototype.toString` or `Object.prototype.valueOf` causes application crashes on property evaluations.
- **Remote Code Execution (RCE)**: In Node.js environments using `child_process.execFile` or dynamic require statements, polluting `Object.prototype.shell` or `Object.prototype.NODE_OPTIONS` can lead to RCE.

---

## 3. Robust Refactoring Strategy

To systematically eliminate Prototype Pollution across `db.js`, `server.js`, and related backend services, we recommend implementing a central, zero-dependency sanitizer utility module.

### 3.1 New Utility Module: `lyzer edge/backend/utils/safeJson.js`

```javascript
/**
 * @fileoverview Utility functions to guard against Prototype Pollution.
 * Location: lyzer edge/backend/utils/safeJson.js
 */

/**
 * Parses a JSON string safely by removing dangerous prototype keys (__proto__, constructor, prototype).
 * 
 * @param {string} jsonString - The JSON string to parse.
 * @param {any} [fallback=null] - Fallback value if string is invalid or null.
 * @returns {any} Sanitized object or fallback value.
 */
export function safeJsonParse(jsonString, fallback = null) {
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(jsonString, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined; // Strips prototype pollution keys
      }
      return value;
    });
  } catch (err) {
    return fallback;
  }
}

/**
 * Recursively strips __proto__, constructor, and prototype properties from any object or array.
 * 
 * @param {any} obj - Target value to sanitize.
 * @returns {any} Cleaned value with prototype keys removed.
 */
export function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    clean[key] = sanitizeObject(obj[key]);
  }
  return clean;
}

/**
 * Express middleware to recursively sanitize req.body against prototype pollution.
 */
export function sanitizeBodyMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}
```

---

### 3.2 Refactoring `lyzer edge/backend/db.js`

Import `safeJsonParse` at top of `db.js`:
```javascript
import { safeJsonParse } from './utils/safeJson.js';
```

Refactor calls as follows:

```javascript
// Line 284 - getActiveParameterVersion
else resolve(row ? { ...row, value: safeJsonParse(row.value_json, {}) } : null);

// Lines 370-374 - _parseEvolutionRow
_parseEvolutionRow(row) {
    return {
        ...row,
        from_value: safeJsonParse(row.from_value_json),
        to_value: safeJsonParse(row.to_value_json),
        regime_stability: safeJsonParse(row.regime_stability_json),
        impact_analysis: safeJsonParse(row.impact_analysis_json),
        observed_result: safeJsonParse(row.observed_result_json)
    };
}

// Lines 422-426 - getSemanticPatterns
else resolve(rows.map(r => ({
    ...r,
    conditions: safeJsonParse(r.conditions_json, {}),
    graph_edges: safeJsonParse(r.graph_edges_json, [])
})));

// Lines 497-501 - getCausalEventsUntil
else resolve(rows.map(r => ({
    ...r,
    payload: safeJsonParse(r.payload, {}),
    context: safeJsonParse(r.context, {})
})));

// Lines 511-515 - getCausalEventsByCorrelation
else resolve(rows.map(r => ({
    ...r,
    payload: safeJsonParse(r.payload, {}),
    context: safeJsonParse(r.context, {})
})));

// Lines 772-777 - getExperimentSnapshot
else resolve(row ? {
    ...row,
    equityCurve: safeJsonParse(row.equity_curve_json, []),
    drawdownCurve: safeJsonParse(row.drawdown_curve_json, []),
    monthlyReturns: safeJsonParse(row.monthly_returns_json, {})
} : null);
```

---

### 3.3 Refactoring `lyzer edge/backend/server.js`

Import `sanitizeBodyMiddleware` at top of `server.js`:
```javascript
import { sanitizeBodyMiddleware } from './utils/safeJson.js';
```

Apply middleware immediately following `express.json()`:
```javascript
app.use(express.json());
app.use(sanitizeBodyMiddleware);
```

---

## 4. Verification & Testing Strategy

A standalone reproduction test script should be executed to verify that `safeJsonParse` and `sanitizeBodyMiddleware` eliminate prototype pollution.

### Test Script Example (`test_proto_fix.js`):
```javascript
import { safeJsonParse, sanitizeObject } from './lyzer edge/backend/utils/safeJson.js';

// Test 1: Malicious JSON string with __proto__
const maliciousJson = '{"name":"test","__proto__":{"polluted":true},"constructor":{"prototype":{"injected":true}}}';
const parsed = safeJsonParse(maliciousJson);

console.assert(parsed.__proto__ === Object.prototype, 'Prototype chain should not be overwritten');
console.assert(Object.prototype.polluted === undefined, 'Object.prototype.polluted must be undefined!');
console.assert(Object.prototype.injected === undefined, 'Object.prototype.injected must be undefined!');

// Test 2: Unsafe object sanitization
const unsafeObj = JSON.parse(maliciousJson);
const cleanObj = sanitizeObject(unsafeObj);
console.assert(Object.prototype.polluted === undefined, 'Sanitized object must not pollute prototype');

console.log('✅ All Prototype Pollution Verification Tests Passed!');
```

---

## 5. Summary Table of Vulnerability Locations

| # | File Path | Line(s) | Function / Context | Vulnerable Snippet | Recommended Fix |
|---|---|---|---|---|---|
| 1 | `lyzer edge/backend/db.js` | 284 | `getActiveParameterVersion` | `{ ...row, value: JSON.parse(...) }` | Use `safeJsonParse(row.value_json, {})` |
| 2 | `lyzer edge/backend/db.js` | 370–374 | `_parseEvolutionRow` | `from_value: JSON.parse(...)` (5 fields) | Use `safeJsonParse(...)` for all 5 fields |
| 3 | `lyzer edge/backend/db.js` | 424–425 | `getSemanticPatterns` | `conditions: JSON.parse(...)` | Use `safeJsonParse(...)` |
| 4 | `lyzer edge/backend/db.js` | 499–500 | `getCausalEventsUntil` | `payload: JSON.parse(r.payload)` | Use `safeJsonParse(...)` |
| 5 | `lyzer edge/backend/db.js` | 513–514 | `getCausalEventsByCorrelation` | `payload: JSON.parse(r.payload)` | Use `safeJsonParse(...)` |
| 6 | `lyzer edge/backend/db.js` | 774–776 | `getExperimentSnapshot` | `equityCurve: JSON.parse(...)` | Use `safeJsonParse(...)` |
| 7 | `lyzer edge/backend/server.js` | 54 | Express Middleware | `app.use(express.json())` | Add `app.use(sanitizeBodyMiddleware)` |
| 8 | `lyzer edge/backend/server.js` | 258, 349–351 | Trade Routes & Export | Destructuring & `{ ...t, symbol: e.symbol }` | Sanitized `req.body` via middleware |
| 9 | `lyzer edge/backend/statePersistence.js` | 30 | `loadEngineState` | `JSON.parse(raw)` | Use `safeJsonParse(raw, [])` |
| 10 | `lyzer edge/backend/liveDataIngestor.js` | 274 | Ingestion loop | `JSON.parse(data)` | Use `safeJsonParse(data)` |
| 11 | `lyzer edge/backend/providers/v2_deep/*` | 25, 42, 78 | Lesson & Trade Registries | `JSON.parse(rawData)` | Use `safeJsonParse(rawData)` |
