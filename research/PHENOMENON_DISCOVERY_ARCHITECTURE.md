# 🌌 PHENOMENON DISCOVERY ARCHITECTURE

**Date**: 2026-08-29
**Status**: APPROVED CONCEPT
**Objective**: Transition from Strategy Research to Institutional Market Phenomenon Discovery.

## 1. The Core Paradigm Shift
The Lyzer Edge Research Laboratory no longer begins with Providers (Strategies).
The Provider is now the **Compiled Artifact** of a validated scientific discovery, located at the very end of the pipeline.

**Old Flow:**
`Provider → Signal → Backtest → Does it work?`

**New Institutional Flow:**
`Raw Data → Feature Factory → Phenomenon Discovery → Hypothesis → Null Model → Confirmation → Provider → Portfolio Construction → Execution`

## 2. Reclassifying V1-V8
The existing providers (V1-V8) are now formally classified as **Human Priors**. They are not truth; they are human-encoded hypotheses that serve as a rich source of features.

| Legacy Provider | New Role in the Laboratory |
| :--- | :--- |
| **V1 SMC** | Source of Structural Features |
| **V2 SNR** | Source of Location Features |
| **V3 RSI** | Source of Momentum Features |
| **V4 IMCE** | Source of Imbalance Features |
| **V5 Wyckoff** | Source of Volume/Exhaustion Features |
| **V6 Market Profile**| Source of Value Features |
| **V7 Tape** | Source of Approximate Microstructure Features |
| **V8 OpenMobius** | Source of Structural Geometry Features |

## 3. The Phenomenon Discovery Engine
The Engine does not output `BUY` or `SELL`. It outputs marginal information measurements.
It answers: *"Does observable X contain information about future outcome Y?"*

**Key Operations:**
1. Map `Feature Matrix X(t)` against `Forward Return y(t+h)`.
2. Compute Information Coefficient (IC) (Pearson, Spearman).
3. Compute Conditional Distributions: `P(R[t+h] > 0 | X > threshold)`.
4. Measure Marginal Contribution (Ablation).

## 4. The Hypothesis Lineage Graph
To enforce structural *anti-p-hacking*, the laboratory maintains a Directed Acyclic Graph (DAG) of all research ever conducted.
- A failed experiment prevents any future experiment with the identical feature composition from running unless explicitly flagged as a `REOPENED_HYPOTHESIS`.
- It tracks: `Features -> Phenomena -> Experiments -> Confirmations / Rejections`.

## 5. The Ablation Engine
When a phenomenon involving multiple features shows promise (e.g., Penetration Depth + Abnormal Volume + Rapid Recovery), the Ablation Engine systematically removes one feature at a time to determine which component actually holds the information, pushing towards the simplest possible explanation.
