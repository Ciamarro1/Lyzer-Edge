# Gate G1-R1 — Synthetic Null Revalidation Protocol
**Document ID**: `G1_R1_REVALIDATION_PROTOCOL_v1`  
**Target Engine**: `InstitutionalQuantSignalEngine` (V8, Frozen SHA-256: `fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1`)  
**Campaign**: `LYZER_EDGE_V8_FREEZE_FALSIFICATION_OOS`  
**Governance Authority**: Senior Quantitative Architecture Review  
**Timestamp UTC**: `2026-09-03T01:29:00.000Z`  
**Operational Status**: 🔒 **FROZEN PROTOCOL — EXECUTION AWAITING EXPLICIT AUTHORIZATION**  

---

## 1. Context & Historical Continuity
- **Original Gate G1 Execution (`commit b5fb950`)**:
  - Successfully demonstrated that V8 does not manufacture false-positive directional predictions under pure noise (Primary FPR = $0.05\%$, 3/6,000 replications).
  - Preserved immutably in `research/experiments/v8_falsification/G1_synthetic_null/`.
- **Audit Findings (`commit f16513b`)**:
  - Uncovered a secondary presentation metric defect: per-path Sharpe was calculated on micro-samples ($N=3$ trades) with an aggressive annualization multiplier ($\times 29.60$) and conditioning on $N \ge 3$, which discarded ~96.5% of the paths.
  - "95% IC" was mislabeled (representing the 95th empirical percentile of 28 micro-correlations rather than a confidence interval).
  - Reclassified formally as: `INCONCLUSIVE — METRIC IMPLEMENTATION DEFECT`.
- **G1-R1 Mandate**:
  - G1-R1 executes the **exact same physical falsification experiment**, but with mathematically sound, unbiased metrics defined and pre-registered **prior to execution**.
  - **Zero modification to V8**: The engine code, parameters, thresholds, and seeds remain 100% identical and frozen.

---

## 2. Mathematical Metric Reformulation for G1-R1

### Pillar A: Complete Universe Accounting (Zero Survivor Bias)
1. Every single generated path ($1,000$ per family, $6,000$ total) participates in the analysis.
2. Every single observation point ($17$ per path, $17,000$ per family, $102,000$ total) is included in the continuous portfolio timeline.
3. When the engine is flat, abstaining, or vetoed ($\text{signal}_t = 0$), the realized continuous strategy return is explicitly zero ($R_{t}^{\text{strat}} = 0$).
4. No replication is discarded from portfolio metrics regardless of signal count.

### Pillar B: Dual Institutional Sharpe Framework
Micro-sample annualized Sharpe per replication is **strictly prohibited**. Instead, two institutional Sharpe estimators are defined:

1. **Pooled Trade Sharpe (Execution Performance of Emitted Trades)**:
   $$\text{Sharpe}_{\text{trade}} = \frac{\bar{y}_{\text{pooled}}}{\sigma_{y_{\text{pooled}}}}$$
   Where $y_k = \text{dir}_k \times R_{k, \text{fwd}}$ across **all $N_{\text{trades}}$ emitted by the family** ($N \approx 400 - 550$ trades).
   Unannualized, directly measuring per-trade expectancy against trade-level volatility.
   Hypothesis test: $t_{\text{pooled}} = \text{Sharpe}_{\text{trade}} \times \sqrt{N_{\text{trades}}}$, $p = 2(1 - \Phi(|t|))$.

2. **Continuous Strategy Sharpe (Total Portfolio Performance across Full Timeline)**:
   $$\text{Sharpe}_{\text{continuous}} = \frac{\bar{R}_{\text{timeline}}}{\sigma_{R_{\text{timeline}}}}$$
   Computed across all $17,000$ observation intervals per family, incorporating cash/abstention drag.

