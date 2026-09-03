# Gate G1 — Synthetic Null Falsification Protocol
**Document ID**: `G1_SYNTHETIC_NULL_PROTOCOL_v1`  
**Target Engine**: `InstitutionalQuantSignalEngine` (V8, frozen SHA-256: `fc19e807...`)  
**Campaign**: `LYZER_EDGE_V8_FREEZE_FALSIFICATION_OOS`  
**Execution Timestamp UTC**: `2026-09-03T00:52:00.000Z`  

---

## 1. Scientific Objective
The definitive question of Gate G1 is:
> **Does the V8 Institutional Quant Signal Engine manufacture spurious evidence of directional predictive edge when the underlying data-generating process contains zero economic predictability?**

In accordance with quantitative falsification principles, our objective is **not** to show that V8 generates high returns. Our objective is to attempt to **falsify** V8 by showing that it generates statistically significant edge on pure noise processes where no edge can possibly exist.

### Methodological Rule of Null Interpretation (Fail-Closed)
- Under a synthetic null process with zero true edge, the desirable and correct behavior is that **the null hypothesis cannot be rejected**.
- If V8 systematically produces "statistically significant" outperformance, high Information Coefficients, or elevated hit rates on noise, this constitutes a **False Positive Failure (Spurious Edge Manufacturing)**.
- **Pass Criterion**: Empirical False Positive Rate (FPR) $\le \alpha_{target} = 5\%$ across all null families, and performance statistically indistinguishable from a Random Direction Baseline ($V8 - \text{Random} \approx 0$).

---

## 2. Six Mandatory Null Generator Families
Each family generates independent sample paths of length $T = 200$ bars with valid, positive OHLCV candle structures.

1. **N1 — Gaussian IID**: Continuous returns $r_t \sim \mathcal{N}(0, \sigma^2)$, $\mu = 0$. Pure uncorrelated noise.
2. **N2 — Student-$t$ IID**: Heavy-tailed independent returns with degrees of freedom $\nu \in \{3, 5, 8\}$. Models non-Gaussian financial tails without directional drift.
3. **N3 — Random Walk / Geometric Brownian Motion**: Integrated price process $P_t = P_0 \exp(\sum_{i=1}^t r_i)$ with $r_i \sim \mathcal{N}(0, \sigma^2)$. Tests if non-stationarity creates spurious trend/mean-reversion signals.
4. **N4 — Temporal Shuffle**: Empirical returns from pre-registered `BTCUSDT_1h.json` randomly permuted via Fisher-Yates. Preserves marginal distribution, skewness, and kurtosis while destroying all temporal autocorrelation.
5. **N5 — Block Bootstrap / Block Shuffle**: Empirical returns shuffled in coherent blocks ($B \in \{5, 10, 20\}$ bars). Preserves local microstructural autocorrelation while eliminating macro predictability.
6. **N6 — Volatility-Only GARCH(1,1)**: Heteroskedastic process with conditional volatility clustering ($\sigma_t^2 = \omega + \alpha r_{t-1}^2 + \beta \sigma_{t-1}^2$) and zero conditional mean ($E[r_t \mid \mathcal{F}_{t-1}] = 0$). Tests if V8 confuses volatility predictability with directional predictability.

---

## 3. Scale and Deterministic Reproducibility
- **Replications**: Exactly 1,000 independent sample paths per family ($6 \times 1,000 = 6,000$ total paths).
- **PRNG**: Mulberry32 32-bit deterministic generator with explicit pre-registered seeds.
- **Evaluation**: For each path of $T = 200$ bars, the engine is evaluated across rolling observation points $t \in [100, 180]$ with lookback of 64 bars.
- **Forward Horizon**: $H = 10$ bars (matching V8's native momentum/trend projection horizon).

---

## 4. Metrics Recorded per Replication
- Total signals emitted ($N_{signals}$, $N_{long}$, $N_{short}$, $N_{flat}$).
- Abstention / Veto Rate ($1 - N_{signals} / N_{eval}$).
- Information Coefficient ($IC = \text{Corr}(s_t, R_{fwd, t})$).
- Hit Rate ($HR = \sum \mathbf{1}_{s_t \cdot R_{fwd, t} > 0} / N_{signals}$).
- Mean Forward Return and Realized Expectancy.
- Student's $t$-statistic on directional trade returns and two-tailed $p$-value.
- Directional Performance vs `RANDOM_DIRECTION_BASELINE` ($P(long) = 0.5, P(short) = 0.5$).

---

## 5. Pre-Defined False Positive Decision Threshold
A replication is classified as an **Apparent Edge Detection (False Positive)** if:
$$N_{signals} \ge 3 \quad \text{AND} \quad (t \ge 1.96 \text{ or } p \le 0.05) \quad \text{AND} \quad IC > 0$$

- **Target Family-Wise FPR**: $\le 5.0\%$.
- **Acceptance Bound (Binomial 95% Confidence Upper Limit for $N=1000$, $p=0.05$)**: $\le 6.5\%$.
- If FPR $> 6.5\%$ in any null family, Gate G1 is marked as **FAIL (REJECT - SPURIOUS EDGE DETECTED)**.
- If FPR $\le 6.5\%$ across all null families and median IC $\approx 0$, Gate G1 is marked as **PASS**.
