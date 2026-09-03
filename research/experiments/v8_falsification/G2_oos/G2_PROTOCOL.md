# Gate G2 — Temporal Out-Of-Sample (OOS) Validation Protocol
**Document ID**: `G2_TEMPORAL_OOS_PROTOCOL_v1`  
**Target Engine**: `InstitutionalQuantSignalEngine` (V8, Frozen SHA-256: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`)  
**Campaign**: `LYZER_EDGE_V8_FREEZE_FALSIFICATION_OOS`  
**Governance Authority**: Senior Quantitative Architecture Review  
**Timestamp UTC**: `2026-09-03T01:53:00.000Z`  
**Execution State**: 🔒 **FROZEN PROTOCOL — EXECUTION STRICTLY BLOCKED**  

---

## 1. Scientific Objective
The objective of Gate G2 is to determine whether the V8 Institutional Quant Signal Engine demonstrates genuine out-of-sample directional predictive ability on unseen temporal market regimes, or if its apparent mechanisms are merely artifacts of in-sample curve fitting, historical hindsight, or lookahead leakage.

### Non-Negotiable Governance Axioms
1. **Zero Parameter Tuning**: Engine parameters, thresholds, lookbacks, and filters remain 100% frozen.
2. **Strict Chinese Wall**: The Out-of-Sample (OOS) dataset is completely segregated from any prior optimization or calibration.
3. **Fail-Closed Principle**: If out-of-sample performance fails to exhibit statistically significant positive edge ($IC \le 0$ or $t \le 0$), Gate G2 is definitively classified as **FAIL (EDGE NOT DETECTED)**.
4. **Execution Gate Ordering**: The protocol is frozen first; execution requires explicit executive authorization.

---

## 2. Chronological Segmentation & Chinese Wall Specification

The audit utilizes the pre-registered dataset `BTCUSDT_1h.json` (SHA-256: `d2ab2b02...`, 32,136 hourly bars spanning from 2023-01-01T00:00Z to 2026-08-31T23:00Z).

```text
2023-01-01                               2024-12-31    2025-01-04                     2026-08-31
[================== IN-SAMPLE ==================] [EMBARGO] [============== OUT-OF-SAMPLE ===============]
                17,520 bars (24 months)             100 bars             14,516 bars (20 months)
```

### 2.1 In-Sample Period (Historical Baseline Reference)
- **Time Range**: `2023-01-01T00:00:00.000Z` → `2024-12-30T23:00:00.000Z`
- **Bar Indices**: `[0, 17519]` (17,520 hourly bars, exactly 24 calendar months).
- **Purpose**: Establishes the baseline reference performance profile of the frozen V8 engine.

### 2.2 Temporal Purge & Embargo Buffer (Chinese Wall)
- **Time Range**: `2024-12-31T00:00:00.000Z` → `2025-01-04T03:00:00.000Z`
- **Bar Indices**: `[17520, 17619]` (100 hourly bars).
- **Mathematical Necessity**: The primary lookback of V8 is 64 bars, and the forward evaluation horizon is 10 bars ($64 + 10 = 74$ bars). A 100-bar embargo guarantees that zero feature lookback or forward trade return crosses the boundary between In-Sample and Out-of-Sample periods.

### 2.3 Out-Of-Sample Period (Pure Blind Temporal Validation)
- **Time Range**: `2025-01-04T04:00:00.000Z` → `2026-08-31T23:00:00.000Z`
- **Bar Indices**: `[17620, 32135]` (14,516 hourly bars, exactly 20 calendar months).
- **Contamination Controls**: At every timestep $t \ge 17620$, the engine is fed strictly historical bars `candles.slice(t - 64, t)`. No future bar $t + k$ is accessible to the engine.

---

## 3. Methodological Improvements from Gate G1/G1-R1

To address the methodological limitations identified and recorded during G1-R1:

1. **Non-Overlapping Evaluation Cadence**:
   - In addition to standard 1-hour continuous tracking, forward return evaluations are conducted at **non-overlapping intervals of $H = 10$ bars** (every 10 hours) to ensure asymptotic statistical independence of observations, eliminating serial correlation in $t$-stats and Fisher $Z$-transformed ICs.
2. **Complete Universe Accounting**:
   - Both the active trade return series and the continuous time-series (incorporating cash/abstention periods where return is 0) are computed and reported.
3. **No Unwarranted Causal Claims**:
   - Exposure reduction is reported factually as engine abstention/veto rate; causal attribution to specific components is strictly deferred to Gate G8 (Ablation Study).

---

## 4. Formal Metrics to be Recorded

For both In-Sample (IS) and Out-Of-Sample (OOS):

1. **Trade Execution Statistics**:
   - Total Observation Bars ($N$).
   - Directional Signals Emitted ($N_{\text{trades}}, N_{\text{long}}, N_{\text{short}}$).
   - Abstention & Veto Count ($N_{\text{flat}}$).
   - Exposure Ratio: $\frac{N_{\text{trades}}}{N}$.
2. **Information Coefficient (Predictive Accuracy)**:
   - Pearson $IC = \text{Corr}(dir_t, R_{t, t+H})$.
   - Fisher $Z$ $95\%$ Confidence Interval: $[CI_{\text{low}}, CI_{\text{high}}]$.
   - $t$-statistic and two-tailed $p$-value.
3. **Economic Performance Metrics**:
   - Hit Rate ($HR = \frac{\sum \mathbf{1}_{y_t > 0}}{N_{\text{trades}}}$).
   - Mean Return per Trade ($E[y]$).
   - Pooled Trade Sharpe Ratio (Unannualized): $\frac{\bar{y}}{\sigma_y}$.
   - Annualized Strategy Sharpe Ratio (Continuous): $\frac{\bar{R}_{\text{hourly}}}{\sigma_{\text{hourly}}} \times \sqrt{8760}$.
   - Maximum Drawdown ($MDD$) on continuous equity curve.
   - Profit Factor ($PF = \frac{\sum \text{Gains}}{\sum |\text{Losses}|}$).
4. **Frictional Economic Significance**:
   - Gross Expectancy vs Net Expectancy with standard exchange fees:
     - Maker: $0.02\%$ ($2$ bps).
     - Taker: $0.05\%$ ($5$ bps).
     - Total round-trip friction model: $10$ bps ($0.10\%$) per trade.
5. **Temporal Consistency Ratios**:
   - $IC_{\text{ratio}} = \frac{IC_{\text{OOS}}}{IC_{\text{IS}}}$.
   - $\text{Sharpe}_{\text{ratio}} = \frac{\text{Sharpe}_{\text{OOS}}}{\text{Sharpe}_{\text{IS}}}$.

---

## 5. Formal Pre-Registered Gate Decision Rules

| Gate Decision | Mandatory Mathematical Conditions |
|---|---|
| **PASS** | 1. $IC_{\text{OOS}} > 0$ with two-tailed $p < 0.05$ (statistically significant positive predictive correlation).<br>2. Net Expectancy on OOS $> 0$ (profitable after 10 bps friction).<br>3. Continuous Strategy Sharpe on OOS $> 0$.<br>4. $IC_{\text{ratio}} \ge 0.30$ (OOS retains at least $30\%$ of IS predictive capacity, ruling out catastrophic temporal decay). |
| **FAIL** | $IC_{\text{OOS}} \le 0$ OR Net Expectancy on OOS $\le 0$ OR $p \ge 0.05$ (Edge Not Detected Out-of-Sample). |
| **INCONCLUSIVE** | Data corruption, unresolvable runtime exceptions, or indeterminate sample size ($N_{\text{trades}} < 30$). |
| **PROTOCOL INVALIDATED** | Parameter tuning, post-hoc threshold adjustment, or temporal leakage across the Chinese Wall. |

---

## 6. Execution Governance Constraint
- **Execution Status**: 🛑 **STRICTLY BLOCKED**
- The script `run_g2_oos.js` is pre-registered and frozen.
- **Execution is prohibited until explicit user authorization is granted.**
