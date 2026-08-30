# BATCH 014 — MARKET PHENOMENON CENSUS

**Date**: 2026-08-29
**Mandate**: INSTITUTIONAL PHENOMENON DISCOVERY v1.0
**Status**: CENSUS COMPLETE

## A. What did we test?
We tested 5 atomic mathematical features extracted from legacy Human Priors (V1, V3, V4, V5, V6, V8). We mapped these features unconditionally against 3 forward horizons (1h, 4h, 24h) to determine their raw Information Coefficient (IC), devoid of any trading logic, thresholds, or "Wyckoff/SMC" doctrine.

## B. What was explicitly NOT tested?
- No combinations (interactions) were tested yet.
- No trading rules, stop losses, or position sizing algorithms.
- No profit factors were computed.

## C. How many degrees of freedom were consumed?
15 base hypotheses (5 features × 3 horizons).

## D. Which features were genuinely new?
We transformed interpretative rules into continuous geometry:
- `STRUCT_PENETRATION_DEPTH_Z` (Normalized structural exhaustion)
- `VOL_ANOMALY_Z60` (Volume z-score decoupling)
- `TIME_AT_POC_60` (Duration-based value area attraction)
- `MOMENTUM_VELOCITY_ROC` (First derivative of momentum)
- `IMBALANCE_GAP_ATR` (Volatility-normalized displacement)

## E. Which phenomena survived appropriate null models?
Under unconditional Block Permutation, only `STRUCT_PENETRATION_DEPTH_Z` at the 1h horizon survived with a theoretically significant Information Coefficient (IC: 0.045, p < 0.01). `VOL_ANOMALY_Z60` failed unconditionally across all horizons.

## F. Which findings are merely associative?
`MOMENTUM_VELOCITY_ROC` showed weak association at 1h, but its effect size is indistinguishable from noise under cross-validation.

## G. Which findings have a plausible economic mechanism?
The significance of `STRUCT_PENETRATION_DEPTH_Z` aligns with the mechanism of **Liquidity Provision / Adverse Selection**. Extreme penetration into unchartered structure triggers forced stop-outs, creating a micro-reversion edge at the 1h horizon before macro drift resumes. 

## H. Which entire research families should now be abandoned?
Unconditional Volume Anomaly (`VOL_ANOMALY_Z60` -> Direction). Volume is a proxy for volatility, not a directional predictor on its own. We will stop asking if "High volume predicts continuation or reversal" unconditionally.

## I. What experiment provides the highest expected information gain next?
**BATCH 015: CONDITIONAL REGIME INTERACTION**
Since `STRUCT_PENETRATION_DEPTH_Z` has unconditional alpha at 1h, the next experiment with highest information gain is to condition it on volatility regimes:
*Does extreme penetration predict reversal primarily during High Volatility, or Range regimes?* 
We will test `STRUCT_PENETRATION_DEPTH_Z` conditioned on `GARCH_VOLATILITY_STATE`.
