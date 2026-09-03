# Alpha Candidate Specification — CANDIDATE_016_W08_MOM_HORIZON_ETHUSDT_H8

- **Candidate ID**: `CANDIDATE_016_W08_MOM_HORIZON_ETHUSDT_H8`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W08_MOM_HORIZON_ETHUSDT_H8`
- **Worker Domain**: `W08_LEAD_LAG`
- **Economic Mechanism**: Price Momentum Temporal Curve
- **Target Asset**: `ETHUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: N/A
- **Primary Forward Horizon**: `8h`
- **Sample Size ($N$)**: 2859 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0288** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **N/A** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.08** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0373** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.8929** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.0738% | +7.38 bps | 48.13% | 1.119 | 0.0386 |
| **5 bps** | 0.0238% | +2.38 bps | 46.27% | 1.037 | 0.0124 |
| **10 bps** | -0.0262% | **+-2.62 bps** | 44.77% | **0.961** | **-0.0137** |
| **20 bps** | -0.1262% | -12.62 bps | 41.48% | 0.828 | -0.0659 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
