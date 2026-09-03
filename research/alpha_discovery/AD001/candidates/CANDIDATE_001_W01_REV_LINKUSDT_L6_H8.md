# Alpha Candidate Specification — CANDIDATE_001_W01_REV_LINKUSDT_L6_H8

- **Candidate ID**: `CANDIDATE_001_W01_REV_LINKUSDT_L6_H8`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W01_REV_LINKUSDT_L6_H8`
- **Worker Domain**: `W01_PRICE`
- **Economic Mechanism**: Short-Term Mean Reversion
- **Target Asset**: `LINKUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 6h
- **Primary Forward Horizon**: `8h`
- **Sample Size ($N$)**: 4016 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0392** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0392** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.66** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0077** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.5793** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.1063% | +10.63 bps | 52.54% | 1.131 | 0.042 |
| **5 bps** | 0.0563% | +5.63 bps | 51.42% | 1.067 | 0.0223 |
| **10 bps** | 0.0063% | **+0.63 bps** | 50.55% | **1.007** | **0.0025** |
| **20 bps** | -0.0937% | -9.37 bps | 47.76% | 0.897 | -0.0371 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