### Pillar C: Rigorous Pooled Information Coefficient (IC)
The Information Coefficient is calculated on the pooled sample of all trade decisions across the family:
$$IC_{\text{pooled}} = \frac{\sum_{k=1}^{N} (dir_k - \overline{dir})(R_{fwd, k} - \overline{R_{fwd}})}{\sqrt{\sum (dir_k - \overline{dir})^2 \sum (R_{fwd, k} - \overline{R_{fwd}})^2}}$$
- Fisher $Z$-transformation for confidence intervals:
  $$z = \frac{1}{2}\ln\left(\frac{1 + IC}{1 - IC}\right), \quad SE = \frac{1}{\sqrt{N - 3}}$$
- $95\%$ Confidence Interval:
  $$CI_{95\%} = \tanh\left(z \pm 1.96 \cdot SE\right)$$
- $t$-statistic: $t_{IC} = \frac{IC \sqrt{N - 2}}{\sqrt{1 - IC^2}}$, with two-tailed $p$-value.

### Pillar D: Paired Statistical Test vs Random Direction Baseline
For each emitted signal, a simultaneous coin toss $s_{\text{rand}} \in \{-1, +1\}$ ($P = 0.5$) is evaluated on the exact same forward return.
We test:
$$H_0: \mu_{\Delta} = E[y_{V8} - y_{\text{random}}] = 0$$
Using paired Student's $t$-test across all trades:
$$t_{\text{paired}} = \frac{\bar{\Delta}}{SE(\bar{\Delta})}, \quad p_{\text{paired}} = 2(1 - \Phi(|t|))$$

### Pillar E: Pre-Defined False Positive Rate (FPR) Criterion
A replication $i$ is flagged as an **Individual False Positive** if and only if:
1. $N_{\text{signals}} \ge 5$ (ensuring statistical sample adequacy per path).
2. Two-tailed $p$-value of trade returns $\le 0.05$ (nominal significance).
3. Directional return is positive ($\bar{y} > 0$) and $IC > 0$.

- **Acceptance Threshold**:
  $$\text{FPR} = \frac{\text{Edge Detections}}{1000} \le 5.0\% \quad (\text{Upper Binomial 95\% Bound} \le 6.5\%)$$

---

## 3. Mandatory Six Null Generator Families
The six generator modules developed in G1 are reused with identical deterministic seeds:
- `N1_GAUSSIAN_IID`: Seeds $10,000 \dots 10,999$ ($1,000$ paths).
- `N2_STUDENT_T_IID`: Seeds $20,000 \dots 20,999$ ($1,000$ paths, $\nu \in \{3, 5, 8\}$).
- `N3_RANDOM_WALK`: Seeds $30,000 \dots 30,999$ ($1,000$ paths).
- `N4_TEMPORAL_SHUFFLE`: Seeds $40,000 \dots 40,999$ ($1,000$ paths, empirical BTC returns).
- `N5_BLOCK_SHUFFLE`: Seeds $50,000 \dots 50,999$ ($1,000$ paths, blocks $B \in \{5, 10, 20\}$).
- `N6_VOLATILITY_NULL`: Seeds $60,000 \dots 60,999$ ($1,000$ paths, GARCH(1,1)).

---

## 4. Formal Decision Rules for G1-R1

| Decision | Condition |
|---|---|
| **PASS** | 1. $\text{FPR} \le 6.5\%$ for all 6 families.<br>2. Pooled $t$-stat $< 1.96$ ($p > 0.05$) for all 6 families (cannot reject the null of zero edge).<br>3. Pooled $IC$ $95\%$ CI covers zero for all 6 families ($p > 0.05$).<br>4. Paired test vs Random Baseline yields $p > 0.05$ (no statistical difference from coin flip). |
| **FAIL** | Any null family exhibits statistically significant outperformance: $\text{FPR} > 6.5\%$ OR pooled $t$-stat $\ge 1.96$ ($p \le 0.05$) with positive return. |
| **INCONCLUSIVE** | Computational failure, non-deterministic execution, or missing data. |
| **PROTOCOL INVALIDATED** | Code modification to V8, seed contamination, or post-hoc threshold adjustment. |

---

## 5. Governance Constraint
- **Execution State**: **BLOCKED**
- Execution of script `run_g1_r1.js` will take place **only after explicit authorization** from the user.
- **Gate G2 remains strictly BLOCKED**.
