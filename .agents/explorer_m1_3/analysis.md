# Prototype Pollution Analysis Report — Milestone 1

## Executive Summary
This report presents a thorough security audit of `E:\projcts\lyzer` for Prototype Pollution vulnerabilities arising from native `JSON.parse` calls, object spread operations (`{ ... }`), and dynamic property assignments.

- **Total `JSON.parse` Call Sites Identified**: 37 (across backend services, database handlers, WebSocket listeners, bridge processes, and shared modules).
- **Sanitization Rate**: **0%**. None of the existing `JSON.parse` calls utilize a reviver function or validate keys against forbidden property names (`__proto__`, `constructor`, `prototype`).
- **High-Risk Entry Points**: WebSocket data handlers (`liveDataIngestor.js`, `wsClient.js`), database JSON deserialization (`db.js`), and IPC/REST payload importers (`queries.js`).

---

## 1. Inventory & Risk Assessment of `JSON.parse` Sites

| Module Path | Line(s) | Context / Feature | Vulnerability / Sanitization Status | Risk Rating |
| :--- | :--- | :--- | :--- | :--- |
| `lyzer edge/backend/db.js` | 284 | `getActiveParameterVersion`: parses `value_json` and spreads `{ ...row, value: parsed }` | **Unsafe**. No key validation; spreads parsed JSON directly onto SQL row object. | **HIGH** |
| `lyzer edge/backend/db.js` | 370-374 | `_parseEvolutionRow`: parses `from_value_json`, `to_value_json`, `regime_stability_json`, `impact_analysis_json`, `observed_result_json` | **Unsafe**. Spreads raw JSON objects into evolution records. | **HIGH** |
| `lyzer edge/backend/db.js` | 424-425 | `getSemanticPatterns`: parses `conditions_json`, `graph_edges_json` | **Unsafe**. Spreads parsed objects into semantic memory patterns. | **HIGH** |
| `lyzer edge/backend/db.js` | 499-500, 513-514 | `getCausalEventsUntil` / `getCausalEventsByCorrelation`: parses `payload`, `context` | **Unsafe**. Spreads JSON payloads directly into log records. | **HIGH** |
| `lyzer edge/backend/db.js` | 774-776 | `getExperimentSnapshot`: parses `equity_curve_json`, `drawdown_curve_json`, `monthly_returns_json` | **Unsafe**. Deserializes experiment snapshot arrays/objects with spread. | **MEDIUM** |
| `lyzer edge/backend/liveDataIngestor.js` | 274 | `ws.on('message')`: parses Binance WebSocket market payload | **Unsafe**. Processes unverified WebSocket input directly via native `JSON.parse`. | **HIGH** |
| `lyzer edge/backend/statePersistence.js` | 30 | `loadEngineState`: parses local disk state file `engine_state.json` | **Unsafe**. Assigns parsed state properties directly to engine instances. | **MEDIUM** |
| `lyzer edge/backend/migrateLegacy.js` | 30 | `runMigration`: parses legacy JSON state file | **Unsafe**. Spreads trades from legacy files (`{ ...trade, symbol: ... }`). | **MEDIUM** |
| `lyzer edge/backend/providers/v2_deep/lessonRegistry.js` | 25, 43 | `recordLesson` / `getAllLessons`: parses lesson registry JSON | **Unsafe**. Spreads input lesson data into registry (`{ ...lessonData }`). | **MEDIUM** |
| `lyzer edge/backend/providers/v2_deep/tradeMemoryRegistry.js` | 42, 78, 89 | `recordTradeOutcome` / `updateTradeResolution` | **Unsafe**. Performs object spread `{ ...registry[idx], ...resolutionData }`. | **HIGH** |
| `lyzer edge/backend/sports/sportsEngine.js` | 18 | `sportsEngine`: parses raw input data | **Unsafe**. No input validation on incoming JSON data. | **MEDIUM** |
| `lyzer edge/src/db/queries.js` | 723 | `importData`: parses user-provided JSON string for DB restore | **Unsafe**. Spreads screenshots (`{ ...s, blob: ... }`) and bulk-inserts parsed objects. | **HIGH** |
| `lyzer edge/src/services/wsClient.js` | 27 | `ws.onmessage`: parses WebSocket message | **Unsafe**. Broadcasts parsed object to UI listeners without sanitization. | **HIGH** |
| `packages/lyzer-shared/src/services/wsClient.js` | 16 | `ws.onmessage`: parses WebSocket message | **Unsafe**. Broadcasts parsed payload to all attached listeners. | **HIGH** |
| `lyzer edge/src-ts/bridge/hub_to_exchange.ts` | 45 | `hub_to_exchange`: parses IPC execution decision artifact | **Unsafe**. Reads execution command payload from Rust Hub. | **HIGH** |
| `lyzer edge/src-ts/capital/capital_ledger.ts` | 20 | `CapitalLedger`: reads capital ledger JSON file | **Unsafe**. Reads persistence file without prototype checks. | **LOW** |
| `packages/lyzer-shared/src/research/execution/capitalGovernor.js` | 25 | `CapitalGovernor`: loads state from file | **Unsafe**. Restores governor state properties from raw parsed JSON. | **LOW** |
| `packages/lyzer-shared/src/research/alphaEvolutionEngine.js` | 58 | `fromJSON`: parses hypothesis collection | **Unsafe**. Populates hypotheses map from JSON input directly. | **MEDIUM** |
| `packages/lyzer-shared/src/research/operations/dataLineageEngine.js` | 49 | `verifyLineageIntegrity`: parses JSON line entries | **Unsafe**. Lineage audit parse without sanitization. | **LOW** |
| `packages/lyzer-shared/src/research/operations/institutionalMemoryEngine.js` | 68 | `queryRecentEvents`: parses JSON line entries | **Unsafe**. Returns raw parsed events from memory log. | **LOW** |

