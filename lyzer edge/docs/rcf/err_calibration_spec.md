# Edge Retention Ratio (ERR) Calibration Specification

**Context:** Release 1.8.5 Reality Challenge Framework (RCF)
**Authority:** Lyzer Labs Anti-Fragility Lab
**Classification:** STRICT ENFORCEMENT

---

## 1. Executive Intent

This specification establishes the absolute baseline for the **Edge Retention Ratio (ERR)**. The primary objective is to immunize the quantitative intelligence platform against **Validation Theater** and **Metric Drift**. ERR must never become the goal; it is strictly a measurement of enduring structural advantage. 

Any optimization process that treats ERR as a maximization target rather than an observational metric is fundamentally compromised and must be rejected.

## 2. ERR Definition

The **Edge Retention Ratio (ERR)** is the mathematical quantification of alpha decay resistance within a deployed quantitative strategy or intelligence model. It measures the proportion of theoretical predictive edge that survives transition from idealized backtesting environments into hostile, frictionless, and adaptive production environments.

*   **Axiom:** An ERR of 1.0 is a statistical anomaly and an indicator of overfitting.
*   **Axiom:** An ERR of 0.0 indicates a complete collapse of predictive utility and immediate system invalidation.

ERR is not a performance metric; it is an *epistemic survival* metric.

## 3. ERR Measurement

ERR must be measured as the ratio of realized out-of-sample (OOS) performance against the predicted in-sample (IS) performance, normalized by environmental friction (e.g., transaction costs, latency, market impact).

**Formal Measurement Protocol:**
1.  **Baseline Extraction:** Define the theoretical performance baseline over a statistically significant IS period.
2.  **Friction Application:** Apply verified, pessimistic friction models to the baseline.
3.  **Realized Observation:** Observe continuous OOS execution metrics without manual intervention.
4.  **Ratio Calculation:** $\text{ERR} = \frac{\text{Realized OOS Alpha}}{\text{Predicted IS Alpha (Friction-Adjusted)}}$

Measurement must be automated, continuous, and completely decoupled from the strategy development lifecycle to prevent bias.

## 4. ERR Time Horizon

ERR is a time-dependent decay function. Measurement without a defined time horizon is meaningless.

*   **Micro-Horizon (T+1 to T+30):** Evaluates immediate shock resilience. High volatility is expected.
*   **Meso-Horizon (T+30 to T+90):** Evaluates core structural decay. This is the primary evaluation window for standard systemic edge.
*   **Macro-Horizon (T+90+):** Evaluates regime-shift resilience.

Calibration requires evaluating ERR at multiple standardized intervals to plot the decay curve. A strategy with a high initial ERR that collapses immediately post-Meso-Horizon is considered fragile and must be deprecated.

## 5. ERR Acceptance Window

To enforce systemic discipline, RCF establishes strict acceptance boundaries for ERR.

*   **Rejection Threshold (Lower Bound):** $\text{ERR} < 0.40$
    *   *Action:* Immediate quarantine. The strategy's theoretical foundation is invalid in reality.
*   **Suspicion Threshold (Upper Bound):** $\text{ERR} > 0.95$
    *   *Action:* Mandatory investigation for look-ahead bias, friction underestimation, or data leakage.
*   **Acceptable Operating Window:** $0.40 \le \text{ERR} \le 0.85$
    *   *Action:* Continued deployment. Strategy exhibits expected decay but maintains structural utility.

The acceptance window must never be relaxed to accommodate underperforming models. Reality does not negotiate.
