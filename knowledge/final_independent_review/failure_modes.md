# Lyzer Edge — 7-Layer Failure Mode & Effects Analysis (FMEA)

**System Authority**: Senior Chief Technology Officer & Cognitive Architect (@lyzer-guardian)  
**Target Platform**: Lyzer Edge Quantitative Trading Pipeline (Layers 1–7)  
**Date**: July 24, 2026  

---

## Executive Overview

This FMEA analyzes potential failure modes across all **7 layers** of the Lyzer Edge execution pipeline, evaluating Risk Priority Numbers (RPN = Severity x Occurrence x Detection, rated 1–10).

---

## Layer 1: Multi-Provider Signal Generation Layer

### Failure Mode 1.1: SMC Facade Unlinked Trend Bias
- **Description**: `SmcEngineFacade` evaluates `trendState` on line 48 (`this.trendEngine.evaluate`), but provider narrative generation lines 60–88 ignore `trendState.bias` unless `FEATURE_FILTER_H4_ALIGNMENT === 'true'`.
- **Severity**: 7 | **Occurrence**: 6 | **Detection**: 3 | **RPN**: 126
- **Impact**: Signals are generated against the macro H4 structural trend when feature flags are disabled or unspecified.
- **Code Ref**: `packages/lyzer-shared/src/smc/smcFacade.js:L48` vs `L60-L88`.

### Failure Mode 1.2: Multi-Timeframe Alignment Window Lag
- **Description**: Rapid 1m price moves update `mtfCandles['1m']` immediately, but 15m/1h/4h candle boundaries lag until timeframe completion.
- **Severity**: 5 | **Occurrence**: 7 | **Detection**: 4 | **RPN**: 140
- **Impact**: Microstructure providers register high-confidence signals based on outdated macro timeframe structures.

---

## Layer 2: Residualization & Consensus Destruction Layer

### Failure Mode 2.1: Zero-Consensus Boundary Bypass
- **Description**: Setting `RESIDUAL_CONSENSUS_LIMIT=0` forces `ResidualizationLayer` to skip consensus destruction logic.
- **Severity**: 8 | **Occurrence**: 4 | **Detection**: 2 | **RPN**: 64
- **Impact**: System executes trade setups where all 4 providers agree, violating the anti-consensus core requirement (SCD).
- **Code Ref**: `packages/lyzer-shared/src/engine/residualization.js:L15-L40`.

---

## Layer 3: Execution Trigger Boundary Layer

### Failure Mode 3.1: Synthetic Noise TRG Spikes
- **Description**: Low-volume bar spikes produce elevated Tail Risk Geometry (`trg`) values due to extreme high/low spreads relative to thin volume.
- **Severity**: 6 | **Occurrence**: 5 | **Detection**: 3 | **RPN**: 90
- **Impact**: System triggers `eef = true` on illiquid candles where execution slippage is highest.

---

## Layer 4: TruthKernel & Epistemic Authority Layer

### Failure Mode 4.1: Divergence Calculation Exception Fallback
- **Description**: `streamEngine.js` wraps divergence calculation in a try-catch block that defaults `sds` to `0.0` on failure.
- **Severity**: 7 | **Occurrence**: 2 | **Detection**: 6 | **RPN**: 84
- **Impact**: Silently bypasses structural scale divergence checks when CSRL calculation encounters array index errors or numerical NaN anomalies.
- **Code Ref**: `lyzer edge/backend/streamEngine.js:L506-L508`.

---

## Layer 5: Continuous CLIST Stress Oracle Layer

### Failure Mode 5.1: Lethal Stability Illusion Saturation
- **Description**: Prolonged low-volatility consolidation causes `cclist.stressLevel` to accumulate (`+0.002` per flat tick) until hitting `lethalIllusionLimit` (0.9).
- **Severity**: 8 | **Occurrence**: 5 | **Detection**: 3 | **RPN**: 120
- **Impact**: System enters permanent `VETO_LETHAL_STABILITY_ILLUSION` mode, blocking execution on the initial breakout candle following consolidation.
- **Code Ref**: `packages/lyzer-constitution/src/eca/c-clist.js:L30-L55`.

---

## Layer 6: Meta-Observation Layer (MOL)

### Failure Mode 6.1: Consecutive Stability Counter Resets ("False Awakening")
- **Description**: `mol.evaluateState` requires `sclThreshold` (default 3) consecutive stable ticks to transition from `RECOVERY` to `OBSERVED`. A single noise tick resets `scl` to 0.
- **Severity**: 7 | **Occurrence**: 6 | **Detection**: 3 | **RPN**: 126
- **Impact**: System gets locked in an infinite RECOVERY loop during choppy market regimes.
- **Code Ref**: `packages/lyzer-constitution/src/eca/mol.js:L35-L65`.

---

## Layer 7: Constitutional Court & ECA Layer

### Failure Mode 7.1: Ledger In-Memory Accumulation Unbounded Leak
- **Description**: `ledger.appendRecord` pushes every transaction token and raw state into an internal array (`this.records.push(...)`) without truncation or persistent storage bounding.
- **Severity**: 7 | **Occurrence**: 8 | **Detection**: 4 | **RPN**: 224
- **Impact**: Long-running Node.js processes experience memory bloat and eventual Out-Of-Memory (OOM) crashes after ~100,000 processed ticks.
- **Code Ref**: `packages/lyzer-constitution/src/eca/ledger.js:L15-L25`.

---

## Summary Matrix of Critical Failure Modes (RPN > 100)

| ID | Layer | Description | RPN | Action Plan |
|---|---|---|---|---|
| **2.2** | Layer 2 | Provider Input Correlation | **240** | Enforce orthogonal feature transforms per provider |
| **7.1** | Layer 7 | Ledger In-Memory Leak | **224** | Implement ring buffer capping ledger records at 10,000 |
| **1.2** | Layer 1 | MTF Window Alignment Lag | **140** | Implement strict bar-close synchronization barriers |
| **1.1** | Layer 1 | SMC Facade Unlinked Trend | **126** | Enable H4 trend alignment check by default |
| **6.1** | Layer 6 | MOL SCL Reset Lockout | **126** | Apply exponential smoothing to SCL stability metric |
| **5.1** | Layer 5 | C-CLIST Stress Saturation | **120** | Cap stress accumulation ceiling at 0.85 below lethal limit |
