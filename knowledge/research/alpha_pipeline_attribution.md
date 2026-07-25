# Alpha Pipeline Forensic Attribution Report

## Executive Summary
This report documents the forensic audit of the Lyzer Edge Alpha Pipeline, focusing on data ingestion, signal generation, residualization, and execution stages. The pipeline employs an intricate anti-consensus architecture where execution is driven by market structural divergence (Tail Risk Geometry) rather than traditional model agreement.

---

### 1. Market Data Ingestion
- **File:** `lyzer edge/backend/streamEngine.js` (Lines 95-223)
- **Input Data:** Live WebSocket streams and pre-fetched MTF (Multi-Timeframe) closed candles (1m, 5m, 15m, etc.).
- **Transformation:** Ticks are streamed, and for test/simulation mode, synthetic candles are generated using a random walk with sine-wave trends. A stabilization grace period (`stabilizationWindowMs`) delays execution until a time threshold passes.
- **Decision:** Determines if the system is allowed to process execution logic based on the stabilization window.
- **Information Value:** Ensures a clean, initialized state before risk deployment.
- **Statistical Evidence:** Hardcoded warmup (110 synthetic candles) and a default 45-second live stabilization window. Unproven optimal window.
- **Redundancy Risk:** None.
- **Overfitting Risk:** Hardcoded 45s (`45000` ms) window limits.
- **Lookahead Bias:** None.
- **Classification:** `RISK_FILTER`

---

### 2. Feature Extraction / MTF Aggregation
- **File:** `lyzer edge/backend/streamEngine.js` (Lines 224-281)
- **Input Data:** 1-minute real-time ticks.
- **Transformation:** Ticks are grouped into higher timeframes (`5m`, `15m`, `1h`, `4h`, `1d`) using mathematical modulo chunking (`bucketStart = candle.openTime - (candle.openTime % periodMs)`).
- **Decision:** Updates the current unclosed candle or finalizes it and pushes a new object.
- **Information Value:** Provides essential multi-resolution temporal features without re-querying the exchange.
- **Statistical Evidence:** Standard deterministic aggregation.
- **Redundancy Risk:** None.
- **Overfitting Risk:** Max array limits (1000 for 1m, 500 for others) are arbitrary but safe for memory.
- **Lookahead Bias:** None.
- **Classification:** `CORE_ALPHA`

---

### 3. SMC Engine (Liquidity & Structure)
- **Files:** `packages/lyzer-shared/src/smc/liquidityEngine.js` & `structureEngine.js`
- **Input Data:** MTF Candles (Primary M15, Fallback M5).
- **Transformation:** 
  - *Liquidity:* Checks `prev2.high < curr.low` for Bullish Fair Value Gaps (FVG). Evaluates Order Blocks (OB).
  - *Structure:* Uses a 5-candle window (`j-2`) to determine Swing Highs/Lows and identifies Break of Structure (BOS) or Change of Character (CHOCH).
- **Decision:** Emits structural markers and zones to the downstream pipeline.
- **Information Value:** Reconstructs the internal market structure and liquidity map.
- **Statistical Evidence:** Purely deterministic. Not statistically validated.
- **Redundancy Risk:** Significant overlap with Provider V1.
- **Overfitting Risk:** Hardcoded fallbacks to 5m/15m.
- **Lookahead Bias:** Safely mitigated in `structureEngine.js` by checking indices backwards (`j-2` vs `j`). No future data is used.
- **Classification:** `CORE_ALPHA`

---

### 4. Signal Providers (V1 - V4)
**V1 (SMC/ICT)** - `packages/lyzer-shared/src/providers/v1_smc_ict.js`
- **Transformation:** Narrative generator for Liquidity Sweeps and FVGs on a 5-candle lookback. Adds arbitrary +30 or +40 confidence scores.
- **Redundancy Risk:** Highly redundant with the core SMC Engine.
- **Classification:** `NOISE_FILTER` / `UNPROVEN`

**V2 (SNR/SnD)** - `packages/lyzer-shared/src/providers/v2_snd_snr.js`
- **Transformation:** 10-period local min/max to establish Supply/Demand. Rejection/Breakout is calculated if the distance to resistance is `< 0.002` (0.2%).
- **Overfitting Risk:** The `0.002` distance is a massive hardcoded threshold.
- **Classification:** `UNPROVEN`

**V3 (Momentum/RSI)** - `packages/lyzer-shared/src/providers/v3_momentum_rsi.js`
- **Transformation:** Standard 14-period RSI and 5-period ROC. Generates signals on crossovers (RSI < 35, ROC > 0.05).
- **Overfitting Risk:** Hardcoded thresholds (35, 65, 0.05, 0.3).
- **Classification:** `UNPROVEN`

**V4 (IMCE)** - `packages/lyzer-shared/src/providers/v4_imce.js`
- **Transformation:** Orchestrates MarketState (ATR dynamics), LiquidityGraph, and a MetaAgentValidator (RedTeam). Generates a Trade DNA object. Vetoes if spread/ATR ratio > 0.25.
- **Information Value:** High; contextualizes price action into regimes (Expansion, Stop Hunt).
- **Classification:** `CORE_ALPHA`

