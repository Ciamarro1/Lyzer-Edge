# Alpha Candidate Specification — CANDIDATE_012_W05_CROWDED_FUNDING_SUIUSDT_H2

- **Candidate ID**: `CANDIDATE_012_W05_CROWDED_FUNDING_SUIUSDT_H2`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W05_CROWDED_FUNDING_SUIUSDT_H2`
- **Worker Domain**: `W05_FUNDING_OI`
- **Economic Mechanism**: Perpetual Funding Rate Sentiment Exhaustion Reversal
- **Target Asset**: `SUIUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 720h
- **Primary Forward Horizon**: `2h`
- **Sample Size ($N$)**: 1212 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0240** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0167** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.29** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0219** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.7062** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.1082% | +10.82 bps | 50.74% | 1.184 | 0.058 |
| **5 bps** | 0.0582% | +5.82 bps | 48.84% | 1.095 | 0.0312 |
| **10 bps** | 0.0082% | **+0.82 bps** | 46.62% | **1.013** | **0.0044** |
| **20 bps** | -0.0918% | -9.18 bps | 43.98% | 0.868 | -0.0492 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
