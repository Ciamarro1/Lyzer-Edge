# Comprehensive Prototype Pollution Analysis Report (Milestone 1)

**Target Project**: `E:\projcts\lyzer`  
**Focus Files**: `streamEngine.js` (`lyzer edge/backend/streamEngine.js`, `v1_fast/streamEngine.js`, `v2_deep/streamEngine.js`) and `packages/` modules (`lyzer-constitution`, `lyzer-shared`).  
**Investigator**: Explorer 2  
**Date**: 2026-07-31  

---

## 1. Executive Summary

A comprehensive read-only audit of `streamEngine.js` and all sub-packages in `packages/` was performed to identify Prototype Pollution vulnerabilities. Prototype Pollution occurs when untrusted input allows an attacker to modify `Object.prototype`, causing global application state corruption, denial of service (DoS), or remote code execution (RCE).

Our investigation identified three main categories of vulnerability:
1. **Unsafe Object Spread Operations** (`{ ... }`) merging dynamic data, telemetry payloads, and trade resolutions without key sanitization.
2. **Unsanitized `JSON.parse` Invocation** in real-time WebSocket ingestion (`liveDataIngestor.js`, `wsClient.js`), database queries (`queries.js`), and state persistence modules (`statePersistence.js`, `capitalGovernor.js`).
3. **Unsafe Deep Cloning via `JSON.parse(JSON.stringify(...))`** in governance and constitutional auditing components (`vault.js`, `ledger.js`), which serializes and deserializes `__proto__` as an own property.

---

## 2. Detailed Findings & Vulnerability Evidence

### Category A: Unsafe Object Spread Operations

#### Finding A.1: Unsanitized Trade Payload Merging in `streamEngine.js`
- **Location**: `lyzer edge/backend/streamEngine.js`, Lines 460 & 683
- **Vulnerable Code Snippet**:
  ```javascript
  // Line 460
  const ev = computeTradeEV(resolvedTrade, {}, this.tradeHistory, this.globalEVMemory);
  const tradeWithEv = { ...resolvedTrade, ev };
  this.tradeHistory.push(tradeWithEv);

  // Line 683
  ev = computeTradeEV(resolvedTrade, {}, this.tradeHistory, this.globalEVMemory);
  const tradeWithEv = { ...resolvedTrade, ev };
  this.tradeHistory.push(tradeWithEv);
  ```
- **Analysis & Vector**: `resolvedTrade` constructs properties derived from position objects (`pos.signal`, `pos.regime`, `pos.governanceDecision`). If any of these fields are populated from untrusted external telemetry or state restoration containing `__proto__` or `constructor.prototype`, spreading `resolvedTrade` creates an object carrying those properties. When `tradeHistory` is serialized/deserialized or iterated, polluted properties pollute higher-level structures.

#### Finding A.2: Telemetry & Kernel Package Merging in `streamEngine.js`
- **Location**: `lyzer edge/backend/streamEngine.js`, Lines 882–888 & Line 842
- **Vulnerable Code Snippet**:
  ```javascript
  // Line 882-888
  kernel: {
    ...kernelResult,
    v1_narrative: v1Narrative.narrative,
    v2_narrative: v2Narrative.narrative,
    scale_divergence_score: sds,
    csrl_invariants: invariants
  }

  // Line 842
  reasonCodes: [rejectionReason, ...kernelResult.reason_codes]
  ```
- **Analysis & Vector**: `kernelResult` is returned from `truthKernel.evaluate(providers, ...)`. The object spread `{ ...kernelResult, ... }` blindly copies all enumerable properties of `kernelResult` into the emitted `arl` event payload. If `kernelResult` contains injected properties from dynamic provider signals, prototype pollution is propagated down WebSocket event streams to UI and secondary handlers.