---

### 5. Residualization Layer
- **File:** `packages/lyzer-shared/src/engine/residualization.js`
- **Input Data:** Output dictionaries from V1-V4.
- **Transformation:** Streaming Consensus Destruction (SCD). Computes pairwise maximum distance (DVF) between signals. If consensus is high (`divergence < 0.1`), DVF is artificially crushed to 0.
  - `TRG = (DVF ^ trgExponent) * liquidityVacuum` (default exponent = 2).
- **Decision:** Emits Divergence Vector Field (DVF) and Tail Risk Geometry (TRG).
- **Information Value:** Extracts the asymmetrical divergence, penalizing agreement (anti-herding).
- **Statistical Evidence:** Philosophical/Heuristic approach, lacks strict statistical validation.
- **Classification:** `RISK_FILTER`

---

### 6. TRG / Execution Trigger (ETT)
- **File:** `packages/lyzer-shared/src/engine/executionTriggerLayer.js`
- **Input Data:** TRG output from Residualization Layer.
- **Transformation:** Pure threshold gate: `trg >= trgThreshold` (Defaults to 0.8 or 0.4).
- **Decision:** Sets `eef` (Execution Eligibility Flag) to true if threshold is breached.
- **Overfitting Risk:** Complete reliance on the hardcoded `trgThreshold`.
- **Classification:** `CORE_ALPHA`

---

### 7. TruthKernel
- **File:** `packages/lyzer-shared/src/engine/kernel.js`
- **Input Data:** Providers (V1-V4), Microstructure data.
- **Transformation:** Orchestrates Residualization and ETT. Validates against Ontological Confidence Limits (OCL). 
- **Decision:** Sets `epistemicAuthority`. If LHDS > 0.8 or (Scale Divergence > 0.7 AND TRG >= 0.7), it issues an absolute ontological `VETO`.
- **Information Value:** Prevents execution in chaotic, unreadable market states.
- **Classification:** `RISK_FILTER`

---

### 8. C-CLIST (Continuous Reality Stress Oracle)
- **File:** `packages/lyzer-constitution/src/eca/c-clist.js`
- **Input Data:** TRG, DVF.
- **Transformation:** Time Decay of Certainty. Accumulates stress if `DVF < 0.1` (Stability Illusion). Resets to 1.0 if `TRG > 2.0`.
- **Decision:** Emits `isLethalIllusion` if stress reaches `0.9`, effectively blocking execution to prevent complacency.
- **Classification:** `RISK_FILTER`

---

### 9. MOL (Meta-Observation Layer)
- **File:** `packages/lyzer-constitution/src/eca/mol.js`
- **Input Data:** Epistemic Authority and Scale Divergence (SDS).
- **Transformation:** Stateful machine (EXECUTE, VETO, RECOVERY). Requires 3 continuous ticks (`sclThreshold = 3`) of low divergence (`SDS <= 0.7`) to clear a VETO.
- **Decision:** Determines if the system has safely "Awakened" from chaos.
- **Information Value:** Prevents whiplash by demanding sustained coherence before trading resumes.
- **Classification:** `RISK_FILTER`

---

### 10. ECA Court
- **File:** `packages/lyzer-constitution/src/eca/court.js`
- **Input Data:** Kernel EEF, MOL, C-CLIST, Raw State.
- **Transformation:** Evaluates all constitutional axioms deterministically. Checks for arrogance (rejects if it receives a confident "prediction").
- **Decision:** Grants or denies the `PermissionToken`.
- **Information Value:** Ultimate deterministic authority isolating alpha generation from execution.
- **Classification:** `CORE_ALPHA`

---

### 11. Execution Logic
- **File:** `lyzer edge/backend/streamEngine.js` (Lines 600-890)
- **Input Data:** ECA Court `PermissionToken`, current candle.
- **Transformation:** Sizes positions dynamically based on confidence, ExtinctionEngine stress, and diversity. Calculates Stop Loss (SL) and Take Profit (TP) dynamically using 14-period micro-ATR. 
- **Decision:** Executes MARKET orders.
- **Overfitting Risk:** Fallback SL is 0.25%, TP is 0.50% (1:2 R:R ratio). Bound limits are heavily hardcoded (0.15% to 0.4%).
- **Lookahead Bias:** None. Evaluates execution on closed bars or tick updates.
- **Classification:** `CORE_ALPHA`

---

### 12. EV Research Engine
- **File:** `lyzer edge/backend/EVAlphaResearchEngineV3_3.js`
- **Input Data:** Chromosomes/Genomes, MTF Candles, Z-State.
- **Transformation:** Evaluates genomes over candle lookbacks (`len < 20` skip). Mutates Entry/Exit Lookback, threshold, risk via crossover.
- **Decision:** Ranks strategies by EV and Stability.
- **Information Value:** Generative discovery of new parameter combinations.
- **Statistical Evidence:** Unproven in live deployment context, relies on basic backtest mechanics inside the engine loop.
- **Classification:** `UNPROVEN`
