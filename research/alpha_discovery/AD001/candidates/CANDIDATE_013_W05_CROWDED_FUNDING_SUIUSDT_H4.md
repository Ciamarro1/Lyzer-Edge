# Alpha Candidate Specification — CANDIDATE_013_W05_CROWDED_FUNDING_SUIUSDT_H4

- **Candidate ID**: `CANDIDATE_013_W05_CROWDED_FUNDING_SUIUSDT_H4`
- **Classification**: **DISCOVERY_CANDIDATE**
- **Underlying Hypothesis ID**: `W05_CROWDED_FUNDING_SUIUSDT_H4`
- **Worker Domain**: `W05_FUNDING_OI`
- **Economic Mechanism**: Perpetual Funding Rate Sentiment Exhaustion Reversal
- **Target Asset**: `SUIUSDT`
- **Timeframe**: `1h`
- **Lookback Window**: 720h
- **Primary Forward Horizon**: `4h`
- **Sample Size ($N$)**: 610 non-overlapping evaluations

---

## Statistical & Econometric Evidence

| Dimension | Realized Value | Exploration Benchmark | Interpretation |
|---|:---:|:---:|:---:|
| **Pearson IC** | **0.0340** | $|IC| \ge 0.02$ | **POSITIVE CORRELATION** |
| **Spearman Rank IC** | **0.0225** | Monotonic consistency | **CONFIRMED** |
| **Newey-West HAC $t$-stat** | **2.56** | $|t| > 1.96$ | **NOMINALLY SIGNIFICANT** |
| **HAC $p$-value** | **0.0106** | $p < 0.05$ | **PASS** |
| **Benjamini-Hochberg FDR $q$-val** | **0.6203** | $q^* = 0.05$ | Multi-Testing Control ($M=1580$) |

---

## Cost Sensitivity Curve

| Friction Tier | Mean Return / Trade | Net Expectancy (bps) | Hit Rate | Profit Factor | Unannualized Sharpe |
|---|:---:|:---:|:---:|:---:|:---:|
| **0 bps (Gross)** | 0.2337% | +23.37 bps | 51.15% | 1.302 | 0.0904 |
| **5 bps** | 0.1837% | +18.37 bps | 50.00% | 1.23 | 0.0711 |
| **10 bps** | 0.1337% | **+13.37 bps** | 49.18% | **1.163** | **0.0517** |
| **20 bps** | 0.0337% | 3.37 bps | 46.23% | 1.039 | 0.013 |

---

## Epistemic Status
- **Classification**: `DISCOVERY_CANDIDATE`
- **Notice**: This candidate was discovered in exploratory campaign `ALPHA_DISCOVERY_001`. It is **NOT** confirmed alpha. It is pre-registered for further multi-asset verification and subsequent blind out-of-sample testing under a dedicated independent charter.
