# Lyzer Edge — Agent Guide

## Repository Structure

- **npm workspaces** monorepo: `packages/*` (shared libs) + `lyzer edge` (main app)
- **3 Rust workspaces**: `src-rust/` (kernel), `lyzer-workspace/` (constitutional hub), `lyzer edge/src-rust/` (edge services)
- **Key packages**: `@lyzer/shared` (engines: kernel, csrl, providers), `@lyzer/constitution` (ECA court)

## Key Entrypoints

- **Backend server**: `lyzer edge/backend/server.js` — Express 5 + WebSocket on port 7860, spawns 6 StreamEngine instances
- **Frontend SPA**: `lyzer edge/src/main.js` → `app.js` (hash-based router, 24 routes)
- **StreamEngine**: `lyzer edge/backend/streamEngine.js` — orchestrates data ingestion → signal evaluation → TruthKernel → ECA court → execution
- **Docker**: Hugging Face Spaces (`sdk: docker`), 2-stage build on `rust:1.78-bookworm` → `ubuntu:24.04`

## Developer Commands

All commands run from `lyzer edge/`:

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite dev server (frontend only) |
| `npm run build` | Vite production build |
| `npm run backend` | `node backend/server.js` |
| `npm run full` | Concurrently: backend + Vite dev |
| `npm test` | `vitest run` (jsdom env) |
| `npm run test:watch` | `vitest` watch mode |
| `npm run test:verify` | `vitest run tests/verification` (focused smoke tests) |
| `npm run lint` | `eslint .` |
| `npm run coverage` | `vitest run --coverage` |

Root `npm install` installs all workspaces.

## Architecture — Trading Pipeline

A trade requires ALL layers to pass (in order):

1. **Providers** V1 (SMC/ICT), V2 (SnD), V3 (Momentum RSI) generate signals from candles
2. **ResidualizationLayer** — destroys consensus between providers (configurable `consensusLimit`, set to 0 to disable)
3. **ExecutionTriggerLayer** — requires TRG (Tail Risk Geometry) ≥ threshold (default 0.4 via `TRG_THRESHOLD`)
4. **TruthKernel** — veto if LHDS > limit or ontological collapse (configurable via `LHDS_VETO_LIMIT`, `ONTOLOGICAL_COLLAPSE_TRG`)
5. **C-CLIST** — stress oracle, accumulates when DVF is flat, blocks at `lethalIllusionLimit` (default 0.9)
6. **MOL** — recovery state requires `sclThreshold` consecutive stable ticks to re-allow execution
7. **Constitutional Court** — final gate, validates EEF, constraint engine, edge-riding detection

## Environment Variables

Copy `lyzer edge/.env.template` → `.env`. Key vars:

- `ARL_MODE`: `SIMULATION`, `TESTNET`, or `LIVE`
- `LIVE_TRADING_ENABLED`, `MAX_DAILY_CAPITAL`
- Relaxation controls: `TRG_THRESHOLD`, `RESIDUAL_CONSENSUS_LIMIT`, `CCLIST_*`, `MOL_SCL_THRESHOLD`, `LHDS_VETO_LIMIT`, `ONTOLOGICAL_COLLAPSE_TRG`

## Important Conventions & Gotchas

- **`court` is a module-level singleton** (`export const court = new ConstitutionalCourt()`). Call `court.configure(cclistConfig, molConfig)` at startup to set parameters — see `streamEngine.js` for example.
- **`signalEngine` is a module-level singleton** (created at module scope in `streamEngine.js`, shared by all 6 engines). Each StreamEngine creates its own `TruthKernel` instance.
- **Workspace packages imported via relative paths**: `@lyzer/shared` and `@lyzer/constitution` are declared npm workspace packages but all code imports them via `../../packages/lyzer-shared/src/...` relative paths, never by package name.
- **Vite alias**: `@` maps to `lyzer edge/src/`.
- **Test env**: `vitest` with `jsdom` + `globals: true`.
- **ESM everywhere**: all packages use `"type": "module"`. Backend imports use full `.js` extensions.
- **Protobuf**: gRPC services defined in `lyzer edge/src-proto/lyzer.proto`. Requires `protoc` for Rust builds.
- **Rust on Windows**: requires **MinGW-w64** toolchain (`x86_64-pc-windows-gnu` target). See `.cargo/config.toml`.
- **Certification tests** require startup order: `nats-server -js` → risk-gateway binary → `npx tsx src-ts/scripts/setup-nats.ts` → test runner.
- **Docker CMD order**: `python3 backup_restore.py restore; nats-server -js & lyzer-core-hub & node backend/server.js`
- **Sprint scripts** (`run-sprint-*.ps1`) delete old `intent_registry.db` to avoid UNIQUE constraint violations on re-runs.
- **3-process isolation** documented in `lyzer edge/docs/runtime_topology.md`: Execution Node, ECA Court Node, Dashboard Node.
- **gRPC services**: `RiskGateway.Authorize`, `IntentRegistry.{RegisterIntent, AppendIntentEvent, AuditQuery}`, all using UUIDv7 for causal traceability.

## Deploy — Multi-Instance Experiments

- **Script**: `deploy-experiments.ps1` (from repo root). Creates 4 HF Spaces with different relaxation configs.
- Usage: `.\deploy-experiments.ps1 -Token "hf_..."`
- Each Space gets its own env vars from `.env.exp-a` through `.env.exp-d`.
- Without API keys, `ExchangeExecution` simulates orders (`FILLED_MOCK`).
- **Manual**: copy `.env.exp-*` → `.env`, commit, push to each Space separately.

## Testing

- `npm test` runs vitest (unit/integration in jsdom)
- `npm run test:verify` runs `vitest run tests/verification` (focused ad-hoc smoke tests)
- Verification scripts: `verify_*.js` files in `lyzer edge/tests/verification/` for ad-hoc checks
- E2E suite: `tests/e2e_smc/e2e_suite.test.js` (126 cases, 4-tier methodology per `TEST_INFRA.md`)
- Certification suites: `npx tsx src-ts/scripts/boundary-certification-suite.ts` (requires NATS + risk-gateway running)
- Root-level `run_*.js` scripts: ad-hoc audit/validation tools, not part of build pipeline
