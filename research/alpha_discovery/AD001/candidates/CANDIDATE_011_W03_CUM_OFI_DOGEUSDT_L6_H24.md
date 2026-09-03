# Alpha Candidate Specification — CANDIDATE_011_W03_CUM_OFI_DOGEUSDT_L6_H24

- **Candidate ID**: `CANDIDATE_011_W03_CUM_OFI_DOGEUSDT_L6_H24`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W03_CUM_OFI_DOGEUSDT_L6_H24`
- **Worker Domain**: `W03_MICROSTRUCTURE`
- **Economic Mechanism**: Aggressive Order Flow Imbalance Momentum
- **Target Asset**: `DOGEUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 6h
- **Primary Forward Horizon**: `24h`
- **Sample Size ($N$)**: 306 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0382** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0293** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.27** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0233** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.7218** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.532% | +53.2 bps | 54.58% | 1.505 | 0.1415 |
| **5 bps** | 0.482% | +48.2 bps | 53.59% | 1.448 | 0.1282 |
| **10 bps** | 0.432% | **+43.2 bps** | 52.61% | **1.393** | **0.1149** |
| **20 bps** | 0.332% | 33.2 bps | 50.33% | 1.289 | 0.0883 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
