# Ghost Alpha Taxonomy (GAIP)

**Program:** Release 1.8.6-A: Ghost Alpha Investigation Program (GAIP)
**Entity:** Lyzer Labs
**Domain:** Quantitative Intelligence & Strategy Validation

## 1. Introduction

Ghost Alpha refers to a specific class of quantitative strategies or signals that exhibit historical or present theoretical profitability but lack underlying causal validity. It is "dead" alpha that continues to appear profitable strictly due to statistical inertia, observer bias, or hidden structural decay. The objective of the Ghost Alpha Investigation Program (GAIP) is to identify and eradicate Ghost Alpha from live trading systems before financial realization.

## 2. Taxonomy of Ghost Alpha

### 2.1 Structural Ghost Alpha
Structural Ghost Alpha occurs when the underlying market microstructure or regulatory framework that originally generated the alpha has permanently changed, but the statistical signature of the alpha decays slowly.
* **Mechanism:** Decay of market inefficiency, shift in exchange matching engines, or altered fee structures.
* **Detection:** High correlation with legacy structural parameters; decaying Sharpe ratio over long horizons; failure in simulated forward-tests under modern microstructure assumptions.

### 2.2 Temporal Ghost Alpha
Temporal Ghost Alpha is the illusion of edge derived from time-bound anomalies that have expired but whose historical weight continues to influence long-horizon models.
* **Mechanism:** Data leakage, look-ahead bias in historical datasets, or reliance on asynchronous data feeds that only existed during a specific epoch.
* **Detection:** Outsized performance concentrated in specific historical windows; failure to generalize in strictly out-of-sample temporal cross-validation.

### 2.3 Regime Ghost Alpha
Regime Ghost Alpha emerges when a strategy is perfectly overfit to a specific macro-economic or volatility regime that is currently inactive or structurally unlikely to return.
* **Mechanism:** Prolonged periods of quantitative easing (QE), zero interest rate policies (ZIRP), or sustained low volatility that train models to expect mean-reversion in non-stationary environments.
* **Detection:** Hidden dependencies on continuous macroeconomic variables; regime-switching model diagnostics highlighting binary regime dependence.

### 2.4 Synthetic Ghost Alpha
Synthetic Ghost Alpha is entirely an artifact of the research and simulation process itself, possessing zero true market causality.
* **Mechanism:** Multiple testing bias, p-hacking, implicit transaction cost underestimation, or flawed backtest engine assumptions (e.g., infinite liquidity at the midpoint).
* **Detection:** Fails transaction cost sensitivity analysis; extreme degradation when execution friction is modeled stochastically.

### 2.5 Observer Ghost Alpha
Observer Ghost Alpha occurs when the alpha exists only because the observer (the quantitative system or researcher) is interacting with the data in a biased manner, often through endogenous impact or delayed observer effect.
* **Mechanism:** The strategy's own historical capacity constraints were not reached, but future deployment will immediately collapse the edge; or the researcher is selectively observing favorable slices of the distribution.
* **Detection:** Capacity constraint modeling; out-of-sample degradation under simulated slippage and market impact constraints.

## 3. Formal Ontology for Dead Causalities

To systematically isolate Ghost Alpha, Lyzer Labs defines the formal ontology of dead causalities:

1. **Entity State $\Psi$**: The true state of the market environment.
2. **Signal Component $S_t$**: The observed quantitative signal at time $t$.
3. **Causal Link $C(\Psi, S)$**: The fundamental economic rationale connecting the environment to the signal.

**Definition of Dead Causality ($C_{dead}$):**
A causality is considered "dead" when $C(\Psi, S)$ was valid in historical set $H$, but is demonstrably broken or absent in current set $T$, yet the realized return function $R(S_t)$ continues to exhibit positive expected value strictly due to non-causal inertia or noise $\epsilon$.

$$ E[R(S_t) | C_{dead}] > 0 \text{ but } \Delta C(\Psi, S) \to 0 $$

### 3.1 Axioms of Dead Causality
* **Axiom of Inertia:** Historical success does not validate current causality.
* **Axiom of Structural Decay:** All pure arbitrage eventually decays; surviving alpha must be compensated risk or latency-bound.
* **Axiom of Simulation Illusion:** A backtest can only prove the absence of alpha, never its presence.

## 4. Conclusion

The eradication of Ghost Alpha is a critical operational mandate. Deployment of capital into Ghost Alpha constitutes an uncompensated risk against the structural integrity of the Lyzer Labs portfolio. All systems must continuously monitor for these taxonomical signatures.
