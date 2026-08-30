# BATCH 015 — EXECUTIVE REPORT

**Date**: 2026-08-29
**Mandate**: CONDITIONAL PHENOMENON FALSIFICATION
**Candidate**: `STRUCT_PENETRATION_DEPTH_Z @ 1h`

## 1. Does penetration contain information after controlling for volatility?
**Yes, but it is heavily confounded.** Original IC (0.0450) drops to Residualized IC (0.0120). Volatility explains ~73% of the signal's variance.

## 2. Does penetration contain information after controlling for extreme contemporaneous returns?
**Barely.** Pure extreme returns (without any structural context) produce an IC of 0.0390. The structural geometry only adds a marginal IC of 0.0060. The phenomenon is mostly generic mean reversion of extreme moves.

## 3. Does the effect require a specific regime?
**Yes.** The effect entirely collapses in Low Volatility regimes (IC: -0.0050). It is strictly a High Volatility phenomenon.

## 4. Does the effect require recovery?
**Yes.** Penetration without immediate recovery leads to trend continuation (IC: -0.0150). The mechanism is failure of acceptance, not penetration itself.

## 5. Does the effect survive negative structural controls?
**Yes.** Random structural levels with identical geometry do not produce the same reversion magnitude (IC 0.0110 vs 0.0450). True market structure matters, albeit less than the magnitude of the move itself.

## DECISION CLASSIFICATION
`EXTREME_RETURN_CONFUNDED` & `REGIME_DEPENDENT`

The candidate is NOT a pure structural anomaly. It is a high-volatility extreme-return mean reversion effect that receives a marginal (~15%) predictive lift if it coincides with an economic structural level.

## NEXT EXPERIMENT (Information-Gain)
**BATCH 016: RECOVERY KINETICS**
Since penetration without recovery implies continuation, the actual alpha lies in the *kinetics of the rejection*. We must now measure the velocity and volume profile of the *recovery candle*, treating the penetration merely as a setup state.
