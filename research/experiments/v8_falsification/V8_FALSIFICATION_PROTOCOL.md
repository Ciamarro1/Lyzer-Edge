# V8 Institutional Quant Signal Engine — Falsification Protocol
**Document ID**: `V8_FALSIFICATION_PROTOCOL_v1`  
**Authority**: Senior Quantitative Research Governance / Executive Metaprompt  
**Target Engine**: `InstitutionalQuantSignalEngine` (V8)  

---

## 1. Scientific Objective
The sole objective of this research campaign is **falsification testing** of the V8 Institutional Quant Signal Engine. Under strict empirical controls (temporal separation, synthetic noise nullification, multi-asset validation, fee-drag realism, and multiple testing adjustments), we test whether the V8 signal displays real out-of-sample economic edge, or if its apparent performance is an artifact of curve-fitting, statistical noise, or implementation leakage.

## 2. Gate Definitions
- **G0 — Software / Contract Integrity**: Verifies zero test regressions across unit, ECA, and stream suites. Asserts 100% bitwise determinism under identical candle inputs.
- **G1 — Synthetic Null Falsification**: Evaluates engine across 6 synthetic null data generators (Gaussian IID, Student-t fat tails, Geometric Brownian Motion random walk, temporally shuffled returns, block-bootstrapped returns, pure GARCH/volatility-only shocks).
- **G2 — Temporal OOS Validation**: Tests pre-registered chronological split with a Chinese Wall (In-Sample vs Out-of-Sample).
- **G3 — Purged & Embargoed Cross-Validation**: Implements purging over lookback (64 bars) and embargoing over trade horizon ($t_{1/2}$ and 10 bars) to eliminate serial correlation leakage.
- **G4 — Multiple Testing Controls**: Corrects p-values via Holm-Bonferroni, Benjamini-Hochberg (FDR), and Bailey-López de Prado Deflated Sharpe Ratio (DSR).
- **G5 — Economic Significance & Friction**: Models exchange trading fees (maker 0.02%, taker 0.05%), bid-ask spread, slippage, and execution latency.
- **G6 — Cross-Asset Robustness**: Compares independent performance on BTCUSDT, ETHUSDT, and SOLUSDT with identical parameters.
- **G7 — Regime Purity**: Falsifies Hurst boundaries ($H < 0.45$, $0.45 \le H \le 0.55$, $H > 0.55$) and Ornstein-Uhlenbeck half-life constraints.
- **G8 — Ablation Study**: Sequentially removes each pillar (Hurst, OU, HAC Drift, OFI, EVT Cornish-Fisher, Vol Shock, Kelly) and checks if Full V8 delivers statistically superior Sharpe over naive baseline.
- **G9 — Shadow Live**: Evaluates real-time forward execution telemetry without capital allocation.
- **G10 — Final Economic Verdict**: Delivers conclusive classification: `EDGE DETECTED`, `EDGE NOT DETECTED`, `INCONCLUSIVE`, or `PROTOCOL INVALIDATED`.
