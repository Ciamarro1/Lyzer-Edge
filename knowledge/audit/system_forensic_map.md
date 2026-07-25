# System Forensic Map — Lyzer Edge Architecture

**Mission**: L4 — Continuous Alpha Evolution  
**Date**: 2026-07-24

---

## Process Architecture

```
Docker Container (Ubuntu 24.04)
├── Process 1: nats-server -js (messaging)
├── Process 2: lyzer-core-hub (Rust gRPC gateway)
└── Process 3: node backend/server.js
    ├── Express 5 HTTP server (port 7860)
    ├── WebSocket server (same port)
    └── 6× StreamEngine instances (one per asset)
        ├── BTC/USDT
        ├── ETH/USDT
        ├── SOL/USDT
        ├── BNB/USDT
        ├── XRP/USDT
        └── DOGE/USDT
```

---

## Package Dependency Graph

```
lyzer edge (main app)
├── @lyzer/shared (packages/lyzer-shared)
│   ├── src/engine/        (41 files, 7 active)
│   ├── src/providers/     (4 files, 4 active — V1, V2, V3, V4)
│   ├── src/smc/           (8 files, 5 active)
│   ├── src/csrl/          (4 files, 4 active)
│   ├── src/causality/     (4 files, 3 active)
│   └── src/research/      (5 files, 5 active — NEW)
│
└── @lyzer/constitution (packages/lyzer-constitution)
    └── src/eca/           (~15 files, ~8 active)
```

---

## Active Pipeline Data Flow

```
Exchange WebSocket
    │
    ▼
┌─────────────────────┐
│ LiveDataIngestor     │ ← liveDataIngestor.js
│ (Binance klines)     │
└────────┬────────────┘
         │ 1m candles
         ▼
┌─────────────────────┐
│ MTF Aggregation      │ ← streamEngine.js L224-281
│ 1m→5m→15m→1h→4h→1d  │
└────────┬────────────┘
         │ {candles_1m, candles_5m, ..., candles_1d}
         ▼
┌─────────────────────────────────────────────┐
│ Signal Providers (Parallel)                  │
│                                              │
│ V1: LiquidityReconstructionEngine (SMC/ICT)  │ ← v1_smc_ict.js
│ V2: StructuralBoundaryEngine (SnD/SnR)       │ ← v2_snd_snr.js
│ V3: MomentumRsiEngine (RSI/ROC)              │ ← v3_momentum_rsi.js
│ V4: InstitutionalMarketCausalityEngine       │ ← v4_imce.js
│     └── MarketStateEngine (regime)           │
│     └── LiquidityGraph (BSL/SSL)             │
│     └── MetaAgentValidator (red team)        │
└────────┬────────────────────────────────────┘
         │ {direction, confidence, narrative}×4
         ▼
┌─────────────────────┐
│ SmcEngineFacade      │ ← smc/smcFacade.js
│ (BOS, FVG, OB)      │    smc/structureEngine.js
│                      │    smc/liquidityEngine.js
└────────┬────────────┘
         │ {swings, bos, fvgs, orderBlocks}
         ▼
┌─────────────────────┐
│ CSRL Subsystem       │ ← csrl/ScaleNormalizer.js
│ Cross-Scale Reality  │    csrl/CrossScaleTensorGraph.js
│ Lens                 │    csrl/InvariantExtractor.js
│                      │    csrl/DivergenceDetector.js
└────────┬────────────┘
         │ {scaleDivergence, invariantScore}
         ▼
┌─────────────────────┐
│ TruthKernel          │ ← engine/kernel.js
│ ├── Residualization  │    engine/residualization.js
│ │   DVF, TRG         │
│ ├── ETT Gate         │    engine/executionTriggerLayer.js
│ │   TRG ≥ threshold  │
│ └── Ontological Veto │
│     LHDS > limit     │
└────────┬────────────┘
         │ {eef, dvf, trg, epistemicAuthority, lhds}
         ▼
┌─────────────────────┐
│ ECA Court            │ ← eca/court.js
│ ├── C-CLIST          │    eca/c-clist.js (stress oracle)
│ ├── MOL              │    eca/mol.js (recovery gate)
│ ├── ConstraintEngine │    eca/constraintEngine.js
│ ├── Permission       │    eca/permission.js
│ └── Ledger           │    eca/ledger.js
└────────┬────────────┘
         │ {authorized: bool, permissionToken}
         ▼
┌─────────────────────┐
│ Execution            │ ← streamEngine.js L600-890
│ ├── Position Sizing  │
│ ├── SL/TP Calc       │
│ └── ExchangeExecution│    exchangeExecution.js
└────────┬────────────┘
         │ Order
         ▼
┌─────────────────────┐
│ EV Research Engine   │ ← EVAlphaResearchEngineV3_3.js
│ (Genome Evolution)   │
└─────────────────────┘
```

---

## SPOFs (Single Points of Failure)

| SPOF | Impact | Mitigation |
|---|---|---|
| `streamEngine.js` (929 LoC) | Entire pipeline stops | Split into smaller orchestrator modules |
| `court` singleton | All 6 assets share one court | Design: intentional (shared governance) |
| `signalEngine` singleton | All 6 assets share one signal engine | Design: intentional |
| `truthKernel` singleton | All 6 assets share one kernel | Design: intentional |
| Binance WebSocket | No data → no trades | LiveDataIngestor has reconnect logic |

---

## Coupling Analysis

| Coupling | Type | Risk |
|---|---|:---:|
| V4 → MarketStateEngine → LiquidityGraph → MetaAgentValidator | Tight (same process) | LOW |
| streamEngine → all providers | Direct instantiation | MEDIUM |
| streamEngine → court singleton | Module-level import | LOW |
| 6 StreamEngines independent | No cross-asset awareness | MEDIUM |
| Research modules → ReplayEngine | Clean interface | LOW |

---

## Component Value Classification (Pre-Benchmark)

| Component | Classification | Confidence | Evidence Needed |
|---|:---:|:---:|---|
| MTF Aggregation | CORE_ALPHA | HIGH | Standard deterministic |
| SMC Engine (BOS/FVG) | CORE_ALPHA | MEDIUM | Needs replay benchmark |
| V1 (Liquidity Reconstruction) | UNPROVEN | LOW | Redundant with SMC, needs ablation |
| V2 (Structural Boundary) | UNPROVEN | LOW | Needs replay benchmark |
| V3 (Momentum RSI) | UNPROVEN | LOW | Needs replay benchmark |
| V4 (IMCE) | CORE_ALPHA | MEDIUM | Has regime awareness |
| Residualization Layer | RISK_FILTER | MEDIUM | Anti-herding by design |
| TRG Gate | CORE_ALPHA | MEDIUM | Needs threshold optimization |
| TruthKernel | RISK_FILTER | HIGH | Design is sound |
| C-CLIST | RISK_FILTER | MEDIUM | Needs parameter calibration |
| MOL | RISK_FILTER | MEDIUM | Needs parameter calibration |
| ECA Court | CORE_ALPHA | HIGH | Constitutional governance |
| EV Research Engine | UNPROVEN | LOW | Unverified in live context |

> **CRITICAL NOTE**: All "MEDIUM" and "LOW" confidence classifications require `AlphaContributionBenchmark` execution with historical data to be promoted or demoted.
