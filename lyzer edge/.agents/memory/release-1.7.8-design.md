---
type: decisions
created: 2026-06-02
updated: 2026-06-02
---

# Release 1.7.8 — Anti-Fragility Lab Phased Specs

To mitigate **Complexity Fragility** and **Epistemic Bureaucracy** (avoiding systems where the evaluation overhead prevents rapid adaptation), the implementation of Release 1.7.8 is split into three modular sub-releases:

```
[Phase A: Epistemic Core] ──> [Phase B: Reality Mapping] ──> [Phase C: Anti-Fragility Lab]
  - CSI & CoC                   - RDX & Unknown States         - Stress Mutation Engine
  - Sizing Integration          - Unknown Metrics              - Dynamic verify_robustness
```

---

## 📅 Phased Roadmap & Gates

### Release 1.7.8-A: Epistemic Core
*   **Target**: Reduce Fragility Index from `0.79` to `0.60` through adaptive sizing.
*   **CORE EXPERIMENT HYPOTHESIS**:
    > "A humildade estatística aplicada ao sizing (via CSI e CoC) reduz a fragilidade temporal sem destruir a capacidade do sistema de explorar oportunidades?"
    *This hypothesis must be validated empirically via the robustness suite before proceeding to Release 1.7.8-B.*
*   **Core Logic**:
    - **Confidence Stability Index (CSI)**:
      $$CSI = 1 - \text{normalized\_std}(\text{confidence})$$
      Measures variance over a rolling window (e.g. 10 candles).
      - *Calibration Floor*: Enforce a `CSI Floor = 0.70` during the experimental phase to prevent severe exposure collapse.
    - **Confidence of Confidence (CoC)**:
      Measures evidence density (observation count, scenario diversity).
      - *Calibration Floor*: Enforce a `CoC Floor = 0.70` during the experimental phase to prevent severe exposure collapse.
    - **Decoupled Sizing (`epistemicStrength`)**:
      To keep the Truth Kernel lightweight, restrict CSI/CoC variables strictly to the Sizing Layer:
      $$CSI_{clamped} = \max(0.70, CSI)$$
      $$CoC_{clamped} = \max(0.70, CoC)$$
      $$epistemicStrength = confidenceNorm \times CSI_{clamped} \times CoC_{clamped}$$
      $$\text{effectiveExposure} = \text{baseExposure} \times epistemicStrength$$
*   **UI Telemetry**: Render `confidenceVariance`, `confidenceEMA`, `CSI`, and `CoC` on the Decision Analytics dashboard.

---

## 📈 Epistemic & Explainability KPIs

### 1. Edge Retention Ratio (ERR)
Measures what proportion of the baseline trading edge survives the adaptive sizing filter:
$$ERR = \frac{PnL_{new}}{PnL_{baseline}}$$
*   **Target**: $> 0.70$ (preserves at least 70% of the baseline edge).

### 2. Multi-Objective Gate Checklist for Release 1.7.8-A
The experiment is successful and can proceed to Phase B only if all goals are met simultaneously:

| Metric | Target Goal | Status Check |
| :--- | :--- | :--- |
| **Fragility Index** | $< 0.60$ | Reduces structural path dependency |
| **System Quality** | $> 30$ | Improves real operational quality |
| **Edge Retention Ratio (ERR)** | $> 0.70$ | Bypasses the Conservatism Trap |
| **Decision Latency (DLI)** | Estável / Não piorar | Bypasses Epistemic Bureaucracy |
| **Epistemic Efficiency (EEI)** | Estável / Não piorar | Keeps complexity-to-value ratio healthy |
| **Explainability Score** | $> 90\%$ | Ensures causal traceability |

---

## 🚀 Future Roadmap Outlook (Releases 1.7.9 - 1.9)

1.  **Releases 1.7.8-A/B/C (Anti-Fragility Lab)**: Minimize structural fragility and track unknown states.
2.  **Release 1.7.9: Hypothesis Generation Layer (HGL) & Epistemic State Vector (ESV)**: Unified ESV state signature and HGL investigation protocol.
3.  **Release 1.7.9+: Opportunity Asymmetry Score (OAS)**: Scales sizing according to expected payoff asymmetry.
4.  **Release 1.8: External Constraint Anchor (ECA) & Trajectory-based MIL-2**: Monitors ESV vector trajectories.
5.  **Release 1.9: Autonomous Refactoring**: Self-directed code modifications.

---

## Core Project Axiom

> Um sistema adaptativo não deve otimizar para passar nos testes atuais.
> Deve otimizar para permanecer funcional diante de testes que ainda não existem.
