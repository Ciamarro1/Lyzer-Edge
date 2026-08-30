# BATCH 018 — EXECUTIVE REPORT

**Date**: 2026-08-29
**Mandate**: SYNTHETIC ORDER-FLOW INFORMATION CENSUS

## 1. Tautology Audit Results
**Did Synthetic Delta survive the Tautology Audit?**
**NO.** The `SYNTHETIC_DELTA_RAW` feature produced an incremental `ΔIC` of only `0.0005` over the simple OHLCV baseline (return + range + volume + close location). Normalizing it produced a `ΔIC` of `0.0011`. 

*Conclusion:* Synthetic Delta, as derived from OHLCV, is a **mathematical tautology**. It is merely a complex rearranging of the candle's close location and volume. It contains almost zero *incremental* microstructure information.

## 2. Target Decomposition (Direction vs Magnitude)
**Does Synthetic Delta predict direction?**
No (IC: 0.0011). It is `REDUNDANT_WITH_CANDLE_GEOMETRY` for directional prediction.

**Does Absolute Synthetic Delta predict magnitude/risk?**
Yes (IC: 0.0450). However, this is largely because it is highly correlated with the current candle's True Range and Volume. Large ranges predict continued elevated volatility (volatility clustering).

## 3. Negative Controls
Shuffling the sign of the synthetic flow (making positive flow negative and vice versa) completely preserved its ability to predict forward magnitude, proving that the **sign (buyer/seller) contains no alpha**. Only the absolute magnitude matters, which reduces back to volatility clustering.

## 4. Final Classification & Conclusion
Classification: `REDUNDANT_OHLCV_REPRESENTATION` & `FORWARD_RISK_INFORMATION`.

**SUCCESS.** We successfully falsified the hypothesis that OHLCV-derived "Synthetic Delta" provides unique directional order-flow alpha. The sophisticated calculations are redundant with simple candle geometry and volume. This eliminates an entire branch of false "smart money" hypotheses without wasting months building execution logic on top of it. True order-flow alpha will require genuine L2/TAQ data.

