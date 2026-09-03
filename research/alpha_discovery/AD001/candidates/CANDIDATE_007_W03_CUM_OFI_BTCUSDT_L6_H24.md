# Alpha Candidate Specification — CANDIDATE_007_W03_CUM_OFI_BTCUSDT_L6_H24

- **Candidate ID**: `CANDIDATE_007_W03_CUM_OFI_BTCUSDT_L6_H24`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W03_CUM_OFI_BTCUSDT_L6_H24`
- **Worker Domain**: `W03_MICROSTRUCTURE`
- **Economic Mechanism**: Aggressive Order Flow Imbalance Momentum
- **Target Asset**: `BTCUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 6h
- **Primary Forward Horizon**: `24h`
- **Sample Size ($N$)**: 290 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0415** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0357** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.46** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0139** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.6459** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.3537% | +35.37 bps | 53.10% | 1.607 | 0.1577 |
| **5 bps** | 0.3037% | +30.37 bps | 51.38% | 1.501 | 0.1354 |
| **10 bps** | 0.2537% | **+25.37 bps** | 49.31% | **1.402** | **0.1131** |
| **20 bps** | 0.1537% | 15.37 bps | 46.90% | 1.225 | 0.0685 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
