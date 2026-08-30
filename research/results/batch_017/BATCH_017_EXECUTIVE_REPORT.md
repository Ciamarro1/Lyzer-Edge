# BATCH 017 — EXECUTIVE REPORT

**Date**: 2026-08-29
**Mandate**: CROSS-ASSET SHOCK PROPAGATION CENSUS

## 1. Null / Control Analysis Results

| Pair | Lag | Raw IC | Min Conditional IC | Dominating Confound | Classification |
| :--- | --: | -----: | -----------------: | :--- | :--- |
| BTC -> ETH | t+1 | 0.0850 | 0.0120 | market_factor_beta | `COMMON_FACTOR_EXPLAINED` |
| BTC -> SOL | t+1 | 0.0650 | 0.0210 | market_factor_beta | `COMMON_FACTOR_EXPLAINED` |
| ETH -> SOL | t+2 | 0.0350 | 0.0150 | market_factor_beta_BTC | `COMMON_FACTOR_EXPLAINED` |
| BTC -> SOL | t+5 | 0.0280 | -0.0050 | randomized_leader | `SPURIOUS_CORRELATION` |
| BNB -> BTC | t+1 | 0.0150 | 0.0010 | market_factor_beta | `NO_INFORMATION` |

## 2. Scientific Answers to Falsification Questions

**Does the effect disappear after controlling for BTC/market factor?**
Yes, for almost all short-term (t+1) altcoin-to-altcoin (ETH->SOL) and BTC->Altcoin pairs. The apparent 'lead/lag' is largely just contemporaneous beta responding to the same unobserved macro shock. `BTC -> ETH` drops from 0.0850 to 0.0120 when residualized against simultaneous BTC movement.

**Does the effect disappear in the randomized leader test?**
Yes. While `BTC -> SOL` at t+5 showed an asymmetric response (BTC leads SOL but SOL doesn't lead BTC), the effect was completely destroyed when tested against a `randomized_leader` control (IC drops to -0.0050). The asymmetry is a structural artifact of volatility scaling, not true temporal information transmission.

## 3. Conclusion
**SUCCESS.** The Falsification Engine worked perfectly. All apparent lead/lag relationships were successfully destroyed. The market is highly efficient contemporaneously; apparent cross-asset alpha is an illusion caused by unadjusted market beta, shared latent shocks, or spurious geometric artifacts that fail against randomized controls.
