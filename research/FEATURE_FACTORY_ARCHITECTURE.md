# 🏭 FEATURE FACTORY ARCHITECTURE

**Date**: 2026-08-29
**Status**: APPROVED CONCEPT

## 1. Core Purpose
The Feature Factory is the foundational layer of the Lyzer Edge Institutional Research Engine. It receives normalized data and produces purely mathematical, objective, and stateless observations (Features). It contains zero trading logic, zero human dogma, and zero look-ahead bias.

## 2. Abstraction Layers

### Level 0: Raw Data Ingestion
- Real-time or historical OHLCV/TAQ feeds.
- Output: Standardized Time Series.

### Level 1: Normalization & Stationarity
- Z-scores, log returns, differencing.
- Ensures features are statistically usable.

### Level 2: Atomic Features
- Single mathematical derivations.
- *Examples*: `ATR(14)`, `Volume_ZScore(60)`, `Distance_From_VWAP`.

### Level 3: Compositional Features
- Combinations of atomic features.
- *Examples*: `Volume_ZScore(60) / ATR(14)`, `Close_Position_In_60_Range`.

### Level 4: Structural Abstractions (Non-Temporal)
- Swing highs/lows, FVGs, Breakouts.
- Extracted purely via geometry, independent of standard lookbacks.

## 3. Directory Structure

```text
packages/lyzer-shared/src/laboratory/features/
├── core/                   # Normalization and utilities
├── price_action/           # Returns, geometry, momentum
├── volatility/             # ATR, RV, compressions
├── volume/                 # Anomalies, exhaustion
├── microstructure/         # Imbalances, delta
├── structure/              # V8 structural extractions (Swings, FVGs)
├── regime/                 # HMM, GARCH, trend/range classifiers
└── cross_asset/            # Dominance, ratios
```

## 4. Feature Contract (Interface)
Every feature MUST implement the standard contract to prevent leakage and ensure mathematical rigidity:

```javascript
export class VolumeZScoreFeature {
    constructor(config = { window: 60 }) {
        this.window = config.window;
        this.id = `vol_zscore_${this.window}`;
    }

    /**
     * @param {Array} history - The temporal state
     * @returns {number|null} The scalar feature value
     */
    compute(history) {
        // Implementation MUST be stateless and free of look-ahead bias
    }
    
    getMetadata() {
        return {
            unit: "z-score",
            stationarity_assumed: true,
            economic_meaning: "Identifies statistically anomalous participation."
        }
    }
}
```

## 5. Strict Constraints
- **No Predictive Labels**: Features do NOT output "BULLISH" or "BEARISH". They output continuous or discrete values (e.g., `1.5` or `-0.8`).
- **No Hardcoded Horizons**: A feature does not know the trading horizon.
- **Dependency Isolation**: A volume feature must not import a structural feature. They are combined later in the Phenomenon Detector.

## 6. Execution Model (Parallel Readiness)
Because features are stateless and atomic, the Research Workers can inject any dataset array and instantly extract a high-dimensional feature matrix `X(t)` to map against future returns `y(t+h)`.
