# W10 Null Controls — Forensic Reconstruction & Empirical Distributions
**Audit ID**: `AD001_CANDIDATE_AUDIT_001`  
**Timestamp UTC**: `2026-09-03T03:17:01.520Z`  
**Test Signal**: `BTCUSDT Cumulative OFI (L=6h, H=24h)`  
**Observed Pearson IC**: **+0.0415** ($N=1338$ non-overlapping evaluations)  
**PRNG**: Mulberry32 (Deterministic Seed = `424242`)  
**Replications per Null Family**: **1.000**  

---

## 1. Formal Specification of Null Hypotheses

| Null Experiment | Exact Null Hypothesis ($H_0$) | Permutation Mechanism / Unit | What Structure is Destroyed? | What Structure is Preserved? |
|---|---|---|---|---|
| **Temporal Shuffle** | The observed IC arises from chance alignment of stationary marginal distributions. | Shuffles individual observation indices $i \in \{1 \dots N\}$. | All serial autocorrelation and cross-correlation. | Marginal distribution and sample variance of $X$ and $Y$. |
| **Sign Permutation** | The directional relationship has zero asymmetric predictive power ($E[X \cdot Y] = 0$). | Multiplies $X_i$ by Rademacher variable $\epsilon_i \in \{-1, +1\}$ with $P(\epsilon_i=1)=0.5$. | Mean directional vector and conditional asymmetry. | Amplitude, dispersion, and temporal clustering of magnitudes $|X_i|$. |
| **Block Shuffle ($B=10$)** | The observed IC is an artifact of persistent auto-regressive momentum waves. | Shuffles contiguous blocks of 10 trades ($240h$ of consecutive market history). | Long-term cross-correlation between flow and forward returns. | Short-term serial autocorrelation, volatility clustering, and regime persistence within blocks. |

---

## 2. Empirical Null Distribution Statistics vs Observed Realization

| Metric | Real Observed Value | Null 1: Temporal Shuffle | Null 2: Sign Permutation | Null 3: Block Shuffle (B=10) |
|---|:---:|:---:|:---:|:---:|
| **Mean under Null** | — | +0.0006 | +0.0003 | +0.0010 |
| **Std Dev under Null** | — | 0.0285 | 0.0263 | 0.0273 |
| **P1 (1st Percentile)** | — | -0.0715 | -0.0630 | -0.0648 |
| **P5 (5th Percentile)** | — | -0.0465 | -0.0424 | -0.0448 |
| **P50 (Median)** | — | 0.0006 | 0.0004 | 0.0017 |
| **P95 (95th Percentile)** | — | 0.0483 | 0.0440 | 0.0465 |
| **P99 (99th Percentile)** | — | 0.0682 | 0.0635 | 0.0626 |
| **Observed Real IC** | **+0.0415** | **+0.0415** | **+0.0415** | **+0.0415** |
| **Permutations exceeding Real** | — | 151 / 1000 | 113 / 1000 | 122 / 1000 |
| **Empirical Two-Tailed $p$-value** | — | **$p = 0.1518$** | **$p = 0.1139$** | **$p = 0.1229$** |
| **Statistical Verdict** | — | **DOES NOT REJECT at 5% ($p \approx 0.15$)** | **DOES NOT REJECT at 5% ($p \approx 0.11$)** | **DOES NOT REJECT at 5% ($p \approx 0.12$)** |

---

## 3. Epistemic Audit of the Null Result (The Crucial Forensic Discovery)

The user raised the crucial question:
> *"Porque p_null < 0,01 pode significar duas coisas: Cenário A (efeito observado é maior que a distribuição nula) ou Cenário B (interpretação errada do teste)... Eu não aceitaria essa frase sem abrir o artefato W10."*

### Forensic Audit Findings:
1. **The Nominal $t$-stat ($t=2.46, p=0.014$) was an Asymptotic Normal Approximation**:
   - In the directional trade sub-sample ($N=290$ filtered trades where $|feat| > 0.05$), the Newey-West HAC $t$-stat was $+2.46$ ($p=0.014$).
   - However, when evaluating the **continuous Pearson correlation over all non-overlapping 24h bars ($N=1,338$)**, the standard deviation under the null is $\sigma_{\text{null}} \approx 1/\sqrt{1338} \approx 0.027$.
   - An observed correlation of $IC = +0.0415$ corresponds to an empirical $Z$-score of:
     $$Z = \frac{+0.0415}{0.0273} \approx 1.52$$
   - In 1,000 permutations, exactly **122 to 151 permutations** produced $|IC_{\text{null}}| \ge 0.0415$.
   - Therefore, the true empirical two-tailed permutation $p$-value is **$p_{\text{empirical}} \approx 0.12 - 0.15$**, NOT $p < 0.01$!

2. **Why This Confirmation is Vital**:
   - This directly explains why the candidate had a global FDR $q$-value of $0.6459$.
   - A correlation of $+0.0415$ on a sample of 1,338 daily bars has a ~12% probability of occurring by pure chance under random permutations.
   - This completely justifies why the Senior CTO / Executive Governance must **REFUSE direct promotion or premature pre-registration**.
   - Cumulative OFI is a **promising exploratory signal** with positive directional consistency across multiple assets, but its statistical significance on the historical sample is modest ($p \approx 0.014$ parametric on trades, $p \approx 0.12$ non-parametric permutation on continuous bars).

