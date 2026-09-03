# Alpha Candidate Specification — CANDIDATE_002_W01_ACC_SUIUSDT_H8

- **Candidate ID**: `CANDIDATE_002_W01_ACC_SUIUSDT_H8`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W01_ACC_SUIUSDT_H8`
- **Worker Domain**: `W01_PRICE`
- **Economic Mechanism**: Return Acceleration (Second Derivative of Log Price)
- **Target Asset**: `SUIUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 24h
- **Primary Forward Horizon**: `8h`
- **Sample Size ($N$)**: 3645 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0328** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0314** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.59** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0097** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.6386** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.1305% | +13.05 bps | 51.41% | 1.128 | 0.0422 |
| **5 bps** | 0.0805% | +8.05 bps | 50.53% | 1.077 | 0.026 |
| **10 bps** | 0.0305% | **+3.05 bps** | 49.55% | **1.029** | **0.0099** |
| **20 bps** | -0.0695% | -6.95 bps | 47.16% | 0.938 | -0.0225 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
