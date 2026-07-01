# Evidence Relevance Decay (ERD) Specification

**Project:** Ghost Alpha Investigation Program (GAIP)
**Release:** 1.8.6-A
**Domain:** Quantitative Intelligence & Epistemic Modeling

---

## 1. Executive Summary

In temporal data processing and alpha generation, systems frequently conflate **freshness** with **relevance**. This architectural specification formally defines the distinction between the two. The core axiom is: **Freshness ≠ Relevance**. 

A highly recent data point might be ephemeral noise with zero predictive power, whereas an ancient structural anomaly might persist as a foundational driver of market behavior. This document establishes the mathematical framework to decouple and isolate structural relevance decay from mere chronological freshness decay.

---

## 2. The Freshness vs. Relevance Fallacy

### 2.1. Defining Freshness
Freshness ($F$) is a strictly chronological metric. It measures the temporal distance between the moment of observation ($t_{obs}$) and the current moment ($t_{now}$). It is independent of the underlying system's state.

$$ F(\Delta t) = f(t_{now} - t_{obs}) $$

### 2.2. Defining Relevance
Relevance ($R$) is a structural metric. It measures the ongoing predictive power or structural validity of an observation within the current systemic regime. Relevance is governed by structural stability and regime continuity, not merely time.

### 2.3. The Fallacy
Standard time-series models often apply a uniform exponential decay (e.g., EMA) across all data, assuming $R \propto F$. This leads to:
1. **Recency Bias:** Overweighting recent noise (high $F$, low $R$).
2. **Structural Amnesia:** Discarding foundational historical truths (low $F$, high $R$).

---

## 3. Mathematical Logic: Isolating Relevance Decay

To build resilient epistemological models in GAIP, we must isolate Relevance Decay ($D_R$) from Freshness Decay ($D_F$).

### 3.1. Structural Half-Life ($H_s$)
Instead of a temporal half-life, every piece of evidence $E_i$ is assigned a structural half-life $H_s(E_i)$. This represents the expected duration the underlying causal mechanism remains valid.

### 3.2. Evidence Decay Function
Let $E_i$ be an evidence vector.
Let $\Delta t$ be the elapsed time.
Let $\nu$ be the ambient volatility or rate of regime shift (the "speed of state change").

We define the isolated Relevance Decay factor as:

$$ D_R(\Delta t, \nu, H_s) = \exp \left( - \frac{\int_{t_{obs}}^{t_{now}} \nu(\tau) d\tau}{H_s} \right) $$

**Key properties of $D_R$:**
1. If $\nu$ (structural shifting) is near zero, $D_R \approx 1$, meaning ancient evidence retains full relevance regardless of chronological age.
2. If the market undergoes a violent regime shift ($\int \nu(\tau) d\tau$ is large), even evidence from yesterday (high freshness) decays instantly to zero.

### 3.3. The Disentanglement Equation
Total Utility ($U$) of a piece of evidence is a function of both Freshness (for latency-sensitive tactical models) and Relevance (for structural models). 

$$ U(E_i) = \alpha \cdot D_F(\Delta t) + (1 - \alpha) \cdot D_R(\Delta t, \nu, H_s) $$

Where $\alpha \in [0,1]$ is the tactical-to-structural alignment coefficient of the specific alpha model consuming the evidence.

---

## 4. Architectural Implications for GAIP

1. **Dual-Index Storage:** Evidence must be indexed both chronologically (for $D_F$ calculations) and structurally (by regime/state for $D_R$ calculations).
2. **Regime-Aware Invalidation:** The platform must trigger massive cache invalidation not when time passes, but when $\int \nu d\tau$ crosses a critical threshold (Regime Shift).
3. **Decoupled Pipelines:** Tactical execution pipelines will weigh $D_F$ heavily. Strategic simulation pipelines will ignore $D_F$ entirely and rely strictly on $D_R$.

## 5. Conclusion
By implementing the ERD specification, GAIP escapes the trap of chronocentrism. The system gains the capacity to hold "ancient structural truths" in memory indefinitely, while instantly discarding "recent ephemeral noise," thereby radically improving signal-to-noise ratios in quantitative simulations.
