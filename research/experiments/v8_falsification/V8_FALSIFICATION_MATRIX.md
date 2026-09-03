# V8 Institutional Quant Signal Engine — Falsification Matrix

> **CAMPAIGN STATUS**: 🛑 **HALTED ON GATE G2 FALSIFICATION (FAIL-CLOSED)**  
> **Target Engine**: `InstitutionalQuantSignalEngine` (V8, Frozen SHA-256: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`)  
> **Final Scientific Verdict**: V8 suppresses noise under pure synthetic nulls (G1-R1 PASS), but fails to demonstrate statistically significant directional predictive edge out-of-sample under Newey-West HAC inference ($p = 0.3172 \ge 0.05$), with an in-sample baseline that does not support temporal retention (G2 FAIL).

| Gate | Test Description | Result | Key Metric | Gate Threshold | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **G0** | **Software / Contract Integrity & Determinism** | **PASS** | Vitest Unit (59/59) + Determinism (250/250) | 0 failures, 100% deterministic | **COMPLETED (PASS)** |
| **G1** | **Synthetic Null Falsification (Historical)** | **INCONCLUSIVE** | FPR: 0.05% (Valid), Micro-Sharpe Defect | FPR $\le 6.5\%$, metric defect audited | **HISTORICAL (INCONCLUSIVE)** |
| **G1-R1**| **Synthetic Null Revalidation (Complete Universe)** | **PASS** | FPR: 0.00%, Pooled Trade Sharpe $\in [-0.09, +0.03]$, IC $\approx 0$ | FPR $\le 6.5\%$, no spurious alpha | **COMPLETED (PASS)** |
| **G2** | **Temporal OOS (Pre-registered Chinese Wall)** | **FAIL** | $IC_{\text{OOS}} = +0.1976$ ($p_{\text{HAC}} = 0.317$), $IC_{\text{IS}} = -0.1175$ | $IC_{\text{OOS}} > 0, p < 0.05$, Retention $\ge 30\%$ | **COMPLETED (FAIL)** |
| **G3** | Purged + Embargoed Cross-Validation | - | Horizon-adjusted Purge Leakage | Zero temporal leakage | 🛑 **BLOCKED** |
| **G4** | Multiple Testing Correction (FDR / Holm-Bonferroni / DSR) | - | Family-Wise Error Rate, Adjusted p-value | Adjusted $p < 0.05$ | 🛑 **BLOCKED** |
| **G5** | Economic Significance (Fee-Drag, Slippage, Spread, Latency) | - | Net Expectancy, Net PnL, Turnover | Net PnL > 0 after friction | 🛑 **BLOCKED** |
| **G6** | Cross-Asset Falsification (BTC, ETH, SOL) | - | Cross-Asset IC consistency | Survives without asset-specific curve fitting | 🛑 **BLOCKED** |
| **G7** | Regime Stability (Hurst Bands, Vol Shock, OU vs Trend) | - | Purity & Sharpe per Regime | Regime hypotheses empirically match | 🛑 **BLOCKED** |
| **G8** | Ablation Study (Component Marginal Contribution) | - | Marginal Sharpe of V8 vs simple naive | V8 full > stripped components | 🛑 **BLOCKED** |
| **G9** | Shadow Live Forward Testing (Cold Zero-Capital Ingestion) | - | Real-time Forward Realization | Realized matches predicted distribution | 🛑 **BLOCKED** |
| **G10**| Final Institutional Economic Verdict | **FAIL** | Empirical Falsification at Gate G2 | EDGE DETECTED / EDGE NOT DETECTED | **FINAL VERDICT: EDGE NOT DETECTED** |

---

### Gate G2 Temporal Out-of-Sample Performance Breakdown (BTCUSDT, 10 bps Fixed Friction)

| Period | Bars / Timeline | Directional Signals | Non-Overlapping Trades | Market Exposure | Net Hit Rate | Net Mean Return (bps) | Information Coefficient (IC) | HAC $p$-value | Continuous Sharpe | Max Drawdown | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **In-Sample (IS)** | 17,544 bars (24 mos) | 585 | 56 | 3.35% | 37.50% | -23.08 bps | -0.1175 | 0.1815 | -0.66 | 44.47% | **BASELINE** |
| **Chinese Wall** | 100 bars (buffer) | - | - | 0.00% | - | - | - | - | - | - | **EMBARGO** |
| **Out-Of-Sample (OOS)** | 14,492 bars (~20 mos) | 331 | 25 | 2.29% | 52.00% | +29.70 bps | +0.1976 | 0.3172 | +0.05 | 25.49% | **FAIL ($p \ge 0.05$)** |

*Official Finding*: In-Sample baseline was non-positive ($IC_{\text{IS}} = -0.1175$), rendering retention formally `NOT EVALUABLE (IS BASELINE NON-POSITIVE)` per pre-registered Protocol v2.1.
While Out-Of-Sample realized returns were economically positive (+29.7 bps net per trade, 52% hit rate), the small sample size ($N=25$) under HAC covariance estimation fails to reject the null hypothesis of zero predictive edge ($p = 0.3172 \ge 0.05$).
