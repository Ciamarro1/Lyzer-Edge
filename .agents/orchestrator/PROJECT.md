# Project: Lyzer Edge Refactoring & Security Hardening

## Architecture
- **Environment**: Node.js monolithic service (Express + WebSocket + 6 StreamEngines) with SQLite backend (`db.js`).
- **Core Components**:
  - `streamEngine.js`: Quant execution pipeline (7 layers: MTF candles -> Providers -> SMC Facade -> CSRL -> Dual Reality -> TruthKernel -> Microstructure Dampener).
  - `server.js`: Express REST API & WebSocket server on port 7860.
  - `db.js`: SQLite database layer.
  - `liveDataIngestor.js` & `exchangeExecution.js`: Ingestion & Execution modules with external HTTP/WS requests.
  - `packages/` vs `lyzer edge/`: Monorepo structure with duplicate packages/files.

## Milestones Index

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Fix Prototype Pollution (R1) | `db.js`, `server.js`, `streamEngine.js`, all `JSON.parse` callers | None | IN_PROGRESS |
| 2 | Fix SSRF Vulnerabilities (R2) | `liveDataIngestor.js`, `exchangeExecution.js`, external HTTP clients | None | IN_PROGRESS |
| 3 | DB Migrations & Lifecycle (R3) | `db.js`, SQLite DDL, Court Ledger table | None | IN_PROGRESS |
| 4 | Code Deduplication (R4) | `packages/` vs `lyzer edge/` | None | IN_PROGRESS |
| 5 | Verification & E2E Tests (R5) | `lyzer edge/tests/verification/verify_*.js` | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
- Database layer (`db.js`): Exposes standard query/mutation methods, safe parsing helpers, schema migration runner, and Court Ledger persistence methods.
- Ingestion/Execution (`liveDataIngestor.js`, `exchangeExecution.js`): Validates target URLs against strict whitelist/IP filters before initiating outbound requests.

## Code Layout
- `E:\projcts\lyzer\`
  - `server.js`
  - `db.js`
  - `streamEngine.js`
  - `liveDataIngestor.js`
  - `exchangeExecution.js`
  - `packages/`
  - `tests/verification/`
