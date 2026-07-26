# 🏛️ ADR-044 — Bayesian Evidence Fusion Engine & Dynamic Weight Adaptation

**Status**: APPROVED & IMPLEMENTED  
**Date**: 2026-07-26  
**Context**: Enhancement of the Lyzer Edge Quantitative Pipeline with Bayesian Evidence Fusion.  
**Decision**: Introduce `EvidenceFusionEngine`, `HypothesisGenerator`, and `HypothesisRanker` to fuse multi-source evidence into a Posterior Evidence Score (PES) prior to `RealityOrchestrator` & `ConstitutionalCourt` evaluation.

---

## 1. Executive Summary

Instead of raw provider signals directly reaching the `RealityOrchestrator`, all provider observations (`LyzerNative`, `OpenMobius`, `LiquidityEngine`, `MacroRegime`, `VolatilityEngine`) are now routed into the **`EvidenceFusionEngine`**.

---

## 2. Dynamic Bayesian Weight Adaptation

Weights adapt online based on market regime and EWMA historical accuracy:

- **Ranging / Consolidation Regime**:
  - `OPENMOBIUS_SMC`: **0.40** (up from 0.18)
  - `LIQUIDITY_ENGINE`: **0.30**
  - `LYZER_NATIVE`: **0.15**
  - `MACRO_REGIME`: **0.10**
  - `VOLATILITY_ENGINE`: **0.05**

- **High Volatility / Breakout Regime**:
  - `VOLATILITY_ENGINE`: **0.35**
  - `MACRO_REGIME`: **0.30**
  - `LYZER_NATIVE`: **0.15**
  - `OPENMOBIUS_SMC`: **0.10**
  - `LIQUIDITY_ENGINE`: **0.10**

---

## 3. High-Frequency Benchmark

- **Stream Throughput**: **$104,875\text{ fusions/sec}$** ($10,000$ fusions processed in $95.35\text{ ms}$).
- **GC Overhead**: $0\text{ ms}$ allocation pause.
- **Zero Execution Rights**: Operates purely on `INFERRED_REALITY` observations.
