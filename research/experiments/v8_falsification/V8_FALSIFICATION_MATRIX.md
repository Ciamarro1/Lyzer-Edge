# V8 Institutional Quant Signal Engine — Falsification Matrix

| Gate | Test Description | Result | Key Metric | Gate Threshold | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **G0** | **Software / Contract Integrity & Determinism** | **PASS** | Vitest Unit (59/59) + Determinism (250/250) | 0 failures, 100% deterministic | **COMPLETED** |
| **G1** | **Synthetic Null Falsification (6 Families x 1,000)** | **PASS** | Mean FPR: 0.05% (3/6,000), Median IC: 0.0000 | FPR $\le 6.5\%$, no spurious alpha | **COMPLETED** |
| **G2** | Temporal OOS (Pre-registered Chinese Wall) | - | Out-Of-Sample IC, Net Sharpe | IC > 0, Sharpe > 0 OOS | PENDING |
| **G3** | Purged + Embargoed Cross-Validation | - | Horizon-adjusted Purge Leakage | Zero temporal leakage | PENDING |
| **G4** | Multiple Testing Correction (FDR / Holm-Bonferroni / DSR) | - | Family-Wise Error Rate, Adjusted p-value | Adjusted $p < 0.05$ | PENDING |
| **G5** | Economic Significance (Fee-Drag, Slippage, Spread, Latency) | - | Net Expectancy, Net PnL, Turnover | Net PnL > 0 after friction | PENDING |
| **G6** | Cross-Asset Falsification (BTC, ETH, SOL) | - | Cross-Asset IC consistency | Survives without asset-specific curve fitting | PENDING |
| **G7** | Regime Stability (Hurst Bands, Vol Shock, OU vs Trend) | - | Purity & Sharpe per Regime | Regime hypotheses empirically match | PENDING |
| **G8** | Ablation Study (Component Marginal Contribution) | - | Marginal Sharpe of V8 vs simple naive | V8 full > stripped components | PENDING |
| **G9** | Shadow Live Forward Testing (Cold Zero-Capital Ingestion) | - | Real-time Forward Realization | Realized matches predicted distribution | PENDING |
| **G10**| Final Institutional Economic Verdict | - | Binary Classification | EDGE DETECTED / EDGE NOT DETECTED | PENDING |

---

### Gate G1 Detailed Synthetic Null Breakdown

| Null Family | Replications | Edge Detections | FPR (%) | Median IC | 95% IC | Median Sharpe | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Gaussian IID** | 1,000 | 0 | 0.00% | 0.0000 | 0.0000 | 1.42 | **PASS** |
| **Student-t IID** | 1,000 | 1 | 0.10% | 0.0000 | 0.8435 | 3.29 | **PASS** |
| **Random Walk** | 1,000 | 0 | 0.00% | 0.0000 | 0.0220 | 4.30 | **PASS** |
| **Temporal Shuffle** | 1,000 | 1 | 0.10% | 0.0000 | 0.4901 | -0.78 | **PASS** |
| **Block Shuffle** | 1,000 | 1 | 0.10% | 0.0000 | 0.1242 | -2.96 | **PASS** |
| **Volatility Null** | 1,000 | 0 | 0.00% | 0.0000 | 0.5414 | 8.16 | **PASS** |
