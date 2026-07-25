# Patient Zero Selection Index (PZI) Specification

## 1. Overview
This document defines the **Patient Zero Selection Index (PZI)** for Release MRCP-beta: Patient Zero Selection Event. 

The fundamental axiom of the PZI is to measure **Epistemic Clarity**, rather than Historical Importance. We are not optimizing for events with the highest historical significance; we are optimizing for events where the causal mechanisms are unequivocally clear and measurable.

## 2. Evaluation Criteria

The PZI evaluates candidates based on a strict set of positive (rewarded) and negative (penalized) factors.

### 2.1 Positive Factors (Rewards)
The index rewards candidates exhibiting high levels of the following:

*   **Evidence Completeness:** 
    *   *Definition:* The availability of comprehensive, unbroken chains of data, documentation, and telemetry leading up to, during, and following the event. 
    *   *Rationale:* Pristine observational data is required to establish undeniable causality.
*   **Regime Simplicity:** 
    *   *Definition:* The degree to which the environment and operating conditions were free of confounding variables or excessive complexity.
    *   *Rationale:* Isolated or easily modeled systems allow for clearer attribution of cause and effect.

### 2.2 Negative Factors (Penalties)
The index aggressively penalizes candidates exhibiting the following risks:

*   **Outcome Obscurity:** 
    *   *Definition:* Ambiguity, dispute, or lack of objective verifiability regarding the final result or terminal state of the event.
    *   *Rationale:* If the outcome cannot be agreed upon, the causal chain cannot be validated.
*   **Reconstruction Cost:** 
    *   *Definition:* The computational, temporal, or resource overhead required to accurately simulate or model the event and its environment.
    *   *Rationale:* High-cost reconstructions reduce engineering efficiency and scalability.
*   **Contamination Risk:** 
    *   *Definition:* The probability that external forces, unrecorded interventions, or data degradation have altered the historical record or the causal chain itself.
    *   *Rationale:* Contaminated data invalidates epistemic certainty.

## 3. Design Philosophy
The PZI ensures that Lyzer Labs' resources are directed only toward events that provide the highest quality signal. By minimizing noise (Outcome Obscurity, Contamination Risk) and operational friction (Reconstruction Cost), we maximize our ability to build robust models upon the selected Patient Zero.
