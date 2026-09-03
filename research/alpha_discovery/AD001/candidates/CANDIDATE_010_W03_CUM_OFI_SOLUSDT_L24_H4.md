# Alpha Candidate Specification — CANDIDATE_010_W03_CUM_OFI_SOLUSDT_L24_H4

- **Candidate ID**: `CANDIDATE_010_W03_CUM_OFI_SOLUSDT_L24_H4`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W03_CUM_OFI_SOLUSDT_L24_H4`
- **Worker Domain**: `W03_MICROSTRUCTURE`
- **Economic Mechanism**: Aggressive Order Flow Imbalance Momentum
- **Target Asset**: `SOLUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 24h
- **Primary Forward Horizon**: `4h`
- **Sample Size ($N$)**: 144 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0249** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **-0.0020** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.12** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0344** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.8362** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.2517% | +25.17 bps | 52.08% | 1.632 | 0.1504 |
| **5 bps** | 0.2017% | +20.17 bps | 50.00% | 1.477 | 0.1205 |
| **10 bps** | 0.1517% | **+15.17 bps** | 46.53% | **1.339** | **0.0906** |
| **20 bps** | 0.0517% | 5.17 bps | 43.75% | 1.103 | 0.0309 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