#### Finding A.3: Dynamic Resolution Overwrites in `tradeMemoryRegistry.js`
- **Location**: `lyzer edge/backend/providers/v2_deep/tradeMemoryRegistry.js`, Line 93
- **Vulnerable Code Snippet**:
  ```javascript
  export function updateTradeResolution(tradeId, resolutionData) {
    ...
    if (idx !== -1) {
      registry[idx] = { ...registry[idx], ...resolutionData, status: 'RESOLVED' };
      fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
    }
  }
  ```
- **Analysis & Vector**: `resolutionData` is supplied by callers of `updateTradeResolution`. Performing a shallow spread `{ ...registry[idx], ...resolutionData }` without filtering `resolutionData` allows callers to pass `{ "__proto__": { "polluted": true } }`. When serialized to disk and later parsed, `Object.prototype` becomes polluted across the entire application runtime.

---

### Category B: Unsanitized `JSON.parse` Operations

#### Finding B.1: Live WebSocket Ingestion in `liveDataIngestor.js`
- **Location**: `lyzer edge/backend/liveDataIngestor.js`, Line 274
- **Vulnerable Code Snippet**:
  ```javascript
  this.ws.on('message', (data) => {
    try {
      const payload = JSON.parse(data);
      if (payload && payload.k) {
        const kline = payload.k;
        const candle = { ... };
        ...
      }
    } catch (e) { ... }
  });
  ```
- **Analysis & Vector**: Incoming WebSocket frames are parsed directly with native `JSON.parse`. Native `JSON.parse` transforms `"__proto__": { ... }` in JSON into an own property of the resulting object. When `payload` or `kline` is subsequently processed or spread (`const closedCandle = { ...liveCandle, closed: true }` at line 220), polluted keys corrupt candle memory streams.

#### Finding B.2: Shared WebSocket Client in `wsClient.js`
- **Location**: `packages/lyzer-shared/src/services/wsClient.js`, Line 16
- **Vulnerable Code Snippet**:
  ```javascript
  this.ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    this.listeners.forEach(fn => fn(data));
  };
  ```
- **Analysis & Vector**: All messages received over the WebSocket client are parsed without a reviver or prototype guard before broadcasting to registered event listeners.

#### Finding B.3: Unsanitized State & Disk Persistence Ingestion
- **Locations**:
  - `lyzer edge/backend/statePersistence.js`, Line 30 (`JSON.parse(raw)`)
  - `packages/lyzer-shared/src/research/execution/capitalGovernor.js`, Line 25 (`JSON.parse(raw)`)
  - `packages/lyzer-shared/src/db/queries.js`, Lines 690 & 723 (`JSON.parse(jsonString)`)
  - `packages/lyzer-shared/src/research/operations/dataLineageEngine.js`, Line 49 (`lines.map(l => JSON.parse(l))`)
  - `packages/lyzer-shared/src/research/operations/institutionalMemoryEngine.js`, Line 68 (`lines.map(l => JSON.parse(l))`)
- **Analysis & Vector**: Reading JSON strings from files, databases, or logs using default `JSON.parse` allows malicious or corrupted state files to inject prototype modifications. In `statePersistence.js`, evaluating `state[engine.symbol]` where `engine.symbol` matches `"__proto__"` directly accesses `Object.prototype`.

---

### Category C: Vulnerable Deep Cloning Patterns in Governance

#### Finding C.1: Irreversibility Vault & Constitutional Ledger Deep Cloning
- **Locations**:
  - `packages/lyzer-constitution/src/eca/vault.js`, Lines 23–26:
    ```javascript
    kernelState: JSON.parse(JSON.stringify(kernelState)),
    dslState: JSON.parse(JSON.stringify(dslState)),
    policies: JSON.parse(JSON.stringify(policies)),
    riskConstraints: JSON.parse(JSON.stringify(riskConstraints))
    ```
  - `packages/lyzer-constitution/src/eca/ledger.js`, Line 113:
    ```javascript
    exportLedger() {
      return JSON.parse(JSON.stringify(this.entries));
    }
    ```
