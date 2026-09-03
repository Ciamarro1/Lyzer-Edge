# Alpha Candidate Specification — CANDIDATE_009_W03_CUM_OFI_SOLUSDT_L12_H8

- **Candidate ID**: `CANDIDATE_009_W03_CUM_OFI_SOLUSDT_L12_H8`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W03_CUM_OFI_SOLUSDT_L12_H8`
- **Worker Domain**: `W03_MICROSTRUCTURE`
- **Economic Mechanism**: Aggressive Order Flow Imbalance Momentum
- **Target Asset**: `SOLUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 12h
- **Primary Forward Horizon**: `8h`
- **Sample Size ($N$)**: 208 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0278** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0157** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.02** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0435** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.9288** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.3002% | +30.02 bps | 51.92% | 1.461 | 0.1294 |
| **5 bps** | 0.2502% | +25.02 bps | 50.96% | 1.371 | 0.1079 |
| **10 bps** | 0.2002% | **+20.02 bps** | 50.00% | **1.286** | **0.0863** |
| **20 bps** | 0.1002% | 10.02 bps | 49.52% | 1.134 | 0.0432 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
