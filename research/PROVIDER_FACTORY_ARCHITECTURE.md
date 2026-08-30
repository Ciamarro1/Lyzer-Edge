# 🔬 PROVIDER FACTORY ARCHITECTURE

**Date**: 2026-08-29
**Status**: APPROVED CONCEPT

## 1. Core Purpose
The Provider Factory transforms observed phenomena into statistically defensible trading signals. It is an adversarial engine designed to **destroy hypotheses**, not validate them. A Provider is no longer just a function emitting `BUY/SELL`; it is a scientific object passing through multiple validation stages.

## 2. Hypothesis Graph & Lineage
To prevent re-testing the same failed hypotheses (p-hacking via rebranding), every provider must declare its lineage:
```javascript
const providerHypothesis = {
    provider_id: "P_001_VOL_SWEEP",
    lineage: ["V1_SMC", "V5_WYCKOFF", "EXP_001_NAKED_SWEEP"],
    economic_mechanism: "Exhaustion of liquidity beyond structural extremes forces mean reversion.",
    features_used: ["penetration_depth", "volume_zscore", "recovery_speed"],
    expected_horizon: "12h",
    expected_regime: "Range / High Volatility"
};
```

## 3. The 4-Tier Pipeline

### Tier 1: Phenomenon Detector (Signal Layer)
- Maps features `X(t)` to expected forward returns `E[R(t+h)]`.
- **Metric**: Information Coefficient (IC), Pearson/Spearman on forward returns.
- *Does not trade.*

### Tier 2: Portfolio Construction (Allocation Layer)
- Converts continuous signals into position sizing.
- Applies risk models (Volatility parity, Kelly criteria).
- *Does not execute.*

### Tier 3: Execution Model (Friction Layer)
- Adds maker/taker fees, slippage, and delayed fills.
- Tests resilience against adversarial conditions.

### Tier 4: Validation (The Governor)
- Handles OOS (Out of Sample) holdout validation.
- Enforces the `GLOBAL_MULTIPLE_TESTING_LEDGER` to penalize the p-value.
- Rejects if performance degrades under friction or if the edge is purely explained by beta.

## 4. Lifecycle States
Providers exist in the following State Machine:
1. `DISCOVERY`: Parallel exploration allowed. Metrics: IC, conditional returns.
2. `EXPLORATORY`: Identified a relationship. Needs ablation testing.
3. `PRE_REGISTERED`: The exact features, horizon, and rules are frozen.
4. `CONFIRMATION`: Tested strictly against OOS and Walk-Forward Analysis (WFA). No parameter tuning allowed.
5. `VALIDATED`: Survived adversarial friction and regime stress testing.
6. `PROVISIONAL`: Deployed to paper trading (Track B/C) for live forward testing.
7. `REJECTED`: Failed confirmation. (Archived, never deleted).

## 5. Parallel Research Engine
A `ResearchCoordinator` node manages independent worker processes:
- **Worker A**: Tests Hypothesis X in a Bull Regime.
- **Worker B**: Tests Hypothesis X in a Bear Regime.
- **Worker C**: Runs negative controls (randomized structure) for Hypothesis X.

**Constraint**: Workers do not share results with each other during execution to prevent adaptive p-hacking.

## 6. The Research Governor
An automated safeguard preventing structural bias. Before any backtest is run on a holdout set, the Governor asks:
- "Is this pre-registered?"
- "Has this specific feature combination already been tested on this dataset?"
- "Are we consuming degrees of freedom?"
If the Governor flags a violation, the test is marked as `POST_HOC_EXPLORATION`.

## 7. Ablation & Adversarial Mechanics
- **Ablation**: Automatically run the signal generator by disabling `Feature A`, then `Feature B`. If the Information Coefficient does not drop, the feature is stripped to reduce complexity.
- **Adversarial**: The Engine delays the entry by +1 and +2 candles. If the edge collapses, the signal is discarded as a microstructure artifact.
