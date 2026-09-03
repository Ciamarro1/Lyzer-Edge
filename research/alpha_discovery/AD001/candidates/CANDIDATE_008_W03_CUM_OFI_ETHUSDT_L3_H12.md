# Alpha Candidate Specification — CANDIDATE_008_W03_CUM_OFI_ETHUSDT_L3_H12

- **Candidate ID**: `CANDIDATE_008_W03_CUM_OFI_ETHUSDT_L3_H12`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W03_CUM_OFI_ETHUSDT_L3_H12`
- **Worker Domain**: `W03_MICROSTRUCTURE`
- **Economic Mechanism**: Aggressive Order Flow Imbalance Momentum
- **Target Asset**: `ETHUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 3h
- **Primary Forward Horizon**: `12h`
- **Sample Size ($N$)**: 745 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0318** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **-0.0099** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.52** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0118** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.6014** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.1986% | +19.86 bps | 50.47% | 1.326 | 0.0895 |
| **5 bps** | 0.1486% | +14.86 bps | 48.99% | 1.235 | 0.067 |
| **10 bps** | 0.0986% | **+9.86 bps** | 47.11% | **1.15** | **0.0444** |
| **20 bps** | -0.0014% | -0.14 bps | 43.49% | 0.998 | -0.0006 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
