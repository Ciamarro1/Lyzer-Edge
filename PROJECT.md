# Project: Lyzer Edge Engine Refactoring & Hardening

## Architecture
This project refactors critical layers of the Lyzer Edge trading engine to eliminate allocations in the tick loop, make SQLite causal writes asynchronous via transactional batching, implement persistent Temporal Spatial Memory for institutional SMC levels, and dynamic volatility-adaptive limits for the TruthKernel.

```
[Market Feed]
      │
      ▼
[Open Mobius V8] (Zero-Allocation: in-place candle tagging, no .map() in tick loop)
      │
      ▼
[SMC V1 Provider] (Temporal Spatial Memory Index: unmitigated FVGs & OBs retained across time)
      │
      ▼
[TruthKernel] (Dynamic Limits: adaptive LHDS veto & Ontological Collapse thresholds based on volatility expansion/compression)
      │
      ▼
[Causal Memory DB] (Asynchronous Batching: in-memory queue + periodic transactional commit)
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | R1: V8 Zero-Allocation | Eliminate `.map()` calls on tick loops in `v8_openmobius.js`, tag properties on ring insertion | M1 | ORIGINAL_REQUEST §R1 |
| 2 | R2: Async SQLite Batching | Add in-memory `_causalBuffer` and periodic transactional batch flushing to `db.js` | M2 | ORIGINAL_REQUEST §R2 |
| 3 | R3: Temporal Spatial Memory | Retain unmitigated FVGs & Order Blocks in a persistent `SpatialMemoryIndex` in SMC V1 | M3 | ORIGINAL_REQUEST §R3 |
| 4 | R4: TruthKernel Dynamic Limits | Adapt LHDS veto and Ontological Collapse limits dynamically based on market volatility/regime | M4 | ORIGINAL_REQUEST §R4 |
| 5 | M5: Comprehensive Verification | Full test suite execution across Unit, Smoke, E2E SMC, and Boundary Certification | M5 | ORIGINAL_REQUEST §Verification |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: V8 Zero-Allocation (R1) | `v8_openmobius.js`, `imbalance.js`, `openMobiusShadow.js` | None | DONE |
| 2 | M2: Async Causal Batching (R2) | `lyzer edge/backend/db.js`, `streamEngine.js` | None | DONE |
| 3 | M3: SMC Spatial Memory (R3) | `packages/lyzer-shared/src/providers/v1_smc_ict.js`, `packages/lyzer-shared/src/smc/` | None | DONE |
| 4 | M4: TruthKernel Dynamic Limits (R4) | `packages/lyzer-constitution/src/eca/truthKernel.js`, `streamEngine.js` | None | DONE |
| 5 | M5: Final Verification & Certification | Verify full suite (`npm.cmd test`, `npm.cmd run test:verify`, `e2e_suite.test.js`) | M1, M2, M3, M4 | DONE |

## Interface Contracts
### M1: V8 Open Mobius
- `v8_openmobius(candles, tf)` accepts raw candle objects; in-place fallback `c.is_bullish ?? (c.close >= c.open)` without allocating array clones.
- Output signature remains `{ signal, confidence, pattern, targets, score }`.

### M2: Causal DB Batching
- `insertCausalEvent(event)` pushes to internal queue `_causalBuffer` and resolves immediately.
- `flushCausalEvents()` executes `BEGIN TRANSACTION` / prepared statement insert / `COMMIT`.
- Auto-flush triggers on buffer size threshold (≥50) or periodic timer (100ms), and before database queries/close.

### M3: SMC Spatial Memory
- `SpatialMemoryIndex` stores unmitigated FVG and OB objects across time ticks.
- `reconstruct(candles)` or `evaluate()` updates the index with newly formed levels and marks levels as mitigated when price breaches their threshold.
- Return contract remains `{ signal, confidence, narrative, source }`.

### M4: TruthKernel Dynamic Limits
- `computeDynamicLimits(micro)` computes dynamic `lhdsVetoLimit` and `ontologicalCollapseTrg` modulated by volatility metrics (`atrRatio`, `atr14_pct`, `oppScore`).
- When volatility data is absent, defaults cleanly to base constructor values `(0.8, 0.7)` for 100% backward compatibility.

## Code Layout
- `packages/lyzer-shared/src/providers/openmobius/` — Open Mobius V8 engine & submodules
- `lyzer edge/backend/db.js` — Causal SQLite Database manager
- `packages/lyzer-shared/src/providers/v1_smc_ict.js` & `packages/lyzer-shared/src/smc/` — SMC V1 engine & Spatial Memory
- `packages/lyzer-constitution/src/eca/truthKernel.js` — TruthKernel decision matrix & dynamic limits
- `lyzer edge/backend/streamEngine.js` — Orchestrating StreamEngine pipeline
- `lyzer edge/tests/` — Test suites
