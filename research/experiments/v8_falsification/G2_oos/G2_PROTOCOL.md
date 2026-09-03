# Gate G2 — Temporal Out-Of-Sample (OOS) Validation Protocol (v2)
**Document ID**: `G2_TEMPORAL_OOS_PROTOCOL_v2`  
**Target Engine**: `InstitutionalQuantSignalEngine` (V8, Frozen SHA-256: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`)  
**Campaign**: `LYZER_EDGE_V8_FREEZE_FALSIFICATION_OOS`  
**Governance Authority**: Senior Quantitative Architecture Review  
**Timestamp UTC**: `2026-09-03T01:55:00.000Z`  
**Execution State**: 🔒 **FROZEN PROTOCOL (v2) — EXECUTION STRICTLY BLOCKED**  

---

## 1. Scientific Objective
The objective of Gate G2 is to evaluate whether the frozen V8 Institutional Quant Signal Engine demonstrates genuine out-of-sample directional predictive edge across an unobserved temporal horizon, after controlling for temporal leakage, lookback overlap, residual serial dependence, and fixed exogenous execution friction.

### Methodological Governance Rules
1. **Zero Parameter Tuning**: V8 code, thresholds, lookbacks, and weights remain 100% frozen.
2. **Strict Chinese Wall**: The Out-of-Sample (OOS) dataset is completely segregated from any prior optimization, calibration, or threshold selection.
3. **Fail-Closed Principle**: If out-of-sample performance fails to exhibit statistically significant positive edge ($IC_{\text{OOS}} \le 0$ or $t_{\text{HAC}} \le 0$ with $p \ge 0.05$), Gate G2 is definitively classified as **FAIL (EDGE NOT DETECTED)**.
4. **Execution Gate Ordering**: Protocol is frozen; execution requires explicit executive authorization.

---

## 2. Rigorous Temporal Segmentation & Chinese Wall Specification

The dataset `research/datasets/batch039/BTCUSDT_1h.json` (SHA-256: `d2ab2b02...`) contains exactly 32,136 hourly bars from `2023-01-01T00:00:00.000Z` to `2026-08-31T23:00:00.000Z`.

```text
2023-01-01 00:00Z                        2024-12-31 23:00Z    2025-01-05 04:00Z             2026-08-31 23:00Z
[======================== IN-SAMPLE ========================] [EMBARGO] [================ OUT-OF-SAMPLE ================]
           17,544 bars (24 civil months, leap year 2024)       100 bars                     14,492 bars (20 civil months)
```

### 2.1 In-Sample Period (Historical Reference Baseline)
- **Time Range**: `2023-01-01T00:00:00.000Z` → `2024-12-31T23:00:00.000Z`
- **Bar Indices**: `[0, 17543]` (17,544 hourly bars = 731 days, exactly 24 calendar months including 366 days of leap year 2024).
- **Function**: Establishes the historical baseline reference profile of the frozen V8 engine.

### 2.2 Temporal Purge & Embargo Buffer (Chinese Wall)
- **Time Range**: `2025-01-01T00:00:00.000Z` → `2025-01-05T03:00:00.000Z`
- **Bar Indices**: `[17544, 17643]` (100 hourly bars).
- **Isolation Function**: As V8 uses a 64-bar lookback and a 10-bar forward trade horizon ($64 + 10 = 74$ bars), a 100-bar embargo guarantees that no trade initiated in the In-Sample period has forward return overlap with the OOS period, and no lookback feature in the OOS period incorporates In-Sample candles.

### 2.3 Out-Of-Sample Period (Blind Temporal Validation)
- **Time Range**: `2025-01-05T04:00:00.000Z` → `2026-08-31T23:00:00.000Z`
- **Bar Indices**: `[17644, 32135]` (14,492 hourly bars, exactly 20 calendar months).
- **Execution Contamination Controls**: At every timestep $t \ge 17644$, the engine consumes strictly past bars `candles.slice(t - 64, t)`. No subsequent candle $t + k$ is accessible to the engine.

---

## 3. Methodological Revisions from Audit Feedback

### 3.1 Inference Under Temporal Dependence (HAC Newey-West)
- **Correction**: We formally retract any claim of "asymptotic independence" derived purely from non-overlapping forward horizons ($H = 10$). Because consecutive evaluations share up to 54 bars of the 64-bar lookback window, and underlying financial regimes exhibit persistence, observations remain potentially correlated.
- **Implementation**: All hypothesis tests on mean trade returns and Information Coefficients use **Newey-West HAC (Heteroskedasticity and Autocorrelation Consistent)** covariance estimation:
  $$SE_{\text{HAC}}(\bar{y}) = \sqrt{\frac{1}{N}\left(\hat{\gamma}_0 + 2\sum_{l=1}^L \left(1 - \frac{l}{L+1}\right)\hat{\gamma}_l\right)}$$
  With fixed pre-registered lag truncation $L = 5$ lags.
  $$t_{\text{HAC}} = \frac{\bar{y}}{SE_{\text{HAC}}(\bar{y})}, \quad p_{\text{HAC}} = 2(1 - \Phi(|t_{\text{HAC}}|))$$

### 3.2 Fixed Exogenous Execution Friction (10 bps)
- **Operational Definition**: Trading friction is modeled as a **strictly fixed exogenous cost of 10 bps (0.10% = 0.0010) applied once per round-trip trade** (5 bps deducted on entry, 5 bps deducted on exit), regardless of whether orders are simulated as maker or taker, and independent of trade outcome.
- Zero discretion or post-hoc adjustment of fee tiers is permitted.

### 3.3 Complete Continuous Timeline
- In addition to trade-level statistics, the strategy is evaluated continuously across all 14,492 hours of the OOS period, with zero return during flat/abstention periods, properly reflecting real portfolio exposure, cash drag, and continuous maximum drawdown.

---

## 4. Pre-Registered Performance Metrics

For both In-Sample (IS) and Out-Of-Sample (OOS):

1. **Trade Execution Statistics**:
   - Total Observation Bars ($N$).
   - Total Trades Emitted ($N_{\text{trades}}$), Long Trades ($N_{\text{long}}$), Short Trades ($N_{\text{short}}$).
   - Abstention Count ($N_{\text{flat}}$).
   - Market Exposure Ratio: $\frac{N_{\text{trades}}}{N}$.
2. **Information Coefficient (Predictive Accuracy)**:
   - Pearson $IC = \text{Corr}(dir_t, R_{t, t+H})$.
   - Fisher $Z$ $95\%$ Confidence Interval: $[CI_{\text{low}}, CI_{\text{high}}]$.
   - HAC-adjusted $t$-statistic and two-tailed $p$-value.
3. **Economic Performance Metrics**:
   - Hit Rate ($HR = \frac{\sum \mathbf{1}_{y_{\text{net}} > 0}}{N_{\text{trades}}}$).
   - Gross Mean Return per Trade ($E[y_{\text{gross}}]$).
   - Net Mean Return per Trade ($E[y_{\text{net}}] = E[y_{\text{gross}}] - 0.0010$).
   - Net Expectancy in basis points ($E[y_{\text{net}}] \times 10,000$).
   - Unannualized Pooled Trade Sharpe: $\frac{\bar{y}_{\text{net}}}{\sigma_{y_{\text{net}}}}$.
   - Newey-West $t$-stat of net trade return: $t_{\text{HAC}}$.
   - Annualized Strategy Sharpe (Continuous Timeline): $\frac{\bar{R}_{\text{hourly}}}{\sigma_{\text{hourly}}} \times \sqrt{8760}$.
   - Maximum Drawdown ($MDD$) on continuous equity curve.
   - Profit Factor ($PF = \frac{\sum \text{Net Wins}}{\sum |\text{Net Losses}|}$).
4. **Temporal Retention Consistency**:
   - $IC_{\text{ratio}} = \frac{IC_{\text{OOS}}}{IC_{\text{IS}}}$.
   - $\text{Sharpe}_{\text{ratio}} = \frac{\text{Sharpe}_{\text{OOS}}}{\text{Sharpe}_{\text{IS}}}$.

---

## 5. Formal Pre-Registered Gate Decision Rules

| Gate Decision | Mandatory Mathematical Conditions |
|---|---|
| **PASS** | 1. $IC_{\text{OOS}} > 0$ with HAC-adjusted $p < 0.05$ (statistically significant positive predictive correlation).<br>2. Net Expectancy on OOS $> 0$ (profitable net of 10 bps fixed friction).<br>3. Continuous Strategy Sharpe on OOS $> 0$.<br>4. $IC_{\text{ratio}} \ge 0.30$ (retains at least $30\%$ of in-sample predictive capacity, ruling out catastrophic temporal degradation). |
| **FAIL** | $IC_{\text{OOS}} \le 0$ OR Net Expectancy on OOS $\le 0$ OR HAC $p \ge 0.05$ (Edge Not Detected Out-of-Sample). |
| **INCONCLUSIVE** | Data corruption, runtime failure, or insufficient trade count ($N_{\text{trades}} < 30$). |
| **PROTOCOL INVALIDATED** | Parameter modification to V8, threshold adjustment, or temporal leakage across the Chinese Wall. |

---

## 6. Execution Governance Constraint
- **Execution Status**: 🛑 **STRICTLY BLOCKED**
- The script `run_g2_oos.js` is pre-registered and frozen under `G2_TEMPORAL_OOS_PROTOCOL_v2`.
- **Execution will occur only after explicit executive authorization.**
