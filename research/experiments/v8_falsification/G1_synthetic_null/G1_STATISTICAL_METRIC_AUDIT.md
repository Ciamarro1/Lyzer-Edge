# Gate G1 — Statistical Metric Forensic Audit Report
**Document ID**: `G1_STATISTICAL_METRIC_AUDIT_v1`  
**Campaign**: `LYZER_EDGE_V8_FREEZE_FALSIFICATION_OOS`  
**Audit Authorization**: Lyzer Edge Executive Architecture Review  
**Timestamp UTC**: `2026-09-03T01:06:02.826Z`  
**Engine Under Audit**: `InstitutionalQuantSignalEngine` (V8, SHA-256: `fc19e807...`)  

---

## 1. Executive Summary & Diagnostic Verdict
This forensic audit was commissioned to investigate an apparent statistical paradox in Gate G1:
While the primary False Positive Rate (FPR) was exceptionally low (**0.05%**, 3 edge detections out of 6,000 replications), secondary performance metrics reported anomalous median Sharpe ratios (e.g., **8.16** in GARCH Null, **4.30** in Random Walk) and high 95th-percentile ICs (e.g., **0.8435** in Student-$t$).

### Root Cause Diagnostics
1. **The High Median Sharpe is a Micro-Sample & Annualization Artifact**:
   - V8's Hurst filter correctly suppressed ~96.5% of random paths, emitting $\ge 3$ signals in **only 28 to 38 out of 1,000 replications** (2.8% to 3.8%).
   - The reported Sharpe was calculated **only on these 28 to 38 micro-samples of $N=3$ or $4$ trades**. The ~965 replications with zero trades were omitted from the array.
   - For a sample of $N=3$ trades, the degrees of freedom is $N-1 = 2$. When returns are small and close in magnitude, sample standard deviation is artificially tiny, creating extreme $\frac{\text{mean}}{\text{std}}$ ratios.
   - The script then multiplied this 3-trade ratio by an aggressive annualization multiplier: $\sqrt{\frac{24 \times 365}{10}} = \sqrt{876} \approx 29.597$.
   - This caused individual path Sharpes to oscillate wildly between **$-68.16$** and **$+184.51$** in GARCH! The median of those 38 volatile numbers landed at 8.16 purely by chance of small-sample dispersion (while in Block Shuffle the median of 33 paths was **$-2.96$**, and in Temporal Shuffle **$-0.78$**).
2. **True Pooled Sharpe across All Trades is Statistically Zero**:
   - When all 537 trades emitted across all 1,000 GARCH paths are pooled, the **True Pooled Trade Sharpe is $-0.0021$** ($t = -0.048, p = 0.9616$).
   - Across the full continuous 17,000-hour timeline, the **True Continuous Strategy Sharpe is $-0.0004$**.
   - Zero economic edge exists on the GARCH null.
3. **The "95% IC = 0.8435" is a Sample Size Degeneracy**:
   - "95% IC" was NOT a confidence interval; it was the 95th empirical percentile of an array of 28 correlation numbers.
   - The Pearson correlation of $N=3$ points where $x \in \{-1, +1\}$ is mathematically degenerate and takes values near $\pm 0.866$ to $\pm 1.00$.
   - The median IC was identically **0.0000**. The True Pooled IC across all 433 trades in Student-$t$ is **$-0.0138$** ($p = 0.77$).

---

## 2. Metric Reconciliation Table

| Null Family | Replications with $\ge 3$ Signals | Original Reported Med. Sharpe | True Pooled Trade Sharpe | True Continuous Strategy Sharpe | Pooled IC | Pooled $t$-Stat ($p$-val) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Gaussian IID** | 36 / 1,000 (3.6%) | 1.42 | **+0.0330** | **+0.0057** | +0.0240 | +0.74 ($p=0.46$) |
| **Student-t IID** | 28 / 1,000 (2.8%) | 3.29 | **-0.0138** | **-0.0022** | -0.0138 | -0.29 ($p=0.77$) |
| **Random Walk** | 36 / 1,000 (3.6%) | 4.30 | **+0.0178** | **+0.0030** | +0.0178 | +0.39 ($p=0.70$) |
| **Temporal Shuffle** | 28 / 1,000 (2.8%) | -0.78 | **-0.0925** | **-0.0149** | -0.0540 | -1.95 ($p=0.05$) |
| **Block Shuffle** | 33 / 1,000 (3.3%) | -2.96 | **-0.0563** | **-0.0101** | -0.0410 | -1.32 ($p=0.18$) |
| **GARCH Null** | 38 / 1,000 (3.8%) | 8.16 | **-0.0021** | **-0.0004** | -0.0010 | -0.05 ($p=0.96$) |

---

## 3. GARCH Null Generator Sanity Audit
A dedicated audit of 100,000 bars from the N6 GARCH generator confirmed:
- Mean Return: $+0.00012$ ($t = 1.41$, not significant at 5%).
- Lag-1 Autocorrelation of Returns: $-0.0064$ (strictly uncorrelated).
- Excess Kurtosis: $+0.64$ (conditional volatility clustering confirmed).
- The generator is mathematically sound, drift-free, and has strictly zero directional predictability.

---

## 4. Formal Classification Decision
Under Section 7 of the Executive Mandate:
- **Primary Falsification Criterion (FPR & Edge Detections)**: Intact and validated (FPR = 0.05%).
- **Secondary Presentation Metrics**: Suffered from a mathematical implementation defect (micro-sample annualization and survivor-biased filtering of Sharpe/IC).
- **Formal Status**: In strict adherence to the executive instruction:
  `INCONCLUSIVE — METRIC IMPLEMENTATION DEFECT`
  G1 remains provisionally halted and **Gate G2 remains strictly BLOCKED**.
