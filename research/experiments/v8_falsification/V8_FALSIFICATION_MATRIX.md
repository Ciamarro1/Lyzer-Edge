# V8 Institutional Quant Signal Engine — Falsification Matrix

| Gate | Test Description | Result | Key Metric | Gate Threshold | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **G0** | **Software / Contract Integrity & Determinism** | **PASS** | Vitest Unit (59/59) + Determinism (250/250) | 0 failures, 100% deterministic | **COMPLETED** |
| **G1** | **Synthetic Null Falsification (Historical)** | **INCONCLUSIVE** | FPR: 0.05% (Valid), Micro-Sharpe Defect | FPR $\le 6.5\%$, metric defect audited | **HISTORICAL (INCONCLUSIVE)** |
| **G1-R1**| **Synthetic Null Revalidation (Complete Universe)** | **PENDING** | Pooled Sharpe, Continuous Sharpe, Fisher-Z IC | Complete accounting, zero survivor bias | 🔒 **PROTOCOL FROZEN (BLOCKED)** |
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

### Gate G1 Forensic Audit Historical Record (`commit f16513b`)

| Null Family | Replications ($\ge 3$ Signals) | Original Reported Med. Sharpe | True Pooled Trade Sharpe | True Continuous Strategy Sharpe | True Pooled IC | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Gaussian IID** | 36 / 1,000 (3.6%) | 1.42 | **+0.0330** | **+0.0057** | +0.0305 | **AUDITED** |
| **Student-t IID** | 28 / 1,000 (2.8%) | 3.29 | **-0.0138** | **-0.0022** | -0.0142 | **AUDITED** |
| **Random Walk** | 36 / 1,000 (3.6%) | 4.30 | **+0.0178** | **+0.0030** | +0.0144 | **AUDITED** |
| **Temporal Shuffle** | 28 / 1,000 (2.8%) | -0.78 | **-0.0925** | **-0.0149** | -0.0928 | **AUDITED** |
| **Block Shuffle** | 33 / 1,000 (3.3%) | -2.96 | **-0.0563** | **-0.0101** | -0.0591 | **AUDITED** |
| **Volatility Null (GARCH)** | 38 / 1,000 (3.8%) | 8.16 | **-0.0021** | **-0.0004** | -0.0046 | **AUDITED** |