- **Analysis & Vector**: Utilizing `JSON.parse(JSON.stringify(obj))` to create immutable snapshots is a dangerous pattern. If `obj` has an own property named `__proto__`, `JSON.stringify` converts it to `"__proto__": ...`, and `JSON.parse` deserializes it as an own property. When downstream components spread or merge the exported snapshot object, prototype pollution is triggered.

---

## 3. Comprehensive Refactoring & Defense Strategy

To eliminate all prototype pollution vectors across `streamEngine.js` and `packages/`, we recommend implementing a robust defense-in-depth strategy:

### Strategy Component 1: Centralized Safe Parsing (`safeParse`)
Introduce a shared helper module `packages/lyzer-shared/src/utils/safeJson.js`:

```javascript
/**
 * Safe JSON parser that strips dangerous keys (__proto__, constructor, prototype)
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function safeParse(jsonString, reviver) {
  if (typeof jsonString !== 'string') return jsonString;
  return JSON.parse(jsonString, (key, value) => {
    if (DANGEROUS_KEYS.has(key)) {
      return undefined; // Strips prototype-polluting keys
    }
    return reviver ? reviver(key, value) : value;
  });
}
```

### Strategy Component 2: Safe Object Merging (`safeMerge` & `safeClone`)
Provide prototype-safe merging functions that prevent pollution during `{ ... }` or `Object.assign` operations:

```javascript
export function safeMerge(target, ...sources) {
  const dest = target || Object.create(null);
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of Object.keys(source)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const val = source[key];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          dest[key] = safeMerge(dest[key] || {}, val);
        } else {
          dest[key] = val;
        }
      }
    }
  }
  return dest;
}

export function safeClone(obj) {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return safeParse(JSON.stringify(obj));
}
```

### Strategy Component 3: Refactoring Targets in `streamEngine.js` & `packages/`

1. **`streamEngine.js` (Lines 460 & 683)**:
   Refactor:
   ```javascript
   const tradeWithEv = safeMerge({}, resolvedTrade, { ev });
   ```
2. **`streamEngine.js` (Lines 882–888)**:
   Refactor:
   ```javascript
   kernel: safeMerge({}, kernelResult, {
     v1_narrative: v1Narrative.narrative,
     v2_narrative: v2Narrative.narrative,
     scale_divergence_score: sds,
     csrl_invariants: invariants
   })
   ```
3. **`tradeMemoryRegistry.js` (Line 93)**:
   Refactor:
   ```javascript
   const sanitizedResolution = safeMerge({}, resolutionData);
   registry[idx] = safeMerge({}, registry[idx], sanitizedResolution, { status: 'RESOLVED' });
   ```
4. **`liveDataIngestor.js` (Line 274) & `wsClient.js` (Line 16)**:
   Refactor:
   ```javascript
   const payload = safeParse(data);
   ```
5. **`vault.js` (Lines 23–26) & `ledger.js` (Line 113)**:
   Refactor:
   ```javascript
   kernelState: safeClone(kernelState),
   dslState: safeClone(dslState),
   policies: safeClone(policies),
   riskConstraints: safeClone(riskConstraints)
   ```

---

## 4. Verification & Testing Matrix

To verify fixes applied in Milestone 1:

1. **Unit Test for Prototype Injection**:
   Send payload `{"__proto__": {"polluted": true}}` to `safeParse` and `liveDataIngestor`. Verify `Object.prototype.polluted` remains `undefined`.
2. **Spread Operator Regression Test**:
   Pass `{ "__proto__": { "injected": 123 }, "id": "trade_1" }` to `tradeMemoryRegistry.updateTradeResolution`. Verify `({}).injected` is `undefined`.
3. **StreamEngine E2E Simulation**:
   Execute `StreamEngine` tick simulation loop for 100 ticks and verify `this.tradeHistory` items are free of prototype pollution.

---
