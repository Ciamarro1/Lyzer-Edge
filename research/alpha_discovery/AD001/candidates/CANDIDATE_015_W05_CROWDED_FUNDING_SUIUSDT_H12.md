# Alpha Candidate Specification — CANDIDATE_015_W05_CROWDED_FUNDING_SUIUSDT_H12

- **Candidate ID**: `CANDIDATE_015_W05_CROWDED_FUNDING_SUIUSDT_H12`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W05_CROWDED_FUNDING_SUIUSDT_H12`
- **Worker Domain**: `W05_FUNDING_OI`
- **Economic Mechanism**: Perpetual Funding Rate Sentiment Exhaustion Reversal
- **Target Asset**: `SUIUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 720h
- **Primary Forward Horizon**: `12h`
- **Sample Size ($N$)**: 197 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0615** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0453** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.54** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0110** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.6207** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.8169% | +81.69 bps | 54.31% | 1.749 | 0.2042 |
| **5 bps** | 0.7669% | +76.69 bps | 54.31% | 1.689 | 0.1917 |
| **10 bps** | 0.7169% | **+71.69 bps** | 53.81% | **1.631** | **0.1792** |
| **20 bps** | 0.6169% | 61.69 bps | 52.79% | 1.521 | 0.1542 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
