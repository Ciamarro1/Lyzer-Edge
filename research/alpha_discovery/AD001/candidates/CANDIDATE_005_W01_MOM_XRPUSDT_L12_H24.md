# Alpha Candidate Specification — CANDIDATE_005_W01_MOM_XRPUSDT_L12_H24

- **Candidate ID**: `CANDIDATE_005_W01_MOM_XRPUSDT_L12_H24`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W01_MOM_XRPUSDT_L12_H24`
- **Worker Domain**: `W01_PRICE`
- **Economic Mechanism**: Time-Series Momentum
- **Target Asset**: `XRPUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 12h
- **Primary Forward Horizon**: `24h`
- **Sample Size ($N$)**: 1338 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0325** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0041** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **1.99** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0468** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.9360** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.2148% | +21.48 bps | 50.37% | 1.183 | 0.053 |
| **5 bps** | 0.1648% | +16.48 bps | 49.33% | 1.138 | 0.0407 |
| **10 bps** | 0.1148% | **+11.48 bps** | 48.51% | **1.094** | **0.0283** |
| **20 bps** | 0.0148% | 1.48 bps | 46.41% | 1.012 | 0.0037 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