---

## 2. Deep Cloning / Copy Anti-Pattern Inventory

The codebase frequently employs `JSON.parse(JSON.stringify(obj))` as a deep-copy idiom. While this pattern does not parse external attacker string directly, if an object has already been polluted, cloning it via stringify/parse retains polluted enumerable properties or fails to protect against prototype mutation:

1. `lyzer edge/src/components/commandCenter/sdk/evidence/cognitive/MetaLearningEngine.js:58`
2. `lyzer edge/src/components/commandCenter/sdk/lacw/LACWLayoutEngine.js:75, 96, 110`
3. `lyzer edge/src/components/commandCenter/sdk/lacw/agents/UniversalAgentModel.js:83`
4. `lyzer edge/src/components/commandCenter/sdk/lacw/cognitive/ContextEngine.js:38`
5. `lyzer edge/src/components/commandCenter/sdk/lacw/observability/CognitiveTraceEngine.js:75`
6. `lyzer edge/src/components/commandCenter/sdk/lacw/plugins/UniversalPluginModel.js:77`
7. `lyzer edge/src/components/commandCenter/sdk/lacw/roadmap/FeatureLifecycleManager.js:41, 62`
8. `packages/lyzer-constitution/src/eca/ledger.js:113`
9. `packages/lyzer-constitution/src/eca/vault.js:23, 24, 25, 26`
10. `packages/lyzer-shared/src/research/liveShadow/shadowWarEnduranceSuite.js:164`

---

## 3. Vulnerability Mechanism Analysis

### The Prototype Pollution Chain in Lyzer
1. **Payload Entry**: Untrusted input is received via WebSockets (`wsClient.js`, `liveDataIngestor.js`), user data exports (`queries.js:importData`), or IPC streams.
2. **Native Parsing**: The application executes `const data = JSON.parse(input)`. If `input` contains `{"__proto__": {"polluted": true}}`, JavaScript creates an object with a literal key `"__proto__"`.
3. **Merge / Spread Execution**:
   When code performs `{ ...row, value: JSON.parse(row.value_json) }` or `Object.assign({}, target, parsedPayload)`, if a recursive merge or assignment assigns properties of `__proto__`, `Object.prototype` becomes modified.
4. **Impact**: Altering global `Object.prototype` properties disrupts key lookups across all engine services, leading to denial of service, privilege escalation, or corrupted decision-making in the trading pipeline.

---

## 4. Recommended Safe JSON Architecture

To remediate Prototype Pollution across the entire repository, we recommend establishing a centralized **Safe JSON & Object Utility**:

### 4.1 Implementation Design (`packages/lyzer-shared/src/utils/safeJson.js`)

```javascript
/**
 * Safe JSON parse utility preventing Prototype Pollution.
 * Rejects or strips keys named '__proto__', 'constructor', and 'prototype'.
 */
export function safeReviver(key, value) {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return undefined;
  }
  return value;
}

export function safeJsonParse(text, reviver = safeReviver) {
  if (typeof text !== 'string') return text;
  return JSON.parse(text, (key, value) => {
    const cleaned = safeReviver(key, value);
    return reviver && reviver !== safeReviver ? reviver(key, cleaned) : cleaned;
  });
}

/**
 * Safe Object Deep Merge helper
 */
export function safeObjectMerge(target, ...sources) {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of Object.keys(source)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      const val = source[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        target[key] = safeObjectMerge(target[key] || {}, val);
      } else {
        target[key] = val;
      }
    }
  }
  return target;
}
```

### 4.2 Migration Strategy
1. **Phase 1**: Export `safeJsonParse` and `safeObjectMerge` from `@lyzer/shared` (or shared backend utils).
2. **Phase 2**: Replace raw `JSON.parse` calls in high-risk ingestors (`wsClient.js`, `liveDataIngestor.js`, `db.js`, `queries.js`).
3. **Phase 3**: Add ESLint rule `no-restricted-syntax` prohibiting direct `JSON.parse` calls in favor of `safeJsonParse`.

---

## 5. Verification Plan
- **Unit Test Suite**: Create `packages/lyzer-shared/tests/safeJson.test.js` verifying that payloads like `{"__proto__": {"admin": true}}` do NOT modify `Object.prototype.admin`.
- **Integration Test**: Verify database deserialization in `db.js` and WebSocket ingestion using sanitized parsing.
