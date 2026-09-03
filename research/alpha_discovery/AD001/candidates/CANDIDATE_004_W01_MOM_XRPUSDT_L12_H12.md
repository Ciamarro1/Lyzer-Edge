# Alpha Candidate Specification — CANDIDATE_004_W01_MOM_XRPUSDT_L12_H12

- **Candidate ID**: `CANDIDATE_004_W01_MOM_XRPUSDT_L12_H12`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W01_MOM_XRPUSDT_L12_H12`
- **Worker Domain**: `W01_PRICE`
- **Economic Mechanism**: Time-Series Momentum
- **Target Asset**: `XRPUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 12h
- **Primary Forward Horizon**: `12h`
- **Sample Size ($N$)**: 2676 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0422** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0203** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.87** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0042** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.6033** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.161% | +16.1 bps | 50.22% | 1.206 | 0.0571 |
| **5 bps** | 0.111% | +11.1 bps | 49.14% | 1.138 | 0.0394 |
| **10 bps** | 0.061% | **+6.1 bps** | 47.61% | **1.073** | **0.0216** |
| **20 bps** | -0.039% | -3.9 bps | 45.22% | 0.956 | -0.0138 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
