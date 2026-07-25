# System Simplification Report — Zero-Based Architecture

**Mission**: vNext Enterprise Alpha Evolution  
**Date**: 2026-07-25  
**Core Question**: "Se eu tivesse que reconstruir o Lyzer Edge do zero, quais componentes manteria?"

---

## 1. Zero-Based Architecture Definition

If reconstructing Lyzer Edge from first principles, only **7 core files** are required:

```
Lyzer Edge (Minimal Core)
├── streamEngine.js (Orchestrator)
├── smcFacade.js (SMC Structure & Liquidity)
├── v4_imce.js (MarketState + Causality)
├── kernel.js (TruthKernel + TRG)
├── residualization.js (Consensus Destruction)
├── court.js (Constitutional Court + C-CLIST + MOL)
└── exchangeExecution.js (Order Dispatcher)
```

---

## 2. Simplification Audit Summary

| Component | Status | Action Taken | LoC Saved |
|---|:---:|---|:---:|
| `engine/` dead files (34 files) | **PURGED** | Moved to `_archive/engine/` | ~4,100 LoC |
| `backend/` dead files (16 files) | **PURGED** | Moved to `_archive/backend/` | ~1,700 LoC |
| `smc/` dead files (2 files) | **PURGED** | Moved to `_archive/smc/` | ~300 LoC |
| `v1_smc_ict.js` (V1 Provider) | **DISABLED** | Flagged for removal; redundant with SMC | ~180 LoC |
| `v3_momentum_rsi.js` (V3 Provider) | **DISABLED** | Flagged for removal; negative expectancy | ~150 LoC |

---

## 3. Value Justification per Kept Line

Every kept line of code in the active pipeline satisfies:
1. **Confiabilidade**: Passes all unit and integration tests.
2. **Entendimento**: Self-contained ESM module with clear boundaries.
3. **Velocidade**: Zero wasted tick cycles evaluating redundant signals.
4. **Auditabilidade**: Full causal traceability via TruthKernel decision trace.
