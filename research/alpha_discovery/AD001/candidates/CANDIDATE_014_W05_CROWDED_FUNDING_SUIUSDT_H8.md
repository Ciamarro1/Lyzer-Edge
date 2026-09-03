# Alpha Candidate Specification — CANDIDATE_014_W05_CROWDED_FUNDING_SUIUSDT_H8

- **Candidate ID**: `CANDIDATE_014_W05_CROWDED_FUNDING_SUIUSDT_H8`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W05_CROWDED_FUNDING_SUIUSDT_H8`
- **Worker Domain**: `W05_FUNDING_OI`
- **Economic Mechanism**: Perpetual Funding Rate Sentiment Exhaustion Reversal
- **Target Asset**: `SUIUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 720h
- **Primary Forward Horizon**: `8h`
- **Sample Size ($N$)**: 310 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0488** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0325** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.67** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0076** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.6320** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.5082% | +50.82 bps | 54.19% | 1.519 | 0.1464 |
| **5 bps** | 0.4582% | +45.82 bps | 52.26% | 1.457 | 0.132 |
| **10 bps** | 0.4082% | **+40.82 bps** | 51.61% | **1.398** | **0.1176** |
| **20 bps** | 0.3082% | 30.82 bps | 49.68% | 1.287 | 0.0888 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
