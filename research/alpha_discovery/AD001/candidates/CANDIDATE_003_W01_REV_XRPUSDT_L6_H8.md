# Alpha Candidate Specification — CANDIDATE_003_W01_REV_XRPUSDT_L6_H8

- **Candidate ID**: `CANDIDATE_003_W01_REV_XRPUSDT_L6_H8`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W01_REV_XRPUSDT_L6_H8`
- **Worker Domain**: `W01_PRICE`
- **Economic Mechanism**: Short-Term Mean Reversion
- **Target Asset**: `XRPUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 6h
- **Primary Forward Horizon**: `8h`
- **Sample Size ($N$)**: 4016 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0484** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0720** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.44** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0146** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.6408** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.0967% | +9.67 bps | 52.99% | 1.146 | 0.0404 |
| **5 bps** | 0.0467% | +4.67 bps | 51.57% | 1.068 | 0.0195 |
| **10 bps** | -0.0033% | **+-0.33 bps** | 50.17% | **0.995** | **-0.0014** |
| **20 bps** | -0.1033% | -10.33 bps | 47.04% | 0.864 | -0.0431 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
