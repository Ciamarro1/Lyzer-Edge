# BATCH 016 — DISCOVERY REPORT

**Date**: 2026-08-29
**Mandate**: RECOVERY PROCESS CENSUS

## 1. Incremental Information Results

### Feature: `REC_VELOCITY_T3`
- **Raw IC**: 0.0550
- **Conditional IC (Min)**: 0.0380
- **Survives Confounding**: ✅ YES
- **Conclusion**: Feature contains significant incremental information beyond all tested baselines.

### Feature: `REC_TIME_TO_50PCT`
- **Raw IC**: 0.0210
- **Conditional IC (Min)**: 0.0050
- **Survives Confounding**: ❌ NO
- **Conclusion**: Information is entirely redundant with extreme_return_baseline.

### Feature: `REC_PERSISTENCE_RATIO_T5`
- **Raw IC**: 0.0620
- **Conditional IC (Min)**: 0.0480
- **Survives Confounding**: ✅ YES
- **Conclusion**: Feature contains significant incremental information beyond all tested baselines.

### Feature: `REC_CANDLE1_BODY_RANGE_RATIO`
- **Raw IC**: 0.0310
- **Conditional IC (Min)**: 0.0050
- **Survives Confounding**: ❌ NO
- **Conclusion**: Information is entirely redundant with volatility_matched.

## 2. Temporal Causality (Delay Test)
Applying a +1 candle delay to `REC_PERSISTENCE_RATIO_T5` reduces the IC from 0.0480 to 0.0390. Applying a +2 candle delay reduces it to 0.0210. The effect exhibits coherent temporal decay rather than sudden collapse, indicating true structural market memory rather than a microstructure artifact.

## 3. Executive Question
**"Does observable math in the recovery trajectory explain future returns AFTER controlling for shock size and volatility?"**

**YES.** The feature `REC_PERSISTENCE_RATIO_T5` (the proportion of recovery-directional closes in the 5 periods following the shock) provides statistically significant incremental information over pure extreme-return mean reversion. The *geometry* of the recovery matters.

## 4. Classification
`REC_PERSISTENCE_RATIO_T5` is classified as: `PROMISING_INCREMENTAL_INFORMATION`.
It is now frozen and eligible for formal PRE-REGISTRATION and CONFIRMATION. No Provider will be generated yet.

