# 🏛️ ADR-043 — OpenMobius Cognitive Coprocessor & Evidence Extraction Layer

**Status**: APPROVED & IMPLEMENTED  
**Date**: 2026-07-26  
**Context**: Evaluation of `https://github.com/MobiusQuant/OpenMobius-skill` for institutional integration.  
**Decision**: Incorporate OpenMobius strictly as a **Non-Decision Cognitive Coprocessor & Evidence Generator (`OpenMobiusEvidenceAdapter`)**.  

---

## 1. Executive Context

OpenMobius provides specialized algorithms for parsing Smart Money Concepts (SMC) and Inner Circle Trader (ICT) market geometry (FVG, Order Blocks, BOS/CHoCH, Liquidity Pools, Dealing Ranges).

Attempting to install OpenMobius as a trading signal or execution engine would violate the 9 Laws of the Lyzer Edge Engineering Constitution.

---

## 2. Decision & Axiomatic Rules

### Supreme Axiom
> **SUPREME AXIOM**: OpenMobius MUST NOT make trading decisions (`BUY`, `SELL`, `LONG`, `SHORT`). It operates exclusively as a **Probabilistic Evidence Generator (Observation Layer)**:
> $$\text{OpenMobius Evidence} \longrightarrow \text{Reality Orchestrator} \longrightarrow \text{Constitutional Court} \longrightarrow \text{Decision Ledger} \longrightarrow \text{Execution}$$

### Key Architectural Boundaries
1. **Decoupled Architecture**: Split into 7 isolated modules (`OpenMobiusFeatureEngine`, `OpenMobiusPatternEngine`, `OpenMobiusStructureAnalyzer`, `OpenMobiusRegimeDetector`, `OpenMobiusLiquidityEngine`, `OpenMobiusEvidencePublisher`, `OpenMobiusEvidenceAdapter`).
2. **Zero Execution Capabilities**: Assigned `market_data:read`, `feature_generation`, `evidence:publish` ONLY.
3. **High-Performance Memory**: Zero-allocation TypedArrays (`Float64Array`) and circular buffers.
4. **TC39 Disposable Compliance**: Full `dispose()` support for clean teardown.
