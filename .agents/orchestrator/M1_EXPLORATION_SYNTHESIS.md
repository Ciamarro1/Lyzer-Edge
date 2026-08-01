# Milestone 1 Exploration Synthesis — Prototype Pollution Vulnerabilities

## Overview
Explorers 1 and 2 investigated the backend repository (`E:\projcts\lyzer`) for Prototype Pollution vulnerabilities, specifically raw `JSON.parse` usage combined with object spread (`{ ... }`), `Object.assign`, or dynamic property assignments.

## Synthesized Vulnerability Catalog

| Category | File | Line Numbers | Vulnerable Pattern | Risk |
|---|---|---|---|---|
| **Database Deserialization** | `lyzer edge/backend/db.js` | 284, 370-374, 424-425, 499-500, 513-514, 774-776 | `{ ...row, value: JSON.parse(row.value_json) }` | High |
| **HTTP Request Parsing** | `lyzer edge/backend/server.js` | 54, 258, 349-351 | `app.use(express.json())` without body sanitization; spreading `tradeHistory` | Critical |
| **Quant Pipeline Telemetry** | `lyzer edge/backend/streamEngine.js` | 460, 683, 882-888 | `{ ...resolvedTrade, ev }`, `{ ...kernelResult }` | High |
| **Provider Registries** | `lyzer edge/backend/providers/v2_deep/tradeMemoryRegistry.js` | 93, 42, 78, 89 | `registry[idx] = { ...registry[idx], ...resolutionData }` | High |
| **WebSocket Ingestion** | `lyzer edge/backend/liveDataIngestor.js` & `packages/lyzer-shared/src/services/wsClient.js` | 274 (liveDataIngestor), 16 (wsClient) | `JSON.parse(data)` on incoming WS frames | Critical |
| **State Persistence** | `lyzer edge/backend/statePersistence.js` | 30 | `JSON.parse(raw)` on disk state | Medium |
| **ECA Vault & Ledger** | `packages/lyzer-constitution/src/eca/vault.js` & `ledger.js` | 23-26 (vault), 113 (ledger) | `JSON.parse(JSON.stringify(...))` deep clone anti-pattern | Medium |

## Reconciled Refactoring & Protection Strategy

1. **Centralized Safe Utilities (`lyzer edge/backend/utils/safeJson.js`)**:
   - `safeJsonParse(jsonString, fallback = null)`: Custom `JSON.parse` reviver that strips `__proto__`, `constructor`, and `prototype` keys during deserialization.
   - `sanitizeObject(obj)`: Recursive object sanitizer stripping polluted prototype keys.
   - `safeMerge(target, ...sources)`: Prototype-safe shallow/deep merge avoiding mutation of `Object.prototype`.
   - `safeClone(obj)`: Replaces `JSON.parse(JSON.stringify(obj))` with `structuredClone` (or prototype-safe clone fallback).
   - `sanitizeBodyMiddleware`: Express middleware that sanitizes `req.body`, `req.query`, and `req.params`.

2. **Refactoring Scope for Worker**:
   - Create `lyzer edge/backend/utils/safeJson.js` with comprehensive unit tests (`lyzer edge/tests/unit/safeJson.test.js`).
   - Refactor `db.js` (lines 284, 370-374, 424-425, 499-500, 513-514, 774-776) to use `safeJsonParse`.
   - Refactor `server.js` (line 54 and lines 349-351) to apply `sanitizeBodyMiddleware` and `safeMerge`/`safeClone`.
   - Refactor `streamEngine.js` (lines 460, 683, 882-888) to use `safeMerge`.
   - Refactor `liveDataIngestor.js` (line 274), `wsClient.js` (line 16), `tradeMemoryRegistry.js` (line 93), `statePersistence.js` (line 30), `vault.js` (lines 23-26), `ledger.js` (line 113) to use `safeJsonParse`/`safeClone`/`safeMerge`.

3. **Verification Standards**:
   - All unit tests pass.
   - Attack vector reproduction script verifies `Object.prototype.polluted` remains `undefined` on malicious inputs.
