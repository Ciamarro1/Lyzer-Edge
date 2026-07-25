# Lyzer Edge — Hidden Bias & Epistemic Leakage Audit

**System Authority**: Senior Chief Technology Officer & Cognitive Architect (@lyzer-guardian)  
**Target Platform**: Lyzer Edge Data Pipelines & Simulation Framework  
**Date**: July 24, 2026  

---

## 1. Lookahead & MTF Data Leakage Biases

### 1.1 Unclosed Higher-Timeframe Candle In-Place Mutation
> [!CAUTION]
> In `lyzer edge/backend/streamEngine.js`, function `updateMtfCandles(candle)` constructs multi-timeframe buckets ('5m', '15m', '1h', '4h', '1d') in real-time.

```javascript
// streamEngine.js lines 266-276
list.push({
  openTime: bucketStart,
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
  volume: candle.volume,
  closed: true // <--- Hardcoded as closed even for incomplete higher timeframe buckets!
});
```

- **Leakage Analysis**: Unclosed higher-timeframe candles are appended to `mtfCandles` with `closed: true`. When providers (e.g. `StructuralBoundaryEngine` or `SmcEngineFacade`) query `mtfCandles['1h']`, they receive candles containing current sub-hour high/low prices while treating them as historic closed boundaries.
- **Backtest Distortion**: Backtests or simulation replays using this mechanism suffer from **Lookahead Bias**, as the model makes decisions on sub-bar ticks using future extremes of the higher timeframe bar.

---

## 2. Warmup & Synthetic Data Biases

### 2.1 Deterministic Synthetic Warmup Bias
- **Bias Mechanics**: Function `warmupSyntheticCandles()` populates initial candle history using a deterministic formula:
  `const trend = Math.sin(nextIndex / 15) * 20;`
- **Impact**: The initial 110 candles feature regular periodic oscillation (sine wave pattern with period = 30 ticks). Indicators derived during warmup (RSI, ATR, SMC liquidity pools) adapt to artificial harmonic behavior, creating biased state initializations during simulation starts.

### 2.2 Narrative Fallback Prioritization Bias
- **Bias Mechanics**: In `processCandle()`, `combinedSignal` classification follows a fixed hierarchical fallback:
  1. IMCE V4 (if not flat)
  2. SMC V1 (if not flat)
  3. Structural V2 (if not flat)
  4. Momentum RSI V3 (fallback)
- **Impact**: Telemetry signals are heavily skewed toward IMCE V4 narrative labels even when V4 confidence is low, introducing **Selection Bias** in output telemetry analysis.

---

## 3. Execution & Simulation Biases

### 3.1 Hardcoded Micro-Scalp Execution Parameters
- **Slippage Bias**: Hardcoded `slippage: 0.0001` (0.01%) assumes near-perfect order fill execution. Real crypto exchange market orders on sub-minute timeframes incur slippage between 0.02% and 0.15% depending on order book depth.
- **Spread Bias**: Hardcoded `spread: 0.0001` ignores bid-ask spread expansion during high volatility.
- **Fill Confirmation Bias**: Simulation mode assumes 100% fill rate for stop-loss and take-profit orders without verifying high/low candle overlap or order queue depth.

---

## 4. Parameter Overfitting & Relaxation Biases

### 4.1 Multi-Space Parameter Relaxation Distortion
- **Observation**: Deployments on Hugging Face Spaces (`.env.exp-a` through `.env.exp-d`) adjust gating thresholds to artificially increase trade frequency:
  - Experiment A: Standard Gating (`TRG=0.4`, `ResLimit=0.1`)
  - Experiment B: Relaxed Gating (`TRG=0.2`, `ResLimit=0.05`)
  - Experiment C: Ultra-Relaxed (`TRG=0.1`, `ResLimit=0.0`)
- **Distortion Analysis**: Relaxing `RESIDUAL_CONSENSUS_LIMIT` to `0.0` forces execution on un-residualized raw signals. While trade count increases, average trade Expected Value (EV) drops significantly, creating an **Overfitting Illusion** where trade volume is mistaken for statistical edge.

---

## 5. Summary of Epistemic Biases & Remediations

| Bias Category | Location | Vulnerability Type | Operational Remediation |
|---|---|---|---|
| **Lookahead Leakage** | `streamEngine.js:L266` | MTF Candle In-Place Mutation | Set `closed: false` until bucket duration completes |
| **Synthetic Determinism** | `streamEngine.js:L123` | Sine Wave Synthetic Warmup | Replace with real historical kline pre-fetch |
| **Slippage Underestimation** | `streamEngine.js:L434` | Fixed 0.01% Slippage Model | Implement volatility-adjusted slippage estimator |
| **Selection Bias** | `streamEngine.js:L540` | Fixed Provider Priority Chain | Weighted confidence blending across V1–V4 |
| **Relaxation Overfitting** | `.env.exp-*` | Gating Parameter Degradation | Lock core parameters in `CONSTITUTION.md` |
