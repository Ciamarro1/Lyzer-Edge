# Alpha Candidate Specification — CANDIDATE_006_W02_SHOCK_BNBUSDT_H12

- **Candidate ID**: `CANDIDATE_006_W02_SHOCK_BNBUSDT_H12`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W02_SHOCK_BNBUSDT_H12`
- **Worker Domain**: `W02_VOLATILITY`
- **Economic Mechanism**: Volatility Spike Exhaustion Reversal
- **Target Asset**: `BNBUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 72h
- **Primary Forward Horizon**: `12h`
- **Sample Size ($N$)**: 301 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0474** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0282** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.02** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0436** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.9185** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.2487% | +24.87 bps | 54.49% | 1.351 | 0.0976 |
| **5 bps** | 0.1987% | +19.87 bps | 53.82% | 1.272 | 0.078 |
| **10 bps** | 0.1487% | **+14.87 bps** | 53.16% | **1.197** | **0.0584** |
| **20 bps** | 0.0487% | 4.87 bps | 52.16% | 1.061 | 0.0191 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
