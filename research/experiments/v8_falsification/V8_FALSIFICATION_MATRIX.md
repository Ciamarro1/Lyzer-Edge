# V8 Institutional Quant Signal Engine — Falsification Matrix

| Gate | Test Description | Result | Key Metric | Gate Threshold | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **G0** | **Software / Contract Integrity & Determinism** | **PASS** | Vitest Unit (59/59) + Determinism (250/250) | 0 failures, 100% deterministic | **COMPLETED** |
| **G1** | **Synthetic Null Falsification (Historical)** | **INCONCLUSIVE** | FPR: 0.05% (Valid), Micro-Sharpe Defect | FPR $\le 6.5\%$, metric defect audited | **HISTORICAL (INCONCLUSIVE)** |
| **G1-R1**| **Synthetic Null Revalidation (Complete Universe)** | **PASS** | FPR: 0.00%, Pooled Trade Sharpe $\in [-0.09, +0.03]$, IC $\approx 0$ | FPR $\le 6.5\%$, no spurious alpha | **COMPLETED (PASS)** |
| **G2** | Temporal OOS (Pre-registered Chinese Wall) | - | Out-Of-Sample IC, Net Sharpe | IC > 0, Sharpe > 0 OOS | **BLOCKED** |
| **G3** | Purged + Embargoed Cross-Validation | - | Horizon-adjusted Purge Leakage | Zero temporal leakage | PENDING |
| **G4** | Multiple Testing Correction (FDR / Holm-Bonferroni / DSR) | - | Family-Wise Error Rate, Adjusted p-value | Adjusted $p < 0.05$ | PENDING |
| **G5** | Economic Significance (Fee-Drag, Slippage, Spread, Latency) | - | Net Expectancy, Net PnL, Turnover | Net PnL > 0 after friction | PENDING |
| **G6** | Cross-Asset Falsification (BTC, ETH, SOL) | - | Cross-Asset IC consistency | Survives without asset-specific curve fitting | PENDING |
| **G7** | Regime Stability (Hurst Bands, Vol Shock, OU vs Trend) | - | Purity & Sharpe per Regime | Regime hypotheses empirically match | PENDING |
| **G8** | Ablation Study (Component Marginal Contribution) | - | Marginal Sharpe of V8 vs simple naive | V8 full > stripped components | PENDING |
| **G9** | Shadow Live Forward Testing (Cold Zero-Capital Ingestion) | - | Real-time Forward Realization | Realized matches predicted distribution | PENDING |
| **G10**| Final Institutional Economic Verdict | - | Binary Classification | EDGE DETECTED / EDGE NOT DETECTED | PENDING |

---

### Gate G1-R1 Revalidation Detailed Breakdown (102,000 Observations)

| Null Family | Trades | Exposure | FPR (%) | Pooled Trade Sharpe | Pooled $t$-Stat ($p$-val) | Continuous Sharpe | Pooled IC [95% CI] | Paired vs Random ($p$-val) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Gaussian IID** | 509 | 2.99% | 0.00% | +0.0330 | +0.74 ($p=0.46$) | +0.0057 | +0.0305 [-0.057, +0.117] | $t=+1.00$ ($p=0.32$) | **PASS** |
| **Student-t IID** | 433 | 2.55% | 0.00% | -0.0138 | -0.29 ($p=0.77$) | -0.0022 | -0.0142 [-0.108, +0.080] | $t=-0.91$ ($p=0.37$) | **PASS** |
| **Random Walk** | 480 | 2.82% | 0.00% | +0.0178 | +0.39 ($p=0.70$) | +0.0030 | +0.0144 [-0.075, +0.104] | $t=+1.92$ ($p=0.05$) | **PASS** |
| **Temporal Shuffle** | 443 | 2.61% | 0.00% | -0.0925 | -1.95 ($p=0.05$) | -0.0149 | -0.0928 [-0.184, +0.000] | $t=-1.88$ ($p=0.06$) | **PASS** |
| **Block Shuffle** | 548 | 3.22% | 0.00% | -0.0563 | -1.32 ($p=0.19$) | -0.0101 | -0.0591 [-0.142, +0.025] | $t=+1.25$ ($p=0.21$) | **PASS** |
| **GARCH Null** | 537 | 3.16% | 0.00% | -0.0021 | -0.05 ($p=0.96$) | -0.0004 | -0.0046 [-0.089, +0.080] | $t=+0.80$ ($p=0.42$) | **PASS** |
